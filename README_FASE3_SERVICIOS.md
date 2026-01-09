# 📚 FASE 3: Guía Completa para Crear Servicios de Negocio

## 🎯 ¿Qué es un Servicio?

Un **servicio** es una capa de lógica de negocio que:
- **Orquesta** operaciones complejas entre múltiples modelos
- **Valida** reglas de negocio antes de guardar datos
- **Procesa** y transforma datos
- **Integra** con servicios externos (LLM, email, etc.)
- **Centraliza** la lógica para que los controladores sean simples

**Ejemplo conceptual:**
```
Controlador (simple) → Servicio (lógica compleja) → Modelos (datos)
```

---

## 📋 Estructura Básica de un Servicio

### **Patrón Clase (Recomendado para servicios complejos):**

```javascript
const { Modelo1, Modelo2 } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

class NombreService {
  /**
   * Método principal del servicio
   * @param {Object} parametros - Parámetros necesarios
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async metodoPrincipal(parametros) {
    try {
      // 1. Validar parámetros
      this.validarParametros(parametros);

      // 2. Obtener datos necesarios
      const datos = await this.obtenerDatos(parametros);

      // 3. Procesar lógica de negocio
      const resultado = await this.procesarLogica(datos);

      // 4. Guardar resultados
      const guardado = await this.guardarResultados(resultado);

      // 5. Retornar resultado
      return guardado;
    } catch (error) {
      console.error('Error en NombreService.metodoPrincipal:', error);
      throw new ApiError(500, `Error: ${error.message}`);
    }
  }

  // Métodos auxiliares privados (no se exportan)
  validarParametros(parametros) {
    if (!parametros.campo) {
      throw new ApiError(400, 'Campo requerido');
    }
  }

  async obtenerDatos(parametros) {
    return await Modelo1.findByPk(parametros.id);
  }

  async procesarLogica(datos) {
    // Lógica aquí
    return datos;
  }

  async guardarResultados(resultado) {
    return await Modelo2.create(resultado);
  }
}

module.exports = new NombreService();
```

---

## 🔍 Paso a Paso: Cómo Crear un Servicio

### **PASO 1: Crear el archivo**

**Ubicación:** `src/services/NombreService.js`

**Convención de nombres:**
- Archivo: `bancoPreguntasService.js` (camelCase)
- Clase: `BancoPreguntasService` (PascalCase)
- Instancia exportada: `new BancoPreguntasService()` (singleton)

---

### **PASO 2: Importar Dependencias**

```javascript
// Modelos necesarios
const { PreguntaOrientacion, SesionTestOrientacion } = require('../models');

// Utilidades de Sequelize
const { Op } = require('sequelize');

// Manejo de errores
const ApiError = require('../utils/ApiError');

// Otros servicios si los necesitas
const llmService = require('./llmService');
```

---

### **PASO 3: Estructurar la Clase**

```javascript
class NombreService {
  // Constructor (opcional, para inicializar cosas)
  constructor() {
    // Inicializaciones si las necesitas
  }

  // Métodos públicos (la API del servicio)
  async metodoPublico1() { }
  async metodoPublico2() { }

  // Métodos privados (auxiliares, no se usan desde fuera)
  metodoPrivado1() { }
  metodoPrivado2() { }
}

module.exports = new NombreService();
```

---

### **PASO 4: Manejo de Errores**

**Siempre usar ApiError para errores controlados:**

```javascript
const ApiError = require('../utils/ApiError');

// Error de validación (400)
throw new ApiError(400, 'El campo X es requerido');

// Error de no encontrado (404)
throw new ApiError(404, 'Recurso no encontrado');

// Error del servidor (500)
throw new ApiError(500, 'Error interno del servidor');
```

**Envolver en try/catch:**

```javascript
async metodoComplejo() {
  try {
    // Lógica aquí
  } catch (error) {
    console.error('Error en metodoComplejo:', error);
    
    // Si ya es ApiError, relanzarlo
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Si no, crear nuevo ApiError
    throw new ApiError(500, `Error: ${error.message}`);
  }
}
```

---

## 🎯 Servicios a Crear en la Fase 3

### **SERVICIO 1: BancoPreguntasService**

**Archivo:** `src/services/bancoPreguntasService.js`

**Responsabilidad:** Gestionar el banco de preguntas y selección inteligente.

#### **Métodos Principales:**

