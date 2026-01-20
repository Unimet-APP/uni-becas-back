const { PreguntasOrientacion, SesionesTestOrientacion } = require('../models');
const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

class PreguntasOrientacionService {

    async seleccionarPreguntasRonda1(usuarioId, tipoTest, seed) {
       try {
         console.log(`[PreguntasOrientacionService] Obteniendo preguntas para: ${tipoTest}`);

         const preguntas = await PreguntasOrientacion.findAll({
            where: {
                tipo_test: tipoTest,
                activa: true,
            },
            order: [
                ['peso_pregunta', 'DESC'],
            ],
        });
    
        if(preguntas.length === 0){
            throw new ApiError(404, 'No se encontraron preguntas para el tipo de test');
        }
        
        const preguntasUsadas = await this.obtenerPreguntasUsadasPorUsuario(usuarioId);
        const dimensionesAgrupadas = this.agruparPorDimension(preguntas);
        const seleccionadas = [];

        for(const dimension in dimensionesAgrupadas){
            const disponibles = dimensionesAgrupadas[dimension].filter(pregunta => !preguntasUsadas.includes(pregunta.id));
            const pool = disponibles.length > 0 ? disponibles : dimensionesAgrupadas[dimension];

            const alta = this.seleccionarAleatoria(pool.filter(p => p.peso_pregunta === 'alta'), `${seed}${dimension}alta`);
            const media = this.seleccionarAleatoria(pool.filter(p => p.peso_pregunta === 'media'), `${seed}${dimension}media`);

            if (alta) seleccionadas.push(alta);
            if (media && media.id !== alta?.id) seleccionadas.push(media);
        }
        return this.mezclarAleatoriamente(seleccionadas, seed);
       } catch(error){
           this._handleError('seleccionarPreguntasRonda1', error);
       }
    }

