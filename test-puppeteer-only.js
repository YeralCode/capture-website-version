#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

console.log('🧪 PRUEBA RÁPIDA DE PUPPETEER');

const PUPPETEER_OPTIONS = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-namespace-sandbox',
    '--disable-features=VizDisplayCompositor'
  ],
  ignoreDefaultArgs: ['--disable-extensions'],
  ignoreHTTPSErrors: true,
  timeout: 60000
};

async function probarPuppeteer() {
  let browser = null;
  
  try {
    console.log('1. Iniciando Puppeteer...');
    browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    console.log('✅ Puppeteer iniciado exitosamente');
    
    console.log('2. Creando página...');
    const page = await browser.newPage();
    console.log('✅ Página creada');
    
    console.log('3. Navegando a Google...');
    await page.goto('https://google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Navegación exitosa');
    
    console.log('4. Tomando screenshot...');
    await fs.mkdir('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/test-google.png' });
    console.log('✅ Screenshot guardado en screenshots/test-google.png');
    
    console.log('5. Cerrando página...');
    await page.close();
    console.log('✅ Página cerrada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      console.log('6. Cerrando navegador...');
      await browser.close();
      console.log('✅ Navegador cerrado');
    }
  }
}

probarPuppeteer()
  .then(() => {
    console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 PRUEBA FALLÓ:', error.message);
    process.exit(1);
  });