##### **1. `obtenerPreguntasRonda1(tipoTest, usuarioId, seed)`**

**¿Qué hace?**
- Selecciona 2 preguntas por dimensión (1 alta, 1 media)
- Evita preguntas usadas en tests previos del usuario
- Usa seed para reproducibilidad

**Lógica paso a paso:**
1. Obtener todas las preguntas activas del tipo de test
2. Agrupar por dimensión
3. Para cada dimensión:
   - Filtrar preguntas no usadas por el usuario
   - Seleccionar 1 de peso "alta" (aleatoria pero con seed)
   - Seleccionar 1 de peso "media" (aleatoria pero con seed)
4. Mezclar todas las preguntas (no agrupar por dimensión)
5. Retornar array de preguntas

**Pseudocódigo:**
```javascript
async obtenerPreguntasRonda1(tipoTest, usuarioId, seed) {
  // 1. Obtener preguntas activas
  const todasPreguntas = await PreguntaOrientacion.findAll({
    where: { tipo_test: tipoTest, activa: true }
  });

  // 2. Obtener preguntas ya usadas por el usuario
  const sesionesPrevias = await SesionTestOrientacion.findAll({
    where: { usuario_id: usuarioId }
  });
  const preguntasUsadas = obtenerPreguntasUsadas(sesionesPrevias);

  // 3. Agrupar por dimensión y filtrar
  const porDimension = agruparPorDimension(todasPreguntas);
  const preguntasSeleccionadas = [];

  for (const dimension in porDimension) {
    const disponibles = porDimension[dimension]
      .filter(p => !preguntasUsadas.includes(p.id));
    
    // Seleccionar 1 alta y 1 media usando seed
    const alta = seleccionarAleatoria(disponibles.filter(p => p.peso === 'alta'), seed + dimension);
    const media = seleccionarAleatoria(disponibles.filter(p => p.peso === 'media'), seed + dimension);
    
    if (alta) preguntasSeleccionadas.push(alta);
    if (media) preguntasSeleccionadas.push(media);
  }

  // 4. Mezclar y retornar
  return mezclarAleatoriamente(preguntasSeleccionadas, seed);
}
```

---

##### **2. `obtenerPreguntasRonda2(sesionId, puntuacionesRonda1, discrepancias, areasAmbiguas)`**

**¿Qué hace?**
- Analiza puntuaciones de Ronda 1
- Selecciona preguntas adaptativas según el perfil emergente
- Aplica reglas anti-sesgo

**Lógica paso a paso:**
1. Analizar puntuaciones:
   - Alto interés (>60): necesita confirmación
   - Bajo interés (<40): necesita validación
   - Ambiguas (40-60): necesita polarización
2. Para cada categoría, seleccionar preguntas apropiadas
3. Agregar preguntas de validación cruzada si hay discrepancias
4. Aplicar reglas de protección (mínimo 1 por dimensión)
5. Retornar array de preguntas

**Pseudocódigo:**
```javascript
async obtenerPreguntasRonda2(sesionId, puntuacionesRonda1, discrepancias, areasAmbiguas) {
  const preguntasSeleccionadas = [];
  const dimensiones = Object.keys(puntuacionesRonda1);

  for (const dimension of dimensiones) {
    const puntuacion = puntuacionesRonda1[dimension];

    if (puntuacion > 60) {
      // Alto interés: 2-3 preguntas de confirmación (peso alta)
      const confirmacion = await PreguntaOrientacion.obtenerPolarizantes(
        sesion.tipo_test, 2
      );
      preguntasSeleccionadas.push(...confirmacion.filter(p => 
        p.dimension_principal === dimension
      ));
    } else if (puntuacion < 40) {
      // Bajo interés: 1-2 preguntas de validación (peso baja)
      const validacion = await PreguntaOrientacion.findAll({
        where: {
          dimension_principal: dimension,
          peso: 'baja',
          activa: true
        },
        limit: 2
      });
      preguntasSeleccionadas.push(...validacion);
    } else {
      // Ambiguas: 2 preguntas polarizantes
      const polarizantes = await PreguntaOrientacion.obtenerPolarizantes(
        sesion.tipo_test, 2
      );
      preguntasSeleccionadas.push(...polarizantes.filter(p => 
        p.dimension_principal === dimension
      ));
    }
  }

  // Agregar preguntas de validación cruzada
  for (const discrepancia of discrepancias) {
    const preguntaValidacion = await this.seleccionarPreguntaValidacionCruzada(
      discrepancia
    );
    if (preguntaValidacion) {
      preguntasSeleccionadas.push(preguntaValidacion);
    }
  }

  // Aplicar reglas anti-sesgo
  return this.aplicarReglasAntiSesgo(preguntasSeleccionadas, dimensiones);
}
```

