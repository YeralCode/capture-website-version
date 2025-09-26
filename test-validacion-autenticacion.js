import { ScreenshotService } from './src/services/screenshotService.js';
import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';

console.log('🔐 PRUEBA: Validación de autenticación requerida');

async function probarValidacionAutenticacion() {
  try {
    console.log('\n🧪 CASO 1: URLs mixtas CON autenticación correcta');
    await probarCasoExitoso();
    
    console.log('\n🧪 CASO 2: URLs de Facebook/Instagram SIN autenticación');
    await probarCasoFallido();
    
    console.log('\n🧪 CASO 3: Solo URLs normales (sin Facebook/Instagram)');
    await probarCasoSinAutenticacion();
    
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
  }
}

async function probarCasoExitoso() {
  console.log('\n📋 URLs con Facebook e Instagram + Autenticación correcta');
  
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    usarNavegadorReal: false, // Más rápido para prueba
    timeout: 10
  });
  
  const integratedService = new IntegratedScrapingService();
  integratedService.screenshotService = service;
  
  try {
    // Simular autenticación exitosa
    service.loginRealizado = {
      facebook: true,
      instagram: true
    };
    
    const urlsPrueba = [
      'https://www.facebook.com/cristiano',
      'https://www.instagram.com/leomessi/',
      'https://www.google.com'
    ];
    
    console.log('🔐 Estado de autenticación simulado:');
    console.log(`  ✅ Facebook: ${service.loginRealizado.facebook}`);
    console.log(`  ✅ Instagram: ${service.loginRealizado.instagram}`);
    
    // Esto debería pasar sin errores
    const urlsInstagram = urlsPrueba.filter(url => url.includes('instagram.com'));
    const urlsFacebook = urlsPrueba.filter(url => url.includes('facebook.com'));
    
    await integratedService.validarAutenticacionRequerida(urlsFacebook, urlsInstagram);
    
    console.log('✅ CASO 1 EXITOSO: Validación pasó correctamente');
    
  } catch (error) {
    console.log(`❌ CASO 1 FALLÓ: ${error.message}`);
  }
}

async function probarCasoFallido() {
  console.log('\n📋 URLs con Facebook e Instagram + SIN autenticación');
  
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    timeout: 10
  });
  
  const integratedService = new IntegratedScrapingService();
  integratedService.screenshotService = service;
  
  try {
    // Simular autenticación fallida
    service.loginRealizado = {
      facebook: false,
      instagram: false
    };
    
    const urlsPrueba = [
      'https://www.facebook.com/cristiano',
      'https://www.instagram.com/leomessi/'
    ];
    
    console.log('🔐 Estado de autenticación simulado:');
    console.log(`  ❌ Facebook: ${service.loginRealizado.facebook}`);
    console.log(`  ❌ Instagram: ${service.loginRealizado.instagram}`);
    
    const urlsInstagram = urlsPrueba.filter(url => url.includes('instagram.com'));
    const urlsFacebook = urlsPrueba.filter(url => url.includes('facebook.com'));
    
    // Esto debería lanzar error y parar la ejecución
    await integratedService.validarAutenticacionRequerida(urlsFacebook, urlsInstagram);
    
    console.log('❌ CASO 2 FALLÓ: Debería haber lanzado error');
    
  } catch (error) {
    console.log('✅ CASO 2 EXITOSO: Error esperado capturado correctamente');
    console.log(`📄 Mensaje: ${error.message}`);
  }
}

async function probarCasoSinAutenticacion() {
  console.log('\n📋 Solo URLs normales (sin Facebook/Instagram)');
  
  const service = new ScreenshotService({
    directorioSalida: './screenshots',
    timeout: 10
  });
  
  const integratedService = new IntegratedScrapingService();
  integratedService.screenshotService = service;
  
  try {
    // No importa el estado de autenticación
    service.loginRealizado = {
      facebook: false,
      instagram: false
    };
    
    const urlsPrueba = [
      'https://www.google.com',
      'https://github.com',
      'https://stackoverflow.com'
    ];
    
    console.log('🌐 Solo URLs normales, autenticación no requerida');
    
    const urlsInstagram = urlsPrueba.filter(url => url.includes('instagram.com'));
    const urlsFacebook = urlsPrueba.filter(url => url.includes('facebook.com'));
    
    // Esto debería pasar sin problemas
    await integratedService.validarAutenticacionRequerida(urlsFacebook, urlsInstagram);
    
    console.log('✅ CASO 3 EXITOSO: URLs normales procesadas sin requerir autenticación');
    
  } catch (error) {
    console.log(`❌ CASO 3 FALLÓ: ${error.message}`);
  }
}

console.log('\n📋 RESUMEN DE LA PRUEBA:');
console.log('1. ✅ URLs con FB/IG + Autenticación correcta → Continúa');
console.log('2. ❌ URLs con FB/IG + Sin autenticación → Para ejecución');
console.log('3. ✅ Solo URLs normales → Continúa (sin validar FB/IG)');

// Ejecutar la prueba
probarValidacionAutenticacion(); 