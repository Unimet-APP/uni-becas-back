const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');
const emailService = require('../services/emailService');
const testOrientacionService = require('../services/testOrientacionService');
const { SesionesTestOrientacion, ResultadosOrientacion, Usuario, Notificaciones } = require('../models');
const { Op } = require('sequelize');

class CampanasController {

  /**
   * Función auxiliar para segmentar estudiantes (lógica compartida)
   * @private
   */
  _segmentarEstudiantesLogica = async (filtros) => {
    const {
      carreraInteres,
      nivelRiesgo,
      estadoProceso,
      perfilHolland,
      grupo
    } = filtros;

    console.log('🔍 Segmentando estudiantes con filtros:', filtros);

    // Obtener todos los estudiantes con tests completados
    const historial = await testOrientacionService.obtenerTodosLosTests();

    // Agrupar por usuario y filtrar
    const agrupadoPorUsuario = {};

    historial.forEach(sesion => {
      const usuarioId = sesion.usuario_id;

      if (!agrupadoPorUsuario[usuarioId]) {
        agrupadoPorUsuario[usuarioId] = {
          id: sesion.usuario.id,
          nombre: sesion.usuario.nombre,
          email: sesion.usuario.email,
          sesiones: [],
          perfilDominante: null,
          codigoHolland: null,
          recomendacionesCarreras: [],
          ultimaFechaTest: null,
          totalSesiones: 0,
        };
      }

      agrupadoPorUsuario[usuarioId].sesiones.push(sesion);
      agrupadoPorUsuario[usuarioId].totalSesiones++;

      // Obtener resultado más reciente
      const resultado = Array.isArray(sesion.resultado)
        ? sesion.resultado[0]
        : sesion.resultado;

      if (resultado) {
        const fechaResultado = resultado.fecha_generacion || sesion.fecha_completada;
        const fechaActual = agrupadoPorUsuario[usuarioId].ultimaFechaTest;

        if (!fechaActual || (fechaResultado && fechaResultado > fechaActual)) {
          if (resultado.perfil_dominante) {
            agrupadoPorUsuario[usuarioId].perfilDominante = resultado.perfil_dominante;
          }
          if (resultado.codigo_holland) {
            agrupadoPorUsuario[usuarioId].codigoHolland = resultado.codigo_holland;
          }

          // Manejar recomendaciones
          let recomendaciones = resultado.recomendaciones_carreras;
          if (typeof recomendaciones === 'string') {
            try {
              recomendaciones = JSON.parse(recomendaciones);
            } catch (e) {
              recomendaciones = [];
            }
          }

          if (Array.isArray(recomendaciones) && recomendaciones.length > 0) {
            agrupadoPorUsuario[usuarioId].recomendacionesCarreras = recomendaciones;
          }

          agrupadoPorUsuario[usuarioId].ultimaFechaTest = fechaResultado;
        }
      }
    });

    // Convertir a array y aplicar filtros
    let estudiantesFiltrados = Object.values(agrupadoPorUsuario);

    // Carreras por facultad UNIMET
    const carrerasFacultades = {
      facultad_ingenieria: ['ingeniería civil', 'ingeniería mecánica', 'ingeniería producción', 'ingeniería química', 'ingeniería de sistemas', 'ingeniería eléctrica', 'ingeniería', 'sistemas', 'computación'],
      facultad_ciencias_economicas: ['ciencias administrativas', 'administración', 'economía empresarial', 'economía', 'contaduría pública', 'contaduría', 'negocios', 'finanzas'],
      facultad_ciencias: ['psicología', 'matemáticas industriales', 'matemáticas', 'ciencias'],
      facultad_humanidades: ['educación', 'idiomas modernos', 'idiomas', 'comunicación social', 'comunicación', 'turismo sostenible', 'turismo', 'periodismo'],
      facultad_estudios_juridicos: ['derecho', 'estudios liberales', 'estudios internacionales', 'relaciones internacionales', 'ciencias políticas', 'leyes']
    };

    // Filtro por facultad predefinida
    if (grupo && carrerasFacultades[grupo]) {
      const carrerasFacultad = carrerasFacultades[grupo];
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const carreras = est.recomendacionesCarreras.map(c => c.name?.toLowerCase() || '').join(' ');
        return carrerasFacultad.some(carrera => carreras.includes(carrera));
      });
    }

    // Compatibilidad con grupos antiguos (por si acaso)
    if (grupo === 'ingenieria') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const carreras = est.recomendacionesCarreras.map(c => c.name?.toLowerCase() || '').join(' ');
        return carreras.includes('ingeniería') || carreras.includes('sistemas') || carreras.includes('computación');
      });
    } else if (grupo === 'artes') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const carreras = est.recomendacionesCarreras.map(c => c.name?.toLowerCase() || '').join(' ');
        return carreras.includes('diseño') || carreras.includes('arquitectura') || carreras.includes('arte');
      });
    } else if (grupo === 'ciencias_sociales') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const carreras = est.recomendacionesCarreras.map(c => c.name?.toLowerCase() || '').join(' ');
        return carreras.includes('psicología') || carreras.includes('derecho') || carreras.includes('educación') || carreras.includes('comunicación');
      });
    }

    // Filtro por carrera de interés
    if (carreraInteres && carreraInteres !== 'todas') {
      // Función para normalizar texto (quitar acentos y convertir a minúsculas)
      const normalizar = (texto) => texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos

      // Convertir valor del select (ej: "ingenieria_sistemas") a términos de búsqueda
      const terminosBusqueda = normalizar(carreraInteres).replace(/_/g, ' ').split(' ');

      estudiantesFiltrados = estudiantesFiltrados.filter(est =>
        est.recomendacionesCarreras.some(c => {
          const nombreCarreraNorm = normalizar(c.name || '');
          // Buscar si todos los términos están presentes en el nombre de la carrera
          return terminosBusqueda.every(termino => nombreCarreraNorm.includes(termino));
        })
      );
    }

    // Filtro por nivel de riesgo (basado en número de sesiones y claridad de perfil)
    if (nivelRiesgo && nivelRiesgo !== 'todos') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const riesgo = calcularNivelRiesgo(est.totalSesiones, est.perfilDominante);
        return riesgo.toLowerCase() === nivelRiesgo.toLowerCase();
      });
    }

    // Filtro por estado del proceso
    if (estadoProceso && estadoProceso !== 'todos') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est => {
        const estado = calcularEstadoProceso(est.totalSesiones, est.ultimaFechaTest);
        return estado.toLowerCase().includes(estadoProceso.toLowerCase());
      });
    }

    // Filtro por perfil Holland
    if (perfilHolland && perfilHolland !== 'todos') {
      estudiantesFiltrados = estudiantesFiltrados.filter(est =>
        est.codigoHolland?.includes(perfilHolland.toUpperCase())
      );
    }

    // Formatear respuesta
    const estudiantesFormateados = estudiantesFiltrados.map(est => ({
      id: est.id,
      nombre: est.nombre,
      email: est.email,
      perfilDominante: est.perfilDominante || 'No disponible',
      codigoHolland: est.codigoHolland || 'N/A',
      carrerasInteres: est.recomendacionesCarreras.slice(0, 3).map(c => c.name),
      totalSesiones: est.totalSesiones,
      ultimaFechaTest: est.ultimaFechaTest,
      nivelRiesgo: calcularNivelRiesgo(est.totalSesiones, est.perfilDominante),
      estadoProceso: calcularEstadoProceso(est.totalSesiones, est.ultimaFechaTest),
    }));

    console.log(`✅ Segmentación completada: ${estudiantesFormateados.length} estudiantes encontrados`);

    return {
      total: estudiantesFormateados.length,
      estudiantes: estudiantesFormateados,
      filtrosAplicados: filtros,
    };
  }

  /**
   * POST /api/v1/campanas/segmentar-estudiantes
   * Segmenta estudiantes según filtros para preparar una campaña
   */
  segmentarEstudiantes = asyncHandler(async (req, res) => {
    const resultado = await this._segmentarEstudiantesLogica(req.body);
    return sendSuccess(res, resultado, 'Estudiantes segmentados exitosamente');
  });

  /**
   * POST /api/v1/campanas/enviar
   * Envía una campaña masiva de correos
   */
  enviarCampana = asyncHandler(async (req, res) => {
    const {
      destinatarios, // Array de IDs de estudiantes o emails
      asunto,
      contenido,
      titulo,
      ctaTexto,
      ctaUrl,
      usarTemplate = true,
      templateId = 'clasico'
    } = req.body;

    if (!destinatarios || destinatarios.length === 0) {
      throw new ApiError(400, 'Debe especificar al menos un destinatario');
    }

    if (!asunto || !contenido) {
      throw new ApiError(400, 'Debe especificar asunto y contenido del correo');
    }

    console.log(`📧 Preparando campaña para ${destinatarios.length} destinatarios`);

    // Obtener información completa de los destinatarios
    let destinatariosCompletos = [];

    if (typeof destinatarios[0] === 'string' && destinatarios[0].includes('@')) {
      // Si son emails directos
      destinatariosCompletos = destinatarios.map(email => ({ email, nombre: 'Estudiante' }));
    } else {
      // Si son IDs, buscar en la base de datos
      const usuarios = await Usuario.findAll({
        where: {
          id: {
            [Op.in]: destinatarios
          }
        },
        attributes: ['id', 'nombre', 'email']
      });

      destinatariosCompletos = usuarios.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email
      }));
    }

    // Generar template HTML
    let htmlTemplate;
    if (usarTemplate) {
      htmlTemplate = emailService.getCampañaGenericaTemplate(
        titulo || asunto,
        contenido,
        ctaTexto,
        ctaUrl,
        templateId
      );
    } else {
      htmlTemplate = contenido;
    }

    // Enviar campaña masiva
    const resultados = await emailService.sendCampañaMasiva(
      destinatariosCompletos,
      asunto,
      htmlTemplate
    );

    // Crear notificaciones en la base de datos para los destinatarios exitosos
    try {
      const notificacionesData = destinatariosCompletos
        .filter(dest => dest.id) // Solo crear notificaciones si tenemos el ID del usuario
        .map(dest => ({
          usuario_id: dest.id,
          titulo: asunto,
          contenido: contenido,
          tipo: 'campana',
          metadata: ctaUrl ? { url: ctaUrl, cta: ctaTexto || 'Ver más' } : null
        }));

      if (notificacionesData.length > 0) {
        await Notificaciones.bulkCreate(notificacionesData);
        console.log(`✅ ${notificacionesData.length} notificaciones creadas en el sistema`);
      }
    } catch (error) {
      console.error('⚠️ Error al crear notificaciones:', error.message);
      // No lanzar error, las notificaciones son secundarias al envío de correos
    }

    return sendSuccess(res, {
      total: resultados.total,
      exitosos: resultados.exitosos,
      fallidos: resultados.fallidos,
      tasaExito: ((resultados.exitosos / resultados.total) * 100).toFixed(2) + '%',
      detalles: resultados.detalles,
    }, `Campaña enviada: ${resultados.exitosos}/${resultados.total} correos entregados`);
  });

  /**
   * POST /api/v1/campanas/enviar-grupo-predefinido
   * Envía campaña a un grupo predefinido por facultad UNIMET
   */
  enviarGrupoPredefinido = asyncHandler(async (req, res) => {
    const {
      grupo, // 'facultad_ingenieria', 'facultad_ciencias_economicas', 'facultad_ciencias', 'facultad_humanidades', 'facultad_estudios_juridicos'
      asunto,
      contenido,
      titulo,
      ctaTexto,
      ctaUrl,
      templateId = 'clasico'
    } = req.body;

    if (!grupo) {
      throw new ApiError(400, 'Debe especificar un grupo predefinido');
    }

    // Segmentar estudiantes del grupo usando la función auxiliar
    const segmentacion = await this._segmentarEstudiantesLogica({ grupo });

    const estudiantes = segmentacion.estudiantes;

    if (estudiantes.length === 0) {
      throw new ApiError(404, 'No se encontraron estudiantes para este grupo');
    }

    // Preparar destinatarios
    const destinatariosCompletos = estudiantes.map(est => ({
      id: est.id,
      nombre: est.nombre,
      email: est.email,
      perfilDominante: est.perfilDominante,
      carrerasInteres: est.carrerasInteres.join(', ')
    }));

    // Generar template HTML con personalización
    const htmlTemplate = emailService.getCampañaGenericaTemplate(
      titulo || asunto,
      contenido,
      ctaTexto,
      ctaUrl,
      templateId
    );

    // Enviar campaña masiva
    const resultados = await emailService.sendCampañaMasiva(
      destinatariosCompletos,
      asunto,
      htmlTemplate
    );

    // Crear notificaciones en la base de datos para los destinatarios
    try {
      const notificacionesData = estudiantes.map(est => ({
        usuario_id: est.id,
        titulo: asunto,
        contenido: contenido,
        tipo: 'campana',
        metadata: ctaUrl ? { url: ctaUrl, cta: ctaTexto || 'Ver más' } : null
      }));

      await Notificaciones.bulkCreate(notificacionesData);
      console.log(`✅ ${notificacionesData.length} notificaciones creadas para el grupo "${grupo}"`);
    } catch (error) {
      console.error('⚠️ Error al crear notificaciones:', error.message);
      // No lanzar error, las notificaciones son secundarias al envío de correos
    }

    return sendSuccess(res, {
      grupo,
      total: resultados.total,
      exitosos: resultados.exitosos,
      fallidos: resultados.fallidos,
      tasaExito: ((resultados.exitosos / resultados.total) * 100).toFixed(2) + '%',
    }, `Campaña al grupo "${grupo}" enviada exitosamente`);
  });

  /**
   * POST /api/v1/campanas/enviar-prueba
   * Envía un correo de prueba al usuario autenticado
   */
  enviarCorreoPrueba = asyncHandler(async (req, res) => {
    const usuario = req.user; // Usuario autenticado
    const { asunto = "Correo de Prueba - Sistema de Campañas" } = req.body;

    console.log(`📧 Enviando correo de prueba a ${usuario.email}`);

    // Crear un template de prueba
    const contenido = `
      <p>¡Hola <strong>${usuario.nombre}</strong>!</p>
      <p>Este es un correo de prueba del sistema de campañas masivas.</p>
      <p>Si recibes este correo, significa que la configuración SMTP2GO está funcionando correctamente.</p>
      <ul>
        <li>✅ Servidor SMTP conectado</li>
        <li>✅ Credenciales válidas</li>
        <li>✅ El sistema puede enviar correos</li>
      </ul>
      <p>Ahora puedes enviar campañas masivas con confianza.</p>
    `;

    const template = emailService.getCampañaGenericaTemplate(
      'Prueba de Campaña',
      contenido,
      'Ver Dashboard',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    );

    // Enviar solo al usuario actual
    const destinatarios = [{
      email: usuario.email,
      nombre: usuario.nombre
    }];

    try {
      const resultado = await emailService.sendCampañaMasiva(
        destinatarios,
        asunto,
        template
      );

      return sendSuccess(res, {
        mensaje: `Correo de prueba enviado a ${usuario.email}`,
        resultado: {
          total: resultado.total,
          exitosos: resultado.exitosos,
          fallidos: resultado.fallidos,
          tasaExito: `${((resultado.exitosos / resultado.total) * 100).toFixed(1)}%`
        }
      }, 'Correo de prueba enviado exitosamente');

    } catch (error) {
      console.error('Error al enviar correo de prueba:', error);
      throw new ApiError(500, 'Error al enviar correo de prueba: ' + error.message);
    }
  });

  /**
   * GET /api/v1/campanas/estadisticas
   * Obtiene estadísticas de los grupos predefinidos
   */
  obtenerEstadisticas = asyncHandler(async (req, res) => {
    console.log('📊 Obteniendo estadísticas de campañas por facultad...');

    // Segmentar por las 5 facultades de la UNIMET
    const facultadIngenieriaResult = await this._segmentarEstudiantesLogica({ grupo: 'facultad_ingenieria' });
    const facultadCienciasEconomicasResult = await this._segmentarEstudiantesLogica({ grupo: 'facultad_ciencias_economicas' });
    const facultadCienciasResult = await this._segmentarEstudiantesLogica({ grupo: 'facultad_ciencias' });
    const facultadHumanidadesResult = await this._segmentarEstudiantesLogica({ grupo: 'facultad_humanidades' });
    const facultadEstudiosJuridicosResult = await this._segmentarEstudiantesLogica({ grupo: 'facultad_estudios_juridicos' });

    const stats = {
      facultadIngenieria: facultadIngenieriaResult.total,
      facultadCienciasEconomicas: facultadCienciasEconomicasResult.total,
      facultadCiencias: facultadCienciasResult.total,
      facultadHumanidades: facultadHumanidadesResult.total,
      facultadEstudiosJuridicos: facultadEstudiosJuridicosResult.total,
      otros: 0,
      total: 0
    };

    // Calcular total
    const historial = await testOrientacionService.obtenerTodosLosTests();
    const usuariosUnicos = new Set();
    historial.forEach(sesion => {
      usuariosUnicos.add(sesion.usuario_id);
    });

    stats.total = usuariosUnicos.size;
    const sumaFacultades = stats.facultadIngenieria + stats.facultadCienciasEconomicas +
                          stats.facultadCiencias + stats.facultadHumanidades + stats.facultadEstudiosJuridicos;
    stats.otros = Math.max(0, stats.total - sumaFacultades);

    console.log('📊 Estadísticas por facultad calculadas:', stats);

    return sendSuccess(res, stats, 'Estadísticas obtenidas exitosamente');
  });
}

/**
 * Función auxiliar para calcular nivel de riesgo
 */
function calcularNivelRiesgo(totalSesiones, perfilDominante) {
  if (totalSesiones > 2) return "Bajo";
  if (perfilDominante && perfilDominante.length > 10) return "Bajo";
  if (totalSesiones === 1) return "Alto";
  return "Medio";
}

/**
 * Función auxiliar para calcular estado del proceso
 */
function calcularEstadoProceso(totalSesiones, ultimaFechaTest) {
  if (!ultimaFechaTest) return "Sin Iniciar";

  const daysSinceLastTest = Math.floor(
    (new Date().getTime() - new Date(ultimaFechaTest).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastTest > 30) return "Requiere Asesoría";
  if (daysSinceLastTest > 14) return "En Seguimiento";
  if (totalSesiones >= 2) return "Orientación Completada";
  return "En Proceso";
}

module.exports = new CampanasController();
