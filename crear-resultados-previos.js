import { promises as fs } from 'fs';
import path from 'path';

console.log('📊 CREANDO RESULTADOS DE CAPTURAS PREVIAS PARA PDF');

/**
 * Extrae información de una captura basándose en su nombre de archivo
 */
function extraerInfoDeCaptura(nombreArchivo) {
  try {
    // Ejemplo: instagram-com_2025-09-26_09-17-44.png
    // Ejemplo: facebook-com_2025-09-26_09-30-09.png
    
    const sinExtension = nombreArchivo.replace('.png', '');
    const partes = sinExtension.split('_');
    
    if (partes.length >= 3) {
      const dominio = partes[0].replace(/-/g, '.');
      const fecha = partes[1];
      const hora = partes[2].replace(/-/g, ':');
      
      // Determinar tipo basado en dominio
      let tipo = 'Normal';
      if (dominio.includes('instagram')) {
        tipo = 'Instagram';
      } else if (dominio.includes('facebook')) {
        tipo = 'Facebook';
      } else if (dominio.includes('tiktok')) {
        tipo = 'TikTok';
      } else if (dominio.includes('youtube')) {
        tipo = 'YouTube';
      } else if (dominio.includes('telegram')) {
        tipo = 'Telegram';
      } else if (dominio.includes('whatsapp')) {
        tipo = 'WhatsApp';
      }
      
      return {
        dominio,
        fecha,
        hora,
        tipo,
        timestamp: new Date(`${fecha} ${hora}`).getTime()
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Crea resultado simulado para capturas previas
 */
function crearResultadoSimulado(nombreArchivo, url, info) {
  const rutaScreenshot = path.join('screenshots', nombreArchivo);
  
  return {
    url: url || `https://${info.dominio}`,
    tipo: info.tipo,
    exito: true,
    screenshot: rutaScreenshot,
    timestamp: info.timestamp,
    tiempo: 5000, // Tiempo simulado
    error: null,
    datosExtraidos: null, // No tenemos datos de scraping de capturas previas
    fechaCaptura: `${info.fecha} ${info.hora}`,
    tamaño: {
      width: 1920,
      height: 1080
    }
  };
}

async function crearResultadosPrevios() {
  try {
    console.log('📂 Leyendo capturas existentes...');
    
    // 1. Leer capturas del directorio
    const capturas = await fs.readdir('screenshots');
    const capturasPng = capturas.filter(f => f.endsWith('.png')).sort();
    
    console.log(`📸 Capturas encontradas: ${capturasPng.length}`);
    
    // 2. Leer URLs originales para mapear
    const contenido = await fs.readFile('289_perfiles_redes_sociales_10_12_2024.txt', 'utf8');
    const urls = contenido.split('\n').filter(linea => linea.trim() !== '');
    
    console.log(`📋 URLs en archivo: ${urls.length}`);
    
    // 3. Crear resultados simulados para capturas previas
    const resultadosPrevios = [];
    let urlIndex = 0;
    
    for (const captura of capturasPng) {
      const info = extraerInfoDeCaptura(captura);
      
      if (info) {
        // Usar URL correspondiente del archivo o generar una basada en el dominio
        const url = urlIndex < urls.length ? urls[urlIndex] : `https://${info.dominio}`;
        
        const resultado = crearResultadoSimulado(captura, url, info);
        resultadosPrevios.push(resultado);
        
        urlIndex++;
      } else {
        console.log(`⚠️  No se pudo procesar: ${captura}`);
      }
    }
    
    console.log(`✅ Resultados generados: ${resultadosPrevios.length}`);
    
    // 4. Guardar resultados en archivo JSON
    const archivoResultados = 'resultados-capturas-previas.json';
    await fs.writeFile(archivoResultados, JSON.stringify(resultadosPrevios, null, 2));
    
    console.log(`💾 Resultados guardados en: ${archivoResultados}`);
    
    // 5. Estadísticas por tipo
    console.log('\n📊 ESTADÍSTICAS DE CAPTURAS PREVIAS:');
    const estadisticas = {};
    
    resultadosPrevios.forEach(resultado => {
      estadisticas[resultado.tipo] = (estadisticas[resultado.tipo] || 0) + 1;
    });
    
    Object.entries(estadisticas).forEach(([tipo, cantidad]) => {
      console.log(`   ${tipo}: ${cantidad} capturas`);
    });
    
    // 6. Rango de fechas
    const fechas = resultadosPrevios.map(r => r.timestamp).filter(t => t && !isNaN(t));
    if (fechas.length > 0) {
      const fechaMin = new Date(Math.min(...fechas));
      const fechaMax = new Date(Math.max(...fechas));
      
      console.log(`\n📅 PERÍODO DE CAPTURAS:`);
      console.log(`   Desde: ${fechaMin.toLocaleString('es-ES')}`);
      console.log(`   Hasta: ${fechaMax.toLocaleString('es-ES')}`);
    }
    
    return resultadosPrevios;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  await crearResultadosPrevios();
}

export { crearResultadosPrevios }; 