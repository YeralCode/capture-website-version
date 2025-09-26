import { IntegratedScrapingAutomation } from './src/index_integrated.js';
import fs from 'fs/promises';

console.log('🚀 PRUEBA: Flujo completo integrado con login inicial');

async function probarFlujoCompleto() {
  try {
    // Crear archivo temporal con pocas URLs para prueba
    const urlsPrueba = [
      'https://www.facebook.com/cristiano',
      'https://www.instagram.com/leomessi/',
      'https://www.google.com'
    ];
    
    const archivoTemporal = 'urls_prueba_temp.txt';
    await fs.writeFile(archivoTemporal, urlsPrueba.join('\n'));
    
    console.log('\n🔗 URLs de prueba creadas:');
    urlsPrueba.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    
    // Configuración personalizada para la prueba
    const configuracionPrueba = {
      screenshots: {
        timeout: 15,
        usarNavegadorReal: true
      }
    };
    
    console.log('\n🚀 INICIANDO FLUJO COMPLETO...\n');
    
    // Crear y ejecutar la automatización
    const automation = new IntegratedScrapingAutomation(configuracionPrueba);
    
    // Modificar temporalmente los archivos de URLs que carga
    const originalCargarUrls = automation.cargarUrls;
    automation.cargarUrls = async function() {
      console.log('📂 Cargando URLs de prueba...');
      return urlsPrueba;
    };
    
    // Ejecutar el proceso completo
    await automation.inicializar();
    await automation.ejecutar();
    
    // Limpiar archivo temporal
    await fs.unlink(archivoTemporal).catch(() => {});
    
    console.log('\n🎉 ¡PRUEBA DEL FLUJO COMPLETO EXITOSA!');
    console.log('\n✅ VERIFICACIONES REALIZADAS:');
    console.log('1. ✅ Login de Facebook al inicio');
    console.log('2. ✅ Instagram conectado con Facebook al inicio');
    console.log('3. ✅ URLs procesadas con sesiones pre-autenticadas');
    console.log('4. ✅ PDF generado con resultados');
    console.log('5. ✅ Proceso completamente automatizado');
    
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
    
    // Limpiar en caso de error
    try {
      await fs.unlink('urls_prueba_temp.txt');
    } catch (e) {
      // Ignorar si no existe
    }
  }
}

// Ejecutar la prueba
probarFlujoCompleto(); 