---

##### **3. `aplicarReglasAntiSesgo(preguntasSeleccionadas, dimensiones)`**

**¿Qué hace?**
- Garantiza que todas las dimensiones tengan al menos 1 pregunta
- Valida que áreas de bajo interés tengan validación
- Valida que áreas ambiguas tengan polarizantes

**Lógica:**
```javascript
aplicarReglasAntiSesgo(preguntasSeleccionadas, dimensiones) {
  const dimensionesCubiertas = new Set(
    preguntasSeleccionadas.map(p => p.dimension_principal)
  );

  // Regla 1: Mínimo 1 pregunta por dimensión
  for (const dimension of dimensiones) {
    if (!dimensionesCubiertas.has(dimension)) {
      // Agregar pregunta de validación (peso baja)
      const preguntaMinima = await this.obtenerPreguntaMinima(dimension);
      if (preguntaMinima) {
        preguntasSeleccionadas.push(preguntaMinima);
        dimensionesCubiertas.add(dimension);
      }
    }
  }

  return preguntasSeleccionadas;
}
```

---

##### **4. `seleccionarPreguntasValidacionCruzada(discrepancias, tipoTest)`**

**¿Qué hace?**
- Para cada discrepancia, busca pregunta específica que valide
- Prioriza preguntas con correlación académica

**Lógica:**
```javascript
async seleccionarPreguntasValidacionCruzada(discrepancias, tipoTest) {
  const preguntas = [];

  for (const discrepancia of discrepancias) {
    // Buscar pregunta que tenga correlación con la evidencia académica
    const pregunta = await PreguntaOrientacion.findOne({
      where: {
        tipo_test: tipoTest,
        dimension_principal: discrepancia.dimension,
        activa: true,
        // Buscar en correlaciones_academicas (JSONB)
        correlaciones_academicas: {
          [Op.contains]: {
            asignaturas: discrepancia.evidencia_academica.area
          }
        }
      },
      order: [['efectividad_historica', 'DESC']]
    });

    if (pregunta) {
      preguntas.push(pregunta);
    }
  }

  return preguntas;
}
```

---

##### **5. `actualizarEfectividadPregunta(preguntaId, fueCorrecta)`**

**¿Qué hace?**
- Actualiza contadores de uso y efectividad
- Recalcula efectividad_historica

**Lógica:**
```javascript
async actualizarEfectividadPregunta(preguntaId, fueCorrecta) {
  const pregunta = await PreguntaOrientacion.findByPk(preguntaId);
  
  if (!pregunta) {
    throw new ApiError(404, 'Pregunta no encontrada');
  }

  await pregunta.update({
    veces_usada: pregunta.veces_usada + 1,
    veces_efectiva: fueCorrecta 
      ? pregunta.veces_efectiva + 1 
      : pregunta.veces_efectiva
  });

  // Recalcular efectividad
  await pregunta.calcularEfectividad();
  
  return pregunta;
}
```

---

### **SERVICIO 2: TestOrientacionService**

**Archivo:** `src/services/testOrientacionService.js`

**Responsabilidad:** Gestionar sesiones de test y calcular puntuaciones.

#### **Métodos Principales:**

##### **1. `crearSesion(usuarioId, tipoTest)`**

**¿Qué hace?**
- Crea nueva sesión de test
- Genera seed aleatorio
- Obtiene preguntas Ronda 1
- Retorna sesión con preguntas

