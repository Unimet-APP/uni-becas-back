// ✅ Importar modelName, generationConfig, safetySettings
const { genAI, modelName, generationConfig, safetySettings } = require('../config/gemini');
const grokValidationService = require('./grokValidationService');
const huggingfaceValidationService = require('./huggingfaceValidationService');
const ApiError = require('../utils/ApiError');

const FORMATO_TEXTO_PLANO = `Responde siempre en texto plano, fácil de leer en un chat. No uses formato markdown: no asteriscos para negrita (**texto**), no almohadillas para títulos (##), no guiones bajos para cursiva. Puedes usar listas con números o guiones normales (1. 2. o -) y párrafos cortos. La respuesta debe verse bien sin interpretar markdown.`;

/**
 * Construye la system instruction dinámica para el chatbot institucional.
 * Incluye: identidad UNIMET, carreras desde BD, datos institucionales y resultado del usuario.
 */
function construirSystemInstruction(contexto = {}) {
  const partes = [];

  partes.push(
    'Eres el asistente de orientación vocacional de la Universidad Metropolitana (UNIMET).',
    'Atiendes consultas sobre: carreras de la UNIMET, orientación vocacional, eventos y fechas institucionales, vías de ingreso, servicios del campus, becas y preguntas generales sobre la universidad.',
    'Siempre responde de forma amable, clara y concisa.',
    FORMATO_TEXTO_PLANO
  );

  // Carreras: lista explícita y regla estricta (solo estas, ninguna otra)
  if (contexto.carreras && contexto.carreras.length > 0) {
    const nombres = contexto.carreras.map(c => (c.name || c.nombre || '').trim()).filter(Boolean);
    const listaNumerada = nombres.map((n, i) => `${i + 1}. ${n}`).join('\n');
    const nombresEnLinea = nombres.join(', ');

    partes.push(
      '\n=== CARRERAS UNIMET (OBLIGATORIO) ===',
      'Las ÚNICAS carreras que existen en la UNIMET son estas (no hay otras): ' + nombresEnLinea + '.',
      'Prohibido inventar, añadir o mencionar cualquier carrera que no esté en la lista anterior. Al listar o recomendar carreras, usa SOLO los nombres exactos de esta lista:',
      listaNumerada,
      '=== FIN LISTA CARRERAS ==='
    );
  } else {
    partes.push(
      '\nNo tienes la lista de carreras cargada. Si preguntan por carreras, indica que consulten la web de la UNIMET o la Oficina de Admisión. No inventes nombres de carreras.'
    );
  }

  // Datos institucionales (valores seguros, sin undefined)
  if (contexto.datosInstitucionales && typeof contexto.datosInstitucionales === 'object') {
    const datos = contexto.datosInstitucionales;
    const s = (v) => (v == null ? '' : String(v).trim());

    if (datos.institucion) {
      const inst = datos.institucion;
      const dir = inst.direccion || {};
      const cg = inst.contacto_general || {};
      partes.push(
        '\n=== INFORMACIÓN INSTITUCIONAL ===',
        'Nombre: ' + s(inst.nombre) + ' (' + s(inst.siglas) + ')',
        'Régimen académico: ' + s(inst.regimen_academico),
        'Sede: ' + s(dir.sede) + '. Referencia: ' + s(dir.referencia) + '. ' + s(dir.ciudad) + ', ' + s(dir.estado) + ', ' + s(dir.pais),
        'Web: ' + s(cg.web) + ' | Teléfono: ' + s(cg.telefono_master || cg.telefono) + ' | Email: ' + s(cg.email)
      );
      if (s(cg.whatsapp_admision)) partes.push('WhatsApp Admisión: ' + s(cg.whatsapp_admision));
    }

    if (Array.isArray(datos.vias_de_ingreso) && datos.vias_de_ingreso.length > 0) {
      partes.push('\n--- VÍAS DE INGRESO ---');
      datos.vias_de_ingreso.forEach((v) => {
        partes.push(s(v.metodo) + ': ' + s(v.nombre_completo) + '. ' + s(v.descripcion));
      });
    }

    if (Array.isArray(datos.eventos) && datos.eventos.length > 0) {
      partes.push('\n--- EVENTOS Y FECHAS ---');
      datos.eventos.forEach((e) => {
        const fecha = s(e.fecha_texto) || s(e.proxima_fecha) || s(e.fecha) || 'Por confirmar';
        const lugar = s(e.lugar) || 'Campus UNIMET';
        partes.push(s(e.nombre) + '. ' + s(e.descripcion) + ' Fecha: ' + fecha + '. Lugar: ' + lugar);
      });
    }

    if (datos.servicios_campus && typeof datos.servicios_campus === 'object') {
      const sc = datos.servicios_campus;
      partes.push('\n--- SERVICIOS DEL CAMPUS ---');
      if (sc.transporte) {
        const t = sc.transporte;
        const puntos = Array.isArray(t.puntos_salida) ? t.puntos_salida.join(', ') : '';
        partes.push('Transporte: ' + s(t.nombre) + (puntos ? ' (Salidas: ' + puntos + '). ' : '. ') + s(t.descripcion));
      }
      if (sc.biblioteca) {
        const b = sc.biblioteca;
        partes.push('Biblioteca: ' + s(b.nombre) + '. ' + s(b.destacado));
      }
      if (sc.seguridad) partes.push('Seguridad: ' + s(sc.seguridad));
    }

    if (Array.isArray(datos.contactos_por_tema) && datos.contactos_por_tema.length > 0) {
      partes.push('\n--- CONTACTOS POR TEMA ---');
      datos.contactos_por_tema.forEach((c) => {
        let linea = s(c.tema) + ' - ' + s(c.area);
        if (c.email) linea += ' | Email: ' + s(c.email);
        if (c.telefono) linea += ' | Tel: ' + s(c.telefono);
        if (c.descripcion) linea += ' | ' + s(c.descripcion);
        partes.push(linea);
      });
    }
    partes.push('=== FIN INFORMACIÓN INSTITUCIONAL ===');
  }

  if (contexto.resultadoUsuario) {
    const r = contexto.resultadoUsuario;
    partes.push('\nCONTEXTO DEL USUARIO (tiene resultado de test de orientación):');
    partes.push(`- Tipo de test: ${r.tipo_test || 'N/A'}`);
    if (r.codigo_holland) partes.push(`- Código Holland: ${r.codigo_holland}`);
    if (r.perfil_dominante) partes.push(`- Perfil dominante: ${r.perfil_dominante}`);
    if (r.perfil_secundario) partes.push(`- Perfil secundario: ${r.perfil_secundario}`);

    if (r.puntuaciones_finales && typeof r.puntuaciones_finales === 'object') {
      const punts = Object.entries(r.puntuaciones_finales)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      partes.push(`- Puntuaciones: ${punts}`);
    }

    if (r.analisis_llm) {
      const analisis = typeof r.analisis_llm === 'string' ? (() => { try { return JSON.parse(r.analisis_llm); } catch { return null; } })() : r.analisis_llm;
      if (analisis?.carrerasRecomendadas) {
        const recs = analisis.carrerasRecomendadas.map(c => c.nombre || c.carrera).filter(Boolean).join(', ');
        if (recs) partes.push(`- Carreras recomendadas previamente: ${recs}`);
      }
      if (analisis?.perfilVocacional?.resumen) {
        partes.push(`- Resumen de perfil: ${analisis.perfilVocacional.resumen}`);
      }
    }

    partes.push('Usa esta información para personalizar tus respuestas y recomendaciones. Si el usuario pregunta por carreras o recomendaciones, prioriza las que encajen con su perfil.');
  }

  partes.push('\nSi no tienes un dato institucional en tu contexto, indícalo y sugiere contactar a la universidad directamente.');

  return partes.filter((p) => p != null && String(p).trim() !== '').join('\n');
}

