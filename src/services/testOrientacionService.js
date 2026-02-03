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
   * Crea una nueva sesión de test.
   * Solo puede haber un Holland y un ICO por usuario: si ya tiene resultado de ese tipo, no se crea sesión.
   */
  async crearSesion(usuario_id, tipoTest) {
    try {
      let yaTieneResultado = false;
      try {
        const existente = await ResultadosOrientacion.findOne({
          where: { usuario_id, tipo_test: tipoTest },
        });
        yaTieneResultado = !!existente;
      } catch (errConsulta) {
        // Si falla la consulta (tabla/BD), no bloquear: permitir crear sesión
        console.warn('[TestOrientacionService.crearSesion] No se pudo verificar resultado previo:', errConsulta?.message || errConsulta);
      }
      if (yaTieneResultado) {
        throw new ApiError(
          403,
          tipoTest === 'ICO'
            ? 'Ya completaste el test ICO. Solo puedes realizar un test ICO.'
            : 'Ya completaste el test Holland. Solo puedes realizar un test Holland.'
        );
      }

      const seed = `${Date.now()}-${Math.random()}`;
      const sesion = await SesionesTestOrientacion.create({
        usuario_id: usuario_id,
        tipo_test: tipoTest,
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
   * Normaliza diferentes formatos de respuesta a booleano
   * Para preguntas con opciones múltiples, determina si la opción seleccionada
   * corresponde a la dimensión principal de la pregunta
   */
  _normalizarRespuesta(respuesta, pregunta = null) {
    const tieneOpciones = pregunta && 
                          pregunta.instrucciones_respuesta && 
                          Array.isArray(pregunta.instrucciones_respuesta) && 
                          pregunta.instrucciones_respuesta.length > 0;

    // Si ya es booleano, retornarlo
    if (typeof respuesta === 'boolean') {
      return respuesta;
    }

    // Si es string
    if (typeof respuesta === 'string') {
      const lower = respuesta.toLowerCase().trim();
      // Valores booleanos explícitos
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sí' || lower === 'si') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
      // Si es texto de una opción
      if (tieneOpciones) {
        // Verificar si el texto coincide con alguna opción
        const opcionEncontrada = pregunta.instrucciones_respuesta.find(
          op => op.toLowerCase().trim() === lower || op === respuesta
        );
        // Si coincide con una opción, retornar true
        // (la dimensión se determinará en el cálculo de puntuaciones)
        return opcionEncontrada !== undefined;
      }
      // Por defecto, si es un string no vacío, considerar como true
      return respuesta.length > 0;
    }

    // Si es número
    if (typeof respuesta === 'number') {
      if (tieneOpciones) {
        // Si es un índice de opción válido, retornar true
        // (índice >= 0 y < número de opciones)
        return respuesta >= 0 && respuesta < pregunta.instrucciones_respuesta.length;
      }
      // Para preguntas sin opciones: 0 = false, cualquier otro número = true
      return respuesta !== 0;
    }

    // Si es objeto
    if (typeof respuesta === 'object' && respuesta !== null) {
      // Si tiene valor booleano
      if (typeof respuesta.valor === 'boolean') {
        return respuesta.valor;
      }
      // Si tiene índice de opción
      if (typeof respuesta.indice === 'number') {
        if (tieneOpciones) {
          return respuesta.indice >= 0 && respuesta.indice < pregunta.instrucciones_respuesta.length;
        }
        return respuesta.indice >= 0;
      }
      // Si tiene opción seleccionada (texto o número)
      if (respuesta.opcionSeleccionada !== undefined && respuesta.opcionSeleccionada !== null) {
        if (tieneOpciones) {
          if (typeof respuesta.opcionSeleccionada === 'number') {
            return respuesta.opcionSeleccionada >= 0 && 
                   respuesta.opcionSeleccionada < pregunta.instrucciones_respuesta.length;
          }
          if (typeof respuesta.opcionSeleccionada === 'string') {
            return pregunta.instrucciones_respuesta.includes(respuesta.opcionSeleccionada);
          }
        }
        return true; // Hay una opción seleccionada
      }
    }

    // Por defecto, convertir a booleano
    return Boolean(respuesta);
  }

  /**
   * Guarda las respuestas de la ronda 1
   */
  async guardarRespuestasRonda1(sesionId, respuestas, usuario_id) {
    try {
      const sesion = await SesionesTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      // Cargar preguntas para normalizar respuestas
      const { PreguntasOrientacion } = require('../models');
      const preguntaIds = respuestas.map(r => r.preguntaId);
      const preguntas = await PreguntasOrientacion.findAll({
        where: { id: preguntaIds }
      });
      const preguntasMap = {};
      preguntas.forEach(p => { preguntasMap[p.id] = p; });

      // Guardar cada respuesta
      const respuestasGuardadas = [];
      for (const respuesta of respuestas) {
        const pregunta = preguntasMap[respuesta.preguntaId];
        const respuestaNormalizada = this._normalizarRespuesta(respuesta.respuesta, pregunta);
        
        const respuestaGuardada = await RespuestasTestOrientacion.create({
          sesion_id: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuario_id: usuario_id,
          ronda: 1,
          respuesta: respuestaNormalizada,
          respuesta_correcta: respuesta.respuestaCorrecta || false,
          dimension_predicha: respuesta.dimensionPredicha || '',
          tiempo_respuesta: respuesta.tiempoRespuesta || 0,
          nivel_seguridad: respuesta.nivelSeguridad || 'no_seguro',
          time_stamp_respuesta: new Date(),
        });
        respuestasGuardadas.push(respuestaGuardada);
      }

      // Calcular puntuaciones
      const puntuaciones = await this.calcularPuntuaciones(respuestasGuardadas, sesion.tipo_test);
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
  async guardarRespuestasRonda2(sesionId, respuestas, usuario_id) {
    try {
      const sesion = await SesionesTestOrientacion.findByPk(sesionId);
      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      // Cargar preguntas para normalizar respuestas
      const { PreguntasOrientacion } = require('../models');
      const preguntaIds = respuestas.map(r => r.preguntaId);
      const preguntas = await PreguntasOrientacion.findAll({
        where: { id: preguntaIds }
      });
      const preguntasMap = {};
      preguntas.forEach(p => { preguntasMap[p.id] = p; });

      // Guardar cada respuesta
      const respuestasGuardadas = [];
      for (const respuesta of respuestas) {
        const pregunta = preguntasMap[respuesta.preguntaId];
        const respuestaNormalizada = this._normalizarRespuesta(respuesta.respuesta, pregunta);
        
        const respuestaGuardada = await RespuestasTestOrientacion.create({
          sesion_id: sesionId,
          pregunta_id: respuesta.preguntaId,
          usuario_id: usuario_id,
          ronda: 2,
          respuesta: respuestaNormalizada,
          respuesta_correcta: respuesta.respuestaCorrecta || false,
          dimension_predicha: respuesta.dimensionPredicha || '',
          tiempo_respuesta: respuesta.tiempoRespuesta || 0,
          nivel_seguridad: respuesta.nivelSeguridad || 'no_seguro',
          time_stamp_respuesta: new Date(),
        });
        respuestasGuardadas.push(respuestaGuardada);
      }

      // Calcular puntuaciones
      const puntuacionesRonda2 = await this.calcularPuntuaciones(respuestasGuardadas, sesion.tipo_test);
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
  async calcularPuntuaciones(respuestas, tipoTest) {
    const puntuaciones = {};
    const dimensionesHolland = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];

    // Inicializar puntuaciones
    dimensionesHolland.forEach(dim => {
      puntuaciones[dim] = 0;
    });

    // Obtener IDs de preguntas
    const preguntaIds = respuestas.map(r => r.pregunta_id || r.preguntaId);
    
    // Cargar todas las preguntas de una vez
    const { PreguntasOrientacion } = require('../models');
    const preguntas = await PreguntasOrientacion.findAll({
      where: {
        id: preguntaIds,
        tipo_test: tipoTest,
      },
    });

    // Crear mapa de preguntas por ID
    const preguntasMap = {};
    preguntas.forEach(p => {
      preguntasMap[p.id] = p;
    });

    // Calcular puntuaciones basándose en las respuestas
    for (const respuesta of respuestas) {
      const preguntaId = respuesta.pregunta_id || respuesta.preguntaId;
      const pregunta = preguntasMap[preguntaId];
      
      if (!pregunta) continue;
      
      const dimensionPrincipal = pregunta.dimension_principal;
      const tieneOpciones = pregunta.instrucciones_respuesta && 
                            Array.isArray(pregunta.instrucciones_respuesta) && 
                            pregunta.instrucciones_respuesta.length > 0;
      
      if (dimensionPrincipal && puntuaciones.hasOwnProperty(dimensionPrincipal)) {
        // Peso de la pregunta
        const peso = this._obtenerPesoNumerico(pregunta.peso_pregunta || 'media');
        
        // Si la respuesta es positiva (true), suma puntos a la dimensión principal
        // Para preguntas con opciones, true significa que se seleccionó una opción
        // que corresponde a la dimensión principal
        if (respuesta.respuesta === true) {
          puntuaciones[dimensionPrincipal] += peso;
          
          // Si la pregunta tiene opciones, también considerar dimensiones secundarias
          // según el tipo de pregunta
          if (tieneOpciones) {
            const dimensionesSecundarias = pregunta.dimension_secundaria || [];
            if (Array.isArray(dimensionesSecundarias)) {
              dimensionesSecundarias.forEach(dimSec => {
                if (puntuaciones.hasOwnProperty(dimSec)) {
                  puntuaciones[dimSec] += peso * 0.2; // 20% del peso principal para opciones
                }
              });
            }
          }
        } else {
          // Si la respuesta es false y hay opciones, podría corresponder a otra dimensión
          // Por ahora, no sumamos puntos si es false
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

    // Analizar rendimiento por área usando materias destacadas
    const materiasDestacadas = trayectoriaAcademica.materias_destacadas || [];
    const promedioGeneral = parseFloat(trayectoriaAcademica.promedio_general_acumulado) || 0;
    
    // Si hay materias destacadas, analizar correlaciones
    materiasDestacadas.forEach(materia => {
      const dimensionEsperada = mapeoAreas[materia];
      if (dimensionEsperada && puntuaciones[dimensionEsperada]) {
        const puntuacionTest = puntuaciones[dimensionEsperada] || 0;

        // Si hay buen rendimiento académico (promedio alto) pero baja puntuación en el test
        if (promedioGeneral > 15 && puntuacionTest < 40) {
          discrepancias.push({
            dimension: dimensionEsperada,
            area_academica: materia,
            rendimiento_academico: promedioGeneral,
            puntuacion_test: puntuacionTest,
            necesita_validacion: true,
            tipo: 'bajo_interes_alto_rendimiento',
          });
        }
        // Si hay baja puntuación académica pero alto interés en el test
        else if (promedioGeneral < 12 && puntuacionTest > 70) {
          discrepancias.push({
            dimension: dimensionEsperada,
            area_academica: materia,
            rendimiento_academico: promedioGeneral,
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
   * Incluye todas las sesiones excepto las abandonadas
   */
  async obtenerHistorial(usuario_id) {
    try {
      console.log('🔍 [obtenerHistorial] Buscando historial para usuario:', usuario_id);
      console.log('🔍 [obtenerHistorial] Tipo de usuario_id:', typeof usuario_id);
      
      // Primero, verificar el nombre real de las columnas en la BD
      const { sequelize } = SesionesTestOrientacion;
      const [columnInfo] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'sesiones_test_orientacion' 
         AND column_name LIKE '%usuario%' 
         ORDER BY column_name`,
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('📋 [obtenerHistorial] Columnas relacionadas con usuario:', columnInfo);
      
      // Intentar consulta SQL directa con diferentes nombres posibles
      const posiblesNombres = ['usuario_id', 'usuario_id', 'usuario_id'];
      let sesionesEncontradas = null;
      
      for (const nombreColumna of posiblesNombres) {
        try {
          const [results] = await sequelize.query(
            `SELECT id, estado, "${nombreColumna}" as usuario_id FROM sesiones_test_orientacion WHERE "${nombreColumna}" = :usuario_id LIMIT 5`,
            {
              replacements: { usuario_id },
              type: sequelize.QueryTypes.SELECT
            }
          );
          if (results && results.length > 0) {
            console.log(`✅ [obtenerHistorial] Encontradas ${results.length} sesiones con columna "${nombreColumna}"`);
            sesionesEncontradas = results;
            break;
          }
        } catch (err) {
          // Continuar con el siguiente nombre
          console.log(`⚠️ [obtenerHistorial] Columna "${nombreColumna}" no existe o error:`, err.message);
        }
      }
      
      // Si encontramos sesiones con SQL directo, usar Sequelize con el nombre correcto
      if (sesionesEncontradas && sesionesEncontradas.length > 0) {
        console.log('📊 [obtenerHistorial] Sesiones encontradas con SQL directo:', sesionesEncontradas.length);
      }

      // Construir condición WHERE: incluir todas excepto abandonadas, y también incluir null
      const whereCondition = {
        usuario_id: usuario_id,
        [Op.or]: [
          { estado: { [Op.not]: 'abandonada' } },
          { estado: null }, // Incluir sesiones sin estado definido
        ],
      };

      // Ahora buscar con el filtro y el include usando Sequelize
      let sesiones = [];
      try {
        sesiones = await SesionesTestOrientacion.findAll({
          where: whereCondition,
          include: [
            {
              model: ResultadosOrientacion,
              as: 'resultado',
              required: false, // LEFT JOIN para incluir sesiones sin resultado
            },
          ],
          order: [['fecha_inicio', 'DESC']],
        });
        console.log('✅ [obtenerHistorial] Sesiones filtradas encontradas con Sequelize:', sesiones.length);
      } catch (sequelizeError) {
        console.error('❌ [obtenerHistorial] Error con Sequelize:', sequelizeError.message);
        // Si falla Sequelize, intentar con SQL directo usando el nombre de columna que encontramos
        if (sesionesEncontradas) {
          console.log('🔄 [obtenerHistorial] Usando resultados de consulta SQL directa');
          // Convertir resultados SQL a formato Sequelize
          const sesionesIds = sesionesEncontradas.map(s => s.id);
          sesiones = await SesionesTestOrientacion.findAll({
            where: { id: { [Op.in]: sesionesIds } },
            include: [
              {
                model: ResultadosOrientacion,
                as: 'resultado',
                required: false,
              },
            ],
            order: [['fecha_inicio', 'DESC']],
          });
        }
      }

      return sesiones || []; // Asegurar que siempre retorne un array
    } catch (error) {
      console.error('❌ [obtenerHistorial] Error:', error);
      this._handleError('obtenerHistorial', error);
    }
  }

  /**
   * Obtiene el historial de tests de los usuarios para el especialista
   */
  async obtenerTodosLosTests() {
    return await SesionesTestOrientacion.findAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email'] // ✅ Esto está bien
        },
        {
          model: ResultadosOrientacion,
          as: 'resultado',
          attributes: ['id', 'perfil_dominante', 'codigo_holland', 'fecha_generacion', 'recomendaciones_carreras'], // ⚠️ Agregar fecha_generacion
          required: false, // ✅ LEFT JOIN para incluir sesiones sin resultado
        }
      ],
      order: [['fecha_inicio', 'DESC']]
    });
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

  calcularNivelConfianzaEstadistico(puntuaciones) {
    const valores = Object.values(puntuaciones);
    const n = valores.length;
    const promedio = valores.reduce((a, b) => a + b) / n;
    
    // Calculamos qué tan lejos está cada punto del promedio
    const varianza = valores.reduce((a, b) => a + Math.pow(b - promedio, 2), 0) / n;
    const desviacionEstandar = Math.sqrt(varianza);
  
    // Multiplicamos por un factor (ej. 2) para llevarlo a escala 0-100
    return Math.min(100, Math.round(desviacionEstandar * 2));
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
