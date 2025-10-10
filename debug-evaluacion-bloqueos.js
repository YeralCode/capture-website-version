import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';

const urls = [
  'https://instagram.com/pokergold.co',
  'https://m.facebook.com/BINGO-Tucano-102796294764843',
  'https://www.facebook.com/Bingoparatodos',
  'https://www.instagram.com/onexbet_org'
];

const service = new IntegratedScrapingService();

console.log(chalk.blue('\n🔍 DEBUG: EVALUACIÓN DE BLOQUEOS\n'));

// Inicializar
await service.screenshotService.inicializarConInstagram();

// Procesar cada URL y mostrar debug
for (const url of urls) {
  console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.yellow(`📍 URL: ${url}`));
  console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
  
  const resultado = await service.procesarUrlParaScreenshot(url, false);
  
  console.log(chalk.magenta('\n📊 RESULTADO COMPLETO:'));
  console.log(JSON.stringify({
    url: resultado.url,
    tipo: resultado.tipo,
    exito: resultado.exito,
    bloqueadoPorColjuegos: resultado.bloqueadoPorColjuegos,
    evaluacionContenido: resultado.evaluacionContenido,
    datos: {
      exito: resultado.datos?.exito,
      error: resultado.datos?.error,
      datos: {
        usuario_existe: resultado.datos?.datos?.usuario_existe,
        pagina_existe: resultado.datos?.datos?.pagina_existe,
        requiere_login: resultado.datos?.datos?.requiere_login,
        es_contenido_especifico: resultado.datos?.datos?.es_contenido_especifico
      }
    },
    screenshot: {
      exito: resultado.screenshot?.exito
    }
  }, null, 2));
  
  // EVALUACIÓN
  const tieneContenido = resultado.evaluacionContenido?.tieneContenido;
  const bloqueado = !tieneContenido || resultado.bloqueadoPorColjuegos;
  
  console.log(chalk.white('\n📈 EVALUACIÓN:'));
  console.log(chalk.gray(`  • tieneContenido: ${tieneContenido}`));
  console.log(chalk.gray(`  • Razón: ${resultado.evaluacionContenido?.razon || 'N/A'}`));
  console.log(chalk.gray(`  • Detalles: ${resultado.evaluacionContenido?.detalles || 'N/A'}`));
  
  if (bloqueado) {
    console.log(chalk.red(`  ❌ BLOQUEADO`));
  } else {
    console.log(chalk.green(`  ✅ NO BLOQUEADO`));
  }
}

await service.cerrar();

console.log(chalk.blue('\n✅ DEBUG COMPLETADO\n'));



