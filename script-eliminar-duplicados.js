import { promises as fs } from 'fs';
import { URL } from 'url';

console.log('🔧 SCRIPT: Eliminación inteligente de URLs duplicadas');

/**
 * Normaliza una URL para detectar duplicados de manera más inteligente
 */
function normalizarUrlParaDuplicados(url) {
  try {
    // Limpiar URL
    url = url.trim();
    
    // Remover prefijos no válidos
    if (url.startsWith('URL ')) {
      url = url.substring(4);
    }
    
    // Manejar URLs con comillas
    if (url.startsWith('"') && url.endsWith('"')) {
      url = url.slice(1, -1);
    }
    
    // Si no tiene protocolo, agregar https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Crear objeto URL para normalización
    const urlObj = new URL(url);
    
    // Normalizar dominio (quitar www. y convertir a minúsculas)
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Para Instagram y Facebook, normalizar el path
    let pathname = urlObj.pathname;
    
    // Quitar parámetros específicos que no afectan el contenido
    const parametrosIgnorar = ['igshid', 'igsh', 'utm_source', 'utm_medium', 'utm_campaign', 'mibextid', 'ref', 'rdid', '_rdc', '_rdr', 'locale', 'hl'];
    
    // Limpiar parámetros
    const params = new URLSearchParams(urlObj.search);
    parametrosIgnorar.forEach(param => params.delete(param));
    
    // Construir URL normalizada
    let urlNormalizada = `https://${hostname}${pathname}`;
    
    // Agregar parámetros importantes (que sí afectan el contenido)
    const paramsImportantes = params.toString();
    if (paramsImportantes) {
      urlNormalizada += `?${paramsImportantes}`;
    }
    
    return urlNormalizada;
    
  } catch (error) {
    // Si no se puede parsear, devolver URL limpia original
    return url.trim();
  }
}

/**
 * Detecta si una URL es válida
 */
function esUrlValida(url) {
  // URLs vacías o solo espacios
  if (!url || url.trim() === '') {
    return false;
  }
  
  // URLs malformadas obvias
  if (url.includes('..') || url.includes('facebook.comBingo') || url.includes('.comRuleta')) {
    return false;
  }
  
  // URLs con formato extraño
  if (url.startsWith('"') && !url.endsWith('"')) {
    return false;
  }
  
  return true;
}

/**
 * Agrupa URLs similares para mostrar qué se está eliminando
 */
function agruparUrlsSimilares(urls, urlNormalizada) {
  return urls.filter(url => normalizarUrlParaDuplicados(url) === urlNormalizada);
}

