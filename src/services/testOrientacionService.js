const {
  SesionTestOrientacion,
  RespuestaTestOrientacion,
  PreguntaOrientacion,
  Usuario,
  TrayectoriaAcademica,
} = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const bancoPreguntasService = require('./bancoPreguntasService');
const trayectoriaAcademicaService = require('./trayectoriaAcademicaService');

class TestOrientacionService {
  /**
   * Crea una nueva sesión de test
   * @param {string} usuarioId - ID del usuario
   * @param {string} tipoTest - Tipo de test ('Kuder' o 'Holland_RIASEC')
   * @returns {Promise<Object>} - Sesión creada con preguntas
   */
  async crearSesion(usuarioId, tipoTest) {
    try {
      // 1. Validar usuario
      const usuario = await Usuario.findByPk(usuarioId);
      if (!usuario) {
        throw new ApiError(404, 'Usuario no encontrado');
      }

      if (usuario.role !== 'estudiante') {
        throw new ApiError(400, 'Solo los estudiantes pueden realizar tests de orientación');
      }

      // 2. Validar tipo de test
      if (!['Kuder', 'Holland_RIASEC'].includes(tipoTest)) {
        throw new ApiError(400, 'Tipo de test no válido');
      }

      // 3. Verificar si hay sesión activa
      const sesionActiva = await SesionTestOrientacion.obtenerActivaPorUsuario(usuarioId);
      if (sesionActiva) {
        // Abandonar sesión anterior
        await sesionActiva.update({ estado: 'abandonada' });
      }

      // 4. Generar seed aleatorio
      const seed = `${usuarioId}-${Date.now()}-${Math.random()}`;

      // 5. Crear sesión
      const sesion = await SesionTestOrientacion.create({
        usuario_id: usuarioId,
        tipo_test: tipoTest,
        estado: 'iniciada',
        seed_aleatorio: seed,
        fecha_inicio: new Date(),
      });

      // 6. Obtener preguntas Ronda 1
      const preguntas = await bancoPreguntasService.obtenerPreguntasRonda1(
        tipoTest,
        usuarioId,
        seed
      );

      // 7. Guardar IDs de preguntas en sesión
      await sesion.update({
        preguntas_ronda_1: preguntas.map((p) => p.id),
      });

      return {
        sesion,
        preguntas: preguntas.map((p) => ({
          id: p.id,
          texto: p.texto_pregunta,
          tipo: p.tipo_pregunta,
          opciones: p.opciones_respuesta,
          instrucciones: p.instrucciones,
        })),
      };
    } catch (error) {
      console.error('Error en crearSesion:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al crear sesión: ${error.message}`);
    }
  }

  /**
   * Guarda respuestas de Ronda 1 y calcula puntuaciones
   * @param {string} sesionId - ID de la sesión
   * @param {Array} respuestas - Array de respuestas
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Puntuaciones y preguntas Ronda 2
   */
  async guardarRespuestasRonda1(sesionId, respuestas, usuarioId) {
    try {
      // 1. Validar sesión
      const sesion = await SesionTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      if (sesion.usuario_id !== usuarioId) {
        throw new ApiError(403, 'No autorizado para esta sesión');
      }

      if (sesion.estado !== 'iniciada') {
        throw new ApiError(400, 'La sesión ya no está en estado iniciada');
      }

      // 2. Validar respuestas
      if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
        throw new ApiError(400, 'Se requiere al menos una respuesta');
      }

      // 3. Guardar respuestas
      for (const respuesta of respuestas) {
        await RespuestaTestOrientacion.create({
          sesion_id: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuario_id: usuarioId,
          ronda: 1,
          respuesta: respuesta.respuesta,
          tiempo_respuesta_segundos: respuesta.tiempoSegundos || null,
          nivel_seguridad: respuesta.nivelSeguridad || null,
        });
      }

      // 4. Calcular puntuaciones
      const puntuaciones = await this.calcularPuntuaciones(respuestas, sesion.tipo_test);

      // 5. Detectar ambigüedades
      const areasAmbiguas = this.detectarAmbiguedades(puntuaciones);

      // 6. Detectar discrepancias
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);
      const discrepancias = await this.detectarDiscrepancias(puntuaciones, trayectoria);

      // 7. Actualizar sesión
      await sesion.completarRonda1(puntuaciones, respuestas.map((r) => r.preguntaId));

      // 8. Obtener preguntas Ronda 2
      const preguntasRonda2 = await bancoPreguntasService.obtenerPreguntasRonda2(
        sesionId,
        puntuaciones,
        discrepancias,
        areasAmbiguas
      );

      // 9. Guardar IDs de preguntas Ronda 2
      await sesion.update({
        preguntas_ronda_2: preguntasRonda2.map((p) => p.id),
        areas_ambiguedad: areasAmbiguas,
        discrepancias_detectadas: discrepancias,
      });

      return {
        puntuaciones,
        areasAmbiguas,
        discrepancias,
        preguntasRonda2: preguntasRonda2.map((p) => ({
          id: p.id,
          texto: p.texto_pregunta,
          tipo: p.tipo_pregunta,
          opciones: p.opciones_respuesta,
          instrucciones: p.instrucciones,
        })),
      };
    } catch (error) {
      console.error('Error en guardarRespuestasRonda1:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al guardar respuestas Ronda 1: ${error.message}`);
    }
  }

