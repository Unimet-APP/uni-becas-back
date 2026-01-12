# 📚 FASE 4: Guía Completa - Controladores y Rutas

## 🎯 ¿Qué es la Fase 4?

La Fase 4 conecta el **frontend** con el **backend**. Define:
- **Controladores**: Manejan las peticiones HTTP y llaman a los servicios
- **Rutas**: Definen los endpoints de la API
- **Validadores**: Validan los datos de entrada antes de procesarlos

**Flujo completo:**
```
Cliente (Frontend) 
  ↓ HTTP Request
Ruta (Router) 
  ↓ Middleware (Auth, RBAC, Validación)
Controlador 
  ↓ Llamada a Servicio
Servicio 
  ↓ Llamada a Modelo
Base de Datos
```

---

## 📋 Componentes de la Fase 4

### **1. Validadores (Validators)**
Validan los datos de entrada antes de que lleguen al controlador.

### **2. Controladores (Controllers)**
Manejan las peticiones HTTP y coordinan con los servicios.

### **3. Rutas (Routes)**
Definen los endpoints y aplican middleware (auth, validación, etc.).

---

## 🔍 PARTE 1: Validadores

### **¿Qué es un Validador?**

Un validador verifica que los datos enviados por el cliente cumplan con las reglas esperadas **antes** de procesarlos.

**Ubicación:** `src/validators/orientacionVocacionalValidators.js`

### **Estructura de un Validador con Joi:**

```javascript
const Joi = require('joi');

// 1. Definir schema de validación
const iniciarTestSchema = Joi.object({
  tipoTest: Joi.string().valid('Kuder', 'Holland_RIASEC').required()
});

// 2. Crear middleware de validación
const validateIniciarTest = (req, res, next) => {
  const { error } = iniciarTestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map(d => d.message)
    });
  }
  next(); // Si no hay error, continuar
};

// 3. Exportar
module.exports = { validateIniciarTest };
```

### **Tipos de Validación en Joi:**

#### **1. Validación de Strings:**
```javascript
Joi.string()
  .required()              // Campo obligatorio
  .min(10)                // Mínimo 10 caracteres
  .max(100)               // Máximo 100 caracteres
  .email()                // Debe ser email válido
  .uuid()                 // Debe ser UUID válido
  .valid('valor1', 'valor2')  // Solo estos valores
```

#### **2. Validación de Números:**
```javascript
Joi.number()
  .integer()              // Solo enteros
  .positive()             // Solo positivos
  .min(0)                 // Mínimo 0
  .max(100)               // Máximo 100
```

#### **3. Validación de Arrays:**
```javascript
Joi.array()
  .items(Joi.string())    // Array de strings
  .min(1)                 // Mínimo 1 elemento
  .max(20)                // Máximo 20 elementos
  .required()            // Campo obligatorio
```

#### **4. Validación de Objetos:**
```javascript
Joi.object({
  campo1: Joi.string().required(),
  campo2: Joi.number().optional()
})
```

#### **5. Validación de Alternativas (Union Types):**
```javascript
Joi.alternatives()
  .try(
    Joi.string(),
    Joi.number(),
    Joi.boolean()
  )
  .required()
```

### **Validadores Creados:**

#### **1. `validateIniciarTest`**
Valida el inicio de un test:
- `tipoTest`: Debe ser 'Kuder' o 'Holland_RIASEC'

#### **2. `validateGuardarRespuestasRonda1`**
Valida respuestas de Ronda 1:
- `sesionId`: UUID válido
- `respuestas`: Array de 1-20 respuestas
  - Cada respuesta tiene: `preguntaId`, `respuesta`, `tiempoSegundos` (opcional), `nivelSeguridad` (opcional)

#### **3. `validateGuardarRespuestasRonda2`**
Similar a Ronda 1, pero permite 1-15 respuestas

#### **4. `validateAnalizarCambioCarrera`**
Valida análisis de cambio de carrera:
- `nuevaCarreraId`: Número entero positivo

