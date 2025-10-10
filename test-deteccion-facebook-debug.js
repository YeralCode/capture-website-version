#!/usr/bin/env node

/**
 * Script de prueba para depurar detección de bloqueos en Facebook
 */

import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';

const urls = [
  'https://web.facebook.com/profile.php?id=61563445625314',  // Debe ser NO bloqueado
  'https://www.facebook.com/bingopingolive'                   // Debe ser SI bloqueado
];

async function probarDeteccion() {
  console.log('\n🧪 PRUEBA DE DETECCIÓN DE BLOQUEOS EN FACEBOOK\n');
  console.log('URL 1: https://web.facebook.com/profile.php?id=61563445625314 → Esperado: NO bloqueado');
  console.log('URL 2: https://www.facebook.com/bingopingolive → Esperado: SI bloqueado');
  console.log('\n' + '='.repeat(80) + '\n');
  
  const servicio = new IntegratedScrapingService({
    screenshots: {
      width: 1920,
      height: 1080,
      timeout: 60,
      concurrencia: 1
    }
  });
  
  try {
    // Inicializar con autenticación
    await servicio.inicializar();
    
    // Procesar URLs una por una
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`PROCESANDO URL ${i + 1}: ${url}`);
      console.log('='.repeat(80) + '\n');
      
      const resultado = await servicio.procesarUrlParaScreenshot(url);
      
      console.log('\n📊 RESULTADO:');
      console.log(`   URL: ${resultado.url}`);
      console.log(`   Tipo: ${resultado.tipo.toUpperCase()}`);
      console.log(`   Estado: ${resultado.estado}`);
      console.log(`   Éxito: ${resultado.exito ? 'SÍ' : 'NO'}`);
      console.log(`   Bloqueado: ${resultado.screenshot.paginaBloqueada ? 'SÍ' : 'NO'}`);
      if (resultado.screenshot.razonBloqueo) {
        console.log(`   Razón: ${resultado.screenshot.razonBloqueo}`);
      }
      console.log(`   Archivo: ${resultado.screenshot.nombreArchivo}`);
      
      console.log('\n');
    }
    
    console.log('\n✅ Prueba completada\n');
    
  } catch (error) {
    console.error(`\n❌ Error en prueba: ${error.message}\n`);
    console.error(error.stack);
  } finally {
    await servicio.cerrar();
    process.exit(0);
  }
}

probarDeteccion();


