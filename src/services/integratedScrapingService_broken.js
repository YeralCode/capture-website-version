import { InstagramScraperService } from './instagramScraperService.js';
import { FacebookScraperService } from './facebookScraperService.js';
import { ScreenshotService } from './screenshotService.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio integrado que combina scraping de datos con captura de screenshots
 * Instagram y Facebook: Scraping + Screenshots con Puppeteer
 * Otros sitios: Solo Screenshots con capture-website
 */
export class IntegratedScrapingService {
  constructor(configuracion = {}) {
    this.configuracion = {
      scraping: {
        directorioSalida: 'scraped_data',
        maxPosts: 10,
        incluirComentarios: false,
        incluirReacciones: true
      },
      screenshots: {
        width: 1920,
        height: 1080,
        timeout: 120,
        concurrencia: 2
      },
      ...configuracion
    };
    
    // Crear el servicio de screenshots primero
    this.screenshotService = new ScreenshotService({...this.configuracion.screenshots, directorioSalida: "screenshots"});
    
    // Inyectar el servicio de screenshots en los servicios de scraping
    this.instagramService = new InstagramScraperService(this.configuracion.scraping, this.screenshotService);
    this.facebookService = new FacebookScraperService(this.configuracion.scraping, this.screenshotService);
    
    this.resultadosCompletos = [];
  }

  /**
   * Inicializa todos los servicios
   */
  async inicializar() {
    const spinner = ora('Inicializando servicios integrados...').start();
    
    try {
      await this.instagramService.inicializar();
      await this.facebookService.inicializar();
      await this.screenshotService.inicializar();
      
      spinner.succeed('✅ Servicios integrados inicializados');
    } catch (error) {
      spinner.fail('❌ Error al inicializar servicios');
      throw error;
    }
  }

  /**
   * Procesa URLs de Instagram y Facebook con scraping y screenshots
   * @param {string[]} urls - Array de URLs a procesar
   * @returns {Promise<Object[]>} Resultados completos
   */
  async procesarUrls(urls) {
    console.log(chalk.blue.bold('\n🚀 PROCESANDO URLs CON SCRAPING Y SCREENSHOTS\n'));
    
    await this.inicializar();
    this.resultadosCompletos = [];

    // Separar URLs por tipo
    const urlsInstagram = urls.filter(url => this.esUrlInstagram(url));
    const urlsFacebook = urls.filter(url => this.esUrlFacebook(url));
    const urlsOtros = urls.filter(url => !this.esUrlInstagram(url) && !this.esUrlFacebook(url));

    console.log(chalk.cyan(`📱 Instagram: ${urlsInstagram.length} URLs (Scraping + Screenshots con Puppeteer)`));
    console.log(chalk.blue(`📘 Facebook: ${urlsFacebook.length} URLs (Scraping + Screenshots con Puppeteer)`));
    console.log(chalk.gray(`🌐 Otros sitios: ${urlsOtros.length} URLs (Solo Screenshots con capture-website)`));

    // Procesar Instagram (Scraping + Screenshots con Puppeteer)
    if (urlsInstagram.length > 0) {
      const resultadosInstagram = await this.procesarInstagram(urlsInstagram);
      this.resultadosCompletos.push(...resultadosInstagram);
    }

    // Procesar Facebook (Scraping + Screenshots con Puppeteer)
    if (urlsFacebook.length > 0) {
      const resultadosFacebook = await this.procesarFacebook(urlsFacebook);
      this.resultadosCompletos.push(...resultadosFacebook);
    }

    // Procesar otros sitios (Solo Screenshots con capture-website)
    if (urlsOtros.length > 0) {
      const resultadosOtros = await this.procesarOtrosSitios(urlsOtros);
      this.resultadosCompletos.push(...resultadosOtros);
    }

    this.mostrarResumenCompleto();
    return this.resultadosCompletos;
  }