#### **5. `validateSesionIdParam`**
Valida parámetro de ruta:
- `sesionId`: UUID válido en `req.params`

---

## 🎮 PARTE 2: Controladores

### **¿Qué es un Controlador?**

Un controlador es la capa que:
- Recibe peticiones HTTP
- Extrae datos de `req.body`, `req.params`, `req.query`
- Llama a los servicios apropiados
- Retorna respuestas estructuradas

**Ubicación:** `src/controllers/orientacionVocacionalController.js`

### **Estructura de un Controlador:**

```javascript
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const servicio = require('../services/servicio');

class NombreController {
  /**
   * Descripción del endpoint
   */
  nombreMetodo = asyncHandler(async (req, res) => {
    // 1. Extraer datos
    const { campo1, campo2 } = req.body;
    const { id } = req.params;
    const usuarioId = req.user.id; // Del middleware auth

    // 2. Llamar al servicio
    const resultado = await servicio.metodo(campo1, campo2, usuarioId);

    // 3. Retornar respuesta
    res.json(new ApiResponse(200, resultado, 'Mensaje de éxito'));
  });
}

module.exports = new NombreController();
```

### **¿Qué es asyncHandler?**

`asyncHandler` envuelve funciones async para manejar errores automáticamente:

```javascript
// Sin asyncHandler (tienes que hacer try/catch manual)
async (req, res) => {
  try {
    // código
  } catch (error) {
    next(error);
  }
}

// Con asyncHandler (automático)
asyncHandler(async (req, res) => {
  // código - los errores se capturan automáticamente
})
```

### **¿Qué es ApiResponse?**

Clase que estructura las respuestas de la API:

```javascript
new ApiResponse(200, datos, 'Mensaje')
// Retorna:
{
  statusCode: 200,
  data: datos,
  message: 'Mensaje',
  success: true
}
```

### **Controladores Creados:**

#### **1. `iniciarTest`**
**Endpoint:** `POST /api/v1/orientacion/iniciar-test`

**¿Qué hace?**
- Extrae `tipoTest` del body
- Obtiene `usuarioId` del token (req.user.id)
- Llama a `testOrientacionService.crearSesion()`
- Retorna sesión con preguntas de Ronda 1

**Respuesta:**
```json
{
  "statusCode": 200,
  "data": {
    "sesionId": "uuid",
    "tipoTest": "Holland_RIASEC",
    "estado": "iniciada",
    "preguntas": [...],
    "fechaInicio": "2025-01-07T..."
  },
  "message": "Test iniciado correctamente",
  "success": true
}
```

---

#### **2. `guardarRespuestasRonda1`**
**Endpoint:** `POST /api/v1/orientacion/guardar-respuestas-ronda-1`

**¿Qué hace?**
- Extrae `sesionId` y `respuestas` del body
- Llama a `testOrientacionService.guardarRespuestasRonda1()`
- Retorna puntuaciones, ambigüedades, discrepancias y preguntas Ronda 2

**Respuesta:**
```json
{
  "statusCode": 200,
  "data": {
    "puntuaciones": { "Realista": 70, "Investigador": 85, ... },
    "areasAmbiguas": ["Artístico"],
    "discrepancias": [...],
    "preguntasRonda2": [...],
    "estado": "ronda_1_completada"
  },
  "message": "Respuestas de Ronda 1 guardadas correctamente",
  "success": true
}
```

---

#### **3. `guardarRespuestasRonda2`**
**Endpoint:** `POST /api/v1/orientacion/guardar-respuestas-ronda-2`

**¿Qué hace?**
- Extrae `sesionId` y `respuestas` del body
- Llama a `testOrientacionService.guardarRespuestasRonda2()` (calcula puntuaciones)
- Llama a `orientacionVocacionalService.procesarTestCompletado()` (procesa con LLM)
- Retorna puntuaciones finales y resultado completo

