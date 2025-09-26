import { ScreenshotService } from './src/services/screenshotService.js';

console.log('🔗 PRUEBA SIMPLE: Facebook Connect + Instagram');

async function probarConexionFacebookInstagram() {
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    usarNavegadorReal: true,
    timeout: 15
  });

  try {
    console.log('\n🚀 INICIALIZANDO servicio...');
    
    // Inicializar normalmente primero
    await service.inicializar();
    
    // Inicializar Playwright
    await service.inicializarPlaywrightConRetry();
    
    console.log('\n1️⃣ PASO 1: Preparando Facebook Connect para Instagram...');
    await service.prepararLoginInstagramConFacebook();
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`✅ Facebook autenticado: ${service.loginRealizado.facebook}`);
    console.log(`✅ Instagram conectado: ${service.loginRealizado.instagram}`);
    
    if (service.loginRealizado.facebook && service.loginRealizado.instagram) {
      console.log('\n🎉 ¡PERFECTO! Ambas sesiones están preparadas');
      console.log('📸 Ahora las capturas de Instagram NO mostrarán login');
      console.log('🔄 Las sesiones se reutilizarán automáticamente');
    } else {
      console.log('\n⚠️ Algunas sesiones pueden necesitar configuración manual');
    }
    
    await service.cerrar();
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n💡 CÓMO FUNCIONA:');
    console.log('1. Se autentica en Facebook primero');
    console.log('2. Va a Instagram y busca "Continuar con Facebook"');
    console.log('3. Usa la sesión de Facebook para autenticar Instagram');
    console.log('4. Ambas sesiones quedan guardadas para futuras capturas');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await service.cerrar();
  }
}

// Ejecutar la prueba
probarConexionFacebookInstagram(); 