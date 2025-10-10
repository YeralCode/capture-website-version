import { promises as fs } from 'fs';
import { URL } from 'url';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Carga URLs desde un archivo de texto (OPTIMIZADO)
 * @param {string} urlsFilePath - Ruta del archivo con las URLs
 * @param {string} protocolo - Protocolo a usar ('http' o 'https', por defecto 'https')
 * @returns {Promise<string[]>} Array de URLs cargadas
 */
export async function cargarUrlsDesdeArchivo(urlsFilePath = 'urls.txt', protocolo = 'https') {
  try {
    const contenido = await fs.readFile(urlsFilePath, 'utf-8');
    
    // OPTIMIZADO: Una sola pasada con reduce
    const urls = contenido
      .split('\n')
      .reduce((acc, linea) => {
        const lineaLimpia = linea.trim();
        if (lineaLimpia.length > 0 && !lineaLimpia.startsWith('#')) {
          acc.push(formatearUrl(lineaLimpia, protocolo));
        }
        return acc;
      }, []);
    
    const protocoloInfo = protocolo === 'http' ? ' (HTTP)' : ' (HTTPS)';
    console.log(chalk.green(`✅ Cargadas ${urls.length} URLs desde ${urlsFilePath}${protocoloInfo}`));
    return urls;
  } catch (error) {
    console.error(chalk.red(`❌ Error al cargar URLs desde ${urlsFilePath}:`), error.message);
    throw error;
  }
}

/**
 * Formatea un dominio en una URL válida
 * @param {string} dominio - Dominio a formatear
 * @param {string} protocolo - Protocolo a usar ('http' o 'https', por defecto 'https')
 * @returns {string} URL formateada
 */
export function formatearUrl(dominio, protocolo = 'https') {
  // Si ya es una URL completa, la devuelve tal como está
  if (dominio.startsWith('http://') || dominio.startsWith('https://')) {
    return dominio;
  }
  
  // Si no tiene protocolo, usa el especificado
  return `${protocolo}://${dominio}`;
}

/**
 * Valida si una URL es accesible
 * @param {string} url - URL a validar
 * @returns {Promise<boolean>} True si la URL es accesible
 */
export async function validarUrl(url) {
  try {
    const urlObj = new URL(url);
    // Validación básica de formato
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Filtra URLs válidas (OPTIMIZADO - validación paralela)
 * @param {string[]} urls - Array de URLs a filtrar
 * @returns {Promise<string[]>} Array de URLs válidas
 */
export async function filtrarUrlsValidas(urls) {
  // OPTIMIZADO: Validar todas en paralelo con Promise.all
  const resultados = await Promise.all(
    urls.map(async (url) => ({
      url,
      valida: await validarUrl(url)
    }))
  );
  
  // Filtrar y mostrar advertencias
  const urlsValidas = resultados
    .filter(({ url, valida }) => {
      if (!valida) {
        console.warn(chalk.yellow(`⚠️ URL no válida ignorada: ${url}`));
      }
      return valida;
    })
    .map(({ url }) => url);
  
  return urlsValidas;
}

/**
 * Carga múltiples archivos de URLs y los combina (OPTIMIZADO - carga paralela)
 * @param {Array<string|Object>} archivosUrls - Array de rutas de archivos o { archivo: string, protocolo: string }
 * @returns {Promise<string[]>} Array de URLs combinadas
 */
export async function cargarMultiplesArchivosUrls(archivosUrls) {
  // OPTIMIZADO: Cargar todos los archivos en paralelo
  const resultados = await Promise.allSettled(
    archivosUrls.map(async (item) => {
      // Soportar tanto string como objeto { archivo, protocolo }
      const archivo = typeof item === 'string' ? item : item.archivo;
      const protocolo = typeof item === 'string' ? 'https' : (item.protocolo || 'https');
      
      const urls = await cargarUrlsDesdeArchivo(archivo, protocolo);
      console.log(chalk.green(`✅ Procesado ${archivo}: ${urls.length} URLs`));
      return { archivo, urls };
    })
  );
  
  // Consolidar URLs y manejar errores
  const todasLasUrls = resultados.reduce((acc, resultado, index) => {
    if (resultado.status === 'fulfilled') {
      acc.push(...resultado.value.urls);
    } else {
      const item = archivosUrls[index];
      const archivoError = typeof item === 'string' ? item : item.archivo;
      console.warn(chalk.yellow(`⚠️ No se pudo cargar ${archivoError}: ${resultado.reason.message}`));
    }
    return acc;
  }, []);
  
  // Eliminar duplicados con Set
  const urlsUnicas = [...new Set(todasLasUrls)];
  
  const duplicados = todasLasUrls.length - urlsUnicas.length;
  console.log(chalk.cyan(`📊 Total de URLs únicas: ${urlsUnicas.length}${duplicados > 0 ? ` (${duplicados} duplicadas eliminadas)` : ''}`));
  
  return urlsUnicas;
}
