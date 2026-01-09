const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Student Services System - Universidad Metropolitana',
    version: '2.0.0',
    description: `
      Comprehensive API for managing Universidad Metropolitana's four scholarship programs.

      **Main Features:**
      - Digital application management
      - Assistantship and supervision control
      - Evaluation system
      - Statistical reports
      - Complete audit trail

      **User Roles:**
      - **estudiante**: Applications, hour registration, status inquiry
      - **supervisor**: Evaluation and supervision of assistants
      - **admin**: Full system administration

      **Authentication:**
      All endpoints require JWT Bearer authentication, except login and public endpoints.

      **Usuarios de Prueba Disponibles (emailVerified: true):**

      **Estudiantes (rol: estudiante):**
      - juan.perez@unimet.edu.ve / Student123! (Juan Carlos Pérez García, V-12345678)
      - maria.gonzalez@unimet.edu.ve / Student123! (María Alejandra González Rodríguez, V-23456789)
      - carlos.martinez@unimet.edu.ve / Student123! (Carlos Eduardo Martínez López, V-34567890)

      **Supervisores (rol: supervisor):**
      - prof.garcia@unimet.edu.ve / Supervisor123! (Dra. Ana Isabel García Mendoza, V-87654321)
      - prof.silva@unimet.edu.ve / Supervisor123! (Ing. Roberto Silva Contreras, V-76543210)
      - prof.herrera@unimet.edu.ve / Supervisor123! (Lic. Carmen Rosa Herrera Díaz, V-65432109)

      **Administradores (rol: admin):**
      - admin.becas@unimet.edu.ve / Admin123! (Carlos Antonio Rodríguez Morales, V-11111111)
      - patricia.fernandez@unimet.edu.ve / Admin123! (Licda. Patricia Fernández Castro, V-22222222)

      **Cómo usar la autenticación:**
      1. Hacer login en el endpoint POST /v1/auth/login con cualquiera de los usuarios arriba
      2. Copiar el accessToken de la respuesta
      3. Hacer clic en "Authorize" 🔒 arriba a la derecha
      4. Introducir: Bearer {accessToken}
      5. ¡Ya puedes probar endpoints protegidos según tu rol!
    `,
    contact: {
      name: 'Sistema de Gestión de Becas',
      email: 'becas@unimet.edu.ve'
    },
    license: {
      name: 'Universidad Metropolitana',
      url: 'https://www.unimet.edu.ve'
    }
  },
  servers: [
    {
      url: 'https://srodriguez.intelcondev.org/',
      description: 'Servidor de Desarrollo'
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor Local'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter the JWT token obtained from the login endpoint'
      }
    },
    schemas: {
      // Esquemas de respuesta comunes
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation successful'
          },
          data: {
            type: 'object',
            description: 'Endpoint-specific response data'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Operation error'
          },
          error: {
            type: 'string',
            example: 'Detailed error description'
          },
          details: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Additional error details (validations, etc.)'
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Validation error'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email'
                },
                message: {
                  type: 'string',
                  example: 'El email debe ser del dominio @unimet.edu.ve o @correo.unimet.edu.ve'
                }
              }
            }
          }
        }
      },
      // Esquemas de modelos principales en español
      Usuario: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '46c39f37-950b-41b2-9177-4d4649e61cc4',
            description: 'ID único del usuario (UUID)'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'juan.perez@unimet.edu.ve',
            description: 'Email institucional UNIMET'
          },
          nombre: {
            type: 'string',
            maxLength: 100,
            example: 'Juan Carlos',
            description: 'Nombre del usuario'
          },
          apellido: {
            type: 'string',
            maxLength: 100,
            example: 'Pérez González',
            description: 'Apellido del usuario'
          },
          cedula: {
            type: 'string',
            maxLength: 20,
            pattern: '^[VE]-\\d{7,8}$',
            example: 'V-12345678',
            description: 'Cédula venezolana (V-) o extranjera (E-)'
          },
          telefono: {
            type: 'string',
            maxLength: 20,
            pattern: '^\\+58\\s\\d{3}\\s\\d{7}$',
            example: '+58 212 1234567',
            description: 'Teléfono venezolano (formato +58 XXX XXXXXXX)'
          },
          role: {
            type: 'string',
            enum: ['estudiante', 'supervisor', 'mentor', 'admin', 'director-area', 'capital-humano', 'supervisor-laboral'],
            example: 'estudiante',
            description: 'Rol del usuario en el sistema'
          },
          departamento: {
            type: 'string',
            maxLength: 100,
            example: 'Ingeniería',
            description: 'Departamento de trabajo'
          },
          cargo: {
            type: 'string',
            maxLength: 100,
            example: 'Profesor',
            description: 'Cargo desempeñado'
          },
          carrera: {
            type: 'string',
            maxLength: 100,
            example: 'Ingeniería de Sistemas',
            description: 'Carrera del estudiante'
          },
          trimestre: {
            type: 'integer',
            minimum: 1,
            maximum: 15,
            example: 5,
            description: 'Trimestre actual (estudiantes)'
          },
          iaa: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            maximum: 20,
            nullable: true,
            example: 15.75,
            description: 'Índice Académico Acumulado (solo para estudiantes)'
          },
          asignaturasAprobadas: {
            type: 'integer',
            minimum: 0,
            maximum: 200,
            nullable: true,
            example: 45,
            description: 'Número de asignaturas aprobadas (solo estudiantes)'
          },
          fotocopiaCedulaId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'ID del documento - Fotocopia de Cédula de Identidad'
          },
          flujogramaCarreraId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174001',
            description: 'ID del documento - Flujograma de carrera'
          },
          historicoNotasId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174002',
            description: 'ID del documento - Histórico de notas'
          },
          planCarreraAvaladoId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174003',
            description: 'ID del documento - Plan de carrera avalado'
          },
          curriculumDeportivoId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174004',
            description: 'ID del documento - Curriculum deportivo'
          },
          activo: {
            type: 'boolean',
            example: true,
            description: 'Estado del usuario'
          },
          emailVerified: {
            type: 'boolean',
            example: true,
            description: 'Estado de verificación del email'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-01T08:00:00Z',
            description: 'Fecha de creación'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-13T10:30:00Z',
            description: 'Fecha de última actualización'
          }
        },
        required: ['email', 'nombre', 'apellido', 'cedula', 'role']
      },
      UsuarioInput: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            pattern: '^[a-zA-Z0-9._%+-]+@unimet\\.edu\\.ve$',
            example: 'juan.perez@unimet.edu.ve',
            description: 'Email institucional UNIMET'
          },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 255,
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
            example: 'Password123!',
            description: 'Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial)'
          },
          nombre: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\\s]+$',
            example: 'Juan Carlos',
            description: 'Nombre del usuario'
          },
          apellido: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\\s]+$',
            example: 'Pérez González',
            description: 'Apellido del usuario'
          },
          cedula: {
            type: 'string',
            pattern: '^[VE]-\\d{7,8}$',
            example: 'V-12345678',
            description: 'Cédula venezolana (V-) o extranjera (E-)'
          },
          telefono: {
            type: 'string',
            pattern: '^\\+58\\s\\d{3}\\s\\d{7}$',
            example: '+58 212 1234567',
            description: 'Teléfono venezolano (opcional)'
          },
          carnet: {
            type: 'string',
            maxLength: 20,
            example: '2021-001234',
            description: 'Carnet universitario o identificación institucional (opcional)'
          },
          role: {
            type: 'string',
            enum: ['estudiante', 'supervisor', 'mentor', 'admin', 'director-area', 'capital-humano', 'supervisor-laboral'],
            example: 'estudiante',
            description: 'Rol del usuario en el sistema'
          },
          departamento: {
            type: 'string',
            maxLength: 100,
            example: 'Ciencias',
            description: 'Departamento de trabajo (opcional, típicamente para supervisores)'
          },
          cargo: {
            type: 'string',
            maxLength: 100,
            example: 'Profesor Asociado',
            description: 'Cargo desempeñado (opcional, típicamente para supervisores)'
          },
          carrera: {
            type: 'string',
            maxLength: 100,
            example: 'Ingeniería de Sistemas',
            description: 'Carrera del estudiante (opcional, típicamente para estudiantes)'
          },
          trimestre: {
            type: 'integer',
            minimum: 1,
            maximum: 15,
            example: 5,
            description: 'Trimestre actual (opcional, típicamente para estudiantes)'
          }
        },
        required: ['email', 'password', 'nombre', 'apellido', 'cedula']
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NmMzOWYzNy05NTBiLTQxYjItOTE3Ny00ZDQ2NDllNjFjYzQiLCJlbWFpbCI6Imp1YW4ucGVyZXpAdW5pbWV0LmVkdS52ZSIsInJvbGUiOiJheXVkYW50ZSIsImlhdCI6MTczMjc0MzAwNywiZXhwIjoxNzMyODI5NDA3fQ.xyz...',
            description: 'Token JWT de acceso'
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NmMzOWYzNy05NTBiLTQxYjItOTE3Ny00ZDQ2NDllNjFjYzQiLCJlbWFpbCI6Imp1YW4ucGVyZXpAdW5pbWV0LmVkdS52ZSIsInJvbGUiOiJheXVkYW50ZSIsImlhdCI6MTczMjc0MzAwNywiZXhwIjoxNzMzMzQ3ODA3fQ.abc...',
            description: 'Token JWT de renovación'
          },
          expiresIn: {
            type: 'string',
            example: '24h',
            description: 'Tiempo de expiración del token de acceso'
          }
        },
        required: ['accessToken', 'refreshToken', 'expiresIn']
      },
      // Esquemas del sistema de becas
      Postulacion: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'ID único de la postulación'
          },
          usuarioId: {
            type: 'string',
            format: 'uuid',
            example: '46c39f37-950b-41b2-9177-4d4649e61cc4',
            description: 'ID del usuario que postula'
          },
          programaBecaId: {
            type: 'string',
            format: 'uuid',
            example: '789e1234-e89b-12d3-a456-426614174000',
            description: 'ID del programa de beca'
          },
          periodoAcademico: {
            type: 'string',
            pattern: '^\\d{4}-(1|2|3)$',
            example: '2025-1',
            description: 'Período académico (YYYY-X)'
          },
          estado: {
            type: 'string',
            enum: ['Pendiente', 'En Revisión', 'Aprobada', 'Rechazada'],
            example: 'Pendiente',
            description: 'Estado actual de la postulación'
          },
          fechaPostulacion: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-15T10:00:00Z',
            description: 'Fecha de creación de la postulación'
          },
          fechaEvaluacion: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-20T14:30:00Z',
            description: 'Fecha de evaluación (si aplica)'
          },
          evaluadoPor: {
            type: 'string',
            format: 'uuid',
            example: '456e7890-e89b-12d3-a456-426614174000',
            description: 'ID del evaluador'
          },
          observaciones: {
            type: 'string',
            maxLength: 1000,
            example: 'Cumple todos los requisitos. Excelente expediente académico.',
            description: 'Observaciones del evaluador'
          },
          iaa: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            maximum: 20,
            example: 15.75,
            description: 'Índice Académico Acumulado'
          },
          creditosInscritos: {
            type: 'integer',
            minimum: 3,
            maximum: 30,
            example: 18,
            description: 'Créditos inscritos en el período'
          },
          documentosCompletos: {
            type: 'boolean',
            example: true,
            description: 'Indica si todos los documentos están cargados'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-15T10:00:00Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-01-20T14:30:00Z'
          }
        },
        required: ['usuarioId', 'programaBecaId', 'periodoAcademico', 'estado', 'iaa', 'creditosInscritos']
      },
      PostulacionInput: {
        type: 'object',
        properties: {
          programaBecaId: {
            type: 'string',
            format: 'uuid',
            example: '789e1234-e89b-12d3-a456-426614174000',
            description: 'ID del programa de beca al que se postula'
          },
          periodoAcademico: {
            type: 'string',
            pattern: '^\\d{4}-(1|2|3)$',
            example: '2025-1',
            description: 'Período académico (YYYY-X)'
          },
          iaa: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            maximum: 20,
            example: 15.75,
            description: 'Índice Académico Acumulado actual'
          },
          creditosInscritos: {
            type: 'integer',
            minimum: 3,
            maximum: 30,
            example: 18,
            description: 'Créditos inscritos en el período'
          },
          motivacion: {
            type: 'string',
            maxLength: 1000,
            example: 'Deseo obtener esta beca para continuar mis estudios y desarrollar mi carrera profesional...',
            description: 'Carta de motivación del estudiante'
          }
        },
        required: ['programaBecaId', 'periodoAcademico', 'iaa', 'creditosInscritos']
      },
      ProgramaBeca: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '789e1234-e89b-12d3-a456-426614174000'
          },
          nombre: {
            type: 'string',
            example: 'Beca Ayudantía',
            description: 'Nombre del programa de beca'
          },
          descripcion: {
            type: 'string',
            example: 'Programa de becas para estudiantes que realizan labores de ayudantía académica',
            description: 'Descripción detallada del programa'
          },
          tipo: {
            type: 'string',
            enum: ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'],
            example: 'Ayudantía',
            description: 'Tipo de programa de beca'
          },
          porcentajeDescuento: {
            type: 'number',
            format: 'decimal',
            example: 25.00,
            description: 'Porcentaje de descuento aplicable'
          },
          plazasDisponibles: {
            type: 'integer',
            example: 50,
            description: 'Número de plazas disponibles'
          },
          iaaMinimo: {
            type: 'number',
            format: 'decimal',
            example: 12.0,
            description: 'IAA mínimo requerido'
          },
          activo: {
            type: 'boolean',
            example: true,
            description: 'Indica si el programa está activo'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['nombre', 'tipo', 'porcentajeDescuento', 'iaaMinimo']
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'juan.perez@unimet.edu.ve',
            description: 'Email institucional UNIMET'
          },
          password: {
            type: 'string',
            example: 'MiPassword123!',
            description: 'Contraseña del usuario'
          }
        },
        required: ['email', 'password']
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Inicio de sesión exitoso'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-27T20:30:50.598Z'
          },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '46c39f37-950b-41b2-9177-4d4649e61cc4'
                  },
                  email: {
                    type: 'string',
                    example: 'juan.perez@unimet.edu.ve'
                  },
                  nombre: {
                    type: 'string',
                    example: 'Juan Carlos'
                  },
                  role: {
                    type: 'string',
                    example: 'estudiante'
                  },
                  activo: {
                    type: 'boolean',
                    example: true
                  },
                  emailVerified: {
                    type: 'boolean',
                    example: true
                  },
                  tipoBeca: {
                    type: 'string',
                    enum: ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'],
                    nullable: true,
                    example: 'Ayudantía',
                    description: 'Tipo de beca asignada al usuario (null si no es becario o no tiene beca asignada)'
                  }
                }
              },
              tokens: {
                $ref: '#/components/schemas/Tokens'
              }
            }
          }
        }
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Usuario registrado exitosamente. Verifica tu email para activar la cuenta.'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-27T20:30:50.598Z'
          },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '46c39f37-950b-41b2-9177-4d4649e61cc4'
                  },
                  email: {
                    type: 'string',
                    example: 'nuevo.usuario@unimet.edu.ve'
                  },
                  nombre: {
                    type: 'string',
                    example: 'Juan Carlos'
                  },
                  apellido: {
                    type: 'string',
                    example: 'Pérez González'
                  },
                  role: {
                    type: 'string',
                    example: 'estudiante'
                  }
                }
              }
            }
          }
        }
      },
      // Esquemas adicionales del sistema de becas
      EstudianteBecario: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440000',
            description: 'ID único del registro de estudiante becario'
          },
          usuarioId: {
            type: 'string',
            format: 'uuid',
            example: '46c39f37-950b-41b2-9177-4d4649e61cc4',
            description: 'ID del usuario asociado'
          },
          supervisorId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '987e6543-e21b-98c7-a654-426614174001',
            description: 'ID del supervisor asignado'
          },
          plazaAsignada: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'ID de la plaza asignada'
          },
          tipoBeca: {
            type: 'string',
            enum: ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'],
            example: 'Ayudantía',
            description: 'Tipo de beca del estudiante'
          },
          estado: {
            type: 'string',
            enum: ['Activa', 'Suspendida', 'Culminada', 'Cancelada'],
            example: 'Activa',
            description: 'Estado actual de la beca'
          },
          periodoInicio: {
            type: 'string',
            example: '2025-1',
            description: 'Período académico de inicio'
          },
          periodoFin: {
            type: 'string',
            nullable: true,
            example: '2025-1',
            description: 'Período académico de finalización'
          },
          fechaAsignacion: {
            type: 'string',
            format: 'date-time',
            example: '2025-02-01T08:00:00Z',
            description: 'Fecha de asignación de la beca'
          },
          horasRequeridas: {
            type: 'integer',
            example: 120,
            description: 'Horas totales requeridas para el período'
          },
          horasCompletadas: {
            type: 'number',
            format: 'decimal',
            example: 45.5,
            description: 'Horas completadas hasta el momento'
          },
          descuentoAplicado: {
            type: 'number',
            format: 'decimal',
            example: 25.00,
            description: 'Porcentaje de descuento aplicado'
          },
          observaciones: {
            type: 'string',
            nullable: true,
            example: 'Estudiante con excelente desempeño',
            description: 'Observaciones generales'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación del registro'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de última actualización'
          }
        },
        required: ['usuarioId', 'tipoBeca', 'estado', 'periodoInicio', 'horasRequeridas']
      },
      Reporte: {
        type: 'object',
        description: 'Reporte semanal de actividades (alias de ReporteSemanal)',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          estudianteBecarioId: {
            type: 'string',
            format: 'uuid',
            description: 'ID del estudiante becario'
          },
          semana: {
            type: 'integer',
            minimum: 1,
            maximum: 12,
            example: 3,
            description: 'Semana del trimestre'
          },
          periodoAcademico: {
            type: 'string',
            example: '2025-1',
            description: 'Período académico'
          },
          horasTrabajadas: {
            type: 'number',
            format: 'decimal',
            example: 10.5,
            description: 'Horas trabajadas en la semana'
          },
          estado: {
            type: 'string',
            enum: ['Pendiente', 'Aprobada', 'Rechazada', 'En Revisión'],
            example: 'Pendiente'
          },
          bloqueado: {
            type: 'boolean',
            example: true,
            description: 'Indica si el reporte está bloqueado para edición'
          },
          objetivosPeriodo: {
            type: 'string',
            nullable: true
          },
          metasEspecificas: {
            type: 'string',
            nullable: true
          },
          actividadesProgramadas: {
            type: 'string',
            nullable: true
          },
          actividadesRealizadas: {
            type: 'string',
            nullable: true
          },
          descripcionActividades: {
            type: 'string',
            nullable: true
          },
          observaciones: {
            type: 'string',
            nullable: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Disponibilidad: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          usuarioId: {
            type: 'string',
            format: 'uuid',
            description: 'ID del usuario estudiante'
          },
          disponibilidad: {
            type: 'object',
            properties: {
              lunes: {
                type: 'array',
                items: {
                  type: 'string',
                  pattern: '^\\d{2}:\\d{2}$'
                },
                example: ['07:00', '07:30', '08:00'],
                description: 'Horas disponibles el lunes (formato HH:MM)'
              },
              martes: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: ['12:30', '13:00']
              },
              miercoles: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: []
              },
              jueves: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: []
              },
              viernes: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: ['15:00', '15:30', '16:00', '16:30', '17:00']
              },
              sabado: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: []
              },
              domingo: {
                type: 'array',
                items: {
                  type: 'string'
                },
                example: []
              }
            },
            description: 'Calendario semanal de disponibilidad en bloques de 30 minutos'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Documento: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          usuarioId: {
            type: 'string',
            format: 'uuid',
            description: 'ID del usuario que subió el documento'
          },
          postulacionId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID de la postulación asociada (si aplica)'
          },
          tipoDocumento: {
            type: 'string',
            maxLength: 100,
            example: 'cedula_de_identidad',
            description: 'Tipo de documento - acepta cualquier valor descriptivo (max 100 caracteres)'
          },
          nombreOriginal: {
            type: 'string',
            example: 'historico_notas_juan_perez.pdf',
            description: 'Nombre original del archivo'
          },
          nombreArchivo: {
            type: 'string',
            example: '1234567890-doc.pdf',
            description: 'Nombre del archivo en el servidor'
          },
          rutaArchivo: {
            type: 'string',
            example: '/uploads/documents/1234567890-doc.pdf',
            description: 'Ruta del archivo en el servidor'
          },
          tamano: {
            type: 'integer',
            example: 2621440,
            description: 'Tamaño del archivo en bytes'
          },
          mimeType: {
            type: 'string',
            example: 'application/pdf',
            description: 'Tipo MIME del archivo'
          },
          observaciones: {
            type: 'string',
            nullable: true,
            description: 'Observaciones sobre el documento'
          },
          esDocumentoSistema: {
            type: 'boolean',
            example: false,
            description: 'Indica si es un documento público del sistema'
          },
          activo: {
            type: 'boolean',
            example: true,
            description: 'Estado del documento (para soft delete)'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      ConfiguracionBeca: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'ID único de la configuración'
          },
          tipoBeca: {
            type: 'string',
            enum: ['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente'],
            example: 'Excelencia',
            description: 'Tipo de beca'
          },
          subtipoExcelencia: {
            type: 'string',
            enum: ['Académica', 'Deportiva', 'Artística', 'Emprendimiento', 'Cívico'],
            nullable: true,
            example: 'Académica',
            description: 'Subtipo de beca de excelencia (solo aplica cuando tipoBeca = Excelencia)'
          },
          montoMensual: {
            type: 'number',
            format: 'decimal',
            nullable: true,
            example: 500.00,
            description: 'Monto mensual del beneficio en moneda local'
          },
          cuposDisponibles: {
            type: 'integer',
            nullable: true,
            example: 20,
            description: 'Número total de cupos disponibles para esta beca'
          },
          duracionMeses: {
            type: 'integer',
            nullable: true,
            minimum: 1,
            maximum: 12,
            example: 3,
            description: 'Duración de la beca en meses'
          },
          promedioMinimo: {
            type: 'number',
            format: 'decimal',
            nullable: true,
            minimum: 0,
            maximum: 20,
            example: 16.00,
            description: 'Promedio académico mínimo requerido (escala 0-20)'
          },
          semestreMinimo: {
            type: 'integer',
            nullable: true,
            minimum: 1,
            maximum: 20,
            example: 2,
            description: 'Semestre mínimo para postular'
          },
          semestreMaximo: {
            type: 'integer',
            nullable: true,
            minimum: 1,
            maximum: 20,
            example: 10,
            description: 'Semestre máximo para postular (opcional)'
          },
          edadMaxima: {
            type: 'integer',
            nullable: true,
            minimum: 16,
            maximum: 65,
            example: 25,
            description: 'Edad máxima para postular'
          },
          requisitosEspeciales: {
            type: 'string',
            nullable: true,
            maxLength: 5000,
            example: 'Debe presentar certificado de participación en actividades deportivas',
            description: 'Descripción detallada de requisitos especiales adicionales'
          },
          documentosRequeridos: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['Cédula de identidad', 'Certificado de notas', 'Carta de motivación'],
            description: 'Lista de documentos requeridos para postular a esta beca'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de última actualización'
          }
        },
        required: ['tipoBeca', 'documentosRequeridos']
      },
    },
    parameters: {
      IdParameter: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          minimum: 1
        },
        description: 'Unique resource ID'
      },
      LimitParameter: {
        name: 'limit',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        },
        description: 'Maximum number of elements to return'
      },
      OffsetParameter: {
        name: 'offset',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 0,
          default: 0
        },
        description: 'Number of elements to skip'
      },
      PeriodoParameter: {
        name: 'periodo',
        in: 'query',
        schema: {
          type: 'string',
          pattern: '^\\d{4}-[12]$',
          example: '2025-1'
        },
        description: 'Academic period (YYYY-X format)'
      }
    },
    responses: {
      Success: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse'
            }
          }
        }
      },
      BadRequest: {
        description: 'Invalid request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Token required or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Access token required',
              error: 'No authorization token provided'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Access denied',
              error: 'You do not have permissions to perform this action'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Resource not found',
              error: 'The requested resource does not exist'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Internal server error',
              error: 'An unexpected error occurred'
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Autenticación',
      description: 'Autenticación y gestión de sesiones'
    },
    {
      name: 'Usuarios',
      description: 'Gestión de usuarios del sistema'
    },
    {
      name: 'Postulaciones',
      description: 'Gestión de postulaciones a programas de becas'
    },
    {
      name: 'Ayudantías',
      description: 'Gestión de reportes semanales de actividades de ayudantías'
    },
    {
      name: 'Becarios',
      description: 'Gestión de estudiantes becarios y asignación de plazas'
    },
    {
      name: 'Plazas',
      description: 'Gestión de plazas de ayudantía disponibles'
    },
    {
      name: 'Supervisores',
      description: 'Funcionalidades específicas para supervisores'
    },
    {
      name: 'Disponibilidad Horaria',
      description: 'Gestión de disponibilidad horaria de estudiantes'
    },
    {
      name: 'Documentos',
      description: 'Gestión de documentos y archivos de postulaciones'
    },
    {
      name: 'Documentos del Sistema',
      description: 'Gestión de documentos públicos del sistema (reglamentos, formularios, etc.)'
    },
    {
      name: 'Configuración',
      description: 'Gestión de períodos académicos y configuración de semanas'
    },
    {
      name: 'Reportes',
      description: 'Generación de reportes y estadísticas del sistema'
    },
    {
      name: 'Reportes Simplificados',
      description: 'API simplificada para creación de reportes sin especificar ID de becario'
    },
    {
      name: 'Reportes Exportación',
      description: 'Exportación de reportes en múltiples formatos (Excel, PDF, JSON) con gráficos simples'
    },
    {
      name: 'Auditoría',
      description: 'Logs del sistema y consultas de auditoría'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/docs/*.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerDefinition
};
