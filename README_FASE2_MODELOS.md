# 📚 FASE 2: Guía Completa para Crear Modelos Sequelize

## 🎯 ¿Qué es un Modelo Sequelize?

Un **modelo** es la representación en JavaScript de una tabla de tu base de datos. Te permite:
- **Interactuar** con la base de datos usando JavaScript (sin SQL directo)
- **Validar** datos antes de guardarlos
- **Definir relaciones** entre tablas
- **Agregar métodos** personalizados para lógica de negocio

**Ejemplo conceptual:**
```
Tabla en BD: preguntas_orientacion
    ↓
Modelo Sequelize: PreguntaOrientacion
    ↓
Uso en código: PreguntaOrientacion.findAll()
```

---

## 📋 Estructura Básica de un Modelo

### **Patrón que usa tu proyecto:**

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NombreModelo = sequelize.define(
    'NombreModelo',  // Nombre del modelo (PascalCase)
    {
      // Aquí defines los campos (columnas)
    },
    {
      // Aquí defines opciones (nombre de tabla, timestamps, etc.)
    }
  );

  // Definir asociaciones (relaciones)
  NombreModelo.associate = (models) => {
    // Relaciones con otros modelos
  };

  // Métodos de instancia (opcional)
  NombreModelo.prototype.metodoInstancia = function() {
    // Lógica aquí
  };

  // Métodos estáticos (opcional)
  NombreModelo.metodoEstatico = async function() {
    // Lógica aquí
  };

  return NombreModelo;
};
```

---

## 🔍 Paso a Paso: Cómo Crear un Modelo

### **PASO 1: Crear el archivo**

**Ubicación:** `src/models/NombreModelo.js`

**Convención de nombres:**
- Archivo: `PreguntaOrientacion.js` (PascalCase)
- Modelo: `PreguntaOrientacion` (PascalCase)
- Tabla en BD: `preguntas_orientacion` (snake_case, plural)

---

### **PASO 2: Mapear Campos de la Migración al Modelo**

**Regla de oro:** Los campos del modelo deben **coincidir exactamente** con los de la migración.

#### **Ejemplo: De Migración a Modelo**

**En la migración tienes:**
```javascript
codigo: {
  type: Sequelize.STRING(50),
  allowNull: false,
  unique: true
}
```

**En el modelo escribes:**
```javascript
codigo: {
  type: DataTypes.STRING(50),
  allowNull: false,
  unique: true
}
```

**Diferencias clave:**
- Migración: `Sequelize.STRING(50)`
- Modelo: `DataTypes.STRING(50)`
- Todo lo demás es **igual**

---

### **PASO 3: Mapear Tipos de Datos**

#### **Tipos Básicos:**

| Migración | Modelo | Ejemplo |
|-----------|--------|---------|
| `Sequelize.UUID` | `DataTypes.UUID` | IDs únicos |
| `Sequelize.STRING(50)` | `DataTypes.STRING(50)` | Texto corto |
| `Sequelize.TEXT` | `DataTypes.TEXT` | Texto largo |
| `Sequelize.INTEGER` | `DataTypes.INTEGER` | Números enteros |
| `Sequelize.DECIMAL(4,2)` | `DataTypes.DECIMAL(4,2)` | Decimales |
| `Sequelize.BOOLEAN` | `DataTypes.BOOLEAN` | true/false |
| `Sequelize.DATE` | `DataTypes.DATE` | Fecha y hora |
| `Sequelize.DATEONLY` | `DataTypes.DATEONLY` | Solo fecha |
| `Sequelize.ENUM(...)` | `DataTypes.ENUM(...)` | Valores fijos |
| `Sequelize.JSONB` | `DataTypes.JSONB` | Datos JSON |

#### **Valores por Defecto:**

**En migración:**
```javascript
defaultValue: Sequelize.literal("NOW()")
```

**En modelo:**
```javascript
defaultValue: DataTypes.NOW
// O para funciones:
defaultValue: DataTypes.literal("NOW()")
```

**En migración:**
```javascript
defaultValue: Sequelize.literal("gen_random_uuid()")
```

**En modelo:**
```javascript
defaultValue: DataTypes.UUIDV4
// O:
defaultValue: DataTypes.literal("gen_random_uuid()")
```

---

### **PASO 4: Configurar Opciones del Modelo**

**Estructura:**
```javascript
sequelize.define('NombreModelo', {
  // Campos aquí
}, {
  // Opciones aquí
  tableName: "nombre_tabla_en_bd",  // Nombre real de la tabla
  timestamps: true,                  // Incluir created_at y updated_at
  createdAt: "created_at",           // Nombre de columna created_at
  updatedAt: "updated_at",           // Nombre de columna updated_at
  underscored: true,                 // Usar snake_case en nombres
  indexes: [                         // Índices (opcional, ya están en migración)
    {
      fields: ['campo1', 'campo2']
    }
  ]
});
```

**Ejemplo real:**
```javascript
sequelize.define('PreguntaOrientacion', {
  // campos...
}, {
  tableName: "preguntas_orientacion",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  underscored: true
});
```

---

### **PASO 5: Agregar Validaciones**

**Las validaciones se agregan en el campo:**

```javascript
codigo: {
  type: DataTypes.STRING(50),
  allowNull: false,
  unique: true,
  validate: {
    notEmpty: true,           // No puede estar vacío
    len: [1, 50],             // Longitud entre 1 y 50
    is: /^[A-Z]+-\d+$/,       // Expresión regular
    isIn: [['valor1', 'valor2']]  // Solo estos valores
  }
}
```

**Ejemplo con ENUM:**
```javascript
estado: {
  type: DataTypes.ENUM("iniciada", "ronda_1_completada", "finalizada"),
  allowNull: false,
  defaultValue: "iniciada",
  validate: {
    isIn: [["iniciada", "ronda_1_completada", "finalizada"]]
  }
}
```

---

## 🔗 PASO 6: Definir Relaciones (Associations)

### **Tipos de Relaciones:**

#### **1. belongsTo** (Muchos a Uno)
**Cuándo usar:** Cuando el modelo actual tiene una foreign key.

**Ejemplo:**
```javascript
// En modelo: RespuestaTestOrientacion
RespuestaTestOrientacion.associate = (models) => {
  // Una respuesta pertenece a una sesión
  RespuestaTestOrientacion.belongsTo(models.SesionTestOrientacion, {
    foreignKey: 'sesion_id',        // Nombre de la FK en esta tabla
    as: 'sesion'                    // Alias para usar en queries
  });
};
```

**Uso:**
```javascript
const respuesta = await RespuestaTestOrientacion.findOne({
  include: [{ model: SesionTestOrientacion, as: 'sesion' }]
});
// Acceso: respuesta.sesion
```

---

#### **2. hasMany** (Uno a Muchos)
**Cuándo usar:** Cuando otro modelo tiene una foreign key a este.

**Ejemplo:**
```javascript
// En modelo: SesionTestOrientacion
SesionTestOrientacion.associate = (models) => {
  // Una sesión tiene muchas respuestas
  SesionTestOrientacion.hasMany(models.RespuestaTestOrientacion, {
    foreignKey: 'sesion_id',        // Nombre de la FK en la otra tabla
    as: 'respuestas'                 // Alias
  });
};
```

**Uso:**
```javascript
const sesion = await SesionTestOrientacion.findOne({
  include: [{ model: RespuestaTestOrientacion, as: 'respuestas' }]
});
// Acceso: sesion.respuestas (array)
```

---

#### **3. hasOne** (Uno a Uno)
**Cuándo usar:** Cuando hay una relación uno a uno.

**Ejemplo:**
```javascript
// En modelo: SesionTestOrientacion
SesionTestOrientacion.associate = (models) => {
  // Una sesión tiene un resultado
  SesionTestOrientacion.hasOne(models.ResultadoOrientacion, {
    foreignKey: 'sesion_id',
    as: 'resultado'
  });
};
```

---

#### **4. belongsToMany** (Muchos a Muchos)
**Cuándo usar:** Cuando hay una tabla intermedia (no aplica en tu caso actual).

---

### **Reglas para Definir Relaciones:**

1. **belongsTo** va en el modelo que **tiene la foreign key**
2. **hasMany/hasOne** va en el modelo que **es referenciado**
3. **Siempre definir ambos lados** de la relación
4. **Usar alias descriptivos** (`as: 'nombre'`)

**Ejemplo completo (ambos lados):**

```javascript
// En SesionTestOrientacion.js
SesionTestOrientacion.associate = (models) => {
  SesionTestOrientacion.hasMany(models.RespuestaTestOrientacion, {
    foreignKey: 'sesion_id',
    as: 'respuestas'
  });
};

