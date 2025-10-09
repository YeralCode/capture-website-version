#!/usr/bin/env node

import { PDFGenerator } from './src/services/pdfGenerator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * VERSIÓN SUPER SIMPLE: Solo toma las capturas que ya existen
 * y genera el PDF. No necesita archivos de URLs ni scraping.
 * 
 * USO:
 * node regenerar-pdf-simple.js
 * 
 * PERFECTO PARA: Regenerar PDF cuando ya tienes capturas tomadas
 */

async function main() {
  console.log(chalk.blue.bold('\n📄 REGENERADOR SIMPLE DE PDF\n'));
  console.log(chalk.cyan('Este script solo procesa capturas existentes en screenshots/\n'));

  try {
    // 1. Leer capturas existentes
    console.log(chalk.gray('🔍 Buscando capturas...'));
    
    const dirScreenshots = 'screenshots';
    const archivos = await fs.readdir(dirScreenshots);
    const capturas = archivos.filter(f => f.endsWith('.png'));
    
    if (capturas.length === 0) {
      console.log(chalk.red('❌ No se encontraron capturas PNG en screenshots/'));
      console.log(chalk.yellow('💡 Primero debes tomar capturas antes de generar el PDF'));
      return;
    }

    console.log(chalk.green(`✅ Encontradas ${capturas.length} capturas\n`));

    // 2. Crear estructura de resultados
    console.log(chalk.gray('📊 Procesando capturas...'));
    
    const resultados = [];
    let procesadas = 0;

    for (const captura of capturas) {
      try {
        const rutaCompleta = join(dirScreenshots, captura);
        const stats = await fs.stat(rutaCompleta);
        
        // Inferir información básica del nombre del archivo
        let url = 'URL_desconocida';
        let tipo = 'otro';
        
        if (captura.includes('instagram')) {
          tipo = 'instagram';
          const match = captura.match(/instagram[_-]([a-zA-Z0-9_\.]+)/i);
          url = match ? `https://www.instagram.com/${match[1]}` : 'https://www.instagram.com/perfil';
        } else if (captura.includes('facebook')) {
          tipo = 'facebook';
          const match = captura.match(/facebook[_-]([a-zA-Z0-9_\.\-]+)/i);
          url = match ? `https://www.facebook.com/${match[1]}` : 'https://www.facebook.com/pagina';
        } else {
          // Extraer dominio del nombre del archivo
          const nombreBase = captura.replace('.png', '').replace(/_\d{4}-\d{2}-\d{2}.*$/, '');
          url = `https://${nombreBase.replace(/_/g, '.')}`;
        }

        resultados.push({
          url,
          tipo,
          exito: true,
          timestamp: new Date().toISOString(),
          screenshot: {
            exito: true,
            nombreArchivo: captura,
            rutaCompleta,
            tamanio: stats.size
          },
          datos: {
            exito: false,
            mensaje: 'PDF regenerado desde capturas existentes'
          }
        });

        procesadas++;
        
        // Mostrar progreso cada 50 capturas
        if (procesadas % 50 === 0) {
          process.stdout.write(chalk.gray(`.${procesadas}`));
        }

      } catch (error) {
        console.log(chalk.yellow(`\n⚠️ Error con ${captura}: ${error.message}`));
      }
    }

    console.log(chalk.green(`\n✅ ${procesadas} capturas procesadas\n`));

    // 3. Generar PDF
    console.log(chalk.gray('📄 Generando PDF...'));
    
    const generador = new PDFGenerator();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nombrePDF = `reporte-simple-${timestamp}.pdf`;
    
    const rutaPDF = await generador.generarPDF(resultados, nombrePDF);
    
    // 4. Mostrar resumen
    console.log(chalk.green.bold('\n🎉 ¡PDF GENERADO EXITOSAMENTE!\n'));
    console.log(chalk.cyan('📄 Archivo:'));
    console.log(chalk.white(`   ${rutaPDF}\n`));
    
    console.log(chalk.cyan('📊 Contenido:'));
    console.log(chalk.gray(`   Total de capturas: ${resultados.length}`));
    
    const instagram = resultados.filter(r => r.tipo === 'instagram').length;
    const facebook = resultados.filter(r => r.tipo === 'facebook').length;
    const otros = resultados.filter(r => r.tipo === 'otro').length;
    
    console.log(chalk.gray(`   Instagram: ${instagram}`));
    console.log(chalk.gray(`   Facebook: ${facebook}`));
    console.log(chalk.gray(`   Otros: ${otros}\n`));
    
    console.log(chalk.green('✨ ¡Listo! Abre el PDF para ver los resultados\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

main();


