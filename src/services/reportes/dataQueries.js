const { EstudianteBecario, Usuario, Plaza, ReporteActividad, Postulacion, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Servicio de Consultas SQL Optimizadas para Reportes
 *
 * Contiene todas las queries necesarias para generar reportes de:
 * - Becarios (lista completa con progreso)
 * - Plazas (disponibilidad y asignaciones)
 * - Supervisores (carga de trabajo)
 * - Actividades (estadísticas semanales)
 * - Distribuciones (por tipo de beca y postulante)
 */

class DataQueries {
  /**
   * Obtiene lista completa de becarios con progreso y asignaciones
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>}
   */
  static async getBecariosCompleto(filtros = {}) {
    const whereClause = {};

    if (filtros.estado) whereClause.estado = filtros.estado;
    if (filtros.tipoBeca) whereClause.tipoBeca = filtros.tipoBeca;
    if (filtros.periodoInicio) whereClause.periodoInicio = filtros.periodoInicio;

    const becarios = await EstudianteBecario.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'carnet', 'carrera']
        },
        {
          model: Plaza,
          as: 'plaza',
          attributes: ['id', 'nombre', 'tipoAyudantia'],
          include: [
            {
              model: Usuario,
              as: 'supervisor',
              attributes: ['id', 'nombre', 'apellido', 'email', 'departamento']
            }
          ]
        },
        {
          model: Postulacion,
          as: 'postulacion',
          attributes: ['id', 'tipoPostulante', 'iaa', 'fechaPostulacion']
        }
      ],
      order: [[sequelize.col('usuario.apellido'), 'ASC'], [sequelize.col('usuario.nombre'), 'ASC']]
    });

    // Calcular progreso y estado de riesgo
    return becarios.map(b => {
      const becario = b.toJSON();
      const porcentajeCompletado = becario.horasRequeridas > 0
        ? ((parseFloat(becario.horasCompletadas) || 0) / (parseFloat(becario.horasRequeridas) || 1) * 100).toFixed(2)
        : 0;

      // Calcular semana actual aproximada (asumiendo 12 semanas en trimestre)
      const fechaInicio = new Date(becario.periodoInicio);
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
      const semanaActual = Math.min(Math.floor(diasTranscurridos / 7) + 1, 12);
      const porcentajeEsperado = (semanaActual / 12 * 100).toFixed(2);

      const enRiesgo = parseFloat(porcentajeCompletado) < parseFloat(porcentajeEsperado) - 10; // 10% de tolerancia

      return {
        ...becario,
        porcentajeCompletado: parseFloat(porcentajeCompletado),
        semanaActual,
        porcentajeEsperado: parseFloat(porcentajeEsperado),
        horasFaltantes: (parseFloat(becario.horasRequeridas) || 0) - (parseFloat(becario.horasCompletadas) || 0),
        enRiesgo,
        estadoProgreso: enRiesgo ? 'En Riesgo' : 'Al Día'
      };
    });
  }

  /**
   * Obtiene información de plazas con disponibilidad
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>}
   */
  static async getPlazasCompleto(filtros = {}) {
    const whereClause = {};

    if (filtros.estado) whereClause.estado = filtros.estado;
    // Nota: departamento no existe en Plaza, se filtra a través del supervisor
    if (filtros.tipoAyudantia) whereClause.tipoAyudantia = filtros.tipoAyudantia;

    const plazas = await Plaza.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'supervisor',
          attributes: ['id', 'nombre', 'apellido', 'email', 'departamento']
        }
      ],
      order: [['nombre', 'ASC']]
    });

    // Obtener becarios por plaza
    const plazasConBecarios = await Promise.all(
      plazas.map(async (plaza) => {
        const becarios = await EstudianteBecario.findAll({
          where: {
            plazaAsignada: plaza.id,
            estado: 'Activa'
          },
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['nombre', 'apellido', 'email', 'carnet']
            }
          ]
        });

        const plazaData = plaza.toJSON();
        return {
          ...plazaData,
          disponibles: plazaData.capacidad - plazaData.ocupadas,
          porcentajeOcupacion: plazaData.capacidad > 0
            ? (plazaData.ocupadas / plazaData.capacidad * 100).toFixed(2)
            : 0,
          becarios: becarios.map(b => ({
            nombre: `${b.usuario.nombre} ${b.usuario.apellido}`,
            email: b.usuario.email,
            carnet: b.usuario.carnet,
            progreso: b.horasCompletadas,
            estado: b.estado
          }))
        };
      })
    );

    return plazasConBecarios;
  }

  /**
   * Obtiene información de supervisores con carga de trabajo
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>}
   */
  static async getSupervisoresCompleto(filtros = {}) {
    const whereClause = { role: 'supervisor' };

    if (filtros.departamento) whereClause.departamento = filtros.departamento;
    if (filtros.activo !== undefined) whereClause.activo = filtros.activo;

    const supervisores = await Usuario.findAll({
      where: whereClause,
      attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono', 'departamento'],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']]
    });

    // Obtener estadísticas para cada supervisor
    const supervisoresConStats = await Promise.all(
      supervisores.map(async (supervisor) => {
        // Becarios activos asignados (a través de plazas supervisadas)
        const becarios = await EstudianteBecario.findAll({
          where: {
            estado: 'Activa'
          },
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['nombre', 'apellido', 'email', 'carnet']
            },
            {
              model: Plaza,
              as: 'plaza',
              required: true,
              where: { supervisorResponsable: supervisor.id },
              attributes: ['nombre']
            }
          ]
        });

        // Plazas supervisadas
        const plazas = await Plaza.count({
          where: { supervisorResponsable: supervisor.id }
        });

        // Reportes pendientes de revisión
        const reportesPendientes = await ReporteActividad.count({
          where: {
            supervisorId: supervisor.id,
            estado: 'Pendiente'
          }
        });

        // Reportes aprobados y rechazados (estadísticas históricas)
        const reportesAprobados = await ReporteActividad.count({
          where: {
            supervisorId: supervisor.id,
            estado: 'Aprobada'
          }
        });

        const reportesRechazados = await ReporteActividad.count({
          where: {
            supervisorId: supervisor.id,
            estado: 'Rechazada'
          }
        });

        const totalReportesEvaluados = reportesAprobados + reportesRechazados;
        const tasaAprobacion = totalReportesEvaluados > 0
          ? (reportesAprobados / totalReportesEvaluados * 100).toFixed(2)
          : 0;

        // Horas totales supervisadas
        const horasTotales = becarios.reduce((sum, b) => sum + (parseFloat(b.horasCompletadas) || 0), 0);

        const supervisorData = supervisor.toJSON();
        return {
          ...supervisorData,
          estadisticas: {
            becariosActivos: becarios.length,
            plazasSupervisadas: plazas,
            horasTotalesSupervisadas: horasTotales.toFixed(2),
            reportesPendientesRevision: reportesPendientes,
            reportesAprobados,
            reportesRechazados,
            totalReportesEvaluados,
            tasaAprobacion: parseFloat(tasaAprobacion),
            capacidadDisponible: Math.max(0, 8 - becarios.length) // Asumiendo max 8 becarios por supervisor
          },
          becarios: becarios.map(b => ({
            nombre: `${b.usuario.nombre} ${b.usuario.apellido}`,
            email: b.usuario.email,
            carnet: b.usuario.carnet,
            plaza: b.plaza ? b.plaza.nombre : 'Sin plaza asignada',
            progreso: parseFloat(b.horasCompletadas) || 0,
            horasRequeridas: parseFloat(b.horasRequeridas) || 0,
            porcentaje: b.horasRequeridas > 0 ? ((parseFloat(b.horasCompletadas) || 0) / (parseFloat(b.horasRequeridas) || 1) * 100).toFixed(2) : 0,
            estado: b.estado
          }))
        };
      })
    );

    return supervisoresConStats;
  }

  /**
   * Obtiene estadísticas de reportes de actividades
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Object>}
   */
  static async getActividadesEstadisticas(filtros = {}) {
    const whereClause = {};

    if (filtros.periodo) whereClause.periodoAcademico = filtros.periodo;
    if (filtros.tipoBeca) whereClause.tipoBeca = filtros.tipoBeca;
    if (filtros.supervisorId) whereClause.supervisorId = filtros.supervisorId;

    // Conteos por estado
    const totalReportes = await ReporteActividad.count({ where: whereClause });

    const reportesAprobados = await ReporteActividad.count({
      where: { ...whereClause, estado: 'Aprobada' }
    });

    const reportesPendientes = await ReporteActividad.count({
      where: { ...whereClause, estado: 'Pendiente' }
    });

    const reportesRechazados = await ReporteActividad.count({
      where: { ...whereClause, estado: 'Rechazada' }
    });

    const reportesEnRevision = await ReporteActividad.count({
      where: { ...whereClause, estado: 'En Revisión' }
    });

    // Horas totales aprobadas
    const reportesConHoras = await ReporteActividad.findAll({
      where: { ...whereClause, estado: 'Aprobada' },
      attributes: ['horasTrabajadas']
    });

    const horasTotalesAprobadas = reportesConHoras.reduce(
      (sum, r) => sum + (parseFloat(r.horasTrabajadas) || 0),
      0
    );

    // Distribución por semana
    const reportesPorSemana = await ReporteActividad.findAll({
      where: whereClause,
      attributes: [
        'semana',
        [sequelize.fn('COUNT', sequelize.col('ReporteActividad.id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('horasTrabajadas')), 'horasTotales']
      ],
      group: ['semana'],
      order: [['semana', 'ASC']]
    });

    // Distribución por tipo de beca
    const porTipoBeca = await ReporteActividad.findAll({
      where: whereClause,
      attributes: [
        'tipoBeca',
        [sequelize.fn('COUNT', sequelize.col('ReporteActividad.id')), 'cantidad']
      ],
      group: ['tipoBeca']
    });

    // Top estudiantes por reportes aprobados
    const topEstudiantes = await ReporteActividad.findAll({
      where: { ...whereClause, estado: 'Aprobada' },
      attributes: [
        'estudianteId',
        [sequelize.fn('COUNT', sequelize.col('ReporteActividad.id')), 'reportesAprobados'],
        [sequelize.fn('SUM', sequelize.col('horasTrabajadas')), 'horasTotales']
      ],
      group: [
        'estudianteId',
        'estudiante.id',
        'estudiante.nombre',
        'estudiante.apellido',
        'estudiante.email',
        'estudiante.carnet'
      ],
      order: [[sequelize.fn('COUNT', sequelize.col('ReporteActividad.id')), 'DESC']],
      limit: 10,
      include: [
        {
          model: Usuario,
          as: 'estudiante',
          attributes: ['nombre', 'apellido', 'email', 'carnet']
        }
      ]
    });

    // Estudiantes en riesgo (con reportes rechazados o muchos pendientes)
    const estudiantesConProblemas = await sequelize.query(`
      SELECT
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.carnet,
        COUNT(CASE WHEN ra.estado = 'Rechazada' THEN 1 END) as reportes_rechazados,
        COUNT(CASE WHEN ra.estado = 'Pendiente' THEN 1 END) as reportes_pendientes,
        eb."horasCompletadas",
        eb."horasRequeridas"
      FROM reportes_actividad ra
      JOIN usuarios u ON ra."estudianteId" = u.id
      LEFT JOIN estudiantes_becarios eb ON eb."usuarioId" = u.id AND eb.estado = 'Activa'
      WHERE ${filtros.periodo ? `ra."periodoAcademico" = '${filtros.periodo}'` : '1=1'}
      GROUP BY u.id, u.nombre, u.apellido, u.email, u.carnet, eb."horasCompletadas", eb."horasRequeridas"
      HAVING COUNT(CASE WHEN ra.estado = 'Rechazada' THEN 1 END) >= 2
         OR COUNT(CASE WHEN ra.estado = 'Pendiente' THEN 1 END) >= 3
      ORDER BY COUNT(CASE WHEN ra.estado = 'Rechazada' THEN 1 END) DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const totalEvaluados = reportesAprobados + reportesRechazados;
    const tasaAprobacion = totalEvaluados > 0
      ? (reportesAprobados / totalEvaluados * 100).toFixed(2)
      : 0;

    return {
      periodo: filtros.periodo || 'Todos',
      resumen: {
        totalReportes,
        reportesAprobados,
        reportesPendientes,
        reportesRechazados,
        reportesEnRevision,
        tasaAprobacion: parseFloat(tasaAprobacion),
        horasTotalesAprobadas: horasTotalesAprobadas.toFixed(2)
      },
      distribucionPorSemana: reportesPorSemana.map(r => ({
        semana: r.semana,
        reportes: parseInt(r.get('cantidad')),
        horas: parseFloat(r.get('horasTotales') || 0).toFixed(2),
        promedio: r.get('cantidad') > 0
          ? (parseFloat(r.get('horasTotales') || 0) / parseInt(r.get('cantidad'))).toFixed(2)
          : 0
      })),
      porTipoBeca: porTipoBeca.map(r => ({
        tipoBeca: r.tipoBeca,
        cantidad: parseInt(r.get('cantidad'))
      })),
      topEstudiantes: topEstudiantes.map(r => ({
        nombre: `${r.estudiante.nombre} ${r.estudiante.apellido}`,
        email: r.estudiante.email,
        carnet: r.estudiante.carnet,
        reportesAprobados: parseInt(r.get('reportesAprobados')),
        horasTotales: parseFloat(r.get('horasTotales') || 0).toFixed(2),
        promedio: r.get('reportesAprobados') > 0
          ? (parseFloat(r.get('horasTotales') || 0) / parseInt(r.get('reportesAprobados'))).toFixed(2)
          : 0
      })),
      estudiantesEnRiesgo: estudiantesConProblemas.map(e => ({
        nombre: `${e.nombre} ${e.apellido}`,
        email: e.email,
        carnet: e.carnet,
        reportesRechazados: parseInt(e.reportes_rechazados),
        reportesPendientes: parseInt(e.reportes_pendientes),
        horasCompletadas: parseFloat(e.horasCompletadas || 0).toFixed(2),
        horasRequeridas: parseInt(e.horasRequeridas || 0),
        porcentaje: e.horasRequeridas > 0
          ? (e.horasCompletadas / e.horasRequeridas * 100).toFixed(2)
          : 0
      }))
    };
  }

  /**
   * Obtiene distribución por tipo de beca
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>}
   */
  static async getDistribucionPorBeca(filtros = {}) {
    const whereClauseBecarios = {};
    const whereClausePostulaciones = {};

    if (filtros.periodo) {
      whereClauseBecarios.periodoInicio = filtros.periodo;
      whereClausePostulaciones.trimestre = filtros.periodo;
    }

    const tiposBeca = ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración Pago', 'Formación Docente'];

    const distribucion = await Promise.all(
      tiposBeca.map(async (tipo) => {
        const beneficiariosActivos = await EstudianteBecario.count({
          where: { ...whereClauseBecarios, tipoBeca: tipo, estado: 'Activa' }
        });

        const totalPostulaciones = await Postulacion.count({
          where: { ...whereClausePostulaciones, tipoBeca: tipo }
        });

        const aprobadas = await Postulacion.count({
          where: { ...whereClausePostulaciones, tipoBeca: tipo, estado: 'Aprobada' }
        });

        const rechazadas = await Postulacion.count({
          where: { ...whereClausePostulaciones, tipoBeca: tipo, estado: 'Rechazada' }
        });

        const pendientes = await Postulacion.count({
          where: { ...whereClausePostulaciones, tipoBeca: tipo, estado: 'Pendiente' }
        });

        const tasaAprobacion = totalPostulaciones > 0
          ? ((aprobadas / totalPostulaciones) * 100).toFixed(2)
          : 0;

        return {
          tipoBeca: tipo,
          beneficiariosActivos,
          postulaciones: totalPostulaciones,
          aprobadas,
          rechazadas,
          pendientes,
          tasaAprobacion: parseFloat(tasaAprobacion)
        };
      })
    );

    return distribucion;
  }

  /**
   * Obtiene distribución por tipo de postulante
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>}
   */
  static async getDistribucionPorPostulante(filtros = {}) {
    const whereClause = {};

    if (filtros.periodo) whereClause.trimestre = filtros.periodo;
    if (filtros.tipoBeca) whereClause.tipoBeca = filtros.tipoBeca;

    const tiposPostulante = ['estudiante-pregrado', 'estudiante-postgrado', 'estudiante-nuevo'];

    const distribucion = await Promise.all(
      tiposPostulante.map(async (tipo) => {
        const totalPostulaciones = await Postulacion.count({
          where: { ...whereClause, tipoPostulante: tipo }
        });

        const aprobadas = await Postulacion.count({
          where: { ...whereClause, tipoPostulante: tipo, estado: 'Aprobada' }
        });

        const rechazadas = await Postulacion.count({
          where: { ...whereClause, tipoPostulante: tipo, estado: 'Rechazada' }
        });

        const pendientes = await Postulacion.count({
          where: { ...whereClause, tipoPostulante: tipo, estado: 'Pendiente' }
        });

        // Calcular IAA promedio para postulantes aprobados
        const postulacionesAprobadas = await Postulacion.findAll({
          where: { ...whereClause, tipoPostulante: tipo, estado: 'Aprobada' },
          attributes: ['iaa']
        });

        const iaaPromedio = postulacionesAprobadas.length > 0
          ? (postulacionesAprobadas.reduce((sum, p) => sum + (parseFloat(p.iaa) || 0), 0) / postulacionesAprobadas.length).toFixed(2)
          : 0;

        const tasaAprobacion = totalPostulaciones > 0
          ? ((aprobadas / totalPostulaciones) * 100).toFixed(2)
          : 0;

        return {
          tipoPostulante: tipo,
          postulaciones: totalPostulaciones,
          aprobadas,
          rechazadas,
          pendientes,
          tasaAprobacion: parseFloat(tasaAprobacion),
          iaaPromedio: parseFloat(iaaPromedio)
        };
      })
    );

    return distribucion.filter(d => d.postulaciones > 0); // Solo mostrar tipos con postulaciones
  }
}

module.exports = DataQueries;