**Respuesta:**
```json
{
  "statusCode": 200,
  "data": {
    "puntuacionesRonda2": {...},
    "puntuacionesFinales": {...},
    "resultado": {
      "id": "uuid",
      "codigoHolland": "ISR",
      "perfilDominante": "Investigador",
      "recomendacionesCarreras": [...],
      "perfilVocacional": {...}
    },
    "estado": "finalizada"
  },
  "message": "Test completado y analizado exitosamente",
  "success": true
}
```

---

#### **4. `obtenerSesion`**
**Endpoint:** `GET /api/v1/orientacion/sesion/:sesionId`

**¿Qué hace?**
- Extrae `sesionId` de params
- Verifica que la sesión pertenezca al usuario
- Retorna información de la sesión

---

#### **5. `obtenerResultados`**
**Endpoint:** `GET /api/v1/orientacion/resultados/:sesionId`

**¿Qué hace?**
- Extrae `sesionId` de params
- Obtiene resultado completo de la sesión
- Retorna recomendaciones, perfil vocacional, análisis LLM

---

#### **6. `obtenerPerfilVocacional`**
**Endpoint:** `GET /api/v1/orientacion/mi-perfil-vocacional`

**¿Qué hace?**
- Obtiene perfil completo del usuario autenticado
- Incluye último resultado, trayectoria académica, historial

---

#### **7. `obtenerHistorial`**
**Endpoint:** `GET /api/v1/orientacion/historial`

**¿Qué hace?**
- Obtiene historial de todos los tests del usuario
- Retorna array de sesiones con sus resultados

---

#### **8. `generarRecomendacionesContinuas`**
**Endpoint:** `POST /api/v1/orientacion/recomendaciones-continuas`

**¿Qué hace?**
- Genera recomendaciones actualizadas basadas en trayectoria actualizada
- Compara con resultado anterior
- Retorna recomendaciones de seguimiento

---

#### **9. `analizarCambioCarrera`**
**Endpoint:** `POST /api/v1/orientacion/analizar-cambio-carrera`

**¿Qué hace?**
- Analiza viabilidad de cambiar a una nueva carrera
- Compara perfil vocacional con nueva carrera
- Retorna análisis de compatibilidad

---

## 🛣️ PARTE 3: Rutas

### **¿Qué es una Ruta?**

Una ruta define:
- **URL del endpoint** (ej: `/api/v1/orientacion/iniciar-test`)
- **Método HTTP** (GET, POST, PUT, DELETE)
- **Middleware** a aplicar (auth, validación, RBAC)
- **Controlador** que maneja la petición

**Ubicación:** `src/routes/orientacionVocacionalRoutes.js`

### **Estructura de una Ruta:**

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller');
const authenticate = require('../middleware/auth').authenticate;
const rbac = require('../middleware/rbac');
const { validate } = require('../validators/validators');

// Ruta con todos los middlewares
router.post(
  '/endpoint',                    // URL
  authenticate,                   // 1. Verificar autenticación
  rbac(['estudiante']),          // 2. Verificar rol
  validate,                       // 3. Validar datos
  controller.metodo               // 4. Ejecutar controlador
);

module.exports = router;
```

### **Orden de Middleware:**

El orden es **importante**. Se ejecutan de izquierda a derecha:

1. **authenticate**: Verifica que el usuario esté autenticado
2. **rbac**: Verifica que tenga el rol correcto
3. **validate**: Valida los datos de entrada
4. **controller**: Ejecuta la lógica

**¿Por qué este orden?**
- Primero verificamos que esté autenticado
- Luego verificamos permisos
- Después validamos datos (más costoso)
- Finalmente ejecutamos la lógica

### **Rutas Creadas:**

#### **1. POST `/api/v1/orientacion/iniciar-test`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateIniciarTest`
- **Controlador:** `iniciarTest`

#### **2. POST `/api/v1/orientacion/guardar-respuestas-ronda-1`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateGuardarRespuestasRonda1`
- **Controlador:** `guardarRespuestasRonda1`

