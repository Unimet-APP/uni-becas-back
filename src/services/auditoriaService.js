const { Auditoria } = require('../models');

/**
 * Service para gestionar el sistema de auditoría
 * Registra todas las acciones críticas del sistema para trazabilidad completa
 */
class AuditoriaService {
  /**
   * Extraer información de request para auditoría
   */
  extractRequestInfo(req) {
    return {
      usuarioId: req.user?.id || null,
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null
    };
  }

  /**
   * Registrar creación de registro
   */
  async registrarCreacion(entidad, entidadId, datosNuevos, req, descripcion = null) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'CREATE',
      entidad,
      entidadId,
      descripcion: descripcion || `Creación de ${entidad}`,
      datosNuevos,
      exitoso: true
    });
  }

  /**
   * Registrar actualización de registro
   */
  async registrarActualizacion(entidad, entidadId, datosAnteriores, datosNuevos, req, descripcion = null) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'UPDATE',
      entidad,
      entidadId,
      descripcion: descripcion || `Actualización de ${entidad}`,
      datosAnteriores,
      datosNuevos,
      exitoso: true
    });
  }

  /**
   * Registrar eliminación de registro
   */
  async registrarEliminacion(entidad, entidadId, datosAnteriores, req, descripcion = null) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'DELETE',
      entidad,
      entidadId,
      descripcion: descripcion || `Eliminación de ${entidad}`,
      datosAnteriores,
      exitoso: true
    });
  }

  /**
   * Registrar inicio de sesión
   */
  async registrarLogin(usuarioId, req, exitoso = true, mensajeError = null) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      usuarioId,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      accion: 'LOGIN',
      entidad: 'Usuario',
      entidadId: usuarioId,
      descripcion: exitoso ? 'Inicio de sesión exitoso' : 'Intento de inicio de sesión fallido',
      exitoso,
      mensajeError
    });
  }

  /**
   * Registrar cierre de sesión
   */
  async registrarLogout(usuarioId, req) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      usuarioId,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      accion: 'LOGOUT',
      entidad: 'Usuario',
      entidadId: usuarioId,
      descripcion: 'Cierre de sesión',
      exitoso: true
    });
  }

  /**
   * Registrar aprobación (de postulación, reporte, etc.)
   */
  async registrarAprobacion(entidad, entidadId, req, observaciones = null) {
    const requestInfo = this.extractRequestInfo(req);

    const metadatos = {};
    if (observaciones) {
      metadatos.observaciones = observaciones;
    }

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'APPROVE',
      entidad,
      entidadId,
      descripcion: `Aprobación de ${entidad}`,
      metadatos,
      exitoso: true
    });
  }

  /**
   * Registrar rechazo (de postulación, reporte, etc.)
   */
  async registrarRechazo(entidad, entidadId, req, motivo) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'REJECT',
      entidad,
      entidadId,
      descripcion: `Rechazo de ${entidad}`,
      metadatos: { motivo },
      exitoso: true
    });
  }

  /**
   * Registrar asignación (de supervisor, plaza, etc.)
   */
  async registrarAsignacion(entidad, entidadId, req, detalles) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'ASSIGN',
      entidad,
      entidadId,
      descripcion: `Asignación de ${entidad}`,
      metadatos: detalles,
      exitoso: true
    });
  }

  /**
   * Registrar desasignación
   */
  async registrarDesasignacion(entidad, entidadId, req, detalles) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'UNASSIGN',
      entidad,
      entidadId,
      descripcion: `Desasignación de ${entidad}`,
      metadatos: detalles,
      exitoso: true
    });
  }

  /**
   * Registrar carga de archivo
   */
  async registrarUpload(entidadId, nombreArchivo, req) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'UPLOAD',
      entidad: 'Documento',
      entidadId,
      descripcion: `Carga de documento: ${nombreArchivo}`,
      metadatos: { nombreArchivo },
      exitoso: true
    });
  }

  /**
   * Registrar descarga de archivo
   */
  async registrarDownload(entidadId, nombreArchivo, req) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'DOWNLOAD',
      entidad: 'Documento',
      entidadId,
      descripcion: `Descarga de documento: ${nombreArchivo}`,
      metadatos: { nombreArchivo },
      exitoso: true
    });
  }

  /**
   * Registrar exportación de datos
   */
  async registrarExportacion(tipoExportacion, req, detalles = {}) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'EXPORT',
      entidad: 'Reporte',
      descripcion: `Exportación de ${tipoExportacion}`,
      metadatos: detalles,
      exitoso: true
    });
  }

  /**
   * Registrar importación de datos
   */
  async registrarImportacion(tipoImportacion, req, detalles = {}) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion: 'IMPORT',
      entidad: 'Datos',
      descripcion: `Importación de ${tipoImportacion}`,
      metadatos: detalles,
      exitoso: true
    });
  }

  /**
   * Registrar acción fallida
   */
  async registrarFallo(accion, entidad, req, mensajeError, entidadId = null) {
    const requestInfo = this.extractRequestInfo(req);

    return await Auditoria.registrar({
      ...requestInfo,
      accion,
      entidad,
      entidadId,
      descripcion: `Fallo al ejecutar ${accion} en ${entidad}`,
      exitoso: false,
      mensajeError
    });
  }

  /**
   * Obtener historial de auditoría de un usuario
   */
  async getHistorialUsuario(usuarioId, opciones = {}) {
    return await Auditoria.getPorUsuario(usuarioId, opciones);
  }

  /**
   * Obtener historial de auditoría de una entidad
   */
  async getHistorialEntidad(entidad, entidadId, opciones = {}) {
    return await Auditoria.getPorEntidad(entidad, entidadId, opciones);
  }

  /**
   * Obtener auditorías recientes
   */
  async getRecientes(opciones = {}) {
    return await Auditoria.getRecientes(opciones);
  }

  /**
   * Obtener auditorías fallidas
   */
  async getFallidas(opciones = {}) {
    return await Auditoria.getFallidas(opciones);
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getEstadisticas(fechaDesde, fechaHasta) {
    return await Auditoria.getEstadisticas(fechaDesde, fechaHasta);
  }

  /**
   * Limpiar auditorías antiguas (para mantenimiento)
   */
  async limpiarAntiguas(diasAntiguedad = 2555) {
    return await Auditoria.limpiarAntiguas(diasAntiguedad);
  }
}

module.exports = new AuditoriaService();
