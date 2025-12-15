const { ConfiguracionBeca } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class ConfiguracionBecasService {
  /**
   * Listar todas las configuraciones de becas
   * Opcionalmente filtrar por tipoBeca y/o subtipoExcelencia
   */
  async listarConfiguraciones(filtros = {}) {
    const { tipoBeca, subtipoExcelencia } = filtros;

    let configuraciones;

    // Si se proporciona tipoBeca, filtrar por tipo
    if (tipoBeca) {
      // Si el tipo es Excelencia, podemos filtrar por subtipo también
      if (tipoBeca === 'Excelencia' && subtipoExcelencia) {
        const configuracion = await ConfiguracionBeca.obtenerPorTipo(tipoBeca, subtipoExcelencia);
        configuraciones = configuracion ? [configuracion] : [];
      } else if (tipoBeca === 'Excelencia' && !subtipoExcelencia) {
        // Listar todas las configuraciones de tipo Excelencia (todos los subtipos)
        configuraciones = await ConfiguracionBeca.listarPorTipo(tipoBeca);
      } else {
        // Tipo de beca que no es Excelencia
        configuraciones = await ConfiguracionBeca.listarPorTipo(tipoBeca);
      }
    } else {
      // Sin filtros, listar todas
      configuraciones = await ConfiguracionBeca.listarTodas();
    }

    return {
      total: configuraciones.length,
      configuraciones
    };
  }

  /**
   * Obtener una configuración específica
   */
  async obtenerConfiguracion(tipoBeca, subtipoExcelencia = null) {
    if (!tipoBeca) {
      throw ApiError.badRequest('El tipo de beca es requerido');
    }

    // Validar que si es Excelencia, debe venir subtipoExcelencia
    if (tipoBeca === 'Excelencia' && !subtipoExcelencia) {
      throw ApiError.badRequest(
        'El subtipo de excelencia es requerido para becas de tipo Excelencia'
      );
    }

    // Validar que si NO es Excelencia, NO debe venir subtipoExcelencia
    if (tipoBeca !== 'Excelencia' && subtipoExcelencia) {
      throw ApiError.badRequest(
        'El subtipo de excelencia solo es válido para becas de tipo Excelencia'
      );
    }

    const configuracion = await ConfiguracionBeca.obtenerPorTipo(tipoBeca, subtipoExcelencia);

    if (!configuracion) {
      const identificador = tipoBeca === 'Excelencia'
        ? `${tipoBeca} - ${subtipoExcelencia}`
        : tipoBeca;
      throw ApiError.notFound(`Configuración de beca ${identificador} no encontrada`);
    }

    return configuracion;
  }

  /**
   * Crear o actualizar una configuración de beca (UPSERT)
   */
  async upsertConfiguracion(datos) {
    const { tipoBeca, subtipoExcelencia } = datos;

    // Validaciones de consistencia
    if (!tipoBeca) {
      throw ApiError.badRequest('El tipo de beca es requerido');
    }

    if (tipoBeca === 'Excelencia' && !subtipoExcelencia) {
      throw ApiError.badRequest(
        'El subtipo de excelencia es requerido para becas de tipo Excelencia'
      );
    }

    if (tipoBeca !== 'Excelencia' && subtipoExcelencia) {
      throw ApiError.badRequest(
        'El subtipo de excelencia solo es válido para becas de tipo Excelencia'
      );
    }

    // Validar tipos de beca permitidos
    const tiposPermitidos = ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'];
    if (!tiposPermitidos.includes(tipoBeca)) {
      throw ApiError.badRequest(
        `Tipo de beca inválido. Debe ser uno de: ${tiposPermitidos.join(', ')}`
      );
    }

    // Validar subtipos de excelencia permitidos (si aplica)
    if (tipoBeca === 'Excelencia') {
      const subtiposPermitidos = ['Académica', 'Deportiva', 'Artística', 'Emprendimiento', 'Cívico'];
      if (!subtiposPermitidos.includes(subtipoExcelencia)) {
        throw ApiError.badRequest(
          `Subtipo de excelencia inválido. Debe ser uno de: ${subtiposPermitidos.join(', ')}`
        );
      }
    }

    try {
      const { configuracion, created } = await ConfiguracionBeca.upsertConfiguracion(datos);

      const identificador = configuracion.obtenerIdentificador();
      const accion = created ? 'creada' : 'actualizada';

      logger.info(`Configuración de beca ${identificador} ${accion}`);

      return {
        configuracion,
        created
      };
    } catch (error) {
      // Manejar errores de validación de Sequelize
      if (error.name === 'SequelizeValidationError') {
        const errores = error.errors.map(e => e.message).join(', ');
        throw ApiError.badRequest(`Error de validación: ${errores}`);
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw ApiError.conflict('Ya existe una configuración para esta combinación de tipo y subtipo de beca');
      }

      throw error;
    }
  }

  /**
   * Validar si un estudiante cumple los requisitos académicos de una beca
   */
  async validarRequisitosEstudiante(tipoBeca, subtipoExcelencia, datosEstudiante) {
    const configuracion = await this.obtenerConfiguracion(tipoBeca, subtipoExcelencia);

    if (!configuracion) {
      throw ApiError.notFound('Configuración de beca no encontrada');
    }

    const resultado = configuracion.cumpleRequisitosAcademicos(datosEstudiante);

    return {
      configuracion: {
        tipoBeca: configuracion.tipoBeca,
        subtipoExcelencia: configuracion.subtipoExcelencia,
        identificador: configuracion.obtenerIdentificador()
      },
      ...resultado
    };
  }

  /**
   * Obtener lista de documentos requeridos para una beca específica
   */
  async obtenerDocumentosRequeridos(tipoBeca, subtipoExcelencia = null) {
    const configuracion = await this.obtenerConfiguracion(tipoBeca, subtipoExcelencia);

    return {
      tipoBeca: configuracion.tipoBeca,
      subtipoExcelencia: configuracion.subtipoExcelencia,
      identificador: configuracion.obtenerIdentificador(),
      documentosRequeridos: configuracion.documentosRequeridos || []
    };
  }

  /**
   * Obtener información completa de la configuración del período activo
   * Útil para mostrar en el frontend qué becas están disponibles
   */
  async getConfiguracionActual() {
    const configuraciones = await ConfiguracionBeca.listarTodas();

    // Agrupar por tipo de beca
    const porTipo = configuraciones.reduce((acc, config) => {
      const tipo = config.tipoBeca;
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push(config);
      return acc;
    }, {});

    return {
      total: configuraciones.length,
      configuraciones,
      porTipo
    };
  }
}

module.exports = new ConfiguracionBecasService();
