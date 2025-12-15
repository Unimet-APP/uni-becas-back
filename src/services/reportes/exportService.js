const DataQueries = require('./dataQueries');
const ExcelExporter = require('./excelExporter');
const PDFExporter = require('./pdfExporter');

/**
 * Servicio Orquestador de Exportación de Reportes
 *
 * Coordina la generación de reportes en diferentes formatos:
 * - Excel (.xlsx) con gráficos nativos
 * - PDF (.pdf) con tablas y gráficos
 * - JSON (para consumo del frontend)
 *
 * Uso:
 * 1. Obtiene datos usando DataQueries
 * 2. Genera archivo según formato solicitado
 * 3. Retorna buffer con el archivo generado
 */

class ExportService {
  constructor() {
    this.excelExporter = new ExcelExporter();
    this.pdfExporter = new PDFExporter();
  }

  /**
   * Valida que el formato sea soportado
   */
  validarFormato(formato) {
    const formatosValidos = ['excel', 'pdf', 'json'];
    if (!formatosValidos.includes(formato.toLowerCase())) {
      throw new Error(`Formato no soportado: ${formato}. Formatos válidos: ${formatosValidos.join(', ')}`);
    }
  }

  /**
   * Genera nombre de archivo según tipo de reporte y formato
   */
  generarNombreArchivo(tipoReporte, formato, periodo = null) {
    const fecha = new Date().toISOString().split('T')[0];
    const periodoStr = periodo ? `_${periodo}` : '';
    const extensiones = {
      excel: 'xlsx',
      pdf: 'pdf',
      json: 'json'
    };

    return `reporte_${tipoReporte}${periodoStr}_${fecha}.${extensiones[formato]}`;
  }

  /**
   * Exportar lista completa de becarios
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarBecarios(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    // Obtener datos
    const becarios = await DataQueries.getBecariosCompleto(filtros);

    if (formato === 'json') {
      return {
        data: becarios,
        filename: this.generarNombreArchivo('becarios', 'json'),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReporteBecarios(becarios);
      return {
        buffer,
        filename: this.generarNombreArchivo('becarios', 'excel'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReporteBecarios(becarios, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('becarios', 'pdf'),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar información de plazas
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarPlazas(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    const plazas = await DataQueries.getPlazasCompleto(filtros);

    if (formato === 'json') {
      return {
        data: plazas,
        filename: this.generarNombreArchivo('plazas', 'json'),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReportePlazas(plazas);
      return {
        buffer,
        filename: this.generarNombreArchivo('plazas', 'excel'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReportePlazas(plazas, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('plazas', 'pdf'),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar información de supervisores
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarSupervisores(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    const supervisores = await DataQueries.getSupervisoresCompleto(filtros);

    if (formato === 'json') {
      return {
        data: supervisores,
        filename: this.generarNombreArchivo('supervisores', 'json'),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReporteSupervisores(supervisores);
      return {
        buffer,
        filename: this.generarNombreArchivo('supervisores', 'excel'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReporteSupervisores(supervisores, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('supervisores', 'pdf'),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar estadísticas de actividades
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarActividades(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    const estadisticas = await DataQueries.getActividadesEstadisticas(filtros);

    if (formato === 'json') {
      return {
        data: estadisticas,
        filename: this.generarNombreArchivo('actividades', 'json', filtros.periodo),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReporteActividades(estadisticas);
      return {
        buffer,
        filename: this.generarNombreArchivo('actividades', 'excel', filtros.periodo),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReporteActividades(estadisticas, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('actividades', 'pdf', filtros.periodo),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar distribución por tipo de beca
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarDistribucionBecas(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    const distribucion = await DataQueries.getDistribucionPorBeca(filtros);

    if (formato === 'json') {
      return {
        data: distribucion,
        filename: this.generarNombreArchivo('distribucion_becas', 'json', filtros.periodo),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReporteDistribucionBecas(distribucion);
      return {
        buffer,
        filename: this.generarNombreArchivo('distribucion_becas', 'excel', filtros.periodo),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReporteDistribucionBecas(distribucion, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('distribucion_becas', 'pdf', filtros.periodo),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar distribución por tipo de postulante
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarDistribucionPostulantes(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    const distribucion = await DataQueries.getDistribucionPorPostulante(filtros);

    if (formato === 'json') {
      return {
        data: distribucion,
        filename: this.generarNombreArchivo('distribucion_postulantes', 'json', filtros.periodo),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarReporteDistribucionPostulantes(distribucion);
      return {
        buffer,
        filename: this.generarNombreArchivo('distribucion_postulantes', 'excel', filtros.periodo),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarReporteDistribucionPostulantes(distribucion, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('distribucion_postulantes', 'pdf', filtros.periodo),
        contentType: 'application/pdf'
      };
    }
  }

  /**
   * Exportar dashboard completo con todos los datos
   * @param {Object} filtros - Filtros opcionales
   * @param {String} formato - 'excel' | 'pdf' | 'json'
   * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
   */
  async exportarDashboardCompleto(filtros = {}, formato = 'json') {
    this.validarFormato(formato);

    // Obtener todos los datos en paralelo
    const [becarios, plazas, supervisores, estadisticasActividades, distribucionBecas, distribucionPostulantes] =
      await Promise.all([
        DataQueries.getBecariosCompleto(filtros).catch(() => []),
        DataQueries.getPlazasCompleto(filtros).catch(() => []),
        DataQueries.getSupervisoresCompleto(filtros).catch(() => []),
        DataQueries.getActividadesEstadisticas(filtros).catch(() => null),
        DataQueries.getDistribucionPorBeca(filtros).catch(() => []),
        DataQueries.getDistribucionPorPostulante(filtros).catch(() => [])
      ]);

    const datosCompletos = {
      periodo: filtros.periodo || 'Todos',
      fechaGeneracion: new Date().toISOString(),
      becarios,
      plazas,
      supervisores,
      estadisticasActividades,
      distribucionBecas,
      distribucionPostulantes,
      resumen: {
        totalBecarios: becarios.length,
        totalPlazas: plazas.length,
        totalSupervisores: supervisores.length,
        becariosEnRiesgo: becarios.filter(b => b.enRiesgo).length,
        plazasDisponibles: plazas.reduce((sum, p) => sum + p.disponibles, 0),
        plazasOcupadas: plazas.reduce((sum, p) => sum + p.ocupadas, 0)
      }
    };

    if (formato === 'json') {
      return {
        data: datosCompletos,
        filename: this.generarNombreArchivo('dashboard_completo', 'json', filtros.periodo),
        contentType: 'application/json'
      };
    }

    if (formato === 'excel') {
      const buffer = await this.excelExporter.generarDashboardCompleto(datosCompletos);
      return {
        buffer,
        filename: this.generarNombreArchivo('dashboard_completo', 'excel', filtros.periodo),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (formato === 'pdf') {
      const buffer = await this.pdfExporter.generarDashboardCompleto(datosCompletos, true);
      return {
        buffer,
        filename: this.generarNombreArchivo('dashboard_completo', 'pdf', filtros.periodo),
        contentType: 'application/pdf'
      };
    }
  }
}

module.exports = ExportService;