  /**
   * Procesa URLs de Instagram (Scraping + Screenshots con Puppeteer)
   * @param {string[]} urls - URLs de Instagram
   * @returns {Promise<Object[]>} Resultados
   */
  async procesarInstagram(urls) {
    console.log(chalk.cyan('\n📱 PROCESANDO INSTAGRAM (SCRAPING + SCREENSHOTS CON PUPPETEER)\n'));
    
    const resultados = [];
    
    // Primero extraer datos
    console.log(chalk.yellow('🔍 Extrayendo datos de Instagram...'));
    const datosInstagram = await this.instagramService.procesarUrls(urls);
    
    // Luego capturar screenshots con Puppeteer (no capture-website)
    console.log(chalk.yellow('📸 Capturando screenshots de Instagram con Puppeteer...'));
    const screenshotsInstagram = await this.capturarConPlaywright(urls);
    
    // Combinar resultados
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const datos = datosInstagram.find(d => d.url === url || d.url.includes(url.split('/').pop()));
      const screenshot = screenshotsInstagram.find(s => s.url === url);
      
      // Determinar si fue exitoso (datos O screenshot exitosos)
      const exitoDatos = datos?.exito || false;
      const exitoScreenshot = screenshot?.exito || false;
      const exitoGeneral = exitoDatos || exitoScreenshot;
      
      resultados.push({
        url,
        tipo: 'instagram',
        datos: datos || null,
        screenshot: screenshot || null,
        exito: exitoGeneral,
        exitoDatos: exitoDatos,
        exitoScreenshot: exitoScreenshot,
        timestamp: new Date().toISOString()
      });
    }
    
