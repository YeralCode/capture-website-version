import captureWebsite from 'capture-website';
import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Configuración por defecto para las capturas de pantalla
 */
const CONFIGURACION_DEFECTO = {
  width: 1920,
  height: 1080,
  scaleFactor: 1,
  format: 'png',
  quality: 0.8,
  fullPage: false,
  timeout: 120,
  delay: 1,
  waitForElement: null,
  hideElements: [
    'cookie-banner',
    '.cookie-notice',
    '#cookie-consent',
    '.gdpr-banner'
  ],
  blockAds: true,
  darkMode: false,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

  /**
   * Configuración de Puppeteer optimizada para Docker/Ubuntu 23.10+ con AppArmor
   */
  const PUPPETEER_OPTIONS = {
    headless: 'new',
    args: [
      '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --no-zygote --single-process',                              // CRÍTICO: Deshabilitar sandbox para Ubuntu 23.10+
      '--disable-setuid-sandbox',                  // CRÍTICO: Deshabilitar sandbox SUID
      '--disable-dev-shm-usage',                   // Usar /tmp en lugar de /dev/shm
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',                               // CRÍTICO: No usar proceso zygote
      '--single-process',                          // CRÍTICO: Ejecutar en un solo proceso
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      '--enable-automation',
      '--disable-ipc-flooding-protection',
      '--disable-namespace-sandbox',               // NUEVO: Deshabilitar namespace sandbox
      '--disable-crash-reporter',                  // Docker: Deshabilitar crash reporter
      '--disable-logging',                         // Docker: Deshabilitar logging
      '--disable-login-animations',               // Docker: Deshabilitar animaciones
      '--disable-notifications',                  // Docker: Deshabilitar notificaciones
      '--disable-session-crashed-bubble',         // Docker: Deshabilitar bubble de sesión
      '--disable-breakpad',                        // Docker: Deshabilitar breakpad
      '--memory-pressure-off',                     // Docker: Deshabilitar presión de memoria
      '--max_old_space_size=4096'                 // Docker: Aumentar memoria disponible
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    ignoreHTTPSErrors: true,
    timeout: 60000, // Reducir timeout inicial
    protocolTimeout: 60000, // Reducir timeout de protocolo
    slowMo: 0,
    // Usar ejecutable específico de Docker si está disponible
    ...(process.env.PUPPETEER_EXECUTABLE_PATH && {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    })
  };

/**
 * Servicio híbrido para capturar screenshots de sitios web
 * Instagram/Facebook: Solo Puppeteer
 * Otros sitios: capture-website
 */
export class ScreenshotService {
  constructor(configuracion = {}) {
    this.configuracion = { ...CONFIGURACION_DEFECTO, ...configuracion };
    this.directorioSalida = 'screenshots';
    this.resultados = [];
    this.browser = null;
    this.estadisticas = {
      totalUrls: 0,
      exitosas: 0,
      fallidas: 0,
      errores404: 0,
      erroresConexion: 0,
      otrosErrores: 0
    };
  }

  /**
   * Inicializa el servicio y crea directorios necesarios
   */
  async inicializar() {
    try {
      await fs.mkdir(this.directorioSalida, { recursive: true });
      console.log(chalk.green(`Directorio de salida: ${this.directorioSalida}`));
      
      // NO inicializar Puppeteer aquí, sino cuando se necesite
      console.log(chalk.blue('ScreenshotService inicializado (Puppeteer se iniciará cuando sea necesario)'));
    } catch (error) {
      console.error(chalk.red('Error al crear directorio de salida:'), error.message);
      throw error;
    }
  }

  /**
   * Captura screenshot de una URL individual
   * @param {string} url - URL a capturar
   * @param {number} indice - Índice de la URL en el lote
   * @param {boolean} usarCaptureWebsite - Si usar capture-website en lugar de Puppeteer
   * @returns {Promise<Object>} Resultado de la captura
   */
  async capturarScreenshot(url, indice, usarCaptureWebsite = true) {
    const nombreArchivo = this.generarNombreArchivo(url, indice);
    const rutaCompleta = join(this.directorioSalida, nombreArchivo);
    
    const spinner = ora(`Capturando ${url}`).start();
    
    try {
      // Determinar método de captura basado en el tipo de URL o configuración
      if (false) {
        // Instagram/Facebook: Usar Puppeteer
        const resultado = await this.capturarConCaptureWebsite(url, rutaCompleta);
        this.estadisticas.exitosas++;
        spinner.succeed(chalk.green(`OK ${url} -> ${nombreArchivo} (Puppeteer)`));
        return resultado;
      } else {
        // Otros sitios: Usar capture-website
        const resultado = await this.capturarConCaptureWebsite(url, rutaCompleta);
        this.estadisticas.exitosas++;
        spinner.succeed(chalk.green(`OK ${url} -> ${nombreArchivo} (capture-website)`));
        return resultado;
      }

    } catch (error) {
      // Clasificar el tipo de error
      const tipoError = this.clasificarError(error);
      this.estadisticas[tipoError]++;
      
      let mensajeError = error.message;
      let esError404 = false;
      
      if (tipoError === 'errores404') {
        esError404 = true;
        mensajeError = 'Pagina no encontrada (404)';
        
        // Intentar capturar la página de error 404
        try {
          const resultado404 = await this.capturarPaginaError404(url, rutaCompleta);
          spinner.succeed(chalk.yellow(`Advertencia ${url} -> ${nombreArchivo} (404 capturado)`));
          return resultado404;
        } catch (error404) {
          // Si no se puede capturar la página 404, continuar con el error original
        }
      }
      
      spinner.fail(chalk.red(`Error en ${url}: ${mensajeError}`));
      
      const resultado = {
        url,
        nombreArchivo: null,
        rutaCompleta: null,
        exito: false,
        error: mensajeError,
        tipoError: tipoError,
        esError404: esError404,
        timestamp: new Date().toISOString()
      };

      this.resultados.push(resultado);
      return resultado;
    }
  }

  /**
   * Captura usando Puppeteer directamente (para Instagram/Facebook)
   * @param {string} url - URL a capturar
   * @param {string} rutaCompleta - Ruta donde guardar la captura
   * @returns {Promise<Object>} Resultado de la captura
   */
  async capturarConCaptureWebsite(url, rutaCompleta) {
    // Inicializar navegador si no existe
    if (!this.browser) {
      console.log(chalk.yellow('Inicializando Puppeteer para captura...'));
      this.browser = await this.inicializarPuppeteerConRetry();
    }

    const page = await this.browser.newPage();
    
    try {
      // Configurar viewport
      await page.setViewport({ 
        width: this.configuracion.width, 
        height: this.configuracion.height 
      });

      // Configurar headers
      await page.setExtraHTTPHeaders(this.configuracion.headers);

      // Navegar a la URL con configuración optimizada
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.configuracion.timeout * 1000 
      });

      // Esperar un poco para que cargue completamente
      await page.waitForTimeout(this.configuracion.delay * 1000);

      // Ocultar elementos si es necesario
      if (this.configuracion.hideElements && this.configuracion.hideElements.length > 0) {
        await page.evaluate((selectors) => {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.style.display = 'none');
          });
        }, this.configuracion.hideElements);
      }

      // Tomar captura con timeout específico
      await page.screenshot({ 
        path: rutaCompleta,
        fullPage: this.configuracion.fullPage,
        type: this.configuracion.format
      });

      const resultado = {
        url,
        nombreArchivo: this.generarNombreArchivo(url, 0),
        rutaCompleta,
        exito: true,
        timestamp: new Date().toISOString(),
        tamanio: await this.obtenerTamanioArchivo(rutaCompleta)
      };

      this.resultados.push(resultado);
      return resultado;

    } finally {
      await page.close();
    }
  }

  /**
   * Captura usando capture-website (para otros sitios)
   * @param {string} url - URL a capturar
   * @param {string} rutaCompleta - Ruta donde guardar la captura
   * @returns {Promise<Object>} Resultado de la captura
   */
  async capturarConCaptureWebsite(url, rutaCompleta) {
    const opcionesCaptura = {
      width: this.configuracion.width,
      height: this.configuracion.height,
      scaleFactor: this.configuracion.scaleFactor,
      format: this.configuracion.format,
      quality: this.configuracion.quality,
      fullPage: this.configuracion.fullPage,
      timeout: this.configuracion.timeout * 1000,
      delay: this.configuracion.delay * 1000,
      hideElements: this.configuracion.hideElements,
      blockAds: this.configuracion.blockAds,
      darkMode: this.configuracion.darkMode,
      headers: this.configuracion.headers,
      puppeteerOptions: PUPPETEER_OPTIONS
    };

    await captureWebsite.file(url, rutaCompleta, opcionesCaptura);

    const resultado = {
      url,
      nombreArchivo: this.generarNombreArchivo(url, 0),
      rutaCompleta,
      exito: true,
      timestamp: new Date().toISOString(),
      tamanio: await this.obtenerTamanioArchivo(rutaCompleta)
    };

    this.resultados.push(resultado);
    return resultado;
  }

  /**
   * Verifica si una URL es de Instagram
   * @param {string} url - URL a verificar
   * @returns {boolean} True si es Instagram
   */
  esUrlInstagram(url) {
    return url.includes('instagram.com');
  }

  /**
   * Verifica si una URL es de Facebook
   * @param {string} url - URL a verificar
   * @returns {boolean} True si es Facebook
   */
  esUrlFacebook(url) {
    return url.includes('facebook.com');
  }

  /**
   * Clasifica el tipo de error
   * @param {Error} error - Error a clasificar
   * @returns {string} Tipo de error
   */
  clasificarError(error) {
    const mensaje = error.message.toLowerCase();
    
    if (mensaje.includes('404') || mensaje.includes('not found')) {
      return 'errores404';
    } else if (mensaje.includes('connection') || mensaje.includes('timeout') || mensaje.includes('refused')) {
      return 'erroresConexion';
    } else {
      return 'otrosErrores';
    }
  }

  /**
   * Captura la página de error 404
   * @param {string} url - URL original
   * @param {string} rutaCompleta - Ruta donde guardar la captura
   * @returns {Promise<Object>} Resultado de la captura 404
   */
  async capturarPaginaError404(url, rutaCompleta) {
    if (!this.browser) {
      throw new Error('Navegador no disponible para capturar 404');
    }

    const page = await this.browser.newPage();
    
    try {
      // Configurar viewport
      await page.setViewport({ 
        width: this.configuracion.width, 
        height: this.configuracion.height 
      });

      // Configurar headers
      await page.setExtraHTTPHeaders(this.configuracion.headers);

      // Navegar a la URL
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.configuracion.timeout * 1000 
      });

      // Esperar un poco para que cargue completamente
      await page.waitForTimeout(this.configuracion.delay * 1000);

      // Tomar captura
      await page.screenshot({ 
        path: rutaCompleta,
        fullPage: this.configuracion.fullPage,
        type: this.configuracion.format
      });

      const resultado = {
        url,
        nombreArchivo: this.generarNombreArchivo(url, 0).replace('.png', '_404.png'),
        rutaCompleta,
        exito: true,
        esError404: true,
        timestamp: new Date().toISOString(),
        tamanio: await this.obtenerTamanioArchivo(rutaCompleta)
      };

      this.resultados.push(resultado);
      return resultado;

    } finally {
      await page.close();
    }
  }

  /**
   * Captura screenshots de múltiples URLs
   * @param {string[]} urls - Array de URLs a capturar
   * @param {number} concurrencia - Número de capturas simultáneas
   * @returns {Promise<Object[]>} Array de resultados
   */
  async capturarMultiplesUrls(urls, concurrencia = 2) {
    console.log(chalk.blue(`Iniciando captura de ${urls.length} URLs`));
    
    await this.inicializar();
    this.estadisticas.totalUrls = urls.length;
    
    const resultados = [];
    
    // Procesar URLs en lotes para controlar la concurrencia
    for (let i = 0; i < urls.length; i += concurrencia) {
      const lote = urls.slice(i, i + concurrencia);
      const promesasLote = lote.map((url, indiceLocal) => 
        this.capturarScreenshot(url, i + indiceLocal)
      );
      
      const resultadosLote = await Promise.allSettled(promesasLote);
      resultados.push(...resultadosLote.map(r => r.value || r.reason));
      
      // Pausa breve entre lotes para no sobrecargar
      if (i + concurrencia < urls.length) {
        await this.esperar(2000);
      }
    }

    this.mostrarResumen();
    return this.resultados;
  }

  /**
   * Genera un nombre de archivo único para la captura
   * @param {string} url - URL original
   * @param {number} indice - Índice de la URL
   * @returns {string} Nombre de archivo
   */
  generarNombreArchivo(url, indice) {
    try {
      const urlObj = new URL(url);
      const dominio = urlObj.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      return `${String(indice + 1).padStart(3, '0')}_${dominio}_${timestamp}.png`;
    } catch (error) {
      // Si la URL no es válida, usar un nombre alternativo
      const dominioLimpio = url.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      return `${String(indice + 1).padStart(3, '0')}_${dominioLimpio}_${timestamp}.png`;
    }
  }

  /**
   * Obtiene el tamaño de un archivo en bytes
   * @param {string} rutaArchivo - Ruta del archivo
   * @returns {Promise<number>} Tamaño en bytes
   */
  async obtenerTamanioArchivo(rutaArchivo) {
    try {
      const stats = await fs.stat(rutaArchivo);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Muestra un resumen de los resultados
   */
  mostrarResumen() {
    const tamanioTotal = this.resultados
      .filter(r => r.tamanio)
      .reduce((total, r) => total + r.tamanio, 0);

    console.log(chalk.yellow('\nRESUMEN DE CAPTURAS:'));
    console.log(chalk.green(`Exitosas: ${this.estadisticas.exitosas}`));
    console.log(chalk.red(`Fallidas: ${this.estadisticas.fallidas}`));
    console.log(chalk.yellow(`Errores 404: ${this.estadisticas.errores404}`));
    console.log(chalk.blue(`Errores de conexion: ${this.estadisticas.erroresConexion}`));
    console.log(chalk.gray(`Otros errores: ${this.estadisticas.otrosErrores}`));
    console.log(chalk.blue(`Tamano total: ${this.formatearTamanio(tamanioTotal)}`));
    console.log(chalk.cyan(`Directorio: ${this.directorioSalida}`));
  }

  /**
   * Formatea el tamaño de archivo en una unidad legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatearTamanio(bytes) {
    const unidades = ['B', 'KB', 'MB', 'GB'];
    let tamanio = bytes;
    let unidadIndex = 0;

    while (tamanio >= 1024 && unidadIndex < unidades.length - 1) {
      tamanio /= 1024;
      unidadIndex++;
    }

    return `${tamanio.toFixed(2)} ${unidades[unidadIndex]}`;
  }

  /**
   * Función de utilidad para pausas
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise} Promise que se resuelve después del tiempo especificado
   */
  async esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicializa Puppeteer con reintentos para manejar errores de Docker
   */
  async inicializarPuppeteerConRetry(maxReintentos = 3) {
    for (let intento = 1; intento <= maxReintentos; intento++) {
      try {
        console.log(chalk.yellow(`Iniciando Puppeteer (intento ${intento}/${maxReintentos})...`));
        const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
        console.log(chalk.green('✅ Puppeteer inicializado correctamente'));
        return browser;
      } catch (error) {
        console.error(chalk.red(`❌ Error en intento ${intento}:`), error.message);
        
        if (intento === maxReintentos) {
          throw new Error(`No se pudo inicializar Puppeteer después de ${maxReintentos} intentos: ${error.message}`);
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 2000 * intento));
      }
    }
  }

  /**
   * Cierra el navegador si está abierto
   */
  async cerrar() {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log(chalk.blue('Navegador Puppeteer cerrado'));
      } catch (error) {
        console.error(chalk.yellow('Error al cerrar navegador:'), error.message);
      }
    }
  }

  /**
   * Obtiene los resultados de las capturas
   * @returns {Object[]} Array de resultados
   */
  obtenerResultados() {
    return this.resultados;
  }

  /**
   * Obtiene solo las capturas exitosas
   * @returns {Object[]} Array de capturas exitosas
   */
  obtenerCapturaExitosas() {
    return this.resultados.filter(r => r.exito);
  }

  /**
   * Obtiene las estadísticas de capturas
   * @returns {Object} Estadísticas de capturas
   */
  obtenerEstadisticas() {
    return this.estadisticas;
  }
}
