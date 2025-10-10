#!/usr/bin/env node

/**
 * TEST: Verificar que el PDF muestre correctamente "Bloqueado: SÍ (Coljuegos)"
 */

import { PDFGenerator } from './src/services/pdfGenerator.js';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🧪 TEST: Verificación de PDF con Coljuegos\n'));

// Simular resultado bloqueado por Coljuegos (como viene del servicio)
const resultadoBloqueado = {
  url: 'http://02789bet.com',
  urlFinal: 'https://www.coljuegos.gov.co/publicaciones/301824',
  tipo: 'otro',
  exito: false,
  bloqueadoPorColjuegos: true,
  screenshot: {
    exito: true,
    nombreArchivo: '02789bet-com_2025-10-09_09-42-48.png',
    rutaCompleta: 'screenshots/02789bet-com_2025-10-09_09-42-48.png',
    tamanio: 334085
  },
  evaluacionContenido: {
    tieneContenido: false,
    razon: 'Bloqueado por Coljuegos (Colombia)',
    detalles: 'Sitio de apuestas ilegal redirigido a https://www.coljuegos.gov.co/publicaciones/301824'
  },
  estado: 'BLOQUEADO_COLJUEGOS'
};

// Crear generador de PDF
const pdfGen = new PDFGenerator();

// Evaluar contenido
console.log(chalk.cyan('📊 Evaluando contenido del resultado:\n'));

const tieneContenidoReal = pdfGen.evaluarContenidoExigente(resultadoBloqueado);
console.log(chalk.gray(`evaluarContenidoExigente(): "${tieneContenidoReal}"`));

const estaBloqueado = tieneContenidoReal === 'OK' ? 'NO' : 'SÍ';
console.log(chalk.gray(`estaBloqueado: "${estaBloqueado}"`));

const textoBloqueado = resultadoBloqueado.bloqueadoPorColjuegos 
  ? `${estaBloqueado} (Coljuegos)` 
  : estaBloqueado;
console.log(chalk.gray(`textoBloqueado final: "${textoBloqueado}"\n`));

// Verificar resultado
if (estaBloqueado === 'SÍ' && textoBloqueado.includes('Coljuegos')) {
  console.log(chalk.green('✅ TEST EXITOSO: El PDF mostrará "Bloqueado: SÍ (Coljuegos)"'));
  console.log(chalk.green('✅ La detección de Coljuegos funciona correctamente\n'));
  process.exit(0);
} else {
  console.log(chalk.red('❌ TEST FALLIDO: El PDF NO mostrará correctamente el bloqueo'));
  console.log(chalk.red(`   Se mostrará: "Bloqueado: ${textoBloqueado}"\n`));
  process.exit(1);
}