  /**
   * Guarda respuestas de Ronda 2
   * @param {string} sesionId - ID de la sesión
   * @param {Array} respuestas - Array de respuestas
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Puntuaciones finales
   */
  async guardarRespuestasRonda2(sesionId, respuestas, usuarioId) {
    try {
      // 1. Validar sesión
      const sesion = await SesionTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      if (sesion.usuario_id !== usuarioId) {
        throw new ApiError(403, 'No autorizado para esta sesión');
      }

      if (sesion.estado !== 'ronda_1_completada') {
        throw new ApiError(400, 'La sesión no está en estado ronda_1_completada');
      }

      // 2. Guardar respuestas
      for (const respuesta of respuestas) {
        await RespuestaTestOrientacion.create({
          sesion_id: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuario_id: usuarioId,
          ronda: 2,
          respuesta: respuesta.respuesta,
          tiempo_respuesta_segundos: respuesta.tiempoSegundos || null,
          nivel_seguridad: respuesta.nivelSeguridad || null,
        });
      }

      // 3. Calcular puntuaciones Ronda 2
      const puntuacionesRonda2 = await this.calcularPuntuaciones(respuestas, sesion.tipo_test);

      // 4. Calcular factores de corrección (por validación cruzada)
      const factoresCorreccion = this.calcularFactoresCorreccion(
        sesion.discrepancias_detectadas || [],
        respuestas
      );

      // 5. Calcular puntuaciones finales
      const puntuacionesFinales = this.calcularPuntuacionesFinales(
        sesion.puntuaciones_ronda_1 || {},
        puntuacionesRonda2,
        factoresCorreccion
      );

      // 6. Actualizar sesión
      await sesion.completarRonda2(puntuacionesRonda2, respuestas.map((r) => r.preguntaId));

      return {
        puntuacionesRonda2,
        puntuacionesFinales,
        factoresCorreccion,
      };
    } catch (error) {
      console.error('Error en guardarRespuestasRonda2:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al guardar respuestas Ronda 2: ${error.message}`);
    }
  }

  /**
   * Calcula puntuaciones por dimensión basado en respuestas
   * @param {Array} respuestas - Array de respuestas con preguntaId y respuesta
   * @param {string} tipoTest - Tipo de test
   * @returns {Promise<Object>} - Puntuaciones por dimensión
   */
  async calcularPuntuaciones(respuestas, tipoTest) {
    // Definir dimensiones según tipo de test
    const dimensiones =
      tipoTest === 'Holland_RIASEC'
        ? ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional']
        : [
            'Mecánica',
            'Cálculo',
            'Científica',
            'Persuasiva',
            'Artística',
            'Literaria',
            'Musical',
            'Servicio Social',
            'Oficina',
            'Exterior',
          ];

    const puntuaciones = {};
    const contadores = {};

    // Inicializar
    for (const dim of dimensiones) {
      puntuaciones[dim] = 0;
      contadores[dim] = 0;
    }

    // Procesar cada respuesta
    for (const respuesta of respuestas) {
      const pregunta = await PreguntaOrientacion.findByPk(respuesta.preguntaId);
      if (!pregunta) continue;

      const esPositiva = this.esRespuestaPositiva(respuesta.respuesta);

      if (esPositiva) {
        // Sumar a dimensión principal
        puntuaciones[pregunta.dimension_principal] += 1;
        contadores[pregunta.dimension_principal] += 1;

        // Sumar parcialmente a dimensiones secundarias
        if (pregunta.dimensiones_secundarias && Array.isArray(pregunta.dimensiones_secundarias)) {
          for (const dimSec of pregunta.dimensiones_secundarias) {
            if (dimensiones.includes(dimSec)) {
              puntuaciones[dimSec] += 0.5;
              contadores[dimSec] += 0.5;
            }
          }
        }
      }
    }

    // Normalizar a 0-100
    const totalRespuestas = respuestas.length;
    if (totalRespuestas > 0) {
      for (const dim of dimensiones) {
        // Normalizar considerando el máximo posible
        const maxPosible = contadores[dim] || 1;
        puntuaciones[dim] = Math.round((puntuaciones[dim] / maxPosible) * 100);
        // Asegurar que esté en rango 0-100
        puntuaciones[dim] = Math.max(0, Math.min(100, puntuaciones[dim]));
      }
    }

    return puntuaciones;
  }

  /**
   * Detecta áreas con ambigüedad (puntuación 40-60)
   * @param {Object} puntuaciones - Puntuaciones por dimensión
   * @returns {Array} - Array de dimensiones ambiguas
   */
  detectarAmbiguedades(puntuaciones) {
    const umbralMin = 40;
    const umbralMax = 60;
    const ambiguas = [];

    for (const dimension in puntuaciones) {
      const puntuacion = puntuaciones[dimension];
      if (puntuacion >= umbralMin && puntuacion <= umbralMax) {
        ambiguas.push(dimension);
      }
    }

    return ambiguas;
  }

  /**
   * Detecta discrepancias entre test y trayectoria académica
   * @param {Object} puntuaciones - Puntuaciones del test
   * @param {Object} trayectoria - Trayectoria académica
   * @returns {Promise<Array>} - Array de discrepancias
   */
  async detectarDiscrepancias(puntuaciones, trayectoria) {
    const discrepancias = [];

    if (!trayectoria) {
      return discrepancias;
    }

    // Mapeo de áreas académicas a dimensiones RIASEC
    const mapeoAreas = {
      Matemáticas: 'Investigador',
      Física: 'Investigador',
      Química: 'Investigador',
      Biología: 'Investigador',
      Computación: 'Investigador',
      Humanidades: 'Social',
      Literatura: 'Social',
      Historia: 'Social',
      Filosofía: 'Social',
      Artes: 'Artístico',
      Música: 'Artístico',
      Diseño: 'Artístico',
      Negocios: 'Emprendedor',
      Administración: 'Emprendedor',
      Economía: 'Emprendedor',
      Ingeniería: 'Realista',
      Arquitectura: 'Realista',
    };

    const asignaturasPorArea = trayectoria.asignaturas_por_area || {};

    for (const area in asignaturasPorArea) {
      const dimensionEsperada = mapeoAreas[area];
      if (!dimensionEsperada) continue;

      const cantidadAsignaturas = asignaturasPorArea[area];
      const puntuacionTest = puntuaciones[dimensionEsperada] || 0;

      // Si tiene muchas asignaturas en un área pero baja puntuación en el test
      if (cantidadAsignaturas >= 3 && puntuacionTest < 40) {
        discrepancias.push({
          dimension: dimensionEsperada,
          puntuacion_test: puntuacionTest,
          evidencia_academica: {
            tipo: 'rendimiento_alto',
            area: area,
            asignaturas_aprobadas: cantidadAsignaturas,
            promedio: trayectoria.iaa || 0,
          },
          necesita_validacion: true,
        });
      }
    }

    return discrepancias;
  }

  /**
   * Calcula factores de corrección por validación cruzada
   * @param {Array} discrepancias - Discrepancias detectadas
   * @param {Array} respuestas - Respuestas de Ronda 2
   * @returns {Object} - Factores de corrección por dimensión
   */
  calcularFactoresCorreccion(discrepancias, respuestas) {
    const factores = {};

    // Si hay discrepancias y respuestas positivas en validación, aplicar corrección
    for (const discrepancia of discrepancias) {
      if (!discrepancia.necesita_validacion) continue;

      const dimension = discrepancia.dimension;
      const respuestasValidacion = respuestas.filter((r) => {
        // Aquí necesitarías verificar si la respuesta es de una pregunta de validación
        // Por simplicidad, asumimos que si hay respuesta positiva, aplicamos corrección
        return this.esRespuestaPositiva(r.respuesta);
      });

      if (respuestasValidacion.length > 0) {
        // Aplicar corrección positiva (+10 a +20 puntos)
        factores[dimension] = 15; // Factor de corrección medio
      }
    }

    return factores;
  }

  /**
   * Calcula puntuaciones finales aplicando pesos dinámicos
   * @param {Object} puntuacionesRonda1 - Puntuaciones de Ronda 1
   * @param {Object} puntuacionesRonda2 - Puntuaciones de Ronda 2
   * @param {Object} factoresCorreccion - Factores de corrección
   * @returns {Object} - Puntuaciones finales
   */
  calcularPuntuacionesFinales(puntuacionesRonda1, puntuacionesRonda2, factoresCorreccion) {
    const PESO_RONDA_1 = 0.4;
    const PESO_RONDA_2 = 0.6;
    const PESO_CORRECCION = 0.1;

    const puntuacionesFinales = {};
    const dimensiones = Object.keys(puntuacionesRonda1);

    for (const dimension of dimensiones) {
      const ronda1 = puntuacionesRonda1[dimension] || 0;
      const ronda2 = puntuacionesRonda2[dimension] || 0;
      const correccion = factoresCorreccion[dimension] || 0;

      const final =
        ronda1 * PESO_RONDA_1 + ronda2 * PESO_RONDA_2 + correccion * PESO_CORRECCION;

      puntuacionesFinales[dimension] = Math.round(Math.max(0, Math.min(100, final)));
    }

    return puntuacionesFinales;
  }

  /**
   * Obtiene historial de tests de un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Array>} - Historial de sesiones
   */
  async obtenerHistorial(usuarioId) {
    try {
      return await SesionTestOrientacion.obtenerHistorialPorUsuario(usuarioId);
    } catch (error) {
      console.error('Error en obtenerHistorial:', error);
      throw new ApiError(500, `Error al obtener historial: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  /**
   * Determina si una respuesta es positiva
   * @private
   */
  esRespuestaPositiva(respuesta) {
    if (typeof respuesta === 'boolean') {
      return respuesta;
    }
    if (typeof respuesta === 'number') {
      return respuesta > 0;
    }
    if (typeof respuesta === 'string') {
      const positiva = respuesta.toLowerCase().trim();
      return ['sí', 'si', 'yes', 'true', '1', 'verdadero'].includes(positiva);
    }
    if (Array.isArray(respuesta)) {
      return respuesta.length > 0;
    }
    return false;
  }
}

module.exports = new TestOrientacionService();