    async seleccionarPreguntasRonda2(sesionId, puntuacionesRonda1, discrepancias, areasAmbiguedad) {
        try {
            const sesion = await SesionesTestOrientacion.findByPk(sesionId);
            if(!sesion){
                throw new ApiError(404, 'Sesión no encontrada');
            }
            const seleccionadas = [];
            const dimensions = Object.keys(puntuacionesRonda1);

            for(const dimension of dimensions){
                const puntuacion = puntuacionesRonda1[dimension] || 0;

                if (puntuacion > 60){
                    // Preguntas de confirmación para áreas de alto interés
                    const confirmacion = await PreguntasOrientacion.findAll({
                        where: {
                            tipo_test: sesion.tipoTest,
                            dimension_principal: dimension,
                            peso_pregunta: 'alta',
                            activa: true
                        },
                        order: [['efectividad_historica', 'DESC']],
                        limit: 2,
                    });
                    seleccionadas.push(...confirmacion);
                } else if (puntuacion > 40){
                    // Preguntas de validación para áreas de interés medio
                    const validacion = await PreguntasOrientacion.findAll({
                        where: {
                            tipo_test: sesion.tipoTest,
                            dimension_principal: dimension,
                            peso_pregunta: 'media',
                            activa: true
                        },
                        order: [['efectividad_historica', 'DESC']],
                        limit: 2,
                    });
                    seleccionadas.push(...validacion);
                } else {
                    // Preguntas polarizantes para áreas de bajo interés
                    const polarizantes = await PreguntasOrientacion.findAll({
                        where: {
                            tipo_test: sesion.tipoTest,
                            dimension_principal: dimension,
                            peso_pregunta: 'alta',
                            activa: true
                        },
                        order: [['efectividad_historica', 'DESC']],
                        limit: 1,
                    });
                    seleccionadas.push(...polarizantes);
                }
            } 

            // Agregar preguntas de validación cruzada si hay discrepancias
            if (discrepancias && discrepancias.length > 0){
                const vCruzada = await this.seleccionarPreguntasValidacionCruzada(discrepancias, sesion.tipoTest);
                seleccionadas.push(...vCruzada);
            }

            // Aplicar reglas anti-sesgo
            const dimensionesHolland = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];
            return await this.aplicarReglasAntiSesgo(seleccionadas, dimensionesHolland, sesion.tipoTest);
               
        } catch(error){
            this._handleError('seleccionarPreguntasRonda2', error);
        }
    }

    async aplicarReglasAntiSesgo(preguntas, dimensiones, tipoTest) {
        const cubiertas = new Set(preguntas.map(p => p.dimension_principal));
    
        for (const dimension of dimensiones) {
          if (!cubiertas.has(dimension)) {
            const minima = await PreguntasOrientacion.findOne({
              where: { tipo_test: tipoTest, dimension_principal: dimension, activa: true },
              order: [['efectividad_historica', 'DESC']],
            });
            if (minima) preguntas.push(minima);
          }
        }
    
        // Eliminar duplicados por ID
        const ids = new Set();
        return preguntas.filter(p => (ids.has(p.id) ? false : ids.add(p.id)));
    }

    /**
     * Busca correlaciones entre bajo rendimiento académico y dimensiones del test.
     */
    async seleccionarPreguntasValidacionCruzada(discrepancias, tipoTest) {
        const validacion = [];

        for (const disc of discrepancias) {
            if (!disc.dimension || !disc.necesita_validacion) continue;

            let pregunta = null;

            if (disc.area_academica) {
                const areaBuscada = disc.area_academica.toLowerCase();
                const candidatas = await PreguntasOrientacion.findAll({
                    where: { tipo_test: tipoTest, dimension_principal: disc.dimension, activa: true }
                });

                pregunta = candidatas.find(p => {
                    const correlaciones = p.correlaciones_academicas || {};
                    const asignaturas = correlaciones.asignaturas || [];
                    return asignaturas.some(a => a.toLowerCase().includes(areaBuscada));
                });
            }

            if (!pregunta) {
                pregunta = await PreguntasOrientacion.findOne({
                    where: { tipo_test: tipoTest, dimension_principal: disc.dimension, peso_pregunta: 'baja', activa: true },
                    order: [['efectividad_historica', 'DESC']]
                });
            }

            if (pregunta) validacion.push(pregunta);
        }
        return validacion;
    }

    async obtenerPreguntasUsadasPorUsuario(usuarioId) {
        const sesiones = await SesionesTestOrientacion.findAll({
            where: {
                usuarioId: usuarioId,
                estado: {
                    [Op.in]: ['ronda_1_completada', 'ronda_2_completada', 'finalizada']
                }
            }
        });
        const usadas = new Set();
        sesiones.forEach(s => {
            (s.preguntas_ronda_1 || []).forEach(id => usadas.add(id));
            (s.preguntas_ronda_2 || []).forEach(id => usadas.add(id));
        });
        return Array.from(usadas);
    }

    /**
     * Agrupa preguntas por el atributo dimension_principal
     */
    agruparPorDimension(preguntas) {
        const agrupadas = {};
        preguntas.forEach(p => {
            const dim = p.dimension_principal;
            if (!agrupadas[dim]) {
                agrupadas[dim] = [];
            }
            agrupadas[dim].push(p);
        });
        return agrupadas;
    }

    /**
     * Toma un string y devuelve un número entero (hash)
     */
    _generateHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Convertir a 32bit int
        }
        return hash;
    }

    /**
     * Selecciona una pregunta aleatoria basada en un seed
     */
    seleccionarAleatoria(preguntas, seed) {
        if (preguntas.length === 0) return null;
        const index = Math.abs(this._generateHash(seed)) % preguntas.length;
        return preguntas[index];
    }

    /**
     * Mezcla aleatoriamente las preguntas basándose en un seed
     */
    mezclarAleatoriamente(preguntas, seed) {
        const res = [...preguntas];
        for (let i = res.length - 1; i > 0; i--) {
            const j = Math.abs(this._generateHash(seed + i)) % (i + 1);
            [res[i], res[j]] = [res[j], res[i]];
        }
        return res;
    }

    /**
     * Actualiza la efectividad de una pregunta
     */
    async actualizarEfectividadPregunta(preguntaId, fueCorrecta) {
        try {
            const pregunta = await PreguntasOrientacion.findByPk(preguntaId);
            if (!pregunta) {
                throw new ApiError(404, 'Pregunta no encontrada');
            }

            const vecesUsada = pregunta.veces_usada + 1;
            const vecesEfectiva = fueCorrecta ? pregunta.veces_efectiva + 1 : pregunta.veces_efectiva;
            const efectividad = vecesEfectiva / vecesUsada;

            await pregunta.update({
                veces_usada: vecesUsada,
                veces_efectiva: vecesEfectiva,
                efectividad_historica: efectividad,
            });

            return pregunta;
        } catch (error) {
            this._handleError('actualizarEfectividadPregunta', error);
        }
    }

    _handleError(metodo, error) {
        console.error(`Error en PreguntasOrientacionService.${metodo}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Error en PreguntasOrientacionService > ${metodo}: ${error.message}`);
    }
}

module.exports = new PreguntasOrientacionService();
