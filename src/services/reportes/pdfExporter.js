const PDFDocument = require('pdfkit');
const ChartGenerator = require('./chartGenerator');

/**
 * Exportador de PDF con Tablas y Gráficos
 *
 * Genera archivos PDF con:
 * - Tablas bien formateadas
 * - Gráficos insertados como imágenes
 * - Header/Footer con logo UNIMET
 * - Estilos profesionales
 */

class PDFExporter {
  /**
   * Colores corporativos UNIMET
   */
  static COLORS = {
    primary: '#003366',
    secondary: '#0066CC',
    text: '#333333',
    lightGray: '#F2F2F2',
    border: '#CCCCCC'
  };

  /**
   * Crea un nuevo documento PDF con configuración base
   */
  crearDocumento() {
    return new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Reporte del Sistema de Becas',
        Author: 'Sistema de Gestión de Becas - UNIMET',
        Subject: 'Reporte Generado',
        Creator: 'Sistema de Becas UNIMET'
      }
    });
  }

  /**
   * Agrega header al documento
   */
  agregarHeader(doc, titulo) {
    doc
      .fontSize(18)
      .fillColor(PDFExporter.COLORS.primary)
      .font('Helvetica-Bold')
      .text('Universidad Metropolitana', 50, 30)
      .fontSize(14)
      .text('Sistema de Gestión de Becas', 50, 50);

    doc
      .fontSize(16)
      .fillColor(PDFExporter.COLORS.secondary)
      .text(titulo, 50, 80, { align: 'center' });

    doc
      .moveTo(50, 105)
      .lineTo(doc.page.width - 50, 105)
      .strokeColor(PDFExporter.COLORS.primary)
      .lineWidth(2)
      .stroke();

    // Resetear a posición después del header
    doc.y = 120;
    // Resetear color de texto a negro/gris oscuro para evitar texto invisible
    doc.fillColor(PDFExporter.COLORS.text);
  }

  /**
   * Agrega footer al documento
   */
  agregarFooter(doc, numeroPagina, totalPaginas) {
    const bottom = doc.page.height - 30;
    doc
      .fontSize(9)
      .fillColor(PDFExporter.COLORS.text)
      .text(
        `Generado: ${new Date().toLocaleString('es-VE')}`,
        50,
        bottom,
        { align: 'left' }
      )
      .text(
        `Página ${numeroPagina} de ${totalPaginas}`,
        0,
        bottom,
        { align: 'center' }
      );
  }

  /**
   * Agrega metadatos al documento
   */
  agregarMetadatos(doc, metadatos) {
    const startY = doc.y + 10;
    doc
      .fontSize(10)
      .fillColor(PDFExporter.COLORS.text)
      .font('Helvetica');

    Object.entries(metadatos).forEach(([key, value], index) => {
      doc.text(`${key}: ${value}`, 50, startY + (index * 15));
    });

    doc.y = startY + (Object.keys(metadatos).length * 15) + 20;
  }

  /**
   * Dibuja una tabla en el PDF
   */
  dibujarTabla(doc, opciones) {
    const { headers, rows, startX = 50, startY, columnWidths, fontSize = 9 } = opciones;

    let currentY = startY || doc.y;
    const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

    // Header de la tabla
    doc
      .fontSize(fontSize)
      .font('Helvetica-Bold')
      .fillColor('white');

    // Fondo del header
    doc
      .rect(startX, currentY, tableWidth, 20)
      .fillAndStroke(PDFExporter.COLORS.primary, PDFExporter.COLORS.primary);

    // Texto del header
    let currentX = startX;
    headers.forEach((header, i) => {
      doc.fillColor('white'); // Asegurar color blanco para texto del header
      doc.text(
        header,
        currentX + 5,
        currentY + 6,
        { width: columnWidths[i] - 10, align: 'left' }
      );
      currentX += columnWidths[i];
    });

    currentY += 20;

    // Filas de datos
    doc.font('Helvetica').fillColor(PDFExporter.COLORS.text);

    rows.forEach((row, rowIndex) => {
      // Verificar si necesitamos nueva página
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;

        // Redibujar header en nueva página
        doc
          .fontSize(fontSize)
          .font('Helvetica-Bold')
          .fillColor('white');
        doc
          .rect(startX, currentY, tableWidth, 20)
          .fillAndStroke(PDFExporter.COLORS.primary, PDFExporter.COLORS.primary);

        currentX = startX;
        headers.forEach((header, i) => {
          doc.fillColor('white'); // Asegurar color blanco para texto del header
          doc.text(
            header,
            currentX + 5,
            currentY + 6,
            { width: columnWidths[i] - 10, align: 'left' }
          );
          currentX += columnWidths[i];
        });

        currentY += 20;
        doc.font('Helvetica').fillColor(PDFExporter.COLORS.text);
      }

      // Fondo alternado para filas
      if (rowIndex % 2 === 0) {
        doc
          .rect(startX, currentY, tableWidth, 18)
          .fillAndStroke(PDFExporter.COLORS.lightGray, PDFExporter.COLORS.border);
      }

      // Contenido de la fila
      currentX = startX;
      row.forEach((cell, cellIndex) => {
        doc.fillColor(PDFExporter.COLORS.text); // Asegurar color de texto para celdas
        doc.text(
          String(cell),
          currentX + 5,
          currentY + 4,
          { width: columnWidths[cellIndex] - 10, align: 'left', height: 18 }
        );
        currentX += columnWidths[cellIndex];
      });

      // Borde de la fila
      doc
        .rect(startX, currentY, tableWidth, 18)
        .stroke(PDFExporter.COLORS.border);

      currentY += 18;
    });

    doc.y = currentY + 20;
  }

  /**
   * Inserta un gráfico en el PDF
   */
  async insertarGrafico(doc, chartBuffer, opciones = {}) {
    const { width = 500, height = 300, align = 'center' } = opciones;

    // Calcular posición
    let x = 50;
    if (align === 'center') {
      x = (doc.page.width - width) / 2;
    }

    // Verificar si necesitamos nueva página
    if (doc.y + height > doc.page.height - 50) {
      doc.addPage();
      doc.y = 50;
    }

    const y = doc.y;

    // Insertar imagen
    doc.image(chartBuffer, x, y, { width, height });

    doc.y = y + height + 20;
  }

  /**
   * Genera reporte de becarios en PDF
   */
  async generarReporteBecarios(becarios, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Reporte de Estudiantes Becarios');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Total de becarios': becarios.length,
      'Becarios al día': becarios.filter(b => !b.enRiesgo).length,
      'Becarios en riesgo': becarios.filter(b => b.enRiesgo).length
    });

    // Tabla de becarios
    const headers = ['Nombre', 'Tipo Beca', 'Progreso', 'Estado'];
    const rows = becarios.map(b => [
      `${b.usuario.nombre} ${b.usuario.apellido}`,
      b.tipoBeca,
      `${b.porcentajeCompletado}%`,
      b.estadoProgreso
    ]);

    const columnWidths = [200, 120, 80, 100];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico si se solicita
    if (conGrafico && becarios.length > 0) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold').text('Gráfico de Progreso', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoProgresoBecarios(becarios);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de plazas en PDF
   */
  async generarReportePlazas(plazas, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Reporte de Plazas');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Total de plazas': plazas.length,
      'Plazas activas': plazas.filter(p => p.estado === 'Activa').length,
      'Plazas inactivas': plazas.filter(p => p.estado === 'Inactiva').length
    });

    // Tabla de plazas
    const headers = ['Nombre', 'Tipo', 'Estado', 'Ocupación %', 'Supervisor'];
    const rows = plazas.map(p => [
      p.nombre.substring(0, 35),
      p.tipoAyudantia || 'N/A',
      p.estado,
      `${p.porcentajeOcupacion}%`,
      p.supervisorResponsable ? `${p.supervisorResponsable.nombre} ${p.supervisorResponsable.apellido}` : 'Sin asignar'
    ]);
    const columnWidths = [140, 90, 70, 80, 150];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico
    if (conGrafico && plazas.length > 0) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold').text('Distribución de Plazas', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoDistribucionPlazas(plazas);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de supervisores en PDF
   */
  async generarReporteSupervisores(supervisores, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Reporte de Supervisores');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Total de supervisores': supervisores.length,
      'Becarios supervisados': supervisores.reduce((sum, s) => sum + s.estadisticas.becariosActivos, 0),
      'Reportes pendientes': supervisores.reduce((sum, s) => sum + s.estadisticas.reportesPendientesRevision, 0)
    });

    // Tabla de supervisores
    const headers = ['Nombre', 'Departamento', 'Becarios', 'Horas Sup.', 'Tasa Aprob.'];
    const rows = supervisores.map(s => [
      `${s.nombre} ${s.apellido}`,
      s.departamento || 'N/A',
      s.estadisticas.becariosActivos,
      s.estadisticas.horasTotalesSupervisadas,
      `${s.estadisticas.tasaAprobacion}%`
    ]);

    const columnWidths = [150, 120, 80, 90, 90];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico
    if (conGrafico && supervisores.length > 0) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold').text('Carga de Trabajo', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoCargaSupervisores(supervisores);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de actividades en PDF
   */
  async generarReporteActividades(estadisticas, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Estadísticas de Reportes de Actividades');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Período': estadisticas.periodo,
      'Total de reportes': estadisticas.resumen.totalReportes,
      'Tasa de aprobación': `${estadisticas.resumen.tasaAprobacion}%`,
      'Horas totales aprobadas': estadisticas.resumen.horasTotalesAprobadas
    });

    // Tabla por semana
    doc.fillColor(PDFExporter.COLORS.text).fontSize(12).font('Helvetica-Bold').text('Distribución por Semana', 50, doc.y);
    doc.moveDown();

    const headers = ['Semana', 'Reportes', 'Horas', 'Promedio'];
    const rows = estadisticas.distribucionPorSemana.map(d => [
      `Semana ${d.semana}`,
      d.reportes,
      d.horas,
      d.promedio
    ]);

    const columnWidths = [100, 100, 100, 100];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico
    if (conGrafico && estadisticas.distribucionPorSemana.length > 0) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold').text('Horas por Semana', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoHorasPorSemana(estadisticas.distribucionPorSemana);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de distribución por tipo de beca en PDF
   */
  async generarReporteDistribucionBecas(distribucion, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Distribución por Tipo de Beca');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Total de tipos de beca': distribucion.length,
      'Total de beneficiarios': distribucion.reduce((sum, d) => sum + d.beneficiariosActivos, 0),
      'Total de postulaciones': distribucion.reduce((sum, d) => sum + d.postulaciones, 0)
    });

    // Tabla
    const headers = ['Tipo Beca', 'Beneficiarios', 'Postulaciones', 'Tasa Aprob.'];
    const rows = distribucion.map(d => [
      d.tipoBeca,
      d.beneficiariosActivos,
      d.postulaciones,
      `${d.tasaAprobacion}%`
    ]);

    const columnWidths = [150, 100, 100, 100];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico
    if (conGrafico && distribucion.length > 0) {
      doc.addPage();
      doc.y = 50;
      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoDistribucionBecas(distribucion);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de distribución por tipo de postulante en PDF
   */
  async generarReporteDistribucionPostulantes(distribucion, conGrafico = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Distribución por Tipo de Postulante');

    this.agregarMetadatos(doc, {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Total de tipos': distribucion.length,
      'Total de postulaciones': distribucion.reduce((sum, d) => sum + d.postulaciones, 0),
      'Total aprobadas': distribucion.reduce((sum, d) => sum + d.aprobadas, 0),
      'IAA promedio general': (distribucion.reduce((sum, d) => sum + (d.iaaPromedio * d.postulaciones), 0) / distribucion.reduce((sum, d) => sum + d.postulaciones, 0)).toFixed(2)
    });

    // Tabla
    const headers = ['Tipo', 'Postulaciones', 'Aprobadas', 'IAA Prom.'];
    const rows = distribucion.map(d => {
      const tipo = d.tipoPostulante === 'estudiante-pregrado' ? 'Pregrado' :
                   d.tipoPostulante === 'estudiante-postgrado' ? 'Postgrado' : 'Bachiller';
      return [
        tipo,
        d.postulaciones,
        d.aprobadas,
        d.iaaPromedio
      ];
    });

    const columnWidths = [150, 120, 120, 100];

    this.dibujarTabla(doc, { headers, rows, columnWidths, startY: doc.y });

    // Agregar gráfico
    if (conGrafico && distribucion.length > 0) {
      doc.addPage();
      doc.y = 50;
      const chartGen = new ChartGenerator();
      const chartBuffer = await chartGen.graficoDistribucionPostulantes(distribucion);
      await this.insertarGrafico(doc, chartBuffer);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }


  /**
   * Genera dashboard completo en PDF (múltiples páginas)
   */
  async generarDashboardCompleto(datos, conGraficos = true) {
    const doc = this.crearDocumento();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    this.agregarHeader(doc, 'Dashboard General del Sistema de Becas');

    // ==================== PRIMERA HOJA: Resumen Ejecutivo ====================
    doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold').text('Resumen Ejecutivo', 50, doc.y);
    doc.moveDown();

    const metadatos = {
      'Fecha de generación': new Date().toLocaleString('es-VE'),
      'Período': datos.periodo || 'Todos'
    };

    if (datos.becarios) {
      metadatos['Total de becarios activos'] = datos.becarios.length;
    }
    if (datos.plazas) {
      metadatos['Total de plazas'] = datos.plazas.length;
    }
    if (datos.supervisores) {
      metadatos['Total de supervisores'] = datos.supervisores.length;
    }

    this.agregarMetadatos(doc, metadatos);

    // Tabla de Métricas Principales
    doc.fillColor(PDFExporter.COLORS.text).fontSize(12).font('Helvetica-Bold').text('Métricas Principales', 50, doc.y);
    doc.moveDown();

    const metricasHeaders = ['Métrica', 'Valor'];
    const metricasRows = [
      ['Becarios activos', datos.becarios?.length || 0],
      ['Becarios en riesgo', datos.becarios?.filter(b => b.enRiesgo).length || 0],
      ['Becarios al día', datos.becarios?.filter(b => !b.enRiesgo).length || 0],
      ['Total de plazas', datos.plazas?.length || 0],
      ['Cupos ocupados', datos.plazas?.reduce((sum, p) => sum + p.ocupadas, 0) || 0],
      ['Cupos disponibles', datos.plazas?.reduce((sum, p) => sum + p.disponibles, 0) || 0],
      ['Total supervisores', datos.supervisores?.length || 0],
      ['Reportes totales', datos.estadisticasActividades?.resumen?.totalReportes || 0],
      ['Reportes aprobados', datos.estadisticasActividades?.resumen?.reportesAprobados || 0],
      ['Tasa de aprobación', `${datos.estadisticasActividades?.resumen?.tasaAprobacion || 0}%`]
    ];

    this.dibujarTabla(doc, {
      headers: metricasHeaders,
      rows: metricasRows,
      columnWidths: [300, 130],
      startY: doc.y
    });

    // Tabla TOP 5 Becarios
    if (datos.becarios && datos.becarios.length > 0) {
      doc.fillColor(PDFExporter.COLORS.text).fontSize(12).font('Helvetica-Bold').text('TOP 5 Becarios por Progreso', 50, doc.y);
      doc.moveDown();

      const top5Becarios = datos.becarios
        .sort((a, b) => b.porcentajeCompletado - a.porcentajeCompletado)
        .slice(0, 5);

      const becariosHeaders = ['Nombre', 'Tipo Beca', 'Progreso', 'Estado'];
      const becariosRows = top5Becarios.map(b => [
        `${b.usuario.nombre} ${b.usuario.apellido}`,
        b.tipoBeca,
        `${b.porcentajeCompletado}%`,
        b.estadoProgreso
      ]);

      this.dibujarTabla(doc, {
        headers: becariosHeaders,
        rows: becariosRows,
        columnWidths: [150, 100, 80, 100],
        startY: doc.y
      });
    }

    // ==================== SEGUNDA HOJA: Gráficos de Becarios ====================
    if (conGraficos && datos.becarios && datos.becarios.length > 0) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold')
         .text('Gráficos de Becarios', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();

      // Gráfico 1: Progreso de Becarios
      const chartBuffer1 = await chartGen.graficoProgresoBecarios(datos.becarios);
      await this.insertarGrafico(doc, chartBuffer1);

      // Gráfico 2: Distribución por Tipo de Beca
      if (datos.distribucionBecas && datos.distribucionBecas.length > 0) {
        const chartBuffer2 = await chartGen.graficoDistribucionBecas(datos.distribucionBecas);
        await this.insertarGrafico(doc, chartBuffer2);
      }
    }

    // ==================== TERCERA HOJA: Gráficos de Plazas y Supervisores ====================
    if (conGraficos && (datos.plazas || datos.supervisores)) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold')
         .text('Gráficos de Plazas y Supervisores', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();

      // Gráfico 1: Distribución de Plazas
      if (datos.plazas && datos.plazas.length > 0) {
        const chartBuffer3 = await chartGen.graficoDistribucionPlazas(datos.plazas);
        await this.insertarGrafico(doc, chartBuffer3);
      }

      // Gráfico 2: Carga de Supervisores
      if (datos.supervisores && datos.supervisores.length > 0) {
        const chartBuffer4 = await chartGen.graficoCargaSupervisores(datos.supervisores);
        await this.insertarGrafico(doc, chartBuffer4);
      }
    }

    // ==================== CUARTA HOJA: Gráficos de Actividades ====================
    if (conGraficos && datos.estadisticasActividades) {
      doc.addPage();
      doc.y = 50;
      doc.fillColor(PDFExporter.COLORS.text).fontSize(14).font('Helvetica-Bold')
         .text('Gráficos de Actividades', { align: 'center' });
      doc.moveDown();

      const chartGen = new ChartGenerator();

      // Gráfico 1: Estado de Reportes
      const chartBuffer5 = await chartGen.graficoEstadoReportes(datos.estadisticasActividades.resumen);
      await this.insertarGrafico(doc, chartBuffer5);

      // Gráfico 2: Horas por Semana
      if (datos.estadisticasActividades.distribucionPorSemana && datos.estadisticasActividades.distribucionPorSemana.length > 0) {
        const chartBuffer6 = await chartGen.graficoHorasPorSemana(datos.estadisticasActividades.distribucionPorSemana);
        await this.insertarGrafico(doc, chartBuffer6);
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Genera reporte de orientación vocacional en PDF
   */
  async generarReporteOrientacionVocacional(datos, incluirGraficos = true) {
    const chunks = [];
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    this.agregarHeader(doc, 'Reporte de Orientación Vocacional');

    // Resumen General
    doc.moveDown(2);
    doc.fillColor(PDFExporter.COLORS.primary).fontSize(14).font('Helvetica-Bold')
       .text('Resumen General', 50, doc.y);
    doc.moveDown();

    doc.fillColor(PDFExporter.COLORS.text).fontSize(12).font('Helvetica');

    const resumen = [
      { label: 'Tests Completados:', value: datos.resumen.testsCompletados },
      { label: 'Tests en Progreso:', value: datos.resumen.testsEnProgreso },
      { label: 'Tests Abandonados:', value: datos.resumen.testsAbandonados },
      { label: 'Tasa de Completitud:', value: `${datos.resumen.tasaCompletitud}%` },
      { label: 'Usuarios Únicos:', value: datos.resumen.usuariosUnicos }
    ];

    resumen.forEach(item => {
      doc.font('Helvetica-Bold').text(item.label, { continued: true });
      doc.font('Helvetica').text(` ${item.value}`);
      doc.moveDown(0.5);
    });

    // Tests por Tipo
    doc.moveDown(2);
    doc.fillColor(PDFExporter.COLORS.primary).fontSize(14).font('Helvetica-Bold')
       .text('Tests por Tipo');
    doc.moveDown();

    datos.testsPorTipo.forEach(tipo => {
      doc.fillColor(PDFExporter.COLORS.text).font('Helvetica')
         .text(`• ${tipo.tipo}: ${tipo.cantidad} tests`);
      doc.moveDown(0.3);
    });

    // Perfiles RIASEC Dominantes
    doc.addPage();
    doc.fillColor(PDFExporter.COLORS.primary).fontSize(18).font('Helvetica-Bold')
       .text('Perfiles RIASEC Dominantes', { align: 'center' });
    doc.moveDown(2);

    datos.perfilesDominantes.forEach((perfil, index) => {
      doc.fillColor(PDFExporter.COLORS.text).fontSize(12).font('Helvetica-Bold')
         .text(`${index + 1}. ${perfil.perfil}`, { continued: true });
      doc.font('Helvetica')
         .text(` - ${perfil.cantidad} usuarios (${perfil.porcentaje}%)`);
      doc.moveDown(0.5);
    });

    // Tabla de Usuarios
    if (datos.usuariosConTests && datos.usuariosConTests.length > 0) {
      doc.addPage();
      doc.fillColor(PDFExporter.COLORS.primary).fontSize(14).font('Helvetica-Bold')
         .text('Top Usuarios con Tests Completados');
      doc.moveDown();

      const tableTop = doc.y;
      const headers = ['Nombre', 'Email', 'Tests'];
      const columnWidths = [180, 180, 80];
      let currentX = 50;

      // Headers
      doc.fillColor(PDFExporter.COLORS.primary).fontSize(10).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
        currentX += columnWidths[i];
      });

      doc.moveDown();

      // Rows (primeros 15)
      doc.fillColor(PDFExporter.COLORS.text).fontSize(9).font('Helvetica');
      datos.usuariosConTests.slice(0, 15).forEach((usuario, index) => {
        const y = doc.y;
        doc.text(usuario.nombre, 50, y, { width: 180, ellipsis: true });
        doc.text(usuario.email, 230, y, { width: 180, ellipsis: true });
        doc.text(usuario.testsCompletados.toString(), 410, y, { width: 80 });
        doc.moveDown(0.8);
      });
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }
}

module.exports = PDFExporter;
