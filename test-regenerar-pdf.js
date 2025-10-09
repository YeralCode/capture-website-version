import { PDFGenerator } from './src/services/pdfGenerator.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 REGENERANDO PDF CON DATOS EXISTENTES\n');

// Leer los últimos archivos JSON de scraping
const scrapedDataDir = 'scraped_data';
const archivos = fs.readdirSync(scrapedDataDir)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const statA = fs.statSync(path.join(scrapedDataDir, a));
    const statB = fs.statSync(path.join(scrapedDataDir, b));
    return statB.mtime - statB.mtime;
  })
  .slice(0, 4); // Los 4 más recientes

console.log('📂 Archivos de scraping encontrados:');
archivos.forEach(f => console.log(`   - ${f}`));
console.log('');

// Preparar resultados simulados
const resultados = archivos.map(archivo => {
  const rutaCompleta = path.join(scrapedDataDir, archivo);
  const contenido = JSON.parse(fs.readFileSync(rutaCompleta, 'utf-8'));
  
  // Determinar el tipo
  let tipo = 'otro';
  let url = contenido.url || '';
  
  if (archivo.includes('instagram')) {
    tipo = 'instagram';
    url = url || `https://www.instagram.com/${contenido.username || 'unknown'}/`;
  } else if (archivo.includes('facebook')) {
    tipo = 'facebook';
    url = url || contenido.url;
  }
  
  console.log(`✅ Cargado: ${url} (${tipo})`);
  
  return {
    url: url,
    tipo: tipo,
    exito: true,
    timestamp: new Date().toISOString(),
    screenshot: {
      nombreArchivo: `screenshot-${tipo}.png`,
      tamanio: 100000,
      exito: true
    },
    datosScraping: {
      exito: true,
      datos: contenido
    }
  };
});

console.log(`\n📊 Total de resultados: ${resultados.length}\n`);
console.log('=' .repeat(60));
console.log('GENERANDO PDF...');
console.log('=' .repeat(60) + '\n');

const pdfGenerator = new PDFGenerator();
const rutaPdf = await pdfGenerator.generarPDF(resultados, 'test-regenerado.pdf');

console.log('\n' + '='.repeat(60));
console.log(`✅ PDF generado: ${rutaPdf}`);
console.log('=' .repeat(60) + '\n');

// Abrir el PDF
import { exec } from 'child_process';
exec(`xdg-open ${rutaPdf}`);

