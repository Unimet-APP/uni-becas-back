const { Plaza, Usuario, EstudianteBecario, DisponibilidadHoraria, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { contarBloquesMatcheados } = require('../utils/horarioHelper');

class PlazasService {
  /**
   * Obtener lista de plazas con filtros opcionales
   */
  async getAllPlazas(filters = {}) {
    const {
      estado,
      tipoAyudantia,
      periodoAcademico,
      disponibles,
      limit = 20,
      offset = 0,
      search,
      ayudanteId
    } = filters;

    // Si se proporciona ayudanteId, filtrar solo la plaza asignada a ese ayudante
    if (ayudanteId) {
      const estudianteBecario = await EstudianteBecario.findOne({
        where: { usuarioId: ayudanteId },
        attributes: ['plazaAsignada']
      });

      // Si el ayudante no existe o no tiene plaza asignada, retornar vacío
      if (!estudianteBecario || !estudianteBecario.plazaAsignada) {
        return {
          plazas: [],
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalPages: 0
        };
      }

      // Obtener la plaza asignada
      const plaza = await Plaza.findByPk(estudianteBecario.plazaAsignada, {
        include: [
          {
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido', 'email', 'departamento'],
            required: false
          }
        ]
      });

      if (!plaza) {
        return {
          plazas: [],
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalPages: 0
        };
      }

      const plazaJSON = plaza.toJSON();
      return {
        plazas: [{
          ...plazaJSON,
          disponibilidad: this._calcularDisponibilidad(plaza),
          plazasDisponibles: plaza.plazasDisponibles()
        }],
        total: 1,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: 1
      };
    }

    const whereClause = {};

    // Filtro de estado: si no se especifica, excluir plazas inactivas por defecto
    if (estado) {
      whereClause.estado = estado;
    } else {
      whereClause.estado = { [Op.ne]: 'Inactiva' };
    }

    if (tipoAyudantia) whereClause.tipoAyudantia = tipoAyudantia;
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    // Filtrar solo plazas disponibles
    if (disponibles === 'true' || disponibles === true) {
      whereClause.estado = 'Activa';
      whereClause.ocupadas = {
        [Op.lt]: sequelize.col('capacidad')
      };
    }

    // Búsqueda por nombre de la plaza
    if (search) {
      whereClause.nombre = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Plaza.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email', 'departamento'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Calcular disponibilidad para cada plaza
    const plazasConDisponibilidad = rows.map(plaza => {
      const plazaJSON = plaza.toJSON();
      return {
        ...plazaJSON,
        disponibilidad: this._calcularDisponibilidad(plaza),
        plazasDisponibles: plaza.plazasDisponibles()
      };
    });

    return {
      plazas: plazasConDisponibilidad,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtener una plaza por ID con detalles completos
   */
  async getPlazaById(plazaId) {
    const plaza = await Plaza.findByPk(plazaId, {
      include: [
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email', 'departamento', 'cargo'],
          required: false
        },
        {
          model: EstudianteBecario,
          as: 'estudiantesAsignados',
          attributes: [
            'id',
            'usuarioId',
            'estado',
            'horasRequeridas',
            'horasCompletadas',
            'periodoInicio',
            'fechaAsignacion'
          ],
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nombre', 'apellido', 'email', 'carrera', 'trimestre']
            }
          ],
          required: false
        }
      ]
    });

    if (!plaza) {
      throw ApiError.notFound('Plaza no encontrada');
    }

    const plazaJSON = plaza.toJSON();
    return {
      ...plazaJSON,
      disponibilidad: this._calcularDisponibilidad(plaza),
      plazasDisponibles: plaza.plazasDisponibles(),
      porcentajeOcupacion: plaza.calcularPorcentajeOcupacion()
    };
  }

  /**
   * Crear nueva plaza
   */
  async createPlaza(datosPlaza) {
    const transaction = await sequelize.transaction();

    try {
      // Validar supervisor si se proporciona
      if (datosPlaza.supervisorResponsable) {
        const supervisor = await Usuario.findByPk(datosPlaza.supervisorResponsable);
        if (!supervisor) {
          throw ApiError.notFound('Supervisor no encontrado');
        }

        // Verificar que sea un rol válido para supervisor
        const rolesPermitidos = ['supervisor', 'mentor', 'admin', 'director-area'];
        if (!rolesPermitidos.includes(supervisor.role)) {
          throw ApiError.badRequest('El usuario seleccionado no tiene un rol de supervisor');
        }
      }

      // Crear plaza
      const nuevaPlaza = await Plaza.create(datosPlaza, { transaction });

      await transaction.commit();

      // Retornar plaza con relaciones
      return this.getPlazaById(nuevaPlaza.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Actualizar plaza existente
   */
  async updatePlaza(plazaId, datosActualizacion) {
    const transaction = await sequelize.transaction();

    try {
      const plaza = await Plaza.findByPk(plazaId);

      if (!plaza) {
        throw ApiError.notFound('Plaza no encontrada');
      }

      // Validar supervisor si se proporciona
      if (datosActualizacion.supervisorResponsable) {
        const supervisor = await Usuario.findByPk(datosActualizacion.supervisorResponsable);
        if (!supervisor) {
          throw ApiError.notFound('Supervisor no encontrado');
        }

        const rolesPermitidos = ['supervisor', 'mentor', 'admin', 'director-area'];
        if (!rolesPermitidos.includes(supervisor.role)) {
          throw ApiError.badRequest('El usuario seleccionado no tiene un rol de supervisor');
        }
      }

      // Validar que no se reduzca la capacidad por debajo de las plazas ocupadas
      if (datosActualizacion.capacidad && datosActualizacion.capacidad < plaza.ocupadas) {
        throw ApiError.badRequest(
          `No se puede reducir la capacidad a ${datosActualizacion.capacidad}. Hay ${plaza.ocupadas} plazas ocupadas`
        );
      }

      // Actualizar plaza
      await plaza.update(datosActualizacion, { transaction });

      await transaction.commit();

      // Retornar plaza actualizada con relaciones
      return this.getPlazaById(plaza.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Eliminar plaza (soft delete - cambiar a inactiva)
   * Desasigna automáticamente estudiantes y supervisor
   */
  async deletePlaza(plazaId) {
    const transaction = await sequelize.transaction();

    try {
      const plaza = await Plaza.findByPk(plazaId, {
        include: [
          {
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombre', 'apellido']
          }
        ],
        transaction
      });

      if (!plaza) {
        throw ApiError.notFound('Plaza no encontrada');
      }

      // Buscar todos los estudiantes asignados a esta plaza
      const estudiantesAsignados = await EstudianteBecario.findAll({
        where: { plazaAsignada: plazaId },
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre', 'apellido', 'email']
          }
        ],
        transaction
      });

      // Desasignar todos los estudiantes (poner plazaAsignada = NULL)
      const cantidadEstudiantesDesasignados = estudiantesAsignados.length;
      if (cantidadEstudiantesDesasignados > 0) {
        await EstudianteBecario.update(
          { plazaAsignada: null },
          {
            where: { plazaAsignada: plazaId },
            transaction
          }
        );
      }

      // Guardar información del supervisor antes de desasignar
      const supervisorAnterior = plaza.supervisor ? {
        id: plaza.supervisor.id,
        nombre: `${plaza.supervisor.nombre} ${plaza.supervisor.apellido}`
      } : null;

      // Desasignar supervisor y actualizar estado de la plaza
      await plaza.update({
        estado: 'Inactiva',
        supervisorResponsable: null,
        ocupadas: 0
      }, { transaction });

      await transaction.commit();

      return {
        mensaje: 'Plaza desactivada exitosamente',
        plazaId: plaza.id,
        estudiantesDesasignados: cantidadEstudiantesDesasignados,
        supervisorDesasignado: supervisorAnterior,
        detalleEstudiantes: estudiantesAsignados.map(e => ({
          id: e.id,
          nombre: e.usuario ? `${e.usuario.nombre} ${e.usuario.apellido}` : 'N/A',
          email: e.usuario ? e.usuario.email : 'N/A'
        }))
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener solo plazas disponibles (activas con cupos)
   */
  async getPlazasDisponibles(filters = {}) {
    const { tipoAyudantia, periodoAcademico } = filters;

    const whereClause = {
      estado: 'Activa',
      ocupadas: {
        [Op.lt]: sequelize.col('capacidad')
      }
    };

    if (tipoAyudantia) whereClause.tipoAyudantia = tipoAyudantia;
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    const plazas = await Plaza.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        }
      ],
      order: [['nombre', 'ASC']]
    });

    return plazas.map(plaza => {
      const plazaJSON = plaza.toJSON();
      return {
        ...plazaJSON,
        plazasDisponibles: plaza.plazasDisponibles(),
        porcentajeOcupacion: plaza.calcularPorcentajeOcupacion()
      };
    });
  }

  /**
   * Obtener ayudantes asignados a una plaza
   */
  async getAyudantesAsignados(plazaId) {
    const plaza = await Plaza.findByPk(plazaId);

    if (!plaza) {
      throw ApiError.notFound('Plaza no encontrada');
    }

    const ayudantes = await EstudianteBecario.findAll({
      where: {
        plazaAsignada: plazaId,
        estado: ['Activa', 'Suspendida'] // No incluir culminadas o canceladas
      },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono', 'carrera', 'trimestre']
        }
      ],
      order: [['fechaAsignacion', 'ASC']]
    });

    return ayudantes.map(ayudante => {
      const ayudanteJSON = ayudante.toJSON();
      return {
        ...ayudanteJSON,
        porcentajeCompletado: ayudante.calcularPorcentajeCompletado(),
        horasRestantes: ayudante.horasRestantes()
      };
    });
  }

  /**
   * Buscar becarios compatibles con el horario de una plaza
   * @param {String} plazaId - ID de la plaza
   * @param {Number} limit - Límite de resultados (default 20)
   * @param {Number} offset - Offset para paginación (default 0)
   * @returns {Object} - Becarios compatibles con detalles de matcheo
   */
  async buscarBecariosCompatibles(plazaId, limit = 20, offset = 0) {
    // 1. Obtener plaza y validar que existe
    const plaza = await Plaza.findByPk(plazaId, {
      include: [
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    if (!plaza) {
      throw ApiError.notFound('Plaza no encontrada');
    }

    if (!plaza.horario || !Array.isArray(plaza.horario) || plaza.horario.length === 0) {
      throw ApiError.badRequest('La plaza no tiene horarios configurados');
    }

    // 2. Calcular bloques totales de la plaza
    let totalBloquesPlaza = 0;
    for (const bloque of plaza.horario) {
      if (bloque.horaInicio && bloque.horaFin) {
        const [horaInicio, minInicio] = bloque.horaInicio.split(':').map(Number);
        const [horaFin, minFin] = bloque.horaFin.split(':').map(Number);
        const minutosInicio = horaInicio * 60 + minInicio;
        const minutosFin = horaFin * 60 + minFin;
        const duracionMinutos = minutosFin - minutosInicio;
        totalBloquesPlaza += Math.floor(duracionMinutos / 30);
      }
    }

    // 3. Determinar umbral: mínimo 10 bloques, o todos si la plaza tiene menos de 10
    const umbralBloques = Math.min(10, totalBloquesPlaza);

    // 4. Buscar becarios sin plaza asignada, activos, y con tipo Ayudantía
    const becariosActivos = await EstudianteBecario.findAll({
      where: {
        plazaAsignada: null,
        estado: 'Activa',
        tipoBeca: 'Ayudantía'
      },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono', 'carrera', 'trimestre']
        }
      ]
    });

    // 5. Para cada becario, obtener disponibilidad y contar bloques
    const becariosConCompatibilidad = [];

    for (const becario of becariosActivos) {
      // Obtener disponibilidad del becario
      const disponibilidad = await DisponibilidadHoraria.findOne({
        where: { usuarioId: becario.usuarioId }
      });

      if (!disponibilidad) {
        // Becario sin disponibilidad registrada - no incluir
        continue;
      }

      // Contar bloques matcheados
      try {
        const resultado = contarBloquesMatcheados(
          disponibilidad.disponibilidad,
          plaza.horario
        );

        // Solo incluir si cumple el umbral
        if (resultado.bloquesMatcheados >= umbralBloques) {
          becariosConCompatibilidad.push({
            becario: becario.toJSON(),
            bloquesMatcheados: resultado.bloquesMatcheados,
            totalBloques: resultado.totalBloques,
            porcentajeCobertura: resultado.porcentaje,
            detallesPorDia: resultado.detallesPorDia
          });
        }
      } catch (error) {
        // Si hay error al contar bloques, ignorar este becario
        console.error(`Error al procesar becario ${becario.id}:`, error.message);
        continue;
      }
    }

    // 6. Ordenar por mayor número de bloques matcheados
    becariosConCompatibilidad.sort((a, b) => b.bloquesMatcheados - a.bloquesMatcheados);

    // 7. Aplicar paginación
    const total = becariosConCompatibilidad.length;
    const becariosConCompatibilidadPaginados = becariosConCompatibilidad.slice(offset, offset + limit);

    // 8. Retornar resultado
    return {
      plaza: {
        id: plaza.id,
        nombre: plaza.nombre,
        tipoAyudantia: plaza.tipoAyudantia,
        horario: plaza.horario,
        totalBloques: totalBloquesPlaza,
        supervisor: plaza.supervisor
      },
      umbralBloques,
      becarios: becariosConCompatibilidadPaginados.map(item => ({
        id: item.becario.id,
        usuarioId: item.becario.usuarioId,
        usuario: item.becario.usuario,
        tipoBeca: item.becario.tipoBeca,
        periodoInicio: item.becario.periodoInicio,
        estado: item.becario.estado,
        bloquesMatcheados: item.bloquesMatcheados,
        totalBloques: item.totalBloques,
        porcentajeCobertura: item.porcentajeCobertura,
        detallesPorDia: item.detallesPorDia
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtener estadísticas de plazas
   */
  async getEstadisticasPlazas(filters = {}) {
    const { periodoAcademico } = filters;

    const whereClause = {};
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    // Where clause excluyendo inactivas (para estadísticas principales)
    const whereClauseActivas = {
      ...whereClause,
      estado: { [Op.ne]: 'Inactiva' }
    };

    // Total de plazas (excluyendo inactivas)
    const totalPlazas = await Plaza.count({ where: whereClauseActivas });

    // Plazas por estado (incluye todas para mostrar desglose completo)
    const porEstado = await Plaza.findAll({
      where: whereClause,
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['estado'],
      raw: true
    });

    // Plazas por tipo (solo activas y completas)
    const porTipo = await Plaza.findAll({
      where: whereClauseActivas,
      attributes: [
        'tipoAyudantia',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['tipoAyudantia'],
      raw: true
    });

    // Capacidad total y ocupación (solo activas y completas)
    const capacidadStats = await Plaza.findOne({
      where: whereClauseActivas,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('capacidad')), 'capacidadTotal'],
        [sequelize.fn('SUM', sequelize.col('ocupadas')), 'ocupadasTotal']
      ],
      raw: true
    });

    return {
      totalPlazas,
      porEstado: this._formatearGrupos(porEstado),
      porTipo: this._formatearGrupos(porTipo),
      capacidadTotal: parseInt(capacidadStats.capacidadTotal) || 0,
      ocupadasTotal: parseInt(capacidadStats.ocupadasTotal) || 0,
      disponiblesTotal: (parseInt(capacidadStats.capacidadTotal) || 0) - (parseInt(capacidadStats.ocupadasTotal) || 0),
      porcentajeOcupacionGlobal: capacidadStats.capacidadTotal > 0
        ? Math.round((capacidadStats.ocupadasTotal / capacidadStats.capacidadTotal) * 100)
        : 0
    };
  }

  /**
   * Calcular disponibilidad de una plaza
   * @private
   */
  _calcularDisponibilidad(plaza) {
    if (plaza.estado === 'Inactiva') return 'Inactiva';
    if (plaza.estado === 'Completa' || plaza.ocupadas >= plaza.capacidad) return 'Completa';
    return 'Disponible';
  }

  /**
   * Formatear resultados de agrupación
   * @private
   */
  _formatearGrupos(grupos) {
    return grupos.reduce((acc, item) => {
      const key = item.estado || item.tipoAyudantia;
      acc[key] = parseInt(item.cantidad);
      return acc;
    }, {});
  }
}

module.exports = new PlazasService();
