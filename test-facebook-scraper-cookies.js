#!/usr/bin/env node

import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const urls = [
  'https://www.facebook.com/bingosocialsas',
  'https://www.facebook.com/elmundodejuancho'
];

async function testFacebookScraper() {
  console.log('🧪 PRUEBA DE SCRAPER DE FACEBOOK CON COOKIES\n');
  
  for (const url of urls) {
    console.log(`\n📘 Probando: ${url}`);
    console.log('─'.repeat(60));
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const pageName = pathParts[0];
      
      // Leer cookies de Playwright
      const cookiesPath = join(process.cwd(), 'sesiones/facebook_cookies.json');
      let cookiesData = null;
      
      if (existsSync(cookiesPath)) {
        const cookiesContent = readFileSync(cookiesPath, 'utf8');
        cookiesData = JSON.parse(cookiesContent);
        console.log(`✅ Cookies de Playwright encontradas: ${cookiesData.length} cookies`);
      } else {
        console.log(`⚠️ No se encontraron cookies en ${cookiesPath}`);
      }
      
      const params = JSON.stringify({
        pageName: pageName,
        directorio: 'scraped_data',
        maxPosts: 3,
        cookies: cookiesData
      });
      
      const scriptPath = join(process.cwd(), 'src/scripts/python/facebook_page_scraper_simple.py');
      const venvPython = join(process.cwd(), 'venv_scraping/bin/python');
      const comando = `${venvPython} "${scriptPath}" '${params}'`;
      
      console.log('\n🔄 Ejecutando scraper...\n');
      const resultado = execSync(comando, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000
      });
      
      // Extraer solo la última línea JSON
      const lineas = resultado.trim().split('\n');
      const ultimaLinea = lineas[lineas.length - 1];
      const datos = JSON.parse(ultimaLinea);
      
      console.log('\n📊 RESULTADO:');
      console.log(`  ✅ Éxito: ${datos.exito}`);
      console.log(`  📄 Página existe: ${datos.datos?.pagina_existe}`);
      console.log(`  🔒 Requiere login: ${datos.datos?.requiere_login}`);
      console.log(`  🔐 Login exitoso: ${datos.datos?.login_exitoso}`);
      
      if (datos.datos?.posts_recientes) {
        console.log(`  📝 Posts encontrados: ${datos.datos.posts_recientes.length}`);
      }
      
      if (datos.datos?.titulo) {
        console.log(`  📌 Título: ${datos.datos.titulo}`);
      }
      
      // EVALUACIÓN
      console.log('\n🎯 EVALUACIÓN:');
      if (datos.datos?.requiere_login) {
        console.log('  ✅ Estado: PRIVADO (requiere login pero EXISTE)');
      } else if (datos.datos?.pagina_existe === false) {
        console.log('  ❌ Estado: BLOQUEADO (no existe)');
      } else if (datos.exito) {
        console.log('  ✅ Estado: PÚBLICO (contenido accesible)');
      } else {
        console.log('  ⚠️ Estado: DESCONOCIDO');
      }
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ PRUEBA COMPLETADA');
}

testFacebookScraper();

