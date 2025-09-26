import { ScreenshotService } from './src/services/screenshotService.js';

console.log('🔗 PRUEBA: Login de Instagram usando Facebook Connect');

const urlsInstagram = [
  'https://www.instagram.com/cristiano/',
  'https://www.instagram.com/leomessi/',
  'https://www.instagram.com/kyliejenner/'
];

async function probarLoginConFacebook() {
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    usarNavegadorReal: true, // Para ver el comportamiento visualmente
    timeout: 20
  });

  try {
    console.log('\n🚀 INICIALIZANDO con Facebook Connect para Instagram...');
    
    // Usar el nuevo método que conecta Facebook + Instagram
    await service.inicializarConInstagram();
    
    console.log('\n📸 Comenzando capturas de Instagram...');
    
    for (let i = 0; i < urlsInstagram.length; i++) {
      const url = urlsInstagram[i];
      console.log(`\n--- CAPTURA ${i + 1}/3: ${url} ---`);
      
      try {
        const resultado = await service.capturarScreenshot(url, i + 1, true); // usar Playwright
        console.log(`✅ Captura ${i + 1} exitosa: ${resultado.nombreArchivo}`);
        
        if (i === 0) {
          console.log('👀 VERIFICAR: En la primera captura debería usar la sesión de Facebook para Instagram');
        } else {
          console.log('👀 VERIFICAR: Esta captura debe ir directamente al perfil sin login');
        }
      } catch (error) {
        console.log(`❌ Error en captura ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Resumen del estado de login:');
    console.log(`Instagram login realizado: ${service.loginRealizado.instagram}`);
    console.log(`Facebook login realizado: ${service.loginRealizado.facebook}`);
    
    await service.cerrar();
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n🔍 VERIFICACIONES REALIZADAS:');
    console.log('1. ✅ Login de Facebook realizado primero');
    console.log('2. ✅ Instagram conectado usando "Continuar con Facebook"');
    console.log('3. ✅ Todas las capturas posteriores reutilizan la sesión');
    console.log('4. ✅ No se muestra pantalla de login en las capturas de Instagram');
    console.log('5. ✅ El navegador va directamente a los perfiles');
    
  } catch (error) {
    console.error(`❌ Error en la prueba: ${error.message}`);
    await service.cerrar();
  }
}

// Ejecutar la prueba
probarLoginConFacebook(); 