const { EstudianteBecario, Plaza, Usuario, DisponibilidadHoraria } = require('../models');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const postulacionesPlazasService = require('../services/postulacionesPlazasService');
const { contarBloquesMatcheados } = require('../utils/horarioHelper');

class PostulacionesPlazasController {
  // ============================================================
  // ENDPOINTS PARA ESTUDIANTES
  // ============================================================

  /**
   * GET /api/v1/becarios/me/plazas-compatibles
   * Obtener plazas disponibles compatibles con el horario del estudiante
   */
  getPlazasCompatibles = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    // 1. Validar que el usuario tiene un registro de becario
    const becario = await EstudianteBecario.findOne({
      where: { usuarioId },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'apellido', 'email', 'activo']
      }]
    });

    if (!becario) {
      throw ApiError.notFound('No se encontró un registro de becario para este usuario');
    }

    if (becario.estado !== 'Activa') {
      throw ApiError.badRequest('Tu beca no está activa. Estado actual: ' + becario.estado);
    }

    if (becario.plazaAsignada) {
      throw ApiError.badRequest('Ya tienes una plaza asignada. No puedes ver otras plazas hasta que liberes la actual');
    }

    // 2. Obtener disponibilidad horaria del estudiante
    const disponibilidad = await DisponibilidadHoraria.findOne({
      where: { usuarioId }
    });

    if (!disponibilidad || !disponibilidad.disponibilidad) {
      throw ApiError.badRequest('Debes completar tu disponibilidad horaria antes de ver plazas disponibles');
    }

    // 3. Obtener plazas activas con cupos disponibles
    const { tipoAyudantia, periodoAcademico } = req.query;
    const where = {
      estado: 'Activa'
    };

    if (tipoAyudantia) {
      where.tipoAyudantia = tipoAyudantia;
    }

    if (periodoAcademico) {
      where.periodoAcademico = periodoAcademico;
    }

    const plazas = await Plaza.findAll({
      where,
      include: [{
        model: Usuario,
        as: 'supervisor',
        attributes: ['id', 'nombre', 'apellido', 'email']
      }],
      order: [['nombre', 'ASC']]
    });

    // 4. Filtrar plazas por compatibilidad horaria y calcular % de compatibilidad
    const plazasCompatibles = plazas
      .filter(plaza => plaza.ocupadas < plaza.capacidad)
      .map(plaza => {
        const plazaJSON = plaza.toJSON();

        // Calcular compatibilidad horaria
        if (!plazaJSON.horario || plazaJSON.horario.length === 0) {
          plazaJSON.compatibilidad = {
            esCompatible: false,
            porcentaje: 0,
            mensaje: 'Plaza sin horario definido'
          };
          return plazaJSON;
        }

        const { bloquesMatch, bloquesTotales, porcentaje } = contarBloquesMatcheados(
          disponibilidad.disponibilidad,
          plazaJSON.horario
        );

        const umbralBloques = postulacionesPlazasService.constructor.UMBRAL_COMPATIBILIDAD_BLOQUES;
        const esCompatible = bloquesMatch >= Math.min(umbralBloques, bloquesTotales) || porcentaje === 100;

        plazaJSON.compatibilidad = {
          esCompatible,
          bloquesMatch,
          bloquesTotales,
          porcentaje,
          mensaje: esCompatible
            ? `Compatible: ${bloquesMatch}/${bloquesTotales} bloques (${porcentaje}%)`
            : `Incompatible: ${bloquesMatch}/${bloquesTotales} bloques (${porcentaje}%). Se requieren al menos ${umbralBloques} bloques`
        };

        plazaJSON.plazasDisponibles = plazaJSON.capacidad - plazaJSON.ocupadas;

        return plazaJSON;
      })
      .filter(plaza => plaza.compatibilidad.esCompatible)
      .sort((a, b) => b.compatibilidad.porcentaje - a.compatibilidad.porcentaje);

    return sendSuccess(res, {
      plazas: plazasCompatibles,
      total: plazasCompatibles.length
    }, 'Plazas compatibles obtenidas exitosamente');
  });

  /**
   * POST /api/v1/becarios/me/postular-plaza
   * Estudiante postula a una plaza con aprobación
   */
  postularAPlaza = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const { plazaId } = req.body;

    if (!plazaId) {
      throw ApiError.badRequest('El campo plazaId es requerido');
    }

    // 1. Buscar becario del usuario autenticado
    const becario = await EstudianteBecario.findOne({
      where: { usuarioId }
    });

    if (!becario) {
      throw ApiError.notFound('No se encontró un registro de becario para este usuario');
    }

    // 2. Crear postulación usando el service
    const postulacion = await postulacionesPlazasService.crearPostulacion(becario.id, plazaId);

    return sendSuccess(res, postulacion, 'Postulación creada exitosamente. Espera la aprobación del administrador', 201);
  });

  /**
   * GET /api/v1/becarios/me/postulaciones-plazas
   * Ver postulaciones a plazas del estudiante autenticado
   */
  getMisPostulaciones = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    // 1. Buscar becario del usuario autenticado
    const becario = await EstudianteBecario.findOne({
      where: { usuarioId }
    });

    if (!becario) {
      throw ApiError.notFound('No se encontró un registro de becario para este usuario');
    }

    // 2. Obtener postulaciones del becario
    const postulaciones = await postulacionesPlazasService.getPostulacionesByBecario(becario.id);

    return sendSuccess(res, {
      postulaciones,
      total: postulaciones.length
    }, 'Postulaciones obtenidas exitosamente');
  });

  // ============================================================
  // ENDPOINTS PARA ADMINISTRADORES
  // ============================================================

  /**
   * GET /api/v1/postulaciones-plazas
   * Listar todas las postulaciones a plazas con filtros (admin)
   */
  getAll = asyncHandler(async (req, res) => {
    const { estado, plazaId, estudianteBecarioId, limit, offset } = req.query;

    const resultado = await postulacionesPlazasService.getPostulaciones({
      estado,
      plazaId,
      estudianteBecarioId,
      limit,
      offset
    });

    return sendSuccess(res, resultado, 'Postulaciones obtenidas exitosamente');
  });

  /**
   * GET /api/v1/postulaciones-plazas/:id
   * Ver detalle de una postulación específica (admin)
   */
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const postulacion = await postulacionesPlazasService.getPostulacionById(id);

    return sendSuccess(res, postulacion, 'Postulación obtenida exitosamente');
  });

  /**
   * PUT /api/v1/postulaciones-plazas/:id/aprobar
   * Aprobar una postulación y asignar plaza al becario (admin)
   */
  aprobar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { observaciones } = req.body;
    const adminId = req.user.id;

    const postulacion = await postulacionesPlazasService.aprobarPostulacion(
      id,
      adminId,
      observaciones
    );

    return sendSuccess(res, postulacion, 'Postulación aprobada exitosamente. El becario ha sido asignado a la plaza');
  });

  /**
   * PUT /api/v1/postulaciones-plazas/:id/rechazar
   * Rechazar una postulación (admin)
   */
  rechazar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { motivoRechazo, observaciones } = req.body;
    const adminId = req.user.id;

    if (!motivoRechazo) {
      throw ApiError.badRequest('El campo motivoRechazo es requerido');
    }

    const postulacion = await postulacionesPlazasService.rechazarPostulacion(
      id,
      adminId,
      motivoRechazo,
      observaciones
    );

    return sendSuccess(res, postulacion, 'Postulación rechazada exitosamente');
  });

  /**
   * GET /api/v1/plazas/:id/postulaciones
   * Obtener postulaciones de una plaza específica (admin/supervisor)
   */
  getPostulacionesByPlaza = asyncHandler(async (req, res) => {
    const { id: plazaId } = req.params;
    const { estado } = req.query;

    const postulaciones = await postulacionesPlazasService.getPostulacionesByPlaza(plazaId, estado);

    return sendSuccess(res, {
      postulaciones,
      total: postulaciones.length
    }, 'Postulaciones de la plaza obtenidas exitosamente');
  });
}

module.exports = new PostulacionesPlazasController();