**Lógica:**
```javascript
async crearSesion(usuarioId, tipoTest) {
  // 1. Validar usuario
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario || usuario.role !== 'estudiante') {
    throw new ApiError(400, 'Usuario no válido o no es estudiante');
  }

  // 2. Verificar si hay sesión activa
  const sesionActiva = await SesionTestOrientacion.obtenerActivaPorUsuario(usuarioId);
  if (sesionActiva) {
    // Opción 1: Retornar sesión existente
    // Opción 2: Abandonar anterior y crear nueva
    await sesionActiva.update({ estado: 'abandonada' });
  }

  // 3. Generar seed aleatorio
  const seed = `${usuarioId}-${Date.now()}-${Math.random()}`;

  // 4. Crear sesión
  const sesion = await SesionTestOrientacion.create({
    usuario_id: usuarioId,
    tipo_test: tipoTest,
    estado: 'iniciada',
    seed_aleatorio: seed,
    fecha_inicio: new Date()
  });

  // 5. Obtener preguntas Ronda 1
  const bancoPreguntasService = require('./bancoPreguntasService');
  const preguntas = await bancoPreguntasService.obtenerPreguntasRonda1(
    tipoTest, 
    usuarioId, 
    seed
  );

  // 6. Guardar IDs de preguntas en sesión
  await sesion.update({
    preguntas_ronda_1: preguntas.map(p => p.id)
  });

  return {
    sesion,
    preguntas: preguntas.map(p => ({
      id: p.id,
      texto: p.texto_pregunta,
      tipo: p.tipo_pregunta,
      opciones: p.opciones_respuesta
    }))
  };
}
```

---

##### **2. `guardarRespuestasRonda1(sesionId, respuestas, usuarioId)`**

**¿Qué hace?**
- Valida que sesión pertenece al usuario
- Guarda cada respuesta
- Calcula puntuaciones preliminares
- Detecta ambigüedades y discrepancias
- Actualiza sesión

**Lógica:**
```javascript
async guardarRespuestasRonda1(sesionId, respuestas, usuarioId) {
  // 1. Validar sesión
  const sesion = await SesionTestOrientacion.findByPk(sesionId);
  if (!sesion || sesion.usuario_id !== usuarioId) {
    throw new ApiError(403, 'Sesión no encontrada o no autorizada');
  }

  if (sesion.estado !== 'iniciada') {
    throw new ApiError(400, 'La sesión ya no está en estado iniciada');
  }

  // 2. Guardar respuestas
  for (const respuesta of respuestas) {
    await RespuestaTestOrientacion.create({
      sesion_id: sesionId,
      pregunta_id: respuesta.preguntaId,
      usuario_id: usuarioId,
      ronda: 1,
      respuesta: respuesta.respuesta,
      tiempo_respuesta_segundos: respuesta.tiempoSegundos,
      nivel_seguridad: respuesta.nivelSeguridad
    });
  }

  // 3. Calcular puntuaciones
  const puntuaciones = await this.calcularPuntuaciones(respuestas, sesion.tipo_test);

  // 4. Detectar ambigüedades
  const areasAmbiguas = this.detectarAmbiguedades(puntuaciones);

  // 5. Detectar discrepancias
  const trayectoriaService = require('./trayectoriaAcademicaService');
  const trayectoria = await trayectoriaService.obtenerTrayectoriaActual(usuarioId);
  const discrepancias = await this.detectarDiscrepancias(puntuaciones, trayectoria);

  // 6. Actualizar sesión
  await sesion.completarRonda1(puntuaciones, respuestas.map(r => r.preguntaId));

  // 7. Obtener preguntas Ronda 2
  const bancoPreguntasService = require('./bancoPreguntasService');
  const preguntasRonda2 = await bancoPreguntasService.obtenerPreguntasRonda2(
    sesionId,
    puntuaciones,
    discrepancias,
    areasAmbiguas
  );

  return {
    puntuaciones,
    areasAmbiguas,
    discrepancias,
    preguntasRonda2: preguntasRonda2.map(p => ({
      id: p.id,
      texto: p.texto_pregunta,
      tipo: p.tipo_pregunta,
      opciones: p.opciones_respuesta
    }))
  };
}
```

---

##### **3. `calcularPuntuaciones(respuestas, tipoTest)`**

**¿Qué hace?**
- Calcula puntuación por dimensión basado en respuestas
- Normaliza a escala 0-100