#### **3. POST `/api/v1/orientacion/guardar-respuestas-ronda-2`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateGuardarRespuestasRonda2`
- **Controlador:** `guardarRespuestasRonda2`

#### **4. GET `/api/v1/orientacion/sesion/:sesionId`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateSesionIdParam` (valida parámetro)
- **Controlador:** `obtenerSesion`

#### **5. GET `/api/v1/orientacion/resultados/:sesionId`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateSesionIdParam`
- **Controlador:** `obtenerResultados`

#### **6. GET `/api/v1/orientacion/mi-perfil-vocacional`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** Ninguna (no recibe datos)
- **Controlador:** `obtenerPerfilVocacional`

#### **7. GET `/api/v1/orientacion/historial`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** Ninguna
- **Controlador:** `obtenerHistorial`

#### **8. POST `/api/v1/orientacion/recomendaciones-continuas`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** Ninguna
- **Controlador:** `generarRecomendacionesContinuas`

#### **9. POST `/api/v1/orientacion/analizar-cambio-carrera`**
- **Auth:** Requerida
- **Rol:** `estudiante`
- **Validación:** `validateAnalizarCambioCarrera`
- **Controlador:** `analizarCambioCarrera`

---

## 🔐 PARTE 4: Middleware de Seguridad

### **1. Authenticate**

**¿Qué hace?**
- Extrae token JWT del header `Authorization: Bearer <token>`
- Verifica que el token sea válido
- Busca el usuario en la base de datos
- Agrega `req.user` con los datos del usuario

**Uso:**
```javascript
router.post('/endpoint', authenticate, controller.metodo);
```

**Si falla:**
- Retorna 401 (No autorizado)

---

### **2. RBAC (Role-Based Access Control)**

**¿Qué hace?**
- Verifica que el usuario tenga uno de los roles permitidos
- Usa `req.user.tipo_usuario` (del middleware authenticate)

**Uso:**
```javascript
router.post('/endpoint', rbac(['estudiante']), controller.metodo);
router.post('/admin', rbac(['admin', 'gestor_becas']), controller.metodo);
```

**Si falla:**
- Retorna 403 (Prohibido)

---

### **3. Validación**

**¿Qué hace?**
- Valida `req.body`, `req.params`, o `req.query` según el schema
- Retorna errores detallados si hay problemas

**Uso:**
```javascript
router.post('/endpoint', validateIniciarTest, controller.metodo);
```

**Si falla:**
- Retorna 400 (Bad Request) con detalles de errores

---

## 📝 PARTE 5: Registro de Rutas

### **Archivo: `src/routes/index.js`**

**¿Qué hace?**
- Importa todas las rutas
- Las registra con prefijos
- Define el router principal

**Registro:**
```javascript
const orientacionVocacionalRoutes = require('./orientacionVocacionalRoutes');

// Registrar con prefijo
router.use('/v1/orientacion', orientacionVocacionalRoutes);
```

**Resultado:**
- Las rutas quedan disponibles en `/api/v1/orientacion/*`

---

## 🔄 Flujo Completo de una Petición

### **Ejemplo: Iniciar Test**

```
1. Cliente envía:
   POST /api/v1/orientacion/iniciar-test
   Headers: { Authorization: "Bearer <token>" }
   Body: { tipoTest: "Holland_RIASEC" }

2. Express Router recibe la petición
   ↓

3. Middleware: authenticate
   - Extrae token
   - Verifica validez
   - Busca usuario
   - Agrega req.user
   ↓

4. Middleware: rbac(['estudiante'])
   - Verifica que req.user.tipo_usuario === 'estudiante'
   ↓

5. Middleware: validateIniciarTest
   - Valida que tipoTest sea 'Kuder' o 'Holland_RIASEC'
   ↓

6. Controlador: iniciarTest
   - Extrae: tipoTest del body, usuarioId de req.user
   - Llama: testOrientacionService.crearSesion(usuarioId, tipoTest)
   ↓

7. Servicio: crearSesion
   - Crea sesión en BD
   - Obtiene preguntas
   - Retorna resultado
   ↓

8. Controlador retorna:
   res.json(new ApiResponse(200, datos, 'Mensaje'))
   ↓

9. Cliente recibe respuesta JSON
```

