#!/usr/bin/env node

import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';

const urlsFallidas = [
  { url: 'https://m.facebook.com/BINGO-Tucano-102796294764843', esperado: 'BLOQUEADO' },
  { url: 'https://www.facebook.com/profile.php?id=61559199419997', esperado: 'NO BLOQUEADO' },
  { url: 'https://www.instagram.com/ashly.0507/', esperado: 'NO BLOQUEADO' }
];

async function debugUrlsFallidas() {
  console.log(chalk.cyan('\n🔍 DEBUG DE URLs FALLIDAS\n'));
  console.log(chalk.cyan('━'.repeat(80)));
  
  const servicio = new IntegratedScrapingService();
  
  try {
    await servicio.inicializar();
    
    for (const { url, esperado } of urlsFallidas) {
      console.log(chalk.yellow(`\n\n📍 PROCESANDO: ${url}`));
      console.log(chalk.yellow(`   Esperado: ${esperado}`));
      console.log(chalk.yellow('─'.repeat(80)));
      
      try {
        const resultado = await servicio.procesarUrlParaScreenshot(url);
        
        console.log(chalk.cyan('\n📊 RESULTADO COMPLETO:'));
        console.log(chalk.white(`   URL: ${resultado.url}`));
        console.log(chalk.white(`   Tipo: ${resultado.tipo}`));
        console.log(chalk.white(`   Screenshot exitoso: ${resultado.screenshot?.exito}`));
        console.log(chalk.white(`   Página bloqueada (flag): ${resultado.screenshot?.paginaBloqueada}`));
        console.log(chalk.white(`   Razón bloqueo: ${resultado.screenshot?.razonBloqueo}`));
        console.log(chalk.white(`   URL final: ${resultado.screenshot?.urlFinal}`));
        console.log(chalk.white(`   Error screenshot: ${resultado.screenshot?.error}`));
        console.log(chalk.white(`   Tipo error: ${resultado.screenshot?.tipoError}`));
        console.log(chalk.white(`   Evaluación - tieneContenido: ${resultado.evaluacionContenido?.tieneContenido}`));
        console.log(chalk.white(`   Evaluación - razón: ${resultado.evaluacionContenido?.razon}`));
        console.log(chalk.white(`   Evaluación - detalles: ${resultado.evaluacionContenido?.detalles}`));
        
        const estado = resultado.evaluacionContenido.tieneContenido ? 'NO BLOQUEADO' : 'BLOQUEADO';
        const correcto = estado === esperado;
        
        console.log(chalk[correcto ? 'green' : 'red'](
          `\n   ${correcto ? '✅' : '❌'} Estado: ${estado} (esperado: ${esperado})`
        ));
        
      } catch (error) {
        console.log(chalk.red(`\n❌ ERROR: ${error.message}`));
        console.log(chalk.red(`   Stack: ${error.stack}`));
      }
      
      console.log(chalk.yellow('\n' + '─'.repeat(80)));
      
      // Esperar 3 segundos entre URLs para evitar problemas
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } finally {
    await servicio.cerrar();
  }
  
  console.log(chalk.cyan('\n━'.repeat(80)));
  console.log(chalk.cyan('✅ DEBUG COMPLETADO\n'));
}

debugUrlsFallidas().catch(console.error);





