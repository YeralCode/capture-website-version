import { ScreenshotService } from './src/services/screenshotService.js';

console.log('📱 PRUEBA: Login directo de Instagram con credenciales específicas');

async function probarLoginDirectoInstagram() {
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    usarNavegadorReal: true,
    timeout: 15
  });

  try {
    console.log('\n🚀 INICIALIZANDO servicio...');
    
    // Inicializar normalmente primero
    await service.inicializar();
    await service.inicializarPlaywrightConRetry();
    
    console.log('\n📱 PROBANDO login directo de Instagram...');
    console.log('👤 Usuario: ypulido2004@gmail.com');
    console.log('🔑 Contraseña: ******* (nueva contraseña específica)');
    
    // Probar solo la parte de Instagram (login directo)
    await service.prepararLoginInstagramDirecto();
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`✅ Instagram autenticado: ${service.loginRealizado.instagram}`);
    
    if (service.loginRealizado.instagram) {
      console.log('\n🎉 ¡PERFECTO! Instagram autenticado con credenciales directas');
      
      // Probar una captura rápida para verificar que funciona
      console.log('\n📸 PROBANDO captura de Instagram...');
      const resultado = await service.capturarScreenshot('https://www.instagram.com/leomessi/');
      
      if (resultado.exito) {
        console.log('✅ Captura de Instagram exitosa - ¡Login funcionando!');
      } else {
        console.log('⚠️ Captura falló, pero login parece estar hecho');
      }
    } else {
      console.log('\n⚠️ Instagram no se pudo autenticar');
    }
    
    await service.cerrar();
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n💡 ESTRATEGIAS IMPLEMENTADAS:');
    console.log('1. 🎯 ÚNICA ESTRATEGIA: Login directo con credenciales específicas');
    console.log('   👤 Usuario: ypulido2004@gmail.com');
    console.log('   🔑 Contraseña: 6897861Yps@');
    console.log('2. ✅ Sin Facebook Connect - completamente independiente');
    console.log('3. ✅ Sesión persistente para futuras capturas');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await service.cerrar();
  }
}

// Ejecutar la prueba
probarLoginDirectoInstagram(); 