    return resultados;
  }

  /**
   * Procesa URLs de Facebook (Scraping + Screenshots con Puppeteer)
   * @param {string[]} urls - URLs de Facebook
   * @returns {Promise<Object[]>} Resultados
   */
  async procesarFacebook(urls) {
    console.log(chalk.blue('\n📘 PROCESANDO FACEBOOK (SCRAPING + SCREENSHOTS CON PUPPETEER)\n'));
    
    const resultados = [];
    
    // Primero extraer datos
    console.log(chalk.yellow('🔍 Extrayendo datos de Facebook...'));
    const datosFacebook = await this.facebookService.procesarUrls(urls);
    
    // Luego capturar screenshots con Puppeteer (no capture-website)
    console.log(chalk.yellow('📸 Capturando screenshots de Facebook con Puppeteer...'));
    const screenshotsFacebook = await this.capturarConPlaywright(urls);
    
    // Combinar resultados
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const datos = datosFacebook.find(d => d.url === url || d.url.includes(url.split('/').pop()));
      const screenshot = screenshotsFacebook.find(s => s.url === url);
      
      // Determinar si fue exitoso (datos O screenshot exitosos)
      const exitoDatos = datos?.exito || false;
      const exitoScreenshot = screenshot?.exito || false;
      const exitoGeneral = exitoDatos || exitoScreenshot;
      
      resultados.push({
        url,
        tipo: 'facebook',
        datos: datos || null,
        screenshot: screenshot || null,
        exito: exitoGeneral,
        exitoDatos: exitoDatos,
        exitoScreenshot: exitoScreenshot,
        timestamp: new Date().toISOString()
      });
    }
    
    return resultados;
  }

  /**
   * Procesa otros sitios web (Solo Screenshots con capture-website)
   * @param {string[]} urls - URLs de otros sitios
   * @returns {Promise<Object[]>} Resultados
   */
  async procesarOtrosSitios(urls) {
    console.log(chalk.gray('\n🌐 PROCESANDO OTROS SITIOS (SOLO SCREENSHOTS CON CAPTURE-WEBSITE)\n'));
    
    const resultados = [];
    
    // Solo capturar screenshots con capture-website
    console.log(chalk.yellow('📸 Capturando screenshots con capture-website...'));
    const screenshots = await this.screenshotService.capturarMultiplesUrls(urls, this.configuracion.screenshots.concurrencia);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const screenshot = screenshots.find(s => s.url === url);
      
      resultados.push({
        url,
        tipo: 'otro',
        datos: null, // No hay scraping para otros sitios
        screenshot: screenshot || null,
        exito: screenshot?.exito || false,
        exitoDatos: false,
        exitoScreenshot: screenshot?.exito || false,
        timestamp: new Date().toISOString()
      });
    }
    
    return resultados;
  }

  /**
   * Captura screenshots usando capture-website (para todos los sitios)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */

  async capturarConCaptureWebsite(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, false); // false = usar capture-website
      resultados.push(resultado);
    }
    
    return resultados;
  }
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }


  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    return resultados;

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
  }

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    const resultados = [];

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    for (let i = 0; i < urls.length; i++) {

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
      const url = urls[i];

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
      const resultado = await this.screenshotService.capturarScreenshot(url, i);

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
      resultados.push(resultado);

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    }

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
    return resultados;

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
  }
  }

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
   * @param {string[]} urls - URLs a capturar
   * @returns {Promise<Object[]>} Resultados de capturas
   */
  async capturarConPlaywright(urls) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const resultado = await this.screenshotService.capturarScreenshot(url, i, true); // true = usar Playwright
      resultados.push(resultado);
    }
    
    return resultados;
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
   * Muestra un resumen completo de todos los resultados
   */
  mostrarResumenCompleto() {
    const total = this.resultadosCompletos.length;
    const exitosos = this.resultadosCompletos.filter(r => r.exito).length;
    const fallidos = total - exitosos;
    
    const instagram = this.resultadosCompletos.filter(r => r.tipo === 'instagram');
    const facebook = this.resultadosCompletos.filter(r => r.tipo === 'facebook');
    const otros = this.resultadosCompletos.filter(r => r.tipo === 'otro');
    
    console.log(chalk.green.bold('\n🎉 RESUMEN COMPLETO DE PROCESAMIENTO\n'));
    console.log(chalk.cyan('📊 ESTADÍSTICAS GENERALES:'));
    console.log(chalk.gray(`  • Total URLs procesadas: ${total}`));
    console.log(chalk.green(`  • Exitosos: ${exitosos}`));
    console.log(chalk.red(`  • Fallidos: ${fallidos}`));
    console.log(chalk.yellow(`  • Porcentaje de éxito: ${((exitosos / total) * 100).toFixed(1)}%`));
    
    console.log(chalk.cyan('\n📱 INSTAGRAM (SCRAPING + SCREENSHOTS CON PUPPETEER):'));
    console.log(chalk.gray(`  • URLs procesadas: ${instagram.length}`));
    console.log(chalk.green(`  • Exitosos: ${instagram.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con datos extraídos: ${instagram.filter(r => r.exitoDatos).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${instagram.filter(r => r.exitoScreenshot).length}`));
    console.log(chalk.yellow(`  • Solo screenshots (errores de datos): ${instagram.filter(r => !r.exitoDatos && r.exitoScreenshot).length}`));
    
    console.log(chalk.cyan('\n📘 FACEBOOK (SCRAPING + SCREENSHOTS CON PUPPETEER):'));
    console.log(chalk.gray(`  • URLs procesadas: ${facebook.length}`));
    console.log(chalk.green(`  • Exitosos: ${facebook.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con datos extraídos: ${facebook.filter(r => r.exitoDatos).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${facebook.filter(r => r.exitoScreenshot).length}`));
    console.log(chalk.yellow(`  • Solo screenshots (errores de datos): ${facebook.filter(r => !r.exitoDatos && r.exitoScreenshot).length}`));
    
    console.log(chalk.cyan('\n🌐 OTROS SITIOS (SOLO SCREENSHOTS CON CAPTURE-WEBSITE):'));
    console.log(chalk.gray(`  • URLs procesadas: ${otros.length}`));
    console.log(chalk.green(`  • Exitosos: ${otros.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${otros.filter(r => r.exitoScreenshot).length}`));
    
    console.log(chalk.blue(`\n📁 Datos extraídos: ${this.configuracion.scraping.directorioSalida}`));
    console.log(chalk.blue(`📸 Screenshots: screenshots/`));
  }

  /**
   * Obtiene todos los resultados
   * @returns {Object[]} Array de resultados completos
   */
  obtenerResultados() {
    return this.resultadosCompletos;
  }

  /**
   * Obtiene solo los resultados exitosos
   * @returns {Object[]} Array de resultados exitosos
   */
  obtenerResultadosExitosos() {
    return this.resultadosCompletos.filter(r => r.exito);
  }

  /**
   * Cierra todos los servicios
   */
  async cerrar() {
    await this.screenshotService.cerrar();
  }
}