/**
 * Quita markdown común de un texto para mostrarlo en plano (evita que se vean ** o ##).
 */
function limpiarMarkdownParaChat(texto) {
  if (!texto || typeof texto !== 'string') return texto;
  return texto
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

class LLMService {
  constructor() {
    // ✅ CORREGIDO: Pasar objeto con { model: modelName } y configuraciones
    this.model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
      safetySettings
    });
  }

  /**
   * Genera una respuesta del LLM basada en un prompt
   * @param {string} prompt - El prompt a enviar al LLM
   * @param {Object} context - Contexto adicional (perfil estudiante, carreras, etc.)
   * @returns {Promise<string>} - Respuesta del LLM
   */
  async generarRespuesta(prompt, context = {}) {
    try {
      const promptCompleto = this.construirPrompt(prompt, context);
      const systemInstruction = construirSystemInstruction(context._institucional || {});

      const consultaModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig,
        safetySettings
      });

      const result = await consultaModel.generateContent(promptCompleto);
      const response = await result.response;
      let text = response.text();
      text = limpiarMarkdownParaChat(text);

      return text;
    } catch (error) {
      console.error('Error en LLM Service:', error);
      throw new ApiError(500, `Error al generar respuesta del LLM: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
 * Genera una respuesta del LLM forzando formato JSON
 * @param {string} prompt - El prompt a enviar al LLM
 * @returns {Promise<string>} - Respuesta del LLM en formato JSON
 */
async generarRespuestaJSON(prompt) {
  try {
    // Crear modelo con configuración específica para JSON
    const modelJSON = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        ...generationConfig,
        temperature: 0.3,  // Más determinista
        responseMimeType: 'application/json',  // Forzar JSON
      },
      safetySettings
    });
    
    const result = await modelJSON.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error en LLM Service (JSON):', error);
    throw new ApiError(500, `Error al generar respuesta JSON del LLM: ${error.message || 'Error desconocido'}`);
  }
}

  /**
   * Genera recomendaciones de carrera basadas en perfil del estudiante
   * @param {Object} perfilEstudiante - Datos del estudiante
   * @param {Array} carrerasDisponibles - Lista de carreras
   * @returns {Promise<Object>} - Recomendaciones estructuradas
   */
  async generarRecomendacionesCarrera(perfilEstudiante, carrerasDisponibles) {
    const prompt = this.construirPromptRecomendaciones(perfilEstudiante, carrerasDisponibles);
    
    const respuesta = await this.generarRespuesta(prompt, {
      perfilEstudiante,
      carrerasDisponibles
    });
    
    // Parsear respuesta a JSON estructurado
    return this.parsearRecomendaciones(respuesta);
  }

  /**
   * Construye el prompt con contexto
   */
  construirPrompt(prompt, context) {
    let promptCompleto = prompt;
    
    if (context.perfilEstudiante) {
      promptCompleto += `\n\nPerfil del Estudiante:\n${JSON.stringify(context.perfilEstudiante, null, 2)}`;
    }
    
    if (context.carrerasDisponibles) {
      promptCompleto += `\n\nCarreras Disponibles:\n${JSON.stringify(context.carrerasDisponibles, null, 2)}`;
    }
    
    return promptCompleto;
  }

  /**
   * Construye prompt específico para recomendaciones
   */
  construirPromptRecomendaciones(perfilEstudiante, carrerasDisponibles) {
    return `Eres un orientador vocacional experto. Basándote en el siguiente perfil de estudiante y las carreras disponibles, genera recomendaciones personalizadas.

Perfil del Estudiante:
- Intereses: ${perfilEstudiante.intereses?.join(', ') || 'No especificados'}
- Habilidades: ${perfilEstudiante.habilidades?.join(', ') || 'No especificadas'}
- Resultados de test: ${JSON.stringify(perfilEstudiante.resultadosTest || {})}
- Preferencias: ${JSON.stringify(perfilEstudiante.preferencias || {})}

Carreras Disponibles:
${carrerasDisponibles.map(c => `- ${c.nombre}: ${c.descripcion}`).join('\n')}

Genera recomendaciones en formato JSON con:
{
  "carrerasRecomendadas": [
    {
      "carrera": "nombre",
      "puntuacion": 0-100,
      "razones": ["razón1", "razón2"],
      "match": "alto|medio|bajo"
    }
  ],
  "analisis": "análisis general del perfil",
  "sugerencias": ["sugerencia1", "sugerencia2"]
}`;
  }

  /**
   * Parsea la respuesta del LLM a JSON estructurado
   */
  parsearRecomendaciones(respuesta) {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Si no hay JSON, devolver respuesta en texto
      return {
        respuesta: respuesta,
        formato: 'texto'
      };
    } catch (error) {
      return {
        respuesta: respuesta,
        error: 'No se pudo parsear a JSON'
      };
    }
  }

  /**
   * Construye el prompt usado para recomendaciones ICO (compartido por Gemini y OpenAI).
   * @param {Object} puntuaciones - { Realista, Investigador, Artístico, Social, Emprendedor, Convencional }
   * @param {string} codigoHolland - Ej: "RIA", "SEC"
   * @param {Array} carrerasSpecs - Lista de { name, interestCode, faculty, area }
   * @param {Object|null} trayectoria - Trayectoria escolar opcional
   * @returns {string} - Prompt completo
   */
  construirPromptICO(puntuaciones, codigoHolland, carrerasSpecs, trayectoria = null) {
    const carrerasTexto = carrerasSpecs.map((c, i) =>
      `${i + 1}. ${c.name} (Interest code: ${c.interestCode || 'N/A'}, Facultad: ${c.faculty || 'N/A'}, Área: ${c.area || 'N/A'})`
    ).join('\n');

    const bloqueTrayectoria = trayectoria && Object.keys(trayectoria).length > 0
      ? `

TRAYECTORIA ESCOLAR DEL USUARIO (úsala para afinar recomendaciones y razones):
${JSON.stringify(trayectoria, null, 2)}

Considera esta trayectoria al redactar el perfil vocacional, las razones de cada carrera y las sugerencias de acompañamiento (por ejemplo: materias en las que destaca, grado actual, actividades o proyectos).`
      : '';

    return `Eres un orientador vocacional experto. Un usuario completó el test ICO (Inventario de Orientación) y obtuvo las siguientes puntuaciones por dimensión RIASEC (0-100):

PUNTUACIONES:
- Realista: ${puntuaciones.Realista ?? 0}
- Investigador: ${puntuaciones.Investigador ?? 0}
- Artístico: ${puntuaciones.Artístico ?? 0}
- Social: ${puntuaciones.Social ?? 0}
- Emprendedor: ${puntuaciones.Emprendedor ?? 0}
- Convencional: ${puntuaciones.Convencional ?? 0}

Código Holland derivado (top 3 dimensiones): ${codigoHolland}
${bloqueTrayectoria}

CARRERAS UNIMET DISPONIBLES (solo puedes recomendar de esta lista):
${carrerasTexto}

INSTRUCCIONES:
1. Recomienda entre 3 y 6 carreras de la lista que MEJOR encajen con el perfil ICO, el código Holland y, si se proporcionó, la trayectoria escolar.
2. El interest code de cada carrera usa letras R,I,A,S,E,C; prioriza carreras cuyo código coincida o solape con ${codigoHolland}.
3. Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra, con esta estructura exacta:

{
  "perfilVocacional": { "resumen": "2-3 oraciones sobre el perfil del usuario según ICO", "fortalezas": ["fortaleza1", "fortaleza2"], "areasExplorar": ["área1", "área2"] },
  "carrerasRecomendadas": [
    { "nombre": "Nombre exacto de la carrera de la lista", "razon": "Máximo 40 palabras vinculando al perfil ICO y código Holland" }
  ],
  "sugerenciasAcompanamiento": ["sugerencia1", "sugerencia2"]
}`;
  }

  /**
   * Genera recomendaciones para el test ICO usando puntuaciones RIASEC y especificaciones UNIMET.
   * Solo usa Gemini (comportamiento original).
   * @param {Object} puntuaciones - { Realista, Investigador, Artístico, Social, Emprendedor, Convencional }
   * @param {string} codigoHolland - Ej: "RIA", "SEC"
   * @param {Array} carrerasSpecs - Lista de { name, interestCode, faculty, area }
   * @param {Object|null} trayectoria - Trayectoria escolar opcional
   * @returns {Promise<string>} - JSON string con analisis_llm para guardar en resultados_orientacion
   */
  async generarRecomendacionesICO(puntuaciones, codigoHolland, carrerasSpecs, trayectoria = null) {
    const prompt = this.construirPromptICO(puntuaciones, codigoHolland, carrerasSpecs, trayectoria);
    return await this.generarRespuestaJSON(prompt);
  }

  /**
   * Igual que generarRecomendacionesICO pero además llama a un segundo modelo con el mismo prompt
   * para validación. Si USE_HUGGINGFACE_VALIDATION=true se usa Hugging Face; si no,
   * si USE_GROK_VALIDATION=true se usa Grok (xAI). La respuesta principal es siempre la de Gemini.
   * @returns {Promise<{ respuestaGemini: string, respuestaHuggingface?: string, errorHuggingface?: string, respuestaGrok?: string, errorGrok?: string }>}
   */
  async generarRecomendacionesICOConValidacion(puntuaciones, codigoHolland, carrerasSpecs, trayectoria = null) {
    const prompt = this.construirPromptICO(puntuaciones, codigoHolland, carrerasSpecs, trayectoria);

    const respuestaGemini = await this.generarRespuestaJSON(prompt);

    let respuestaGemini2;
    let respuestaHuggingface;
    let respuestaHuggingface2;
    let errorHuggingface;
    let respuestaGrok;
    let errorGrok;

    const useAutoconsistencia = process.env.VALIDAR_AUTOCONSISTENCIA_LLM === 'true';
    const useHuggingface = process.env.USE_HUGGINGFACE_VALIDATION === 'true';
    const useGrok = process.env.USE_GROK_VALIDATION === 'true';

    if (useAutoconsistencia) {
      try {
        console.log('[LLM] Segunda llamada a Gemini (autoconsistencia)...');
        respuestaGemini2 = await this.generarRespuestaJSON(prompt);
        console.log('[LLM] Gemini autoconsistencia OK.');
      } catch (err) {
        console.warn('[LLM] Segunda llamada Gemini falló:', err?.message);
      }
    }

    if (useHuggingface) {
      console.log('[LLM] Validación ICO: Hugging Face');
      const tieneToken = !!process.env.HUGGINGFACE_TOKEN?.trim();
      if (!tieneToken) {
        console.warn('[LLM] USE_HUGGINGFACE_VALIDATION=true pero HUGGINGFACE_TOKEN no está configurada. No se llama a Hugging Face.');
        errorHuggingface = 'HUGGINGFACE_TOKEN no configurada en .env';
      } else {
        try {
          console.log('[LLM] Llamando a Hugging Face para validación...');
          respuestaHuggingface = await huggingfaceValidationService.generarRespuestaJSON(prompt);
          console.log('[LLM] Hugging Face respondió correctamente.');
          if (useAutoconsistencia) {
            console.log('[LLM] Segunda llamada a Hugging Face (autoconsistencia)...');
            respuestaHuggingface2 = await huggingfaceValidationService.generarRespuestaJSON(prompt);
            console.log('[LLM] Hugging Face autoconsistencia OK.');
          }
        } catch (err) {
          const msg = err?.message || String(err);
          console.error('[LLM] Validación Hugging Face falló (se usa solo Gemini):', msg);
          errorHuggingface = msg;
        }
      }
    } else if (useGrok) {
      console.log('[LLM] Validación ICO: Grok (xAI)');
      const tieneApiKey = !!process.env.GROK_API_KEY?.trim();
      if (!tieneApiKey) {
        console.warn('[LLM] USE_GROK_VALIDATION=true pero GROK_API_KEY no está configurada. No se llama a Grok.');
        errorGrok = 'GROK_API_KEY no configurada en .env';
      } else {
        try {
          console.log('[LLM] Llamando a Grok (xAI) para validación...');
          respuestaGrok = await grokValidationService.generarRespuestaJSON(prompt);
          console.log('[LLM] Grok respondió correctamente.');
        } catch (err) {
          const msg = err?.message || String(err);
          console.error('[LLM] Validación Grok falló (se usa solo Gemini):', msg);
          errorGrok = msg;
        }
      }
    }

    return {
      respuestaGemini,
      respuestaGemini2,
      respuestaHuggingface,
      respuestaHuggingface2,
      errorHuggingface,
      respuestaGrok,
      errorGrok,
    };
  }

  /**
   * Chat con historial de conversación.
   * Usa instrucción de sistema para respuestas en texto plano y limpia markdown residual.
   */
  async chat(mensajes, contexto = {}) {
    try {
      if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        throw new Error('Se requiere un array de mensajes con al menos un mensaje');
      }

      const ultimoMensaje = mensajes[mensajes.length - 1];
      const mensajesAnteriores = mensajes.slice(0, -1);

      const historial = mensajesAnteriores.map(msg => {
        const role = msg.role === 'assistant' ? 'model' : (msg.role || 'user');
        return {
          role: role,
          parts: [{ text: msg.content }]
        };
      });

      const systemInstruction = construirSystemInstruction(contexto);

      const chatModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig,
        safetySettings
      });

      let result;
      if (historial.length > 0) {
        const chat = chatModel.startChat({
          history: historial,
          generationConfig,
          safetySettings
        });
        result = await chat.sendMessage(ultimoMensaje.content);
      } else {
        result = await chatModel.generateContent(ultimoMensaje.content);
      }

      const response = await result.response;
      let text = response.text();
      text = limpiarMarkdownParaChat(text);

      return text;
    } catch (error) {
      console.error('Error en chat:', error);
      if (error.message) {
        console.error('Mensaje de error:', error.message);
      }
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      throw new ApiError(500, `Error en chat con LLM: ${error.message || 'Error desconocido'}`);
    }
  }
}

module.exports = new LLMService();