**Lógica para Holland RIASEC:**
```javascript
calcularPuntuaciones(respuestas, tipoTest) {
  const dimensiones = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];
  const puntuaciones = {};

  // Inicializar contadores
  for (const dim of dimensiones) {
    puntuaciones[dim] = 0;
  }

  // Procesar cada respuesta
  for (const respuesta of respuestas) {
    const pregunta = await PreguntaOrientacion.findByPk(respuesta.preguntaId);
    
    // Si la respuesta es positiva (true, "sí", etc.)
    if (this.esRespuestaPositiva(respuesta.respuesta)) {
      // Sumar a dimensión principal
      puntuaciones[pregunta.dimension_principal] += 1;
      
      // Sumar parcialmente a dimensiones secundarias
      if (pregunta.dimensiones_secundarias) {
        for (const dimSec of pregunta.dimensiones_secundarias) {
          puntuaciones[dimSec] += 0.5;
        }
      }
    }
  }

  // Normalizar a 0-100
  const maxPuntuacion = respuestas.length; // Máximo posible
  for (const dim in puntuaciones) {
    puntuaciones[dim] = Math.round((puntuaciones[dim] / maxPuntuacion) * 100);
  }

  return puntuaciones;
}
```

---

##### **4. `detectarAmbiguedades(puntuaciones)`**

**¿Qué hace?**
- Identifica dimensiones con puntuación 40-60 (zona gris)

**Lógica:**
```javascript
detectarAmbiguedades(puntuaciones) {
  const umbralMin = 40;
  const umbralMax = 60;
  const ambiguas = [];

  for (const dimension in puntuaciones) {
    const puntuacion = puntuaciones[dimension];
    if (puntuacion >= umbralMin && puntuacion <= umbralMax) {
      ambiguas.push(dimension);
    }
  }

  return ambiguas;
}
```

---

##### **5. `detectarDiscrepancias(puntuaciones, trayectoria)`**

**¿Qué hace?**
- Compara puntuaciones del test con trayectoria académica
- Identifica contradicciones

**Lógica:**
```javascript
async detectarDiscrepancias(puntuaciones, trayectoria) {
  const discrepancias = [];

  // Mapeo de áreas académicas a dimensiones RIASEC
  const mapeoAreas = {
    'Matemáticas': 'Investigador',
    'Física': 'Investigador',
    'Humanidades': 'Social',
    'Artes': 'Artístico',
    'Negocios': 'Emprendedor',
    // ... más mapeos
  };

  if (!trayectoria) {
    return discrepancias;
  }

  const asignaturasPorArea = trayectoria.asignaturas_por_area || {};

  for (const area in asignaturasPorArea) {
    const dimensionEsperada = mapeoAreas[area];
    if (!dimensionEsperada) continue;

    const cantidadAsignaturas = asignaturasPorArea[area];
    const puntuacionTest = puntuaciones[dimensionEsperada] || 0;

    // Si tiene muchas asignaturas en un área pero baja puntuación en el test
    if (cantidadAsignaturas >= 3 && puntuacionTest < 40) {
      discrepancias.push({
        dimension: dimensionEsperada,
        puntuacion_test: puntuacionTest,
        evidencia_academica: {
          tipo: 'rendimiento_alto',
          area: area,
          asignaturas_aprobadas: cantidadAsignaturas,
          promedio: trayectoria.iaa
        },
        necesita_validacion: true
      });
    }
  }

  return discrepancias;
}
```

---

##### **6. `calcularPuntuacionesFinales(puntuacionesRonda1, puntuacionesRonda2, factoresCorreccion)`**

**¿Qué hace?**
- Aplica fórmula de pesos dinámicos
- Normaliza puntuaciones finales

**Lógica:**
```javascript
calcularPuntuacionesFinales(puntuacionesRonda1, puntuacionesRonda2, factoresCorreccion) {
  const PESO_RONDA_1 = 0.4;
  const PESO_RONDA_2 = 0.6;
  const PESO_CORRECCION = 0.1;

  const puntuacionesFinales = {};
  const dimensiones = Object.keys(puntuacionesRonda1);

  for (const dimension of dimensiones) {
    const ronda1 = puntuacionesRonda1[dimension] || 0;
    const ronda2 = puntuacionesRonda2[dimension] || 0;
    const correccion = factoresCorreccion[dimension] || 0;

    const final = (ronda1 * PESO_RONDA_1) + 
                  (ronda2 * PESO_RONDA_2) + 
                  (correccion * PESO_CORRECCION);

    puntuacionesFinales[dimension] = Math.round(Math.max(0, Math.min(100, final)));
  }

  return puntuacionesFinales;
}
```

---

### **SERVICIO 3: TrayectoriaAcademicaService**

**Archivo:** `src/services/trayectoriaAcademicaService.js`

**Responsabilidad:** Gestionar trayectorias académicas de estudiantes.

#### **Métodos Principales:**

##### **1. `obtenerTrayectoriaActual(usuarioId)`**

