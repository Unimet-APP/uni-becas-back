const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

/**
 * Generador Simple de Gráficos para Reportes
 *
 * Genera 3 tipos de gráficos:
 * - Barras (comparaciones)
 * - Pie (distribuciones)
 * - Líneas (progreso temporal)
 *
 * Usa Chart.js con renderizado en servidor (Canvas)
 */

class ChartGenerator {
  constructor() {
    // Configuración del canvas (800x600 px)
    this.width = 800;
    this.height = 600;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.width,
      height: this.height,
      backgroundColour: 'white'
    });
  }

  /**
   * Colores predefinidos para gráficos (paleta UNIMET)
   */
  static COLORS = {
    primary: ['#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF'], // Azules
    success: ['#006633', '#009933', '#33CC66', '#66FF99', '#99FFCC'], // Verdes
    warning: ['#CC6600', '#FF9933', '#FFCC66', '#FFE699', '#FFF2CC'], // Naranjas
    danger: ['#990033', '#CC3366', '#FF6699', '#FF99CC', '#FFCCEE']   // Rojos
  };

  /**
   * Genera un gráfico de barras
   * @param {Object} config - Configuración del gráfico
   * @returns {Promise<Buffer>} Imagen PNG del gráfico
   */
  async generarGraficoBarras(config) {
    const { titulo, labels, datasets, yAxisLabel = '' } = config;

    const chartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          backgroundColor: dataset.backgroundColor || ChartGenerator.COLORS.primary[index % 5],
          borderColor: dataset.borderColor || ChartGenerator.COLORS.primary[index % 5],
          borderWidth: 1
        }))
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: titulo,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: {
              font: {
                size: 12
              },
              padding: 15
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: yAxisLabel !== '',
              text: yAxisLabel,
              font: {
                size: 14
              }
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 11
              },
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(chartConfiguration);
  }

  /**
   * Genera un gráfico de pie (torta)
   * @param {Object} config - Configuración del gráfico
   * @returns {Promise<Buffer>} Imagen PNG del gráfico
   */
  async generarGraficoPie(config) {
    const { titulo, labels, data, colors } = config;

    const chartConfiguration = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors || [
            '#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF',
            '#006633', '#009933', '#33CC66', '#66FF99', '#99FFCC'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: titulo,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: true,
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 15,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label}: ${value} (${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(chartConfiguration);
  }

  /**
   * Genera un gráfico de líneas
   * @param {Object} config - Configuración del gráfico
   * @returns {Promise<Buffer>} Imagen PNG del gráfico
   */
  async generarGraficoLineas(config) {
    const { titulo, labels, datasets, yAxisLabel = '', xAxisLabel = '' } = config;

    const chartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.borderColor || ChartGenerator.COLORS.primary[index % 5],
          backgroundColor: dataset.backgroundColor || ChartGenerator.COLORS.primary[index % 5] + '33', // 33 = 20% opacity
          borderWidth: 2,
          fill: dataset.fill !== undefined ? dataset.fill : true,
          tension: 0.1, // Suavizado de líneas
          pointRadius: 4,
          pointBackgroundColor: dataset.borderColor || ChartGenerator.COLORS.primary[index % 5]
        }))
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: titulo,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: {
              font: {
                size: 12
              },
              padding: 15
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: yAxisLabel !== '',
              text: yAxisLabel,
              font: {
                size: 14
              }
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          x: {
            title: {
              display: xAxisLabel !== '',
              text: xAxisLabel,
              font: {
                size: 14
              }
            },
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(chartConfiguration);
  }

  /**
   * Genera gráfico de progreso de becarios (barras)
   * @param {Array} becarios - Lista de becarios con progreso
   * @returns {Promise<Buffer>}
   */
  async graficoProgresoBecarios(becarios) {
    // Tomar solo los primeros 10 becarios para que el gráfico sea legible
    const becariosTop = becarios.slice(0, 10);

    return await this.generarGraficoBarras({
      titulo: 'Progreso de Becarios (Top 10)',
      labels: becariosTop.map(b => `${b.usuario.nombre} ${b.usuario.apellido}`),
      datasets: [{
        label: 'Porcentaje Completado',
        data: becariosTop.map(b => parseFloat(b.porcentajeCompletado))
      }],
      yAxisLabel: 'Porcentaje (%)'
    });
  }

  /**
   * Genera gráfico de distribución de plazas (pie)
   * @param {Array} plazas - Lista de plazas
   * @returns {Promise<Buffer>}
   */
  async graficoDistribucionPlazas(plazas) {
    const activas = plazas.filter(p => p.estado === 'Activa').length;
    const inactivas = plazas.filter(p => p.estado === 'Inactiva').length;
    const ocupadas = plazas.reduce((sum, p) => sum + p.ocupadas, 0);
    const disponibles = plazas.reduce((sum, p) => sum + (p.capacidad - p.ocupadas), 0);

    return await this.generarGraficoPie({
      titulo: 'Distribución de Plazas',
      labels: ['Cupos Ocupados', 'Cupos Disponibles'],
      data: [ocupadas, disponibles],
      colors: ['#003366', '#99CCFF']
    });
  }

  /**
   * Genera gráfico de carga de supervisores (barras)
   * @param {Array} supervisores - Lista de supervisores
   * @returns {Promise<Buffer>}
   */
  async graficoCargaSupervisores(supervisores) {
    return await this.generarGraficoBarras({
      titulo: 'Carga de Trabajo por Supervisor',
      labels: supervisores.map(s => `${s.nombre} ${s.apellido}`),
      datasets: [{
        label: 'Becarios Activos',
        data: supervisores.map(s => s.estadisticas.becariosActivos),
        backgroundColor: '#0066CC'
      }],
      yAxisLabel: 'Cantidad de Becarios'
    });
  }

  /**
   * Genera gráfico de horas por semana (líneas)
   * @param {Array} distribucionSemanal - Distribución de horas por semana
   * @returns {Promise<Buffer>}
   */
  async graficoHorasPorSemana(distribucionSemanal) {
    return await this.generarGraficoLineas({
      titulo: 'Horas Trabajadas por Semana',
      labels: distribucionSemanal.map(d => `Semana ${d.semana}`),
      datasets: [{
        label: 'Horas Totales',
        data: distribucionSemanal.map(d => parseFloat(d.horas))
      }],
      yAxisLabel: 'Horas',
      xAxisLabel: 'Semana'
    });
  }

  /**
   * Genera gráfico de distribución por tipo de beca (pie)
   * @param {Array} distribucion - Distribución por tipo de beca
   * @returns {Promise<Buffer>}
   */
  async graficoDistribucionBecas(distribucion) {
    return await this.generarGraficoPie({
      titulo: 'Distribución por Tipo de Beca',
      labels: distribucion.map(d => d.tipoBeca),
      data: distribucion.map(d => d.beneficiariosActivos),
      colors: ['#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF']
    });
  }

  /**
   * Genera gráfico de distribución por tipo de postulante (pie)
   * @param {Array} distribucion - Distribución por tipo de postulante
   * @returns {Promise<Buffer>}
   */
  async graficoDistribucionPostulantes(distribucion) {
    const labels = distribucion.map(d => {
      switch (d.tipoPostulante) {
        case 'estudiante-pregrado': return 'Pregrado';
        case 'estudiante-postgrado': return 'Postgrado';
        case 'bachiller': return 'Bachiller';
        default: return d.tipoPostulante;
      }
    });

    return await this.generarGraficoPie({
      titulo: 'Distribución por Tipo de Postulante',
      labels: labels,
      data: distribucion.map(d => d.postulaciones),
      colors: ['#006633', '#33CC66', '#99FFCC']
    });
  }

  /**
   * Genera gráfico de estado de reportes (pie)
   * @param {Object} resumen - Resumen de estadísticas
   * @returns {Promise<Buffer>}
   */
  async graficoEstadoReportes(resumen) {
    return await this.generarGraficoPie({
      titulo: 'Estado de Reportes de Actividades',
      labels: ['Aprobados', 'Pendientes', 'Rechazados', 'En Revisión'],
      data: [
        resumen.reportesAprobados,
        resumen.reportesPendientes,
        resumen.reportesRechazados,
        resumen.reportesEnRevision
      ],
      colors: ['#009933', '#FFE699', '#CC3366', '#3399FF']
    });
  }
}

module.exports = ChartGenerator;
