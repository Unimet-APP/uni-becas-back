const { Postulacion, Usuario, EstudianteBecario, ProgramaBeca, sequelize } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const bcrypt = require('../utils/bcrypt');
const emailService = require('./emailService');

/**
 * Genera un período por defecto basado en el año y trimestre actual
 * Formato: "YYYY-T" donde T es el número del trimestre (1, 2, o 3)
 * - Enero a Abril: Trimestre 1
 * - Mayo a Agosto: Trimestre 2
 * - Septiembre a Diciembre: Trimestre 3
 * @returns {string} Período en formato "2025-1", "2025-2", etc.
 */
function generarPeriodoDefault() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = ahora.getMonth() + 1; // 1-12

  let trimestre;
  if (mes >= 1 && mes <= 4) {
    trimestre = 1;
  } else if (mes >= 5 && mes <= 8) {
    trimestre = 2;
  } else {
    trimestre = 3;
  }

  return `${año}-${trimestre}`;
}

class PostulacionesService {
  /**
   * Crear una nueva postulación
   */
  async createPostulacion(datosPostulacion, usuarioId = null) {
    // Si hay usuarioId, verificar que el usuario existe y está activo
    if (usuarioId) {
      const usuario = await Usuario.findByPk(usuarioId);
      if (!usuario || !usuario.activo) {
        throw ApiError.badRequest('Usuario no encontrado o inactivo');
      }
    }

    // Verificar que no exista postulación activa con la misma cédula para el mismo programa y período
    const cedulaNormalizada = datosPostulacion.cedula.toUpperCase().trim();
    const whereClause = {
      cedula: cedulaNormalizada,
      tipoBeca: datosPostulacion.tipoBeca || 'Ayudantía',
      estado: {
        [Op.in]: ['Pendiente', 'En Revisión', 'Aprobada']
      }
    };

    // Solo validar por trimestre si se proporciona
    if (datosPostulacion.trimestre) {
      whereClause.trimestre = datosPostulacion.trimestre;
    }

    const postulacionExistente = await Postulacion.findOne({
      where: whereClause
    });

    if (postulacionExistente) {
      const mensajePeriodo = postulacionExistente.trimestre
        ? `para el período ${postulacionExistente.trimestre}`
        : '';
      throw ApiError.badRequest(
        `Ya existe una postulación ${postulacionExistente.estado} para la cédula ${cedulaNormalizada} ` +
        `en el programa ${postulacionExistente.tipoBeca} ${mensajePeriodo}`.trim()
      );
    }

    // Validar IAA mínimo según tipo de postulante (solo si se proporciona IAA)
    if (datosPostulacion.iaa !== null && datosPostulacion.iaa !== undefined) {
      const iaaMinimo = datosPostulacion.tipoPostulante === 'estudiante-pregrado' ? 12 : 14;
      if (datosPostulacion.tipoPostulante !== 'estudiante-nuevo' && datosPostulacion.iaa < iaaMinimo) {
        throw ApiError.badRequest(
          `El IAA mínimo para ${datosPostulacion.tipoPostulante} es ${iaaMinimo} puntos`
        );
      }
    }

    // Validar créditos mínimos (solo si se proporcionan créditos)
    if (datosPostulacion.creditosInscritos !== null && datosPostulacion.creditosInscritos !== undefined) {
      if (datosPostulacion.creditosInscritos < 3) {
        throw ApiError.badRequest('Debe tener al menos 3 créditos inscritos para postular');
      }
    }

    const nuevaPostulacion = await Postulacion.create({
      ...datosPostulacion,
      usuarioId,
      estado: 'Pendiente'
    });

    return nuevaPostulacion;
  }

  /**
   * Listar postulaciones con filtros
   */
  async getAllPostulaciones(filters = {}, userId, userRole) {
    const { estado, programa, periodoAcademico, limit = 20, offset = 0 } = filters;

    const whereClause = {};

    // Si es estudiante, solo ver sus propias postulaciones
    if (userRole === 'estudiante') {
      whereClause.usuarioId = userId;
    }

    // Filtros
    if (estado) whereClause.estado = estado;
    if (programa) whereClause.programa = programa;
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    const { count, rows } = await Postulacion.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula'],
          required: false // LEFT OUTER JOIN para incluir postulaciones sin usuario
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return {
      postulaciones: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Obtener una postulación específica por ID
   */
  async getPostulacionById(postulacionId, userId, userRole) {
    const postulacion = await Postulacion.findByPk(postulacionId, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono'],
          required: false // LEFT OUTER JOIN para incluir postulaciones sin usuario
        }
      ]
    });

