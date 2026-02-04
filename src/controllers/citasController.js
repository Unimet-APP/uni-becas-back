const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');
const { CitasOrientacion, Usuario } = require('../models');
const { Op } = require('sequelize');

class CitasController {

  /**
   * POST /api/v1/citas/agendar
   * Crea una nueva cita de orientación
   */
  agendarCita = asyncHandler(async (req, res) => {
    const especialistaId = req.user.id;
    const { estudiante_id, fecha, hora, modalidad, motivo, notas } = req.body;

    console.log(`📅 Agendando cita para estudiante ${estudiante_id} por especialista ${especialistaId}`);

    // Verificar que el estudiante existe
    const estudiante = await Usuario.findByPk(estudiante_id);
    if (!estudiante) {
      throw new ApiError(404, 'El estudiante no existe');
    }

    // Crear la cita
    const cita = await CitasOrientacion.create({
      estudiante_id,
      especialista_id: especialistaId,
      fecha,
      hora,
      modalidad: modalidad || 'presencial',
      motivo,
      notas,
      estado: 'pendiente'
    });

    // Obtener la cita con la información del estudiante
    const citaCompleta = await CitasOrientacion.findByPk(cita.id, {
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'especialista',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    return sendSuccess(res, citaCompleta, 'Cita agendada exitosamente', 201);
  });

  /**
   * GET /api/v1/citas/mis-citas
   * Obtiene las citas del especialista autenticado
   */
  obtenerMisCitas = asyncHandler(async (req, res) => {
    const especialistaId = req.user.id;
    const { estado, fecha_desde, fecha_hasta } = req.query;

    console.log(`📋 Obteniendo citas del especialista ${especialistaId}`);

    const whereClause = {
      especialista_id: especialistaId
    };

    if (estado) {
      whereClause.estado = estado;
    }

    if (fecha_desde || fecha_hasta) {
      whereClause.fecha = {};
      if (fecha_desde) {
        whereClause.fecha[Op.gte] = fecha_desde;
      }
      if (fecha_hasta) {
        whereClause.fecha[Op.lte] = fecha_hasta;
      }
    }

    const citas = await CitasOrientacion.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['fecha', 'ASC'], ['hora', 'ASC']]
    });

    return sendSuccess(res, {
      total: citas.length,
      citas
    }, 'Citas obtenidas exitosamente');
  });

  /**
   * GET /api/v1/citas/estudiante/:estudianteId
   * Obtiene las citas de un estudiante específico
   */
  obtenerCitasEstudiante = asyncHandler(async (req, res) => {
    const { estudianteId } = req.params;

    console.log(`📋 Obteniendo citas del estudiante ${estudianteId}`);

    const citas = await CitasOrientacion.findAll({
      where: {
        estudiante_id: estudianteId
      },
      include: [
        {
          model: Usuario,
          as: 'especialista',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['fecha', 'DESC'], ['hora', 'DESC']]
    });

    return sendSuccess(res, {
      total: citas.length,
      citas
    }, 'Citas del estudiante obtenidas exitosamente');
  });

  /**
   * GET /api/v1/citas/:citaId
   * Obtiene los detalles de una cita específica
   */
  obtenerCita = asyncHandler(async (req, res) => {
    const { citaId } = req.params;

    const cita = await CitasOrientacion.findByPk(citaId, {
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'especialista',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    if (!cita) {
      throw new ApiError(404, 'Cita no encontrada');
    }

    return sendSuccess(res, cita, 'Cita obtenida exitosamente');
  });

  /**
   * PATCH /api/v1/citas/:citaId
   * Actualiza una cita existente
   */
  actualizarCita = asyncHandler(async (req, res) => {
    const { citaId } = req.params;
    const especialistaId = req.user.id;
    const datosActualizacion = req.body;

    const cita = await CitasOrientacion.findOne({
      where: {
        id: citaId,
        especialista_id: especialistaId
      }
    });

    if (!cita) {
      throw new ApiError(404, 'Cita no encontrada o no tienes permiso para modificarla');
    }

    await cita.update(datosActualizacion);

    // Obtener la cita actualizada con la información completa
    const citaActualizada = await CitasOrientacion.findByPk(citaId, {
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'especialista',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    return sendSuccess(res, citaActualizada, 'Cita actualizada exitosamente');
  });

  /**
   * DELETE /api/v1/citas/:citaId
   * Cancela (marca como cancelada) una cita
   */
  cancelarCita = asyncHandler(async (req, res) => {
    const { citaId } = req.params;
    const especialistaId = req.user.id;

    const cita = await CitasOrientacion.findOne({
      where: {
        id: citaId,
        especialista_id: especialistaId
      }
    });

    if (!cita) {
      throw new ApiError(404, 'Cita no encontrada o no tienes permiso para cancelarla');
    }

    await cita.update({
      estado: 'cancelada'
    });

    return sendSuccess(res, cita, 'Cita cancelada exitosamente');
  });

}

module.exports = new CitasController();
