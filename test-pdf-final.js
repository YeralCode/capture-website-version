import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import PDFGenerator from './src/services/pdfGenerator.js';

const urls = [
  'https://www.facebook.com/Bingoparatodos',
  'https://www.instagram.com/rifaregionaldelcaribe_oficial/'
];

console.log('🧪 PRUEBA FINAL - GENERACIÓN DE PDF CON EVALUACIÓN CORRECTA\n');

async function test() {
  const service = new IntegratedScrapingService();
  const pdfGenerator = new PDFGenerator();
  
  const resultados = [];
  
  for (const url of urls) {
    console.log(`📊 Procesando: ${url}`);
    const resultado = await service.procesarUrlParaScreenshot(url);
    
    console.log(`   - Scraping exitoso: ${resultado.datos?.exito}`);
    console.log(`   - Screenshot: ${resultado.screenshot?.nombreArchivo}`);
    
    resultados.push({
      url: resultado.url,
      tipo: resultado.tipo,
      exito: resultado.exito,
      screenshot: resultado.screenshot,
      datosScraping: resultado.datos  // ✅ IMPORTANTE: datosScraping, no datosExtraidos
    });
  }
  
  console.log('\n📄 Generando PDF...\n');
  
  const rutaPdf = await pdfGenerator.generarPDF(resultados, 'test-pdf-final.pdf');
  
  console.log(`\n✅ PDF generado: ${rutaPdf}\n`);
  
  // Verificar contenido del PDF
  console.log('🔍 Verificando tabla de resultados...\n');
  for (let i = 0; i < resultados.length; i++) {
    const r = resultados[i];
    console.log(`${i + 1}. ${r.url}`);
    console.log(`   Tipo: ${r.tipo}`);
    console.log(`   Datos scraping: ${r.datosScraping ? 'SÍ' : 'NO'}`);
    console.log(`   Exito scraping: ${r.datosScraping?.exito}`);
    console.log('');
  }
}

test().catch(console.error);


