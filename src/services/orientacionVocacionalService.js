const {
    SesionesTestOrientacion,
    RespuestasTestOrientacion,
    ResultadosOrientacion,
    Usuario,
    Career,
    PreguntasOrientacion
} = require('../models');

const ApiError = require('../utils/ApiError');
const llmService = require('./llmService');
const testOrientacionService = require('./testOrientacionService');
const trayectoriaAcademicaService = require('./trayectoriaAcademicaService');
const preguntasOrientacionService = require('./preguntasOrientacion');
const { Op } = require('sequelize');

class OrientacionVocacionalService {
    
    /**
     * Procesa un test completado y genera recomendaciones con LLM
     */
    async procesarTestCompletado(sesionId) {
        try {
            // 1. Obtener sesión con relaciones
            const sesion = await SesionesTestOrientacion.findByPk(sesionId, {
                include: [
                    { model: RespuestasTestOrientacion, as: 'respuestas' },
                    { model: Usuario, as: 'usuario' },
                ],
            });

            if (!sesion) throw new ApiError(404, 'Sesión no encontrada');
            if (sesion.estado !== 'ronda_2_completada') {
                throw new ApiError(400, 'La sesión debe estar en estado ronda_2_completada');
            }

            // 2. Cálculo de métricas
            const puntuacionesFinales = testOrientacionService.calcularPuntuacionesFinales(
                sesion.puntuaciones_ronda_1 || {},
                sesion.puntuaciones_ronda_2 || {},
                {} 
            );

            // 3. Recopilación de contexto (Trayectoria y Carreras)
            const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(sesion.usuario_id);
            
            // 5. Perfilamiento Holland
            const codigoHolland = this.calcularCodigoHolland(puntuacionesFinales);
            const perfiles = this.obtenerPerfilesDominantes(puntuacionesFinales);

            // Traer TODAS las carreras activas para que el LLM elija según el perfil Holland del usuario
            const carreras = await Career.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'description', 'profile', 'job_field', 'faculty', 'area'],
                order: [['id', 'ASC']],
            });


            // 4. Inteligencia Artificial (LLM)
            const prompt = this.construirPromptAnalisis(sesion, puntuacionesFinales, trayectoria, carreras);
            console.log('🤖 [procesarTestCompletado] Enviando prompt al LLM...');
            const respuestaLLM = await llmService.generarRespuestaJSON(prompt);
            console.log('✅ [procesarTestCompletado] Respuesta del LLM recibida (longitud:', respuestaLLM.length, 'chars)');
            const analisisLLM = this.parsearRespuestaLLM(respuestaLLM);
            console.log('✅ [procesarTestCompletado] Respuesta parseada exitosamente');

            // Enriquecer carreras recomendadas con faculty y area desde la BD
            const carrerasPorId = Object.fromEntries(carreras.map(c => [c.id, c]));
            const recomendacionesConFaculty = (analisisLLM.carrerasRecomendadas || []).map(rec => {
                const id = typeof rec.id === 'string' ? parseInt(rec.id, 10) : rec.id;
                const carrera = carrerasPorId[id];
                return {
                    ...rec,
                    faculty: carrera ? carrera.faculty : null,
                    area: carrera ? carrera.area : null,
                };
            });

            // 6. Persistencia del resultado
            const resultado = await ResultadosOrientacion.create({
                sesion_id: sesionId,
                usuario_id: sesion.usuario_id,
                tipo_test: sesion.tipo_test,
                puntuaciones_finales: puntuacionesFinales,
                codigo_holland: codigoHolland,
                perfil_dominante: perfiles.dominante,
                perfil_secundario: perfiles.secundario,
                nivel_confianza_general: this.calcularNivelConfianzaGeneral(
                    sesion.puntuaciones_ronda_1 || {},
                    sesion.puntuaciones_ronda_2 || {}
                ),
                analisis_llm: analisisLLM,
                recomendaciones_carreras: recomendacionesConFaculty,
                perfil_vocacional: analisisLLM.perfilVocacional || {},
                trayectoria_academica_analizada: trayectoria ? {
                    promedio_general: trayectoria.promedio_general_acumulado,
                    grado_actual: trayectoria.grado_actual,
                    materias_destacadas: trayectoria.materias_destacadas,
                } : {},
                areas_desarrollo: analisisLLM.areasDesarrollo || [],
                sugerencias_acompanamiento: analisisLLM.sugerenciasAcompanamiento || [],
                plan_desarrollo: analisisLLM.planDesarrollo || {},
                version_analisis: '1.0',
                fecha_generacion: new Date(),
            });

            // 7. Cierre de proceso
            await sesion.update({ estado: 'finalizada', fecha_completada: new Date() });
            await this.actualizarEfectividadPreguntas(sesion);

            return resultado;
        } catch (error) {
            this._handleError('procesarTestCompletado', error);
        }
    }

    /**
     * Obtiene el perfil vocacional completo de un usuario
     */
    async obtenerPerfilCompleto(usuarioId) {
        try {
            const resultadoMasReciente = await ResultadosOrientacion.findOne({
                where: { usuario_id: usuarioId },
                order: [['fecha_generacion', 'DESC']],
                include: [
                    { model: SesionesTestOrientacion, as: 'sesion' },
                ],
            });

            const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);
            const historial = await testOrientacionService.obtenerHistorial(usuarioId);

            return {
                resultadoActual: resultadoMasReciente,
                trayectoriaAcademica: trayectoria,
                historial: historial,
            };
        } catch (error) {
            this._handleError('obtenerPerfilCompleto', error);
        }
    }

    /**
     * Genera recomendaciones continuas basadas en el perfil del usuario
     */
    async generarRecomendacionesContinuas(usuarioId) {
        try {
            const perfil = await this.obtenerPerfilCompleto(usuarioId);
            const trayectoria = perfil.trayectoriaAcademica;
            const resultado = perfil.resultadoActual;

            if (!resultado) {
                throw new ApiError(404, 'No se encontró un resultado de test para el usuario');
            }

            const carreras = await Career.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'description', 'profile', 'job_field', 'faculty', 'area'],
            });

            const prompt = this.construirPromptRecomendacionesContinuas(resultado, trayectoria, carreras);
            const respuestaLLM = await llmService.generarRespuesta(prompt);
            const recomendaciones = this.parsearRespuestaLLM(respuestaLLM);

            return recomendaciones;
        } catch (error) {
            this._handleError('generarRecomendacionesContinuas', error);
        }
    }

    /**
     * Analiza la viabilidad de un cambio de carrera
     */
    async analizarCambioCarrera(usuarioId, nuevaCarreraId) {
        try {
            const perfil = await this.obtenerPerfilCompleto(usuarioId);
            const nuevaCarrera = await Career.findByPk(nuevaCarreraId);

            if (!nuevaCarrera) {
                throw new ApiError(404, 'Carrera no encontrada');
            }

            const prompt = this.construirPromptAnalisisCambioCarrera(perfil, nuevaCarrera);
            const respuestaLLM = await llmService.generarRespuesta(prompt);
            const analisis = this.parsearRespuestaLLM(respuestaLLM);

            return analisis;
        } catch (error) {
            this._handleError('analizarCambioCarrera', error);
        }
    }

    /**
     * Lógica de construcción de Prompt para el modelo de lenguaje
     */
    construirPromptAnalisis(sesion, puntuaciones, trayectoria, carreras) {
        const perfilEstudiante = this.formatearPerfilEstudiante(trayectoria);
        const resultadosTest = this.formatearResultadosTest(sesion, puntuaciones);
        const carrerasFormateadas = this.formatearCarreras(carreras);

        const codigoHolland = this.calcularCodigoHolland(puntuaciones);
        const perfiles = this.obtenerPerfilesDominantes(puntuaciones);

        return `Eres un orientador vocacional experto de la Universidad Metropolitana.
        
        INSTRUCCIONES CRÍTICAS - DEBES SEGUIRLAS EXACTAMENTE:
        1. Responde ÚNICAMENTE con un objeto JSON válido
        2. NO incluyas saludos, explicaciones ni texto narrativo
        3. NO uses bloques de código markdown (NO uses \`\`\`json)
        4. NO agregues texto antes o después del JSON
        5. El JSON debe comenzar con { y terminar con }
        6. Completa TODOS los campos con información relevante
        7. CARRERAS: Solo recomienda carreras que estén en la lista "CARRERAS DISPONIBLES". Elige las que MEJOR encajen con el código Holland (${codigoHolland}) y los perfiles dominante (${perfiles.dominante}) y secundario (${perfiles.secundario}). Las recomendaciones DEBEN variar según estos resultados: perfiles Social/Artístico → carreras de personas, creatividad, comunicación; Investigador/Realista → carreras técnicas, ingeniería, análisis; Emprendedor/Convencional → carreras de gestión, organización, negocios. Recomienda entre 3 y 6 carreras de la lista.

        PERFIL DEL ESTUDIANTE:
        ${perfilEstudiante}
        
        RESULTADOS DEL TEST (usa esto para elegir las carreras):
        ${resultadosTest}
        
        CARRERAS DISPONIBLES (solo puedes recomendar IDs de esta lista):
        ${carrerasFormateadas}
        
        FORMATO DE RESPUESTA (responde SOLO esto, sin texto adicional):
        {
            "analisisGeneral": "Análisis de máximo 150 palabras focalizado en los resultados.",
            "carrerasRecomendadas": [
                {"id": <ID de la lista>, "name": "Nombre exacto de la carrera", "razon": "Máximo 30 palabras vinculando al perfil Holland"}
            ],
            "perfilVocacional": {
                "fortalezas": ["Fortaleza 1", "Fortaleza 2", "Fortaleza 3"],
                "debilidades": ["Debilidad 1", "Debilidad 2"],
                "oportunidades": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"]
            },
            "areasDesarrollo": ["Área de desarrollo 1", "Área de desarrollo 2", "Área de desarrollo 3"],
            "sugerenciasAcompanamiento": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"],
            "planDesarrollo": {
                "cortoPlazo": ["Acción corto plazo 1", "Acción corto plazo 2"],
                "medianoPlazo": ["Acción mediano plazo 1", "Acción mediano plazo 2"],
                "largoPlazo": ["Acción largo plazo 1", "Acción largo plazo 2"]
            }
        }

       RECUERDA: La respuesta total DEBE ser menor a 1500 tokens. Corta el análisis si es necesario para cerrar el JSON.`;
    }

    construirPromptRecomendacionesContinuas(resultado, trayectoria, carreras) {
        return `Eres un orientador vocacional experto. Basándote en el siguiente perfil, genera recomendaciones actualizadas:
        
        RESULTADO ANTERIOR:
        ${JSON.stringify(resultado.puntuaciones_finales, null, 2)}
        Perfil Holland: ${resultado.codigo_holland}
        
        TRAYECTORIA ACADÉMICA:
        ${JSON.stringify(trayectoria, null, 2)}
        
        CARRERAS DISPONIBLES:
        ${this.formatearCarreras(carreras)}
        
        Genera recomendaciones actualizadas en formato JSON.`;
    }

    construirPromptAnalisisCambioCarrera(perfil, nuevaCarrera) {
        return `Eres un orientador vocacional experto. Analiza la viabilidad de un cambio de carrera:
        
        PERFIL ACTUAL:
        ${JSON.stringify(perfil.resultadoActual?.puntuaciones_finales, null, 2)}
        
        NUEVA CARRERA:
        ${JSON.stringify(nuevaCarrera, null, 2)}
        
        Analiza la viabilidad, ventajas, desventajas y recomendaciones en formato JSON.`;
    }

    /**
     * Métodos Privados de Apoyo (Helpers)
     */

    formatearPerfilEstudiante(t) {
      if (!t) return 'No hay información académica disponible.';
      return `Promedio General: ${t.promedio_general_acumulado || 'N/A'}
Grado Actual: ${t.grado_actual || 'N/A'}
Materias Destacadas: ${(t.materias_destacadas || []).join(', ')}
Actividades Extracurriculares: ${(t.actividades_extracurriculares || []).join(', ')}`;
    }

    formatearResultadosTest(sesion, puntuaciones) {
        const codigoHolland = this.calcularCodigoHolland(puntuaciones);
        const perfiles = this.obtenerPerfilesDominantes(puntuaciones);
        
        return `Tipo de Test: ${sesion.tipo_test}
Código Holland: ${codigoHolland}
Perfil Dominante: ${perfiles.dominante}
Perfil Secundario: ${perfiles.secundario}
Puntuaciones: ${JSON.stringify(puntuaciones, null, 2)}`;
    }

    formatearCarreras(carreras) {
        return carreras.map(c =>
            `ID: ${c.id}, Nombre: ${c.name}, Facultad: ${c.faculty || 'N/A'}, Área: ${c.area || 'N/A'}, Perfil: ${(c.profile || c.description || 'N/A').substring(0, 200)}`
        ).join('\n');
    }

    calcularCodigoHolland(puntuaciones) {
        const mapeo = { 
            Realista: 'R', 
            Investigador: 'I', 
            Artístico: 'A', 
            Social: 'S', 
            Emprendedor: 'E', 
            Convencional: 'C' 
        };
        return Object.entries(puntuaciones)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([dim]) => mapeo[dim] || dim[0])
            .join('');
    }

    obtenerPerfilesDominantes(puntuaciones) {
        const ordenadas = Object.entries(puntuaciones)
            .sort((a, b) => b[1] - a[1]);
        
        return {
            dominante: ordenadas[0]?.[0] || 'N/A',
            secundario: ordenadas[1]?.[0] || 'N/A',
        };
    }

    calcularNivelConfianzaGeneral(puntuacionesRonda1, puntuacionesRonda2) {
        const confianzaRonda1 = testOrientacionService.calcularNivelConfianza(puntuacionesRonda1);
        const confianzaRonda2 = testOrientacionService.calcularNivelConfianza(puntuacionesRonda2);
        
        // Promedio ponderado: 40% ronda 1, 60% ronda 2
        return Math.round((confianzaRonda1 * 0.4) + (confianzaRonda2 * 0.6));
    }

    parsearRespuestaLLM(texto) {
        try {
            console.log('🔍 [parsearRespuestaLLM] Texto recibido (primeros 500 chars):', texto.substring(0, 500));
            
            // 1. Intentar extraer JSON de bloques de código markdown (```json ... ```)
            let jsonText = texto;
            
            // Buscar bloques de código markdown
            const codeBlockMatch = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log('✅ [parsearRespuestaLLM] JSON extraído de bloque de código markdown');
            } else {
                // 2. Si no hay bloque de código, buscar el objeto JSON más grande
                const jsonMatches = texto.match(/\{[\s\S]*\}/g);
                if (jsonMatches && jsonMatches.length > 0) {
                    // Tomar el JSON más largo (probablemente el más completo)
                    jsonText = jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
                    console.log('✅ [parsearRespuestaLLM] JSON extraído usando regex (múltiples matches encontrados)');
                }
            }
            
            // 3. Limpiar el texto: remover saltos de línea extra y espacios
            jsonText = jsonText.trim();
            
            // 4. Intentar parsear el JSON (con manejo de JSON incompleto/truncado)
            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (parseError) {
                // Si falla, puede ser JSON incompleto/truncado
                console.log('⚠️ [parsearRespuestaLLM] Error al parsear JSON, intentando reparar JSON incompleto...');
                
                // Intentar reparar JSON incompleto
                let jsonReparado = this._intentarRepararJSON(jsonText);
                
                try {
                    parsed = JSON.parse(jsonReparado);
                    console.log('✅ [parsearRespuestaLLM] JSON reparado y parseado exitosamente');
                } catch (e) {
                    // Si aún falla, intentar extraer campos válidos manualmente
                    console.log('⚠️ [parsearRespuestaLLM] No se pudo reparar JSON, extrayendo campos válidos...');
                    parsed = this._extraerCamposDeJSONIncompleto(jsonText);
                }
            }
            
            // 5. Si analisisGeneral es un string que contiene JSON, intentar parsearlo también
            if (parsed.analisisGeneral && typeof parsed.analisisGeneral === 'string') {
                // Verificar si el string contiene JSON
                const nestedJsonMatch = parsed.analisisGeneral.match(/\{[\s\S]*\}/);
                if (nestedJsonMatch) {
                    try {
                        const nestedJson = JSON.parse(nestedJsonMatch[0]);
                        // Si el JSON anidado tiene más campos, usarlo como base y mergear
                        if (Object.keys(nestedJson).length > 1) {
                            console.log('✅ [parsearRespuestaLLM] JSON anidado encontrado en analisisGeneral, mergeando...');
                            parsed = { ...nestedJson, analisisGeneral: nestedJson.analisisGeneral || parsed.analisisGeneral };
                        }
                    } catch (e) {
                        console.log('⚠️ [parsearRespuestaLLM] No se pudo parsear JSON anidado, usando el original');
                    }
                }
            }
            
            // 6. Validar y asegurar estructura esperada
            const resultado = {
                analisisGeneral: parsed.analisisGeneral || 'Análisis no disponible',
                carrerasRecomendadas: parsed.carrerasRecomendadas || [],
                perfilVocacional: parsed.perfilVocacional || {
                    fortalezas: [],
                    debilidades: [],
                    oportunidades: []
                },
                areasDesarrollo: parsed.areasDesarrollo || [],
                sugerenciasAcompanamiento: parsed.sugerenciasAcompanamiento || [],
                planDesarrollo: parsed.planDesarrollo || {
                    cortoPlazo: [],
                    medianoPlazo: [],
                    largoPlazo: []
                }
            };
            
            // 7. Log de validación
            console.log('📊 [parsearRespuestaLLM] Resultado parseado:');
            console.log('  - carrerasRecomendadas:', resultado.carrerasRecomendadas.length, 'elementos');
            console.log('  - perfilVocacional:', Object.keys(resultado.perfilVocacional).length, 'campos');
            console.log('  - areasDesarrollo:', resultado.areasDesarrollo.length, 'elementos');
            console.log('  - sugerenciasAcompanamiento:', resultado.sugerenciasAcompanamiento.length, 'elementos');
            console.log('  - planDesarrollo:', Object.keys(resultado.planDesarrollo).length, 'campos');
            
            return resultado;
        } catch (e) {
            console.error('❌ [parsearRespuestaLLM] Error al parsear:', e.message);
            console.error('❌ [parsearRespuestaLLM] Texto original:', texto.substring(0, 1000));
            return { 
                analisisGeneral: texto.substring(0, 500), 
                error: 'Error de parseo JSON',
                errorDetails: e.message
            };
        }
    }

    /**
     * Intenta reparar JSON incompleto/truncado
     * @private
     */
    _intentarRepararJSON(jsonText) {
        let reparado = jsonText.trim();
        
        // Contar llaves y corchetes abiertos/cerrados
        const abrirLlaves = (reparado.match(/\{/g) || []).length;
        const cerrarLlaves = (reparado.match(/\}/g) || []).length;
        const abrirCorchetes = (reparado.match(/\[/g) || []).length;
        const cerrarCorchetes = (reparado.match(/\]/g) || []).length;
        
        // Si hay un string sin cerrar, intentar cerrarlo
        if (reparado.match(/"[^"]*$/)) {
            // String sin cerrar al final
            reparado = reparado.replace(/"([^"]*)$/, '"$1"');
        }
        
        // Cerrar arrays abiertos
        for (let i = 0; i < abrirCorchetes - cerrarCorchetes; i++) {
            reparado += ']';
        }
        
        // Cerrar objetos abiertos
        for (let i = 0; i < abrirLlaves - cerrarLlaves; i++) {
            reparado += '}';
        }
        
        return reparado;
    }
    
    /**
     * Extrae campos válidos de un JSON incompleto/truncado
     * @private
     */
    _extraerCamposDeJSONIncompleto(jsonText) {
        const resultado = {
            analisisGeneral: '',
            carrerasRecomendadas: [],
            perfilVocacional: { fortalezas: [], debilidades: [], oportunidades: [] },
            areasDesarrollo: [],
            sugerenciasAcompanamiento: [],
            planDesarrollo: { cortoPlazo: [], medianoPlazo: [], largoPlazo: [] }
        };
        
        console.log('🔧 [parsearRespuestaLLM] Extrayendo campos de JSON incompleto...');
        
        // Intentar extraer analisisGeneral (puede estar truncado)
        const analisisMatch = jsonText.match(/"analisisGeneral"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (analisisMatch) {
            resultado.analisisGeneral = analisisMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        } else {
            // Si está truncado, extraer hasta donde se cortó
            const analisisParcial = jsonText.match(/"analisisGeneral"\s*:\s*"([^"]*?)(?:"|$)/);
            if (analisisParcial) {
                resultado.analisisGeneral = analisisParcial[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\/g, '');
                console.log('⚠️ [parsearRespuestaLLM] analisisGeneral extraído parcialmente (truncado)');
            }
        }
        
        // Intentar extraer carrerasRecomendadas (puede estar vacío o incompleto)
        const carrerasMatch = jsonText.match(/"carrerasRecomendadas"\s*:\s*\[([^\]]*)\]/);
        if (carrerasMatch && carrerasMatch[1].trim()) {
            try {
                resultado.carrerasRecomendadas = JSON.parse('[' + carrerasMatch[1] + ']');
            } catch (e) {
                console.log('⚠️ [parsearRespuestaLLM] No se pudo extraer carrerasRecomendadas');
            }
        }
        
        // Intentar extraer perfilVocacional (puede estar incompleto)
        const perfilMatch = jsonText.match(/"perfilVocacional"\s*:\s*\{([^}]*)\}/);
        if (perfilMatch) {
            try {
                // Intentar parsear el objeto completo
                const perfilStr = '{' + perfilMatch[1] + '}';
                const perfilParsed = JSON.parse(perfilStr);
                resultado.perfilVocacional = {
                    fortalezas: perfilParsed.fortalezas || [],
                    debilidades: perfilParsed.debilidades || [],
                    oportunidades: perfilParsed.oportunidades || []
                };
            } catch (e) {
                // Si falla, intentar extraer campos individuales
                const fortalezasMatch = jsonText.match(/"fortalezas"\s*:\s*\[([^\]]*)\]/);
                const debilidadesMatch = jsonText.match(/"debilidades"\s*:\s*\[([^\]]*)\]/);
                const oportunidadesMatch = jsonText.match(/"oportunidades"\s*:\s*\[([^\]]*)\]/);
                
                if (fortalezasMatch) {
                    try {
                        resultado.perfilVocacional.fortalezas = JSON.parse('[' + fortalezasMatch[1] + ']');
                    } catch (e) {}
                }
                if (debilidadesMatch) {
                    try {
                        resultado.perfilVocacional.debilidades = JSON.parse('[' + debilidadesMatch[1] + ']');
                    } catch (e) {}
                }
                if (oportunidadesMatch) {
                    try {
                        resultado.perfilVocacional.oportunidades = JSON.parse('[' + oportunidadesMatch[1] + ']');
                    } catch (e) {}
                }
            }
        }
        
        // Intentar extraer areasDesarrollo
        const areasMatch = jsonText.match(/"areasDesarrollo"\s*:\s*\[([^\]]*)\]/);
        if (areasMatch && areasMatch[1].trim()) {
            try {
                resultado.areasDesarrollo = JSON.parse('[' + areasMatch[1] + ']');
            } catch (e) {}
        }
        
        // Intentar extraer sugerenciasAcompanamiento
        const sugerenciasMatch = jsonText.match(/"sugerenciasAcompanamiento"\s*:\s*\[([^\]]*)\]/);
        if (sugerenciasMatch && sugerenciasMatch[1].trim()) {
            try {
                resultado.sugerenciasAcompanamiento = JSON.parse('[' + sugerenciasMatch[1] + ']');
            } catch (e) {}
        }
        
        // Intentar extraer planDesarrollo
        const planMatch = jsonText.match(/"planDesarrollo"\s*:\s*\{([^}]*)\}/);
        if (planMatch) {
            try {
                const planStr = '{' + planMatch[1] + '}';
                const planParsed = JSON.parse(planStr);
                resultado.planDesarrollo = {
                    cortoPlazo: planParsed.cortoPlazo || [],
                    medianoPlazo: planParsed.medianoPlazo || [],
                    largoPlazo: planParsed.largoPlazo || []
                };
            } catch (e) {
                // Intentar extraer campos individuales
                const cortoMatch = jsonText.match(/"cortoPlazo"\s*:\s*\[([^\]]*)\]/);
                const medianoMatch = jsonText.match(/"medianoPlazo"\s*:\s*\[([^\]]*)\]/);
                const largoMatch = jsonText.match(/"largoPlazo"\s*:\s*\[([^\]]*)\]/);
                
                if (cortoMatch) {
                    try {
                        resultado.planDesarrollo.cortoPlazo = JSON.parse('[' + cortoMatch[1] + ']');
                    } catch (e) {}
                }
                if (medianoMatch) {
                    try {
                        resultado.planDesarrollo.medianoPlazo = JSON.parse('[' + medianoMatch[1] + ']');
                    } catch (e) {}
                }
                if (largoMatch) {
                    try {
                        resultado.planDesarrollo.largoPlazo = JSON.parse('[' + largoMatch[1] + ']');
                    } catch (e) {}
                }
            }
        }
        
        console.log('✅ [parsearRespuestaLLM] Campos extraídos de JSON incompleto');
        return resultado;
    }

    async actualizarEfectividadPreguntas(sesion) {
        try {
            const ids = [...(sesion.preguntas_ronda_1 || []), ...(sesion.preguntas_ronda_2 || [])];
            const resultado = await ResultadosOrientacion.findOne({ 
                where: { sesion_id: sesion.id } 
            });
            if (!resultado) return;

            for (const id of ids) {
                const preg = await PreguntasOrientacion.findByPk(id);
                if (preg) {
                    const exito = preg.dimension_principal === resultado.perfil_dominante;
                    await preguntasOrientacionService.actualizarEfectividadPregunta(id, exito);
                }
            }
        } catch (e) {
            console.error('Error actualizando efectividad:', e);
        }
    }

    _handleError(metodo, error) {
        console.error(`Error en OrientacionVocacionalService.${metodo}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Error en OrientacionVocacionalService > ${metodo}: ${error.message}`);
    }
}

module.exports = new OrientacionVocacionalService();
