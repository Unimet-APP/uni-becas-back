const {
  TrayectoriasEscolares,
  Usuario,
  Career
} = require('../models');

const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

class TrayectoriaAcademicaService {
  
  /**
   * Obtiene o crea la trayectoria académica actual del usuario
   */
  async obtenerTrayectoriaActual(usuarioId) {
    try {
      // Buscar trayectoria actual
      let trayectoria = await TrayectoriasEscolares.findOne({
        where: {
          usuario_id: usuarioId,
          es_actual: true,
        },
      });

      // Si no existe, crear una desde los datos del usuario
      if (!trayectoria) {
        trayectoria = await this.crearDesdeUsuario(usuarioId);
      }

      return trayectoria;
    } catch (error) {
      this._handleError('obtenerTrayectoriaActual', error);
    }
  }

  /**
   * Crea una trayectoria académica desde los datos del usuario
   */
  async crearDesdeUsuario(usuarioId) {
    try {
      const usuario = await Usuario.findByPk(usuarioId, {
        include: [{ model: Career, as: 'carrera' }],
      });

      if (!usuario) {
        throw new ApiError(404, 'Usuario no encontrado');
      }

      // Extraer información académica del usuario
      const asignaturasPorArea = this._extraerAsignaturasPorArea(usuario);
      const promedioGeneral = this._calcularPromedioGeneral(usuario);

      const trayectoria = await TrayectoriasEscolares.create({
        usuario_id: usuarioId,
        promedios_por_ano: this._formatearPromediosPorAno(usuario),
        promedio_general_acumulado: promedioGeneral,
        grado_actual: usuario.trimestre ? `Trimestre ${usuario.trimestre}` : null,
        materias_destacadas: this._extraerMateriasDestacadas(usuario),
        actividades_extracurriculares: usuario.actividades_extracurriculares || [],
        proyectos_realizados: usuario.proyectos_realizados || [],
        es_actual: true,
        fecha_registro: new Date(),
      });

      return trayectoria;
    } catch (error) {
      this._handleError('crearDesdeUsuario', error);
    }
  }

  /**
   * Analiza el rendimiento por área académica
   */
  analizarRendimientoPorArea(trayectoria) {
    const analisis = {
      areas_fuertes: [],
      areas_debilidades: [],
      promedio_general: trayectoria.promedio_general_acumulado || 0,
    };

    const promediosPorAno = trayectoria.promedios_por_ano || {};
    const materiasDestacadas = trayectoria.materias_destacadas || [];

    // Identificar áreas fuertes
    materiasDestacadas.forEach(materia => {
      analisis.areas_fuertes.push({
        materia,
        razon: 'Materia destacada por el estudiante',
      });
    });

    // Analizar promedios por año
    Object.keys(promediosPorAno).forEach(ano => {
      const promedio = promediosPorAno[ano];
      if (promedio >= 16) {
        analisis.areas_fuertes.push({
          periodo: ano,
          promedio,
          razon: 'Alto rendimiento académico',
        });
      } else if (promedio < 12) {
        analisis.areas_debilidades.push({
          periodo: ano,
          promedio,
          razon: 'Bajo rendimiento académico',
        });
      }
    });

    return analisis;
  }

  /**
   * Detecta correlaciones entre la trayectoria académica y las puntuaciones del test
   */
  detectarCorrelacionesConIntereses(trayectoria, puntuacionesTest) {
    const correlaciones = [];
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

    const materiasDestacadas = trayectoria.materias_destacadas || [];
    
    materiasDestacadas.forEach(materia => {
      const dimension = mapeoAreas[materia];
      if (dimension && puntuacionesTest[dimension]) {
        const puntuacion = puntuacionesTest[dimension];
        if (puntuacion > 60) {
          correlaciones.push({
            materia,
            dimension,
            puntuacion,
            tipo: 'correlacion_positiva',
            descripcion: 'Alto rendimiento académico coincide con alto interés en el test',
          });
        }
      }
    });

    return correlaciones;
  }

  /**
   * Actualiza la trayectoria académica del usuario
   */
  async actualizarTrayectoria(usuarioId, datos) {
    try {
      let trayectoria = await TrayectoriasEscolares.findOne({
        where: {
          usuario_id: usuarioId,
          es_actual: true,
        },
      });

      if (!trayectoria) {
        trayectoria = await this.crearDesdeUsuario(usuarioId);
      }

      // Actualizar campos
      await trayectoria.update({
        promedios_por_ano: datos.promediosPorAno || trayectoria.promedios_por_ano,
        promedio_general_acumulado: datos.promedioGeneral || trayectoria.promedio_general_acumulado,
        grado_actual: datos.gradoActual || trayectoria.grado_actual,
        materias_destacadas: datos.materiasDestacadas || trayectoria.materias_destacadas,
        actividades_extracurriculares: datos.actividadesExtracurriculares || trayectoria.actividades_extracurriculares,
        proyectos_realizados: datos.proyectosRealizados || trayectoria.proyectos_realizados,
      });

      return trayectoria;
    } catch (error) {
      this._handleError('actualizarTrayectoria', error);
    }
  }

  /**
   * Métodos privados de ayuda
   */

  _extraerAsignaturasPorArea(usuario) {
    // Si el usuario tiene asignaturas_por_area, usarlas
    if (usuario.asignaturas_por_area) {
      return usuario.asignaturas_por_area;
    }

    // Si no, crear estructura básica desde la carrera
    const carrera = usuario.carrera || {};
    return {
      'General': {
        promedio: usuario.iaa || 0,
        asignaturas: [],
      },
    };
  }

  _calcularPromedioGeneral(usuario) {
    if (usuario.iaa) {
      return parseFloat(usuario.iaa);
    }

    // Si no hay IAA, calcular desde promedios por año
    const promediosPorAno = this._formatearPromediosPorAno(usuario);
    const valores = Object.values(promediosPorAno);
    if (valores.length > 0) {
      return valores.reduce((a, b) => a + b, 0) / valores.length;
    }

    return 0;
  }

  _formatearPromediosPorAno(usuario) {
    // Si el usuario tiene trimestres, formatear como trimestres
    if (usuario.trimestre) {
      const promedios = {};
      for (let i = 1; i <= usuario.trimestre; i++) {
        promedios[`Trimestre ${i}`] = usuario.iaa || 0;
      }
      return promedios;
    }

    return {};
  }

  _extraerMateriasDestacadas(usuario) {
    // Si el usuario tiene materias destacadas, usarlas
    if (usuario.materias_destacadas && Array.isArray(usuario.materias_destacadas)) {
      return usuario.materias_destacadas;
    }

    // Si no, extraer desde asignaturas aprobadas
    if (usuario.asignaturas_aprobadas && Array.isArray(usuario.asignaturas_aprobadas)) {
      return usuario.asignaturas_aprobadas.slice(0, 5); // Top 5
    }

    return [];
  }

  _handleError(metodo, error) {
    console.error(`Error en TrayectoriaAcademicaService.${metodo}:`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error en TrayectoriaAcademicaService > ${metodo}: ${error.message}`);
  }
}

module.exports = new TrayectoriaAcademicaService();
