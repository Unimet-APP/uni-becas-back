/**
 * Utility helper para validación y gestión de horarios
 * Previene solapamiento de horarios y valida compatibilidad
 */

/**
 * Convertir hora en formato HH:MM a minutos desde medianoche
 * @param {String} hora - Hora en formato HH:MM (ej: "08:30")
 * @returns {Number} - Minutos desde medianoche (ej: 510 para 08:30)
 */
function horaAMinutos(hora) {
  if (!hora || typeof hora !== 'string') {
    throw new Error('Hora inválida');
  }

  const partes = hora.split(':');
  if (partes.length !== 2) {
    throw new Error(`Formato de hora inválido: ${hora}. Debe ser HH:MM`);
  }

  const horas = parseInt(partes[0], 10);
  const minutos = parseInt(partes[1], 10);

  if (isNaN(horas) || isNaN(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    throw new Error(`Hora fuera de rango: ${hora}`);
  }

  return horas * 60 + minutos;
}

/**
 * Convertir minutos desde medianoche a formato HH:MM
 * @param {Number} minutos - Minutos desde medianoche
 * @returns {String} - Hora en formato HH:MM
 */
function minutosAHora(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Verificar si dos rangos de tiempo se solapan
 * @param {String} inicio1 - Hora de inicio del primer rango (HH:MM)
 * @param {String} fin1 - Hora de fin del primer rango (HH:MM)
 * @param {String} inicio2 - Hora de inicio del segundo rango (HH:MM)
 * @param {String} fin2 - Hora de fin del segundo rango (HH:MM)
 * @returns {Boolean} - true si hay solapamiento, false si no
 */
function rangosSeSolapan(inicio1, fin1, inicio2, fin2) {
  try {
    const min1Inicio = horaAMinutos(inicio1);
    const min1Fin = horaAMinutos(fin1);
    const min2Inicio = horaAMinutos(inicio2);
    const min2Fin = horaAMinutos(fin2);

    // Validar que inicio < fin para cada rango
    if (min1Inicio >= min1Fin) {
      throw new Error(`Rango 1 inválido: ${inicio1} debe ser menor que ${fin1}`);
    }
    if (min2Inicio >= min2Fin) {
      throw new Error(`Rango 2 inválido: ${inicio2} debe ser menor que ${fin2}`);
    }

    // Dos rangos se solapan si:
    // - El inicio del rango 1 está dentro del rango 2, O
    // - El inicio del rango 2 está dentro del rango 1, O
    // - El rango 1 contiene completamente al rango 2, O
    // - El rango 2 contiene completamente al rango 1
    return (
      (min1Inicio < min2Fin && min1Fin > min2Inicio)
    );
  } catch (error) {
    throw new Error(`Error al comparar rangos: ${error.message}`);
  }
}

/**
 * Verificar si dos horarios (arrays de objetos con dia, horaInicio, horaFin) se solapan
 * @param {Array} horario1 - Primer horario (formato Plaza.horario)
 * @param {Array} horario2 - Segundo horario (formato Plaza.horario)
 * @returns {Object} - { seSolapan: Boolean, conflictos: Array }
 */
function horariosSeSolapan(horario1, horario2) {
  if (!Array.isArray(horario1) || !Array.isArray(horario2)) {
    throw new Error('Los horarios deben ser arrays');
  }

  const conflictos = [];

  for (const bloque1 of horario1) {
    if (!bloque1.dia || !bloque1.horaInicio || !bloque1.horaFin) {
      continue; // Saltar bloques incompletos
    }

    for (const bloque2 of horario2) {
      if (!bloque2.dia || !bloque2.horaInicio || !bloque2.horaFin) {
        continue;
      }

      // Solo comparar si son el mismo día
      if (bloque1.dia === bloque2.dia) {
        try {
          if (rangosSeSolapan(bloque1.horaInicio, bloque1.horaFin, bloque2.horaInicio, bloque2.horaFin)) {
            conflictos.push({
              dia: bloque1.dia,
              horario1: `${bloque1.horaInicio} - ${bloque1.horaFin}`,
              horario2: `${bloque2.horaInicio} - ${bloque2.horaFin}`
            });
          }
        } catch (error) {
          // Si hay error en la comparación, agregarlo como conflicto potencial
          conflictos.push({
            dia: bloque1.dia,
            error: error.message
          });
        }
      }
    }
  }

  return {
    seSolapan: conflictos.length > 0,
    conflictos
  };
}

/**
 * Verificar si un horario tiene bloques internos que se solapan consigo mismo
 * @param {Array} horario - Horario a validar (formato Plaza.horario)
 * @returns {Object} - { tieneConflictos: Boolean, conflictos: Array }
 */
function horarioTieneConflictosInternos(horario) {
  if (!Array.isArray(horario)) {
    throw new Error('El horario debe ser un array');
  }

  const conflictos = [];
  const bloquesValidos = horario.filter(b => b.dia && b.horaInicio && b.horaFin);

  // Agrupar bloques por día
  const bloquesPorDia = {};
  for (const bloque of bloquesValidos) {
    if (!bloquesPorDia[bloque.dia]) {
      bloquesPorDia[bloque.dia] = [];
    }
    bloquesPorDia[bloque.dia].push(bloque);
  }

  // Verificar solapamiento dentro de cada día
  for (const [dia, bloques] of Object.entries(bloquesPorDia)) {
    for (let i = 0; i < bloques.length; i++) {
      for (let j = i + 1; j < bloques.length; j++) {
        try {
          if (rangosSeSolapan(
            bloques[i].horaInicio, bloques[i].horaFin,
            bloques[j].horaInicio, bloques[j].horaFin
          )) {
            conflictos.push({
              dia,
              bloque1: `${bloques[i].horaInicio} - ${bloques[i].horaFin}`,
              bloque2: `${bloques[j].horaInicio} - ${bloques[j].horaFin}`
            });
          }
        } catch (error) {
          conflictos.push({
            dia,
            error: error.message
          });
        }
      }
    }
  }

  return {
    tieneConflictos: conflictos.length > 0,
    conflictos
  };
}

/**
 * Calcular horas totales de un horario semanal
 * @param {Array} horario - Horario (formato Plaza.horario)
 * @returns {Number} - Total de horas por semana
 */
function calcularHorasTotales(horario) {
  if (!Array.isArray(horario)) {
    return 0;
  }

  let totalMinutos = 0;

  for (const bloque of horario) {
    if (!bloque.horaInicio || !bloque.horaFin) {
      continue;
    }

    try {
      const minInicio = horaAMinutos(bloque.horaInicio);
      const minFin = horaAMinutos(bloque.horaFin);

      if (minFin > minInicio) {
        totalMinutos += (minFin - minInicio);
      }
    } catch (error) {
      // Ignorar bloques con formato inválido
      continue;
    }
  }

  return totalMinutos / 60; // Convertir a horas
}

/**
 * Validar que un horario cumple con las horas semanales requeridas
 * @param {Array} horario - Horario a validar
 * @param {Number} horasRequeridas - Horas semanales requeridas (5 o 10)
 * @returns {Object} - { cumple: Boolean, horasTotales: Number, diferencia: Number }
 */
function validarHorasSemanales(horario, horasRequeridas) {
  const horasTotales = calcularHorasTotales(horario);
  const cumple = Math.abs(horasTotales - horasRequeridas) < 0.5; // Tolerancia de 30 minutos

  return {
    cumple,
    horasTotales: parseFloat(horasTotales.toFixed(2)),
    horasRequeridas,
    diferencia: parseFloat((horasTotales - horasRequeridas).toFixed(2))
  };
}

/**
 * Verificar si un estudiante tiene disponibilidad en un horario específico
 * @param {Object} disponibilidad - Disponibilidad del estudiante (DisponibilidadHoraria.disponibilidad)
 * @param {Array} horarioPlaza - Horario de la plaza (Plaza.horario)
 * @returns {Object} - { esCompatible: Boolean, bloquesSinDisponibilidad: Array }
 */
function verificarDisponibilidadEnHorario(disponibilidad, horarioPlaza) {
  if (!disponibilidad || typeof disponibilidad !== 'object') {
    throw new Error('Disponibilidad inválida');
  }

  if (!Array.isArray(horarioPlaza)) {
    throw new Error('Horario de plaza inválido');
  }

  const bloquesSinDisponibilidad = [];

  // Mapeo de días español -> español (normalizado)
  const mapaDias = {
    'Lunes': 'lunes',
    'Martes': 'martes',
    'Miércoles': 'miercoles',
    'Jueves': 'jueves',
    'Viernes': 'viernes',
    'Sábado': 'sabado',
    'Domingo': 'domingo'
  };

  for (const bloqueP of horarioPlaza) {
    if (!bloqueP.dia || !bloqueP.horaInicio || !bloqueP.horaFin) {
      continue;
    }

    const diaNormalizado = mapaDias[bloqueP.dia] || bloqueP.dia.toLowerCase();
    const disponibilidadDia = disponibilidad[diaNormalizado] || [];

    if (!Array.isArray(disponibilidadDia) || disponibilidadDia.length === 0) {
      bloquesSinDisponibilidad.push({
        dia: bloqueP.dia,
        horario: `${bloqueP.horaInicio} - ${bloqueP.horaFin}`,
        motivo: 'Sin disponibilidad en este día'
      });
      continue;
    }

    // Verificar si alguna hora disponible cae dentro del rango del bloque
    try {
      const minInicio = horaAMinutos(bloqueP.horaInicio);
      const minFin = horaAMinutos(bloqueP.horaFin);

      let tieneDisponibilidad = false;

      for (const horaDisp of disponibilidadDia) {
        try {
          const minDisp = horaAMinutos(horaDisp);

          // Si la hora disponible está dentro del rango del bloque
          if (minDisp >= minInicio && minDisp < minFin) {
            tieneDisponibilidad = true;
            break;
          }
        } catch (error) {
          // Ignorar horas con formato inválido
          continue;
        }
      }

      if (!tieneDisponibilidad) {
        bloquesSinDisponibilidad.push({
          dia: bloqueP.dia,
          horario: `${bloqueP.horaInicio} - ${bloqueP.horaFin}`,
          motivo: 'No hay disponibilidad en este horario'
        });
      }
    } catch (error) {
      bloquesSinDisponibilidad.push({
        dia: bloqueP.dia,
        horario: `${bloqueP.horaInicio} - ${bloqueP.horaFin}`,
        motivo: `Error: ${error.message}`
      });
    }
  }

  return {
    esCompatible: bloquesSinDisponibilidad.length === 0,
    bloquesSinDisponibilidad
  };
}

/**
 * Generar reporte legible de conflictos de horarios
 * @param {Array} conflictos - Array de conflictos
 * @returns {String} - Reporte formateado
 */
function generarReporteConflictos(conflictos) {
  if (!conflictos || conflictos.length === 0) {
    return 'No se detectaron conflictos de horario.';
  }

  let reporte = `Se detectaron ${conflictos.length} conflicto(s) de horario:\n\n`;

  conflictos.forEach((conflicto, index) => {
    reporte += `${index + 1}. Día: ${conflicto.dia}\n`;

    if (conflicto.error) {
      reporte += `   Error: ${conflicto.error}\n`;
    } else if (conflicto.horario1 && conflicto.horario2) {
      reporte += `   - Horario 1: ${conflicto.horario1}\n`;
      reporte += `   - Horario 2: ${conflicto.horario2}\n`;
    } else if (conflicto.bloque1 && conflicto.bloque2) {
      reporte += `   - Bloque 1: ${conflicto.bloque1}\n`;
      reporte += `   - Bloque 2: ${conflicto.bloque2}\n`;
    } else if (conflicto.horario && conflicto.motivo) {
      reporte += `   - Horario: ${conflicto.horario}\n`;
      reporte += `   - Motivo: ${conflicto.motivo}\n`;
    }

    reporte += '\n';
  });

  return reporte;
}

/**
 * Contar bloques de 30 minutos matcheados entre disponibilidad y horario de plaza
 * @param {Object} disponibilidad - Disponibilidad del estudiante (DisponibilidadHoraria.disponibilidad)
 * @param {Array} horarioPlaza - Horario de la plaza (Plaza.horario)
 * @returns {Object} - { totalBloques, bloquesMatcheados, porcentaje, detallesPorDia }
 */
function contarBloquesMatcheados(disponibilidad, horarioPlaza) {
  if (!disponibilidad || typeof disponibilidad !== 'object') {
    throw new Error('Disponibilidad inválida');
  }

  if (!Array.isArray(horarioPlaza)) {
    throw new Error('Horario de plaza inválido');
  }

  // Mapeo de días español -> español (normalizado)
  const mapaDias = {
    'Lunes': 'lunes',
    'Martes': 'martes',
    'Miércoles': 'miercoles',
    'Jueves': 'jueves',
    'Viernes': 'viernes',
    'Sábado': 'sabado',
    'Domingo': 'domingo'
  };

  let totalBloques = 0;
  let bloquesMatcheados = 0;
  const detallesPorDia = {};

  for (const bloqueP of horarioPlaza) {
    if (!bloqueP.dia || !bloqueP.horaInicio || !bloqueP.horaFin) {
      continue;
    }

    const diaNormalizado = mapaDias[bloqueP.dia] || bloqueP.dia.toLowerCase();
    const disponibilidadDia = disponibilidad[diaNormalizado] || [];

    try {
      const minInicio = horaAMinutos(bloqueP.horaInicio);
      const minFin = horaAMinutos(bloqueP.horaFin);

      // Generar todos los bloques de 30 minutos en este rango
      const bloquesRequeridos = [];
      for (let min = minInicio; min < minFin; min += 30) {
        bloquesRequeridos.push(minutosAHora(min));
      }

      totalBloques += bloquesRequeridos.length;

      // Contar cuántos bloques están disponibles
      let matcheadosEnEsteBloque = 0;
      for (const bloqueRequerido of bloquesRequeridos) {
        if (disponibilidadDia.includes(bloqueRequerido)) {
          matcheadosEnEsteBloque++;
          bloquesMatcheados++;
        }
      }

      // Guardar detalles por día
      if (!detallesPorDia[bloqueP.dia]) {
        detallesPorDia[bloqueP.dia] = {
          requeridos: 0,
          disponibles: 0,
          bloques: []
        };
      }

      detallesPorDia[bloqueP.dia].requeridos += bloquesRequeridos.length;
      detallesPorDia[bloqueP.dia].disponibles += matcheadosEnEsteBloque;
      detallesPorDia[bloqueP.dia].bloques.push({
        horario: `${bloqueP.horaInicio} - ${bloqueP.horaFin}`,
        bloquesRequeridos: bloquesRequeridos.length,
        bloquesDisponibles: matcheadosEnEsteBloque,
        bloquesEspecificos: bloquesRequeridos.map(b => ({
          hora: b,
          disponible: disponibilidadDia.includes(b)
        }))
      });

    } catch (error) {
      // Si hay error en el procesamiento, continuar con el siguiente bloque
      continue;
    }
  }

  const porcentaje = totalBloques > 0
    ? parseFloat(((bloquesMatcheados / totalBloques) * 100).toFixed(2))
    : 0;

  return {
    totalBloques,
    bloquesMatcheados,
    porcentaje,
    detallesPorDia
  };
}

module.exports = {
  horaAMinutos,
  minutosAHora,
  rangosSeSolapan,
  horariosSeSolapan,
  horarioTieneConflictosInternos,
  calcularHorasTotales,
  validarHorasSemanales,
  verificarDisponibilidadEnHorario,
  generarReporteConflictos,
  contarBloquesMatcheados
};
