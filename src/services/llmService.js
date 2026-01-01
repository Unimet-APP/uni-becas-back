const { genAI, modelConfig } = require('../config/gemini');
const ApiError = require('../utils/ApiError');
class LLMService {
  constructor() {
    this.model = genAI.getGenerativeModel(modelConfig);
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
      throw new ApiError(500, 'Error al generar respuesta del LLM');
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
   * Chat con historial de conversación
   */
  async chat(mensajes, contexto = {}) {
    try {
      // Construir historial de conversación
      const historial = mensajes.map(msg => ({
        role: msg.role || 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = this.model.startChat({
        history: historial,
        generationConfig: modelConfig.generationConfig,
      });

      const ultimoMensaje = mensajes[mensajes.length - 1];
      const result = await chat.sendMessage(ultimoMensaje.content);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Error en chat:', error);
      throw new ApiError(500, 'Error en chat con LLM');
    }
  }
}

module.exports = new LLMService();