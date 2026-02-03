const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');
const { Notificaciones, Usuario } = require('../models');
const { Op } = require('sequelize');

class NotificacionesController {

  /**
   * GET /api/v1/notificaciones/mis-notificaciones
   * Obtiene todas las notificaciones del usuario autenticado
   */
  obtenerMisNotificaciones = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const { limite = 50, solo_no_leidas = false } = req.query;

    console.log(`📬 Obteniendo notificaciones para usuario ${usuarioId}`);

    const whereClause = {
      usuario_id: usuarioId
    };

    if (solo_no_leidas === 'true') {
      whereClause.leida = false;
    }

    const notificaciones = await Notificaciones.findAll({
      where: whereClause,
      order: [['fecha_creacion', 'DESC']],
      limit: parseInt(limite),
      attributes: [
        'id',
        'titulo',
        'contenido',
        'tipo',
        'leida',
        'fecha_lectura',
        'metadata',
        'fecha_creacion'
      ]
    });

    return sendSuccess(res, {
      total: notificaciones.length,
      no_leidas: notificaciones.filter(n => !n.leida).length,
      notificaciones
    }, 'Notificaciones obtenidas exitosamente');
  });

  /**
   * PATCH /api/v1/notificaciones/:id/marcar-leida
   * Marca una notificación como leída
   */
  marcarComoLeida = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const notificacion = await Notificaciones.findOne({
      where: {
        id,
        usuario_id: usuarioId
      }
    });

    if (!notificacion) {
      throw new ApiError(404, 'Notificación no encontrada');
    }

    if (!notificacion.leida) {
      await notificacion.update({
        leida: true,
        fecha_lectura: new Date()
      });
    }

    return sendSuccess(res, notificacion, 'Notificación marcada como leída');
  });

  /**
   * PATCH /api/v1/notificaciones/marcar-todas-leidas
   * Marca todas las notificaciones del usuario como leídas
   */
  marcarTodasComoLeidas = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const resultado = await Notificaciones.update(
      {
        leida: true,
        fecha_lectura: new Date()
      },
      {
        where: {
          usuario_id: usuarioId,
          leida: false
        }
      }
    );

    return sendSuccess(res, {
      actualizadas: resultado[0]
    }, 'Todas las notificaciones marcadas como leídas');
  });

  /**
   * POST /api/v1/notificaciones/crear
   * Crea una nueva notificación para un usuario específico o varios usuarios
   * (Solo para especialistas/coordinadores)
   */
  crearNotificacion = asyncHandler(async (req, res) => {
    const {
      destinatarios, // Array de IDs de usuarios
      titulo,
      contenido,
      tipo = 'anuncio',
      metadata = null
    } = req.body;

    if (!destinatarios || destinatarios.length === 0) {
      throw new ApiError(400, 'Debe especificar al menos un destinatario');
    }

    if (!titulo || !contenido) {
      throw new ApiError(400, 'Título y contenido son requeridos');
    }

    console.log(`📢 Creando notificaciones para ${destinatarios.length} usuarios`);

    // Crear notificaciones para cada destinatario
    const notificacionesCreadas = await Promise.all(
      destinatarios.map(usuarioId =>
        Notificaciones.create({
          usuario_id: usuarioId,
          titulo,
          contenido,
          tipo,
          metadata
        })
      )
    );

    return sendSuccess(res, {
      total: notificacionesCreadas.length,
      notificaciones: notificacionesCreadas
    }, `${notificacionesCreadas.length} notificaciones creadas exitosamente`);
  });

  /**
   * DELETE /api/v1/notificaciones/:id
   * Elimina una notificación (solo el dueño puede eliminarla)
   */
  eliminarNotificacion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const notificacion = await Notificaciones.findOne({
      where: {
        id,
        usuario_id: usuarioId
      }
    });

    if (!notificacion) {
      throw new ApiError(404, 'Notificación no encontrada');
    }

    await notificacion.destroy();

    return sendSuccess(res, null, 'Notificación eliminada exitosamente');
  });

  /**
   * GET /api/v1/notificaciones/contador-no-leidas
   * Obtiene el contador de notificaciones no leídas
   */
  contadorNoLeidas = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const contador = await Notificaciones.count({
      where: {
        usuario_id: usuarioId,
        leida: false
      }
    });

    return sendSuccess(res, { contador }, 'Contador obtenido exitosamente');
  });
}

module.exports = new NotificacionesController();
