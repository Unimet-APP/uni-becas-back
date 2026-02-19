'use strict';

/**
 * Pruebas para testOrientacionService:
 * - Holland: influencia 20% de la dimensión secundaria (caja blanca).
 * - Holland: detección de ambigüedades (R e I cercanos al promedio).
 * - ICO: puntuación Likert (opcional).
 */

jest.mock('../../src/models', () => {
  const mockPreguntas = [];
  return {
    PreguntasOrientacion: {
      findAll: jest.fn(() => Promise.resolve([...mockPreguntas])),
      _setMockPreguntas: (p) => {
        mockPreguntas.length = 0;
        mockPreguntas.push(...(Array.isArray(p) ? p : [p]));
      },
    },
    SesionesTestOrientacion: {},
    RespuestasTestOrientacion: {},
    ResultadosOrientacion: {},
    Usuario: {},
    Op: {},
  };
});

const testOrientacionService = require('../../src/services/testOrientacionService');
const { PreguntasOrientacion } = require('../../src/models');

describe('Test Orientación Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Holland - Influencia 20% dimensión secundaria (caja blanca)', () => {
    test('una pregunta con dimensión principal R y secundaria I, respuesta Sí, debe sumar a R el peso completo y a I el 20% del peso', async () => {
      const preguntaId = 'pregunta-r-i-001';
      const pregunta = {
        id: preguntaId,
        dimension_principal: 'Realista',
        dimension_secundaria: ['Investigador'],
        instrucciones_respuesta: ['Sí', 'No'],
        peso_pregunta: 'alta',
      };
      PreguntasOrientacion._setMockPreguntas([pregunta]);

      const respuestas = [
        { pregunta_id: preguntaId, respuesta: true },
      ];

      const puntuaciones = await testOrientacionService.calcularPuntuaciones(respuestas, 'Holland_RIASEC');

      expect(puntuaciones.Realista).toBe(100);
      expect(puntuaciones.Investigador).toBe(20);
      expect(puntuaciones.Artístico).toBe(0);
      expect(puntuaciones.Social).toBe(0);
      expect(puntuaciones.Emprendedor).toBe(0);
      expect(puntuaciones.Convencional).toBe(0);
    });

    test('peso alta=3: dimensión secundaria debe recibir 0.6 (3 * 0.2) antes de normalizar', async () => {
      const preguntaId = 'pregunta-peso-alta';
      const pregunta = {
        id: preguntaId,
        dimension_principal: 'Realista',
        dimension_secundaria: ['Investigador'],
        instrucciones_respuesta: ['Sí', 'No'],
        peso_pregunta: 'alta',
      };
      PreguntasOrientacion._setMockPreguntas([pregunta]);

      const puntuaciones = await testOrientacionService.calcularPuntuaciones(
        [{ pregunta_id: preguntaId, respuesta: true }],
        'Holland_RIASEC'
      );

      expect(puntuaciones.Investigador).toBe(20);
    });
  });

  describe('Holland - Detección de ambigüedades', () => {
    test('cuando Realista e Investigador están cerca del promedio, deben aparecer en ambiguedades', () => {
      const puntuaciones = {
        Realista: 30,
        Investigador: 28,
        Artístico: 80,
        Social: 10,
        Emprendedor: 10,
        Convencional: 10,
      };

      const ambiguedades = testOrientacionService.detectarAmbiguedades(puntuaciones);

      const dimensionesAmbiguas = ambiguedades.map(a => a.dimension);
      expect(dimensionesAmbiguas).toContain('Realista');
      expect(dimensionesAmbiguas).toContain('Investigador');
    });

    test('ambiguedades incluye razón "Puntuación cercana al promedio"', () => {
      const puntuaciones = {
        Realista: 25,
        Investigador: 26,
        Artístico: 70,
        Social: 12,
        Emprendedor: 10,
        Convencional: 11,
      };

      const ambiguedades = testOrientacionService.detectarAmbiguedades(puntuaciones);

      expect(ambiguedades.length).toBeGreaterThan(0);
      ambiguedades.forEach(a => {
        expect(a).toHaveProperty('dimension');
        expect(a).toHaveProperty('puntuacion');
        expect(a.razon).toBe('Puntuación cercana al promedio');
      });
    });
  });

  describe('ICO - Puntuación Likert', () => {
    test('Frecuentemente (valor_likert 2) suma peso completo a la dimensión', async () => {
      const preguntaId = 'ico-001';
      const pregunta = {
        id: preguntaId,
        dimension_principal: 'Investigador',
        dimension_secundaria: [],
        instrucciones_respuesta: ['Frecuentemente', 'A veces', 'Nunca'],
        peso_pregunta: 'alta',
      };
      PreguntasOrientacion._setMockPreguntas([pregunta]);

      const puntuaciones = await testOrientacionService.calcularPuntuaciones(
        [{ pregunta_id: preguntaId, respuesta: true, valor_likert: 2 }],
        'ICO'
      );

      expect(puntuaciones.Investigador).toBe(100);
    });

    test('A veces (valor_likert 1) suma 50% del peso', async () => {
      const preguntaId = 'ico-002';
      const pregunta = {
        id: preguntaId,
        dimension_principal: 'Social',
        dimension_secundaria: [],
        instrucciones_respuesta: ['Frecuentemente', 'A veces', 'Nunca'],
        peso_pregunta: 'alta',
      };
      PreguntasOrientacion._setMockPreguntas([pregunta]);

      const puntuaciones = await testOrientacionService.calcularPuntuaciones(
        [{ pregunta_id: preguntaId, respuesta: true, valor_likert: 1 }],
        'ICO'
      );

      expect(puntuaciones.Social).toBe(100);
    });

    test('Nunca (valor_likert 0) no suma puntos', async () => {
      const preguntaId = 'ico-003';
      const pregunta = {
        id: preguntaId,
        dimension_principal: 'Artístico',
        dimension_secundaria: [],
        instrucciones_respuesta: ['Frecuentemente', 'A veces', 'Nunca'],
        peso_pregunta: 'media',
      };
      PreguntasOrientacion._setMockPreguntas([pregunta]);

      const puntuaciones = await testOrientacionService.calcularPuntuaciones(
        [{ pregunta_id: preguntaId, respuesta: false, valor_likert: 0 }],
        'ICO'
      );

      expect(puntuaciones.Artístico).toBe(0);
    });
  });
});
