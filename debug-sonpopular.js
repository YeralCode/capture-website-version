#!/usr/bin/env node

import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';

const url = 'https://www.facebook.com/sonpopularipiales/videos/423654431994416';

async function debugUrl() {
  console.log(chalk.cyan('\n🔍 DEBUG DE URL ESPECÍFICA\n'));
  console.log(chalk.yellow(`URL: ${url}`));
  console.log(chalk.yellow(`Esperado: BLOQUEADO`));
  console.log(chalk.cyan('━'.repeat(80)));
  
  const servicio = new IntegratedScrapingService();
  
  try {
    await servicio.inicializar();
    
    console.log(chalk.cyan('\n📸 PROCESANDO...\n'));
    
    const resultado = await servicio.procesarUrlParaScreenshot(url);
    
    console.log(chalk.cyan('\n📊 RESULTADO DETALLADO:\n'));
    console.log(chalk.white(`Screenshot exitoso: ${resultado.screenshot?.exito}`));
    console.log(chalk.white(`Página bloqueada (flag): ${resultado.screenshot?.paginaBloqueada}`));
    console.log(chalk.white(`Razón bloqueo: ${resultado.screenshot?.razonBloqueo}`));
    console.log(chalk.white(`URL original: ${resultado.screenshot?.url}`));
    console.log(chalk.white(`URL final: ${resultado.screenshot?.urlFinal}`));
    console.log(chalk.white(`Error: ${resultado.screenshot?.error}`));
    console.log(chalk.white(`\nEvaluación - tieneContenido: ${resultado.evaluacionContenido?.tieneContenido}`));
    console.log(chalk.white(`Evaluación - razón: ${resultado.evaluacionContenido?.razon}`));
    console.log(chalk.white(`Evaluación - detalles: ${resultado.evaluacionContenido?.detalles}`));
    
    const estado = resultado.evaluacionContenido.tieneContenido ? 'NO BLOQUEADO' : 'BLOQUEADO';
    const correcto = estado === 'BLOQUEADO';
    
    console.log(chalk[correcto ? 'green' : 'red'](
      `\n${correcto ? '✅' : '❌'} Estado detectado: ${estado} (esperado: BLOQUEADO)`
    ));
    
  } catch (error) {
    console.log(chalk.red(`\n❌ ERROR: ${error.message}`));
    console.log(chalk.red(`Stack: ${error.stack}`));
  } finally {
    await servicio.cerrar();
  }
  
  console.log(chalk.cyan('\n━'.repeat(80)));
}

debugUrl().catch(console.error);





