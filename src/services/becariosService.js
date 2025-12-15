const { EstudianteBecario, Usuario, Plaza, Postulacion, Auditoria, ProgramaBeca, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

/**
 * Service para gestión de estudiantes becarios
 * Centraliza la lógica de negocio y validaciones
 */
class BecariosService {
  /**
   * Estados válidos para estudiantes becarios
   */
  static ESTADOS_VALIDOS = ['Activa', 'Suspendida', 'Culminada', 'Cancelada'];

  /**
   * Transiciones de estado permitidas
   */
  static TRANSICIONES_ESTADO = {
    'Activa': ['Suspendida', 'Culminada', 'Cancelada'],
    'Suspendida': ['Activa', 'Cancelada'],
    'Culminada': [], // No se puede cambiar desde Culminada
    'Cancelada': [] // No se puede cambiar desde Cancelada
  };

  /**
   * Validar que una transición de estado es permitida
   * @param {String} estadoActual - Estado actual del becario
   * @param {String} nuevoEstado - Nuevo estado deseado
   * @returns {Boolean} - True si la transición es válida
   */
  validarTransicionEstado(estadoActual, nuevoEstado) {
    if (estadoActual === nuevoEstado) {
      return false; // No se puede cambiar al mismo estado
    }

    const transicionesPermitidas = BecariosService.TRANSICIONES_ESTADO[estadoActual] || [];
    return transicionesPermitidas.includes(nuevoEstado);
  }

  /**
   * Actualizar información de un estudiante becario
   * @param {String} becarioId - ID del becario
   * @param {Object} updateData - Datos a actualizar
   * @param {String} adminId - ID del usuario que realiza la actualización
   * @returns {Promise<Object>} - Becario actualizado
   */
  async updateBecario(becarioId, updateData, adminId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Buscar el becario
      const becario = await EstudianteBecario.findByPk(becarioId, {
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'apellido', 'cedula', 'email']
          },
          {
            model: Plaza,
            as: 'plaza',
            required: false,
            include: [
              {
                model: Usuario,
                as: 'supervisor',
                attributes: ['id', 'nombre', 'apellido', 'email'],
                required: false
              }
            ]
          }
        ],
        transaction
      });

      if (!becario) {
        await transaction.rollback();
        throw ApiError.notFound('Estudiante becario no encontrado');
      }

      // 2. Validar y procesar cambio de estado (si aplica)
      if (updateData.estado && updateData.estado !== becario.estado) {
        // Validar que el nuevo estado es válido
        if (!BecariosService.ESTADOS_VALIDOS.includes(updateData.estado)) {
          await transaction.rollback();
          throw ApiError.badRequest(
            `Estado inválido. Estados permitidos: ${BecariosService.ESTADOS_VALIDOS.join(', ')}`
          );
        }

        // Validar transición de estado
        if (!this.validarTransicionEstado(becario.estado, updateData.estado)) {
          await transaction.rollback();
          throw ApiError.badRequest(
            `No se puede cambiar de estado '${becario.estado}' a '${updateData.estado}'. ` +
            `Transiciones permitidas desde '${becario.estado}': ${BecariosService.TRANSICIONES_ESTADO[becario.estado].join(', ') || 'ninguna'}`
          );
        }

        // Lógica especial según el estado destino
        if (updateData.estado === 'Suspendida') {
          if (!updateData.motivoSuspension || updateData.motivoSuspension.trim() === '') {
            await transaction.rollback();
            throw ApiError.badRequest('El motivo de suspensión es requerido al suspender un becario');
          }
        }

        if (updateData.estado === 'Culminada') {
          updateData.fechaCulminacion = new Date();

          // Solo para Beca Ayudantía: verificar que se hayan completado las horas
          if (becario.tipoBeca === 'Ayudantía' && becario.horasRequeridas) {
            if (becario.horasCompletadas < becario.horasRequeridas) {
              await transaction.rollback();
              throw ApiError.badRequest(
                `No se puede culminar la beca. El becario ha completado ${becario.horasCompletadas} de ${becario.horasRequeridas} horas requeridas`
              );
            }
          }
        }

        if (updateData.estado === 'Cancelada') {
          if (!updateData.motivoSuspension || updateData.motivoSuspension.trim() === '') {
            await transaction.rollback();
            throw ApiError.badRequest('El motivo de cancelación es requerido al cancelar un becario');
          }
          updateData.fechaCulminacion = new Date();
        }

        // Si se reactiva una beca suspendida, limpiar el motivo de suspensión
        if (becario.estado === 'Suspendida' && updateData.estado === 'Activa') {
          updateData.motivoSuspension = null;
        }
      }

      // 3. Validar horasCompletadas (si aplica)
      if (updateData.horasCompletadas !== undefined) {
        // Solo validar para Beca Ayudantía
        if (becario.tipoBeca === 'Ayudantía' && becario.horasRequeridas) {
          const horasCompletadas = parseFloat(updateData.horasCompletadas);

          if (isNaN(horasCompletadas) || horasCompletadas < 0) {
            await transaction.rollback();
            throw ApiError.badRequest('Las horas completadas deben ser un número positivo');
          }

          if (horasCompletadas > becario.horasRequeridas) {
            await transaction.rollback();
            throw ApiError.badRequest(
              `Las horas completadas (${horasCompletadas}) no pueden exceder las horas requeridas (${becario.horasRequeridas})`
            );
          }

          // Auto-culminar si se completan las horas y está activo
          if (horasCompletadas >= becario.horasRequeridas && becario.estado === 'Activa') {
            updateData.estado = 'Culminada';
            updateData.fechaCulminacion = new Date();
          }
        } else if (becario.tipoBeca !== 'Ayudantía') {
          // No permitir actualizar horas para becas que no son Ayudantía
          await transaction.rollback();
          throw ApiError.badRequest('Solo las becas de tipo Ayudantía pueden registrar horas');
        }
      }

      // 4. Validar IAA actual (si aplica)
      if (updateData.iaaActual !== undefined) {
        const iaa = parseFloat(updateData.iaaActual);
        if (isNaN(iaa) || iaa < 0 || iaa > 20) {
          await transaction.rollback();
          throw ApiError.badRequest('El IAA debe ser un número entre 0 y 20');
        }
      }

      // 5. Validar descuento aplicado (si aplica)
      if (updateData.descuentoAplicado !== undefined) {
        const descuento = parseFloat(updateData.descuentoAplicado);
        if (isNaN(descuento) || descuento < 0 || descuento > 100) {
          await transaction.rollback();
          throw ApiError.badRequest('El descuento aplicado debe ser un número entre 0 y 100');
        }
      }

      // 6. Validar evaluación satisfactoria (si aplica)
      if (updateData.evaluacionSatisfactoria !== undefined) {
        if (updateData.evaluacionSatisfactoria === true) {
          updateData.fechaEvaluacion = new Date();
          // Aplicar descuento automáticamente según el programa de beca
          const programaBeca = await ProgramaBeca.findOne({
            where: { nombre: becario.tipoBeca, activo: true },
            transaction
          });
          if (programaBeca) {
            updateData.descuentoAplicado = programaBeca.porcentajeDescuento;
          }
        }
      }

      // 7. Guardar datos anteriores para auditoría
      const datosAnteriores = {
        estado: becario.estado,
        horasCompletadas: becario.horasCompletadas,
        iaaActual: becario.iaaActual,
        descuentoAplicado: becario.descuentoAplicado,
        evaluacionSatisfactoria: becario.evaluacionSatisfactoria,
        observaciones: becario.observaciones,
        motivoSuspension: becario.motivoSuspension
      };

      // 8. Actualizar el becario
      await becario.update(updateData, { transaction });

      // 9. Crear registro de auditoría
      const cambios = {};
      Object.keys(updateData).forEach(key => {
        if (datosAnteriores[key] !== updateData[key]) {
          cambios[key] = {
            anterior: datosAnteriores[key],
            nuevo: updateData[key]
          };
        }
      });

      await Auditoria.create({
        usuarioId: adminId,
        accion: 'UPDATE',
        entidad: 'EstudianteBecario',
        entidadId: becario.id,
        descripcion: `Actualización de becario: ${becario.usuario.nombre} ${becario.usuario.apellido}`,
        metadatos: {
          becarioId: becario.id,
          estudianteNombre: `${becario.usuario.nombre} ${becario.usuario.apellido}`,
          estudianteCedula: becario.usuario.cedula,
          cambios,
          fecha: new Date()
        }
      }, { transaction });

      await transaction.commit();

      // 10. Retornar becario actualizado con todas las relaciones
      const becarioActualizado = await EstudianteBecario.findByPk(becarioId, {
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'apellido', 'cedula', 'email', 'telefono', 'carrera', 'trimestre']
          },
          {
            model: Plaza,
            as: 'plaza',
            required: false,
            include: [
              {
                model: Usuario,
                as: 'supervisor',
                attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'departamento', 'cargo'],
                required: false
              }
            ]
          },
          {
            model: Postulacion,
            as: 'postulacion',
            attributes: ['id', 'iaa', 'creditosInscritos', 'fechaPostulacion', 'estado'],
            required: false
          }
        ]
      });

      return becarioActualizado;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Suspender un estudiante becario
   * @param {String} becarioId - ID del becario
   * @param {String} motivo - Motivo de la suspensión
   * @param {String} adminId - ID del admin que realiza la operación
   * @returns {Promise<Object>} - Becario suspendido
   */
  async suspenderBecario(becarioId, motivo, adminId) {
    if (!motivo || motivo.trim() === '') {
      throw ApiError.badRequest('El motivo de suspensión es requerido');
    }

    return this.updateBecario(
      becarioId,
      {
        estado: 'Suspendida',
        motivoSuspension: motivo,
        observaciones: `Suspendida: ${motivo}`
      },
      adminId
    );
  }

  /**
   * Reactivar un estudiante becario suspendido
   * @param {String} becarioId - ID del becario
   * @param {String} adminId - ID del admin que realiza la operación
   * @returns {Promise<Object>} - Becario reactivado
   */
  async reactivarBecario(becarioId, adminId) {
    const becario = await EstudianteBecario.findByPk(becarioId);

    if (!becario) {
      throw ApiError.notFound('Estudiante becario no encontrado');
    }

    if (becario.estado !== 'Suspendida') {
      throw ApiError.badRequest('Solo se pueden reactivar becas suspendidas');
    }

    return this.updateBecario(
      becarioId,
      {
        estado: 'Activa',
        motivoSuspension: null,
        observaciones: becario.observaciones ? `${becario.observaciones} | Reactivada` : 'Reactivada'
      },
      adminId
    );
  }

  /**
   * Culminar un estudiante becario
   * @param {String} becarioId - ID del becario
   * @param {String} adminId - ID del admin que realiza la operación
   * @returns {Promise<Object>} - Becario culminado
   */
  async culminarBecario(becarioId, adminId) {
    return this.updateBecario(
      becarioId,
      {
        estado: 'Culminada',
        fechaCulminacion: new Date()
      },
      adminId
    );
  }

  /**
   * Cancelar un estudiante becario (borrado lógico)
   * @param {String} becarioId - ID del becario
   * @param {String} motivo - Motivo de la cancelación
   * @param {String} adminId - ID del admin que realiza la operación
   * @returns {Promise<Object>} - Becario cancelado
   */
  async deleteBecario(becarioId, motivo, adminId) {
    if (!motivo || motivo.trim() === '') {
      throw ApiError.badRequest('El motivo de cancelación es requerido');
    }

    return this.updateBecario(
      becarioId,
      {
        estado: 'Cancelada',
        motivoSuspension: motivo, // Reutilizamos este campo para el motivo de cancelación
        observaciones: `Cancelada: ${motivo}`,
        fechaCulminacion: new Date()
      },
      adminId
    );
  }

  /**
   * Registrar horas de un estudiante becario
   * @param {String} becarioId - ID del becario
   * @param {Number} horas - Horas a agregar
   * @param {String} adminId - ID del admin/supervisor que registra
   * @returns {Promise<Object>} - Becario con horas actualizadas
   */
  async registrarHoras(becarioId, horas, adminId) {
    const becario = await EstudianteBecario.findByPk(becarioId);

    if (!becario) {
      throw ApiError.notFound('Estudiante becario no encontrado');
    }

    if (becario.tipoBeca !== 'Ayudantía') {
      throw ApiError.badRequest('Solo las becas de tipo Ayudantía pueden registrar horas');
    }

    if (!becario.puedeRegistrarHoras()) {
      throw ApiError.badRequest('El becario no puede registrar horas en su estado actual');
    }

    const horasActuales = parseFloat(becario.horasCompletadas) || 0;
    const horasNuevas = parseFloat(horas);

    if (isNaN(horasNuevas) || horasNuevas <= 0) {
      throw ApiError.badRequest('Las horas deben ser un número positivo');
    }

    const totalHoras = horasActuales + horasNuevas;

    return this.updateBecario(
      becarioId,
      {
        horasCompletadas: totalHoras
      },
      adminId
    );
  }
}

module.exports = new BecariosService();
