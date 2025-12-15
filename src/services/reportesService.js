const { ReporteActividad, EstudianteBecario, Usuario, Plaza, ConfiguracionPeriodo, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const emailService = require('./emailService');

class ReportesService {
  /**
   * Crear un nuevo reporte semanal de actividades
   */
  async createReporte(estudianteBecarioId, datosReporte, isAdmin = false) {
    const transaction = await sequelize.transaction();

    try {
      // Obtener el estudiante becario
      const becario = await EstudianteBecario.findByPk(estudianteBecarioId, {
        include: [
          { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email'] },
          {
            model: Plaza,
            as: 'plaza',
            include: [
              {
                model: Usuario,
                as: 'supervisor',
                attributes: ['id', 'nombre', 'apellido', 'email'],
                required: false
              }
            ],
            required: false
          }
        ]
      });

      if (!becario) {
        throw ApiError.notFound('Estudiante becario no encontrado');
      }

      // Verificar que la semana esté habilitada (excepto para admins)
      if (!isAdmin) {
        const periodo = await ConfiguracionPeriodo.getPeriodoPorNombre(datosReporte.periodoAcademico);

        if (!periodo) {
          throw ApiError.notFound(
            `No se encontró configuración para el período académico ${datosReporte.periodoAcademico}`
          );
        }

        if (!periodo.estaSemanaHabilitada(datosReporte.semana)) {
          throw ApiError.forbidden(
            `La semana ${datosReporte.semana} no está habilitada para reportes. ` +
            `Contacta al administrador para habilitar esta semana.`
          );
        }
      }

      // Verificar que el estudiante no tenga un reporte ACTIVO (Pendiente o Aprobada) para esta semana
      // Permitir crear nuevo reporte si el anterior fue rechazado o no existe
      const reporteActivo = await ReporteActividad.findOne({
        where: {
          estudianteBecarioId,
          periodoAcademico: datosReporte.periodoAcademico,
          semana: datosReporte.semana,
          estado: {
            [Op.in]: ['Pendiente', 'Aprobada', 'En Revisión']
          }
        }
      });

      if (reporteActivo) {
        throw ApiError.badRequest(
          `Ya existe un reporte ${reporteActivo.estado === 'Aprobada' ? 'aprobado' : 'pendiente'} para la semana ${datosReporte.semana} del período ${datosReporte.periodoAcademico}. ` +
          `Estado actual: ${reporteActivo.estado}. ` +
          `${reporteActivo.estado === 'Pendiente' || reporteActivo.estado === 'En Revisión'
            ? `El reporte (ID: ${reporteActivo.id}) está pendiente de revisión.`
            : `El reporte (ID: ${reporteActivo.id}) ya fue aprobado y no se puede reemplazar.`}`
        );
      }

      // Crear el reporte
      const nuevoReporte = await ReporteActividad.create({
        estudianteId: becario.usuarioId,
        estudianteBecarioId: becario.id,
        supervisorId: becario.plaza?.supervisor?.id || null,
        tipoBeca: becario.tipoBeca,
        ...datosReporte,
        estado: 'Pendiente',
        bloqueado: true // Bloqueado por defecto
      }, { transaction });

      await transaction.commit();

      // Retornar con relaciones
      return this.getReporteById(nuevoReporte.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener TODOS los reportes de un estudiante becario SIN FILTROS
   * Útil para diagnóstico y debugging
   */
  async getAllReportesByBecario(estudianteBecarioId) {
    const reportes = await ReporteActividad.findAll({
      where: { estudianteBecarioId },
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          attributes: ['id', 'tipoBeca', 'horasRequeridas', 'horasCompletadas']
        }
      ],
      order: [['periodoAcademico', 'DESC'], ['semana', 'DESC']]
    });

    return {
      reportes,
      total: reportes.length
    };
  }

  /**
   * Obtener todos los reportes de un estudiante becario
   */
  async getReportesByBecario(estudianteBecarioId, filtros = {}) {
    const { periodoAcademico, estado, limit = 20, offset = 0 } = filtros;

    const whereClause = { estudianteBecarioId };

    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;
    if (estado) whereClause.estado = estado;

    const { count, rows } = await ReporteActividad.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          attributes: ['id', 'tipoBeca', 'horasRequeridas', 'horasCompletadas']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['semana', 'DESC']]
    });

    // Calcular horas totales aprobadas
    const horasTotalesAprobadas = await ReporteActividad.calcularHorasTotales(
      estudianteBecarioId,
      periodoAcademico || null,
      'Aprobada'
    );

    return {
      reportes: rows,
      total: count,
      horasTotalesAprobadas: horasTotalesAprobadas || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtener un reporte por ID
   */
  async getReporteById(reporteId) {
    const reporte = await ReporteActividad.findByPk(reporteId, {
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula']
        },
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          attributes: ['id', 'tipoBeca', 'horasRequeridas', 'horasCompletadas', 'estado']
        }
      ]
    });

    if (!reporte) {
      throw ApiError.notFound('Reporte no encontrado');
    }

    return reporte;
  }

  /**
   * Obtener reporte por semana específica
   */
  async getReporteBySemana(estudianteBecarioId, periodoAcademico, semana) {
    const reporte = await ReporteActividad.findOne({
      where: {
        estudianteBecarioId,
        periodoAcademico,
        semana
      },
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ]
    });

    if (!reporte) {
      throw ApiError.notFound(
        `No se encontró reporte para la semana ${semana} del período ${periodoAcademico}`
      );
    }

    return reporte;
  }

  /**
   * Actualizar un reporte
   */
  async updateReporte(reporteId, datosActualizacion, usuario) {
    const transaction = await sequelize.transaction();

    try {
      const reporte = await ReporteActividad.findByPk(reporteId);

      if (!reporte) {
        throw ApiError.notFound('Reporte no encontrado');
      }

      // Verificar permisos de edición
      const isAdmin = usuario.puedeAdministrar();
      const isOwner = reporte.estudianteId === usuario.id;

      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('No tienes permisos para editar este reporte');
      }

      // Verificar si puede ser editado
      if (!reporte.puedeSerEditado(isAdmin)) {
        if (reporte.bloqueado && !isAdmin) {
          throw ApiError.forbidden(
            'Este reporte está bloqueado. Solo los administradores pueden editarlo'
          );
        }
        throw ApiError.badRequest('Este reporte no puede ser editado en su estado actual');
      }

      // Verificar que la semana esté habilitada (excepto para admins)
      // Solo si se está intentando cambiar la semana
      if (datosActualizacion.semana && datosActualizacion.semana !== reporte.semana && !isAdmin) {
        const periodo = await ConfiguracionPeriodo.getPeriodoPorNombre(reporte.periodoAcademico);

        if (!periodo) {
          throw ApiError.notFound(
            `No se encontró configuración para el período académico ${reporte.periodoAcademico}`
          );
        }

        if (!periodo.estaSemanaHabilitada(datosActualizacion.semana)) {
          throw ApiError.forbidden(
            `La semana ${datosActualizacion.semana} no está habilitada para reportes. ` +
            `Contacta al administrador para habilitar esta semana.`
          );
        }
      }

      // Actualizar el reporte
      await reporte.update(datosActualizacion, { transaction });

      await transaction.commit();

      // Retornar con relaciones
      return this.getReporteById(reporte.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Aprobar un reporte
   */
  async aprobarReporte(reporteId, supervisorId, observaciones = null) {
    const transaction = await sequelize.transaction();

    try {
      const reporte = await ReporteActividad.findByPk(reporteId);

      if (!reporte) {
        throw ApiError.notFound('Reporte no encontrado');
      }

      // Aprobar usando el método del modelo
      await reporte.aprobar(supervisorId, observaciones);

      // Actualizar horas completadas del estudiante becario DENTRO de la transacción
      await this._actualizarHorasBecario(reporte.estudianteBecarioId, transaction);

      await transaction.commit();

      return this.getReporteById(reporte.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rechazar un reporte
   */
  async rechazarReporte(reporteId, supervisorId, motivo) {
    const transaction = await sequelize.transaction();

    try {
      // Obtener reporte con datos del estudiante para el email
      const reporte = await ReporteActividad.findByPk(reporteId, {
        include: [
          {
            model: Usuario,
            as: 'estudiante',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }
        ],
        transaction
      });

      if (!reporte) {
        throw ApiError.notFound('Reporte no encontrado');
      }

      if (!motivo || motivo.trim() === '') {
        throw ApiError.badRequest('El motivo de rechazo es requerido');
      }

      // Rechazar usando el método del modelo (actualiza el estado en DB)
      await reporte.rechazar(supervisorId, motivo);

      // Commit PRIMERO - asegurar que la operación se guarde en DB
      await transaction.commit();

      // DESPUÉS enviar email - si falla, DB ya está actualizada (estado consistente)
      try {
        const reporteData = {
          numeroSemana: reporte.semana,
          periodoAcademico: reporte.periodoAcademico
        };

        await emailService.sendReporteRechazadoEmail(
          reporte.estudiante.email,
          `${reporte.estudiante.nombre} ${reporte.estudiante.apellido}`,
          reporteData,
          motivo
        );
      } catch (emailError) {
        // Log del error pero no bloquear la operación (DB ya actualizada)
        console.error('Error al enviar email de reporte rechazado:', emailError.message);
        // La operación de rechazo fue exitosa aunque el email falle
      }

      return this.getReporteById(reporte.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener reportes pendientes de un supervisor
   */
  async getReportesPendientesSupervisor(supervisorId, filtros = {}) {
    const { periodoAcademico, limit = 20, offset = 0 } = filtros;

    const whereClause = {
      supervisorId,
      estado: {
        [Op.in]: ['Pendiente', 'En Revisión']
      }
    };

    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    const { count, rows } = await ReporteActividad.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email', 'carrera']
        },
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          attributes: ['id', 'tipoBeca', 'horasRequeridas', 'horasCompletadas']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['semana', 'ASC'], ['createdAt', 'ASC']]
    });

    return {
      reportes: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtener TODOS los reportes de TODOS los estudiantes becarios (endpoint global)
   * Solo accesible para administradores, supervisores y capital humano
   */
  async getAllReportesGlobal(filtros = {}) {
    const {
      periodoAcademico,
      estado,
      tipoBeca,
      supervisorId,
      estudianteId,
      limit = 20,
      offset = 0
    } = filtros;

    const whereClause = {};

    // Aplicar filtros opcionales
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;
    if (estado) whereClause.estado = estado;
    if (tipoBeca) whereClause.tipoBeca = tipoBeca;
    if (supervisorId) whereClause.supervisorId = supervisorId;
    if (estudianteId) whereClause.estudianteId = estudianteId;

    const { count, rows } = await ReporteActividad.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'carrera']
        },
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          attributes: ['id', 'tipoBeca', 'horasRequeridas', 'horasCompletadas', 'estado']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['periodoAcademico', 'DESC'], ['semana', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calcular estadísticas globales basadas en los filtros aplicados
    const estadisticas = await this._calcularEstadisticasGlobales(whereClause);

    return {
      reportes: rows,
      total: count,
      estadisticas,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Calcular estadísticas globales de reportes
   * @private
   */
  async _calcularEstadisticasGlobales(whereClause) {
    // Contar reportes por estado
    const porEstado = await ReporteActividad.findAll({
      where: whereClause,
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['estado'],
      raw: true
    });

    // Calcular horas totales aprobadas
    const horasTotalesAprobadas = await ReporteActividad.sum('horasTrabajadas', {
      where: {
        ...whereClause,
        estado: 'Aprobada'
      }
    });

    // Contar estudiantes únicos
    const estudiantesUnicos = await ReporteActividad.count({
      where: whereClause,
      distinct: true,
      col: 'estudianteId'
    });

    return {
      porEstado: this._formatearGrupos(porEstado),
      horasTotalesAprobadas: horasTotalesAprobadas || 0,
      estudiantesUnicos
    };
  }

  /**
   * Bloquear un reporte (solo admin)
   */
  async bloquearReporte(reporteId) {
    const reporte = await ReporteActividad.findByPk(reporteId);

    if (!reporte) {
      throw ApiError.notFound('Reporte no encontrado');
    }

    await reporte.bloquear();
    return reporte;
  }

  /**
   * Desbloquear un reporte (solo admin)
   */
  async desbloquearReporte(reporteId) {
    const reporte = await ReporteActividad.findByPk(reporteId);

    if (!reporte) {
      throw ApiError.notFound('Reporte no encontrado');
    }

    await reporte.desbloquear();
    return reporte;
  }

  /**
   * Obtener estadísticas de reportes por período
   */
  async getEstadisticasReportes(periodoAcademico) {
    // Total de reportes
    const totalReportes = await ReporteActividad.count({
      where: { periodoAcademico }
    });

    // Reportes por estado
    const porEstado = await ReporteActividad.findAll({
      where: { periodoAcademico },
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['estado'],
      raw: true
    });

    // Estadísticas por semana
    const porSemana = await ReporteActividad.estadisticasPorSemana(periodoAcademico);

    // Horas totales aprobadas
    const horasTotalesAprobadas = await ReporteActividad.sum('horasTrabajadas', {
      where: {
        periodoAcademico,
        estado: 'Aprobada'
      }
    });

    return {
      totalReportes,
      porEstado: this._formatearGrupos(porEstado),
      porSemana,
      horasTotalesAprobadas: horasTotalesAprobadas || 0
    };
  }

  /**
   * Actualizar horas completadas del estudiante becario
   * @private
   * @param {string} estudianteBecarioId - ID del estudiante becario
   * @param {Transaction} transaction - Transacción de Sequelize (opcional)
   */
  async _actualizarHorasBecario(estudianteBecarioId, transaction = null) {
    const becario = await EstudianteBecario.findByPk(estudianteBecarioId, {
      transaction
    });

    if (!becario) return;

    // Calcular horas totales aprobadas (sin filtrar por período específico)
    // Un becario acumula horas de TODOS sus reportes aprobados, no solo de un período
    const horasTotales = await ReporteActividad.calcularHorasTotales(
      estudianteBecarioId,
      null, // null = calcular de TODOS los períodos
      'Aprobada'
    );

    // Actualizar horas completadas
    await becario.update({ horasCompletadas: horasTotales || 0 }, {
      transaction
    });
  }

  /**
   * Formatear resultados de agrupación
   * @private
   */
  _formatearGrupos(grupos) {
    return grupos.reduce((acc, item) => {
      const key = item.estado;
      acc[key] = parseInt(item.cantidad);
      return acc;
    }, {});
  }
}

module.exports = new ReportesService();
