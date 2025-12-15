const supervisoresService = require('../services/supervisoresService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

class SupervisoresController {
  /**
   * GET /api/v1/supervisores/ayudantes/all
   * Obtener todos los supervisores con sus ayudantes asignados (a través de plazas)
   */
  getAllSupervisoresConAyudantes = asyncHandler(async (req, res) => {
    const filters = req.query;
    const resultado = await supervisoresService.getAllSupervisoresConAyudantes(filters);

    return sendSuccess(
      res,
      resultado,
      'Supervisores con ayudantes obtenidos exitosamente'
    );
  });

  /**
   * GET /api/v1/supervisores/:id/ayudantes
   * Obtener ayudantes de un supervisor específico (a través de sus plazas activas)
   */
  getAyudantesDeSupervisor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del supervisor debe ser un UUID válido');
    }

    const resultado = await supervisoresService.getAyudantesDeSupervisor(id);

    return sendSuccess(
      res,
      resultado,
      'Ayudantes del supervisor obtenidos exitosamente'
    );
  });

  /**
   * GET /api/v1/supervisores/:supervisorId/plaza-activa
   * Obtener la plaza activa de un supervisor en un período específico
   */
  getPlazaActivaDelSupervisor = asyncHandler(async (req, res) => {
    const { supervisorId } = req.params;
    const { periodoAcademico } = req.query;

    // Validar UUID del supervisor
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(supervisorId)) {
      throw ApiError.badRequest('El ID del supervisor debe ser un UUID válido');
    }

    // Validar que se proporcione el período académico
    if (!periodoAcademico) {
      throw ApiError.badRequest('El parámetro periodoAcademico es requerido');
    }

    const plaza = await supervisoresService.getPlazaActivaDelSupervisor(supervisorId, periodoAcademico);

    if (!plaza) {
      return sendSuccess(
        res,
        { plaza: null },
        'El supervisor no tiene plaza activa en este período'
      );
    }

    return sendSuccess(
      res,
      { plaza },
      'Plaza activa del supervisor obtenida exitosamente'
    );
  });

  /**
   * GET /api/v1/supervisores
   * Obtener lista ligera de supervisores (sin relaciones)
   */
  getAllSupervisores = asyncHandler(async (req, res) => {
    const filters = req.query;
    const resultado = await supervisoresService.getAllSupervisores(filters);

    return sendSuccess(
      res,
      resultado,
      'Supervisores obtenidos exitosamente'
    );
  });

  /**
   * GET /api/v1/supervisores/:id
   * Obtener supervisor por ID con todas las relaciones
   */
  getSupervisorById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del supervisor debe ser un UUID válido');
    }

    const supervisor = await supervisoresService.getSupervisorById(id);

    return sendSuccess(
      res,
      supervisor,
      'Supervisor obtenido exitosamente'
    );
  });

  /**
   * PATCH /api/v1/supervisores/:id
   * Actualizar información de un supervisor
   */
  updateSupervisor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del supervisor debe ser un UUID válido');
    }

    // Validar que se proporcionen datos para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      throw ApiError.badRequest('Debe proporcionar al menos un campo para actualizar');
    }

    // Campos permitidos para actualización
    const allowedFields = ['nombre', 'apellido', 'email', 'telefono', 'departamento', 'cargo', 'activo'];

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

    // Validaciones especiales para el campo 'activo'
    if ('activo' in filteredData) {
      // Solo admin puede modificar el campo 'activo'
      if (!req.user.esAdmin()) {
        throw ApiError.forbidden(
          'Solo los administradores pueden activar o desactivar supervisores'
        );
      }

      // Validar que 'activo' sea un valor booleano
      if (typeof filteredData.activo !== 'boolean') {
        throw ApiError.badRequest(
          'El campo "activo" debe ser un valor booleano (true o false)'
        );
      }

      // Si se intenta desactivar (activo: false), verificar que no tenga plazas activas
      if (filteredData.activo === false) {
        const supervisor = await supervisoresService.getSupervisorById(id);

        // Contar plazas y estudiantes activos
        const plazasActivas = supervisor.plazasAsignadas || [];
        let totalEstudiantesActivos = 0;
        plazasActivas.forEach(plaza => {
          totalEstudiantesActivos += plaza.estudiantesAsignados?.length || 0;
        });

        if (totalEstudiantesActivos > 0) {
          throw ApiError.badRequest(
            `No se puede desactivar el supervisor porque tiene ${totalEstudiantesActivos} estudiante(s) activo(s) en ${plazasActivas.length} plaza(s). ` +
            `Primero debe reasignar los estudiantes o completar el período académico.`
          );
        }
      }
    }

    const supervisorActualizado = await supervisoresService.updateSupervisor(
      id,
      filteredData,
      req.user.id
    );

    return sendSuccess(
      res,
      supervisorActualizado,
      'Supervisor actualizado exitosamente'
    );
  });

  /**
   * DELETE /api/v1/supervisores/:id
   * Desactivar un supervisor (borrado lógico)
   * NOTA: Las plazas del supervisor permanecen activas hasta el final del período
   */
  deleteSupervisor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ApiError.badRequest('El ID del supervisor debe ser un UUID válido');
    }

    const resultado = await supervisoresService.deleteSupervisor(id, req.user.id);

    let mensaje = 'Supervisor desactivado exitosamente';
    if (resultado.plazasActivas > 0) {
      mensaje += `. El supervisor tiene ${resultado.plazasActivas} plaza(s) activa(s) con ${resultado.estudiantesActivos} estudiante(s). Las plazas permanecerán activas hasta el final del período`;
    }

    return sendSuccess(
      res,
      resultado,
      mensaje
    );
  });
}

module.exports = new SupervisoresController();