async function eliminarDuplicados() {
  try {
    console.log('\n📂 Leyendo archivo de URLs...');
    
    // Leer archivo
    const contenido = await fs.readFile('289_perfiles_redes_sociales_10_12_2024.txt', 'utf8');
    const urlsOriginales = contenido.split('\n').filter(linea => linea.trim() !== '');
    
    console.log(`📊 URLs originales: ${urlsOriginales.length}`);
    
    // 1. Filtrar URLs inválidas
    console.log('\n🧹 Paso 1: Eliminando URLs inválidas...');
    const urlsValidas = urlsOriginales.filter(url => {
      const valida = esUrlValida(url);
      if (!valida) {
        console.log(`❌ URL inválida eliminada: ${url.substring(0, 80)}...`);
      }
      return valida;
    });
    
    console.log(`✅ URLs válidas: ${urlsValidas.length} (eliminadas ${urlsOriginales.length - urlsValidas.length} inválidas)`);
    
    // 2. Detectar y eliminar duplicados
    console.log('\n🔍 Paso 2: Detectando duplicados...');
    
    const urlsUnicas = [];
    const urlsNormalizadasVistas = new Set();
    const gruposDuplicados = new Map();
    
    for (const url of urlsValidas) {
      const urlNormalizada = normalizarUrlParaDuplicados(url);
      
      if (!urlsNormalizadasVistas.has(urlNormalizada)) {
        // Primera vez que vemos esta URL normalizada
        urlsUnicas.push(url);
        urlsNormalizadasVistas.add(urlNormalizada);
        gruposDuplicados.set(urlNormalizada, [url]);
      } else {
        // Es un duplicado
        gruposDuplicados.get(urlNormalizada).push(url);
      }
    }
    
    // 3. Mostrar duplicados encontrados
    console.log('\n📋 DUPLICADOS ENCONTRADOS:');
    let totalDuplicados = 0;
    
    for (const [urlNormalizada, grupo] of gruposDuplicados) {
      if (grupo.length > 1) {
        totalDuplicados += grupo.length - 1; // -1 porque mantenemos uno
        console.log(`\n🔗 Grupo duplicado (${grupo.length} URLs):`);
        console.log(`   📌 URL normalizada: ${urlNormalizada}`);
        console.log(`   📝 Variantes encontradas:`);
        grupo.forEach((url, i) => {
          const simbolo = i === 0 ? '✅' : '❌';
          const accion = i === 0 ? '(MANTENER)' : '(ELIMINAR)';
          console.log(`      ${simbolo} ${url} ${accion}`);
        });
      }
    }
    
    console.log(`\n📊 RESUMEN DE ELIMINACIÓN:`);
    console.log(`   📋 URLs originales: ${urlsOriginales.length}`);
    console.log(`   ❌ URLs inválidas eliminadas: ${urlsOriginales.length - urlsValidas.length}`);
    console.log(`   🔄 URLs duplicadas eliminadas: ${totalDuplicados}`);
    console.log(`   ✅ URLs únicas finales: ${urlsUnicas.length}`);
    console.log(`   🎯 Reducción total: ${urlsOriginales.length - urlsUnicas.length} URLs (${((urlsOriginales.length - urlsUnicas.length) / urlsOriginales.length * 100).toFixed(1)}%)`);
    
    // 4. Generar archivo limpio
    console.log('\n💾 Generando archivo limpio...');
    
    const archivoLimpio = '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt';
    await fs.writeFile(archivoLimpio, urlsUnicas.join('\n') + '\n');
    
    console.log(`✅ Archivo limpio generado: ${archivoLimpio}`);
    
    // 5. Análisis por dominio
    console.log('\n📊 ANÁLISIS POR DOMINIO:');
    const dominios = new Map();
    
    for (const url of urlsUnicas) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        let hostname = urlObj.hostname.toLowerCase();
        if (hostname.startsWith('www.')) {
          hostname = hostname.substring(4);
        }
        
        dominios.set(hostname, (dominios.get(hostname) || 0) + 1);
      } catch (error) {
        dominios.set('urls-invalidas', (dominios.get('urls-invalidas') || 0) + 1);
      }
    }
    
    // Ordenar dominios por cantidad
    const dominiosOrdenados = Array.from(dominios.entries()).sort((a, b) => b[1] - a[1]);
    
    console.log('   🏆 Top dominios:');
    dominiosOrdenados.slice(0, 10).forEach(([dominio, cantidad]) => {
      console.log(`      ${dominio}: ${cantidad} URLs`);
    });
    
    // 6. Crear archivo de respaldo del original
    const archivoRespaldo = '289_perfiles_redes_sociales_10_12_2024_ORIGINAL_BACKUP.txt';
    await fs.copyFile('289_perfiles_redes_sociales_10_12_2024.txt', archivoRespaldo);
    console.log(`\n💾 Respaldo creado: ${archivoRespaldo}`);
    
    // 7. Reemplazar archivo original
    await fs.writeFile('289_perfiles_redes_sociales_10_12_2024.txt', urlsUnicas.join('\n') + '\n');
    console.log(`✅ Archivo original actualizado con URLs limpias`);
    
    console.log('\n🎉 PROCESO COMPLETADO CON ÉXITO!');
    console.log(`📈 Optimización del ${((urlsOriginales.length - urlsUnicas.length) / urlsOriginales.length * 100).toFixed(1)}% - El procesamiento será mucho más rápido`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Ejecutar el script
await eliminarDuplicados(); 