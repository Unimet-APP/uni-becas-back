const { PreguntaOrientacion, SesionTestOrientacion } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

class BancoPreguntasService {
  /**
   * Obtiene preguntas para Ronda 1 del test
   * Selecciona 2 preguntas por dimensión (1 alta, 1 media)
   * @param {string} tipoTest - Tipo de test ('Kuder' o 'Holland_RIASEC')
   * @param {string} usuarioId - ID del usuario
   * @param {string} seed - Seed aleatorio para reproducibilidad
   * @returns {Promise<Array>} - Array de preguntas seleccionadas
   */
  async obtenerPreguntasRonda1(tipoTest, usuarioId, seed) {
    try {
      console.log(`[BancoPreguntasService] Obteniendo preguntas para test: ${tipoTest}`);
      
      // 1. Obtener todas las preguntas activas del tipo de test
      const todasPreguntas = await PreguntaOrientacion.findAll({
        where: {
          tipo_test: tipoTest,
          activa: true,
        },
        order: [['efectividad_historica', 'DESC']],
      });

      console.log(`[BancoPreguntasService] Total preguntas encontradas: ${todasPreguntas.length}`);

      if (todasPreguntas.length === 0) {
        throw new ApiError(404, `No hay preguntas disponibles para el test ${tipoTest}`);
      }

      // 2. Obtener preguntas ya usadas por el usuario en tests previos
      const preguntasUsadas = await this.obtenerPreguntasUsadasPorUsuario(usuarioId);

      // 3. Agrupar por dimensión
      const porDimension = this.agruparPorDimension(todasPreguntas);

      // 4. Seleccionar preguntas (2 por dimensión: 1 alta, 1 media)
      const preguntasSeleccionadas = [];

      for (const dimension in porDimension) {
        const disponibles = porDimension[dimension].filter(
          (p) => !preguntasUsadas.includes(p.id)
        );

        if (disponibles.length === 0) {
          // Si no hay disponibles sin usar, usar todas
          const todasDisponibles = porDimension[dimension];
          const alta = this.seleccionarAleatoria(
            todasDisponibles.filter((p) => p.peso === 'alta'),
            seed + dimension + 'alta'
          );
          const media = this.seleccionarAleatoria(
            todasDisponibles.filter((p) => p.peso === 'media'),
            seed + dimension + 'media'
          );

          if (alta) preguntasSeleccionadas.push(alta);
          if (media) preguntasSeleccionadas.push(media);
        } else {
          // Seleccionar de las no usadas
          const alta = this.seleccionarAleatoria(
            disponibles.filter((p) => p.peso === 'alta'),
            seed + dimension + 'alta'
          );
          const media = this.seleccionarAleatoria(
            disponibles.filter((p) => p.peso === 'media'),
            seed + dimension + 'media'
          );

          if (alta) preguntasSeleccionadas.push(alta);
          if (media && media.id !== alta?.id) preguntasSeleccionadas.push(media);
        }
      }

      // 5. Mezclar aleatoriamente (usando seed)
      return this.mezclarAleatoriamente(preguntasSeleccionadas, seed);
    } catch (error) {
      console.error('Error en obtenerPreguntasRonda1:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al obtener preguntas Ronda 1: ${error.message}`);
    }
  }

  /**
   * Obtiene preguntas para Ronda 2 (selección adaptativa)
   * @param {string} sesionId - ID de la sesión
   * @param {Object} puntuacionesRonda1 - Puntuaciones por dimensión de Ronda 1
   * @param {Array} discrepancias - Discrepancias detectadas
   * @param {Array} areasAmbiguas - Áreas con ambigüedad (40-60)
   * @returns {Promise<Array>} - Array de preguntas seleccionadas
   */
  async obtenerPreguntasRonda2(sesionId, puntuacionesRonda1, discrepancias, areasAmbiguas) {
    try {
      const sesion = await SesionTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      const preguntasSeleccionadas = [];
      const dimensiones = Object.keys(puntuacionesRonda1);

      // Seleccionar preguntas según puntuaciones
      for (const dimension of dimensiones) {
        const puntuacion = puntuacionesRonda1[dimension] || 0;

        if (puntuacion > 60) {
          // Alto interés: 2-3 preguntas de confirmación (peso alta)
          const confirmacion = await PreguntaOrientacion.obtenerPolarizantes(
            sesion.tipo_test,
            3
          );
          const deEstaDimension = confirmacion
            .filter((p) => p.dimension_principal === dimension)
            .slice(0, 2);
          preguntasSeleccionadas.push(...deEstaDimension);
        } else if (puntuacion < 40) {
          // Bajo interés: 1-2 preguntas de validación (peso baja)
          const validacion = await PreguntaOrientacion.findAll({
            where: {
              tipo_test: sesion.tipo_test,
              dimension_principal: dimension,
              peso: 'baja',
              activa: true,
            },
            order: [['efectividad_historica', 'DESC']],
            limit: 2,
          });
          preguntasSeleccionadas.push(...validacion);
        } else {
          // Ambiguas (40-60): 2 preguntas polarizantes
          const polarizantes = await PreguntaOrientacion.obtenerPolarizantes(
            sesion.tipo_test,
            5
          );
          const deEstaDimension = polarizantes
            .filter((p) => p.dimension_principal === dimension)
            .slice(0, 2);
          preguntasSeleccionadas.push(...deEstaDimension);
        }
      }

      // Agregar preguntas de validación cruzada si hay discrepancias
      if (discrepancias && discrepancias.length > 0) {
        const preguntasValidacion = await this.seleccionarPreguntasValidacionCruzada(
          discrepancias,
          sesion.tipo_test
        );
        preguntasSeleccionadas.push(...preguntasValidacion);
      }

      // Aplicar reglas anti-sesgo
      const preguntasFinales = await this.aplicarReglasAntiSesgo(
        preguntasSeleccionadas,
        dimensiones,
        sesion.tipo_test
      );

      return preguntasFinales;
    } catch (error) {
      console.error('Error en obtenerPreguntasRonda2:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al obtener preguntas Ronda 2: ${error.message}`);
    }
  }

  /**
   * Aplica reglas anti-sesgo para garantizar cobertura completa
   * @param {Array} preguntasSeleccionadas - Preguntas ya seleccionadas
   * @param {Array} dimensiones - Todas las dimensiones del test
   * @param {string} tipoTest - Tipo de test
   * @returns {Promise<Array>} - Preguntas con reglas aplicadas
   */
  async aplicarReglasAntiSesgo(preguntasSeleccionadas, dimensiones, tipoTest) {
    const dimensionesCubiertas = new Set(
      preguntasSeleccionadas.map((p) => p.dimension_principal)
    );

    // Regla 1: Mínimo 1 pregunta por dimensión
    for (const dimension of dimensiones) {
      if (!dimensionesCubiertas.has(dimension)) {
        // Agregar pregunta de validación (peso baja)
        const preguntaMinima = await PreguntaOrientacion.findOne({
          where: {
            tipo_test: tipoTest,
            dimension_principal: dimension,
            activa: true,
          },
          order: [['efectividad_historica', 'DESC']],
        });

        if (preguntaMinima) {
          preguntasSeleccionadas.push(preguntaMinima);
          dimensionesCubiertas.add(dimension);
        }
      }
    }

    // Eliminar duplicados
    const idsVistos = new Set();
    const preguntasUnicas = preguntasSeleccionadas.filter((p) => {
      if (idsVistos.has(p.id)) {
        return false;
      }
      idsVistos.add(p.id);
      return true;
    });

    return preguntasUnicas;
  }

  /**
   * Selecciona preguntas de validación cruzada para discrepancias
   * @param {Array} discrepancias - Array de discrepancias detectadas
   * @param {string} tipoTest - Tipo de test
   * @returns {Promise<Array>} - Preguntas de validación
   */
  async seleccionarPreguntasValidacionCruzada(discrepancias, tipoTest) {
    const preguntas = [];

    for (const discrepancia of discrepancias) {
      if (!discrepancia.dimension || !discrepancia.necesita_validacion) {
        continue;
      }

      // Buscar pregunta con correlación académica si existe
      let pregunta = null;

      if (discrepancia.evidencia_academica?.area) {
        // Intentar buscar por correlación académica
        const todasPreguntas = await PreguntaOrientacion.findAll({
          where: {
            tipo_test: tipoTest,
            dimension_principal: discrepancia.dimension,
            activa: true,
          },
        });

        // Filtrar manualmente por correlaciones_academicas (JSONB)
        pregunta = todasPreguntas.find((p) => {
          const correlaciones = p.correlaciones_academicas || {};
          const asignaturas = correlaciones.asignaturas || [];
          return asignaturas.some(
            (a) => a.toLowerCase().includes(discrepancia.evidencia_academica.area.toLowerCase())
          );
        });
      }

      // Si no se encontró por correlación, buscar cualquier pregunta de validación
      if (!pregunta) {
        pregunta = await PreguntaOrientacion.findOne({
          where: {
            tipo_test: tipoTest,
            dimension_principal: discrepancia.dimension,
            peso: 'baja',
            activa: true,
          },
          order: [['efectividad_historica', 'DESC']],
        });
      }

      if (pregunta) {
        preguntas.push(pregunta);
      }
    }

    return preguntas;
  }

  /**
   * Actualiza la efectividad de una pregunta
   * @param {string} preguntaId - ID de la pregunta
   * @param {boolean} fueCorrecta - Si la predicción fue correcta
   * @returns {Promise<Object>} - Pregunta actualizada
   */
  async actualizarEfectividadPregunta(preguntaId, fueCorrecta) {
    try {
      const pregunta = await PreguntaOrientacion.findByPk(preguntaId);

      if (!pregunta) {
        throw new ApiError(404, 'Pregunta no encontrada');
      }

      await pregunta.update({
        veces_usada: pregunta.veces_usada + 1,
        veces_efectiva: fueCorrecta ? pregunta.veces_efectiva + 1 : pregunta.veces_efectiva,
      });

      // Recalcular efectividad
      await pregunta.calcularEfectividad();

      return pregunta;
    } catch (error) {
      console.error('Error en actualizarEfectividadPregunta:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al actualizar efectividad: ${error.message}`);
    }
  }

  // Métodos auxiliares privados

  /**
   * Obtiene IDs de preguntas ya usadas por el usuario
   * @private
   */
  async obtenerPreguntasUsadasPorUsuario(usuarioId) {
    const sesiones = await SesionTestOrientacion.findAll({
      where: {
        usuario_id: usuarioId,
        estado: {
          [Op.in]: ['ronda_1_completada', 'ronda_2_completada', 'finalizada'],
        },
      },
    });

    const preguntasUsadas = new Set();
    for (const sesion of sesiones) {
      if (sesion.preguntas_ronda_1) {
        sesion.preguntas_ronda_1.forEach((id) => preguntasUsadas.add(id));
      }
      if (sesion.preguntas_ronda_2) {
        sesion.preguntas_ronda_2.forEach((id) => preguntasUsadas.add(id));
      }
    }

    return Array.from(preguntasUsadas);
  }

  /**
   * Agrupa preguntas por dimensión principal
   * @private
   */
  agruparPorDimension(preguntas) {
    const agrupadas = {};

    for (const pregunta of preguntas) {
      const dimension = pregunta.dimension_principal;
      if (!agrupadas[dimension]) {
        agrupadas[dimension] = [];
      }
      agrupadas[dimension].push(pregunta);
    }

    return agrupadas;
  }

  /**
   * Selecciona una pregunta aleatoria usando seed
   * @private
   */
  seleccionarAleatoria(preguntas, seed) {
    if (preguntas.length === 0) return null;
    if (preguntas.length === 1) return preguntas[0];

    // Generar número pseudoaleatorio basado en seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash = hash & hash; // Convertir a 32bit integer
    }

    const index = Math.abs(hash) % preguntas.length;
    return preguntas[index];
  }

  /**
   * Mezcla array de preguntas usando seed
   * @private
   */
  mezclarAleatoriamente(preguntas, seed) {
    if (preguntas.length <= 1) return preguntas;

    const mezcladas = [...preguntas];
    for (let i = mezcladas.length - 1; i > 0; i--) {
      // Generar índice aleatorio basado en seed
      let hash = 0;
      const seedCombinado = seed + i;
      for (let j = 0; j < seedCombinado.length; j++) {
        hash = (hash << 5) - hash + seedCombinado.charCodeAt(j);
        hash = hash & hash;
      }

      const j = Math.abs(hash) % (i + 1);
      [mezcladas[i], mezcladas[j]] = [mezcladas[j], mezcladas[i]];
    }

    return mezcladas;
  }
}

module.exports = new BancoPreguntasService();

