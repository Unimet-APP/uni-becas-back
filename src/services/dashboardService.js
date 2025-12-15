const { EstudianteBecario, Plaza, Usuario, Postulacion, ReporteActividad } = require('../models');
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
}

module.exports = new DashboardService();
