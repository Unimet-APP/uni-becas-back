# 📚 Sistema de Orientación Vocacional - Documentación Completa

## 🎯 Resumen del Proyecto

Sistema inteligente de orientación vocacional que integra:
- **Tests psicométricos** (Holland RIASEC y Kuder)
- **Inteligencia Artificial (LLM)** para análisis personalizado
- **Trayectoria académica** del estudiante
- **Rotación inteligente de preguntas** para evitar descartes prematuros
- **Validación cruzada** entre test y datos académicos
- **Acompañamiento continuo** con recomendaciones actualizadas

---

## 📋 Índice de Fases Implementadas

1. [Fase 1: Migraciones de Base de Datos](#fase-1-migraciones-de-base-de-datos)
2. [Fase 2: Modelos Sequelize](#fase-2-modelos-sequelize)
3. [Fase 3: Servicios (Lógica de Negocio)](#fase-3-servicios-lógica-de-negocio)
4. [Fase 4: Controladores](#fase-4-controladores)
5. [Fase 5: Validadores](#fase-5-validadores)
6. [Fase 6: Rutas](#fase-6-rutas)
7. [Fase 7: Seeders](#fase-7-seeders)
8. [Fase 8: Documentación Swagger](#fase-8-documentación-swagger)

---

## 🗄️ Fase 1: Migraciones de Base de Datos

### Objetivo
Crear la estructura de base de datos para el sistema de orientación vocacional.

### Archivos Creados

#### 1. `database/migrations/20260107000001-create-preguntas-orientacion.js`
**Tabla:** `preguntas_orientacion`

**Propósito:** Almacena el banco de preguntas para los tests psicométricos.

**Campos principales:**
- `codigo`: Identificador único de la pregunta
- `texto_pregunta`: Texto de la pregunta
- `tipo_test`: ENUM ('Kuder', 'Holland_RIASEC')
- `dimension_principal`: Dimensión a la que pertenece (ej: 'Realista', 'Investigador')
- `tipo_pregunta`: ENUM ('directa', 'comparativa', 'proyectiva', 'situacional')
- `peso`: ENUM ('baja', 'media', 'alta')
- `dimensiones_secundarias`: JSONB - Dimensiones relacionadas
- `correlaciones_academicas`: JSONB - Asignaturas e IAA mínimo
- `opciones_respuesta`: JSONB - Opciones si aplica
- `efectividad_historica`: Decimal - Métrica de efectividad
- `veces_usada` / `veces_efectiva`: Contadores para métricas

#### 2. `database/migrations/20260107000002-create-sesiones-test-orientacion.js`
**Tabla:** `sesiones_test_orientacion`

**Propósito:** Registra cada sesión de test realizada por un estudiante.

**Campos principales:**
- `usuario_id`: FK a usuarios
- `tipo_test`: ENUM ('Kuder', 'Holland_RIASEC')
- `estado`: ENUM ('ronda_1', 'ronda_2', 'completado', 'abandonado')
- `fecha_inicio` / `fecha_fin`: Timestamps
- `preguntas_ronda_1` / `preguntas_ronda_2`: JSONB - IDs de preguntas
- `analisis_llm`: JSONB - Análisis generado por el LLM
- `tiempo_total_segundos`: Integer

#### 3. `database/migrations/20260107000003-create-respuestas-test-orientacion.js`
**Tabla:** `respuestas_test_orientacion`

**Propósito:** Almacena cada respuesta individual del estudiante.

**Campos principales:**
- `sesion_id`: FK a sesiones
- `pregunta_id`: FK a preguntas
- `respuesta`: JSONB - Respuesta flexible (string, number, boolean, array)
- `tiempo_segundos`: Integer
- `nivel_seguridad`: ENUM ('bajo', 'medio', 'alto')
- `ronda`: ENUM ('ronda_1', 'ronda_2')

#### 4. `database/migrations/20260107000004-create-resultados-orientacion.js`
**Tabla:** `resultados_orientacion`

**Propósito:** Almacena los resultados procesados y recomendaciones.

**Campos principales:**
- `sesion_id`: FK a sesiones
- `puntuaciones`: JSONB - Puntuaciones por dimensión
- `perfil_dominante`: String - Perfil principal detectado
- `perfiles_secundarios`: JSONB - Perfiles secundarios
- `recomendaciones_carreras`: JSONB - Carreras recomendadas
- `recomendaciones_actividades`: JSONB - Actividades sugeridas
- `analisis_llm`: JSONB - Análisis completo del LLM
- `discrepancias_detectadas`: JSONB - Discrepancias encontradas
- `validacion_trayectoria`: JSONB - Validación cruzada con académico
- `nivel_confianza`: Decimal - Confianza en los resultados

#### 5. `database/migrations/20260107000005-create-trayectorias-academicas.js`
**Tabla:** `trayectorias_academicas`

**Propósito:** Registra la trayectoria académica del estudiante para validación cruzada.

**Campos principales:**
- `usuario_id`: FK a usuarios
- `carrera_id`: FK a carreras
- `trimestre_actual`: Integer
- `iaa`: Decimal - Índice Académico Acumulado
- `asignaturas_aprobadas`: JSONB - Lista de asignaturas
- `asignaturas_reprobadas`: JSONB
- `fortalezas_academicas`: JSONB - Áreas de fortaleza
- `debilidades_academicas`: JSONB
- `actividades_extracurriculares`: JSONB
- `es_actual`: Boolean - Trayectoria actual del estudiante

#### 6. `database/migrations/20260107000006-create-efectividad-preguntas.js`
**Tabla:** `efectividad_preguntas`

**Propósito:** Tabla de análisis para mejorar la selección de preguntas.

**Campos principales:**
- `pregunta_id`: FK a preguntas
- `sesion_id`: FK a sesiones
- `efectividad`: Decimal - Efectividad de la pregunta en esta sesión
- `tiempo_promedio`: Decimal
- `correlacion_resultado`: Decimal

### Características Clave

- **JSONB**: Uso extensivo de JSONB para flexibilidad en datos estructurados
- **Índices**: Índices en campos de búsqueda frecuente (usuario_id, sesion_id, tipo_test)
- **Foreign Keys**: Relaciones bien definidas con CASCADE donde aplica
- **Timestamps**: `created_at` y `updated_at` automáticos

---

## 🏗️ Fase 2: Modelos Sequelize

### Objetivo
Definir los modelos ORM que representan las tablas y sus relaciones.

### Archivos Creados

#### 1. `src/models/PreguntaOrientacion.js`
**Modelo:** `PreguntaOrientacion`

**Relaciones:**
- `hasMany` → `RespuestaTestOrientacion`
- `hasMany` → `EfectividadPregunta`

**Métodos estáticos:**
- `obtenerPorDimension()`: Obtiene preguntas de una dimensión específica
- `obtenerPorTipoTest()`: Filtra por tipo de test
- `actualizarEfectividad()`: Actualiza métricas de efectividad

#### 2. `src/models/SesionTestOrientacion.js`
**Modelo:** `SesionTestOrientacion`

**Relaciones:**
- `belongsTo` → `Usuario`
- `hasMany` → `RespuestaTestOrientacion`
- `hasOne` → `ResultadoOrientacion`

**Métodos de instancia:**
- `marcarCompletada()`: Cambia estado a completado
- `agregarPreguntasRonda()`: Agrega preguntas a una ronda

#### 3. `src/models/RespuestaTestOrientacion.js`
**Modelo:** `RespuestaTestOrientacion`

**Relaciones:**
- `belongsTo` → `SesionTestOrientacion`
- `belongsTo` → `PreguntaOrientacion`

**Métodos estáticos:**
- `calcularTiempoPromedio()`: Calcula tiempo promedio por pregunta

#### 4. `src/models/ResultadoOrientacion.js`
**Modelo:** `ResultadoOrientacion`

**Relaciones:**
- `belongsTo` → `SesionTestOrientacion`

**Métodos de instancia:**
- `actualizarRecomendaciones()`: Actualiza recomendaciones

#### 5. `src/models/TrayectoriaAcademica.js`
**Modelo:** `TrayectoriaAcademica`

**Relaciones:**
- `belongsTo` → `Usuario`
- `belongsTo` → `Career`

**Métodos de instancia:**
- `marcarComoActual()`: Marca esta trayectoria como la actual

### Actualización de `src/models/index.js`

Se agregaron las asociaciones entre modelos:
```javascript
db.PreguntaOrientacion = require('./PreguntaOrientacion')(sequelize, DataTypes);
db.SesionTestOrientacion = require('./SesionTestOrientacion')(sequelize, DataTypes);
db.TrayectoriaAcademica = require('./TrayectoriaAcademica')(sequelize, DataTypes);
db.RespuestaTestOrientacion = require('./RespuestaTestOrientacion')(sequelize, DataTypes);
db.ResultadoOrientacion = require('./ResultadoOrientacion')(sequelize, DataTypes);
```

---

## ⚙️ Fase 3: Servicios (Lógica de Negocio)

### Objetivo
Implementar la lógica de negocio compleja del sistema.

### Archivos Creados

#### 1. `src/services/bancoPreguntasService.js`

**Responsabilidad:** Selección inteligente de preguntas.

**Métodos principales:**

- `obtenerPreguntasIniciales(tipoTest, cantidadPorDimension)`
  - Selecciona preguntas balanceadas para Ronda 1
  - Considera efectividad histórica
  - Distribuye tipos de preguntas (directa, comparativa, proyectiva, situacional)

- `seleccionarPreguntasAdaptativas(sesionId, respuestasRonda1, tipoTest)`
  - Utiliza LLM para analizar respuestas de Ronda 1
  - Identifica áreas ambiguas o de interés
  - Selecciona preguntas específicas para Ronda 2
  - Implementa "rotación inteligente" para evitar descartes prematuros

- `obtenerPreguntasPorDimension(dimension, tipoTest, excluirIds)`
  - Obtiene preguntas disponibles de una dimensión
  - Excluye preguntas ya usadas

- `actualizarEfectividadPregunta(preguntaId, efectividad)`
  - Actualiza métricas de efectividad basadas en resultados

**Lógica de Rotación Inteligente:**
```javascript
// 1. Analiza respuestas con LLM
// 2. Identifica dimensiones ambiguas (puntuaciones similares)
// 3. Selecciona preguntas de mayor peso para esas dimensiones
// 4. Evita descartar áreas prematuramente
// 5. Valida con trayectoria académica
```

#### 2. `src/services/testOrientacionService.js`

**Responsabilidad:** Gestión de sesiones y cálculo de resultados.

**Métodos principales:**

- `crearSesion(usuarioId, tipoTest)`
  - Crea nueva sesión
  - Obtiene preguntas iniciales
  - Inicializa estado en 'ronda_1'

- `guardarRespuestasRonda1(sesionId, respuestas, usuarioId)`
  - Valida sesión y usuario
  - Guarda respuestas
  - Calcula puntuaciones preliminares
  - Detecta ambigüedades
  - Obtiene preguntas adaptativas para Ronda 2
  - Actualiza estado a 'ronda_2'

- `guardarRespuestasRonda2(sesionId, respuestas, usuarioId)`
  - Guarda respuestas finales
  - Calcula puntuaciones finales
  - Detecta discrepancias
  - Valida con trayectoria académica
  - Genera recomendaciones con LLM
  - Marca sesión como completada

- `calcularPuntuaciones(respuestas, tipoTest)`
  - Calcula puntuaciones por dimensión
  - Considera peso de preguntas
  - Normaliza resultados

- `detectarAmbiguedades(puntuaciones, tipoTest)`
  - Identifica dimensiones con puntuaciones similares
  - Retorna lista de dimensiones ambiguas

- `detectarDiscrepancias(puntuaciones, trayectoriaAcademica)`
  - Compara resultados del test con trayectoria
  - Identifica discrepancias significativas
  - Retorna análisis de consistencia

- `obtenerSesion(sesionId, usuarioId)`
  - Obtiene información completa de una sesión

- `obtenerResultados(sesionId, usuarioId)`
  - Obtiene resultados procesados

- `obtenerHistorial(usuarioId)`
  - Retorna todas las sesiones del usuario

#### 3. `src/services/trayectoriaAcademicaService.js`

**Responsabilidad:** Gestión de trayectorias académicas.

**Métodos principales:**

- `crearTrayectoria(usuarioId, datos)`
  - Crea nueva trayectoria
  - Marca como actual si es necesario

- `obtenerTrayectoriaActual(usuarioId)`
  - Obtiene la trayectoria actual del estudiante

- `actualizarTrayectoria(trayectoriaId, datos, usuarioId)`
  - Actualiza trayectoria existente

- `analizarRendimiento(usuarioId)`
  - Analiza fortalezas y debilidades académicas
  - Identifica asignaturas destacadas
  - Calcula tendencias de rendimiento

- `validarConTest(trayectoria, resultadosTest)`
  - Compara trayectoria con resultados del test
  - Identifica consistencias e inconsistencias

#### 4. `src/services/orientacionVocacionalService.js`

**Responsabilidad:** Orquestación del proceso completo.

**Métodos principales:**

- `obtenerPerfilVocacional(usuarioId)`
  - Consolida información completa:
    - Últimos resultados de tests
    - Trayectoria académica
    - Recomendaciones actualizadas
    - Análisis de consistencia

- `generarRecomendacionesContinuas(usuarioId, contextoAdicional)`
  - Genera recomendaciones actualizadas
  - Considera cambios en trayectoria
  - Utiliza LLM para análisis personalizado

- `analizarCambioCarrera(usuarioId, carreraDestinoId, razones, preocupaciones)`
  - Analiza viabilidad de cambio de carrera
  - Compara perfil vocacional con nueva carrera
  - Considera trayectoria académica
  - Genera recomendaciones con LLM

### Integración con LLM

Los servicios utilizan `llmService` para:
- Selección adaptativa de preguntas
- Análisis de respuestas
- Detección de discrepancias
- Generación de recomendaciones personalizadas

---

## 🎮 Fase 4: Controladores

### Objetivo
Manejar las peticiones HTTP y orquestar las llamadas a servicios.

### Archivo Creado

#### `src/controllers/orientacionVocacionalController.js`

**Clase:** `OrientacionVocacionalController`

**Métodos (todos con `asyncHandler` para manejo de errores):**

1. **`iniciarTest`**
   - POST `/api/v1/orientacion/iniciar-test`
   - Crea nueva sesión y retorna preguntas iniciales

2. **`guardarRespuestasRonda1`**
   - POST `/api/v1/orientacion/guardar-respuestas-ronda-1`
   - Guarda respuestas y retorna preguntas de Ronda 2

3. **`guardarRespuestasRonda2`**
   - POST `/api/v1/orientacion/guardar-respuestas-ronda-2`
   - Completa el test y genera resultados

4. **`obtenerSesion`**
   - GET `/api/v1/orientacion/sesion/:sesionId`
   - Retorna información de una sesión

5. **`obtenerResultados`**
   - GET `/api/v1/orientacion/resultados/:sesionId`
   - Retorna resultados completos

6. **`obtenerPerfilVocacional`**
   - GET `/api/v1/orientacion/mi-perfil-vocacional`
   - Retorna perfil consolidado

7. **`obtenerHistorial`**
   - GET `/api/v1/orientacion/historial`
   - Retorna historial de tests

8. **`generarRecomendacionesContinuas`**
   - POST `/api/v1/orientacion/recomendaciones-continuas`
   - Genera recomendaciones actualizadas

9. **`analizarCambioCarrera`**
   - POST `/api/v1/orientacion/analizar-cambio-carrera`
   - Analiza viabilidad de cambio de carrera

**Características:**
- Uso de `ApiResponse` para respuestas estandarizadas
- Manejo de errores con `asyncHandler`
- Validación de permisos (solo el dueño puede acceder a sus datos)

---

## ✅ Fase 5: Validadores

### Objetivo
Validar datos de entrada con Joi.

### Archivo Creado

#### `src/validators/orientacionVocacionalValidators.js`

**Validadores creados:**

1. **`validateIniciarTest`**
   - Valida `tipoTest`: debe ser 'Kuder' o 'Holland_RIASEC'

2. **`validateGuardarRespuestasRonda1`**
   - Valida `sesionId`: UUID requerido
   - Valida `respuestas`: array de objetos con:
     - `preguntaId`: UUID
     - `respuesta`: string, number, boolean o array
     - `tiempoSegundos`: opcional, integer >= 0
     - `nivelSeguridad`: opcional, enum ['bajo', 'medio', 'alto']

3. **`validateGuardarRespuestasRonda2`**
   - Similar a Ronda 1

4. **`validateAnalizarCambioCarrera`**
   - Valida `carreraDestinoId`: UUID requerido
   - Valida `razones` y `preocupaciones`: opcionales, strings

5. **`validateSesionIdParam`**
   - Valida parámetro `sesionId` en URL: UUID requerido

**Características:**
- Mensajes de error personalizados en español
- Validación estricta de tipos y formatos
- Middleware reutilizable

---

## 🛣️ Fase 6: Rutas

### Objetivo
Definir endpoints de la API y aplicar middlewares.

### Archivo Creado

#### `src/routes/orientacionVocacionalRoutes.js`

**Rutas definidas:**

1. `POST /api/v1/orientacion/iniciar-test`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateIniciarTest`

2. `POST /api/v1/orientacion/guardar-respuestas-ronda-1`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateGuardarRespuestasRonda1`

3. `POST /api/v1/orientacion/guardar-respuestas-ronda-2`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateGuardarRespuestasRonda2`

4. `GET /api/v1/orientacion/sesion/:sesionId`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateSesionIdParam`

5. `GET /api/v1/orientacion/resultados/:sesionId`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateSesionIdParam`

6. `GET /api/v1/orientacion/mi-perfil-vocacional`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`

7. `GET /api/v1/orientacion/historial`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`

8. `POST /api/v1/orientacion/recomendaciones-continuas`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`

9. `POST /api/v1/orientacion/analizar-cambio-carrera`
   - Middlewares: `authenticate`, `rbac(['estudiante'])`, `validateAnalizarCambioCarrera`

### Actualización de `src/routes/index.js`

Se registró el router:
```javascript
router.use('/v1/orientacion', orientacionVocacionalRoutes);
```

**Características:**
- Todas las rutas protegidas con autenticación
- RBAC: solo estudiantes pueden acceder
- Validación de datos en todas las rutas que reciben body/params

---

## 🌱 Fase 7: Seeders

### Objetivo
Poblar la base de datos con datos iniciales (preguntas del banco).

### Archivo Creado

#### `database/seeders/006-preguntas-holland-riasec.js`

**Contenido:**
- **72 preguntas** para el test Holland RIASEC
- **12 preguntas por dimensión** (6 dimensiones):
  - Realista (R)
  - Investigador (I)
  - Artístico (A)
  - Social (S)
  - Emprendedor (E)
  - Convencional (C)

**Estructura de cada pregunta:**
- `codigo`: Identificador único (ej: 'HOLLAND-R-001')
- `texto_pregunta`: Texto de la pregunta
- `tipo_pregunta`: 'directa', 'comparativa', 'proyectiva', 'situacional'
- `peso`: 'baja', 'media', 'alta'
- `dimensiones_secundarias`: Array de dimensiones relacionadas
- `correlaciones_academicas`: Objeto con asignaturas e IAA mínimo
- `opciones_respuesta`: Array de opciones (si aplica)

**Tipos de preguntas incluidas:**
- **Directas**: Preguntas simples de sí/no o escala
- **Comparativas**: Comparan dos opciones
- **Proyectivas**: Escenarios hipotéticos
- **Situacionales**: Situaciones específicas

**Ejemplo de pregunta:**
```javascript
{
  codigo: 'HOLLAND-R-001',
  texto_pregunta: '¿Prefieres trabajar con herramientas y máquinas?',
  tipo_pregunta: 'directa',
  peso: 'alta',
  dimensiones_secundarias: ['Investigador'],
  correlaciones_academicas: {
    asignaturas: ['Física', 'Matemáticas'],
    iaa_minimo: 14
  }
}
```

### Actualización de `database/seeders/index.js`

Se agregó el seeder:
```javascript
const seedPreguntasHolland = require('./006-preguntas-holland-riasec');
// ...
await seedPreguntasHolland();
```

**Para ejecutar:**
```bash
npm run seed
```

---

## 📖 Fase 8: Documentación Swagger

### Objetivo
Documentar todos los endpoints en Swagger/OpenAPI.

### Archivos Modificados

#### 1. `src/routes/orientacionVocacionalRoutes.js`

Se agregó documentación `@swagger` para cada endpoint:

- **Tag creado:** `Orientación Vocacional`
- **9 endpoints documentados** con:
  - Summary y description
  - Security (bearerAuth)
  - Request body schemas
  - Response schemas
  - Códigos de respuesta (200, 400, 401, 403, 404)

**Ejemplo de documentación:**
```javascript
/**
 * @swagger
 * /api/v1/orientacion/iniciar-test:
 *   post:
 *     summary: Inicia un nuevo test de orientación vocacional
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     ...
 */
```

#### 2. `src/config/swagger.js`

Se agregó el tag en la lista de tags:
```javascript
{
  name: 'Orientación Vocacional',
  description: 'Sistema inteligente de orientación vocacional con LLM y tests psicométricos'
}
```

**Acceso a la documentación:**
- URL: `http://localhost:3000/api-docs` (o la URL configurada)
- Todos los endpoints aparecen bajo el tag "Orientación Vocacional"

---

## 🚀 Cómo Usar el Sistema

### 1. Ejecutar Migraciones

```bash
npm run migrate
```

### 2. Ejecutar Seeders

```bash
npm run seed
```

Esto creará las 72 preguntas del test Holland RIASEC.

### 3. Iniciar el Servidor

```bash
npm start
```

### 4. Probar Endpoints

#### Iniciar un Test

```bash
POST /api/v1/orientacion/iniciar-test
Authorization: Bearer {token}
Content-Type: application/json

{
  "tipoTest": "Holland_RIASEC"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Test iniciado correctamente",
  "data": {
    "sesionId": "123e4567-e89b-12d3-a456-426614174000",
    "tipoTest": "Holland_RIASEC",
    "estado": "ronda_1",
    "preguntas": [...],
    "fechaInicio": "2025-01-15T10:00:00Z"
  }
}
```

#### Guardar Respuestas Ronda 1

```bash
POST /api/v1/orientacion/guardar-respuestas-ronda-1
Authorization: Bearer {token}
Content-Type: application/json

{
  "sesionId": "123e4567-e89b-12d3-a456-426614174000",
  "respuestas": [
    {
      "preguntaId": "pregunta-uuid-1",
      "respuesta": true,
      "tiempoSegundos": 15,
      "nivelSeguridad": "alto"
    },
    ...
  ]
}
```

#### Guardar Respuestas Ronda 2

Similar a Ronda 1, pero el sistema procesará el test completo y generará resultados.

#### Obtener Resultados

```bash
GET /api/v1/orientacion/resultados/{sesionId}
Authorization: Bearer {token}
```

#### Obtener Perfil Vocacional

```bash
GET /api/v1/orientacion/mi-perfil-vocacional
Authorization: Bearer {token}
```

---

## 🔑 Características Clave del Sistema

### 1. Rotación Inteligente de Preguntas

- **Problema resuelto:** Evita descartar áreas de interés prematuramente
- **Solución:** 
  - Ronda 1: 4 preguntas por dimensión (balanceadas)
  - Ronda 2: Preguntas adaptativas basadas en LLM
  - Análisis de ambigüedades
  - Validación cruzada con trayectoria académica

### 2. Integración con LLM

- Selección adaptativa de preguntas
- Análisis de respuestas
- Detección de discrepancias
- Generación de recomendaciones personalizadas

### 3. Validación Cruzada

- Compara resultados del test con:
  - Trayectoria académica
  - Asignaturas destacadas
  - Actividades extracurriculares
  - IAA (Índice Académico Acumulado)

### 4. Acompañamiento Continuo

- Recomendaciones actualizadas
- Análisis de cambio de carrera
- Seguimiento del perfil vocacional

---

## 📊 Estructura de Datos

### Flujo de Datos

```
Usuario → Inicia Test → Ronda 1 → Respuestas → LLM Analiza → Ronda 2 → 
Respuestas → Procesamiento → Resultados → Recomendaciones
```

### Relaciones entre Tablas

```
Usuario
  ├── SesionTestOrientacion (1:N)
  │     ├── RespuestaTestOrientacion (1:N)
  │     └── ResultadoOrientacion (1:1)
  └── TrayectoriaAcademica (1:N)

PreguntaOrientacion
  ├── RespuestaTestOrientacion (1:N)
  └── EfectividadPregunta (1:N)
```

---

## 🧪 Próximos Pasos (Opcional)

1. **Testing:**
   - Unit tests para servicios
   - Integration tests para endpoints
   - Tests de LLM (mocks)

2. **Mejoras:**
   - Seeder de preguntas Kuder
   - Dashboard de estadísticas
   - Exportación de resultados (PDF)
   - Notificaciones de recomendaciones

3. **Optimizaciones:**
   - Caché de preguntas frecuentes
   - Optimización de consultas
   - Rate limiting en endpoints

---

## 📝 Notas Importantes

1. **Autenticación:** Todos los endpoints requieren JWT Bearer token
2. **RBAC:** Solo usuarios con rol 'estudiante' pueden acceder
3. **Validación:** Todos los datos de entrada son validados con Joi
4. **Errores:** Errores manejados con `ApiError` y `asyncHandler`
5. **Respuestas:** Todas las respuestas usan formato `ApiResponse`

---

## 🎉 Conclusión

El sistema de orientación vocacional está **completamente implementado** y listo para usar. Incluye:

✅ Base de datos estructurada
✅ Modelos ORM con relaciones
✅ Lógica de negocio completa
✅ API REST documentada
✅ Validación de datos
✅ Seeders de preguntas
✅ Documentación Swagger

**El sistema está listo para integrarse con el frontend y comenzar a ayudar a estudiantes en su orientación vocacional.**

---

**Desarrollado para:** Universidad Metropolitana  
**Fecha:** Enero 2025  
**Versión:** 1.0.0

