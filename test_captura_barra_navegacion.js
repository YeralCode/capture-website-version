import { ScreenshotService } from './src/services/screenshotService.js';
import chalk from 'chalk';

/**
 * Script de prueba para verificar capturas con barra de navegación real
 * usando herramientas del sistema de Ubuntu
 */

async function testCapturaConBarraNavegacion() {
  console.log(chalk.cyan('\n========================================'));
  console.log(chalk.cyan('TEST: Captura con Barra de Navegación Real'));
  console.log(chalk.cyan('========================================\n'));
  
  // URLs de prueba (sitios públicos simples)
  const urlsPrueba = [
    'https://example.com',
    'https://httpbin.org/html',
    'https://www.wikipedia.org'
  ];
  
  console.log(chalk.yellow('📋 URLs de prueba:'));
  urlsPrueba.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });
  console.log('');
  
  // Configuración del servicio con navegador REAL visible
  const configuracion = {
    directorioSalida: './screenshots',
    width: 1920,
    height: 1080,
    delay: 5,
    timeout: 30,
    usarNavegadorReal: true  // ← CLAVE: Navegador visible para captura del sistema
  };
  
  console.log(chalk.green('⚙️  Configuración:'));
  console.log(`   • Directorio: ${configuracion.directorioSalida}`);
  console.log(`   • Resolución: ${configuracion.width}x${configuracion.height}`);
  console.log(`   • Navegador real: ${configuracion.usarNavegadorReal ? 'SÍ ✅' : 'NO ❌'}`);
  console.log(`   • Delay: ${configuracion.delay}s`);
  console.log('');
  
  const service = new ScreenshotService(configuracion);
  
  try {
    console.log(chalk.cyan('🚀 Inicializando servicio...\n'));
    await service.inicializar();
    
    console.log(chalk.cyan('\n📸 Iniciando capturas de prueba...\n'));
    console.log(chalk.yellow('💡 NOTA: El navegador se abrirá de forma VISIBLE'));
    console.log(chalk.yellow('   Verás la ventana de Chrome con la barra de navegación real\n'));
    
    const resultados = [];
    
    for (let i = 0; i < urlsPrueba.length; i++) {
      const url = urlsPrueba[i];
      console.log(chalk.blue(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.blue(`Captura ${i + 1}/${urlsPrueba.length}: ${url}`));
      console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
      
      const resultado = await service.capturarScreenshot(
        url,
        i + 1,
        true,  // usarPlaywright = true
        null,  // nombreBase automático
        false  // modo secuencial (una pestaña)
      );
      
      resultados.push({
        url,
        ...resultado
      });
      
      // Pausa entre capturas
      if (i < urlsPrueba.length - 1) {
        console.log(chalk.gray('\n⏳ Esperando 2 segundos antes de la siguiente captura...\n'));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Resumen final
    console.log(chalk.cyan('\n\n========================================'));
    console.log(chalk.cyan('RESUMEN DE RESULTADOS'));
    console.log(chalk.cyan('========================================\n'));
    
    service.mostrarResumen();
    
    console.log(chalk.green('\n📁 Archivos generados:\n'));
    resultados.forEach((resultado, i) => {
      if (resultado.exito) {
        console.log(chalk.green(`   ✅ ${i + 1}. ${resultado.nombreArchivo}`));
        console.log(chalk.gray(`      URL: ${resultado.url}`));
        console.log(chalk.gray(`      Tamaño: ${(resultado.tamanio / 1024).toFixed(2)} KB`));
      } else {
        console.log(chalk.red(`   ❌ ${i + 1}. ERROR - ${resultado.url}`));
        console.log(chalk.gray(`      Error: ${resultado.error}`));
      }
    });
    
    console.log(chalk.green('\n✅ Test completado exitosamente!'));
    console.log(chalk.yellow('\n💡 VERIFICA LOS SCREENSHOTS:'));
    console.log(chalk.yellow(`   cd ${configuracion.directorioSalida}`));
    console.log(chalk.yellow(`   ls -lh\n`));
    console.log(chalk.cyan('🔍 Las capturas deben mostrar:'));
    console.log(chalk.cyan('   • Barra de navegación de Chrome'));
    console.log(chalk.cyan('   • URL visible en la barra de direcciones'));
    console.log(chalk.cyan('   • Botones de navegación (atrás, adelante, recargar)'));
    console.log(chalk.cyan('   • Borde de ventana del sistema operativo\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERROR durante el test:'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack));
  } finally {
    console.log(chalk.cyan('\n🔒 Cerrando navegador...\n'));
    await service.cerrar();
    console.log(chalk.green('✅ Navegador cerrado\n'));
  }
}

// Ejecutar test
console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║  TEST DE CAPTURA CON BARRA NAVEGACIÓN  ║'));
console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

testCapturaConBarraNavegacion()
  .then(() => {
    console.log(chalk.green.bold('\n✅ Test finalizado correctamente\n'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red.bold('\n❌ Test falló:\n'));
    console.error(error);
    process.exit(1);
  });

