#!/usr/bin/env node

import { PDFGenerator } from './src/services/pdfGenerator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Genera múltiples PDFs por lotes para manejar grandes volúmenes
 * Más rápido y eficiente que un solo PDF gigante
 */

const CAPTURAS_POR_PDF = 500; // Ajustable

async function main() {
  console.log(chalk.blue.bold('\n📚 REGENERADOR DE PDF POR LOTES\n'));
  console.log(chalk.cyan(`Cada PDF contendrá máximo ${CAPTURAS_POR_PDF} capturas\n`));

  try {
    // 1. Leer capturas
    console.log(chalk.gray('🔍 Leyendo capturas...'));
    const dirScreenshots = 'screenshots';
    const archivos = await fs.readdir(dirScreenshots);
    const capturas = archivos.filter(f => f.endsWith('.png'));
    
    if (capturas.length === 0) {
      console.log(chalk.red('❌ No se encontraron capturas PNG'));
      return;
    }

    console.log(chalk.green(`✅ ${capturas.length} capturas encontradas`));
    
    // 2. Calcular número de lotes
    const numLotes = Math.ceil(capturas.length / CAPTURAS_POR_PDF);
    console.log(chalk.cyan(`📦 Se generarán ${numLotes} PDFs\n`));

    // 3. Procesar por lotes
    const timestamp = new Date().toISOString().slice(0, 10);
    
    for (let lote = 0; lote < numLotes; lote++) {
      const inicio = lote * CAPTURAS_POR_PDF;
      const fin = Math.min(inicio + CAPTURAS_POR_PDF, capturas.length);
      const capturasLote = capturas.slice(inicio, fin);
      
      console.log(chalk.blue(`\n📄 Lote ${lote + 1}/${numLotes}: ${capturasLote.length} capturas`));
      
      // Crear resultados para este lote
      const resultados = [];
      for (const captura of capturasLote) {
        const rutaCompleta = join(dirScreenshots, captura);
        const stats = await fs.stat(rutaCompleta);
        
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
          const nombreBase = captura.replace('.png', '').replace(/_\d{4}-\d{2}-\d{2}.*$/, '');
          url = `https://${nombreBase.replace(/_/g, '.')}`;
        }

        resultados.push({
          url,
          tipo,
          exito: true,
          screenshot: {
            exito: true,
            nombreArchivo: captura,
            rutaCompleta,
            tamanio: stats.size
          },
          datos: {
            exito: false,
            mensaje: 'Regenerado por lotes'
          }
        });
      }
      
      // Generar PDF para este lote
      const generador = new PDFGenerator();
      const nombrePDF = `reporte-lote-${lote + 1}-de-${numLotes}-${timestamp}.pdf`;
      
      console.log(chalk.gray(`  Generando ${nombrePDF}...`));
      await generador.generarPDF(resultados, nombrePDF);
      console.log(chalk.green(`  ✅ Lote ${lote + 1} completado`));
    }

    // 4. Resumen final
    console.log(chalk.green.bold('\n🎉 ¡TODOS LOS PDFS GENERADOS!\n'));
    console.log(chalk.cyan('📄 Archivos generados:'));
    console.log(chalk.gray(`   ${numLotes} PDFs en output/`));
    console.log(chalk.gray(`   Total de capturas: ${capturas.length}`));
    console.log(chalk.gray(`   Capturas por PDF: ~${CAPTURAS_POR_PDF}\n`));
    
    console.log(chalk.cyan('🔍 Ver PDFs generados:'));
    console.log(chalk.white(`   ls -lh output/reporte-lote-*-${timestamp}.pdf\n`));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

main();


