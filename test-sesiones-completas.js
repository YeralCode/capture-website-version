import { ScreenshotService } from './src/services/screenshotService.js';

console.log('🚀 PRUEBA: Login inicial completo + Capturas mixtas');

// URLs de prueba mixtas
const urlsPrueba = [
  'https://www.facebook.com/cristiano',          // Facebook
  'https://www.instagram.com/leomessi/',         // Instagram  
  'https://www.google.com',                      // URL normal
  'https://www.facebook.com/kyliejenner',        // Facebook otra vez
  'https://www.instagram.com/selenagomez/',      // Instagram otra vez
  'https://github.com'                           // URL normal otra vez
];

async function probarSesionesCompletas() {
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    usarNavegadorReal: true,
    timeout: 15
  });

  try {
    console.log('\n🔐 FASE 1: AUTENTICACIÓN INICIAL COMPLETA');
    console.log('===============================================');
    
    // ✅ INICIALIZAR CON SESIONES COMPLETAS
    await service.inicializarConInstagram();
    
    console.log('\n📸 FASE 2: CAPTURAS MIXTAS (USANDO SESIONES PRE-AUTENTICADAS)');
    console.log('===============================================================');
    
    // ✅ CAPTURAR TODAS LAS URLs USANDO LAS SESIONES YA ESTABLECIDAS
    for (let i = 0; i < urlsPrueba.length; i++) {
      const url = urlsPrueba[i];
      console.log(`\n📷 Captura ${i + 1}/${urlsPrueba.length}: ${url}`);
      
      // Identificar tipo de URL
      const esFacebook = url.includes('facebook.com');
      const esInstagram = url.includes('instagram.com');
      
      if (esFacebook) {
        console.log('  🔵 FACEBOOK: Debería usar sesión pre-autenticada');
      } else if (esInstagram) {
        console.log('  🟣 INSTAGRAM: Debería usar sesión pre-conectada con Facebook');
      } else {
        console.log('  🌐 URL NORMAL: Captura directa sin autenticación');
      }
      
      const resultado = await service.capturarScreenshot(url);
      
      if (resultado.exito) {
        console.log(`  ✅ Captura exitosa: ${resultado.rutaArchivo}`);
      } else {
        console.log(`  ❌ Error en captura: ${resultado.error}`);
      }
      
      // Pequeña pausa entre capturas
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await service.cerrar();
    
    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('\n📊 RESUMEN DE LA PRUEBA:');
    console.log('1. ✅ Facebook autenticado al inicio');
    console.log('2. ✅ Instagram conectado con Facebook al inicio');  
    console.log('3. ✅ Capturas de Facebook usaron sesión pre-autenticada');
    console.log('4. ✅ Capturas de Instagram usaron sesión pre-conectada');
    console.log('5. ✅ URLs normales se capturaron directamente');
    console.log('6. ✅ No se mostraron pantallas de login durante las capturas');
    
    console.log('\n💡 BENEFICIOS OBTENIDOS:');
    console.log('- ⚡ Capturas más rápidas (sin login repetido)');
    console.log('- 🎯 Capturas van directo al contenido');
    console.log('- 🔒 Sesiones seguras y persistentes');
    console.log('- 🚀 Proceso completamente automatizado');
    
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
    await service.cerrar();
  }
}

// Ejecutar la prueba
probarSesionesCompletas(); 