// En RespuestaTestOrientacion.js
RespuestaTestOrientacion.associate = (models) => {
  RespuestaTestOrientacion.belongsTo(models.SesionTestOrientacion, {
    foreignKey: 'sesion_id',
    as: 'sesion'
  });
};
```

---

## 🛠️ PASO 7: Métodos de Instancia

**¿Qué son?** Métodos que puedes llamar en una **instancia** del modelo (un registro específico).

**Sintaxis:**
```javascript
NombreModelo.prototype.nombreMetodo = function() {
  // this = instancia del modelo
  return this.campo1 + this.campo2;
};
```

**Ejemplo:**
```javascript
// En SesionTestOrientacion.js
SesionTestOrientacion.prototype.estaCompletada = function() {
  return this.estado === 'finalizada';
};

SesionTestOrientacion.prototype.obtenerAreasAmbiguas = function() {
  // this.puntuaciones_ronda_1 es un JSONB
  const puntuaciones = this.puntuaciones_ronda_1 || {};
  return Object.keys(puntuaciones).filter(dimension => {
    const puntuacion = puntuaciones[dimension];
    return puntuacion >= 40 && puntuacion <= 60;
  });
};
```

**Uso:**
```javascript
const sesion = await SesionTestOrientacion.findByPk(id);
if (sesion.estaCompletada()) {
  const ambiguas = sesion.obtenerAreasAmbiguas();
}
```

---

## 🔧 PASO 8: Métodos Estáticos

**¿Qué son?** Métodos que puedes llamar **directamente en el modelo** (no en una instancia).

**Sintaxis:**
```javascript
NombreModelo.metodoEstatico = async function(parametros) {
  // Lógica aquí
  return await this.findAll({ ... });
};
```

**Ejemplo:**
```javascript
// En SesionTestOrientacion.js
SesionTestOrientacion.obtenerActivaPorUsuario = async function(usuarioId) {
  return await this.findOne({
    where: {
      usuario_id: usuarioId,
      estado: {
        [Op.in]: ['iniciada', 'ronda_1_completada', 'ronda_2_completada']
      }
    }
  });
};

