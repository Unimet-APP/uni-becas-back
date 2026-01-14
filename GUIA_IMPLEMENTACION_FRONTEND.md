# 🎨 Guía de Implementación Frontend - Sistema de Orientación Vocacional

## 📋 Índice

1. [Estructura de Servicios](#estructura-de-servicios)
2. [Flujo Completo del Test](#flujo-completo-del-test)
3. [Implementación Paso a Paso](#implementación-paso-a-paso)
4. [Manejo de Estados](#manejo-de-estados)
5. [Ejemplos de Código](#ejemplos-de-código)
6. [Consideraciones UX](#consideraciones-ux)

---

## 🔧 Estructura de Servicios

### 1. Crear Servicio de API

Crea un archivo de servicio para manejar todas las llamadas a la API de orientación vocacional.

**Ejemplo con Axios (React/Vue/Angular):**

```javascript
// services/orientacionVocacionalService.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Configurar interceptor para agregar token automáticamente
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const orientacionVocacionalService = {
  // 1. Iniciar Test
  async iniciarTest(tipoTest) {
    const response = await axios.post(`${API_BASE_URL}/v1/orientacion/iniciar-test`, {
      tipoTest: tipoTest // 'Kuder' o 'Holland_RIASEC'
    });
    return response.data;
  },

  // 2. Guardar Respuestas Ronda 1
  async guardarRespuestasRonda1(sesionId, respuestas) {
    const response = await axios.post(
      `${API_BASE_URL}/v1/orientacion/guardar-respuestas-ronda-1`,
      {
        sesionId,
        respuestas: respuestas.map(resp => ({
          preguntaId: resp.preguntaId,
          respuesta: resp.respuesta,
          tiempoSegundos: resp.tiempoSegundos || null,
          nivelSeguridad: resp.nivelSeguridad || 'medio'
        }))
      }
    );
    return response.data;
  },

  // 3. Guardar Respuestas Ronda 2
  async guardarRespuestasRonda2(sesionId, respuestas) {
    const response = await axios.post(
      `${API_BASE_URL}/v1/orientacion/guardar-respuestas-ronda-2`,
      {
        sesionId,
        respuestas: respuestas.map(resp => ({
          preguntaId: resp.preguntaId,
          respuesta: resp.respuesta,
          tiempoSegundos: resp.tiempoSegundos || null,
          nivelSeguridad: resp.nivelSeguridad || 'medio'
        }))
      }
    );
    return response.data;
  },

  // 4. Obtener Sesión
  async obtenerSesion(sesionId) {
    const response = await axios.get(
      `${API_BASE_URL}/v1/orientacion/sesion/${sesionId}`
    );
    return response.data;
  },

  // 5. Obtener Resultados
  async obtenerResultados(sesionId) {
    const response = await axios.get(
      `${API_BASE_URL}/v1/orientacion/resultados/${sesionId}`
    );
    return response.data;
  },

  // 6. Obtener Perfil Vocacional
  async obtenerPerfilVocacional() {
    const response = await axios.get(
      `${API_BASE_URL}/v1/orientacion/mi-perfil-vocacional`
    );
    return response.data;
  },

  // 7. Obtener Historial
  async obtenerHistorial() {
    const response = await axios.get(
      `${API_BASE_URL}/v1/orientacion/historial`
    );
    return response.data;
  },

  // 8. Generar Recomendaciones Continuas
  async generarRecomendacionesContinuas(contextoAdicional = '') {
    const response = await axios.post(
      `${API_BASE_URL}/v1/orientacion/recomendaciones-continuas`,
      {
        contextoAdicional
      }
    );
    return response.data;
  },

  // 9. Analizar Cambio de Carrera
  async analizarCambioCarrera(carreraDestinoId, razones = '', preocupaciones = '') {
    const response = await axios.post(
      `${API_BASE_URL}/v1/orientacion/analizar-cambio-carrera`,
      {
        carreraDestinoId,
        razones,
        preocupaciones
      }
    );
    return response.data;
  }
};
```

---

## 🔄 Flujo Completo del Test

### Diagrama de Flujo

```
1. Usuario selecciona tipo de test (Holland_RIASEC o Kuder)
   ↓
2. POST /iniciar-test
   ↓
3. Recibir preguntas de Ronda 1 (24 preguntas: 4 por dimensión)
   ↓
4. Mostrar preguntas una por una o en grupos
   ↓
5. Usuario responde todas las preguntas de Ronda 1
   ↓
6. POST /guardar-respuestas-ronda-1
   ↓
7. Recibir preguntas de Ronda 2 (adaptativas, seleccionadas por LLM)
   ↓
8. Mostrar preguntas de Ronda 2
   ↓
9. Usuario responde preguntas de Ronda 2
   ↓
10. POST /guardar-respuestas-ronda-2
    ↓
11. Procesamiento en backend (LLM analiza, genera recomendaciones)
    ↓
12. GET /resultados/{sesionId}
    ↓
13. Mostrar resultados y recomendaciones
```

---

## 📝 Implementación Paso a Paso

### Paso 1: Pantalla de Selección de Test

**Componente: `SeleccionarTest.vue` (Vue) o `SeleccionarTest.jsx` (React)**

```javascript
// Estado inicial
const estado = {
  tipoTest: null,
  cargando: false,
  error: null
};

// Función para iniciar test
async function iniciarTest() {
  if (!estado.tipoTest) {
    alert('Por favor selecciona un tipo de test');
    return;
  }

  estado.cargando = true;
  estado.error = null;

  try {
    const respuesta = await orientacionVocacionalService.iniciarTest(estado.tipoTest);
    
    // Guardar sesionId en localStorage o estado global
    localStorage.setItem('sesionId', respuesta.data.sesionId);
    localStorage.setItem('tipoTest', respuesta.data.tipoTest);
    localStorage.setItem('estadoSesion', respuesta.data.estado);
    
    // Guardar preguntas de Ronda 1
    localStorage.setItem('preguntasRonda1', JSON.stringify(respuesta.data.preguntas));
    
    // Redirigir a pantalla de preguntas
    router.push('/orientacion/ronda-1');
    
  } catch (error) {
    estado.error = error.response?.data?.message || 'Error al iniciar el test';
  } finally {
    estado.cargando = false;
  }
}
```

**Template:**
```html
<div class="seleccionar-test">
  <h2>Selecciona el tipo de test</h2>
  
  <div class="opciones">
    <button 
      @click="estado.tipoTest = 'Holland_RIASEC'"
      :class="{ activo: estado.tipoTest === 'Holland_RIASEC' }"
    >
      Test Holland RIASEC
      <p>6 dimensiones: Realista, Investigador, Artístico, Social, Emprendedor, Convencional</p>
    </button>
    
    <button 
      @click="estado.tipoTest = 'Kuder'"
      :class="{ activo: estado.tipoTest === 'Kuder' }"
    >
      Test Kuder
      <p>10 áreas de interés profesional</p>
    </button>
  </div>
  
  <button 
    @click="iniciarTest" 
    :disabled="!estado.tipoTest || estado.cargando"
  >
    {{ estado.cargando ? 'Iniciando...' : 'Comenzar Test' }}
  </button>
  
  <div v-if="estado.error" class="error">
    {{ estado.error }}
  </div>
</div>
```

---

### Paso 2: Pantalla de Preguntas Ronda 1

**Componente: `Ronda1.vue` o `Ronda1.jsx`**

```javascript
// Estado
const estado = {
  preguntas: [],
  preguntaActual: 0,
  respuestas: {},
  tiempos: {},
  inicioTiempo: null,
  cargando: false
};

// Cargar preguntas al montar componente
onMounted(() => {
  const preguntasGuardadas = localStorage.getItem('preguntasRonda1');
  estado.preguntas = JSON.parse(preguntasGuardadas);
  
  // Inicializar tiempos
  estado.preguntas.forEach(preg => {
    estado.tiempos[preg.id] = 0;
  });
  
  // Iniciar timer para primera pregunta
  estado.inicioTiempo = Date.now();
});

// Función para responder pregunta
function responderPregunta(preguntaId, respuesta) {
  // Calcular tiempo transcurrido
  const tiempoTranscurrido = Math.floor((Date.now() - estado.inicioTiempo) / 1000);
  estado.tiempos[preguntaId] = tiempoTranscurrido;
  
  // Guardar respuesta
  estado.respuestas[preguntaId] = {
    preguntaId,
    respuesta,
    tiempoSegundos: tiempoTranscurrido,
    nivelSeguridad: calcularNivelSeguridad(tiempoTranscurrido)
  };
  
  // Avanzar a siguiente pregunta
  if (estado.preguntaActual < estado.preguntas.length - 1) {
    estado.preguntaActual++;
    estado.inicioTiempo = Date.now();
  } else {
    // Última pregunta, preparar para enviar
    enviarRespuestasRonda1();
  }
}

// Calcular nivel de seguridad basado en tiempo
function calcularNivelSeguridad(tiempoSegundos) {
  if (tiempoSegundos < 5) return 'bajo';
  if (tiempoSegundos < 15) return 'medio';
  return 'alto';
}

// Enviar respuestas de Ronda 1
async function enviarRespuestasRonda1() {
  estado.cargando = true;
  
  try {
    const sesionId = localStorage.getItem('sesionId');
    const respuestasArray = Object.values(estado.respuestas);
    
    const respuesta = await orientacionVocacionalService.guardarRespuestasRonda1(
      sesionId,
      respuestasArray
    );
    
    // Guardar preguntas de Ronda 2
    localStorage.setItem('preguntasRonda2', JSON.stringify(respuesta.data.preguntas));
    localStorage.setItem('estadoSesion', 'ronda_2');
    
    // Redirigir a Ronda 2
    router.push('/orientacion/ronda-2');
    
  } catch (error) {
    alert('Error al guardar respuestas: ' + (error.response?.data?.message || error.message));
  } finally {
    estado.cargando = false;
  }
}
```

**Template:**
```html
<div class="ronda-1">
  <div class="progreso">
    <div class="barra-progreso" 
         :style="{ width: ((estado.preguntaActual + 1) / estado.preguntas.length * 100) + '%' }">
    </div>
    <span>Pregunta {{ estado.preguntaActual + 1 }} de {{ estado.preguntas.length }}</span>
  </div>
  
  <div v-if="estado.preguntas[estado.preguntaActual]" class="pregunta">
    <h3>{{ estado.preguntas[estado.preguntaActual].texto_pregunta }}</h3>
    
    <!-- Si tiene opciones -->
    <div v-if="estado.preguntas[estado.preguntaActual].opciones_respuesta" class="opciones">
      <button 
        v-for="(opcion, index) in estado.preguntas[estado.preguntaActual].opciones_respuesta"
        @click="responderPregunta(estado.preguntas[estado.preguntaActual].id, opcion)"
        :key="index"
      >
        {{ opcion }}
      </button>
    </div>
    
    <!-- Si es pregunta directa (sí/no) -->
    <div v-else class="opciones-simple">
      <button @click="responderPregunta(estado.preguntas[estado.preguntaActual].id, true)">
        Sí
      </button>
      <button @click="responderPregunta(estado.preguntas[estado.preguntaActual].id, false)">
        No
      </button>
    </div>
  </div>
  
  <div v-if="estado.cargando" class="cargando">
    Procesando respuestas...
  </div>
</div>
```

---

### Paso 3: Pantalla de Preguntas Ronda 2

**Similar a Ronda 1, pero:**

```javascript
// Cargar preguntas de Ronda 2
onMounted(() => {
  const preguntasGuardadas = localStorage.getItem('preguntasRonda2');
  estado.preguntas = JSON.parse(preguntasGuardadas);
  // ... resto igual
});

// Función para enviar respuestas Ronda 2
async function enviarRespuestasRonda2() {
  estado.cargando = true;
  
  try {
    const sesionId = localStorage.getItem('sesionId');
    const respuestasArray = Object.values(estado.respuestas);
    
    const respuesta = await orientacionVocacionalService.guardarRespuestasRonda2(
      sesionId,
      respuestasArray
    );
    
    // Actualizar estado
    localStorage.setItem('estadoSesion', 'completado');
    
    // Redirigir a resultados
    router.push(`/orientacion/resultados/${sesionId}`);
    
  } catch (error) {
    alert('Error al completar el test: ' + (error.response?.data?.message || error.message));
  } finally {
    estado.cargando = false;
  }
}
```

---

### Paso 4: Pantalla de Resultados

**Componente: `Resultados.vue` o `Resultados.jsx`**

```javascript
// Estado
const estado = {
  resultados: null,
  cargando: true,
  error: null
};

// Cargar resultados
onMounted(async () => {
  const sesionId = router.params.sesionId || localStorage.getItem('sesionId');
  
  try {
    const respuesta = await orientacionVocacionalService.obtenerResultados(sesionId);
    estado.resultados = respuesta.data;
  } catch (error) {
    estado.error = error.response?.data?.message || 'Error al cargar resultados';
  } finally {
    estado.cargando = false;
  }
});
```

**Template:**
```html
<div class="resultados">
  <div v-if="estado.cargando" class="cargando">
    Generando tus resultados...
  </div>
  
  <div v-else-if="estado.error" class="error">
    {{ estado.error }}
  </div>
  
  <div v-else-if="estado.resultados" class="contenido-resultados">
    <!-- Perfil Dominante -->
    <section class="perfil-dominante">
      <h2>Tu Perfil Vocacional</h2>
      <div class="perfil-principal">
        <h3>{{ estado.resultados.perfil_dominante }}</h3>
        <p>Nivel de confianza: {{ (estado.resultados.nivel_confianza * 100).toFixed(0) }}%</p>
      </div>
      
      <!-- Perfiles Secundarios -->
      <div v-if="estado.resultados.perfiles_secundarios" class="perfiles-secundarios">
        <h4>Perfiles Secundarios:</h4>
        <ul>
          <li v-for="perfil in estado.resultados.perfiles_secundarios" :key="perfil">
            {{ perfil }}
          </li>
        </ul>
      </div>
    </section>
    
    <!-- Puntuaciones por Dimensión -->
    <section class="puntuaciones">
      <h2>Puntuaciones por Dimensión</h2>
      <div class="grafico-barras">
        <div 
          v-for="(puntuacion, dimension) in estado.resultados.puntuaciones"
          :key="dimension"
          class="barra"
        >
          <div class="etiqueta">{{ dimension }}</div>
          <div class="barra-progreso">
            <div 
              class="relleno"
              :style="{ width: (puntuacion * 100) + '%' }"
            ></div>
          </div>
          <div class="valor">{{ (puntuacion * 100).toFixed(0) }}%</div>
        </div>
      </div>
    </section>
    
    <!-- Carreras Recomendadas -->
    <section class="carreras-recomendadas">
      <h2>Carreras Recomendadas</h2>
      <div class="lista-carreras">
        <div 
          v-for="(carrera, index) in estado.resultados.recomendaciones_carreras"
          :key="index"
          class="carrera-item"
        >
          <h4>{{ carrera.nombre }}</h4>
          <p>{{ carrera.descripcion }}</p>
          <div class="match-score">
            Compatibilidad: {{ (carrera.match_score * 100).toFixed(0) }}%
          </div>
        </div>
      </div>
    </section>
    
    <!-- Actividades Recomendadas -->
    <section class="actividades-recomendadas">
      <h2>Actividades Recomendadas</h2>
      <ul>
        <li v-for="actividad in estado.resultados.recomendaciones_actividades" :key="actividad">
          {{ actividad }}
        </li>
      </ul>
    </section>
    
    <!-- Análisis del LLM -->
    <section class="analisis-llm">
      <h2>Análisis Personalizado</h2>
      <div class="analisis-texto">
        {{ estado.resultados.analisis_llm?.resumen || 'No hay análisis disponible' }}
      </div>
    </section>
    
    <!-- Discrepancias Detectadas -->
    <section v-if="estado.resultados.discrepancias_detectadas?.length" class="discrepancias">
      <h2>Observaciones</h2>
      <div class="discrepancias-lista">
        <div 
          v-for="(discrepancia, index) in estado.resultados.discrepancias_detectadas"
          :key="index"
          class="discrepancia-item"
        >
          <strong>{{ discrepancia.tipo }}</strong>
          <p>{{ discrepancia.descripcion }}</p>
        </div>
      </div>
    </section>
    
    <!-- Botones de Acción -->
    <div class="acciones">
      <button @click="router.push('/orientacion/perfil')">
        Ver Mi Perfil Completo
      </button>
      <button @click="router.push('/orientacion/historial')">
        Ver Historial
      </button>
      <button @click="router.push('/orientacion')">
        Realizar Otro Test
      </button>
    </div>
  </div>
</div>
```

---

### Paso 5: Pantalla de Perfil Vocacional

**Componente: `PerfilVocacional.vue` o `PerfilVocacional.jsx`**

```javascript
// Estado
const estado = {
  perfil: null,
  cargando: true
};

// Cargar perfil
onMounted(async () => {
  try {
    const respuesta = await orientacionVocacionalService.obtenerPerfilVocacional();
    estado.perfil = respuesta.data;
  } catch (error) {
    console.error('Error al cargar perfil:', error);
  } finally {
    estado.cargando = false;
  }
});

// Generar recomendaciones actualizadas
async function generarRecomendaciones() {
  const contexto = prompt('¿Hay algo nuevo que quieras compartir sobre tus intereses o actividades?');
  
  try {
    const respuesta = await orientacionVocacionalService.generarRecomendacionesContinuas(
      contexto || ''
    );
    
    // Actualizar perfil con nuevas recomendaciones
    estado.perfil = respuesta.data;
    alert('Recomendaciones actualizadas');
    
  } catch (error) {
    alert('Error al generar recomendaciones: ' + (error.response?.data?.message || error.message));
  }
}
```

---

### Paso 6: Pantalla de Historial

**Componente: `Historial.vue` o `Historial.jsx`**

```javascript
// Estado
const estado = {
  historial: [],
  cargando: true
};

// Cargar historial
onMounted(async () => {
  try {
    const respuesta = await orientacionVocacionalService.obtenerHistorial();
    estado.historial = respuesta.data;
  } catch (error) {
    console.error('Error al cargar historial:', error);
  } finally {
    estado.cargando = false;
  }
});

// Ver resultados de una sesión
function verResultados(sesionId) {
  router.push(`/orientacion/resultados/${sesionId}`);
}
```

**Template:**
```html
<div class="historial">
  <h2>Historial de Tests</h2>
  
  <div v-if="estado.cargando" class="cargando">
    Cargando historial...
  </div>
  
  <div v-else-if="estado.historial.length === 0" class="sin-resultados">
    No has realizado ningún test aún.
    <button @click="router.push('/orientacion')">
      Realizar Primer Test
    </button>
  </div>
  
  <div v-else class="lista-sesiones">
    <div 
      v-for="sesion in estado.historial"
      :key="sesion.id"
      class="sesion-item"
      @click="verResultados(sesion.id)"
    >
      <div class="sesion-header">
        <h3>{{ sesion.tipo_test }}</h3>
        <span class="estado" :class="sesion.estado">
          {{ sesion.estado }}
        </span>
      </div>
      <div class="sesion-info">
        <p>Fecha: {{ new Date(sesion.fecha_inicio).toLocaleDateString() }}</p>
        <p v-if="sesion.fecha_fin">
          Completado: {{ new Date(sesion.fecha_fin).toLocaleDateString() }}
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 Manejo de Estados

### Opción 1: Context API (React) o Provide/Inject (Vue)

```javascript
// contexts/OrientacionContext.jsx (React)
import { createContext, useContext, useState } from 'react';

const OrientacionContext = createContext();

export function OrientacionProvider({ children }) {
  const [sesionActual, setSesionActual] = useState(null);
  const [preguntasRonda1, setPreguntasRonda1] = useState([]);
  const [preguntasRonda2, setPreguntasRonda2] = useState([]);
  const [respuestasRonda1, setRespuestasRonda1] = useState({});
  const [respuestasRonda2, setRespuestasRonda2] = useState({});
  
  return (
    <OrientacionContext.Provider value={{
      sesionActual,
      setSesionActual,
      preguntasRonda1,
      setPreguntasRonda1,
      // ... resto de estados
    }}>
      {children}
    </OrientacionContext.Provider>
  );
}

export const useOrientacion = () => useContext(OrientacionContext);
```

### Opción 2: Vuex (Vue) o Redux (React)

```javascript
// store/orientacion.js (Vuex)
export default {
  namespaced: true,
  
  state: {
    sesionActual: null,
    preguntasRonda1: [],
    preguntasRonda2: [],
    respuestasRonda1: {},
    respuestasRonda2: {},
    resultados: null
  },
  
  mutations: {
    SET_SESION_ACTUAL(state, sesion) {
      state.sesionActual = sesion;
    },
    SET_PREGUNTAS_RONDA1(state, preguntas) {
      state.preguntasRonda1 = preguntas;
    },
    // ... más mutaciones
  },
  
  actions: {
    async iniciarTest({ commit }, tipoTest) {
      const respuesta = await orientacionVocacionalService.iniciarTest(tipoTest);
      commit('SET_SESION_ACTUAL', respuesta.data);
      commit('SET_PREGUNTAS_RONDA1', respuesta.data.preguntas);
      return respuesta.data;
    },
    // ... más acciones
  }
};
```

---

## 🎨 Consideraciones UX

### 1. Indicadores de Progreso

```html
<!-- Barra de progreso -->
<div class="progreso">
  <div class="barra" :style="{ width: porcentaje + '%' }"></div>
  <span>{{ preguntaActual }} / {{ totalPreguntas }}</span>
</div>

<!-- Indicador de tiempo -->
<div class="tiempo">
  <span>⏱️ Tiempo: {{ tiempoTranscurrido }}s</span>
</div>
```

### 2. Validación en Frontend

```javascript
function validarRespuesta(pregunta, respuesta) {
  // Validar que la respuesta sea del tipo correcto
  if (pregunta.opciones_respuesta) {
    return pregunta.opciones_respuesta.includes(respuesta);
  }
  return typeof respuesta === 'boolean' || typeof respuesta === 'string';
}
```

### 3. Manejo de Errores

```javascript
try {
  await orientacionVocacionalService.iniciarTest(tipoTest);
} catch (error) {
  if (error.response?.status === 401) {
    // Token expirado, redirigir a login
    router.push('/login');
  } else if (error.response?.status === 403) {
    // No autorizado
    alert('No tienes permiso para realizar esta acción');
  } else {
    // Error genérico
    alert('Error: ' + (error.response?.data?.message || error.message));
  }
}
```

### 4. Loading States

```html
<button :disabled="cargando">
  <span v-if="cargando">⏳ Procesando...</span>
  <span v-else>Comenzar Test</span>
</button>
```

### 5. Persistencia de Progreso

```javascript
// Guardar progreso automáticamente
watch(() => estado.respuestas, (nuevasRespuestas) => {
  localStorage.setItem('respuestasRonda1', JSON.stringify(nuevasRespuestas));
}, { deep: true });

// Recuperar progreso al cargar
onMounted(() => {
  const respuestasGuardadas = localStorage.getItem('respuestasRonda1');
  if (respuestasGuardadas) {
    estado.respuestas = JSON.parse(respuestasGuardadas);
  }
});
```

---

## 📱 Ejemplo de Estructura de Carpetas

```
src/
├── services/
│   └── orientacionVocacionalService.js
├── components/
│   └── orientacion/
│       ├── SeleccionarTest.vue
│       ├── Ronda1.vue
│       ├── Ronda2.vue
│       ├── Resultados.vue
│       ├── PerfilVocacional.vue
│       └── Historial.vue
├── store/
│   └── orientacion.js (Vuex/Redux)
└── router/
    └── orientacion.js (rutas)
```

---

## 🔐 Seguridad

1. **Token JWT**: Siempre incluir en headers
2. **Validación**: Validar datos antes de enviar
3. **Manejo de Errores**: No exponer información sensible
4. **Timeout**: Implementar timeout para requests largos

```javascript
// Ejemplo con timeout
const response = await axios.post(url, data, {
  timeout: 30000 // 30 segundos
});
```

---

## 🚀 Checklist de Implementación

- [ ] Crear servicio de API
- [ ] Implementar pantalla de selección de test
- [ ] Implementar pantalla de Ronda 1
- [ ] Implementar pantalla de Ronda 2
- [ ] Implementar pantalla de resultados
- [ ] Implementar pantalla de perfil vocacional
- [ ] Implementar pantalla de historial
- [ ] Agregar manejo de estados (Context/Vuex/Redux)
- [ ] Agregar indicadores de progreso
- [ ] Agregar manejo de errores
- [ ] Agregar validaciones frontend
- [ ] Agregar persistencia de progreso
- [ ] Agregar loading states
- [ ] Probar flujo completo

---

## 📞 Endpoints Resumen

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/v1/orientacion/iniciar-test` | Inicia nuevo test |
| POST | `/v1/orientacion/guardar-respuestas-ronda-1` | Guarda Ronda 1, recibe Ronda 2 |
| POST | `/v1/orientacion/guardar-respuestas-ronda-2` | Completa test, genera resultados |
| GET | `/v1/orientacion/sesion/:sesionId` | Obtiene información de sesión |
| GET | `/v1/orientacion/resultados/:sesionId` | Obtiene resultados completos |
| GET | `/v1/orientacion/mi-perfil-vocacional` | Obtiene perfil consolidado |
| GET | `/v1/orientacion/historial` | Obtiene historial de tests |
| POST | `/v1/orientacion/recomendaciones-continuas` | Genera recomendaciones actualizadas |
| POST | `/v1/orientacion/analizar-cambio-carrera` | Analiza cambio de carrera |

---

**¡Listo para implementar!** 🎉