**¿Qué hace?**
- Obtiene trayectoria actual del estudiante
- Si no existe, la crea desde datos de Usuario

**Lógica:**
```javascript
async obtenerTrayectoriaActual(usuarioId) {
  let trayectoria = await TrayectoriaAcademica.obtenerActualPorUsuario(usuarioId);

  if (!trayectoria) {
    // Crear desde datos de Usuario
    trayectoria = await TrayectoriaAcademica.crearDesdeUsuario(usuarioId);
  }

  return trayectoria;
}
```

---

##### **2. `analizarRendimientoPorArea(trayectoria)`**

**¿Qué hace?**
- Analiza asignaturas por área
- Identifica áreas de fortaleza

**Lógica:**
```javascript
analizarRendimientoPorArea(trayectoria) {
  const asignaturasPorArea = trayectoria.asignaturas_por_area || {};
  
  // Encontrar área con más asignaturas
  let areaMaxima = null;
  let cantidadMaxima = 0;

  for (const area in asignaturasPorArea) {
    if (asignaturasPorArea[area] > cantidadMaxima) {
      cantidadMaxima = asignaturasPorArea[area];
      areaMaxima = area;
    }
  }

  return {
    areas: asignaturasPorArea,
    areaFuerte: areaMaxima,
    cantidadMaxima: cantidadMaxima
  };
}
```

---

### **SERVICIO 4: OrientacionVocacionalService (Ampliar Existente)**

**Archivo:** `src/services/orientacionVocacionalService.js` (modificar)

**Responsabilidad:** Integrar test + trayectoria + LLM para generar recomendaciones.

#### **Métodos a Agregar:**

##### **1. `procesarTestCompletado(sesionId)`**

**¿Qué hace?**
- Obtiene sesión y respuestas
- Obtiene trayectoria académica
- Construye prompt para LLM
- Genera análisis y recomendaciones
- Guarda resultado

**Lógica:**
```javascript
async procesarTestCompletado(sesionId) {
  // 1. Obtener sesión
  const sesion = await SesionTestOrientacion.findByPk(sesionId, {
    include: [
      { model: RespuestaTestOrientacion, as: 'respuestas' },
      { model: Usuario, as: 'usuario' }
    ]
  });

  if (!sesion || sesion.estado !== 'ronda_2_completada') {
    throw new ApiError(400, 'Sesión no válida o no completada');
  }

  // 2. Calcular puntuaciones finales
  const testService = require('./testOrientacionService');
  const puntuacionesFinales = testService.calcularPuntuacionesFinales(
    sesion.puntuaciones_ronda_1,
    sesion.puntuaciones_ronda_2,
    {} // factoresCorreccion
  );

  // 3. Obtener trayectoria académica
  const trayectoriaService = require('./trayectoriaAcademicaService');
  const trayectoria = await trayectoriaService.obtenerTrayectoriaActual(sesion.usuario_id);

  // 4. Obtener carreras disponibles
  const { Career } = require('../models');
  const carreras = await Career.findAll({
    where: { is_active: true }
  });

  // 5. Construir prompt para LLM
  const prompt = this.construirPromptAnalisis(
    sesion,
    puntuacionesFinales,
    trayectoria,
    carreras
  );

  // 6. Generar análisis con LLM
  const llmService = require('./llmService');
  const respuestaLLM = await llmService.generarRespuesta(prompt);
  const analisisLLM = this.parsearRespuestaLLM(respuestaLLM);

  // 7. Calcular código Holland
  const codigoHolland = this.calcularCodigoHolland(puntuacionesFinales);

  // 8. Crear resultado
  const resultado = await ResultadoOrientacion.create({
    sesion_id: sesionId,
    usuario_id: sesion.usuario_id,
    tipo_test: sesion.tipo_test,
    puntuaciones_finales: puntuacionesFinales,
    codigo_holland: codigoHolland,
    perfil_dominante: this.obtenerPerfilDominante(puntuacionesFinales),
    perfil_secundario: this.obtenerPerfilSecundario(puntuacionesFinales),
    analisis_llm: analisisLLM,
    recomendaciones_carreras: analisisLLM.carrerasRecomendadas || [],
    perfil_vocacional: analisisLLM.perfilVocacional || {},
    trayectoria_academica_analizada: trayectoria,
    areas_desarrollo: analisisLLM.areasDesarrollo || [],
    sugerencias_acompanamiento: analisisLLM.sugerenciasAcompanamiento || [],
    plan_desarrollo: analisisLLM.planDesarrollo || {}
  });

  // 9. Finalizar sesión
  await sesion.finalizar();

  // 10. Actualizar efectividad de preguntas
  await this.actualizarEfectividadPreguntas(sesion);

  return resultado;
}
```

