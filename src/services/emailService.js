const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configurar el transportador de Nodemailer
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true para puerto 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verificar configuración del transportador
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Servidor de email configurado correctamente');
    } catch (error) {
      console.error('Error al configurar servidor de email:', error);
      console.warn('El sistema funcionará pero no podrá enviar correos electrónicos');
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   * @param {string} email - Email del destinatario
   * @param {string} token - Token de reset de contraseña
   * @param {string} nombre - Nombre del usuario
   */
  async sendPasswordResetEmail(email, token, nombre) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const expiresInMinutes = process.env.RESET_PASSWORD_EXPIRES_MIN || 15;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperación de Contraseña - Sistema de Becas UNIMET',
      html: this.getPasswordResetTemplate(nombre, resetUrl, expiresInMinutes)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de recuperación enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de recuperación a ${email}:`, error);
      throw new Error('No se pudo enviar el email de recuperación');
    }
  }

  /**
   * Enviar email de confirmación de cambio de contraseña
   * @param {string} email - Email del destinatario
   * @param {string} nombre - Nombre del usuario
   */
  async sendPasswordChangedConfirmation(email, nombre) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Contraseña Actualizada - Sistema de Becas UNIMET',
      html: this.getPasswordChangedTemplate(nombre)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de confirmación de cambio enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de confirmación a ${email}:`, error);
      // No lanzar error aquí, ya que el cambio de contraseña fue exitoso
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de aprobación de cuenta por administrador
   * @param {string} email - Email del destinatario
   * @param {string} nombre - Nombre del usuario
   */
  async sendAccountApprovedEmail(email, nombre) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '¡Cuenta Aprobada! - Sistema de Becas UNIMET',
      html: this.getAccountApprovedTemplate(nombre, loginUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de aprobación de cuenta enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de aprobación a ${email}:`, error);
      throw new Error('No se pudo enviar el email de aprobación');
    }
  }

  /**
   * Enviar email de bienvenida para estudiantes (verificación automática)
   * @param {string} email - Email del destinatario
   * @param {string} nombre - Nombre del estudiante
   */
  async sendStudentWelcomeEmail(email, nombre) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '¡Bienvenido! - Sistema de Becas UNIMET',
      html: this.getStudentWelcomeTemplate(nombre, loginUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de bienvenida enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de bienvenida a ${email}:`, error);
      throw new Error('No se pudo enviar el email de bienvenida');
    }
  }

  /**
   * Template HTML para email de recuperación de contraseña
   * @param {string} nombre - Nombre del usuario
   * @param {string} resetUrl - URL de reset con token
   * @param {number} expiresInMinutes - Minutos hasta expiración
   * @returns {string} HTML del email
   */
  getPasswordResetTemplate(nombre, resetUrl, expiresInMinutes) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #0066cc;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #0066cc;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .content {
          margin: 20px 0;
        }
        .content p {
          margin: 15px 0;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .reset-button {
          display: inline-block;
          padding: 15px 40px;
          background-color: #0066cc;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .reset-button:hover {
          background-color: #0052a3;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          margin: 5px 0;
          color: #856404;
          font-size: 14px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .footer a {
          color: #0066cc;
          text-decoration: none;
        }
        .alternative-link {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
          word-break: break-all;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Becas</h1>
          <p>Universidad Metropolitana</p>
        </div>

        <div class="content">
          <p>Hola <strong>${nombre}</strong>,</p>

          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Becas de la Universidad Metropolitana.</p>

          <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>

          <div class="button-container">
            <a href="${resetUrl}" class="reset-button">Restablecer Contraseña</a>
          </div>

          <div class="warning">
            <p><strong>⏱️ Tiempo de expiración:</strong> Este enlace expirará en <strong>${expiresInMinutes} minutos</strong>.</p>
            <p><strong>🔒 Seguridad:</strong> Si no solicitaste este cambio, ignora este correo. Tu contraseña permanecerá sin cambios.</p>
          </div>

          <p style="margin-top: 20px;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>

          <div class="alternative-link">
            ${resetUrl}
          </div>
        </div>

        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Sistema de Gestión de Becas - Universidad Metropolitana</p>
          <p>© ${new Date().getFullYear()} UNIMET. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para email de confirmación de cambio de contraseña
   * @param {string} nombre - Nombre del usuario
   * @returns {string} HTML del email
   */
  getPasswordChangedTemplate(nombre) {
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte.becas@unimet.edu.ve';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contraseña Actualizada</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #28a745;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #28a745;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .success-badge {
          text-align: center;
          margin: 20px 0;
        }
        .success-badge span {
          display: inline-block;
          background-color: #28a745;
          color: white;
          padding: 10px 20px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: bold;
        }
        .content {
          margin: 20px 0;
        }
        .content p {
          margin: 15px 0;
        }
        .security-alert {
          background-color: #f8d7da;
          border-left: 4px solid #dc3545;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .security-alert p {
          margin: 5px 0;
          color: #721c24;
          font-size: 14px;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          color: #004085;
          font-size: 14px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Becas</h1>
          <p>Universidad Metropolitana</p>
        </div>

        <div class="success-badge">
          <span>✓ Contraseña Actualizada</span>
        </div>

        <div class="content">
          <p>Hola <strong>${nombre}</strong>,</p>

          <p>Te confirmamos que la contraseña de tu cuenta en el Sistema de Becas de la Universidad Metropolitana ha sido actualizada exitosamente.</p>

          <div class="info-box">
            <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-ES', {
              timeZone: 'America/Caracas',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p><strong>🔐 Estado:</strong> Tu cuenta está segura y puedes iniciar sesión con tu nueva contraseña.</p>
          </div>

          <div class="security-alert">
            <p><strong>⚠️ ¿No realizaste este cambio?</strong></p>
            <p>Si no fuiste tú quien cambió la contraseña, por favor contacta inmediatamente a nuestro equipo de soporte en:</p>
            <p><strong>${supportEmail}</strong></p>
          </div>

          <p style="margin-top: 30px;">Gracias por usar el Sistema de Gestión de Becas de la Universidad Metropolitana.</p>
        </div>

        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Sistema de Gestión de Becas - Universidad Metropolitana</p>
          <p>© ${new Date().getFullYear()} UNIMET. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para email de cuenta aprobada por administrador
   * @param {string} nombre - Nombre del usuario
   * @param {string} loginUrl - URL de login
   * @returns {string} HTML del email
   */
  getAccountApprovedTemplate(nombre, loginUrl) {
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte.becas@unimet.edu.ve';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cuenta Aprobada</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #28a745;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #28a745;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .celebration-badge {
          text-align: center;
          margin: 20px 0;
          font-size: 64px;
        }
        .success-badge {
          text-align: center;
          margin: 20px 0;
        }
        .success-badge span {
          display: inline-block;
          background-color: #28a745;
          color: white;
          padding: 12px 30px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: bold;
        }
        .content {
          margin: 20px 0;
        }
        .content p {
          margin: 15px 0;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          color: #004085;
          font-size: 14px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .login-button {
          display: inline-block;
          padding: 15px 40px;
          background-color: #28a745;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .login-button:hover {
          background-color: #218838;
        }
        .next-steps {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .next-steps h3 {
          color: #0066cc;
          margin-top: 0;
        }
        .next-steps ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .next-steps li {
          margin: 10px 0;
          line-height: 1.6;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Becas</h1>
          <p>Universidad Metropolitana</p>
        </div>

        <div class="celebration-badge">
          🎉
        </div>

        <div class="success-badge">
          <span>✓ Cuenta Aprobada</span>
        </div>

        <div class="content">
          <p>Hola <strong>${nombre}</strong>,</p>

          <p>¡Excelentes noticias! Tu cuenta en el Sistema de Becas de la Universidad Metropolitana ha sido <strong>aprobada por un administrador</strong> y ya puedes acceder al sistema.</p>

          <div class="info-box">
            <p><strong>📅 Fecha de aprobación:</strong> ${new Date().toLocaleString('es-ES', {
              timeZone: 'America/Caracas',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p><strong>✅ Estado:</strong> Cuenta activa y lista para usar</p>
          </div>

          <div class="next-steps">
            <h3>🚀 Próximos Pasos</h3>
            <ul>
              <li><strong>Inicia sesión</strong> con tu email y la contraseña que estableciste al registrarte</li>
              <li><strong>Completa tu perfil</strong> con toda la información requerida</li>
              <li><strong>Explora el sistema</strong> para conocer todas las funcionalidades disponibles</li>
            </ul>
          </div>

          <div class="button-container">
            <a href="${loginUrl}" class="login-button">Iniciar Sesión</a>
          </div>

          <p style="margin-top: 30px;">Ahora puedes:</p>
          <ul>
            <li>✅ Acceder a todas las funcionalidades del sistema</li>
            <li>✅ Gestionar tus postulaciones de becas</li>
            <li>✅ Ver y actualizar tu información personal</li>
            <li>✅ Realizar todas las operaciones según tu rol</li>
          </ul>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos:</p>
          <p style="text-align: center; margin: 10px 0;"><strong>${supportEmail}</strong></p>
        </div>

        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Sistema de Gestión de Becas - Universidad Metropolitana</p>
          <p>© ${new Date().getFullYear()} UNIMET. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para email de bienvenida de estudiantes
   * @param {string} nombre - Nombre del estudiante
   * @param {string} loginUrl - URL de login
   * @returns {string} HTML del email
   */
  getStudentWelcomeTemplate(nombre, loginUrl) {
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte.becas@unimet.edu.ve';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Bienvenido!</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #0066cc;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #0066cc;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .celebration-badge {
          text-align: center;
          margin: 20px 0;
          font-size: 64px;
        }
        .success-badge {
          text-align: center;
          margin: 20px 0;
        }
        .success-badge span {
          display: inline-block;
          background-color: #0066cc;
          color: white;
          padding: 12px 30px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: bold;
        }
        .content {
          margin: 20px 0;
        }
        .content p {
          margin: 15px 0;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          color: #004085;
          font-size: 14px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .login-button {
          display: inline-block;
          padding: 15px 40px;
          background-color: #0066cc;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .login-button:hover {
          background-color: #0052a3;
        }
        .next-steps {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .next-steps h3 {
          color: #0066cc;
          margin-top: 0;
        }
        .next-steps ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .next-steps li {
          margin: 8px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido al Sistema de Becas!</h1>
            <p>Universidad Metropolitana</p>
          </div>

          <div class="celebration-badge">
            🎓
          </div>

          <div class="success-badge">
            <span>✓ CUENTA CREADA EXITOSAMENTE</span>
          </div>

          <div class="content">
            <p>Hola <strong>${nombre}</strong>,</p>

            <p>¡Felicitaciones! Tu cuenta de estudiante ha sido creada exitosamente en el Sistema de Gestión de Becas de la Universidad Metropolitana.</p>

            <p><strong>¡Ya puedes comenzar a usar el sistema!</strong> Tu cuenta ha sido verificada automáticamente y está lista para que inicies sesión.</p>
          </div>

          <div class="info-box">
            <p><strong>📅 Fecha de registro:</strong> ${new Date().toLocaleString('es-VE', {
              dateStyle: 'full',
              timeStyle: 'short',
              timeZone: 'America/Caracas'
            })}</p>
            <p><strong>✅ Estado:</strong> Cuenta activa y verificada</p>
          </div>

          <div class="next-steps">
            <h3>🚀 Próximos Pasos</h3>
            <ul>
              <li><strong>Inicia sesión</strong> con tu email y la contraseña que estableciste al registrarte</li>
              <li><strong>Explora el sistema</strong> y conoce las becas disponibles</li>
              <li><strong>Completa tu perfil</strong> con toda la información requerida</li>
              <li><strong>Postula a las becas</strong> para las que seas elegible</li>
            </ul>
          </div>

          <div class="button-container">
            <a href="${loginUrl}" class="login-button">Iniciar Sesión Ahora</a>
          </div>

          <p style="margin-top: 30px;">Ahora puedes:</p>
          <ul>
            <li>✅ Gestionar tus postulaciones de becas</li>
            <li>✅ Ver el estado de tus solicitudes</li>
            <li>✅ Actualizar tu información personal</li>
            <li>✅ Consultar las becas disponibles</li>
          </ul>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos:</p>
          <p style="text-align: center; margin: 10px 0;"><strong>${supportEmail}</strong></p>
        </div>

        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Sistema de Gestión de Becas - Universidad Metropolitana</p>
          <p>© ${new Date().getFullYear()} UNIMET. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Enviar email de postulación aprobada con cuenta creada
   * @param {string} email - Email del destinatario
   * @param {string} nombre - Nombre del usuario
   * @param {string} tipoBeca - Tipo de beca aprobada
   * @param {string} passwordTemporal - Contraseña temporal generada (opcional, solo si se creó usuario nuevo)
   */
  async sendPostulacionAprobadaEmail(email, nombre, tipoBeca, passwordTemporal = null) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '¡Felicidades! Tu postulación ha sido aprobada - Sistema de Becas UNIMET',
      html: this.getPostulacionAprobadaTemplate(nombre, tipoBeca, loginUrl, email, passwordTemporal)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de postulación aprobada enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de postulación aprobada a ${email}:`, error);
      throw new Error('No se pudo enviar el email de postulación aprobada');
    }
  }

  /**
   * Enviar email genérico (para usos futuros)
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Email del destinatario
   * @param {string} options.subject - Asunto del email
   * @param {string} options.html - Contenido HTML del email
   * @param {string} [options.text] - Contenido en texto plano (opcional)
   */
  async sendEmail({ to, subject, html, text }) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado a ${to}`, { messageId: info.messageId, subject });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email a ${to}:`, error);
      throw new Error('No se pudo enviar el email');
    }
  }

  /**
   * Notificar postulación rechazada
   */
  async sendPostulacionRechazadaEmail(email, nombre, tipoBeca, motivo) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Actualización sobre tu Postulación - Sistema de Becas UNIMET',
      html: this.getPostulacionRechazadaTemplate(nombre, tipoBeca, motivo)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de postulación rechazada enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de postulación rechazada a ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar asignación de supervisor
   */
  async sendAsignacionSupervisorEmail(estudianteEmail, estudianteNombre, supervisorNombre, supervisorEmail, supervisorTelefono) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: estudianteEmail,
      subject: '👨‍🏫 Asignación de Supervisor - Sistema de Becas UNIMET',
      html: this.getAsignacionSupervisorTemplate(estudianteNombre, supervisorNombre, supervisorEmail, supervisorTelefono)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de asignación de supervisor enviado a ${estudianteEmail}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de asignación a ${estudianteEmail}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar evaluación completada
   */
  async sendEvaluacionCompletadaEmail(estudianteEmail, estudianteNombre, satisfactoria, observaciones) {
    const emoji = satisfactoria ? '✅' : '⚠️';
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: estudianteEmail,
      subject: `${emoji} Evaluación Completada - Sistema de Becas UNIMET`,
      html: this.getEvaluacionCompletadaTemplate(estudianteNombre, satisfactoria, observaciones)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de evaluación completada enviado a ${estudianteEmail}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de evaluación a ${estudianteEmail}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar reporte de actividades rechazado
   */
  async sendReporteRechazadoEmail(email, nombre, reporteData, motivo) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `Sistema de Becas UNIMET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reporte de Actividades Rechazado - Sistema de Becas UNIMET',
      html: this.getReporteRechazadoTemplate(nombre, reporteData, motivo)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de reporte rechazado enviado a ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error al enviar email de reporte rechazado a ${email}:`, error);
      throw new Error('No se pudo enviar el email de notificación de rechazo');
    }
  }

  /**
   * Template HTML para postulación rechazada
   */
  getPostulacionRechazadaTemplate(nombre, tipoBeca, motivo) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Actualización de Postulación</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Actualización sobre tu postulación</h2>
        <p>Estimado/a <strong>${nombre}</strong>,</p>
        <p>Lamentamos informarte que tu postulación a la beca ${tipoBeca} no ha sido aprobada en esta ocasión.</p>
        ${motivo ? `
        <div class="warning-box">
          <p><strong>Motivo:</strong> ${motivo}</p>
        </div>
        ` : ''}
        <div class="info-box">
          <p><strong>Puedes postularte nuevamente en el próximo período.</strong></p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para asignación de supervisor
   */
  getAsignacionSupervisorTemplate(estudianteNombre, supervisorNombre, supervisorEmail, supervisorTelefono) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Asignación de Supervisor</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Se te ha asignado un supervisor</h2>
        <p>Estimado/a <strong>${estudianteNombre}</strong>,</p>
        <div class="info-box">
          <p><strong>Tu supervisor asignado es:</strong></p>
          <p><strong>Nombre:</strong> ${supervisorNombre}</p>
          <p><strong>Email:</strong> ${supervisorEmail}</p>
          ${supervisorTelefono ? `<p><strong>Teléfono:</strong> ${supervisorTelefono}</p>` : ''}
        </div>
        <p>Te recomendamos contactar a tu supervisor pronto para coordinar los detalles de tu ayudantía.</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para evaluación completada
   */
  getEvaluacionCompletadaTemplate(estudianteNombre, satisfactoria, observaciones) {
    const resultado = satisfactoria ? 'Satisfactoria' : 'No Satisfactoria';
    const boxClass = satisfactoria ? 'success-box' : 'warning-box';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Evaluación Completada</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Evaluación de Desempeño Completada</h2>
        <p>Estimado/a <strong>${estudianteNombre}</strong>,</p>
        <div class="${boxClass}">
          <p><strong>Resultado de tu evaluación: ${resultado}</strong></p>
        </div>
        ${satisfactoria ? `
          <p>¡Felicidades! Tu desempeño ha sido evaluado como satisfactorio.</p>
          <div class="info-box">
            <p><strong>Beneficio:</strong> Se aplicará el descuento del 25% sobre el costo de tus asignaturas.</p>
          </div>
        ` : `
          <p>Tu desempeño requiere mejoras. Te recomendamos hablar con tu supervisor.</p>
        `}
        ${observaciones ? `
          <div class="info-box">
            <p><strong>Observaciones:</strong> ${observaciones}</p>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para reporte de actividades rechazado
   */
  getReporteRechazadoTemplate(nombre, reporteData, motivo) {
    const { numeroSemana, periodoAcademico } = reporteData;
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte.becas@unimet.edu.ve';
    const sistemaUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Actividades Rechazado</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #0066cc;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #0066cc;
          margin: 0;
          font-size: 24px;
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .error-box {
          background-color: #f8d7da;
          border-left: 4px solid #dc3545;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .action-box {
          background-color: #d1ecf1;
          border-left: 4px solid #17a2b8;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #0066cc;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
          margin: 10px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reporte de Actividades Rechazado</h1>
        </div>

        <p>Estimado/a <strong>${nombre}</strong>,</p>

        <p>Lamentamos informarte que tu reporte de actividades ha sido rechazado por tu supervisor.</p>

        <div class="error-box">
          <p><strong>Detalles del Reporte:</strong></p>
          <ul>
            <li><strong>Semana:</strong> ${numeroSemana}</li>
            <li><strong>Período:</strong> ${periodoAcademico}</li>
          </ul>
        </div>

        <div class="warning-box">
          <p><strong>Motivo del Rechazo:</strong></p>
          <p>${motivo}</p>
        </div>

        <div class="action-box">
          <p><strong>¿Qué puedes hacer ahora?</strong></p>
          <p>Puedes editar y reenviar tu reporte de actividades siguiendo estos pasos:</p>
          <ol>
            <li>Ingresa al sistema de becas</li>
            <li>Navega a la sección de "Mis Reportes"</li>
            <li>Localiza el reporte de la Semana ${numeroSemana}</li>
            <li>Edita el reporte considerando las observaciones del supervisor</li>
            <li>Envía nuevamente el reporte para revisión</li>
          </ol>
        </div>

        <div class="info-box">
          <p><strong>Recuerda:</strong></p>
          <ul>
            <li>Revisa cuidadosamente las observaciones de tu supervisor</li>
            <li>Asegúrate de corregir los aspectos señalados antes de reenviar</li>
            <li>Contacta a tu supervisor si tienes dudas sobre las correcciones</li>
          </ul>
        </div>

        <p style="text-align: center; margin-top: 30px;">
          <a href="${sistemaUrl}" class="button">Acceder al Sistema de Becas</a>
        </p>

        <div class="footer">
          <p><strong>Universidad Metropolitana</strong></p>
          <p>Sistema de Gestión de Becas</p>
          <p>Si tienes alguna pregunta, contacta a: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template HTML para email de postulación aprobada
   * @param {string} nombre - Nombre del usuario
   * @param {string} tipoBeca - Tipo de beca aprobada
   * @param {string} loginUrl - URL para login
   * @param {string} email - Email del usuario
   * @param {string} passwordTemporal - Contraseña temporal (null si usuario ya existía)
   * @returns {string} HTML del email
   */
  getPostulacionAprobadaTemplate(nombre, tipoBeca, loginUrl, email, passwordTemporal = null) {
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte.becas@unimet.edu.ve';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Postulación Aprobada</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #28a745;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #28a745;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .celebration-badge {
          text-align: center;
          margin: 20px 0;
          font-size: 48px;
        }
        .success-badge {
          text-align: center;
          margin: 20px 0;
        }
        .success-badge span {
          display: inline-block;
          background-color: #28a745;
          color: white;
          padding: 10px 20px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: bold;
        }
        .content {
          margin: 20px 0;
        }
        .content p {
          margin: 15px 0;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #0066cc;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          color: #004085;
          font-size: 14px;
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box p {
          margin: 5px 0;
          color: #856404;
          font-size: 14px;
        }
        .steps {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .steps h3 {
          color: #0066cc;
          margin-top: 0;
        }
        .steps ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        .steps li {
          margin: 10px 0;
          line-height: 1.6;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .activate-button {
          display: inline-block;
          padding: 15px 40px;
          background-color: #28a745;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .activate-button:hover {
          background-color: #218838;
        }
        .login-button {
          display: inline-block;
          padding: 10px 30px;
          background-color: #0066cc;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 14px;
          margin-top: 10px;
          transition: background-color 0.3s;
        }
        .login-button:hover {
          background-color: #0052a3;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Becas</h1>
          <p>Universidad Metropolitana</p>
        </div>

        <div class="celebration-badge">
          🎉
        </div>

        <div class="success-badge">
          <span>✓ Postulación Aprobada</span>
        </div>

        <div class="content">
          <p>Hola <strong>${nombre}</strong>,</p>

          <p>¡Tenemos excelentes noticias! Tu postulación para la <strong>Beca ${tipoBeca}</strong> ha sido <strong>APROBADA</strong>.</p>

          ${passwordTemporal ? `
            <div class="info-box">
              <p><strong>🎉 Cuenta Creada y Lista para Usar</strong></p>
              <p>Hemos creado una cuenta en el Sistema de Becas para ti y está completamente activa.</p>
            </div>

            <div class="steps">
              <h3>🔐 Tus Credenciales de Acceso</h3>
              <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                <strong>Email:</strong> ${email}<br>
                <strong>Contraseña Temporal:</strong> <code style="font-size: 18px; background-color: #fff; padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; color: #dc3545;">${passwordTemporal}</code>
              </p>
            </div>

            <div class="warning-box">
              <p><strong>⚠️ IMPORTANTE - Seguridad de tu Cuenta</strong></p>
              <p><strong>1.</strong> Esta contraseña es TEMPORAL y debes cambiarla en tu primer inicio de sesión.</p>
              <p><strong>2.</strong> NO compartas esta contraseña con nadie.</p>
              <p><strong>3.</strong> El sistema te pedirá cambiar tu contraseña inmediatamente después de iniciar sesión.</p>
            </div>

            <div class="steps">
              <h3>🚀 Próximos Pasos</h3>
              <ol>
                <li><strong>Inicia sesión</strong> con las credenciales proporcionadas arriba</li>
                <li><strong>Cambia tu contraseña</strong> cuando el sistema te lo solicite</li>
                <li><strong>Completa tu perfil</strong> y comienza a disfrutar de tu beca</li>
              </ol>
            </div>

            <div class="button-container">
              <a href="${loginUrl}" class="activate-button">🚀 Iniciar Sesión Ahora</a>
            </div>

            <p><strong>Con tu cuenta ya puedes:</strong></p>
            <ul>
              <li>✅ Acceder al sistema de becas</li>
              <li>✅ Ver el estado de tu beca</li>
              <li>✅ Registrar horas de trabajo (si aplica)</li>
              <li>✅ Subir documentación requerida</li>
              <li>✅ Consultar información importante</li>
            </ul>
          ` : `
            <div class="info-box">
              <p><strong>✅ Tu Cuenta ya Existe</strong></p>
              <p>Ya tienes una cuenta en el Sistema de Becas. Puedes iniciar sesión con tus credenciales habituales.</p>
            </div>

            <div class="button-container">
              <a href="${loginUrl}" class="activate-button">🚀 Iniciar Sesión</a>
            </div>

            <p><strong>Ahora puedes:</strong></p>
            <ul>
              <li>✅ Acceder al sistema de becas</li>
              <li>✅ Ver el estado de tu nueva beca aprobada</li>
              <li>✅ Registrar horas de trabajo (si aplica)</li>
              <li>✅ Subir documentación requerida</li>
            </ul>
          `}

          <p style="margin-top: 30px; font-size: 14px; color: #666;">Si tienes alguna pregunta o necesitas ayuda, contacta a:</p>
          <p style="text-align: center; margin: 10px 0;"><strong>${supportEmail}</strong></p>
        </div>

        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Sistema de Gestión de Becas - Universidad Metropolitana</p>
          <p>© ${new Date().getFullYear()} UNIMET. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
