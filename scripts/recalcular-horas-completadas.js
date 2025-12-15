/**
 * Script de migración one-time para recalcular las horasCompletadas
 * de todos los estudiantes becarios basándose en sus reportes aprobados
 *
 * Uso: node scripts/recalcular-horas-completadas.js
 */

const { EstudianteBecario, ReporteActividad, sequelize } = require('../src/models');

async function recalcularHorasCompletadas() {
  console.log('🔄 Iniciando recálculo de horas completadas...\n');

  const transaction = await sequelize.transaction();

  try {
    // Obtener todos los estudiantes becarios activos
    const becarios = await EstudianteBecario.findAll({
      where: {
        estado: ['Activa', 'Culminada', 'Suspendida']
      }
    });

    console.log(`📊 Total de becarios a procesar: ${becarios.length}\n`);

    let actualizados = 0;
    let sinCambios = 0;
    let errores = 0;

    // Procesar cada becario
    for (const becario of becarios) {
      try {
        const horasAntes = parseFloat(becario.horasCompletadas);

        // Calcular horas totales aprobadas (sin filtrar por período)
        const horasTotales = await ReporteActividad.calcularHorasTotales(
          becario.id,
          null, // null = calcular de TODOS los períodos
          'Aprobada'
        );

        const horasNuevas = horasTotales || 0;

        // Debug
        if (becario.id === 'ca1dde60-2549-47d1-a8f4-feb6b57f1ca0') {
          console.log(`\n🔍 DEBUG Becario ${becario.id}:`);
          console.log(`   - Horas antes: ${horasAntes}`);
          console.log(`   - Horas calculadas: ${horasTotales}`);
          console.log(`   - Horas nuevas: ${horasNuevas}\n`);
        }

        // Actualizar si hay diferencia
        if (horasAntes !== horasNuevas) {
          await becario.update({
            horasCompletadas: horasNuevas
          }, {
            transaction
          });

          console.log(
            `✅ Becario ${becario.id}: ${horasAntes}h → ${horasNuevas}h ` +
            `(${horasNuevas > horasAntes ? '+' : ''}${(horasNuevas - horasAntes).toFixed(2)}h)`
          );
          actualizados++;
        } else {
          console.log(`⚪ Becario ${becario.id}: ${horasAntes}h (sin cambios)`);
          sinCambios++;
        }
      } catch (error) {
        console.error(`❌ Error procesando becario ${becario.id}:`, error.message);
        errores++;
      }
    }

    // Commit de la transacción
    await transaction.commit();

    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DEL RECÁLCULO:');
    console.log('='.repeat(60));
    console.log(`✅ Becarios actualizados: ${actualizados}`);
    console.log(`⚪ Becarios sin cambios: ${sinCambios}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total procesados: ${becarios.length}`);
    console.log('='.repeat(60));

    console.log('\n✨ Recálculo completado exitosamente\n');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error fatal durante el recálculo:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar el script
recalcularHorasCompletadas();
