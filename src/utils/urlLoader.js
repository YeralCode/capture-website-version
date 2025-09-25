import { promises as fs } from 'fs';
import { URL } from 'url';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Carga URLs desde un archivo de texto
 * @param {string} urlsFilePath - Ruta del archivo con las URLs
 * @returns {Promise<string[]>} Array de URLs cargadas
 */
export async function cargarUrlsDesdeArchivo(urlsFilePath = 'urls.txt') {
  try {
    const contenido = await fs.readFile(urlsFilePath, 'utf-8');
    const urls = contenido
      .split('\n')
      .map(linea => linea.trim())
      .filter(linea => linea.length > 0 && !linea.startsWith('#'))
      .map(dominio => formatearUrl(dominio));
    
    console.log(chalk.green(`✅ Cargadas ${urls.length} URLs desde ${urlsFilePath}`));
    return urls;
  } catch (error) {
    console.error(chalk.red(`❌ Error al cargar URLs desde ${urlsFilePath}:`), error.message);
    throw error;
  }
}

/**
 * Formatea un dominio en una URL válida (siempre HTTPS)
 * @param {string} dominio - Dominio a formatear
 * @returns {string} URL formateada con HTTPS
 */
export function formatearUrl(dominio) {
  // Si ya es una URL completa, la devuelve tal como está
  if (dominio.startsWith('http://') || dominio.startsWith('https://')) {
    return dominio;
  }
  
  // Si no tiene protocolo, asume HTTPS por defecto
  return `https://${dominio}`;
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
 * Filtra URLs válidas
 * @param {string[]} urls - Array de URLs a filtrar
 * @returns {Promise<string[]>} Array de URLs válidas
 */
export async function filtrarUrlsValidas(urls) {
  const urlsValidas = [];
  
  for (const url of urls) {
    if (await validarUrl(url)) {
      urlsValidas.push(url);
    } else {
      console.warn(chalk.yellow(`⚠️ URL no válida ignorada: ${url}`));
    }
  }
  
  return urlsValidas;
}

/**
 * Carga múltiples archivos de URLs y los combina
 * @param {string[]} archivosUrls - Array de rutas de archivos
 * @returns {Promise<string[]>} Array de URLs combinadas
 */
export async function cargarMultiplesArchivosUrls(archivosUrls) {
  const todasLasUrls = [];
  
  for (const archivo of archivosUrls) {
    try {
      const urls = await cargarUrlsDesdeArchivo(archivo);
      todasLasUrls.push(...urls);
      console.log(chalk.green(`✅ Procesado ${archivo}: ${urls.length} URLs`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ No se pudo cargar ${archivo}: ${error.message}`));
    }
  }
  
  // Eliminar duplicados
  const urlsUnicas = [...new Set(todasLasUrls)];
  console.log(chalk.cyan(`📊 Total de URLs únicas: ${urlsUnicas.length}`));
  
  return urlsUnicas;
}
