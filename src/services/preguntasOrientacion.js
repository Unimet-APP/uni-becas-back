const { PreguntasOrientacion, SesionesTestOrientacion } = require('../models');
const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

class PreguntasOrientacionService {

    async seleccionarPregutasRonda1(sesionId, tipoTest, seed){
       try {
         console.log(`[BancoPreguntasService] Obteniendo preguntas para: ${tipoTest}`);

         const preguntas = await PreguntasOrientacion.findAll({
            where: {
                tipo_test: tipoTest,
                activa: true,
            },
            order: [
                ['peso_pregunta', 'DESC'],
            ]},
        
        
        );
    
        if(preguntas.length === 0){
            throw ApiError.notFound('No se encontraron preguntas para el tipo de test');
        }
        
        const preguntasUsadas = await this.obtenerPregunasUsadasPorUsuario(usuarioId);
        const Dimension = this.agruparPreguntasPorDimension(preguntas);
        const seleccionadas = [];

        for(const dimension in Dimension){
            const disponibles = Dimension[dimension].filter(pregunta => !preguntasUsadas.includes(pregunta.id));
            const pool = disponibles.length > 0 ? disponibles : Dimension[dimension];

            const alta = this.seleccionarAleatoria(pool.filter(p => p.peso === 'alta'), `${seed}${dimension}alta`);
            const media = this.seleccionarAleatoria(pool.filter(p => p.peso === 'media'), `${seed}${dimension}media`);

            if (alta) seleccionadas.push(alta);
            if (media && media.id !== alta?.id) seleccionadas.push(media);
        }
        return this.mezclarAleatoriamente(seleccionadas,seed);
       }catch(error){
           this.handleError('Obtener preguntas ronda 1',error);
       }

    }

    async seleccionarPreguntasRonda2(sesionId, puntuacionesRonda1, discrepancias, areasAmbiguedad){
        try {
            const sesion = await SesionesTestOrientacion.findByPk(sesionId);
            if(!sesion){
                throw ApiError.notFound('Sesión no encontrada');
            }
            const seleccionadas = [];
            const dimensions = object.keys(puntuacionesRonda1);

            for(const dimension of dimensions){
                const puntuacion = puntuacionesRonda1[dimension] || 0;

                if (puntuacion > 60){
                    const confirmado = await PreguntasOrientacion.obtenerPolaridad(sesion.tipoTest, dimension);
                    seleccionadas.push(...confirmacion.filter(p => p.dimension_principal === dimension).slice(0, 2));
                }else if (puntuacion > 40){
                    const validacion = await PreguntasOrientacion.findAll({
                        where: {tipo_test: sesion.tipoTest, dimension_principal: dimension, peso_pregunta: 'baja', activa: true},
                        order: [
                            ['peso_pregunta', 'DESC'],
                        ],
                        limit: 2,
                    })
                    seleccionadas.push(...validacion);
                }else {
                    const polarizantes = await PreguntasOrientacion.obtenerPolarizantes(sesion.tipoTest, 5);
                    
                }

            } 

            if (discrepancias.length > 0){
                const vCruzada = await PreguntasOrientacion.obtenerVCruzada(sesion.tipoTest, discrepancias);
                seleccionadas.push(...vCruzada);
            }

            return await this.aplicarReglasAntisesgo(seleccionadas, dimensiones, sesion.tipoTest);
               
        }catch(error){
            this._handleError('obtenerPreguntasRonda2', error);
        }
    }

    async aplicarReglasAntiSesgo(preguntas, dimensiones, tipoTest) {
        const cubiertas = new Set(preguntas.map(p => p.dimension_principal));
    
        for (const dimension of dimensiones) {
          if (!cubiertas.has(dimension)) {
            const minima = await PreguntaOrientacion.findOne({
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

      if (disc.evidencia_academica?.area) {
        const areaBuscada = disc.evidencia_academica.area.toLowerCase();
        const candidatas = await PreguntaOrientacion.findAll({
          where: { tipo_test: tipoTest, dimension_principal: disc.dimension, activa: true }
        });

        pregunta = candidatas.find(p => 
          p.correlaciones_academicas?.asignaturas?.some(a => a.toLowerCase().includes(areaBuscada))
        );
      }

      if (!pregunta) {
        pregunta = await PreguntaOrientacion.findOne({
          where: { tipo_test: tipoTest, dimension_principal: disc.dimension, peso: 'baja', activa: true },
          order: [['efectividad_historica', 'DESC']]
        });
      }

      if (pregunta) validacion.push(pregunta);
    }
    return validacion;
  }

  async obtenerPreguntasUsadasPorUsuario(usuarioId) {
    const sesiones = await SesionesTestOrientacion.findAll({
        where:{
            usuario_id: usuarioId,
            estado: {
                [Op.in]: ['ronda_1_completada', 'ronda_2_completada', 'finalizadax']
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
  //revisar
  agruparPorDimension(preguntas) {
    return preguntas.reduce((acc, p) => {
      acc[p.dimension_principal] = acc[p.dimension_principal] || [];
      acc[p.dimension_principal].push(p);
      return acc;
    }, {});
  }

  seleccionarAleatoria(preguntas, seed) {
    if (preguntas.length === 0) return null;
    const index = Math.abs(this._generateHash(seed)) % preguntas.length;
    return preguntas[index];
  }

  mezclarAleatoriamente(preguntas, seed) {
    const res = [...preguntas];
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.abs(this._generateHash(seed + i)) % (i + 1);
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }

  _generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convertir a 32bit int
    }
    return hash;
  }

  _handleError(metodo, error) {
    console.error(`Error en ${metodo}:`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error en BancoPreguntasService > ${metodo}: ${error.message}`);
  }
}