    if (!postulacion) {
      throw ApiError.notFound('Postulación no encontrada');
    }

    // Si es estudiante, solo puede ver su propia postulación
    if (userRole === 'estudiante' && postulacion.usuarioId !== userId) {
      throw ApiError.forbidden('No tienes permisos para ver esta postulación');
    }

    return postulacion;
  }

  /**
   * Aprobar una postulación (solo gestores)
   */
  async aprobarPostulacion(postulacionId, evaluadorId, observaciones) {
    const transaction = await sequelize.transaction();

    try {
      const postulacion = await Postulacion.findByPk(postulacionId, {
        transaction
      });

      if (!postulacion) {
        throw ApiError.notFound('Postulación no encontrada');
      }

      if (!['Pendiente', 'En Revisión'].includes(postulacion.estado)) {
        throw ApiError.badRequest(`No se puede aprobar una postulación en estado: ${postulacion.estado}`);
      }

      let usuarioId = postulacion.usuarioId;

      // Si la postulación NO tiene usuario asociado, crear uno automáticamente
      if (!usuarioId) {
        // Buscar si ya existe un usuario con la misma cédula o email
        const usuarioExistente = await Usuario.findOne({
          where: {
            [Op.or]: [
              { cedula: postulacion.cedula },
              { email: postulacion.email }
            ]
          },
          transaction
        });

        if (usuarioExistente) {
          // Si existe, vincular la postulación a ese usuario
          usuarioId = usuarioExistente.id;
        } else {
          // Si no existe, crear nuevo usuario con datos de la postulación
          // Extraer nombre y apellido del campo nombre
          const nombreCompleto = postulacion.nombre.trim();
          const partesNombre = nombreCompleto.split(' ');
          const nombre = partesNombre[0];
          const apellido = partesNombre.length > 1 ? partesNombre.slice(1).join(' ') : 'Apellido';

          // Generar contraseña temporal aleatoria que cumpla con validaciones
          const passwordTemporal = bcrypt.generateTemporaryPassword();
          const hashedPassword = await bcrypt.hashPassword(passwordTemporal);

          // Parsear trimestre de forma segura
          // NOTA: El campo trimestre en postulaciones puede venir como string con texto (ej: "sincurasr", "Trimestre 5")
          // Necesitamos extraer solo los números y validar que sea un valor válido antes de insertar en la DB
          // para evitar errores de PostgreSQL "invalid input syntax for type integer: NaN"
          let trimestreNumerico = null;
          if (postulacion.trimestre) {
            const numerosEnTrimestre = postulacion.trimestre.replace(/\D/g, '');
            if (numerosEnTrimestre.length > 0) {
              const parsed = parseInt(numerosEnTrimestre);
              // Validar que sea un número válido y razonable (1-99)
              if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
                trimestreNumerico = parsed;
              } else {
                console.warn(`[aprobarPostulacion] Trimestre inválido después de parsear: "${postulacion.trimestre}" -> ${parsed}`);
              }
            } else {
              console.warn(`[aprobarPostulacion] No se pudieron extraer números del trimestre: "${postulacion.trimestre}"`);
            }
          }

          // Crear usuario completamente activo y aprobado (nuevo flujo)
          const nuevoUsuario = await Usuario.create({
            email: postulacion.email,
            password: hashedPassword,
            role: 'estudiante',
            nombre,
            apellido,
            cedula: postulacion.cedula,
            telefono: postulacion.telefono || null,
            carrera: postulacion.carrera || null,
            trimestre: trimestreNumerico,
            emailVerified: true, // Usuario aprobado automáticamente
            firstLogin: true, // Debe cambiar contraseña en primer login
            activo: true
          }, { transaction });

          usuarioId = nuevoUsuario.id;

          // Guardar datos para email (se enviará después del commit)
          // NOTA: No enviar email aquí porque estamos dentro de la transacción
          postulacion._pendingEmail = {
            email: postulacion.email,
            nombre,
            tipoBeca: postulacion.tipoBeca,
            passwordTemporal
          };
        }

        // Actualizar la postulación con el usuarioId
        await postulacion.update({
          usuarioId
        }, { transaction });
      } else {
        // Si tiene usuarioId, validar que el usuario existe
        const usuario = await Usuario.findByPk(usuarioId, {
          transaction
        });

        if (!usuario) {
          throw ApiError.notFound('Usuario asociado a la postulación no encontrado');
        }
      }

      // Actualizar estado de la postulación
      await postulacion.update({
        estado: 'Aprobada',
        evaluadoPor: evaluadorId,
        observaciones,
        fechaEvaluacion: new Date()
      }, { transaction });

      // Crear registro de EstudianteBecario automáticamente
      // Buscar configuración del programa de becas para obtener porcentaje de descuento y horas requeridas
      const programaBeca = await ProgramaBeca.findOne({
        where: { nombre: postulacion.tipoBeca || 'Ayudantía', activo: true },
        transaction
      });

      // Determinar horas requeridas y descuento según programa de beca
      const horasRequeridas = programaBeca?.horasRequeridasRegular || null;
      const descuentoInicial = programaBeca?.porcentajeDescuento ? parseFloat(programaBeca.porcentajeDescuento) : 0;

      const estudianteBecario = await EstudianteBecario.create({
        usuarioId,
        postulacionId: postulacion.id,
        supervisorId: null, // Se asignará después
        tipoBeca: postulacion.tipoBeca || 'Ayudantía',
        estado: 'Activa',
        periodoInicio: postulacion.trimestre || generarPeriodoDefault(),
        periodoFin: null,
        horasRequeridas,
        horasCompletadas: 0,
        iaaActual: postulacion.iaa || null,
        plazaAsignada: null,
        fechaAsignacion: new Date(),
        fechaCulminacion: null,
        observaciones: `Beca asignada automáticamente tras aprobación de postulación`,
        descuentoAplicado: descuentoInicial,
        evaluacionSatisfactoria: null,
        fechaEvaluacion: null
      }, { transaction });

      await transaction.commit();

      // DESPUÉS del commit: Enviar email con credenciales si fue creado un nuevo usuario
      if (postulacion._pendingEmail) {
        try {
          await emailService.sendPostulacionAprobadaEmail(
            postulacion._pendingEmail.email,
            postulacion._pendingEmail.nombre,
            postulacion._pendingEmail.tipoBeca,
            postulacion._pendingEmail.passwordTemporal
          );
        } catch (emailError) {
          console.error('Error enviando email con credenciales (DB ya actualizada):', emailError.message);
          // La postulación fue aprobada exitosamente aunque el email falle
        }
      }

      return {
        postulacion,
        estudianteBecario
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rechazar una postulación (solo gestores)
   */
  async rechazarPostulacion(postulacionId, evaluadorId, motivoRechazo) {
    const transaction = await sequelize.transaction();

    try {
      const postulacion = await Postulacion.findByPk(postulacionId, {
        transaction
      });

      if (!postulacion) {
        throw ApiError.notFound('Postulación no encontrada');
      }

      if (!['Pendiente', 'En Revisión'].includes(postulacion.estado)) {
        throw ApiError.badRequest(`No se puede rechazar una postulación en estado: ${postulacion.estado}`);
      }

      await postulacion.update({
        estado: 'Rechazada',
        evaluadoPor: evaluadorId,
        observaciones: motivoRechazo,
        fechaEvaluacion: new Date()
      }, { transaction });

      // Commit PRIMERO - asegurar que la operación se guarde en DB
      await transaction.commit();

      // DESPUÉS enviar email - si falla, DB ya está actualizada (estado consistente)
      try {
        await emailService.sendPostulacionRechazadaEmail(
          postulacion.email,
          postulacion.nombre,
          postulacion.tipoBeca,
          motivoRechazo
        );
      } catch (emailError) {
        // Log del error pero no bloquear la operación (DB ya actualizada)
        console.error('Error al enviar email de postulación rechazada:', emailError.message);
        // La operación de rechazo fue exitosa aunque el email falle
      }

      return postulacion;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Cancelar una postulación (estudiante o gestor)
   */
  async cancelarPostulacion(postulacionId, userId, userRole) {
    const postulacion = await Postulacion.findByPk(postulacionId);

    if (!postulacion) {
      throw ApiError.notFound('Postulación no encontrada');
    }

    // Solo el dueño o un gestor puede cancelar
    if (userRole === 'estudiante' && postulacion.usuarioId !== userId) {
      throw ApiError.forbidden('No tienes permisos para cancelar esta postulación');
    }

    // Solo se pueden cancelar postulaciones que no han sido aprobadas o rechazadas
    if (!['Pendiente', 'En Revisión'].includes(postulacion.estado)) {
      throw ApiError.badRequest(`No se puede cancelar una postulación en estado: ${postulacion.estado}`);
    }

    // Marcar como rechazada con observación de que fue cancelada por el usuario
    await postulacion.update({
      estado: 'Rechazada',
      observaciones: 'Cancelada por el usuario',
      fechaEvaluacion: new Date()
    });

    return postulacion;
  }

  /**
   * Actualizar una postulación (solo si está pendiente)
   */
  async updatePostulacion(postulacionId, datosActualizacion, userId, userRole) {
    const postulacion = await Postulacion.findByPk(postulacionId);

    if (!postulacion) {
      throw ApiError.notFound('Postulación no encontrada');
    }

    // Solo el dueño puede actualizar su postulación
    if (userRole === 'estudiante' && postulacion.usuarioId !== userId) {
      throw ApiError.forbidden('No tienes permisos para actualizar esta postulación');
    }

    if (postulacion.estado !== 'Pendiente') {
      throw ApiError.badRequest('Solo se pueden actualizar postulaciones pendientes');
    }

    // Campos permitidos para actualización
    const camposPermitidos = [
      'nombre', 'cedula', 'email', 'telefono', 'fechaNacimiento', 'estadoCivil',
      'tipoPostulante', 'carrera', 'trimestre', 'iaa', 'promedioBachillerato',
      'asignaturasAprobadas', 'creditosInscritos', 'tipoBeca', 'documentos'
    ];

    const datosLimpios = {};

    camposPermitidos.forEach(campo => {
      if (datosActualizacion[campo] !== undefined) {
        datosLimpios[campo] = datosActualizacion[campo];
      }
    });

    // Validar IAA mínimo si se actualiza IAA o tipo de postulante (solo si se proporciona valor válido)
    if ((datosLimpios.iaa !== null && datosLimpios.iaa !== undefined) || datosLimpios.tipoPostulante) {
      const nuevoIaa = datosLimpios.iaa !== undefined ? datosLimpios.iaa : postulacion.iaa;
      const nuevoTipo = datosLimpios.tipoPostulante || postulacion.tipoPostulante;

      // Solo validar si hay un IAA válido
      if (nuevoIaa !== null && nuevoIaa !== undefined) {
        const iaaMinimo = nuevoTipo === 'estudiante-pregrado' ? 12 : 14;
        if (nuevoTipo !== 'estudiante-nuevo' && nuevoIaa < iaaMinimo) {
          throw ApiError.badRequest(
            `El IAA mínimo para ${nuevoTipo} es ${iaaMinimo} puntos`
          );
        }
      }
    }

    // Validar créditos mínimos si se actualiza (solo si se proporciona valor válido)
    if (datosLimpios.creditosInscritos !== null && datosLimpios.creditosInscritos !== undefined) {
      if (datosLimpios.creditosInscritos < 3) {
        throw ApiError.badRequest('Debe tener al menos 3 créditos inscritos para postular');
      }
    }

    await postulacion.update(datosLimpios);

    return postulacion;
  }

  /**
   * Obtener estadísticas de postulaciones
   */
  async getPostulacionesStats(filters = {}) {
    const { periodoAcademico } = filters;

    const whereClause = {};
    if (periodoAcademico) whereClause.periodoAcademico = periodoAcademico;

    const [total, porEstado, porPrograma] = await Promise.all([
      Postulacion.count({ where: whereClause }),
      Postulacion.findAll({
        where: whereClause,
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
        ],
        group: ['estado']
      }),
      Postulacion.findAll({
        where: whereClause,
        attributes: [
          'programa',
          [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
        ],
        group: ['programa']
      })
    ]);

    const estadisticasPorEstado = {};
    porEstado.forEach(item => {
      estadisticasPorEstado[item.estado] = parseInt(item.get('cantidad'));
    });

    const estadisticasPorPrograma = {};
    porPrograma.forEach(item => {
      estadisticasPorPrograma[item.programa] = parseInt(item.get('cantidad'));
    });

    return {
      total,
      porEstado: estadisticasPorEstado,
      porPrograma: estadisticasPorPrograma,
      periodoAcademico: periodoAcademico || 'Todos'
    };
  }

  /**
   * Registro directo de becario por administrador
   * Crea postulación aprobada + usuario + becario en una sola operación atómica
   */
  async registroDirectoBecario(datosPostulacion, adminId) {
    // Validaciones previas (reutilizadas de createPostulacion)
    const cedulaNormalizada = datosPostulacion.cedula.toUpperCase().trim();

    // Verificar que no exista postulación activa duplicada
    const whereClause = {
      cedula: cedulaNormalizada,
      tipoBeca: datosPostulacion.tipoBeca || 'Ayudantía',
      estado: {
        [Op.in]: ['Pendiente', 'En Revisión', 'Aprobada']
      }
    };

    if (datosPostulacion.trimestre) {
      whereClause.trimestre = datosPostulacion.trimestre;
    }

    const postulacionExistente = await Postulacion.findOne({ where: whereClause });

    if (postulacionExistente) {
      const mensajePeriodo = postulacionExistente.trimestre
        ? `para el período ${postulacionExistente.trimestre}`
        : '';
      throw ApiError.badRequest(
        `Ya existe una postulación ${postulacionExistente.estado} para la cédula ${cedulaNormalizada} ` +
        `en el programa ${postulacionExistente.tipoBeca} ${mensajePeriodo}`.trim()
      );
    }

    // Validar IAA mínimo (solo si se proporciona)
    if (datosPostulacion.iaa !== null && datosPostulacion.iaa !== undefined) {
      const iaaMinimo = datosPostulacion.tipoPostulante === 'estudiante-pregrado' ? 12 : 14;
      if (datosPostulacion.tipoPostulante !== 'estudiante-nuevo' && datosPostulacion.iaa < iaaMinimo) {
        throw ApiError.badRequest(
          `El IAA mínimo para ${datosPostulacion.tipoPostulante} es ${iaaMinimo} puntos`
        );
      }
    }

    // Validar créditos mínimos (solo si se proporcionan)
    if (datosPostulacion.creditosInscritos !== null && datosPostulacion.creditosInscritos !== undefined) {
      if (datosPostulacion.creditosInscritos < 3) {
        throw ApiError.badRequest('Debe tener al menos 3 créditos inscritos para postular');
      }
    }

    // Iniciar transacción atómica
    const transaction = await sequelize.transaction();

    try {
      let usuario = null;
      let passwordTemporal = null;

      // Buscar si ya existe usuario con esta cédula o email
      const usuarioExistente = await Usuario.findOne({
        where: {
          [Op.or]: [
            { cedula: cedulaNormalizada },
            { email: datosPostulacion.email }
          ]
        },
        transaction
      });

      if (usuarioExistente) {
        // Usuario ya existe, reutilizarlo
        usuario = usuarioExistente;
      } else {
        // Usuario no existe, crear uno nuevo
        const nombreCompleto = datosPostulacion.nombre.trim();
        const partesNombre = nombreCompleto.split(' ');
        const nombre = partesNombre[0];
        const apellido = partesNombre.length > 1 ? partesNombre.slice(1).join(' ') : 'Apellido';

        // Generar contraseña temporal
        passwordTemporal = bcrypt.generateTemporaryPassword();
        const hashedPassword = await bcrypt.hashPassword(passwordTemporal);

        // Parsear trimestre de forma segura
        let trimestreNumerico = null;
        if (datosPostulacion.trimestre) {
          const numerosEnTrimestre = datosPostulacion.trimestre.replace(/\D/g, '');
          if (numerosEnTrimestre.length > 0) {
            const parsed = parseInt(numerosEnTrimestre);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
              trimestreNumerico = parsed;
            } else {
              console.warn(`[registroDirectoBecario] Trimestre inválido: "${datosPostulacion.trimestre}" -> ${parsed}`);
            }
          } else {
            console.warn(`[registroDirectoBecario] No se pudieron extraer números del trimestre: "${datosPostulacion.trimestre}"`);
          }
        }

        // Crear usuario completamente activo y verificado (registro directo por admin)
        usuario = await Usuario.create({
          email: datosPostulacion.email,
          password: hashedPassword,
          role: 'estudiante',
          nombre,
          apellido,
          cedula: cedulaNormalizada,
          telefono: datosPostulacion.telefono || null,
          carrera: datosPostulacion.carrera || null,
          trimestre: trimestreNumerico,
          emailVerified: true, // Aprobado por admin
          firstLogin: true,    // Debe cambiar contraseña en primer login
          activo: true
        }, { transaction });
      }

      // Crear postulación directamente en estado "Aprobada"
      const postulacion = await Postulacion.create({
        ...datosPostulacion,
        cedula: cedulaNormalizada,
        usuarioId: usuario.id,
        estado: 'Aprobada',
        evaluadoPor: adminId,
        fechaEvaluacion: new Date(),
        observaciones: 'Registro directo por administrador'
      }, { transaction });

      // Crear EstudianteBecario automáticamente
      // Buscar configuración del programa de becas para obtener porcentaje de descuento y horas requeridas
      const programaBeca = await ProgramaBeca.findOne({
        where: { nombre: postulacion.tipoBeca || 'Ayudantía', activo: true },
        transaction
      });

      const horasRequeridas = programaBeca?.horasRequeridasRegular || null;
      const descuentoInicial = programaBeca?.porcentajeDescuento ? parseFloat(programaBeca.porcentajeDescuento) : 0;

      const estudianteBecario = await EstudianteBecario.create({
        usuarioId: usuario.id,
        postulacionId: postulacion.id,
        supervisorId: null, // Se asignará después
        tipoBeca: postulacion.tipoBeca || 'Ayudantía',
        estado: 'Activa',
        periodoInicio: postulacion.trimestre || generarPeriodoDefault(),
        periodoFin: null,
        horasRequeridas,
        horasCompletadas: 0,
        iaaActual: postulacion.iaa || null,
        plazaAsignada: null,
        fechaAsignacion: new Date(),
        fechaCulminacion: null,
        observaciones: 'Registro directo por administrador',
        descuentoAplicado: descuentoInicial,
        evaluacionSatisfactoria: null,
        fechaEvaluacion: null
      }, { transaction });

      // Commit de la transacción
      await transaction.commit();

      // Enviar email con credenciales DESPUÉS del commit (si se creó usuario nuevo)
      if (passwordTemporal) {
        try {
          await emailService.sendPostulacionAprobadaEmail(
            datosPostulacion.email,
            usuario.nombre,
            postulacion.tipoBeca,
            passwordTemporal
          );
        } catch (emailError) {
          console.error('Error enviando email con credenciales (DB ya actualizada):', emailError.message);
          // La operación fue exitosa aunque el email falle
        }
      }

      return {
        postulacion,
        usuario,
        estudianteBecario
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verificar si existe una postulación por email (endpoint público)
   * Retorna todas las postulaciones asociadas a ese email
   */
  async verificarPorEmail(email) {
    // Normalizar email
    const emailNormalizado = email.toLowerCase().trim();

    // Buscar todas las postulaciones con ese email
    const postulaciones = await Postulacion.findAll({
      where: { email: emailNormalizado },
      attributes: [
        'id',
        'estado',
        'fechaPostulacion',
        'tipoBeca',
        'nombre',
        'carrera',
        'trimestre'
      ],
      order: [['fechaPostulacion', 'DESC']]
    });

    // Si no hay postulaciones, lanzar error 404
    if (!postulaciones || postulaciones.length === 0) {
      throw ApiError.notFound('No se encontraron postulaciones con ese email');
    }

    return postulaciones;
  }
}

module.exports = new PostulacionesService();