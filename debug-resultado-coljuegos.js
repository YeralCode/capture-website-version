#!/usr/bin/env node

/**
 * DEBUG: Ver estructura del resultado para Coljuegos
 */

import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🔍 DEBUG: Estructura de resultado para Coljuegos\n'));

const service = new IntegratedScrapingService({
  screenshots: {
    width: 1920,
    height: 1080,
    timeout: 60,
    concurrencia: 1
  }
});

// Inicializar
await service.inicializar();

// Procesar UNA URL
const url = 'http://02789bet.com';
console.log(chalk.cyan(`Procesando: ${url}\n`));

const resultado = await service.procesarUrlParaScreenshot(url, false);

console.log(chalk.green('\n✅ RESULTADO COMPLETO:\n'));
console.log(JSON.stringify(resultado, null, 2));

console.log(chalk.yellow('\n🔍 CAMPOS CLAVE:\n'));
console.log(chalk.gray(`bloqueadoPorColjuegos: ${resultado.bloqueadoPorColjuegos}`));
console.log(chalk.gray(`exito: ${resultado.exito}`));
console.log(chalk.gray(`urlFinal: ${resultado.urlFinal}`));
console.log(chalk.gray(`estado: ${resultado.estado}`));

if (resultado.evaluacionContenido) {
  console.log(chalk.gray(`evaluacionContenido.tieneContenido: ${resultado.evaluacionContenido.tieneContenido}`));
  console.log(chalk.gray(`evaluacionContenido.razon: ${resultado.evaluacionContenido.razon}`));
}

// Cerrar
await service.cerrar();

console.log(chalk.blue.bold('\n✅ DEBUG COMPLETADO\n'));
process.exit(0);


