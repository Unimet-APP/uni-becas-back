const { Usuario, EstudianteBecario, Plaza, Postulacion, Auditoria, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

class SupervisoresService {
  /**
   * Obtener todos los supervisores con sus ayudantes asignados (a través de plazas)
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Object>} - Lista de supervisores con ayudantes
   */
  async getAllSupervisoresConAyudantes(filters = {}) {
    const { activo, limit = 50, offset = 0, conAyudantes } = filters;

    const whereClause = {
      role: 'supervisor'
    };

    // Filtro por estado activo
    if (activo !== undefined) {
      whereClause.activo = activo === 'true' || activo === true;
    }

    // Normalizar conAyudantes a boolean
    const requiereAyudantes = conAyudantes === 'true' || conAyudantes === true;

    // PASO 1: Obtener el count total de supervisores
    let count;
    if (requiereAyudantes) {
      // Si solo queremos supervisores con ayudantes, necesitamos contar con el join a través de plazas
      count = await Usuario.count({
        where: whereClause,
        distinct: true,
        include: [
          {
            model: Plaza,
            as: 'plazasAsignadas',
            required: true, // INNER JOIN - solo supervisores con plazas
            where: { estado: 'Activa' },
            include: [
              {
                model: EstudianteBecario,
                as: 'estudiantesAsignados',
                required: true, // Solo plazas con estudiantes
                attributes: []
              }
            ]
          }
        ]
      });
    } else {
      // Si queremos todos los supervisores, contamos sin joins
      count = await Usuario.count({
        where: whereClause
      });
    }

    // PASO 2: Obtener los supervisores con todos sus datos y relaciones
    const rows = await Usuario.findAll({
      where: whereClause,
      attributes: {
        exclude: ['password', 'verificationCode', 'resetPasswordToken', 'resetPasswordExpires']
      },
      include: [
        {
          model: Plaza,
          as: 'plazasAsignadas',
          required: requiereAyudantes,
          where: { estado: 'Activa' },
          include: [
            {
              model: EstudianteBecario,
              as: 'estudiantesAsignados',
              required: requiereAyudantes,
              where: { estado: 'Activa' },
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['id', 'nombre', 'apellido', 'cedula', 'email', 'telefono', 'carrera', 'trimestre']
                },
                {
                  model: Postulacion,
                  as: 'postulacion',
                  attributes: ['id', 'iaa', 'creditosInscritos', 'fechaPostulacion', 'estado']
                }
              ]
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['apellido', 'ASC'],
        ['nombre', 'ASC']
      ],
      subQuery: false
    });

    // Transformar datos: aplanar estudiantes de todas las plazas
    const supervisoresConAyudantes = rows.map(supervisor => {
      const supervisorData = supervisor.toJSON();

      // Extraer todos los estudiantes de todas las plazas del supervisor
      const todosLosEstudiantes = [];
      if (supervisorData.plazasAsignadas && supervisorData.plazasAsignadas.length > 0) {
        supervisorData.plazasAsignadas.forEach(plaza => {
          if (plaza.estudiantesAsignados && plaza.estudiantesAsignados.length > 0) {
            plaza.estudiantesAsignados.forEach(estudiante => {
              // Agregar información de la plaza al estudiante
              todosLosEstudiantes.push({
                ...estudiante,
                plazaInfo: {
                  id: plaza.id,
                  nombre: plaza.nombre,
                  ubicacion: plaza.ubicacion,
                  tipoAyudantia: plaza.tipoAyudantia,
                  horasSemana: plaza.horasSemana
                }
              });
            });
          }
        });
      }

      return {
        ...supervisorData,
        estudiantesSupervisionados: todosLosEstudiantes,
        cantidadAyudantes: todosLosEstudiantes.length,
        cantidadPlazas: supervisorData.plazasAsignadas?.length || 0
      };
    });

    // Calcular estadísticas
    const totalAyudantes = supervisoresConAyudantes.reduce((acc, supervisor) => {
      return acc + (supervisor.cantidadAyudantes || 0);
    }, 0);

    return {
      supervisores: supervisoresConAyudantes,
      total: totalAyudantes,
      totalSupervisores: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      estadisticas: {
        totalSupervisores: count,
        totalAyudantes: totalAyudantes,
        promedioAyudantesPorSupervisor: count > 0 ? (totalAyudantes / count).toFixed(2) : 0
      }
    };
  }

  /**
   * Obtener ayudantes de un supervisor específico (a través de sus plazas activas)
   * @param {String} supervisorId - ID del supervisor
   * @returns {Promise<Object>} - Lista de ayudantes del supervisor
   */
  async getAyudantesDeSupervisor(supervisorId) {
    // Validar que el supervisor existe
    const supervisor = await Usuario.findByPk(supervisorId, {
      attributes: ['id', 'nombre', 'apellido', 'email', 'role', 'activo']
    });

    if (!supervisor) {
      throw ApiError.notFound('Supervisor no encontrado');
    }

    // Validar que es supervisor
    if (supervisor.role !== 'supervisor') {
      throw ApiError.badRequest('El usuario especificado no es un supervisor');
    }

    // Obtener todas las plazas del supervisor (sin filtrar por estado)
    const plazas = await Plaza.findAll({
      where: {
        supervisorResponsable: supervisorId
      },
      include: [
        {
          model: EstudianteBecario,
          as: 'estudiantesAsignados',
          required: false,
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'cedula', 'email', 'telefono', 'carrera', 'trimestre']
            },
            {
              model: Postulacion,
              as: 'postulacion',
              attributes: ['id', 'iaa', 'creditosInscritos']
            }
          ]
        }
      ]
    });

    // Aplanar estudiantes de todas las plazas
    const ayudantes = [];
    plazas.forEach(plaza => {
      if (plaza.estudiantesAsignados && plaza.estudiantesAsignados.length > 0) {
        plaza.estudiantesAsignados.forEach(estudiante => {
          const estudianteData = estudiante.toJSON();
          ayudantes.push({
            ...estudianteData,
            plazaInfo: {
              id: plaza.id,
              nombre: plaza.nombre,
              ubicacion: plaza.ubicacion,
              tipoAyudantia: plaza.tipoAyudantia
            }
          });
        });
      }
    });

    return {
      supervisor: {
        id: supervisor.id,
        nombre: supervisor.nombre,
        apellido: supervisor.apellido,
        email: supervisor.email,
        role: supervisor.role
      },
      plazas: plazas.map(p => ({
        id: p.id,
        nombre: p.nombre,
        capacidad: p.capacidad,
        ocupadas: p.ocupadas
      })),
      ayudantes,
      total: ayudantes.length
    };
  }

  /**
   * Obtener la plaza activa de un supervisor en un período específico
   * @param {String} supervisorId - ID del supervisor
   * @param {String} periodoAcademico - Período académico (ej: "2025-1")
   * @returns {Promise<Plaza|null>} - Plaza activa o null
   */
  async getPlazaActivaDelSupervisor(supervisorId, periodoAcademico) {
    const plaza = await Plaza.findOne({
      where: {
        supervisorResponsable: supervisorId,
        periodoAcademico,
        estado: 'Activa'
      },
      include: [
        {
          model: EstudianteBecario,
          as: 'estudiantesAsignados',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'cedula', 'email']
            }
          ]
        }
      ]
    });

    return plaza;
  }

  /**
   * Obtener lista ligera de supervisores (sin relaciones)
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Object>} - Lista de supervisores sin ayudantes
   */
  async getAllSupervisores(filters = {}) {
    const { activo, departamento, limit = 50, offset = 0 } = filters;

    const whereClause = {
      role: 'supervisor'
    };

    // Filtro por estado activo
    if (activo !== undefined) {
      whereClause.activo = activo === 'true' || activo === true;
    }

    // Filtro por departamento
    if (departamento) {
      whereClause.departamento = departamento;
    }

    // Consulta ligera sin relaciones
    const { count, rows } = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ['password', 'verificationCode', 'resetPasswordToken', 'resetPasswordExpires']
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['apellido', 'ASC'],
        ['nombre', 'ASC']
      ]
    });

    return {
      supervisores: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / parseInt(limit))
    };
  }

  /**
   * Obtener supervisor por ID con todas las relaciones y estadísticas
   * @param {String} supervisorId - ID del supervisor
   * @returns {Promise<Object>} - Supervisor con ayudantes y estadísticas
   */
  async getSupervisorById(supervisorId) {
    // Validar que el supervisor existe
    const supervisor = await Usuario.findByPk(supervisorId, {
      attributes: {
        exclude: ['password', 'verificationCode', 'resetPasswordToken', 'resetPasswordExpires']
      },
      include: [
        {
          model: Plaza,
          as: 'plazasAsignadas',
          required: false,
          include: [
            {
              model: EstudianteBecario,
              as: 'estudiantesAsignados',
              required: false,
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['id', 'nombre', 'apellido', 'cedula', 'email', 'telefono', 'carrera', 'trimestre']
                },
                {
                  model: Postulacion,
                  as: 'postulacion',
                  attributes: ['id', 'iaa', 'creditosInscritos', 'fechaPostulacion', 'estado'],
                  required: false
                }
              ]
            }
          ]
        }
      ]
    });

    if (!supervisor) {
      throw ApiError.notFound('Supervisor no encontrado');
    }

    // Validar que es supervisor
    if (supervisor.role !== 'supervisor') {
      throw ApiError.badRequest('El usuario especificado no es un supervisor');
    }

    // Extraer todos los ayudantes de todas las plazas
    const ayudantes = [];
    if (supervisor.plazasAsignadas && supervisor.plazasAsignadas.length > 0) {
      supervisor.plazasAsignadas.forEach(plaza => {
        if (plaza.estudiantesAsignados && plaza.estudiantesAsignados.length > 0) {
          ayudantes.push(...plaza.estudiantesAsignados);
        }
      });
    }

    // Calcular estadísticas
    const ayudantesActivos = ayudantes.filter(a => a.estado === 'Activa').length;
    const totalHorasCompletadas = ayudantes
      .filter(a => a.tipoBeca === 'Ayudantía')
      .reduce((sum, a) => sum + parseFloat(a.horasCompletadas || 0), 0);
    const totalHorasRequeridas = ayudantes
      .filter(a => a.tipoBeca === 'Ayudantía')
      .reduce((sum, a) => sum + parseFloat(a.horasRequeridas || 0), 0);

    const supervisorData = supervisor.toJSON();

    return {
      ...supervisorData,
      estudiantesSupervisionados: ayudantes,
      estadisticas: {
        totalPlazas: supervisorData.plazasAsignadas?.length || 0,
        plazasActivas: supervisorData.plazasAsignadas?.filter(p => p.estado === 'Activa').length || 0,
        totalAyudantes: ayudantes.length,
        ayudantesActivos,
        ayudantesSuspendidos: ayudantes.filter(a => a.estado === 'Suspendida').length,
        ayudantesCulminados: ayudantes.filter(a => a.estado === 'Culminada').length,
        totalHorasCompletadas: parseFloat(totalHorasCompletadas.toFixed(2)),
        totalHorasRequeridas,
        porcentajeProgresoHoras: totalHorasRequeridas > 0
          ? parseFloat(((totalHorasCompletadas / totalHorasRequeridas) * 100).toFixed(2))
          : 0
      }
    };
  }

  /**
   * Actualizar información de un supervisor
   * @param {String} supervisorId - ID del supervisor
   * @param {Object} updateData - Datos a actualizar
   * @param {String} adminId - ID del admin que realiza la actualización
   * @returns {Promise<Object>} - Supervisor actualizado
   */
  async updateSupervisor(supervisorId, updateData, adminId) {
    const transaction = await sequelize.transaction();

    try {
      // Buscar el supervisor
      const supervisor = await Usuario.findByPk(supervisorId, { transaction });

      if (!supervisor) {
        await transaction.rollback();
        throw ApiError.notFound('Supervisor no encontrado');
      }

      // Validar que es supervisor
      if (supervisor.role !== 'supervisor') {
        await transaction.rollback();
        throw ApiError.badRequest('El usuario especificado no es un supervisor');
      }

      // Validar email UNIMET si se proporciona
      if (updateData.email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@unimet\.edu\.ve$/;
        if (!emailRegex.test(updateData.email)) {
          await transaction.rollback();
          throw ApiError.badRequest('El email debe ser del dominio @unimet.edu.ve');
        }

        // Verificar que el email no esté en uso por otro usuario
        const emailExistente = await Usuario.findOne({
          where: {
            email: updateData.email,
            id: { [Op.ne]: supervisorId }
          },
          transaction
        });

        if (emailExistente) {
          await transaction.rollback();
          throw ApiError.badRequest('El email ya está en uso por otro usuario');
        }
      }

      // Guardar datos anteriores para auditoría
      const datosAnteriores = {
        nombre: supervisor.nombre,
        apellido: supervisor.apellido,
        email: supervisor.email,
        departamento: supervisor.departamento,
        cargo: supervisor.cargo,
        telefono: supervisor.telefono
      };

      // Actualizar el supervisor
      await supervisor.update(updateData, { transaction });

      // Crear registro de auditoría
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
        entidad: 'Usuario',
        entidadId: supervisor.id,
        descripcion: `Actualización de supervisor: ${supervisor.nombre} ${supervisor.apellido}`,
        metadatos: {
          supervisorId: supervisor.id,
          supervisorNombre: `${supervisor.nombre} ${supervisor.apellido}`,
          cambios,
          fecha: new Date()
        }
      }, { transaction });

      await transaction.commit();

      // Retornar supervisor actualizado sin datos sensibles
      const supervisorActualizado = await Usuario.findByPk(supervisorId, {
        attributes: {
          exclude: ['password', 'verificationCode', 'resetPasswordToken', 'resetPasswordExpires']
        }
      });

      return supervisorActualizado;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Desactivar un supervisor (borrado lógico)
   * NOTA: Si el supervisor tiene plazas activas con estudiantes, se marca como inactivo
   * pero las plazas permanecen activas hasta el final del período
   * @param {String} supervisorId - ID del supervisor
   * @param {String} adminId - ID del admin que realiza la operación
   * @returns {Promise<Object>} - Supervisor desactivado
   */
  async deleteSupervisor(supervisorId, adminId) {
    const transaction = await sequelize.transaction();

    try {
      // Buscar el supervisor con sus plazas activas
      const supervisor = await Usuario.findByPk(supervisorId, {
        include: [
          {
            model: Plaza,
            as: 'plazasAsignadas',
            where: { estado: 'Activa' },
            required: false,
            include: [
              {
                model: EstudianteBecario,
                as: 'estudiantesAsignados',
                where: { estado: 'Activa' },
                required: false
              }
            ]
          }
        ],
        transaction
      });

      if (!supervisor) {
        await transaction.rollback();
        throw ApiError.notFound('Supervisor no encontrado');
      }

      // Validar que es supervisor
      if (supervisor.role !== 'supervisor') {
        await transaction.rollback();
        throw ApiError.badRequest('El usuario especificado no es un supervisor');
      }

      // Contar plazas y estudiantes activos
      const plazasActivas = supervisor.plazasAsignadas || [];
      let totalEstudiantesActivos = 0;
      plazasActivas.forEach(plaza => {
        totalEstudiantesActivos += plaza.estudiantesAsignados?.length || 0;
      });

      let mensaje = '';
      if (totalEstudiantesActivos > 0) {
        mensaje = `ADVERTENCIA: El supervisor tiene ${totalEstudiantesActivos} estudiante(s) activo(s) en ${plazasActivas.length} plaza(s). ` +
                  `Las plazas permanecerán activas hasta el final del período académico.`;
      }

      // Desactivar el supervisor (borrado lógico)
      await supervisor.update({ activo: false }, { transaction });

      // Crear registro de auditoría
      await Auditoria.create({
        usuarioId: adminId,
        accion: 'DELETE',
        entidad: 'Usuario',
        entidadId: supervisor.id,
        descripcion: `Desactivación de supervisor: ${supervisor.nombre} ${supervisor.apellido}`,
        metadatos: {
          supervisorId: supervisor.id,
          supervisorNombre: `${supervisor.nombre} ${supervisor.apellido}`,
          plazasActivas: plazasActivas.length,
          estudiantesActivos: totalEstudiantesActivos,
          fecha: new Date()
        }
      }, { transaction });

      await transaction.commit();

      // Retornar supervisor desactivado
      const supervisorDesactivado = await Usuario.findByPk(supervisorId, {
        attributes: {
          exclude: ['password', 'verificationCode', 'resetPasswordToken', 'resetPasswordExpires']
        }
      });

      return {
        supervisor: supervisorDesactivado,
        plazasActivas: plazasActivas.length,
        estudiantesActivos: totalEstudiantesActivos,
        mensaje
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new SupervisoresService();
