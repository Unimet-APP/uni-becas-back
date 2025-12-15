const { PostulacionPlaza, EstudianteBecario, Plaza, Usuario, DisponibilidadHoraria, Auditoria, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { contarBloquesMatcheados } = require('../utils/horarioHelper');

/**
 * Service para gestión de postulaciones a plazas
 * Centraliza la lógica de negocio y validaciones
 */
class PostulacionesPlazasService {
  /**
   * Estados válidos para postulaciones
   */
  static ESTADOS_VALIDOS = ['Pendiente', 'Aprobada', 'Rechazada'];

  /**
   * Umbral de compatibilidad horaria
   * Mínimo de bloques coincidentes o 100% si la plaza tiene menos de 10 bloques
   */
  static UMBRAL_COMPATIBILIDAD_BLOQUES = 10;

  /**
   * Crear una nueva postulación a una plaza
   * @param {String} estudianteBecarioId - ID del becario que postula
   * @param {String} plazaId - ID de la plaza a la que postula
   * @returns {Promise<Object>} - Postulación creada con datos completos
   */
  async crearPostulacion(estudianteBecarioId, plazaId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validar que el becario existe y está activo
      const becario = await EstudianteBecario.findByPk(estudianteBecarioId, {
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'activo']
        }],
        transaction
      });

      if (!becario) {
        await transaction.rollback();
        throw ApiError.notFound('Estudiante becario no encontrado');
      }

      if (!becario.usuario || !becario.usuario.activo) {
        await transaction.rollback();
        throw ApiError.badRequest('El usuario no está activo');
      }

      if (becario.estado !== 'Activa') {
        await transaction.rollback();
        throw ApiError.badRequest('Solo becarios con estado Activa pueden postular a plazas');
      }

      // 2. Validar que el becario NO tiene plaza asignada
      if (becario.plazaAsignada) {
        await transaction.rollback();
        throw ApiError.badRequest('Ya tienes una plaza asignada. No puedes postular a otra plaza hasta que liberes la actual');
      }

      // 3. Validar que el becario NO tiene otra postulación pendiente
      const postulacionPendiente = await PostulacionPlaza.findOne({
        where: {
          estudianteBecarioId,
          estado: 'Pendiente'
        },
        transaction
      });

      if (postulacionPendiente) {
        await transaction.rollback();
        throw ApiError.badRequest('Ya tienes una postulación pendiente. Espera la respuesta antes de postular a otra plaza');
      }

      // 4. Validar que la plaza existe y está disponible
      const plaza = await Plaza.findByPk(plazaId, {
        include: [{
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }],
        transaction
      });

      if (!plaza) {
        await transaction.rollback();
        throw ApiError.notFound('Plaza no encontrada');
      }

      if (plaza.estado !== 'Activa') {
        await transaction.rollback();
        throw ApiError.badRequest(`La plaza no está disponible. Estado actual: ${plaza.estado}`);
      }

      if (plaza.ocupadas >= plaza.capacidad) {
        await transaction.rollback();
        throw ApiError.badRequest('La plaza no tiene cupos disponibles');
      }

      // 5. Validar compatibilidad horaria
      const compatibilidadHoraria = await this.verificarCompatibilidadHoraria(
        becario.usuarioId,
        plaza,
        transaction
      );

      if (!compatibilidadHoraria.esCompatible) {
        await transaction.rollback();
        throw ApiError.badRequest(
          compatibilidadHoraria.mensaje,
          compatibilidadHoraria.detalles
        );
      }

      // 6. Crear la postulación
      const postulacion = await PostulacionPlaza.create({
        estudianteBecarioId,
        plazaId,
        estado: 'Pendiente',
        fechaPostulacion: new Date(),
        compatibilidadHoraria: compatibilidadHoraria.detalles
      }, { transaction });

      // 7. Registrar auditoría
      await Auditoria.create({
        usuarioId: becario.usuarioId,
        accion: 'CREATE',
        entidad: 'PostulacionPlaza',
        entidadId: postulacion.id,
        descripcion: `Estudiante ${becario.usuario.nombre} ${becario.usuario.apellido} creó postulación a plaza ${plaza.nombre}`,
        datosNuevos: {
          plazaId,
          plazaNombre: plaza.nombre,
          compatibilidad: compatibilidadHoraria.detalles
        }
      }, { transaction });

      await transaction.commit();

      // 8. Retornar postulación con datos completos
      return await PostulacionPlaza.findByPk(postulacion.id, {
        include: [
          {
            model: EstudianteBecario,
            as: 'estudianteBecario',
            include: [{
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'email', 'cedula']
            }]
          },
          {
            model: Plaza,
            as: 'plaza',
            include: [{
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email']
            }]
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verificar compatibilidad horaria entre estudiante y plaza
   * @param {String} usuarioId - ID del usuario estudiante
   * @param {Object} plaza - Objeto plaza con horario
   * @param {Object} transaction - Transacción de Sequelize
   * @returns {Promise<Object>} - { esCompatible, mensaje, detalles }
   */
  async verificarCompatibilidadHoraria(usuarioId, plaza, transaction = null) {
    if (!plaza || !plaza.horario || plaza.horario.length === 0) {
      return {
        esCompatible: false,
        mensaje: 'La plaza no tiene un horario definido',
        detalles: {
          error: 'Sin horario definido'
        }
      };
    }

    try {
      // Obtener disponibilidad horaria del estudiante
      const disponibilidad = await DisponibilidadHoraria.findOne({
        where: { usuarioId },
        transaction
      });

      if (!disponibilidad || !disponibilidad.disponibilidad) {
        return {
          esCompatible: false,
          mensaje: 'Debes completar tu disponibilidad horaria antes de postular a plazas',
          detalles: {
            error: 'Sin disponibilidad registrada',
            recomendacion: 'Completa tu disponibilidad horaria en tu perfil'
          }
        };
      }

      // Contar bloques matcheados usando la utilidad del sistema
      const { bloquesMatch, bloquesTotales, porcentaje } = contarBloquesMatcheados(
        disponibilidad.disponibilidad,
        plaza.horario
      );

      // Determinar si es compatible según el umbral
      const umbralBloques = PostulacionesPlazasService.UMBRAL_COMPATIBILIDAD_BLOQUES;
      const esCompatible = bloquesMatch >= Math.min(umbralBloques, bloquesTotales) || porcentaje === 100;

      if (!esCompatible) {
        return {
          esCompatible: false,
          mensaje: `Horario incompatible. Se requieren al menos ${umbralBloques} bloques coincidentes o 100% de compatibilidad. Tienes ${bloquesMatch}/${bloquesTotales} bloques (${porcentaje}%)`,
          detalles: {
            bloquesMatch,
            bloquesTotales,
            porcentaje,
            umbralRequerido: umbralBloques,
            horarioPlaza: plaza.horario
          }
        };
      }

      return {
        esCompatible: true,
        mensaje: `Horarios compatibles: ${bloquesMatch}/${bloquesTotales} bloques (${porcentaje}%)`,
        detalles: {
          bloquesMatch,
          bloquesTotales,
          porcentaje,
          horarioPlaza: plaza.horario
        }
      };
    } catch (error) {
      return {
        esCompatible: false,
        mensaje: `Error al verificar compatibilidad: ${error.message}`,
        detalles: { error: error.message }
      };
    }
  }

  /**
   * Aprobar una postulación y asignar plaza al becario
   * @param {String} postulacionId - ID de la postulación
   * @param {String} adminId - ID del admin que aprueba
   * @param {String} observaciones - Observaciones opcionales
   * @returns {Promise<Object>} - Postulación aprobada con becario actualizado
   */
  async aprobarPostulacion(postulacionId, adminId, observaciones = null) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Buscar postulación con sus relaciones
      const postulacion = await PostulacionPlaza.findByPk(postulacionId, {
        include: [
          {
            model: EstudianteBecario,
            as: 'estudianteBecario',
            include: [{
              model: Usuario,
              as: 'usuario'
            }]
          },
          {
            model: Plaza,
            as: 'plaza',
            include: [{
              model: Usuario,
              as: 'supervisor'
            }]
          }
        ],
        transaction
      });

      if (!postulacion) {
        await transaction.rollback();
        throw ApiError.notFound('Postulación no encontrada');
      }

      if (postulacion.estado !== 'Pendiente') {
        await transaction.rollback();
        throw ApiError.badRequest(
          `Esta postulación ya fue ${postulacion.estado.toLowerCase()}. No se puede aprobar`
        );
      }

      // 2. Verificar que la plaza aún tiene cupos (race condition)
      const plaza = postulacion.plaza;
      if (plaza.ocupadas >= plaza.capacidad) {
        await transaction.rollback();
        throw ApiError.badRequest('La plaza ya no tiene cupos disponibles');
      }

      if (plaza.estado !== 'Activa') {
        await transaction.rollback();
        throw ApiError.badRequest(`La plaza no está activa. Estado: ${plaza.estado}`);
      }

      // 3. Verificar que el becario aún cumple requisitos
      const becario = postulacion.estudianteBecario;
      if (becario.plazaAsignada) {
        await transaction.rollback();
        throw ApiError.badRequest('El becario ya tiene una plaza asignada');
      }

      if (becario.estado !== 'Activa') {
        await transaction.rollback();
        throw ApiError.badRequest(`El becario no está activo. Estado: ${becario.estado}`);
      }

      // 4. Asignar plaza al becario
      await becario.update({
        plazaAsignada: plaza.id,
        fechaAsignacion: new Date()
      }, { transaction });

      // 5. Incrementar ocupadas en la plaza (auto-cambia a Completa si se llena)
      await plaza.update({
        ocupadas: plaza.ocupadas + 1
      }, { transaction });

      // 6. Aprobar la postulación
      await postulacion.update({
        estado: 'Aprobada',
        fechaRespuesta: new Date(),
        respondidoPor: adminId,
        observaciones
      }, { transaction });

      // 7. Rechazar TODAS las otras postulaciones pendientes del mismo becario
      await PostulacionPlaza.update(
        {
          estado: 'Rechazada',
          fechaRespuesta: new Date(),
          respondidoPor: adminId,
          motivoRechazo: 'Becario asignado a otra plaza'
        },
        {
          where: {
            estudianteBecarioId: becario.id,
            estado: 'Pendiente',
            id: {
              [Op.ne]: postulacionId
            }
          },
          transaction
        }
      );

      // 8. Registrar auditoría
      await Auditoria.create({
        usuarioId: adminId,
        accion: 'APPROVE',
        entidad: 'PostulacionPlaza',
        entidadId: postulacion.id,
        descripcion: `Admin aprobó postulación de ${becario.usuario.nombre} ${becario.usuario.apellido} a plaza ${plaza.nombre}`,
        datosNuevos: {
          becarioId: becario.id,
          becarioNombre: `${becario.usuario.nombre} ${becario.usuario.apellido}`,
          plazaId: plaza.id,
          plazaNombre: plaza.nombre,
          observaciones
        }
      }, { transaction });

      await transaction.commit();

      // 9. Retornar postulación actualizada con todas las relaciones
      return await PostulacionPlaza.findByPk(postulacionId, {
        include: [
          {
            model: EstudianteBecario,
            as: 'estudianteBecario',
            include: [
              {
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'email', 'cedula']
              },
              {
                model: Plaza,
                as: 'plaza',
                include: [{
                  model: Usuario,
                  as: 'supervisor',
                  attributes: ['id', 'nombre', 'apellido', 'email']
                }]
              }
            ]
          },
          {
            model: Plaza,
            as: 'plaza',
            include: [{
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email']
            }]
          },
          {
            model: Usuario,
            as: 'respondidoPorUsuario',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rechazar una postulación
   * @param {String} postulacionId - ID de la postulación
   * @param {String} adminId - ID del admin que rechaza
   * @param {String} motivoRechazo - Motivo del rechazo (requerido)
   * @param {String} observaciones - Observaciones adicionales
   * @returns {Promise<Object>} - Postulación rechazada
   */
  async rechazarPostulacion(postulacionId, adminId, motivoRechazo, observaciones = null) {
    if (!motivoRechazo || motivoRechazo.trim() === '') {
      throw ApiError.badRequest('El motivo de rechazo es requerido');
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Buscar postulación
      const postulacion = await PostulacionPlaza.findByPk(postulacionId, {
        include: [
          {
            model: EstudianteBecario,
            as: 'estudianteBecario',
            include: [{
              model: Usuario,
              as: 'usuario'
            }]
          },
          {
            model: Plaza,
            as: 'plaza'
          }
        ],
        transaction
      });

      if (!postulacion) {
        await transaction.rollback();
        throw ApiError.notFound('Postulación no encontrada');
      }

      if (postulacion.estado !== 'Pendiente') {
        await transaction.rollback();
        throw ApiError.badRequest(
          `Esta postulación ya fue ${postulacion.estado.toLowerCase()}. No se puede rechazar`
        );
      }

      // 2. Rechazar la postulación
      await postulacion.update({
        estado: 'Rechazada',
        fechaRespuesta: new Date(),
        respondidoPor: adminId,
        motivoRechazo,
        observaciones
      }, { transaction });

      // 3. Registrar auditoría
      await Auditoria.create({
        usuarioId: adminId,
        accion: 'REJECT',
        entidad: 'PostulacionPlaza',
        entidadId: postulacion.id,
        descripcion: `Admin rechazó postulación de ${postulacion.estudianteBecario.usuario.nombre} ${postulacion.estudianteBecario.usuario.apellido} a plaza ${postulacion.plaza.nombre}`,
        datosNuevos: {
          becarioId: postulacion.estudianteBecario.id,
          becarioNombre: `${postulacion.estudianteBecario.usuario.nombre} ${postulacion.estudianteBecario.usuario.apellido}`,
          plazaId: postulacion.plaza.id,
          plazaNombre: postulacion.plaza.nombre,
          motivoRechazo,
          observaciones
        }
      }, { transaction });

      await transaction.commit();

      // 4. Retornar postulación actualizada
      return await PostulacionPlaza.findByPk(postulacionId, {
        include: [
          {
            model: EstudianteBecario,
            as: 'estudianteBecario',
            include: [{
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'email', 'cedula']
            }]
          },
          {
            model: Plaza,
            as: 'plaza',
            include: [{
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email']
            }]
          },
          {
            model: Usuario,
            as: 'respondidoPorUsuario',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener postulaciones con filtros y paginación
   * @param {Object} filtros - { estado, plazaId, estudianteBecarioId, limit, offset }
   * @returns {Promise<Object>} - { postulaciones, total, limit, offset }
   */
  async getPostulaciones(filtros = {}) {
    const {
      estado,
      plazaId,
      estudianteBecarioId,
      limit = 20,
      offset = 0
    } = filtros;

    const where = {};

    if (estado) {
      if (!PostulacionesPlazasService.ESTADOS_VALIDOS.includes(estado)) {
        throw ApiError.badRequest(
          `Estado inválido. Estados válidos: ${PostulacionesPlazasService.ESTADOS_VALIDOS.join(', ')}`
        );
      }
      where.estado = estado;
    }

    if (plazaId) {
      where.plazaId = plazaId;
    }

    if (estudianteBecarioId) {
      where.estudianteBecarioId = estudianteBecarioId;
    }

    const { rows: postulaciones, count: total } = await PostulacionPlaza.findAndCountAll({
      where,
      include: [
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'carrera']
          }]
        },
        {
          model: Plaza,
          as: 'plaza',
          include: [{
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }]
        },
        {
          model: Usuario,
          as: 'respondidoPorUsuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ],
      order: [
        ['estado', 'ASC'], // Pendientes primero
        ['fechaPostulacion', 'DESC'] // Más recientes primero
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      postulaciones,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtener postulación por ID
   * @param {String} postulacionId - ID de la postulación
   * @returns {Promise<Object>} - Postulación con relaciones completas
   */
  async getPostulacionById(postulacionId) {
    const postulacion = await PostulacionPlaza.findByPk(postulacionId, {
      include: [
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono', 'carrera']
            },
            {
              model: Plaza,
              as: 'plaza',
              required: false
            }
          ]
        },
        {
          model: Plaza,
          as: 'plaza',
          include: [{
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido', 'email', 'telefono']
          }]
        },
        {
          model: Usuario,
          as: 'respondidoPorUsuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ]
    });

    if (!postulacion) {
      throw ApiError.notFound('Postulación no encontrada');
    }

    return postulacion;
  }

  /**
   * Obtener postulaciones de un becario específico
   * @param {String} estudianteBecarioId - ID del becario
   * @returns {Promise<Array>} - Lista de postulaciones del becario
   */
  async getPostulacionesByBecario(estudianteBecarioId) {
    const becario = await EstudianteBecario.findByPk(estudianteBecarioId);

    if (!becario) {
      throw ApiError.notFound('Estudiante becario no encontrado');
    }

    return await PostulacionPlaza.findAll({
      where: { estudianteBecarioId },
      include: [
        {
          model: Plaza,
          as: 'plaza',
          include: [{
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }]
        },
        {
          model: Usuario,
          as: 'respondidoPorUsuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ],
      order: [['fechaPostulacion', 'DESC']]
    });
  }

  /**
   * Obtener postulaciones de una plaza específica
   * @param {String} plazaId - ID de la plaza
   * @param {String} estadoFiltro - Filtro opcional por estado
   * @returns {Promise<Array>} - Lista de postulaciones de la plaza
   */
  async getPostulacionesByPlaza(plazaId, estadoFiltro = null) {
    const plaza = await Plaza.findByPk(plazaId);

    if (!plaza) {
      throw ApiError.notFound('Plaza no encontrada');
    }

    const where = { plazaId };
    if (estadoFiltro) {
      where.estado = estadoFiltro;
    }

    return await PostulacionPlaza.findAll({
      where,
      include: [
        {
          model: EstudianteBecario,
          as: 'estudianteBecario',
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'carrera']
          }]
        },
        {
          model: Usuario,
          as: 'respondidoPorUsuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ],
      order: [
        ['estado', 'ASC'], // Pendientes primero
        ['fechaPostulacion', 'DESC']
      ]
    });
  }
}

module.exports = new PostulacionesPlazasService();
