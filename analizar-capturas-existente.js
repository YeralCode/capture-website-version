import { PDFGenerator } from './src/services/pdfGenerator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

async function analizarCapturasExistentes() {
  try {
    console.log('🔍 Analizando capturas existentes en el directorio screenshots/...');
    
    // Leer todos los archivos del directorio screenshots
    const archivos = await fs.readdir('screenshots');
    const archivosPNG = archivos.filter(archivo => archivo.endsWith('.png'));
    
    console.log(`📁 Encontrados ${archivosPNG.length} archivos PNG`);
    
    if (archivosPNG.length === 0) {
      console.log('❌ No se encontraron archivos PNG para procesar');
      return;
    }
    
    // Crear estructura de resultados basada en los archivos existentes
    const resultados = [];
    
    for (const archivo of archivosPNG) {
      try {
        const rutaCompleta = join('screenshots', archivo);
        const stats = await fs.stat(rutaCompleta);
        
        // Extraer información del nombre del archivo
        const nombreSinExtension = archivo.replace('.png', '');
        const partes = nombreSinExtension.split('_');
        
        let url = '';
        let tipo = 'otro';
        
        // Determinar tipo y URL basado en el nombre del archivo
        if (archivo.includes('instagram')) {
          tipo = 'instagram';
          // Intentar reconstruir la URL de Instagram de forma más robusta
          // Asumiendo que el nombre de archivo podría ser como instagram_usuario_2025-10-01.png
          const usuarioMatch = archivo.match(/instagram_([a-zA-Z0-9_\.]+)/);
          if (usuarioMatch && usuarioMatch[1]) {
            url = `https://www.instagram.com/${usuarioMatch[1]}`;
          } else {
            url = `https://www.instagram.com/unknown_user`;
          }
        } else if (archivo.includes('facebook')) {
          tipo = 'facebook';
          // Intentar reconstruir la URL de Facebook
          const paginaMatch = archivo.match(/facebook_([a-zA-Z0-9_\.]+)/);
          if (paginaMatch && paginaMatch[1]) {
            url = `https://www.facebook.com/${paginaMatch[1]}`;
          } else {
            url = `https://www.facebook.com/unknown_page`;
          }
        } else {
          // Para otros sitios, usar el nombre del archivo (antes de la fecha) como URL base
          const urlBaseMatch = archivo.match(/^([a-zA-Z0-9_\.-]+)_/);
          if (urlBaseMatch && urlBaseMatch[1]) {
            url = `https://${urlBaseMatch[1].replace(/_/g, '.')}`;
          } else {
            url = `https://unknown-site.com/${nombreSinExtension}`;
          }
        }
        
        const resultado = {
          url: url,
          tipo: tipo,
          screenshot: {
            exito: true,
            nombreArchivo: archivo,
            rutaCompleta: rutaCompleta,
            tamanio: stats.size
          },
          datos: {
            exito: false,
            error: 'No se extrajeron datos (análisis de archivo existente)'
          }
        };
        
        resultados.push(resultado);
        
      } catch (error) {
        console.log(`⚠️ Error procesando archivo ${archivo}:`, error.message);
      }
    }
    
    console.log(`📊 Procesados ${resultados.length} resultados`);
    
    // Crear generador de PDF mejorado
    const generador = new PDFGenerator();
    
    // Generar PDF con evaluación mejorada
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nombreArchivo = `reporte-capturas-existentes-mejorado-${timestamp}.pdf`;
    
    console.log('📄 Generando PDF con evaluación mejorada...');
    const rutaPDF = await generador.generarPDF(resultados, nombreArchivo);
    
    // Mostrar estadísticas de evaluación mejorada
    console.log('\n📈 Estadísticas de evaluación mejorada:');
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');
    
    console.log(`\n�� Instagram (${instagram.length} URLs):`);
    const instagramOK = instagram.filter(r => generador.evaluarContenidoMejorado(r) === 'OK').length;
    const instagramNo = instagram.filter(r => generador.evaluarContenidoMejorado(r) === 'No').length;
    console.log(`   ✅ Con contenido real: ${instagramOK}`);
    console.log(`   ❌ Sin contenido/No disponible: ${instagramNo}`);
    console.log(`   📊 Porcentaje de contenido real: ${instagram.length > 0 ? ((instagramOK/instagram.length)*100).toFixed(1) : '0.0'}%`);
    
    console.log(`\n📘 Facebook (${facebook.length} URLs):`);
    const facebookOK = facebook.filter(r => generador.evaluarContenidoMejorado(r) === 'OK').length;
    const facebookNo = facebook.filter(r => generador.evaluarContenidoMejorado(r) === 'No').length;
    console.log(`   ✅ Con contenido real: ${facebookOK}`);
    console.log(`   ❌ Sin contenido/No disponible: ${facebookNo}`);
    console.log(`   📊 Porcentaje de contenido real: ${facebook.length > 0 ? ((facebookOK/facebook.length)*100).toFixed(1) : '0.0'}%`);
    
    console.log(`\n🌐 Otros sitios (${otros.length} URLs):`);
    const otrosOK = otros.filter(r => generador.evaluarContenidoMejorado(r) === 'OK').length;
    const otrosNo = otros.filter(r => generador.evaluarContenidoMejorado(r) === 'No').length;
    console.log(`   ✅ Con contenido real: ${otrosOK}`);
    console.log(`   ❌ Sin contenido/No disponible: ${otrosNo}`);
    console.log(`   📊 Porcentaje de contenido real: ${otros.length > 0 ? ((otrosOK/otros.length)*100).toFixed(1) : '0.0'}%`);
    
    const totalOK = resultados.filter(r => generador.evaluarContenidoMejorado(r) === 'OK').length;
    const totalNo = resultados.filter(r => generador.evaluarContenidoMejorado(r) === 'No').length;
    const porcentajeTotal = resultados.length > 0 ? ((totalOK/resultados.length)*100).toFixed(1) : '0.0';
    
    console.log(`\n🎯 RESUMEN TOTAL:`);
    console.log(`   📊 Total procesado: ${resultados.length} URLs`);
    console.log(`   ✅ Con contenido real: ${totalOK} (${porcentajeTotal}%)`);
    console.log(`   ❌ Sin contenido/No disponible: ${totalNo} (${(100-porcentajeTotal).toFixed(1)}%)`);
    
    console.log(`\n✅ PDF mejorado generado exitosamente: ${rutaPDF}`);
    console.log('🎉 La evaluación de Instagram ahora es mucho más precisa!');
    
    // Mostrar algunos ejemplos de evaluación
    console.log('\n🔍 Ejemplos de evaluación:');
    const ejemplosInstagram = instagram.slice(0, 5);
    ejemplosInstagram.forEach((resultado, index) => {
      const evaluacion = generador.evaluarContenidoMejorado(resultado);
      console.log(`   ${index + 1}. ${resultado.url} -> ${evaluacion} (${resultado.screenshot.tamanio} bytes)`);
    });
    
  } catch (error) {
    console.error('❌ Error al analizar capturas existentes:', error.message);
    console.error(error.stack);
  }
}

analizarCapturasExistentes();
