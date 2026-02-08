const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');
const { CitasOrientacion, Usuario } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const emailService = require('../services/emailService');

class CitasController {

  /**
   * Genera un token único para confirmación de citas
   */
  generarTokenConfirmacion() {
    return crypto.randomBytes(32).toString('hex');
  }

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

    // Obtener información del especialista
    const especialista = await Usuario.findByPk(especialistaId);

    // Generar token de confirmación
    const tokenConfirmacion = this.generarTokenConfirmacion();

    // Crear la cita
    const cita = await CitasOrientacion.create({
      estudiante_id,
      especialista_id: especialistaId,
      fecha,
      hora,
      modalidad: modalidad || 'presencial',
      motivo,
      notas,
      estado: 'pendiente',
      token_confirmacion: tokenConfirmacion
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

    // Enviar email de notificación al estudiante
    try {
      await emailService.sendCitaAgendadaEmail({
        email: estudiante.email,
        nombreEstudiante: `${estudiante.nombre} ${estudiante.apellido || ''}`.trim(),
        nombreEspecialista: `${especialista.nombre} ${especialista.apellido || ''}`.trim(),
        fecha,
        hora,
        modalidad: modalidad || 'presencial',
        motivo,
        citaId: cita.id,
        tokenConfirmacion
      });
      console.log(`📧 Email de cita enviado a ${estudiante.email}`);
    } catch (emailError) {
      console.error('Error al enviar email de cita:', emailError);
      // No bloquear la creación de la cita si falla el email
    }

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

  /**
   * GET /api/v1/citas/confirmar/:citaId
   * Confirma una cita usando el token (ruta pública)
   */
  confirmarCitaPorToken = asyncHandler(async (req, res) => {
    const { citaId } = req.params;
    const { token } = req.query;

    if (!token) {
      throw new ApiError(400, 'Token de confirmación requerido');
    }

    const cita = await CitasOrientacion.findOne({
      where: {
        id: citaId,
        token_confirmacion: token
      },
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
      throw new ApiError(404, 'Cita no encontrada o token inválido');
    }

    if (cita.estado === 'cancelada') {
      throw new ApiError(400, 'Esta cita ya fue cancelada');
    }

    if (cita.estado === 'completada') {
      throw new ApiError(400, 'Esta cita ya fue completada');
    }

    if (cita.estado === 'confirmada') {
      return sendSuccess(res, cita, 'Esta cita ya está confirmada');
    }

    await cita.update({ estado: 'confirmada' });

    return sendSuccess(res, {
      ...cita.toJSON(),
      estado: 'confirmada'
    }, '¡Cita confirmada exitosamente! Te esperamos en la fecha y hora indicadas.');
  });

  /**
   * GET /api/v1/citas/cancelar-por-token/:citaId
   * Cancela una cita usando el token (ruta pública)
   */
  cancelarCitaPorToken = asyncHandler(async (req, res) => {
    const { citaId } = req.params;
    const { token } = req.query;

    if (!token) {
      throw new ApiError(400, 'Token de confirmación requerido');
    }

    const cita = await CitasOrientacion.findOne({
      where: {
        id: citaId,
        token_confirmacion: token
      },
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
      throw new ApiError(404, 'Cita no encontrada o token inválido');
    }

    if (cita.estado === 'cancelada') {
      return sendSuccess(res, cita, 'Esta cita ya está cancelada');
    }

    if (cita.estado === 'completada') {
      throw new ApiError(400, 'No se puede cancelar una cita ya completada');
    }

    await cita.update({ estado: 'cancelada' });

    return sendSuccess(res, {
      ...cita.toJSON(),
      estado: 'cancelada'
    }, 'Cita cancelada exitosamente. El especialista será notificado.');
  });

}

module.exports = new CitasController();
