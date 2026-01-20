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
            const carreras = await Career.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'description', 'profile', 'job_field', 'faculty', 'area'],
            });

            // 4. Inteligencia Artificial (LLM)
            const prompt = this.construirPromptAnalisis(sesion, puntuacionesFinales, trayectoria, carreras);
            const respuestaLLM = await llmService.generarRespuesta(prompt);
            const analisisLLM = this.parsearRespuestaLLM(respuestaLLM);

            // 5. Perfilamiento Holland
            const codigoHolland = this.calcularCodigoHolland(puntuacionesFinales);
            const perfiles = this.obtenerPerfilesDominantes(puntuacionesFinales);

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
                recomendaciones_carreras: analisisLLM.carrerasRecomendadas || [],
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

        return `Eres un orientador vocacional experto de la Universidad Metropolitana.
        
        PERFIL DEL ESTUDIANTE:
        ${perfilEstudiante}
        
        RESULTADOS DEL TEST:
        ${resultadosTest}
        
        CARRERAS DISPONIBLES:
        ${carrerasFormateadas}
        
        TAREA: Genera un análisis profundo en formato JSON con la siguiente estructura:
        {
            "analisisGeneral": "Análisis general del perfil del estudiante",
            "carrerasRecomendadas": [{"id": 1, "name": "Nombre", "razon": "Por qué es adecuada"}],
            "perfilVocacional": {"fortalezas": [], "debilidades": [], "oportunidades": []},
            "areasDesarrollo": ["Área 1", "Área 2"],
            "sugerenciasAcompanamiento": ["Sugerencia 1", "Sugerencia 2"],
            "planDesarrollo": {"cortoPlazo": [], "medianoPlazo": [], "largoPlazo": []}
        }`;
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
            `ID: ${c.id}, Nombre: ${c.name}, Área: ${c.area || 'N/A'}, Descripción: ${c.description || 'N/A'}`
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
            const jsonMatch = texto.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { analisisGeneral: texto };
        } catch (e) {
            return { analisisGeneral: texto, error: 'Error de parseo JSON' };
        }
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
