const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

/**
 * Controlador para endpoints de dashboard administrativo
 */
class DashboardController {
  /**
   * GET /api/v1/dashboard/kpis
   * Obtener todos los KPIs del dashboard
   * @param {Object} req.query.periodo - Período académico opcional (formato: "2025-1")
   */
  getKPIs = asyncHandler(async (req, res) => {
    const { periodo } = req.query;

    // Validar formato de período si se proporciona
    if (periodo && !/^\d{4}-[1-3]$/.test(periodo)) {
      throw ApiError.badRequest('Formato de período inválido. Use el formato YYYY-N (ejemplo: 2025-1)');
    }

    // Obtener KPIs del servicio
    const kpis = await dashboardService.getKPIs(periodo);

    // Construir metadata
    const metadata = {
      periodoAcademico: periodo || 'Todos los períodos',
      fechaGeneracion: new Date().toISOString()
    };

    // Respuesta con KPIs y metadata
    return sendSuccess(
      res,
      {
        ...kpis,
        metadata
      },
      'KPIs del dashboard obtenidos exitosamente'
    );
  });

  /**
   * GET /api/v1/dashboard/kpis-general
   * Obtener KPIs generales (becas + orientación vocacional + usuarios)
   * @param {Object} req.query.periodo - Período académico opcional (formato: "2025-1")
   */
  getKPIsGeneral = asyncHandler(async (req, res) => {
    const { periodo } = req.query;

    // Validar formato de período si se proporciona
    if (periodo && !/^\d{4}-[1-3]$/.test(periodo)) {
      throw ApiError.badRequest('Formato de período inválido. Use el formato YYYY-N (ejemplo: 2025-1)');
    }

    // Obtener KPIs del servicio
    const kpis = await dashboardService.getKPIsGeneral(periodo);

    // Construir metadata
    const metadata = {
      periodoAcademico: periodo || 'Todos los períodos',
      fechaGeneracion: new Date().toISOString()
    };

    // Respuesta con KPIs y metadata
    return sendSuccess(
      res,
      {
        ...kpis,
        metadata
      },
      'KPIs generales obtenidos exitosamente'
    );
  });
}

module.exports = new DashboardController();
