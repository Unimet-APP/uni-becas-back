const { TrayectoriaAcademica, Usuario, Career } = require('../models');
const ApiError = require('../utils/ApiError');

class TrayectoriaAcademicaService {
  /**
   * Obtiene la trayectoria académica actual del usuario
   * Si no existe, la crea desde datos de Usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Trayectoria académica actual
   */
  async obtenerTrayectoriaActual(usuarioId) {
    try {
      let trayectoria = await TrayectoriaAcademica.obtenerActualPorUsuario(usuarioId);

      if (!trayectoria) {
        // Crear desde datos de Usuario
        trayectoria = await TrayectoriaAcademica.crearDesdeUsuario(usuarioId);
      }

      return trayectoria;
    } catch (error) {
      console.error('Error en obtenerTrayectoriaActual:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al obtener trayectoria: ${error.message}`);
    }
  }

  /**
   * Crea una nueva trayectoria académica desde datos de Usuario
   * @param {string} usuarioId - ID del usuario
   * @param {Object} datosAdicionales - Datos adicionales para la trayectoria
   * @returns {Promise<Object>} - Trayectoria creada
   */
  async crearDesdeUsuario(usuarioId, datosAdicionales = {}) {
    try {
      const usuario = await Usuario.findByPk(usuarioId);

      if (!usuario) {
        throw new ApiError(404, 'Usuario no encontrado');
      }

      // Desmarcar trayectoria actual anterior
      await TrayectoriaAcademica.update(
        { es_actual: false },
        {
          where: {
            usuario_id: usuarioId,
            es_actual: true,
          },
        }
      );

      // Buscar carrera por nombre si existe
      let carreraId = null;
      if (usuario.carrera) {
        const carrera = await Career.findOne({
          where: {
            name: { [require('sequelize').Op.iLike]: `%${usuario.carrera}%` },
            is_active: true,
          },
        });
        if (carrera) {
          carreraId = carrera.id;
        }
      }

      // Crear nueva trayectoria
      const trayectoria = await TrayectoriaAcademica.create({
        usuario_id: usuarioId,
        carrera_id: carreraId,
        trimestre: usuario.trimestre,
        iaa: usuario.iaa,
        asignaturas_aprobadas: usuario.asignaturasAprobadas || 0,
        asignaturas_reprobadas: 0, // Por defecto, se puede actualizar después
        asignaturas_por_area: datosAdicionales.asignaturas_por_area || {},
        rendimiento_por_trimestre: datosAdicionales.rendimiento_por_trimestre || {},
        actividades_extracurriculares: datosAdicionales.actividades_extracurriculares || [],
        proyectos_realizados: datosAdicionales.proyectos_realizados || [],
        es_actual: true,
      });

      return trayectoria;
    } catch (error) {
      console.error('Error en crearDesdeUsuario:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al crear trayectoria: ${error.message}`);
    }
  }

  /**
   * Analiza el rendimiento por área académica
   * @param {Object} trayectoria - Trayectoria académica
   * @returns {Object} - Análisis de rendimiento
   */
  analizarRendimientoPorArea(trayectoria) {
    try {
      const asignaturasPorArea = trayectoria.obtenerRendimientoPorArea();

      // Encontrar área con más asignaturas
      let areaMaxima = null;
      let cantidadMaxima = 0;
      const areas = [];

      for (const area in asignaturasPorArea) {
        const cantidad = asignaturasPorArea[area];
        areas.push({ area, cantidad });
        if (cantidad > cantidadMaxima) {
          cantidadMaxima = cantidad;
          areaMaxima = area;
        }
      }

      // Ordenar áreas por cantidad
      areas.sort((a, b) => b.cantidad - a.cantidad);

      return {
        areas: asignaturasPorArea,
        areaFuerte: areaMaxima,
        cantidadMaxima: cantidadMaxima,
        areasOrdenadas: areas,
      };
    } catch (error) {
      console.error('Error en analizarRendimientoPorArea:', error);
      return {
        areas: {},
        areaFuerte: null,
        cantidadMaxima: 0,
        areasOrdenadas: [],
      };
    }
  }

  /**
   * Detecta correlaciones entre trayectoria académica e intereses del test
   * @param {Object} trayectoria - Trayectoria académica
   * @param {Object} puntuacionesTest - Puntuaciones del test de orientación
   * @returns {Array} - Array de correlaciones/discordancias
   */
  detectarCorrelacionesConIntereses(trayectoria, puntuacionesTest) {
    const correlaciones = [];

    if (!trayectoria || !puntuacionesTest) {
      return correlaciones;
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
      const puntuacionTest = puntuacionesTest[dimensionEsperada] || 0;

      // Determinar tipo de correlación
      let tipo = 'neutra';
      if (cantidadAsignaturas >= 3 && puntuacionTest >= 60) {
        tipo = 'positiva'; // Alto rendimiento + alto interés
      } else if (cantidadAsignaturas >= 3 && puntuacionTest < 40) {
        tipo = 'discordante'; // Alto rendimiento pero bajo interés
      } else if (cantidadAsignaturas < 2 && puntuacionTest >= 60) {
        tipo = 'potencial'; // Bajo rendimiento pero alto interés
      }

      correlaciones.push({
        area: area,
        dimension: dimensionEsperada,
        cantidadAsignaturas: cantidadAsignaturas,
        puntuacionTest: puntuacionTest,
        tipo: tipo,
      });
    }

    return correlaciones;
  }

  /**
   * Actualiza la trayectoria académica actual
   * @param {string} usuarioId - ID del usuario
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<Object>} - Trayectoria actualizada
   */
  async actualizarTrayectoria(usuarioId, datos) {
    try {
      // Desmarcar trayectoria actual anterior
      await TrayectoriaAcademica.update(
        { es_actual: false },
        {
          where: {
            usuario_id: usuarioId,
            es_actual: true,
          },
        }
      );

      // Crear nueva trayectoria con datos actualizados
      const trayectoria = await TrayectoriaAcademica.create({
        usuario_id: usuarioId,
        carrera_id: datos.carrera_id || null,
        trimestre: datos.trimestre || null,
        iaa: datos.iaa || null,
        asignaturas_aprobadas: datos.asignaturas_aprobadas || 0,
        asignaturas_reprobadas: datos.asignaturas_reprobadas || 0,
        asignaturas_por_area: datos.asignaturas_por_area || {},
        rendimiento_por_trimestre: datos.rendimiento_por_trimestre || {},
        actividades_extracurriculares: datos.actividades_extracurriculares || [],
        proyectos_realizados: datos.proyectos_realizados || [],
        becas_activas: datos.becas_activas || [],
        es_actual: true,
      });

      return trayectoria;
    } catch (error) {
      console.error('Error en actualizarTrayectoria:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al actualizar trayectoria: ${error.message}`);
    }
  }
}

module.exports = new TrayectoriaAcademicaService();

