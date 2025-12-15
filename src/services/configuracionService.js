const { ConfiguracionPeriodo, ReporteActividad } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class ConfiguracionService {
  /**
   * Obtener el período académico activo
   */
  async getPeriodoActivo() {
    const periodo = await ConfiguracionPeriodo.getPeriodoActivo();

    if (!periodo) {
      throw ApiError.notFound('No hay un período académico activo configurado');
    }

    return periodo;
  }

  /**
   * Obtener todos los períodos académicos
   */
  async getTodosPeriodos() {
    const periodos = await ConfiguracionPeriodo.obtenerTodos();

    return {
      total: periodos.length,
      periodos
    };
  }

  /**
   * Obtener un período específico por ID
   */
  async getPeriodoById(periodoId) {
    const periodo = await ConfiguracionPeriodo.findByPk(periodoId);

    if (!periodo) {
      throw ApiError.notFound('Período académico no encontrado');
    }

    return periodo;
  }

  /**
   * Obtener un período específico por nombre
   */
  async getPeriodoPorNombre(periodoAcademico) {
    const periodo = await ConfiguracionPeriodo.getPeriodoPorNombre(periodoAcademico);

    if (!periodo) {
      throw ApiError.notFound(`Período académico ${periodoAcademico} no encontrado`);
    }

    return periodo;
  }

  /**
   * Crear un nuevo período académico
   */
  async crearPeriodo(datos) {
    try {
      const periodo = await ConfiguracionPeriodo.crearPeriodo(datos);

      logger.info(`Período académico ${periodo.periodoAcademico} creado`);

      return periodo;
    } catch (error) {
      if (error.message.includes('Ya existe')) {
        throw ApiError.conflict(error.message);
      }
      throw error;
    }
  }

  /**
   * Activar un período académico
   * Desactiva automáticamente todos los demás períodos
   */
  async activarPeriodo(periodoId) {
    const periodo = await this.getPeriodoById(periodoId);

    await periodo.activar();

    logger.info(`Período académico ${periodo.periodoAcademico} activado`);

    return periodo;
  }

  /**
   * Cambiar la semana actual del período activo
   */
  async cambiarSemanaActual(nuevaSemana) {
    if (typeof nuevaSemana !== 'number' || nuevaSemana < 1 || nuevaSemana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    const periodoActivo = await this.getPeriodoActivo();

    await periodoActivo.cambiarSemanaActual(nuevaSemana);

    logger.info(`Semana actual del período ${periodoActivo.periodoAcademico} cambiada a ${nuevaSemana}`);

    return periodoActivo;
  }

  /**
   * Habilitar una semana para reportes
   */
  async habilitarSemana(semana, periodoId = null) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    let periodo;

    if (periodoId) {
      periodo = await this.getPeriodoById(periodoId);
    } else {
      periodo = await this.getPeriodoActivo();
    }

    // Verificar si ya está habilitada
    if (periodo.estaSemanaHabilitada(semana)) {
      throw ApiError.conflict(`La semana ${semana} ya está habilitada para reportes`);
    }

    await periodo.habilitarSemana(semana);

    // Desbloquear todos los reportes de esa semana para ese período
    await this.desbloquearReportesPorSemana(periodo.periodoAcademico, semana);

    logger.info(`Semana ${semana} habilitada para reportes en período ${periodo.periodoAcademico}`);

    return periodo;
  }

  /**
   * Deshabilitar una semana para reportes
   */
  async deshabilitarSemana(semana, periodoId = null) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    let periodo;

    if (periodoId) {
      periodo = await this.getPeriodoById(periodoId);
    } else {
      periodo = await this.getPeriodoActivo();
    }

    // Verificar si está habilitada
    if (!periodo.estaSemanaHabilitada(semana)) {
      throw ApiError.conflict(`La semana ${semana} ya está deshabilitada`);
    }

    await periodo.deshabilitarSemana(semana);

    // Bloquear todos los reportes de esa semana para ese período
    await this.bloquearReportesPorSemana(periodo.periodoAcademico, semana);

    logger.info(`Semana ${semana} deshabilitada para reportes en período ${periodo.periodoAcademico}`);

    return periodo;
  }

  /**
   * Bloquear todos los reportes de una semana específica
   */
  async bloquearReportesPorSemana(periodoAcademico, semana) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    const [cantidadActualizada] = await ReporteActividad.update(
      { bloqueado: true },
      {
        where: {
          periodoAcademico,
          semana
        }
      }
    );

    logger.info(`${cantidadActualizada} reportes bloqueados para semana ${semana}, período ${periodoAcademico}`);

    return {
      reportesBloqueados: cantidadActualizada,
      semana,
      periodoAcademico
    };
  }

  /**
   * Desbloquear todos los reportes de una semana específica
   */
  async desbloquearReportesPorSemana(periodoAcademico, semana) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    const [cantidadActualizada] = await ReporteActividad.update(
      { bloqueado: false },
      {
        where: {
          periodoAcademico,
          semana
        }
      }
    );

    logger.info(`${cantidadActualizada} reportes desbloqueados para semana ${semana}, período ${periodoAcademico}`);

    return {
      reportesDesbloqueados: cantidadActualizada,
      semana,
      periodoAcademico
    };
  }

  /**
   * Verificar si una semana está habilitada para reportes
   */
  async estaSemanaHabilitada(semana, periodoAcademico = null) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
    }

    let periodo;

    if (periodoAcademico) {
      periodo = await this.getPeriodoPorNombre(periodoAcademico);
    } else {
      periodo = await this.getPeriodoActivo();
    }

    const habilitada = periodo.estaSemanaHabilitada(semana);

    return {
      semana,
      periodoAcademico: periodo.periodoAcademico,
      habilitada
    };
  }

  /**
   * Obtener configuración completa del período activo
   */
  async getConfiguracionActual() {
    const periodo = await this.getPeriodoActivo();

    return {
      periodoAcademico: periodo.periodoAcademico,
      semanaActual: periodo.semanaActual,
      semanasHabilitadas: periodo.semanasHabilitadas,
      fechaInicio: periodo.fechaInicio,
      fechaFin: periodo.fechaFin,
      descripcion: periodo.descripcion,
      activo: periodo.activo,
      totalSemanasHabilitadas: periodo.semanasHabilitadas.length
    };
  }

  /**
   * Actualizar configuración del período
   */
  async actualizarPeriodo(periodoId, datos) {
    const periodo = await this.getPeriodoById(periodoId);

    const { semanaActual, fechaInicio, fechaFin, descripcion } = datos;

    if (semanaActual !== undefined) {
      if (typeof semanaActual !== 'number' || semanaActual < 1 || semanaActual > 12) {
        throw ApiError.badRequest('La semana debe ser un número entre 1 y 12');
      }
      periodo.semanaActual = semanaActual;
    }

    if (fechaInicio !== undefined) {
      periodo.fechaInicio = fechaInicio;
    }

    if (fechaFin !== undefined) {
      periodo.fechaFin = fechaFin;
    }

    if (descripcion !== undefined) {
      periodo.descripcion = descripcion;
    }

    await periodo.save();

    logger.info(`Período ${periodo.periodoAcademico} actualizado`);

    return periodo;
  }

  /**
   * Eliminar un período académico
   */
  async eliminarPeriodo(periodoId) {
    const periodo = await this.getPeriodoById(periodoId);

    if (periodo.activo) {
      throw ApiError.badRequest('No se puede eliminar el período académico activo');
    }

    const periodoAcademico = periodo.periodoAcademico;

    await periodo.destroy();

    logger.info(`Período académico ${periodoAcademico} eliminado`);

    return {
      mensaje: `Período académico ${periodoAcademico} eliminado exitosamente`
    };
  }

  /**
   * Validar que el período académico existe y está activo
   * Útil para validar antes de crear reportes o asignar plazas
   * @param {string} periodoAcademico - Nombre del período (ej: "2025-1")
   * @returns {Object} - Periodo si está activo y existe
   * @throws {ApiError} - Si no existe o no está activo
   */
  async validarPeriodoActivo(periodoAcademico) {
    const periodo = await ConfiguracionPeriodo.findOne({
      where: { periodoAcademico }
    });

    if (!periodo) {
      throw ApiError.notFound(`El período académico ${periodoAcademico} no existe`);
    }

    if (!periodo.activo) {
      throw ApiError.badRequest(
        `El período académico ${periodoAcademico} no está activo. ` +
        `El período activo actual es: ${(await this.getPeriodoActivo()).periodoAcademico}`
      );
    }

    return periodo;
  }

  /**
   * Validar que una semana está habilitada en el período actual
   * @param {number} semana - Número de semana (1-12)
   * @param {string} periodoAcademico - Nombre del período (opcional, usa el activo si no se especifica)
   * @throws {ApiError} - Si la semana no está habilitada
   */
  async validarSemanaHabilitada(semana, periodoAcademico = null) {
    const resultado = await this.estaSemanaHabilitada(semana, periodoAcademico);

    if (!resultado.habilitada) {
      throw ApiError.forbidden(
        `La semana ${semana} no está habilitada para reportes en el período ${resultado.periodoAcademico}. ` +
        `Contacta al administrador para habilitar esta semana.`
      );
    }

    return resultado;
  }

  /**
   * Cerrar el período académico activo
   * Actualiza estados de becarios según horas completadas y auto-aprueba reportes pendientes
   * @returns {Promise<Object>} - Resumen del cierre
   */
  async cerrarPeriodo() {
    const { sequelize } = require('../models');
    const { EstudianteBecario, ReporteActividad } = require('../models');

    const transaction = await sequelize.transaction();

    try {
      // 1. Obtener período activo
      const periodoActivo = await this.getPeriodoActivo();

      // 2. UPDATE masivo de becarios con CASE WHEN
      // Incrementa trimestresCursados para todos los becarios activos
      // Si horasCompletadas >= horasRequeridas → Culminada
      // Si horasCompletadas < horasRequeridas → Incompleta
      const [becariosActualizados] = await sequelize.query(`
        UPDATE estudiantes_becarios
        SET "trimestresCursados" = "trimestresCursados" + 1,
        estado = CASE
          WHEN "horasCompletadas" >= "horasRequeridas" THEN 'Culminada'::enum_estudiantes_becarios_estado
          WHEN "horasCompletadas" < "horasRequeridas" THEN 'Incompleta'::enum_estudiantes_becarios_estado
          ELSE estado
        END,
        "fechaCulminacion" = CASE
          WHEN estado = 'Activa' THEN CURRENT_TIMESTAMP
          ELSE "fechaCulminacion"
        END,
        "periodoFin" = :periodoActivo,
        "updatedAt" = CURRENT_TIMESTAMP
        WHERE estado = 'Activa';
      `, {
        replacements: { periodoActivo: periodoActivo.periodoAcademico },
        transaction
      });

      // 3. Auto-aprobar reportes pendientes
      const [reportesAprobados] = await ReporteActividad.update(
        {
          estado: 'Aprobada',
          fechaAprobacion: new Date(),
          observacionesSupervisor: 'Auto-aprobado al cerrar período'
        },
        {
          where: {
            periodoAcademico: periodoActivo.periodoAcademico,
            estado: 'Pendiente'
          },
          transaction
        }
      );

      // 4. Deshabilitar todas las semanas (1-12)
      periodoActivo.semanasHabilitadas = [];
      await periodoActivo.save({ transaction });

      await transaction.commit();

      logger.info(`Período ${periodoActivo.periodoAcademico} cerrado. Becarios: ${becariosActualizados}, Reportes: ${reportesAprobados}`);

      return {
        periodoAcademico: periodoActivo.periodoAcademico,
        fechaCierre: new Date(),
        becariosActualizados,
        reportesAprobados
      };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * Renovar un becario para el siguiente trimestre
   * Reset horas + incrementar trimestres + validar límite
   * @param {string} becarioId - UUID del becario
   * @returns {Promise<EstudianteBecario>} - Becario renovado
   */
  async renovarBecario(becarioId) {
    const { EstudianteBecario, Usuario, Plaza } = require('../models');
    const { sequelize } = require('../models');

    const transaction = await sequelize.transaction();

    try {
      const becario = await EstudianteBecario.findByPk(becarioId, {
        include: [
          {
            model: Usuario,
            as: 'usuario'
          }
        ],
        transaction
      });

      if (!becario) {
        throw ApiError.notFound('Becario no encontrado');
      }

      // Validación 1: Estado debe ser Culminada o Incompleta
      if (!['Culminada', 'Incompleta'].includes(becario.estado)) {
        throw ApiError.badRequest(
          `No se puede renovar un becario con estado ${becario.estado}. ` +
          `Solo se pueden renovar becarios Culminados o Incompletos.`
        );
      }

      // Validación 2: Usuario debe estar activo
      if (!becario.usuario.activo) {
        throw ApiError.forbidden(
          'El usuario está desactivado. No se puede renovar el becario.'
        );
      }

      // Validación 3: Verificar límite de trimestres
      if (!becario.puedeRenovar()) {
        const limite = becario.getLimiteTrimestres();
        throw ApiError.forbidden(
          `El becario ha alcanzado el límite de ${limite} trimestres para ${becario.tipoBeca}. ` +
          `No puede renovarse automáticamente. Debe crear una nueva postulación.`
        );
      }

      // Validación 4: Debe existir período activo
      const periodoActivo = await this.getPeriodoActivo();

      // Validación 5: Verificar que plaza existe en nuevo período (si tiene plaza)
      if (becario.plazaAsignada) {
        const plaza = await Plaza.findOne({
          where: {
            id: becario.plazaAsignada,
            periodoAcademico: periodoActivo.periodoAcademico
          },
          transaction
        });

        if (!plaza) {
          becario.plazaAsignada = null;
          logger.warn(`Plaza removida de becario ${becarioId}: no existe en período ${periodoActivo.periodoAcademico}`);
        }
      }

      // Renovación
      // NOTA: trimestresCursados ya se incrementó en cerrarPeriodo()
      becario.horasCompletadas = 0;
      becario.estado = 'Activa';
      becario.periodoInicio = periodoActivo.periodoAcademico;
      becario.periodoFin = null;
      becario.fechaCulminacion = null;

      await becario.save({ transaction });

      await transaction.commit();

      logger.info(`Becario ${becario.usuario.nombre} ${becario.usuario.apellido} renovado para trimestre ${becario.trimestresCursados}`);

      return becario;
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

module.exports = new ConfiguracionService();
