const {
  SesionesTestOrientacion,
  RespuestasTestOrientacion,
  ResultadosOrientacion,
  Usuario,
  PreguntasOrientacion
} = require('../models');

const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

class TestOrientacionService {
  
  /**
   * Crea una nueva sesión de test
   */
  async crearSesion(usuarioId, tipoTest) {
    try {
      const seed = `${Date.now()}-${Math.random()}`;
      
      const sesion = await SesionesTestOrientacion.create({
        usuarioId,
        tipoTest,
        estado: 'iniciada',
        seed_aleatorio: seed,
        fecha_inicio: new Date(),
      });

      return sesion;
    } catch (error) {
      this._handleError('crearSesion', error);
    }
  }

  /**
   * Guarda las respuestas de la ronda 1
   */
  async guardarRespuestasRonda1(sesionId, respuestas, usuarioId) {
    try {
      const sesion = await SesionesTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      // Guardar cada respuesta
      const respuestasGuardadas = [];
      for (const respuesta of respuestas) {
        const respuestaGuardada = await RespuestasTestOrientacion.create({
          sesionId: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuarioId: usuarioId,
          ronda: 1,
          respuesta: respuesta.respuesta,
          respuesta_correcta: respuesta.respuestaCorrecta || false,
          dimension_predicha: respuesta.dimensionPredicha || '',
          tiempo_respuesta: respuesta.tiempoRespuesta || 0,
          nivel_seguridad: respuesta.nivelSeguridad || 'no_seguro',
          time_stamp_respuesta: new Date(),
        });
        respuestasGuardadas.push(respuestaGuardada);
      }

      // Calcular puntuaciones
      const puntuaciones = this.calcularPuntuaciones(respuestasGuardadas, sesion.tipoTest);
      const ambiguedades = this.detectarAmbiguedades(puntuaciones);

      // Actualizar sesión
      await sesion.update({
        estado: 'ronda_1_completada',
        fecha_ronda_1: new Date(),
        preguntas_ronda_1: respuestas.map(r => r.preguntaId),
        puntuaciones_ronda_1: puntuaciones,
        nivel_confianza_ronda_1: this.calcularNivelConfianza(puntuaciones),
        areas_ambiguedad: ambiguedades,
      });

      return {
        sesion,
        puntuaciones,
        ambiguedades,
      };
    } catch (error) {
      this._handleError('guardarRespuestasRonda1', error);
    }
  }

  /**
   * Guarda las respuestas de la ronda 2
   */
  async guardarRespuestasRonda2(sesionId, respuestas, usuarioId) {
    try {
      const sesion = await SesionesTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      // Guardar cada respuesta
      const respuestasGuardadas = [];
      for (const respuesta of respuestas) {
        const respuestaGuardada = await RespuestasTestOrientacion.create({
          sesionId: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuarioId: usuarioId,
          ronda: 2,
          respuesta: respuesta.respuesta,
          respuesta_correcta: respuesta.respuestaCorrecta || false,
          dimension_predicha: respuesta.dimensionPredicha || '',
          tiempo_respuesta: respuesta.tiempoRespuesta || 0,
          nivel_seguridad: respuesta.nivelSeguridad || 'no_seguro',
          time_stamp_respuesta: new Date(),
        });
        respuestasGuardadas.push(respuestaGuardada);
      }

      // Calcular puntuaciones
      const puntuacionesRonda2 = this.calcularPuntuaciones(respuestasGuardadas, sesion.tipoTest);
      const puntuacionesRonda1 = sesion.puntuaciones_ronda_1 || {};

      // Calcular puntuaciones finales
      const puntuacionesFinales = this.calcularPuntuacionesFinales(
        puntuacionesRonda1,
        puntuacionesRonda2,
        {}
      );

      // Actualizar sesión
      await sesion.update({
        estado: 'ronda_2_completada',
        fecha_ronda_2: new Date(),
        preguntas_ronda_2: respuestas.map(r => r.preguntaId),
        puntuaciones_ronda_2: puntuacionesRonda2,
        nivel_confianza_ronda_2: this.calcularNivelConfianza(puntuacionesRonda2),
      });

      return {
        sesion,
        puntuacionesFinales,
      };
    } catch (error) {
      this._handleError('guardarRespuestasRonda2', error);
    }
  }

  /**
   * Calcula las puntuaciones por dimensión basándose en las respuestas
   */
  calcularPuntuaciones(respuestas, tipoTest) {
    const puntuaciones = {};
    const dimensionesHolland = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];

    // Inicializar puntuaciones
    dimensionesHolland.forEach(dim => {
      puntuaciones[dim] = 0;
    });

    // Calcular puntuaciones basándose en las respuestas
    for (const respuesta of respuestas) {
      const pregunta = respuesta.pregunta || {};
      const dimensionPrincipal = pregunta.dimension_principal;
      
      if (dimensionPrincipal && puntuaciones.hasOwnProperty(dimensionPrincipal)) {
        // Peso de la pregunta
        const peso = this._obtenerPesoNumerico(pregunta.peso_pregunta || 'media');
        
        // Si la respuesta es positiva (true), suma puntos
        if (respuesta.respuesta === true) {
          puntuaciones[dimensionPrincipal] += peso;
        }
        
        // También considerar dimensiones secundarias
        const dimensionesSecundarias = pregunta.dimension_secundaria || [];
        if (Array.isArray(dimensionesSecundarias)) {
          dimensionesSecundarias.forEach(dimSec => {
            if (puntuaciones.hasOwnProperty(dimSec)) {
              puntuaciones[dimSec] += peso * 0.3; // 30% del peso principal
            }
          });
        }
      }
    }

