import { promises as fs } from 'fs';
import path from 'path';
import { crearResultadosPrevios } from './crear-resultados-previos.js';

console.log('🔄 CONTINUACIÓN ROBUSTA DESDE LÍNEA 77');
console.log('🛡️  Con manejo mejorado de errores de navegador\n');

async function continuarProcesamientoRobusto() {
  try {
    // 1. Leer archivo de URLs
    console.log('📂 Leyendo archivo de URLs...');
    const contenido = await fs.readFile('289_perfiles_redes_sociales_10_12_2024.txt', 'utf8');
    const todasLasUrls = contenido.split('\n').filter(linea => linea.trim() !== '');
    
    // 2. Calcular desde dónde continuar
    const lineaDetenida = 77;
    const urlsRestantes = todasLasUrls.slice(lineaDetenida - 1);
    
    console.log(`📋 URLs totales: ${todasLasUrls.length}`);
    console.log(`🛑 Línea detenida: ${lineaDetenida}`);
    console.log(`⏭️  URLs restantes: ${urlsRestantes.length}`);
    
    // 3. Procesar capturas previas para PDF
    console.log('\n📊 Procesando capturas previas...');
    const resultadosPrevios = await crearResultadosPrevios();
    console.log(`✅ Capturas previas: ${resultadosPrevios.length}`);
    
    // 4. Usar el modo simple (sin procesamiento paralelo) para ser más estable
    console.log('\n🔧 Configurando modo simple y estable...');
    
    // Importar solo el servicio de screenshots (más estable)
    const { ScreenshotService } = await import('./src/services/screenshotService.js');
    
    const configuracion = {
      directorioSalida: './screenshots',
      width: 1920,
      height: 1080,
      usarNavegadorReal: true,
      timeout: 30000, // Timeout más largo
      delay: 3000,    // Delay más largo para estabilidad
    };
    
    const screenshotService = new ScreenshotService(configuracion);
    
    // 5. Inicializar solo el navegador (sin logins complejos)
    console.log('\n🚀 Inicializando navegador en modo estable...');
    await screenshotService.inicializarPlaywright();
    
    // 6. Procesar URLs una por una de forma secuencial (más estable)
    console.log('\n📸 Procesando URLs de forma secuencial...');
    const resultadosNuevos = [];
    let exitosas = 0;
    let fallidas = 0;
    
    for (let i = 0; i < urlsRestantes.length; i++) {
      const url = urlsRestantes[i];
      const progreso = i + 1;
      
      console.log(`\n[${progreso}/${urlsRestantes.length}] Procesando: ${url}`);
      
      try {
        // Capturar con reintentos
        let resultado = null;
        let intentos = 0;
        const maxIntentos = 3;
        
        while (!resultado && intentos < maxIntentos) {
          intentos++;
          try {
            console.log(`  📸 Intento ${intentos}/${maxIntentos}...`);
            resultado = await screenshotService.capturarScreenshot(url);
            
            if (resultado.exito) {
              console.log(`  ✅ Exitoso en intento ${intentos}`);
              exitosas++;
            } else {
              console.log(`  ⚠️  Fallo controlado: ${resultado.error}`);
              fallidas++;
            }
            
          } catch (error) {
            console.log(`  ❌ Error en intento ${intentos}: ${error.message}`);
            
            if (intentos < maxIntentos) {
              console.log(`  🔄 Reintentando en 5 segundos...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Reinicializar navegador si es necesario
              try {
                await screenshotService.cerrar();
                await screenshotService.inicializarPlaywright();
                console.log(`  🔄 Navegador reinicializado`);
              } catch (reinitError) {
                console.log(`  ⚠️  Error reinicializando: ${reinitError.message}`);
              }
            }
          }
        }
        
        // Si no se pudo capturar después de todos los intentos
        if (!resultado) {
          resultado = {
            url,
            exito: false,
            error: 'Fallo después de todos los intentos',
            screenshot: null,
            timestamp: Date.now()
          };
          fallidas++;
        }
        
        resultadosNuevos.push(resultado);
        
        // Mostrar progreso cada 10 URLs
        if (progreso % 10 === 0 || progreso === urlsRestantes.length) {
          console.log(`📊 Progreso: ${progreso}/${urlsRestantes.length} | ✅ ${exitosas} | ❌ ${fallidas}`);
        }
        
        // Pausa entre URLs para estabilidad
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Error irrecuperable en URL ${url}: ${error.message}`);
        resultadosNuevos.push({
          url,
          exito: false,
          error: error.message,
          screenshot: null,
          timestamp: Date.now()
        });
        fallidas++;
      }
    }
    
    // 7. Cerrar navegador
    console.log('\n🔚 Cerrando navegador...');
    try {
      await screenshotService.cerrar();
    } catch (error) {
      console.log('⚠️  Error cerrando navegador (no crítico)');
    }
    
    // 8. Combinar resultados
    console.log('\n🔗 Combinando resultados...');
    const todosLosResultados = [...resultadosPrevios, ...resultadosNuevos];
    
    // 9. Generar PDF
    console.log('\n📄 Generando PDF final...');
    const { PDFGenerator } = await import('./src/services/pdfGenerator.js');
    const pdfGenerator = new PDFGenerator();
    const nombrePdf = `reporte-completo-${todosLosResultados.length}-capturas.pdf`;
    const rutaPdf = await pdfGenerator.generarPDF(todosLosResultados, nombrePdf);
    
    // 10. Estadísticas finales
    console.log('\n🎉 PROCESAMIENTO COMPLETADO!');
    console.log(`📊 ESTADÍSTICAS FINALES:`);
    console.log(`  📸 URLs nuevas procesadas: ${urlsRestantes.length}`);
    console.log(`  ✅ Capturas exitosas: ${exitosas}`);
    console.log(`  ❌ Capturas fallidas: ${fallidas}`);
    console.log(`  📄 PDF generado: ${rutaPdf}`);
    console.log(`  📊 Total en PDF: ${todosLosResultados.length} capturas`);
    console.log(`     └── Previas: ${resultadosPrevios.length}`);
    console.log(`     └── Nuevas: ${resultadosNuevos.length}`);
    
    // Verificar capturas finales
    try {
      const capturasFinal = await fs.readdir('screenshots');
      const totalCapturas = capturasFinal.filter(f => f.endsWith('.png')).length;
      console.log(`🎯 Total de archivos de captura: ${totalCapturas}`);
    } catch (error) {
      console.log('⚠️  No se pudo verificar capturas finales');
    }
    
    console.log('\n✅ El PDF incluye todas las capturas anteriores + las nuevas');
    
  } catch (error) {
    console.error(`\n❌ ERROR CRÍTICO: ${error.message}`);
    console.error(error.stack);
    
    console.log('\n💡 SUGERENCIAS:');
    console.log('1. Ejecutar: sudo apt update && sudo apt install -y chromium-browser');
    console.log('2. Verificar memoria disponible: free -h');
    console.log('3. Cerrar otros navegadores y aplicaciones pesadas');
    console.log('4. Reintentar el proceso');
    
    process.exit(1);
  }
}

// Ejecutar el script
await continuarProcesamientoRobusto(); 