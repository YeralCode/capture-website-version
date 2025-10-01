import { promises as fs } from 'fs';
import path from 'path';
import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import { crearResultadosPrevios } from './crear-resultados-previos.js';

console.log('🔄 CONTINUANDO PROCESAMIENTO DESDE LÍNEA 77');
console.log('📊 Manteniendo las 377 capturas anteriores existentes\n');

async function continuarProcesamiento() {
  try {
    // 1. Leer archivo de URLs
    console.log('📂 Leyendo archivo de URLs...');
    const contenido = await fs.readFile('289_perfiles_redes_sociales_10_12_2024.txt', 'utf8');
    const todasLasUrls = contenido.split('\n').filter(linea => linea.trim() !== '');
    
    // 2. Calcular desde dónde continuar
    const lineaDetenida = 77; // Línea donde se detuvo (BET365)
    const urlsRestantes = todasLasUrls.slice(lineaDetenida - 1); // -1 porque los arrays empiezan en 0
    
    console.log(`📋 URLs totales en archivo: ${todasLasUrls.length}`);
    console.log(`🛑 Proceso se detuvo en línea: ${lineaDetenida}`);
    console.log(`📊 URLs ya procesadas: ${lineaDetenida - 1}`);
    console.log(`⏭️  URLs restantes por procesar: ${urlsRestantes.length}`);
    
    // 3. URL donde se detuvo
    const urlProblematica = todasLasUrls[lineaDetenida - 1];
    console.log(`🚨 URL donde se detuvo: ${urlProblematica}`);
    
    // 4. Crear resultados de capturas previas
    console.log('\n📊 Procesando capturas previas para PDF...');
    const resultadosPrevios = await crearResultadosPrevios();
    console.log(`✅ Capturas previas procesadas: ${resultadosPrevios.length}`);
    
    // 5. Verificar capturas existentes
    console.log('\n📸 Verificando capturas existentes...');
    try {
      const capturas = await fs.readdir('screenshots');
      const capturasExistentes = capturas.filter(f => f.endsWith('.png')).length;
      console.log(`✅ Capturas existentes preservadas: ${capturasExistentes}`);
    } catch (error) {
      console.log('📁 Directorio screenshots no existe, se creará automáticamente');
    }
    
    // 6. Configurar servicio integrado
    console.log('\n🔧 Configurando servicio integrado...');
    const configuracion = {
      directorioSalida: './screenshots',
      directorioSalidaPdf: './output', 
      width: 1920,
      height: 1080,
      usarNavegadorReal: true,
      timeout: 20000,
      delay: 2000,
      incluirScrapingFacebook: true,
      incluirScrapingInstagram: true,
      generarPdf: true
    };
    
    const integratedService = new IntegratedScrapingService(configuracion);
    
    // 7. Inicializar sesiones (FB e Instagram)
    console.log('\n🔐 Inicializando sesiones de autenticación...');
    await integratedService.inicializar();
    
    // 8. Crear archivo temporal para URLs restantes
    const archivoTemporal = 'urls_restantes_desde_linea77.txt';
    await fs.writeFile(archivoTemporal, urlsRestantes.join('\n'));
    console.log(`📝 Archivo temporal creado: ${archivoTemporal}`);
    
    console.log('\n🚀 INICIANDO PROCESAMIENTO CONTINUO...');
    console.log(`📊 Procesando ${urlsRestantes.length} URLs restantes`);
    console.log(`📍 Comenzando desde: ${urlProblematica}`);
    console.log('⏳ Esto puede tardar varios minutos...\n');
    
    // 9. Procesar URLs restantes
    const inicioTiempo = Date.now();
    const resultadosNuevos = await integratedService.procesarUrls(urlsRestantes);
    const tiempoTotal = Date.now() - inicioTiempo;
    
    // 10. Combinar resultados previos y nuevos
    console.log('\n🔗 Combinando resultados previos y nuevos...');
    const todosLosResultados = [...resultadosPrevios, ...resultadosNuevos];
    
    // 11. Generar PDF con todos los resultados
    console.log('\n📄 Generando PDF completo con todas las capturas...');
    const nombrePdf = `reporte-completo-con-${resultadosPrevios.length}-capturas-previas.pdf`;
    
    // Usar el PDF generator directamente
    const { PDFGenerator } = await import('./src/services/pdfGenerator.js');
    const pdfGenerator = new PDFGenerator();
    const rutaPdf = await pdfGenerator.generarPDF(todosLosResultados, nombrePdf);
    
    // 12. Estadísticas finales
    console.log('\n📊 PROCESAMIENTO COMPLETADO');
    console.log(`⏱️  Tiempo total: ${Math.round(tiempoTotal / 1000)} segundos`);
    console.log(`📸 URLs procesadas en esta sesión: ${urlsRestantes.length}`);
    console.log(`✅ Capturas exitosas nuevas: ${resultadosNuevos.filter(r => r.exito).length}`);
    console.log(`❌ Capturas fallidas nuevas: ${resultadosNuevos.filter(r => !r.exito).length}`);
    
    // 13. Verificar total de capturas final
    try {
      const capturasFinal = await fs.readdir('screenshots');
      const totalCapturasFinal = capturasFinal.filter(f => f.endsWith('.png')).length;
      console.log(`🎯 Total de capturas al final: ${totalCapturasFinal}`);
    } catch (error) {
      console.log('❌ Error verificando capturas finales');
    }
    
    // 14. Información del PDF
    console.log('\n📄 INFORMACIÓN DEL PDF GENERADO:');
    console.log(`📁 Archivo: ${rutaPdf}`);
    console.log(`📊 Total de URLs en el reporte: ${todosLosResultados.length}`);
    console.log(`📸 Capturas previas incluidas: ${resultadosPrevios.length}`);
    console.log(`📸 Capturas nuevas incluidas: ${resultadosNuevos.length}`);
    console.log('✅ El PDF contiene TODAS las capturas (anteriores + nuevas)');
    
    // 15. Limpiar archivos temporales
    await fs.unlink(archivoTemporal);
    console.log(`🗑️  Archivo temporal eliminado: ${archivoTemporal}`);
    
    // Opcional: eliminar archivo de resultados previos si no se necesita
    try {
      await fs.unlink('resultados-capturas-previos.json');
      console.log('🗑️  Archivo de resultados previos eliminado');
    } catch (error) {
      // No importa si no se puede eliminar
    }
    
    // 16. Cerrar servicios
    await integratedService.cerrar();
    
    console.log('\n🎉 PROCESO DE CONTINUACIÓN COMPLETADO EXITOSAMENTE!');
    console.log(`📋 El PDF final "${nombrePdf}" contiene todas las ${todosLosResultados.length} capturas`);
    console.log(`📊 Desglose: ${resultadosPrevios.length} previas + ${resultadosNuevos.length} nuevas`);
    
  } catch (error) {
    console.error(`❌ Error durante la continuación: ${error.message}`);
    console.error(error.stack);
    
    // Información de ayuda
    console.log('\n💡 SUGERENCIAS EN CASO DE ERROR:');
    console.log('1. Verificar que las credenciales de FB/IG sean correctas');
    console.log('2. Comprobar conexión a internet');
    console.log('3. Asegurarse de que el navegador pueda abrir');
    console.log('4. Revisar si la URL problemática es válida');
    console.log('5. Verificar que el directorio screenshots existe');
    
    process.exit(1);
  }
}

// Ejecutar el script
await continuarProcesamiento(); 