const { DisponibilidadHoraria, Usuario } = require('../models');
const ApiError = require('../utils/ApiError');
const { MENSAJES_ERROR } = require('../config/constants');

class DisponibilidadService {
  /**
   * Crear o actualizar disponibilidad horaria de un usuario
   * @param {string} usuarioId - ID del usuario
   * @param {object} disponibilidad - Objeto con la disponibilidad semanal
   * @returns {Promise<DisponibilidadHoraria>}
   */
  async createOrUpdateDisponibilidad(usuarioId, disponibilidad) {
    // Validar que el usuario exista
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      throw ApiError.notFound(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    // Validar que el usuario sea estudiante
    if (usuario.role !== 'estudiante') {
      throw ApiError.badRequest('Solo los estudiantes pueden tener disponibilidad horaria');
    }

    // Validar que el usuario esté activo
    if (!usuario.activo) {
      throw ApiError.forbidden('El usuario debe estar activo para gestionar su disponibilidad');
    }

    // Buscar disponibilidad existente
    const disponibilidadExistente = await DisponibilidadHoraria.findOne({
      where: { usuarioId }
    });

    let resultado;

    if (disponibilidadExistente) {
      // Actualizar disponibilidad existente
      await disponibilidadExistente.update({ disponibilidad });
      resultado = disponibilidadExistente;
    } else {
      // Crear nueva disponibilidad
      resultado = await DisponibilidadHoraria.create({
        usuarioId,
        disponibilidad
      });
    }

    return resultado;
  }

  /**
   * Obtener disponibilidad horaria de un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<DisponibilidadHoraria|null>}
   */
  async getDisponibilidadByUsuarioId(usuarioId) {
    const disponibilidad = await DisponibilidadHoraria.findOne({
      where: { usuarioId },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'nombre', 'apellido', 'role', 'carrera', 'trimestre']
        }
      ]
    });

    if (!disponibilidad) {
      throw ApiError.notFound('No se encontró disponibilidad horaria para este usuario');
    }

    return disponibilidad;
  }

  /**
   * Obtener todas las disponibilidades (solo para admin/supervisores)
   * @param {object} filters - Filtros opcionales
   * @returns {Promise<object>}
   */
  async getAllDisponibilidades(filters = {}) {
    const { limit = 20, offset = 0 } = filters;

    const { count, rows } = await DisponibilidadHoraria.findAndCountAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'nombre', 'apellido', 'role', 'carrera', 'trimestre'],
          where: { activo: true }
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']]
    });

    return {
      disponibilidades: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Eliminar disponibilidad horaria de un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<object>}
   */
  async deleteDisponibilidad(usuarioId) {
    const disponibilidad = await DisponibilidadHoraria.findOne({
      where: { usuarioId }
    });

    if (!disponibilidad) {
      throw ApiError.notFound('No se encontró disponibilidad horaria para este usuario');
    }

    await disponibilidad.destroy();

    return { message: 'Disponibilidad horaria eliminada exitosamente' };
  }

  /**
   * Obtener estadísticas de disponibilidad
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<object>}
   */
  async getEstadisticasDisponibilidad(usuarioId) {
    const disponibilidad = await this.getDisponibilidadByUsuarioId(usuarioId);

    const stats = {
      totalBloques: disponibilidad.getTotalBloques(),
      totalHoras: disponibilidad.getTotalHoras(),
      bloquesPorDia: {}
    };

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    for (const dia of dias) {
      const bloques = disponibilidad.getDisponibilidadPorDia(dia);
      stats.bloquesPorDia[dia] = {
        bloques: bloques.length,
        horas: bloques.length * 0.5,
        horarios: bloques
      };
    }

    return stats;
  }

  /**
   * Verificar si un usuario tiene disponibilidad en un día y hora específicos
   * @param {string} usuarioId - ID del usuario
   * @param {string} dia - Día de la semana
   * @param {string} hora - Hora en formato HH:MM
   * @returns {Promise<boolean>}
   */
  async tieneDisponibilidad(usuarioId, dia, hora) {
    const disponibilidad = await DisponibilidadHoraria.findOne({
      where: { usuarioId }
    });

    if (!disponibilidad) {
      return false;
    }

    const horasDelDia = disponibilidad.getDisponibilidadPorDia(dia);
    return horasDelDia.includes(hora);
  }

  /**
   * Obtener estudiantes disponibles en un día y hora específicos
   * @param {string} dia - Día de la semana
   * @param {string} hora - Hora en formato HH:MM
   * @returns {Promise<Array>}
   */
  async getAyudantesDisponibles(dia, hora) {
    // Validar día
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    if (!diasValidos.includes(dia.toLowerCase())) {
      throw ApiError.badRequest(`Día inválido: ${dia}`);
    }

    // Validar hora
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      throw ApiError.badRequest('Formato de hora inválido. Use HH:MM');
    }

    // Buscar todas las disponibilidades que contengan ese día y hora
    const disponibilidades = await DisponibilidadHoraria.findAll({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'nombre', 'apellido', 'carrera', 'trimestre'],
          where: { activo: true, role: 'estudiante' }
        }
      ]
    });

    // Filtrar por día y hora específicos
    const estudiantesDisponibles = disponibilidades
      .filter(disp => {
        const horasDelDia = disp.disponibilidad[dia.toLowerCase()] || [];
        return horasDelDia.includes(hora);
      })
      .map(disp => ({
        ...disp.usuario.toJSON(),
        disponibilidadId: disp.id
      }));

    return estudiantesDisponibles;
  }
}

module.exports = new DisponibilidadService();
