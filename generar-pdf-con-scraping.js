const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

function generarPDFConScraping(archivoResultados) {
    try {
        console.log(`📄 Generando PDF con datos de scraping desde: ${archivoResultados}`);
        
        // Leer resultados del scraping
        const datosScraping = JSON.parse(fs.readFileSync(archivoResultados, 'utf8'));
        const resultados = datosScraping.resultados_detallados;
        const estadisticas = datosScraping.estadisticas;
        
        // Crear PDF
        const doc = new jsPDF();
        let yPosition = 20;
        
        // Título principal
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('ANÁLISIS DE CAPTURAS CON SCRAPING', 20, yPosition);
        yPosition += 15;
        
        // Fecha de análisis
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const fechaAnalisis = new Date(datosScraping.fecha_analisis).toLocaleString('es-ES');
        doc.text(`Fecha de análisis: ${fechaAnalisis}`, 20, yPosition);
        yPosition += 20;
        
        // Resumen ejecutivo
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN EJECUTIVO', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        const totalProcesado = datosScraping.total_archivos;
        const totalConContenido = estadisticas.instagram.con_contenido + 
                                 estadisticas.facebook.con_contenido + 
                                 estadisticas.otros.con_contenido;
        const totalSinContenido = estadisticas.instagram.sin_contenido + 
                                 estadisticas.facebook.sin_contenido + 
                                 estadisticas.otros.sin_contenido;
        
        doc.text(`• Total de capturas analizadas: ${totalProcesado}`, 20, yPosition);
        yPosition += 8;
        doc.text(`• Capturas con contenido real: ${totalConContenido} (${((totalConContenido/totalProcesado)*100).toFixed(1)}%)`, 20, yPosition);
        yPosition += 8;
        doc.text(`• Capturas sin contenido/Error: ${totalSinContenido} (${((totalSinContenido/totalProcesado)*100).toFixed(1)}%)`, 20, yPosition);
        yPosition += 15;
        
        // Estadísticas por plataforma
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTADÍSTICAS POR PLATAFORMA', 20, yPosition);
        yPosition += 10;
        
        // Instagram
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('📱 Instagram:', 20, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`  • Total de URLs: ${estadisticas.instagram.total}`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Con contenido real: ${estadisticas.instagram.con_contenido} (${estadisticas.instagram.porcentaje_contenido.toFixed(1)}%)`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Sin contenido/Error: ${estadisticas.instagram.sin_contenido} (${(100-estadisticas.instagram.porcentaje_contenido).toFixed(1)}%)`, 25, yPosition);
        yPosition += 10;
        
        // Facebook
        doc.setFont('helvetica', 'bold');
        doc.text('📘 Facebook:', 20, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`  • Total de URLs: ${estadisticas.facebook.total}`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Con contenido real: ${estadisticas.facebook.con_contenido} (${estadisticas.facebook.porcentaje_contenido.toFixed(1)}%)`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Sin contenido/Error: ${estadisticas.facebook.sin_contenido} (${(100-estadisticas.facebook.porcentaje_contenido).toFixed(1)}%)`, 25, yPosition);
        yPosition += 10;
        
        // Otros sitios
        doc.setFont('helvetica', 'bold');
        doc.text('🌐 Otros sitios:', 20, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`  • Total de URLs: ${estadisticas.otros.total}`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Con contenido real: ${estadisticas.otros.con_contenido}`, 25, yPosition);
        yPosition += 6;
        doc.text(`  • Sin contenido/Error: ${estadisticas.otros.sin_contenido}`, 25, yPosition);
        yPosition += 20;
        
        // Tabla de resultados detallados
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RESULTADOS DETALLADOS', 20, yPosition);
        yPosition += 10;
        
        // Encabezados de tabla
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Archivo', 20, yPosition);
        doc.text('URL', 60, yPosition);
        doc.text('Tipo', 140, yPosition);
        doc.text('Estado', 160, yPosition);
        doc.text('Tamaño', 190, yPosition);
        yPosition += 5;
        
        // Línea separadora
        doc.line(20, yPosition, 200, yPosition);
        yPosition += 5;
        
        // Filas de datos (limitadas para evitar PDF muy largo)
        doc.setFont('helvetica', 'normal');
        const maxFilas = 50; // Limitar a 50 filas para evitar PDF muy largo
        const resultadosMostrar = resultados.slice(0, maxFilas);
        
        for (const resultado of resultadosMostrar) {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Archivo (truncado)
            const archivoTruncado = resultado.archivo.length > 30 ? 
                resultado.archivo.substring(0, 27) + '...' : resultado.archivo;
            doc.text(archivoTruncado, 20, yPosition);
            
            // URL (truncada)
            const urlTruncada = resultado.url.length > 40 ? 
                resultado.url.substring(0, 37) + '...' : resultado.url;
            doc.text(urlTruncada, 60, yPosition);
            
            // Tipo
            doc.text(resultado.tipo, 140, yPosition);
            
            // Estado
            const estado = resultado.tiene_contenido ? '✅ Sí' : '❌ No';
            doc.text(estado, 160, yPosition);
            
            // Tamaño
            const tamanioKB = (resultado.tamanio_bytes / 1024).toFixed(1);
            doc.text(`${tamanioKB}KB`, 190, yPosition);
            
            yPosition += 6;
        }
        
        // Nota sobre limitación
        if (resultados.length > maxFilas) {
            yPosition += 10;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Nota: Se muestran solo las primeras ${maxFilas} filas de ${resultados.length} resultados totales.`, 20, yPosition);
        }
        
        // Pie de página
        yPosition = 280;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Generado por Sistema de Análisis de Capturas con Scraping', 20, yPosition);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, 180, yPosition);
        
        // Guardar PDF
        const nombreArchivo = `reporte-scraping-analisis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
        const rutaCompleta = path.join('output', nombreArchivo);
        
        // Crear directorio output si no existe
        if (!fs.existsSync('output')) {
            fs.mkdirSync('output');
        }
        
        doc.save(rutaCompleta);
        
        console.log(`✅ PDF generado exitosamente: ${rutaCompleta}`);
        console.log(`📊 Total de resultados procesados: ${resultados.length}`);
        
        return rutaCompleta;
        
    } catch (error) {
        console.error(`❌ Error generando PDF: ${error.message}`);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const archivoResultados = process.argv[2];
    if (!archivoResultados) {
        console.error('❌ Uso: node generar-pdf-con-scraping.js <archivo_resultados.json>');
        process.exit(1);
    }
    
    if (!fs.existsSync(archivoResultados)) {
        console.error(`❌ Archivo no encontrado: ${archivoResultados}`);
        process.exit(1);
    }
    
    try {
        const rutaPDF = generarPDFConScraping(archivoResultados);
        console.log(`🎉 PDF generado exitosamente: ${rutaPDF}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { generarPDFConScraping };
