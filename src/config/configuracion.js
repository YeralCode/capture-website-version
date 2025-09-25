/**
 * Configuración centralizada para el proyecto de capturas de pantalla
 */

export const configuracionDefecto = {
  // Configuración de capturas
  screenshots: {
    width: 1920,
    height: 1080,
    scaleFactor: 1,
    format: 'png',
    quality: 0.8,
    fullPage: false,
    timeout: 120, // segundos
    delay: 2, // segundos antes de capturar
    concurrencia: 3, // número de capturas simultáneas
    reintentos: 2, // número de reintentos en caso de error
    blockAds: true,
    darkMode: false,
    hideElements: [
      '.cookie-banner',
      '.cookie-notice',
      '#cookie-consent',
      '.gdpr-banner',
      '.newsletter-popup',
      '.modal-overlay'
    ],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    }
  },

  // Configuración de archivos y directorios
  archivos: {
    urlsArchivo: 'urls_prueba_variantes.txt',
    directorioScreenshots: 'screenshots',
    directorioOutput: 'output',
    prefijoArchivoPdf: 'reporte-capturas'
  },

  // Configuración de PDF
  pdf: {
    formato: 'a4',
    orientacion: 'portrait',
    calidad: 0.92,
    compresion: true,
    incluirPortada: true,
    incluirResumen: true,
    incluirTablaResultados: true,
    incluirCapturas: true,
    maxImagenesPorPagina: 2
  },

  // Configuración de logging
  logging: {
    nivel: 'info', // 'debug', 'info', 'warn', 'error'
    mostrarProgreso: true,
    colorearSalida: true,
    guardarLogs: false,
    archivoLog: 'capturas.log'
  },

  // Configuración de red
  red: {
    timeoutConexion: 10000, // ms
    maxReintentos: 3,
    delayEntreReintentos: 1000, // ms
    validarUrls: false, // validar URLs antes de capturar
    seguirRedirecciones: true
  },

  // Configuración de dispositivos móviles (opcional)
  dispositivos: {
    desktop: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    mobile: {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    tablet: {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    }
  }
};

/**
 * Fusiona configuración personalizada con la configuración por defecto
 * @param {Object} configuracionPersonalizada - Configuración personalizada
 * @returns {Object} Configuración fusionada
 */
export function fusionarConfiguracion(configuracionPersonalizada = {}) {
  return fusionarObjetos(configuracionDefecto, configuracionPersonalizada);
}

/**
 * Función auxiliar para fusionar objetos profundamente
 * @param {Object} objetivo - Objeto objetivo
 * @param {Object} fuente - Objeto fuente
 * @returns {Object} Objeto fusionado
 */
function fusionarObjetos(objetivo, fuente) {
  const resultado = { ...objetivo };
  
  for (const clave in fuente) {
    if (fuente.hasOwnProperty(clave)) {
      if (esObjeto(fuente[clave]) && esObjeto(resultado[clave])) {
        resultado[clave] = fusionarObjetos(resultado[clave], fuente[clave]);
      } else {
        resultado[clave] = fuente[clave];
      }
    }
  }
  
  return resultado;
}

/**
 * Verifica si un valor es un objeto
 * @param {*} valor - Valor a verificar
 * @returns {boolean} True si es un objeto
 */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/**
 * Valida la configuración
 * @param {Object} configuracion - Configuración a validar
 * @returns {Object} Resultado de la validación
 */
export function validarConfiguracion(configuracion) {
  const errores = [];
  const advertencias = [];

  // Validar configuración de screenshots
  if (configuracion.screenshots) {
    if (configuracion.screenshots.width < 320) {
      errores.push('El ancho mínimo para screenshots es 320px');
    }
    if (configuracion.screenshots.height < 240) {
      errores.push('La altura mínima para screenshots es 240px');
    }
    if (configuracion.screenshots.timeout < 5) {
      advertencias.push('Timeout muy bajo, podría causar capturas incompletas');
    }
    if (configuracion.screenshots.concurrencia > 10) {
      advertencias.push('Concurrencia alta, podría sobrecargar el sistema');
    }
  }

  // Validar configuración de archivos
  if (configuracion.archivos) {
    if (!configuracion.archivos.urlsArchivo) {
      errores.push('Debe especificar un archivo de URLs');
    }
  }

  return {
    esValida: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Obtiene configuración desde variables de entorno
 * @returns {Object} Configuración desde variables de entorno
 */
export function obtenerConfiguracionDesdeEnv() {
  return {
    screenshots: {
      width: parseInt(process.env.SCREENSHOT_WIDTH) || configuracionDefecto.screenshots.width,
      height: parseInt(process.env.SCREENSHOT_HEIGHT) || configuracionDefecto.screenshots.height,
      timeout: parseInt(process.env.SCREENSHOT_TIMEOUT) || configuracionDefecto.screenshots.timeout,
      concurrencia: parseInt(process.env.SCREENSHOT_CONCURRENCY) || configuracionDefecto.screenshots.concurrencia,
      fullPage: process.env.SCREENSHOT_FULL_PAGE === 'true' || configuracionDefecto.screenshots.fullPage
    },
    archivos: {
      urlsArchivo: process.env.URLS_FILE || configuracionDefecto.archivos.urlsArchivo,
      directorioScreenshots: process.env.SCREENSHOTS_DIR || configuracionDefecto.archivos.directorioScreenshots,
      directorioOutput: process.env.OUTPUT_DIR || configuracionDefecto.archivos.directorioOutput
    },
    red: {
      timeoutConexion: parseInt(process.env.NETWORK_TIMEOUT) || configuracionDefecto.red.timeoutConexion,
      validarUrls: process.env.VALIDATE_URLS === 'true' || configuracionDefecto.red.validarUrls
    }
  };
} 