SesionTestOrientacion.obtenerHistorialPorUsuario = async function(usuarioId) {
  return await this.findAll({
    where: { usuario_id: usuarioId },
    order: [['fecha_inicio', 'DESC']],
    include: [{ model: ResultadoOrientacion, as: 'resultado' }]
  });
};
```

**Uso:**
```javascript
const sesionActiva = await SesionTestOrientacion.obtenerActivaPorUsuario(usuarioId);
const historial = await SesionTestOrientacion.obtenerHistorialPorUsuario(usuarioId);
```

---

## 📝 Ejemplos Específicos para Cada Modelo

### **MODELO 1: PreguntaOrientacion**

**Archivo:** `src/models/PreguntaOrientacion.js`

**Campos principales a mapear:**
- `id` (UUID, PK)
- `codigo` (STRING, unique)
- `tipo_test` (ENUM)
- `dimension_principal` (STRING)
- `dimensiones_secundarias` (JSONB)
- `texto_pregunta` (TEXT)
- `peso` (ENUM)
- `efectividad_historica` (DECIMAL)
- `activa` (BOOLEAN)

**Relaciones a definir:**
```javascript
PreguntaOrientacion.associate = (models) => {
  // Una pregunta puede tener muchas respuestas
  PreguntaOrientacion.hasMany(models.RespuestaTestOrientacion, {
    foreignKey: 'pregunta_id',
    as: 'respuestas'
  });
};
```

**Métodos de instancia sugeridos:**
- `esPolarizante()` - Retorna true si peso es 'alta'
- `estaRelacionadaConCarrera(carreraId)` - Verifica si carrera está en array
- `calcularEfectividad()` - Actualiza efectividad_historica

**Métodos estáticos sugeridos:**
- `obtenerPorDimension(dimension, tipoTest, limite)`
- `obtenerPolarizantes(tipoTest, limite)`
- `obtenerPorEfectividad(tipoTest, limite, orden)`

---

### **MODELO 2: SesionTestOrientacion**

**Archivo:** `src/models/SesionTestOrientacion.js`

**Campos principales:**
- `id` (UUID, PK)
- `usuario_id` (UUID, FK a Usuario)
- `tipo_test` (ENUM)
- `estado` (ENUM)
- `seed_aleatorio` (STRING)
- `preguntas_ronda_1` (JSONB)
- `preguntas_ronda_2` (JSONB)
- `puntuaciones_ronda_1` (JSONB)
- `puntuaciones_ronda_2` (JSONB)
- `areas_ambiguedad` (JSONB)
- `discrepancias_detectadas` (JSONB)

**Relaciones:**
```javascript
SesionTestOrientacion.associate = (models) => {
  // Una sesión pertenece a un usuario
  SesionTestOrientacion.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });

  // Una sesión tiene muchas respuestas
  SesionTestOrientacion.hasMany(models.RespuestaTestOrientacion, {
    foreignKey: 'sesion_id',
    as: 'respuestas'
  });

  // Una sesión tiene un resultado
  SesionTestOrientacion.hasOne(models.ResultadoOrientacion, {
    foreignKey: 'sesion_id',
    as: 'resultado'
  });
};
```

**Métodos de instancia:**
- `completarRonda1(puntuaciones, preguntas)` - Actualiza estado y datos
- `completarRonda2(puntuaciones, preguntas)` - Similar
- `finalizar()` - Cambia estado a 'finalizada'
- `obtenerAreasAmbiguas()` - Parsea areas_ambiguedad
- `obtenerDiscrepancias()` - Parsea discrepancias_detectadas

**Métodos estáticos:**
- `obtenerActivaPorUsuario(usuarioId)`
- `obtenerHistorialPorUsuario(usuarioId)`

---

### **MODELO 3: RespuestaTestOrientacion**

**Archivo:** `src/models/RespuestaTestOrientacion.js`

**Campos principales:**
- `id` (UUID, PK)
- `sesion_id` (UUID, FK)
- `pregunta_id` (UUID, FK)
- `usuario_id` (UUID, FK)
- `ronda` (INTEGER: 1 o 2)
- `respuesta` (JSONB)
- `tiempo_respuesta_segundos` (INTEGER)
- `nivel_seguridad` (ENUM)

**Relaciones:**
```javascript
RespuestaTestOrientacion.associate = (models) => {
  RespuestaTestOrientacion.belongsTo(models.SesionTestOrientacion, {
    foreignKey: 'sesion_id',
    as: 'sesion'
  });

  RespuestaTestOrientacion.belongsTo(models.PreguntaOrientacion, {
    foreignKey: 'pregunta_id',
    as: 'pregunta'
  });

  RespuestaTestOrientacion.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });
};
```

**Métodos estáticos:**
- `obtenerPorSesion(sesionId, ronda)` - Filtra por sesión y ronda
- `calcularTiempoPromedio(sesionId)` - Calcula tiempo promedio

---

### **MODELO 4: ResultadoOrientacion**

**Archivo:** `src/models/ResultadoOrientacion.js`

**Campos principales:**
- `id` (UUID, PK)
- `sesion_id` (UUID, FK, unique)
- `usuario_id` (UUID, FK)
- `puntuaciones_finales` (JSONB)
- `codigo_holland` (STRING)
- `analisis_llm` (JSONB)
- `recomendaciones_carreras` (JSONB)
- `perfil_vocacional` (JSONB)

**Relaciones:**
```javascript
ResultadoOrientacion.associate = (models) => {
  ResultadoOrientacion.belongsTo(models.SesionTestOrientacion, {
    foreignKey: 'sesion_id',
    as: 'sesion'
  });

  ResultadoOrientacion.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });
};
```

**Métodos de instancia:**
- `obtenerCarrerasRecomendadas(limite)` - Parsea y ordena recomendaciones_carreras
- `obtenerPerfilConsolidado()` - Retorna perfil_vocacional estructurado

**Métodos estáticos:**
- `obtenerUltimoPorUsuario(usuarioId)`
- `obtenerHistorialPorUsuario(usuarioId)`

---

### **MODELO 5: TrayectoriaAcademica**

**Archivo:** `src/models/TrayectoriaAcademica.js`

**Campos principales:**
- `id` (UUID, PK)
- `usuario_id` (UUID, FK)
- `carrera_id` (INTEGER, FK a Career, nullable)
- `trimestre` (INTEGER)
- `iaa` (DECIMAL)
- `asignaturas_por_area` (JSONB)
- `rendimiento_por_trimestre` (JSONB)
- `es_actual` (BOOLEAN)

**Relaciones:**
```javascript
TrayectoriaAcademica.associate = (models) => {
  TrayectoriaAcademica.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });

  TrayectoriaAcademica.belongsTo(models.Career, {
    foreignKey: 'carrera_id',
    as: 'carrera'
  });
};
```

**Métodos de instancia:**
- `marcarComoActual()` - Desmarca otras y marca esta como actual
- `obtenerRendimientoPorArea()` - Parsea asignaturas_por_area

**Métodos estáticos:**
- `obtenerActualPorUsuario(usuarioId)`
- `crearDesdeUsuario(usuarioId)` - Crea desde datos de Usuario

---

## 📦 PASO 9: Registrar Modelos en index.js

**Archivo:** `src/models/index.js`

**Pasos:**

1. **Importar el modelo** (después de los otros modelos existentes):
```javascript
db.PreguntaOrientacion = require('./PreguntaOrientacion')(sequelize, DataTypes);
db.SesionTestOrientacion = require('./SesionTestOrientacion')(sequelize, DataTypes);
db.RespuestaTestOrientacion = require('./RespuestaTestOrientacion')(sequelize, DataTypes);
db.ResultadoOrientacion = require('./ResultadoOrientacion')(sequelize, DataTypes);
db.TrayectoriaAcademica = require('./TrayectoriaAcademica')(sequelize, DataTypes);
```

2. **Las asociaciones se definen automáticamente** porque el código existente ya hace:
```javascript
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
```

**Importante:** El orden de importación puede importar si hay dependencias. En tu caso, el orden sugerido es:
1. PreguntaOrientacion (no depende de otros modelos nuevos)
2. SesionTestOrientacion (depende de Usuario, que ya existe)
3. RespuestaTestOrientacion (depende de SesionTestOrientacion y PreguntaOrientacion)
4. ResultadoOrientacion (depende de SesionTestOrientacion)
5. TrayectoriaAcademica (depende de Usuario y Career, que ya existen)

---

## ✅ Checklist para Crear un Modelo

- [ ] **Crear archivo** en `src/models/NombreModelo.js`
- [ ] **Mapear todos los campos** de la migración
- [ ] **Usar DataTypes** correctos (no Sequelize)
- [ ] **Configurar opciones** (tableName, timestamps, etc.)
- [ ] **Agregar validaciones** donde aplique
- [ ] **Definir asociaciones** (belongsTo, hasMany, hasOne)
- [ ] **Agregar métodos de instancia** si son útiles
- [ ] **Agregar métodos estáticos** si son útiles
- [ ] **Registrar en index.js**
- [ ] **Probar** que el modelo se carga correctamente

---

## 🧪 Cómo Probar que Funciona

### **Test 1: Verificar que el modelo se carga**
```javascript
// En cualquier archivo
const db = require('./models');
console.log(db.PreguntaOrientacion); // Debe mostrar el modelo
```

### **Test 2: Verificar asociaciones**
```javascript
const db = require('./models');
const sesion = await db.SesionTestOrientacion.findOne({
  include: [{ model: db.Usuario, as: 'usuario' }]
});
console.log(sesion.usuario); // Debe mostrar el usuario relacionado
```

### **Test 3: Crear un registro de prueba**
```javascript
const db = require('./models');
const pregunta = await db.PreguntaOrientacion.create({
  codigo: 'TEST-001',
  tipo_test: 'Holland_RIASEC',
  dimension_principal: 'Investigador',
  texto_pregunta: '¿Te gusta investigar?',
  peso: 'alta',
  activa: true
});
console.log(pregunta.id); // Debe mostrar el UUID generado
```

---

## 💡 Consejos y Buenas Prácticas

1. **Nombres consistentes:**
   - Modelo: PascalCase (`PreguntaOrientacion`)
   - Tabla: snake_case, plural (`preguntas_orientacion`)
   - Campos: snake_case (`usuario_id`)

2. **JSONB:**
   - Siempre usar `defaultValue: []` para arrays
   - Siempre usar `defaultValue: {}` para objetos
   - Validar estructura en métodos, no en el modelo

3. **ENUMs:**
   - Los valores deben coincidir exactamente con la migración
   - Usar mayúsculas/minúsculas consistentes

4. **Relaciones:**
   - Siempre definir ambos lados (belongsTo y hasMany/hasOne)
   - Usar alias descriptivos (`as: 'nombre'`)
   - El `foreignKey` debe coincidir con el nombre de columna en BD

5. **Métodos:**
   - Métodos de instancia: para lógica de un registro específico
   - Métodos estáticos: para consultas y operaciones generales

6. **Validaciones:**
   - Agregar validaciones importantes (notEmpty, len, isIn)
   - No duplicar validaciones que ya están en la BD

---

## 🚀 Orden de Implementación Recomendado

1. **PreguntaOrientacion** (más simple, no depende de otros nuevos)
2. **SesionTestOrientacion** (depende de Usuario, que ya existe)
3. **TrayectoriaAcademica** (depende de Usuario y Career, que ya existen)
4. **RespuestaTestOrientacion** (depende de SesionTestOrientacion y PreguntaOrientacion)
5. **ResultadoOrientacion** (depende de SesionTestOrientacion)

**Razón:** Empiezas con los modelos más independientes y vas construyendo sobre ellos.

---

## 📚 Recursos Adicionales

- [Documentación Sequelize - Models](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- [Documentación Sequelize - Associations](https://sequelize.org/docs/v6/core-concepts/assocs/)
- [Documentación Sequelize - Validations](https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/)

---

## ❓ Preguntas Frecuentes

**P: ¿Debo incluir todos los campos de la migración?**
R: Sí, idealmente todos. Si omites alguno, no podrás acceder a él desde el modelo.

**P: ¿Los índices van en el modelo o solo en la migración?**
R: Solo en la migración. Los índices del modelo son opcionales y solo para documentación.

**P: ¿Puedo cambiar el nombre de un campo en el modelo?**
R: No recomendado. Usa el mismo nombre que en la migración para evitar confusiones.

**P: ¿Cómo manejo campos JSONB?**
R: Déjalos como JSONB en el modelo. Parsea el contenido en métodos de instancia o en servicios.

**P: ¿Qué pasa si olvido definir una asociación?**
R: No podrás usar `include` para traer datos relacionados, pero las foreign keys seguirán funcionando.

---

¡Ahora estás listo para crear tus modelos! 🎉

