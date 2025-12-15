const { Usuario, DisponibilidadHoraria, EstudianteBecario, Postulacion, Documento, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { MENSAJES_ERROR } = require('../config/constants');

class UsersService {
  /**
   * Obtener lista de usuarios con filtros opcionales
   * IMPORTANTE: Por defecto muestra todos los usuarios NO eliminados (activos e inactivos).
   * Usar el filtro 'activo' para filtrar por estado activo/inactivo.
   * Usar el filtro 'emailVerified' para filtrar por estado de aprobación.
   */
  async getAllUsers(filters = {}) {
    const { role, activo, emailVerified, limit = 20, offset = 0, search } = filters;

    const whereClause = {};

    // Filtros
    if (role) whereClause.role = role;

    // Filtro por estado activo/inactivo
    if (activo !== undefined) {
      whereClause.activo = activo === true || activo === 'true';
    }

    // Filtro por estado de aprobación (emailVerified)
    if (emailVerified !== undefined) {
      whereClause.emailVerified = emailVerified === true || emailVerified === 'true';
    }

    // Búsqueda por nombre, apellido o email
    if (search) {
      whereClause[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Por defecto, el defaultScope filtra deletedAt: null
    const { count, rows } = await Usuario.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return {
      usuarios: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtener un usuario por ID
   * IMPORTANTE: Por defecto solo devuelve usuarios NO eliminados (defaultScope)
   */
  async getUserById(userId) {
    // El defaultScope ya filtra usuarios no eliminados y excluye password
    const usuario = await Usuario.findByPk(userId, {
      include: [
        {
          model: DisponibilidadHoraria,
          as: 'disponibilidadHoraria',
          required: false // LEFT JOIN - no obligatorio
        },
        {
          model: Postulacion,
          as: 'postulaciones',
          required: false, // LEFT JOIN - no obligatorio
          include: [
            {
              model: Documento,
              as: 'documentosRelacionados',
              where: { activo: true }, // Solo documentos activos
              required: false // LEFT JOIN - no obligatorio
            }
          ]
        }
      ]
    });

    if (!usuario) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    return usuario;
  }

  /**
   * Actualizar información de un usuario
   */
  async updateUser(userId, datosActualizacion) {
    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    // Campos permitidos para actualización
    const camposPermitidos = [
      'nombre',
      'apellido',
      'telefono',
      'carnet',
      'departamento',
      'cargo',
      'carrera',
      'trimestre',
      'iaa',
      'asignaturasAprobadas'
    ];

    // Filtrar solo campos permitidos
    const datosLimpios = {};
    camposPermitidos.forEach(campo => {
      if (datosActualizacion[campo] !== undefined) {
        datosLimpios[campo] = datosActualizacion[campo];
      }
    });

    await usuario.update(datosLimpios);

    // Remover password de la respuesta
    const { password, ...usuarioSinPassword } = usuario.toJSON();
    return usuarioSinPassword;
  }

  /**
   * Cambiar rol de un usuario (solo admin)
   */
  async updateUserRole(userId, nuevoRole) {
    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    await usuario.update({ role: nuevoRole });

    const { password, ...usuarioSinPassword } = usuario.toJSON();
    return usuarioSinPassword;
  }

  /**
   * Desactivar/activar un usuario
   * Sincroniza el estado con estudiantes_becarios cuando aplique
   */
  async toggleUserStatus(userId) {
    const transaction = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(userId, { transaction });

      if (!usuario) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      const nuevoEstadoActivo = !usuario.activo;
      await usuario.update({ activo: nuevoEstadoActivo }, { transaction });

      // Cascada a EstudianteBecario si el usuario es estudiante
      if (usuario.role === 'estudiante') {
        const becario = await EstudianteBecario.findOne({
          where: { usuarioId: userId },
          transaction
        });

        if (becario) {
          if (!nuevoEstadoActivo && becario.estado === 'Activa') {
            // Desactivando usuario -> cancelar beca activa
            await becario.update({
              estado: 'Cancelada',
              motivoSuspension: 'Usuario desactivado administrativamente'
            }, { transaction });
          } else if (nuevoEstadoActivo && becario.estado === 'Cancelada' &&
                     becario.motivoSuspension === 'Usuario desactivado administrativamente') {
            // Reactivando usuario -> reactivar beca cancelada por desactivación administrativa
            await becario.update({
              estado: 'Activa',
              motivoSuspension: null
            }, { transaction });
          }
        }
      }

      await transaction.commit();

      return {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Eliminar usuario (soft delete - desactivar)
   * Establece activo=false y registra la fecha de eliminación
   */
  async deleteUser(userId) {
    // Usar scope 'all' para poder buscar usuarios incluso si ya están inactivos
    const usuario = await Usuario.scope('all').findByPk(userId);

    if (!usuario) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    // Soft delete: marcar como inactivo y registrar fecha de eliminación
    await usuario.update({
      activo: false,
      deletedAt: new Date()
    });

    return {
      message: 'Usuario eliminado exitosamente',
      id: usuario.id,
      email: usuario.email,
      deletedAt: usuario.deletedAt
    };
  }

  /**
   * Obtener estadísticas de usuarios
   * NOTA: Las estadísticas solo incluyen usuarios NO eliminados
   */
  async getUserStats() {
    const [total, activos, porRole] = await Promise.all([
      Usuario.count(), // defaultScope filtra deletedAt: null
      Usuario.count({ where: { activo: true } }),
      Usuario.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
        ],
        group: ['role']
      })
    ]);

    const estadisticasPorRole = {};
    porRole.forEach(item => {
      estadisticasPorRole[item.role] = parseInt(item.get('cantidad'));
    });

    return {
      total,
      activos,
      inactivos: total - activos,
      porRole: estadisticasPorRole
    };
  }
}

module.exports = new UsersService();
