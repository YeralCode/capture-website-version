#!/usr/bin/env node

/**
 * DEBUG: Verificar redirección de una sola URL
 */

import { chromium } from 'playwright';
import chalk from 'chalk';

const url = 'http://02789bet.com';

console.log(chalk.blue.bold('\n🔍 DEBUG: Verificando redirección para una URL\n'));
console.log(chalk.cyan(`URL de prueba: ${url}\n`));

const browser = await chromium.launch({ 
  headless: false,  // Navegador visible para debugging
  args: ['--start-maximized']
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});

const page = await context.newPage();

try {
  console.log(chalk.yellow('⏳ Navegando a la URL...\n'));
  
  await page.goto(url, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Esperar un poco para que cargue
  await page.waitForTimeout(5000);
  
  // Obtener URL final
  const urlFinal = page.url();
  
  console.log(chalk.green('✅ Navegación completada\n'));
  console.log(chalk.cyan('📊 RESULTADOS:\n'));
  console.log(chalk.gray(`  URL Original: ${url}`));
  console.log(chalk.gray(`  URL Final:    ${urlFinal}\n`));
  
  // Verificar si es Coljuegos
  if (urlFinal.includes('coljuegos.gov.co')) {
    console.log(chalk.red('🚫 BLOQUEADO POR COLJUEGOS ✅'));
    console.log(chalk.yellow('   La URL redirigió a la página de advertencia de Coljuegos\n'));
  } else if (urlFinal === url) {
    console.log(chalk.green('✅ NO REDIRIGIÓ'));
    console.log(chalk.yellow('   La URL no fue redirigida, el sitio es accesible\n'));
  } else {
    console.log(chalk.blue('🔄 REDIRIGIÓ A OTRO SITIO'));
    console.log(chalk.yellow(`   La URL redirigió pero NO a Coljuegos\n`));
  }
  
  // Obtener título de la página
  const titulo = await page.title();
  console.log(chalk.cyan(`📄 Título de la página: ${titulo}\n`));
  
  // Verificar contenido
  const contenido = await page.content();
  if (contenido.includes('Coljuegos') || contenido.includes('apuestas ilegales')) {
    console.log(chalk.red('⚠️ CONTENIDO DE COLJUEGOS DETECTADO'));
    console.log(chalk.gray('   La página contiene referencias a Coljuegos o apuestas ilegales\n'));
  }
  
  console.log(chalk.magenta('⏸️  El navegador se mantendrá abierto por 10 segundos para inspección visual...\n'));
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.log(chalk.red('\n❌ ERROR:\n'));
  console.error(error.message);
}

await browser.close();

console.log(chalk.blue.bold('\n✅ DEBUG COMPLETADO\n'));
process.exit(0);


