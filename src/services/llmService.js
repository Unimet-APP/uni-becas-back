// ✅ Importar modelName, generationConfig, safetySettings
const { genAI, modelName, generationConfig, safetySettings } = require('../config/gemini');
const ApiError = require('../utils/ApiError');

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
      // Construir el prompt completo con contexto
      const promptCompleto = this.construirPrompt(prompt, context);
      
      const result = await this.model.generateContent(promptCompleto);
      const response = await result.response;
      const text = response.text();
      
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
   * Genera recomendaciones para el test ICO usando puntuaciones RIASEC y especificaciones UNIMET.
   * No modifica el flujo Holland RIASEC existente.
   * @param {Object} puntuaciones - { Realista, Investigador, Artístico, Social, Emprendedor, Convencional }
   * @param {string} codigoHolland - Ej: "RIA", "SEC"
   * @param {Array} carrerasSpecs - Lista de { name, interestCode, faculty, area }
   * @returns {Promise<string>} - JSON string con analisis_llm para guardar en resultados_orientacion
   */
  async generarRecomendacionesICO(puntuaciones, codigoHolland, carrerasSpecs, trayectoria = null) {
    const carrerasTexto = carrerasSpecs.map((c, i) =>
      `${i + 1}. ${c.name} (Interest code: ${c.interestCode || 'N/A'}, Facultad: ${c.faculty || 'N/A'}, Área: ${c.area || 'N/A'})`
    ).join('\n');

    const bloqueTrayectoria = trayectoria && Object.keys(trayectoria).length > 0
      ? `

TRAYECTORIA ESCOLAR DEL USUARIO (úsala para afinar recomendaciones y razones):
${JSON.stringify(trayectoria, null, 2)}

Considera esta trayectoria al redactar el perfil vocacional, las razones de cada carrera y las sugerencias de acompañamiento (por ejemplo: materias en las que destaca, grado actual, actividades o proyectos).`
      : '';

    const prompt = `Eres un orientador vocacional experto. Un usuario completó el test ICO (Inventario de Orientación) y obtuvo las siguientes puntuaciones por dimensión RIASEC (0-100):

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

    return await this.generarRespuestaJSON(prompt);
  }

  /**
   * Chat con historial de conversación
   * ✅ CORREGIDO: Historial excluye el último mensaje y convierte 'assistant' a 'model'
   */
  async chat(mensajes, contexto = {}) {
    try {
      // Validar que hay mensajes
      if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        throw new Error('Se requiere un array de mensajes con al menos un mensaje');
      }

      // Separar el último mensaje (se envía por separado)
      const ultimoMensaje = mensajes[mensajes.length - 1];
      const mensajesAnteriores = mensajes.slice(0, -1);

      // Construir historial solo con los mensajes anteriores
      // ✅ CORREGIDO: Convertir 'assistant' a 'model' (formato que espera Gemini)
      const historial = mensajesAnteriores.map(msg => {
        const role = msg.role === 'assistant' ? 'model' : (msg.role || 'user');
        
        return {
          role: role,
          parts: [{ text: msg.content }]
        };
      });

      let result;
      
      if (historial.length > 0) {
        // Si hay historial, usar startChat con historial
        const chat = this.model.startChat({
          history: historial,
          generationConfig: generationConfig,
          safetySettings: safetySettings
        });
        
        // ✅ CORREGIDO: Enviar solo el último mensaje
        result = await chat.sendMessage(ultimoMensaje.content);
      } else {
        // Si no hay historial, usar generateContent directamente
        result = await this.model.generateContent(ultimoMensaje.content);
      }

      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('Error en chat:', error);
      // Mostrar más detalles del error para debugging
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