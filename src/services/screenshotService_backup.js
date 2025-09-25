import captureWebsite from 'capture-website';
import { chromium } from 'playwright';
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
 * Configuración de Playwright optimizada para Ubuntu 23.10+ con AppArmor
 */
const PLAYWRIGHT_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-field-trial-config',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-client-side-phishing-detection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-translate',
    '--disable-windows10-custom-titlebar',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--enable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling',
    '--disable-field-trial-config',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-client-side-phishing-detection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-translate',
    '--disable-windows10-custom-titlebar',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--enable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-blink-features=AutomationControlled'
  ]
};

/**
 * Servicio para capturar screenshots de sitios web
 */
export class ScreenshotService {
  constructor(configuracion = {}) {
    this.configuracion = { ...CONFIGURACION_DEFECTO, ...configuracion };
    this.browser = null;
    this.estadisticas = {
      exitosas: 0,
      fallidas: 0,
      errores404: 0,
      erroresConexion: 0,
      otrosErrores: 0,
      tamanioTotal: 0
    };
  }

  /**
   * Inicializa el servicio
   */
  async inicializar() {
    try {
      // Crear directorio de salida si no existe
      await fs.mkdir(this.configuracion.directorioSalida, { recursive: true });
      console.log(`Directorio de salida: ${this.configuracion.directorioSalida}`);
      
      console.log('ScreenshotService inicializado (Playwright se iniciará cuando sea necesario)');
    } catch (error) {
      throw new Error(`Error al crear directorio de salida: ${error.message}`);
    }
  }

  /**
   * Inicializa Playwright con retry
   */
  async inicializarPlaywrightConRetry(maxIntentos = 3) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        console.log(`Iniciando Playwright (intento ${intento}/${maxIntentos})...`);
        
        this.browser = await chromium.launch(PLAYWRIGHT_OPTIONS);
        
        console.log('✅ Playwright inicializado correctamente');
        return true;
      } catch (error) {
        console.log(`❌ Error en intento ${intento}: ${error.message}`);
        
        if (intento === maxIntentos) {
          throw new Error(`No se pudo inicializar Playwright después de ${maxIntentos} intentos: ${error.message}`);
        }
        
        // Esperar un poco antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Captura screenshot usando Playwright
   */
  async capturarConPlaywright(url, rutaCompleta) {
    if (!this.browser) {
      await this.inicializarPlaywrightConRetry();
    }

    const page = await this.browser.newPage();
    
    try {
      // Configurar viewport
      await page.setViewportSize({
        width: this.configuracion.width,
        height: this.configuracion.height
      });

      // Configurar headers
      await page.setExtraHTTPHeaders(this.configuracion.headers);

      // Navegar a la URL
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.configuracion.timeout * 1000 
      });

      // Esperar un poco para que se cargue completamente
      await page.waitForTimeout(this.configuracion.delay * 1000);

      // Ocultar elementos si se especifican
      if (this.configuracion.hideElements && this.configuracion.hideElements.length > 0) {
        for (const selector of this.configuracion.hideElements) {
          try {
            await page.evaluate((sel) => {
              const elements = document.querySelectorAll(sel);
              elements.forEach(el => el.style.display = 'none');
            }, selector);
          } catch (error) {
            // Ignorar errores al ocultar elementos
          }
        }
      }

      // Tomar screenshot
      await page.screenshot({
        path: rutaCompleta,
        fullPage: this.configuracion.fullPage,
        type: this.configuracion.format
      });

      // Obtener información del archivo
      const stats = await fs.stat(rutaCompleta);
      
      return {
        exito: true,
        nombreArchivo: rutaCompleta.split('/').pop(),
        rutaCompleta,
        tamanio: stats.size,
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Captura screenshot usando capture-website
   */
  async capturarConCaptureWebsite(url, rutaCompleta) {
    const opciones = {
      width: this.configuracion.width,
      height: this.configuracion.height,
      scaleFactor: this.configuracion.scaleFactor,
      format: this.configuracion.format,
      quality: this.configuracion.quality,
      fullPage: this.configuracion.fullPage,
      timeout: this.configuracion.timeout,
      delay: this.configuracion.delay,
      waitForElement: this.configuracion.waitForElement,
      hideElements: this.configuracion.hideElements,
      blockAds: this.configuracion.blockAds,
      darkMode: this.configuracion.darkMode,
      headers: this.configuracion.headers
    };

    await captureWebsite.file(url, rutaCompleta, opciones);

    // Obtener información del archivo
    const stats = await fs.stat(rutaCompleta);
    
    return {
      exito: true,
      nombreArchivo: rutaCompleta.split('/').pop(),
      rutaCompleta,
      tamanio: stats.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Captura un screenshot de una URL
   */
  async capturarScreenshot(url, indice, usarPlaywright = false) {
    const spinner = ora(`Capturando ${url}`).start();
    
    try {
      // Generar nombre de archivo único
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `screenshot-${indice}-${timestamp}.${this.configuracion.format}`;
      const rutaCompleta = join(this.configuracion.directorioSalida, nombreArchivo);

      let resultado;
      
      if (usarPlaywright) {
        // Usar Playwright para Instagram y Facebook
        resultado = await this.capturarConPlaywright(url, rutaCompleta);
        spinner.succeed(chalk.green(`OK ${url} -> ${nombreArchivo} (Playwright)`));
      } else {
        // Usar capture-website para otros sitios
        resultado = await this.capturarConCaptureWebsite(url, rutaCompleta);
        spinner.succeed(chalk.green(`OK ${url} -> ${nombreArchivo} (capture-website)`));
      }

      this.estadisticas.exitosas++;
      this.estadisticas.tamanioTotal += resultado.tamanio;
      
      return resultado;

    } catch (error) {
      this.estadisticas.fallidas++;
      
      // Clasificar el tipo de error
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        this.estadisticas.errores404++;
        spinner.fail(chalk.red(`404 ${url}`));
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        this.estadisticas.erroresConexion++;
        spinner.fail(chalk.red(`Timeout ${url}`));
      } else {
        this.estadisticas.otrosErrores++;
        spinner.fail(chalk.red(`Error ${url}: ${error.message}`));
      }

      return {
        exito: false,
        error: error.message,
        url,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Captura múltiples screenshots
   */
  async capturarMultiplesUrls(urls, usarPlaywright = false) {
    console.log(`\n📸 Capturando screenshots ${usarPlaywright ? 'con Playwright' : 'con capture-website'}...`);
    console.log(`Iniciando captura de ${urls.length} URLs`);
    console.log(`Directorio de salida: ${this.configuracion.directorioSalida}`);
    
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.capturarScreenshot(url, i + 1, usarPlaywright);
      resultados.push({
        url,
        indice: i + 1,
        ...resultado
      });
    }

    this.mostrarResumen();
    return resultados;
  }

  /**
   * Muestra el resumen de capturas
   */
  mostrarResumen() {
    console.log('\nRESUMEN DE CAPTURAS:');
    console.log(`Exitosas: ${this.estadisticas.exitosas}`);
    console.log(`Fallidas: ${this.estadisticas.fallidas}`);
    console.log(`Errores 404: ${this.estadisticas.errores404}`);
    console.log(`Errores de conexion: ${this.estadisticas.erroresConexion}`);
    console.log(`Otros errores: ${this.estadisticas.otrosErrores}`);
    console.log(`Tamano total: ${(this.estadisticas.tamanioTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Directorio: ${this.configuracion.directorioSalida}`);
  }

  /**
   * Cierra el navegador
   */
  async cerrar() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
