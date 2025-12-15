# Sistema de Gestión de Becas - Backend

> Trabajo Especial de Grado - Ingeniería de Sistemas
> Universidad Metropolitana

Sistema integral para la administración de programas de becas universitarias, enfocado inicialmente en el programa de Beca Ayudantía.

## Características Principales

- **Gestión de Postulaciones**: Sistema digital de postulaciones con validación automática
- **Control de Ayudantías**: Asignación de supervisores y seguimiento de horas trabajadas
- **Evaluaciones**: Sistema de evaluación de desempeño para ayudantes
- **Reportes**: Generación de reportes estadísticos y exportación a Excel/PDF
- **Autenticación**: Sistema JWT con roles (estudiante, supervisor, gestor_becas)
- **Documentación API**: Swagger UI integrado

## Stack Tecnológico

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Base de Datos**: PostgreSQL 14+
- **ORM**: Sequelize 6.x
- **Autenticación**: JWT (jsonwebtoken)
- **Validación**: Joi
- **Documentación**: Swagger/OpenAPI 3.0
- **Testing**: Jest
- **Logs**: Winston

## Requisitos Previos

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. Iniciar el servidor:
```bash
npm start
```

El servidor estará disponible en `http://localhost:3001`

## Documentación de la API

Una vez el servidor esté corriendo, accede a la documentación interactiva de Swagger:

```
http://localhost:3001/api-docs
```

## Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm test` - Ejecuta las pruebas con Jest
- `npm run test:watch` - Ejecuta las pruebas en modo watch
- `npm run test:coverage` - Genera reporte de cobertura de pruebas

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/         # Configuraciones (DB, Swagger, etc.)
│   ├── controllers/    # Controladores de rutas
│   ├── middleware/     # Middleware personalizado
│   ├── models/         # Modelos de Sequelize
│   ├── routes/         # Definición de rutas
│   ├── services/       # Lógica de negocio
│   ├── utils/          # Utilidades y helpers
│   ├── validators/     # Validadores con Joi
│   └── docs/           # Documentación Swagger de endpoints
├── database/
│   ├── migrations/     # Migraciones de base de datos
│   └── seeders/        # Datos iniciales
├── tests/              # Pruebas unitarias e integración
├── scripts/            # Scripts de utilidad
├── uploads/            # Archivos subidos (gitignored)
├── logs/               # Logs del sistema (gitignored)
└── server.js           # Punto de entrada de la aplicación
```

## Variables de Entorno

Consulta el archivo `.env.example` para ver todas las variables de entorno necesarias:

- `NODE_ENV`: Entorno de ejecución (development/production)
- `PORT`: Puerto del servidor (default: 3001)
- `DB_*`: Configuración de PostgreSQL
- `JWT_*`: Configuración de autenticación
- `EMAIL_*`: Configuración de correo electrónico
- `UPLOAD_PATH`: Ruta para archivos subidos

## Modelos de Datos

El sistema incluye los siguientes modelos principales:

- **Usuario**: Usuarios del sistema (estudiantes, supervisores, gestores)
- **Role**: Roles y permisos
- **ProgramaBeca**: Programas de becas disponibles
- **Postulacion**: Solicitudes de becas
- **Becario**: Estudiantes beneficiarios
- **Plaza**: Plazas de ayudantía disponibles
- **Reporte**: Reportes de horas trabajadas
- **Evaluacion**: Evaluaciones de desempeño
- **Documento**: Archivos adjuntos
- **Auditoria**: Trazabilidad de acciones

## Autenticación y Autorización

El sistema utiliza JWT Bearer tokens. Para autenticarte:

1. Realiza login en `POST /api/v1/auth/login`
2. Copia el token JWT de la respuesta
3. Incluye el header en las peticiones:
   ```
   Authorization: Bearer <tu-token>
   ```

### Roles disponibles:
- **estudiante**: Puede postular y gestionar sus becas
- **supervisor**: Puede evaluar y aprobar reportes de ayudantes
- **gestor_becas**: Administración completa del sistema

## Seguridad

- Contraseñas hasheadas con bcrypt (12 rounds)
- Rate limiting en endpoints sensibles
- Validación de entrada con Joi
- Headers de seguridad con Helmet
- CORS configurado
- Logs de auditoría completos

## Testing

El proyecto incluye pruebas unitarias y de integración:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con cobertura
npm run test:coverage

# Modo watch para desarrollo
npm run test:watch
```

## Contribución

Este es un proyecto de tesis académica. Para consultas o sugerencias, contactar al autor.

## Licencia

ISC

## Autor

Trabajo Especial de Grado - Universidad Metropolitana

---

**Versión actual**: 2.25.13
