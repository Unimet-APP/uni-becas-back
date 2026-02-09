const { EstudianteBecario, Plaza, Usuario, Postulacion, ReporteActividad, SesionesTestOrientacion, ResultadosOrientacion } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Servicio para obtener KPIs del dashboard administrativo
 */
class DashboardService {
  /**
   * Obtiene todos los KPIs del dashboard
   * @param {string|null} periodoAcademico - Período académico opcional (formato: "2025-1")
   * @returns {Promise<Object>} Objeto con todos los KPIs organizados por categoría
   */
  async getKPIs(periodoAcademico = null) {
    try {
      // Construir filtros base según período académico
      const filtrosPeriodo = periodoAcademico
        ? { periodoInicio: periodoAcademico }
        : {};

      const filtrosPeriodoPostulacion = periodoAcademico
        ? { trimestre: periodoAcademico }
        : {};

      const filtrosPeriodoReporte = periodoAcademico
        ? { periodoAcademico: periodoAcademico }
        : {};

      // ============================================
      // KPIs de BECARIOS
      // ============================================

      // 1. Total de estudiantes becarios (Activa, Suspendida, Culminada)
      const totalBecarios = await EstudianteBecario.count({
        where: {
          ...filtrosPeriodo,
          estado: {
            [Op.in]: ['Activa', 'Suspendida', 'Culminada']
          }
        }
      });

      // 2. Becarios por tipo de beca (solo Activa)
      const becariosPorTipo = await EstudianteBecario.findAll({
        where: {
          ...filtrosPeriodo,
          estado: 'Activa'
        },
        attributes: [
          'tipoBeca',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'cantidad']
        ],
        group: ['tipoBeca'],
        raw: true
      });

      // Convertir array a objeto para respuesta más limpia
      const becariosPorTipoObj = becariosPorTipo.reduce((acc, item) => {
        acc[item.tipoBeca] = parseInt(item.cantidad);
        return acc;
      }, {});

      // Asegurar que todos los tipos de beca aparezcan (con 0 si no hay)
      const tiposBeca = ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'];
      tiposBeca.forEach(tipo => {
        if (!becariosPorTipoObj[tipo]) {
          becariosPorTipoObj[tipo] = 0;
        }
      });

      // 7. Becarios ayudantes sin plaza asignada (Ayudantía + Activa + sin plaza)
      const becariosAyudantesSinPlaza = await EstudianteBecario.count({
        where: {
          ...filtrosPeriodo,
          tipoBeca: 'Ayudantía',
          estado: 'Activa',
          plazaAsignada: null
        }
      });

      // ============================================
      // KPIs de PLAZAS
      // ============================================

      const filtrosPlazaPeriodo = periodoAcademico
        ? { periodoAcademico: periodoAcademico }
        : {};

      // 3. Plazas activas
      const plazasActivas = await Plaza.count({
        where: {
          ...filtrosPlazaPeriodo,
          estado: 'Activa'
        }
      });

      // 4. Plazas inactivas
      const plazasInactivas = await Plaza.count({
        where: {
          ...filtrosPlazaPeriodo,
          estado: 'Inactiva'
        }
      });

      // 8. Plazas con capacidad disponible (ocupadas < capacidad y estado Activa)
      const plazasConCapacidad = await Plaza.count({
        where: {
          ...filtrosPlazaPeriodo,
          estado: 'Activa',
          [Op.and]: [
            require('sequelize').where(
              require('sequelize').col('ocupadas'),
              Op.lt,
              require('sequelize').col('capacidad')
            )
          ]
        }
      });

      // ============================================
      // KPIs de USUARIOS
      // ============================================

      // 5. Total de supervisores activos
      const totalSupervisores = await Usuario.count({
        where: {
          role: 'supervisor',
          activo: true
        }
      });

      // 6. Total de usuarios registrados (activos)
      const totalUsuarios = await Usuario.count({
        where: {
          activo: true
        }
      });

      // ============================================
      // KPIs de OPERACIONES
      // ============================================

      // 9. Postulaciones pendientes (Pendiente + En Revisión)
      const postulacionesPendientes = await Postulacion.count({
        where: {
          ...filtrosPeriodoPostulacion,
          estado: {
            [Op.in]: ['Pendiente', 'En Revisión']
          }
        }
      });

      // 10. Reportes de actividad pendientes (Pendiente + En Revisión)
      const reportesPendientes = await ReporteActividad.count({
        where: {
          ...filtrosPeriodoReporte,
          estado: {
            [Op.in]: ['Pendiente', 'En Revisión']
          }
        }
      });

      // ============================================
      // CONSTRUIR RESPUESTA
      // ============================================

      return {
        becarios: {
          total: totalBecarios,
          porTipoBeca: becariosPorTipoObj,
          sinPlaza: becariosAyudantesSinPlaza
        },
        plazas: {
          activas: plazasActivas,
          inactivas: plazasInactivas,
          conCapacidad: plazasConCapacidad
        },
        usuarios: {
          total: totalUsuarios,
          supervisores: totalSupervisores
        },
        operaciones: {
          postulacionesPendientes: postulacionesPendientes,
          reportesPendientes: reportesPendientes
        }
      };
    } catch (error) {
      logger.error('Error obteniendo KPIs del dashboard:', error);
      throw error;
    }
  }

  /**
   * Obtiene KPIs generales del dashboard (becas + orientación vocacional + usuarios)
   * @param {string|null} periodoAcademico - Período académico opcional
   * @returns {Promise<Object>} Objeto con todos los KPIs organizados por categoría
   */
  async getKPIsGeneral(periodoAcademico = null) {
    try {
      // 1. Reutilizar KPIs de becas existentes
      const kpisBecas = await this.getKPIs(periodoAcademico);

      // 2. MÉTRICAS DE ORIENTACIÓN VOCACIONAL

      // Tests completados
      const testsCompletados = await SesionesTestOrientacion.count({
        where: { estado: 'finalizada' }
      });

      // Usuarios únicos que hicieron tests
      const usuariosConTests = await SesionesTestOrientacion.count({
        distinct: true,
        col: 'usuario_id'
      });

      // Tests en progreso
      const testsEnProgreso = await SesionesTestOrientacion.count({
        where: {
          estado: { [Op.in]: ['iniciada', 'ronda_1_completada', 'ronda_2_completada'] }
        }
      });

      // Tests abandonados
      const testsAbandonados = await SesionesTestOrientacion.count({
        where: { estado: 'abandonada' }
      });

      // Perfiles vocacionales dominantes (top 6)
      const perfilesDominantes = await ResultadosOrientacion.findAll({
        attributes: [
          'perfil_dominante',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'cantidad']
        ],
        group: ['perfil_dominante'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
        limit: 6,
        raw: true
      });

      const perfilesPorTipo = perfilesDominantes.reduce((acc, item) => {
        if (item.perfil_dominante) {
          acc[item.perfil_dominante] = parseInt(item.cantidad);
        }
        return acc;
      }, {});

      // Tasa de completitud
      const totalTestsIniciados = await SesionesTestOrientacion.count();
      const tasaCompletitud = totalTestsIniciados > 0
        ? ((testsCompletados / totalTestsIniciados) * 100).toFixed(1)
        : '0.0';

      // Tests por tipo (Holland vs ICO)
      const testsPorTipo = await SesionesTestOrientacion.findAll({
        where: { estado: 'finalizada' },
        attributes: [
          'tipo_test',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'cantidad']
        ],
        group: ['tipo_test'],
        raw: true
      });

      const testsPorTipoObj = testsPorTipo.reduce((acc, item) => {
        acc[item.tipo_test] = parseInt(item.cantidad);
        return acc;
      }, { Holland_RIASEC: 0, ICO: 0, Kuder: 0 });

      // 3. MÉTRICAS DE USUARIOS Y TRANSICIONES

      // Aspirantes activos
      const totalAspirantes = await Usuario.count({
        where: { role: 'aspirante', activo: true }
      });

      // Estudiantes activos
      const totalEstudiantes = await Usuario.count({
        where: { role: 'estudiante', activo: true }
      });

      // Estudiantes con becas activas
      const estudiantesConBeca = await EstudianteBecario.count({
        distinct: true,
        col: 'usuarioId',
        where: { estado: 'Activa' }
      });

      // Aspirantes pendientes de verificación
      const aspirantesPendientes = await Usuario.count({
        where: { role: 'aspirante', emailVerified: false, activo: true }
      });

      // Aspirantes convertidos a estudiantes
      const aspirantesConvertidos = await Usuario.count({
        where: { fueAspirante: true, activo: true }
      });

      // Postulaciones aprobadas (filtradas por período si aplica)
      const filtrosPeriodoPostulacion = periodoAcademico ? { trimestre: periodoAcademico } : {};
      const postulacionesAprobadas = await Postulacion.count({
        where: { ...filtrosPeriodoPostulacion, estado: 'Aprobada' }
      });

      // Tasa de aprobación de postulaciones
      const totalPostulaciones = await Postulacion.count({
        where: filtrosPeriodoPostulacion
      });
      const tasaAprobacion = totalPostulaciones > 0
        ? ((postulacionesAprobadas / totalPostulaciones) * 100).toFixed(1)
        : '0.0';

      // 4. CONSTRUIR RESPUESTA INTEGRADA
      return {
        becas: {
          totalBecarios: kpisBecas.becarios.total,
          porTipoBeca: kpisBecas.becarios.porTipoBeca,
          sinPlaza: kpisBecas.becarios.sinPlaza,
          plazasActivas: kpisBecas.plazas.activas,
          plazasInactivas: kpisBecas.plazas.inactivas,
          plazasConCapacidad: kpisBecas.plazas.conCapacidad,
          postulacionesPendientes: kpisBecas.operaciones.postulacionesPendientes,
          reportesPendientes: kpisBecas.operaciones.reportesPendientes
        },
        orientacionVocacional: {
          testsCompletados,
          usuariosConTests,
          testsEnProgreso,
          testsAbandonados,
          tasaCompletitud: parseFloat(tasaCompletitud),
          perfilesDominantes: perfilesPorTipo,
          testsPorTipo: testsPorTipoObj
        },
        usuarios: {
          totalUsuarios: kpisBecas.usuarios.total,
          totalSupervisores: kpisBecas.usuarios.supervisores,
          totalAspirantes,
          totalEstudiantes,
          estudiantesConBeca,
          aspirantesPendientes,
          aspirantesConvertidos,
          postulacionesAprobadas,
          tasaAprobacion: parseFloat(tasaAprobacion)
        }
      };
    } catch (error) {
      logger.error('Error obteniendo KPIs generales del dashboard:', error);
      throw error;
    }
  }
}

module.exports = new DashboardService();