---

## 📊 Estructura de Respuestas

### **Respuesta Exitosa (200):**

```json
{
  "statusCode": 200,
  "data": {
    // Datos aquí
  },
  "message": "Operación exitosa",
  "success": true
}
```

### **Respuesta de Error (400):**

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error de validación",
  "success": false,
  "errors": [
    {
      "field": "tipoTest",
      "message": "El tipo de test debe ser \"Kuder\" o \"Holland_RIASEC\""
    }
  ]
}
```

### **Respuesta No Autorizado (401):**

```json
{
  "statusCode": 401,
  "data": null,
  "message": "Token inválido o expirado",
  "success": false
}
```

### **Respuesta Prohibido (403):**

```json
{
  "statusCode": 403,
  "data": null,
  "message": "Acceso denegado. No tienes permisos para realizar esta acción.",
  "success": false,
  "required_roles": ["estudiante"],
  "user_role": "admin"
}
```

---

## ✅ Checklist de Implementación

### **Validadores:**
- [x] `validateIniciarTest` - Valida tipo de test
- [x] `validateGuardarRespuestasRonda1` - Valida respuestas Ronda 1
- [x] `validateGuardarRespuestasRonda2` - Valida respuestas Ronda 2
- [x] `validateAnalizarCambioCarrera` - Valida cambio de carrera
- [x] `validateSesionIdParam` - Valida parámetro sesionId

### **Controladores:**
- [x] `iniciarTest` - Inicia nuevo test
- [x] `guardarRespuestasRonda1` - Procesa Ronda 1
- [x] `guardarRespuestasRonda2` - Procesa Ronda 2 y completa test
- [x] `obtenerSesion` - Obtiene información de sesión
- [x] `obtenerResultados` - Obtiene resultados completos
- [x] `obtenerPerfilVocacional` - Obtiene perfil completo
- [x] `obtenerHistorial` - Obtiene historial de tests
- [x] `generarRecomendacionesContinuas` - Recomendaciones actualizadas
- [x] `analizarCambioCarrera` - Analiza cambio de carrera

### **Rutas:**
- [x] POST `/iniciar-test`
- [x] POST `/guardar-respuestas-ronda-1`
- [x] POST `/guardar-respuestas-ronda-2`
- [x] GET `/sesion/:sesionId`
- [x] GET `/resultados/:sesionId`
- [x] GET `/mi-perfil-vocacional`
- [x] GET `/historial`
- [x] POST `/recomendaciones-continuas`
- [x] POST `/analizar-cambio-carrera`

### **Registro:**
- [x] Rutas registradas en `src/routes/index.js`

---

## 🧪 Cómo Probar los Endpoints

### **1. Obtener Token de Autenticación:**

```bash
POST /api/v1/auth/login
Body: {
  "email": "juan.perez@unimet.edu.ve",
  "password": "Student123!"
}