---

##### **2. `construirPromptAnalisis(sesion, puntuaciones, trayectoria, carreras)`**

**¿Qué hace?**
- Construye prompt estructurado para el LLM
- Incluye toda la información relevante

**Lógica:**
```javascript
construirPromptAnalisis(sesion, puntuaciones, trayectoria, carreras) {
  return `Eres un orientador vocacional experto de la Universidad Metropolitana.

PERFIL DEL ESTUDIANTE:
${this.formatearPerfilEstudiante(trayectoria)}

RESULTADOS DEL TEST DE ORIENTACIÓN:
${this.formatearResultadosTest(puntuaciones, sesion)}

CARRERAS DISPONIBLES EN LA UNIVERSIDAD:
${this.formatearCarreras(carreras)}

TAREA:
1. Analiza el perfil vocacional del estudiante integrando:
   - Resultados del test de orientación
   - Trayectoria académica (rendimiento, áreas de fortaleza)
   - Intereses y habilidades manifestadas

2. Genera recomendaciones de carreras con:
   - Puntuación de compatibilidad (0-100)
   - Razones específicas del match
   - Áreas de desarrollo necesarias
   - Proyección de éxito académico

3. Proporciona un análisis personalizado que incluya:
   - Fortalezas identificadas
   - Áreas de mejora
   - Sugerencias de acompañamiento
   - Plan de desarrollo vocacional

FORMATO DE RESPUESTA (JSON):
{
  "analisisGeneral": "...",
  "perfilVocacional": {
    "intereses": [...],
    "habilidades": [...],
    "valores": [...],
    "codigoHolland": "ISR"
  },
  "carrerasRecomendadas": [
    {
      "carreraId": 1,
      "nombre": "...",
      "puntuacion": 85,
      "nivelMatch": "alto|medio|bajo",
      "razones": [...],
      "areasDesarrollo": [...],
      "proyeccionExito": "alta|media|baja"
    }
  ],
  "sugerenciasAcompanamiento": [...],
  "planDesarrollo": {
    "cortoPlazo": [...],
    "medianoPlazo": [...],
    "largoPlazo": [...]
  }
}`;
}
```

---

## ✅ Checklist para Crear un Servicio

- [ ] **Crear archivo** en `src/services/NombreService.js`
- [ ] **Importar modelos** necesarios
- [ ] **Importar utilidades** (ApiError, Op, etc.)
- [ ] **Definir clase** con métodos públicos
- [ ] **Implementar manejo de errores** (try/catch, ApiError)
- [ ] **Validar parámetros** en cada método
- [ ] **Documentar métodos** con JSDoc
- [ ] **Exportar instancia** (singleton)
- [ ] **Probar** métodos principales

---

## 💡 Consejos y Buenas Prácticas

1. **Separación de responsabilidades:**
   - Un servicio = una responsabilidad principal
   - Métodos pequeños y enfocados

2. **Manejo de errores:**
   - Siempre usar ApiError
   - Loggear errores para debugging
   - Mensajes de error claros

3. **Validaciones:**
   - Validar al inicio de cada método
   - Validar existencia de recursos
   - Validar permisos/autorización

4. **Transacciones:**
   - Usar transacciones para operaciones múltiples
   - Rollback si algo falla

5. **Documentación:**
   - JSDoc en métodos públicos
   - Comentarios en lógica compleja

---

## 🚀 Orden de Implementación Recomendado

1. **BancoPreguntasService** (más independiente)
2. **TrayectoriaAcademicaService** (simple, no depende de otros nuevos)
3. **TestOrientacionService** (depende de BancoPreguntasService)
4. **OrientacionVocacionalService** (depende de todos los anteriores)

---

## 📚 Recursos Adicionales

- [Documentación Sequelize - Queries](https://sequelize.org/docs/v6/core-concepts/model-querying-basics/)
- [Documentación Sequelize - Transactions](https://sequelize.org/docs/v6/other-topics/transactions/)

---

¡Ahora estás listo para crear tus servicios! 🎉

