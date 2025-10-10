import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';

const urls = [
  'https://instagram.com/pokergold.co',
  'https://m.facebook.com/BINGO-Tucano-102796294764843',
  'https://www.facebook.com/Bingoparatodos',
  'https://www.instagram.com/onexbet_org'
];

const service = new IntegratedScrapingService();

console.log(chalk.blue('\n🧪 TEST: RESULTADOS FINALES DE DETECCIÓN\n'));

await service.screenshotService.inicializarConInstagram();

const resultados = await service.procesarUrls(urls);

console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.yellow('TABLA DE RESULTADOS:'));
console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

resultados.forEach((r, i) => {
  const bloqueado = !r.evaluacionContenido?.tieneContenido || r.bloqueadoPorColjuegos;
  const estado = bloqueado ? chalk.red('BLOQUEADO') : chalk.green('NO BLOQUEADO');
  
  console.log(`${i + 1}. ${r.url}`);
  console.log(`   Tipo: ${r.tipo.toUpperCase()}`);
  console.log(`   Estado: ${estado}`);
  console.log(`   Razón: ${r.evaluacionContenido?.razon || 'N/A'}`);
  console.log(`   Detalles: ${r.evaluacionContenido?.detalles || 'N/A'}`);
  console.log('');
});

console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.yellow('\nRESULTADOS ESPERADOS:'));
console.log(chalk.red('  1. pokergold.co → BLOQUEADO'));
console.log(chalk.red('  2. BINGO-Tucano → BLOQUEADO'));
console.log(chalk.green('  3. Bingoparatodos → NO BLOQUEADO'));
console.log(chalk.green('  4. onexbet_org → NO BLOQUEADO'));
console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

await service.cerrar();