Response: {
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **2. Iniciar Test:**

```bash
POST /api/v1/orientacion/iniciar-test
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Body: {
  "tipoTest": "Holland_RIASEC"
}

Response: {
  "statusCode": 200,
  "data": {
    "sesionId": "550e8400-...",
    "tipoTest": "Holland_RIASEC",
    "preguntas": [...]
  }
}
```

### **3. Guardar Respuestas Ronda 1:**

```bash
POST /api/v1/orientacion/guardar-respuestas-ronda-1
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Body: {
  "sesionId": "550e8400-...",
  "respuestas": [
    {
      "preguntaId": "550e8400-...",
      "respuesta": true,
      "tiempoSegundos": 5,
      "nivelSeguridad": "seguro"
    },
    // ... más respuestas
  ]
}
```

### **4. Obtener Perfil Vocacional:**

```bash
GET /api/v1/orientacion/mi-perfil-vocacional
Headers: {
  "Authorization": "Bearer <accessToken>"
}
```

---

## 💡 Consejos y Buenas Prácticas

1. **Siempre validar:**
   - Validar datos de entrada en validadores
   - Validar permisos en controladores
   - Validar existencia de recursos

2. **Manejo de errores:**
   - Usar `asyncHandler` para capturar errores automáticamente
   - Retornar mensajes de error claros
   - No exponer detalles internos del sistema

3. **Seguridad:**
   - Siempre usar `authenticate` en rutas privadas
   - Usar `rbac` para control de acceso
   - Validar que el usuario solo acceda a sus propios recursos

4. **Respuestas consistentes:**
   - Usar `ApiResponse` para estructurar respuestas
   - Mantener formato consistente
   - Incluir mensajes descriptivos

5. **Documentación:**
   - Comentar cada endpoint con JSDoc
   - Documentar parámetros esperados
   - Documentar respuestas posibles

---

## 🚀 Endpoints Disponibles

### **Flujo Principal:**

1. **Iniciar Test**
   ```
   POST /api/v1/orientacion/iniciar-test
   → Retorna: sesionId + preguntas Ronda 1
   ```

2. **Completar Ronda 1**
   ```
   POST /api/v1/orientacion/guardar-respuestas-ronda-1
   → Retorna: puntuaciones + preguntas Ronda 2
   ```

3. **Completar Ronda 2**
   ```
   POST /api/v1/orientacion/guardar-respuestas-ronda-2
   → Retorna: resultado completo con recomendaciones
   ```

### **Consultas:**

4. **Ver Sesión**
   ```
   GET /api/v1/orientacion/sesion/:sesionId
   → Retorna: información de la sesión
   ```

5. **Ver Resultados**
   ```
   GET /api/v1/orientacion/resultados/:sesionId
   → Retorna: resultados completos
   ```

6. **Ver Perfil Completo**
   ```
   GET /api/v1/orientacion/mi-perfil-vocacional
   → Retorna: perfil consolidado
   ```

7. **Ver Historial**
   ```
   GET /api/v1/orientacion/historial
   → Retorna: historial de tests
   ```

### **Acompañamiento:**

8. **Recomendaciones Continuas**
   ```
   POST /api/v1/orientacion/recomendaciones-continuas
   → Retorna: recomendaciones actualizadas
   ```

9. **Analizar Cambio de Carrera**
   ```
   POST /api/v1/orientacion/analizar-cambio-carrera
   → Retorna: análisis de viabilidad
   ```

---

## 📚 Recursos Adicionales

- [Express.js Routing](https://expressjs.com/en/guide/routing.html)
- [Joi Validation](https://joi.dev/api/)
- [JWT Authentication](https://jwt.io/)

---

## ✅ Resumen de lo Implementado

### **Archivos Creados:**

1. ✅ `src/validators/orientacionVocacionalValidators.js`
   - 5 validadores con Joi
   - Validación de body y params

2. ✅ `src/controllers/orientacionVocacionalController.js`
   - 9 métodos de controlador
   - Manejo de errores con asyncHandler
   - Respuestas estructuradas con ApiResponse

3. ✅ `src/routes/orientacionVocacionalRoutes.js`
   - 9 rutas definidas
   - Middleware de seguridad aplicado
   - Documentación con comentarios

4. ✅ `src/routes/index.js` (actualizado)
   - Rutas registradas con prefijo `/v1/orientacion`

### **Características:**

- ✅ Validación completa de datos
- ✅ Autenticación requerida
- ✅ Control de acceso por roles
- ✅ Manejo de errores robusto
- ✅ Respuestas estructuradas
- ✅ Documentación en código

---

¡La Fase 4 está completa! Ahora tienes una API REST completa y funcional para el sistema de orientación vocacional. 🎉