    // Normalizar a porcentajes (0-100)
    const maxPuntuacion = Math.max(...Object.values(puntuaciones));
    if (maxPuntuacion > 0) {
      Object.keys(puntuaciones).forEach(dim => {
        puntuaciones[dim] = Math.round((puntuaciones[dim] / maxPuntuacion) * 100);
      });
    }

    return puntuaciones;
  }

  /**
   * Detecta áreas con ambigüedad (puntuaciones similares)
   */
  detectarAmbiguedades(puntuaciones) {
    const valores = Object.values(puntuaciones);
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const desviacion = Math.sqrt(
      valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length
    );

    const ambiguedades = [];
    Object.keys(puntuaciones).forEach(dimension => {
      const diferencia = Math.abs(puntuaciones[dimension] - promedio);
      if (diferencia < desviacion * 0.5) {
        ambiguedades.push({
          dimension,
          puntuacion: puntuaciones[dimension],
          razon: 'Puntuación cercana al promedio',
        });
      }
    });

    return ambiguedades;
  }

  /**
   * Detecta discrepancias entre el test y la trayectoria académica
   */
  async detectarDiscrepancias(puntuaciones, trayectoriaAcademica) {
    const discrepancias = [];

    if (!trayectoriaAcademica) {
      return discrepancias;
    }

    // Mapeo de áreas académicas a dimensiones Holland
    const mapeoAreas = {
      'Matemáticas': 'Investigador',
      'Física': 'Investigador',
      'Química': 'Investigador',
      'Biología': 'Investigador',
      'Arte': 'Artístico',
      'Música': 'Artístico',
      'Literatura': 'Artístico',
      'Psicología': 'Social',
      'Sociología': 'Social',
      'Educación': 'Social',
      'Administración': 'Emprendedor',
      'Economía': 'Emprendedor',
      'Contabilidad': 'Convencional',
      'Tecnología': 'Realista',
    };

    // Analizar rendimiento por área
    const asignaturasPorArea = trayectoriaAcademica.asignaturas_por_area || {};
    
    Object.keys(asignaturasPorArea).forEach(area => {
      const dimensionEsperada = mapeoAreas[area];
      if (dimensionEsperada && puntuaciones[dimensionEsperada]) {
        const rendimiento = asignaturasPorArea[area]?.promedio || 0;
        const puntuacionTest = puntuaciones[dimensionEsperada] || 0;

        // Si hay buen rendimiento académico pero baja puntuación en el test
        if (rendimiento > 15 && puntuacionTest < 40) {
          discrepancias.push({
            dimension: dimensionEsperada,
            area_academica: area,
            rendimiento_academico: rendimiento,
            puntuacion_test: puntuacionTest,
            necesita_validacion: true,
            tipo: 'bajo_interes_alto_rendimiento',
          });
        }
        // Si hay baja puntuación académica pero alto interés en el test
        else if (rendimiento < 12 && puntuacionTest > 70) {
          discrepancias.push({
            dimension: dimensionEsperada,
            area_academica: area,
            rendimiento_academico: rendimiento,
            puntuacion_test: puntuacionTest,
            necesita_validacion: true,
            tipo: 'alto_interes_bajo_rendimiento',
          });
        }
      }
    });

    return discrepancias;
  }

  /**
   * Calcula las puntuaciones finales combinando ambas rondas
   */
  calcularPuntuacionesFinales(puntuacionesRonda1, puntuacionesRonda2, factoresCorreccion) {
    const puntuacionesFinales = {};
    const dimensiones = Object.keys(puntuacionesRonda1);

    dimensiones.forEach(dimension => {
      const ronda1 = puntuacionesRonda1[dimension] || 0;
      const ronda2 = puntuacionesRonda2[dimension] || 0;
      
      // Ponderación: 40% ronda 1, 60% ronda 2 (la ronda 2 es más específica)
      let puntuacionFinal = (ronda1 * 0.4) + (ronda2 * 0.6);
      
      // Aplicar factores de corrección si existen
      if (factoresCorreccion[dimension]) {
        puntuacionFinal *= factoresCorreccion[dimension];
      }

      puntuacionesFinales[dimension] = Math.round(puntuacionFinal);
    });

    return puntuacionesFinales;
  }

  /**
   * Obtiene el historial de tests de un usuario
   */
  async obtenerHistorial(usuarioId) {
    try {
      const sesiones = await SesionesTestOrientacion.findAll({
        where: {
          usuarioId: usuarioId,
          estado: {
            [Op.in]: ['ronda_1_completada', 'ronda_2_completada', 'finalizada'],
          },
        },
        include: [
          {
            model: ResultadosOrientacion,
            as: 'resultado',
          },
        ],
        order: [['fecha_inicio', 'DESC']],
      });

      return sesiones;
    } catch (error) {
      this._handleError('obtenerHistorial', error);
    }
  }

  /**
   * Calcula el nivel de confianza general
   */
  calcularNivelConfianza(puntuaciones) {
    const valores = Object.values(puntuaciones);
    const max = Math.max(...valores);
    const min = Math.min(...valores);
    const diferencia = max - min;
    
    // Mayor diferencia = mayor confianza (perfiles más definidos)
    return Math.min(100, Math.max(0, diferencia));
  }

  /**
   * Obtiene el peso numérico de una pregunta
   */
  _obtenerPesoNumerico(peso) {
    const pesos = {
      'alta': 3,
      'media': 2,
      'baja': 1,
    };
    return pesos[peso] || 2;
  }

  /**
   * Manejo de errores
   */
  _handleError(metodo, error) {
    console.error(`Error en TestOrientacionService.${metodo}:`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error en TestOrientacionService > ${metodo}: ${error.message}`);
  }
}

module.exports = new TestOrientacionService();
