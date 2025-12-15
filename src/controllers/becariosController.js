const { EstudianteBecario, Usuario, Plaza, Postulacion } = require('../models');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const becariosService = require('../services/becariosService');

class BecariosController {
  /**
   * GET /api/v1/becarios/me
   * Obtener el registro de estudiante becario del usuario autenticado
   */
  getMiBecario = asyncHandler(async (req, res) => {
    const becario = await EstudianteBecario.findOne({
      where: { usuarioId: req.user.id },
      include: [
        {
          model: Usuario,
          as: 'usuario'
        },
        {
          model: Plaza,
          as: 'plaza',
          attributes: ['id', 'nombre', 'ubicacion', 'descripcionActividades'],
          required: false,
          include: [
            {
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'],
              required: false
            }
          ]
        },
        {
          model: Postulacion,
          as: 'postulacion',
          attributes: ['id', 'estado', 'fechaPostulacion', 'fechaEvaluacion'],
          required: false
        }
      ]
    });

    if (!becario) {
      throw ApiError.notFound('No se encontró un registro de beca activo para este usuario');
    }

    return sendSuccess(res, becario, 'Información de becario obtenida exitosamente');
  });

  /**
   * GET /api/v1/becarios/:id
   * Obtener información de un becario específico (supervisores y admins)
   */
  getBecarioById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const becario = await EstudianteBecario.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'usuario'
        },
        {
          model: Plaza,
          as: 'plaza',
          required: false,
          include: [
            {
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'],
              required: false
            }
          ]
        },
        {
          model: Postulacion,
          as: 'postulacion',
          required: false
        }
      ]
    });

    if (!becario) {
      throw ApiError.notFound('Estudiante becario no encontrado');
    }

    // Verificar permisos: debe ser el propietario, supervisor o admin
    const isOwner = req.user.id === becario.usuarioId;
    const isSupervisor = becario.plaza?.supervisorResponsable === req.user.id;
    const canView = isOwner || isSupervisor || req.user.puedeAdministrar() || req.user.puedeEvaluar();

    if (!canView) {
      throw ApiError.forbidden('No tienes permisos para ver este registro');
    }

    return sendSuccess(res, becario, 'Becario obtenido exitosamente');
  });

  /**
   * GET /api/v1/becarios
   * Listar becarios (con filtros) - solo admins
   */
  getAllBecarios = asyncHandler(async (req, res) => {
    const { estado, tipoBeca, periodoInicio, sinSupervisor, limit = 20, offset = 0 } = req.query;

    // Validar límite máximo de paginación (prevenir ataques DoS)
    const { PAGINACION } = require('../config/constants');
    const limitInt = parseInt(limit);
    const offsetInt = parseInt(offset);

    if (limitInt > PAGINACION.LIMITE_MAXIMO) {
      throw ApiError.badRequest(`El límite máximo permitido es ${PAGINACION.LIMITE_MAXIMO}`);
    }

    if (limitInt < 1) {
      throw ApiError.badRequest('El límite debe ser mayor a 0');
    }

    if (offsetInt < 0) {
      throw ApiError.badRequest('El offset debe ser mayor o igual a 0');
    }

    const { Op } = require('sequelize');
    const whereClause = {};

    // Filtro de estado: por defecto solo mostrar becarios activos
    // Use ?estado=todos para ver todos los estados
    if (estado === 'todos') {
      // No agregar filtro de estado - mostrar todos
    } else if (estado) {
      // Usar el estado especificado (Activa, Suspendida, Culminada, Cancelada)
      whereClause.estado = estado;
    } else {
      // Por defecto, solo mostrar becarios activos
      whereClause.estado = 'Activa';
    }

    if (tipoBeca) whereClause.tipoBeca = tipoBeca;
    if (periodoInicio) whereClause.periodoInicio = periodoInicio;

    // Filtro para ayudantes sin supervisor asignado (sin plaza)
    if (sinSupervisor === 'true') {
      whereClause.plazaAsignada = { [Op.is]: null };
    }

    const { count, rows } = await EstudianteBecario.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'usuario'
        },
        {
          model: Plaza,
          as: 'plaza',
          attributes: ['id', 'nombre'],
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
      limit: limitInt,
      offset: offsetInt,
      order: [['createdAt', 'DESC']]
    });

    return sendSuccess(res, {
      becarios: rows,
      total: count,
      limit: limitInt,
      offset: offsetInt,
      totalPages: Math.ceil(count / limitInt)
    }, 'Becarios obtenidos exitosamente');
  });

  /**
   * GET /api/v1/becarios/supervisor/mis-ayudantes
   * Obtener becarios asignados al supervisor autenticado
   */
  getMisAyudantes = asyncHandler(async (req, res) => {
    const { estado, limit = 20, offset = 0 } = req.query;

    // Validar límite máximo de paginación
    const { PAGINACION } = require('../config/constants');
    const limitInt = parseInt(limit);
    const offsetInt = parseInt(offset);

    if (limitInt > PAGINACION.LIMITE_MAXIMO) {
      throw ApiError.badRequest(`El límite máximo permitido es ${PAGINACION.LIMITE_MAXIMO}`);
    }

    const { Op } = require('sequelize');

    // 1. Obtener plazas activas del supervisor
    const plazas = await Plaza.findAll({
      where: {
        supervisorResponsable: req.user.id,
        estado: 'Activa'
      },
      attributes: ['id']
    });

    const plazaIds = plazas.map(p => p.id);

    if (plazaIds.length === 0) {
      return sendSuccess(res, {
        ayudantes: [],
        total: 0,
        limit: limitInt,
        offset: offsetInt,
        totalPages: 0
      }, 'No tienes plazas activas asignadas');
    }

    // 2. Query becarios asignados a esas plazas
    const whereClause = {
      plazaAsignada: { [Op.in]: plazaIds }
    };

    // Filtro de estado: por defecto solo mostrar ayudantes activos
    // Use ?estado=todos para ver todos los estados
    if (estado === 'todos') {
      // No agregar filtro de estado - mostrar todos
    } else if (estado) {
      // Usar el estado especificado
      whereClause.estado = estado;
    } else {
      // Por defecto, solo mostrar ayudantes activos
      whereClause.estado = 'Activa';
    }

    const { count, rows } = await EstudianteBecario.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'usuario'
        },
        {
          model: Plaza,
          as: 'plaza',
          attributes: ['id', 'nombre', 'ubicacion'],
          required: false
        }
      ],
      limit: limitInt,
      offset: offsetInt,
      order: [['createdAt', 'DESC']]
    });

    return sendSuccess(res, {
      ayudantes: rows,
      total: count,
      limit: limitInt,
      offset: offsetInt,
      totalPages: Math.ceil(count / limitInt)
    }, 'Ayudantes obtenidos exitosamente');
  });

  /**
   * PATCH /api/v1/becarios/:id/asignar-plaza
   * Asignar o cambiar plaza de un becario (solo admins)
   */
  asignarPlazaAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { plazaId } = req.body;

    // Validación de entrada
    if (!plazaId) {
      throw ApiError.badRequest('El ID de la plaza es requerido');
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(plazaId)) {
      throw ApiError.badRequest('El plazaId debe ser un UUID válido');
    }

    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del becario debe ser un UUID válido');
    }

    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // 1. Cargar becario
      const becario = await EstudianteBecario.findByPk(id, { transaction });
      if (!becario) {
        throw ApiError.notFound('Estudiante becario no encontrado');
      }

      // 2. Validar que NO tenga plaza asignada
      if (becario.plazaAsignada) {
        throw ApiError.badRequest(
          'El becario ya tiene una plaza asignada. No se puede asignar una nueva plaza.'
        );
      }

      // 3. Cargar plaza
      const plaza = await Plaza.findByPk(plazaId, { transaction });
      if (!plaza) {
        throw ApiError.notFound('Plaza no encontrada');
      }

      // 4. Validar que tenga cupos disponibles
      if (plaza.ocupadas >= plaza.capacidad) {
        throw ApiError.badRequest(
          `Esta plaza no tiene cupos disponibles. Ocupadas: ${plaza.ocupadas}/${plaza.capacidad}`
        );
      }

      // 5. Validar compatibilidad de horarios
      const compatibilidad = await becario.verificarCompatibilidadHorario(plaza, { transaction });
      if (!compatibilidad.esCompatible) {
        throw ApiError.badRequest(compatibilidad.mensaje, {
          detalles: compatibilidad.detalles
        });
      }

      // 6. Asignar plaza al becario
      becario.plazaAsignada = plazaId;
      becario.fechaAsignacion = new Date();
      await becario.save({ transaction });

      // 7. Actualizar plaza (incrementar ocupadas)
      plaza.ocupadas += 1;
      await plaza.save({ transaction });

      // 8. Commit
      await transaction.commit();

      // 9. Retornar respuesta
      return sendSuccess(
        res,
        {
          becarioId: becario.id,
          plazaId: plaza.id,
          fechaAsignacion: becario.fechaAsignacion
        },
        'Plaza asignada exitosamente',
        200
      );
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/becarios/postular-plaza
   * Permite a un estudiante becario postularse a una plaza de ayudantía disponible
   */
  postularPlaza = asyncHandler(async (req, res) => {
    const { plazaId } = req.body;
    const usuarioId = req.user.id;

    if (!plazaId) {
      throw ApiError.badRequest('El ID de la plaza es requerido');
    }

    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // 1. Verificar que el usuario tiene un registro de EstudianteBecario activo
      const becario = await EstudianteBecario.findOne({
        where: {
          usuarioId,
          estado: 'Activa'
        },
        include: [
          {
            model: Usuario,
            as: 'usuario'
            // Dejar que el defaultScope maneje los attributes
            // Ya excluye solo 'password', todos los demás campos se cargarán
          }
        ],
        transaction
      });

      if (!becario) {
        throw ApiError.notFound(
          'No se encontró un registro de beca activo para este usuario. ' +
          'Debe tener una postulación aprobada antes de postularse a plazas.'
        );
      }

      // Validar que el usuario esté activo
      if (!becario.usuario) {
        throw ApiError.internal(
          'Error al cargar información del usuario. Por favor contacte al administrador.'
        );
      }

      // Verificar que el campo activo se haya cargado correctamente
      if (becario.usuario.activo === undefined || becario.usuario.activo === null) {
        throw ApiError.internal(
          `Error al verificar el estado del usuario. Campo 'activo' no disponible. ` +
          `Por favor contacte al administrador.`
        );
      }

      if (becario.usuario.activo === false) {
        throw ApiError.forbidden(
          'Tu usuario está desactivado. No puedes postularte a plazas en este momento. ' +
          'Contacta al administrador para más información.'
        );
      }

      // 2. Verificar que el becario no tenga plaza ya asignada
      if (becario.plazaAsignada) {
        throw ApiError.badRequest(
          'Ya tienes una plaza asignada. No puedes postularte a otra plaza mientras tengas una asignación activa. ' +
          'Contacta a tu supervisor o administrador para cambiar de plaza.'
        );
      }

      // 3. Verificar que la plaza existe y está disponible
      // Nota: Se usa transaction sin pessimistic lock (LOCK.UPDATE)
      // Para un sistema de tesis, el nivel de aislamiento READ COMMITTED de la transaction
      // es suficiente para evitar inconsistencias. Lock pesimista causaba timeouts.
      const plaza = await Plaza.findByPk(plazaId, {
        transaction
      });

      if (!plaza) {
        throw ApiError.notFound('Plaza no encontrada');
      }

      if (plaza.estado !== 'Activa') {
        throw ApiError.badRequest(
          `Esta plaza no está disponible. Estado actual: ${plaza.estado}`
        );
      }

      if (plaza.ocupadas >= plaza.capacidad) {
        throw ApiError.badRequest(
          'Esta plaza ya no tiene cupos disponibles. Todas las plazas están ocupadas.'
        );
      }

      // 4. Asignar la plaza al becario
      await becario.asignarPlaza(plazaId);

      // 5. Incrementar el contador de plazas ocupadas
      await plaza.asignarEstudiante();

      await transaction.commit();

      // 6. Recargar becario con todas las relaciones
      const becarioActualizado = await EstudianteBecario.findByPk(becario.id, {
        include: [
          {
            model: Usuario,
            as: 'usuario'
          },
          {
            model: Plaza,
            as: 'plaza',
            attributes: [
              'id', 'nombre',
              'ubicacion', 'tipoAyudantia',
              'horasSemana', 'capacidad', 'ocupadas', 'estado'
            ]
          },
          {
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido', 'email'],
            required: false
          }
        ]
      });

      return sendSuccess(
        res,
        becarioActualizado,
        'Postulación a plaza exitosa. Has sido asignado correctamente.',
        201
      );
    } catch (error) {
      // Solo hacer rollback si la transacción no ha sido finalizada
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/becarios/:id/remover-plaza
   * Remover la asignación de plaza de un becario (solo admins)
   */
  removerPlaza = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del becario debe ser un UUID válido');
    }

    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // 1. Verificar que el becario existe
      const becario = await EstudianteBecario.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: 'usuario'
            // Dejar que el defaultScope maneje los attributes
            // Ya excluye solo 'password', todos los demás campos se cargarán
          },
          {
            model: Plaza,
            as: 'plaza',
            attributes: ['id', 'nombre', 'capacidad', 'ocupadas'],
            required: false
          }
        ],
        transaction
      });

      if (!becario) {
        throw ApiError.notFound('Estudiante becario no encontrado');
      }

      // 2. Verificar que el becario tiene plaza asignada
      if (!becario.plazaAsignada) {
        throw ApiError.badRequest(
          'Este becario no tiene plaza asignada. No hay nada que remover.'
        );
      }

      // 3. Obtener la plaza para liberar el cupo
      // Nota: Se usa transaction sin pessimistic lock (LOCK.UPDATE)
      // Para un sistema de tesis, el nivel de aislamiento READ COMMITTED de la transaction
      // es suficiente para evitar inconsistencias. Lock pesimista causaba timeouts.
      const plaza = await Plaza.findByPk(becario.plazaAsignada, {
        transaction
      });

      if (!plaza) {
        throw ApiError.notFound(
          'La plaza asignada no fue encontrada en el sistema. ' +
          'Es posible que haya sido eliminada. Se removerá la referencia del becario.'
        );
      }

      // 4. Guardar información de la plaza antes de removerla (para observaciones)
      const plazaAnterior = {
        id: plaza.id,
        nombre: plaza.nombre
      };

      // 5. Liberar el cupo en la plaza
      if (plaza) {
        await plaza.liberarEstudiante();
      }

      // 6. Remover la asignación de plaza del becario
      becario.plazaAsignada = null;

      // 7. Registrar el cambio en observaciones
      const fechaRemovido = new Date().toISOString();
      const observacionAnterior = becario.observaciones || '';
      becario.observaciones = `${observacionAnterior}\nPlaza removida por admin: ${plazaAnterior.nombre} el ${fechaRemovido}`.trim();

      await becario.save({ transaction });

      await transaction.commit();

      // 8. Devolver becario actualizado (ya no tiene plaza asignada)
      // Eliminado reload innecesario - el objeto becario ya tiene los datos actualizados
      // Se limpia la relación plaza manualmente para reflejar el estado actual
      becario.plaza = null;

      return sendSuccess(
        res,
        becario,
        `Plaza removida exitosamente. El becario ${becario.usuario.nombre} ${becario.usuario.apellido} ya no está asignado a ninguna plaza.`,
        200
      );
    } catch (error) {
      // Solo hacer rollback si la transacción no ha sido finalizada
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  });

  /**
   * PATCH /api/v1/becarios/:id
   * Actualizar información de un becario (solo admins)
   */
  updateBecario = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validar que se proporcionen datos para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      throw ApiError.badRequest('Debe proporcionar al menos un campo para actualizar');
    }

    // Campos permitidos para actualización
    const allowedFields = [
      'estado',
      'horasCompletadas',
      'iaaActual',
      'observaciones',
      'motivoSuspension',
      'descuentoAplicado',
      'evaluacionSatisfactoria'
    ];

    // Filtrar solo los campos permitidos
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw ApiError.badRequest(
        `Solo se permiten los siguientes campos: ${allowedFields.join(', ')}`
      );
    }

    // Actualizar usando el service
    const becarioActualizado = await becariosService.updateBecario(
      id,
      filteredData,
      req.user.id
    );

    return sendSuccess(
      res,
      becarioActualizado,
      'Becario actualizado exitosamente'
    );
  });

  /**
   * DELETE /api/v1/becarios/:id
   * Cancelar un becario (borrado lógico - solo admins)
   */
  deleteBecario = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim() === '') {
      throw ApiError.badRequest('El motivo de cancelación es requerido');
    }

    // Cancelar usando el service (cambia estado a 'Cancelada')
    const becarioCancelado = await becariosService.deleteBecario(
      id,
      motivo,
      req.user.id
    );

    return sendSuccess(
      res,
      becarioCancelado,
      'Becario cancelado exitosamente'
    );
  });
}

module.exports = new BecariosController();
