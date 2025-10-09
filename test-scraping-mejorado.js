#!/usr/bin/env node

import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import { PDFGenerator } from './src/services/pdfGenerator.js';
import chalk from 'chalk';

console.log(chalk.blue('🚀 PRUEBA DE SCRAPING MEJORADO CON COOKIES\n'));

async function probarScrapingMejorado() {
  try {
    // URLs de prueba
    const urlsPrueba = [
      'https://www.facebook.com/1xbet.esports',
      'https://www.instagram.com/rifaregionaldelcaribe_oficial/',
      'https://vavadap.casino',
      'https://vavada-q0.casino',
      'https://oz2win.com'
    ];

    console.log(chalk.cyan(`📋 URLs de prueba: ${urlsPrueba.length}`));
    urlsPrueba.forEach((url, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${url}`));
    });

    // Inicializar servicio
    const servicio = new IntegratedScrapingService();
    await servicio.inicializar();

    // Procesar URLs
    console.log(chalk.blue('\n🔄 Procesando URLs...\n'));
    const resultados = await servicio.procesarUrls(urlsPrueba);

    // Mostrar resultados
    console.log(chalk.green('\n📊 RESULTADOS DEL PROCESAMIENTO:\n'));
    
    resultados.forEach((resultado, i) => {
      console.log(chalk.cyan(`\n--- RESULTADO ${i + 1} ---`));
      console.log(chalk.white(`URL: ${resultado.url}`));
      console.log(chalk.white(`Tipo: ${resultado.tipo}`));
      console.log(chalk.white(`Éxito: ${resultado.exito ? '✅' : '❌'}`));
      
      if (resultado.screenshot) {
        console.log(chalk.white(`Screenshot: ${resultado.screenshot.exito ? '✅' : '❌'}`));
        if (resultado.screenshot.exito) {
          console.log(chalk.gray(`  Archivo: ${resultado.screenshot.nombreArchivo}`));
          console.log(chalk.gray(`  Tamaño: ${resultado.screenshot.tamanio} bytes`));
        }
      }
      
      if (resultado.datos) {
        console.log(chalk.white(`Datos scraping: ${resultado.datos.exito ? '✅' : '❌'}`));
        if (resultado.datos.exito) {
          console.log(chalk.gray(`  Datos: ${JSON.stringify(resultado.datos, null, 2)}`));
        }
      }
      
      if (resultado.evaluacionContenido) {
        console.log(chalk.white(`Evaluación contenido:`));
        console.log(chalk.gray(`  Tiene contenido: ${resultado.evaluacionContenido.tieneContenido ? '✅' : '❌'}`));
        console.log(chalk.gray(`  Razón: ${resultado.evaluacionContenido.razon}`));
        console.log(chalk.gray(`  Detalles: ${resultado.evaluacionContenido.detalles}`));
      }
    });

    // Generar PDF de prueba
    console.log(chalk.blue('\n📄 Generando PDF de prueba...\n'));
    
    const pdfGenerator = new PDFGenerator();
    const datosParaPDF = resultados.map(resultado => ({
      url: resultado.url,
      tipo: resultado.tipo,
      exito: resultado.exito,
      timestamp: resultado.timestamp,
      screenshot: resultado.screenshot,
      datosScraping: resultado.datos,
      evaluacionContenido: resultado.evaluacionContenido,
      resumen: {
        url: resultado.url,
        tipo: resultado.tipo,
        exito: resultado.exito,
        screenshot: resultado.screenshot ? {
          archivo: resultado.screenshot.nombreArchivo,
          tamanio: resultado.screenshot.tamanio
        } : null,
        evaluacionContenido: resultado.evaluacionContenido
      }
    }));

    const nombreArchivo = `test-scraping-mejorado-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    await pdfGenerator.generarPDF(datosParaPDF, nombreArchivo);

    console.log(chalk.green(`\n✅ PDF generado: ${nombreArchivo}`));

    // Cerrar servicio
    await servicio.cerrar();

  } catch (error) {
    console.error(chalk.red(`❌ Error en la prueba: ${error.message}`));
    console.error(error.stack);
  }
}

// Ejecutar prueba
probarScrapingMejorado();





