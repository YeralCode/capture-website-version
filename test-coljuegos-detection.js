#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA - DETECCIÓN DE BLOQUEO POR COLJUEGOS
 * 
 * Este script prueba que las URLs del archivo 289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt
 * sean correctamente detectadas como bloqueadas cuando son redirigidas a Coljuegos.
 * 
 * URLS DE PRUEBA (con HTTP):
 * - http://02789bet.com
 * - http://050p.bet
 * - http://057317.win
 * - http://064452.win
 * 
 * RESULTADO ESPERADO:
 * Todas deben aparecer como "Bloqueado: SÍ (Coljuegos)" en el PDF
 */

import chalk from 'chalk';
import { IntegratedScrapingAutomation } from './src/index_integrated.js';

console.log(chalk.blue.bold('\n🧪 TEST: DETECCIÓN DE BLOQUEO POR COLJUEGOS\n'));
console.log(chalk.cyan('📋 Archivo de prueba: 289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt'));
console.log(chalk.cyan('🌐 Protocolo: HTTP (sitios de apuestas)'));
console.log(chalk.cyan('🎯 Objetivo: Verificar detección de redirección a Coljuegos\n'));

console.log(chalk.yellow('📝 URLs ESPERADAS (con HTTP):'));
console.log(chalk.gray('  1. http://02789bet.com'));
console.log(chalk.gray('  2. http://050p.bet'));
console.log(chalk.gray('  3. http://057317.win'));
console.log(chalk.gray('  4. http://064452.win\n'));

console.log(chalk.yellow('✅ RESULTADO ESPERADO:'));
console.log(chalk.gray('  • Todas redirigidas a: https://www.coljuegos.gov.co/publicaciones/301824'));
console.log(chalk.gray('  • Todas marcadas como: "Bloqueado: SÍ (Coljuegos)"'));
console.log(chalk.gray('  • PDF muestra URL original + URL de redirección\n'));

console.log(chalk.magenta('⏳ Iniciando prueba en 3 segundos...\n'));

// Esperar 3 segundos para que el usuario lea
await new Promise(resolve => setTimeout(resolve, 3000));

console.log(chalk.green('🚀 EJECUTANDO PRUEBA...\n'));
console.log(chalk.blue('═'.repeat(80)));
console.log('\n');

try {
  // Crear instancia de automatización
  const automation = new IntegratedScrapingAutomation();
  
  // Inicializar servicios
  await automation.inicializar();
  
  // Ejecutar el procesamiento
  await automation.ejecutar();
  
  console.log('\n');
  console.log(chalk.blue('═'.repeat(80)));
  console.log(chalk.green.bold('\n✅ PRUEBA COMPLETADA\n'));
  
  console.log(chalk.cyan('📊 VERIFICACIÓN:'));
  console.log(chalk.yellow('  1. Revisa el PDF generado'));
  console.log(chalk.yellow('  2. Verifica que cada URL muestre:'));
  console.log(chalk.gray('     • URL original: http://02789bet.com (por ejemplo)'));
  console.log(chalk.gray('     • Redirigido a: https://www.coljuegos.gov.co/... (en rojo)'));
  console.log(chalk.gray('     • Bloqueado: SÍ (Coljuegos)'));
  console.log(chalk.yellow('  3. Verifica los screenshots:'));
  console.log(chalk.gray('     • Deben mostrar la página de advertencia de Coljuegos\n'));
  
  console.log(chalk.magenta('📄 Busca el archivo PDF en la carpeta output/\n'));
  
  process.exit(0);
  
} catch (error) {
  console.log('\n');
  console.log(chalk.blue('═'.repeat(80)));
  console.log(chalk.red.bold('\n❌ ERROR EN LA PRUEBA\n'));
  console.error(chalk.red('Error:'), error.message);
  
  if (error.stack) {
    console.log(chalk.gray('\nStack trace:'));
    console.log(chalk.gray(error.stack));
  }
  
  process.exit(1);
}


