import { InstagramScraperService } from './instagramScraperService.js';
import { FacebookScraperService } from './facebookScraperService.js';
import { ScreenshotService } from './screenshotService.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio integrado que combina scraping de datos con captura de screenshots
 * Instagram y Facebook: Scraping + Screenshots con Playwright
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
   * Procesa URLs con scraping y capturas
   */
  async procesarUrls(urls) {
    console.log(chalk.blue('\n🚀 PROCESANDO URLs CON SCRAPING Y SCREENSHOTS\n'));
    
    // Categorizar URLs
    const urlsInstagram = urls.filter(url => this.esUrlInstagram(url));
    const urlsFacebook = urls.filter(url => this.esUrlFacebook(url));
    const urlsOtros = urls.filter(url => !this.esUrlInstagram(url) && !this.esUrlFacebook(url));

    console.log(chalk.cyan(`📱 Instagram: ${urlsInstagram.length} URLs (Scraping + Screenshots con Playwright)`));
    console.log(chalk.cyan(`📘 Facebook: ${urlsFacebook.length} URLs (Scraping + Screenshots con Playwright)`));
    console.log(chalk.cyan(`🌐 Otros sitios: ${urlsOtros.length} URLs (Solo Screenshots con capture-website)`));

    const resultados = [];

    // Procesar Instagram
    if (urlsInstagram.length > 0) {
      const resultadosInstagram = await this.procesarInstagram(urlsInstagram);
      resultados.push(...resultadosInstagram);
    }

    // Procesar Facebook
    if (urlsFacebook.length > 0) {
      const resultadosFacebook = await this.procesarFacebook(urlsFacebook);
      resultados.push(...resultadosFacebook);
    }

    // Procesar otros sitios
    if (urlsOtros.length > 0) {
      const resultadosOtros = await this.procesarOtrosSitios(urlsOtros);
      resultados.push(...resultadosOtros);
    }

    return resultados;
  }

  /**
   * Procesa URLs de Instagram
   */
  async procesarInstagram(urls) {
    console.log(chalk.blue('\n📱 PROCESANDO INSTAGRAM (SCRAPING + SCREENSHOTS CON PLAYWRIGHT)\n'));
    
    // Extraer datos
    console.log(chalk.blue('🔍 Extrayendo datos de Instagram...\n'));
    const datosInstagram = await this.procesarInstagramUrls(urls);
    
    // Capturar screenshots con Playwright
    console.log(chalk.blue('\n📸 Capturando screenshots de Instagram con Playwright...'));
    const screenshotsInstagram = await this.capturarConPlaywright(urls);
    
    // Combinar resultados
    return this.combinarResultados(urls, datosInstagram, screenshotsInstagram, 'instagram');
  }

  /**
   * Procesa URLs de Facebook
   */
  async procesarFacebook(urls) {
    console.log(chalk.blue('\n📘 PROCESANDO FACEBOOK (SCRAPING + SCREENSHOTS CON PLAYWRIGHT)\n'));
    
    // Extraer datos
    console.log(chalk.blue('🔍 Extrayendo datos de Facebook...\n'));
    const datosFacebook = await this.procesarFacebookUrls(urls);
    
    // Capturar screenshots con Playwright
    console.log(chalk.blue('\n📸 Capturando screenshots de Facebook con Playwright...'));
    const screenshotsFacebook = await this.capturarConPlaywright(urls);
    
    // Combinar resultados
    return this.combinarResultados(urls, datosFacebook, screenshotsFacebook, 'facebook');
  }

  /**
   * Procesa otros sitios web
   */
  async procesarOtrosSitios(urls) {
    console.log(chalk.blue('\n🌐 PROCESANDO OTROS SITIOS (SOLO SCREENSHOTS CON CAPTURE-WEBSITE)\n'));
    
    // Solo capturar screenshots
    console.log(chalk.blue('📸 Capturando screenshots con Playwright...'));
    const screenshots = await this.capturarConPlaywright(urls);
    
    // Combinar resultados (sin datos extraídos)
    return this.combinarResultados(urls, [], screenshots, 'otro');
  }

  /**
   * Procesa URLs de Instagram individualmente
   */
  async procesarInstagramUrls(urls) {
    const resultados = [];
    
    for (const url of urls) {
      try {
        let resultado;
        
        if (url.includes('/p/')) {
          // Es un post
          const postId = this.extraerPostId(url);
          resultado = await this.instagramService.extraerPost(postId);
        } else {
          // Es un perfil
          const username = this.extraerUsername(url);
          resultado = await this.instagramService.extraerPerfil(username);
        }
        
        resultados.push({
          url,
          exito: true,
          datos: resultado,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        resultados.push({
          url,
          exito: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return resultados;
  }

  /**
   * Procesa URLs de Facebook individualmente
   */
  async procesarFacebookUrls(urls) {
    const resultados = [];
    
    for (const url of urls) {
      try {
        const pageName = this.extraerPageName(url);
        const resultado = await this.facebookService.extraerPagina(pageName);
        
        resultados.push({
          url,
          exito: true,
          datos: resultado,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        resultados.push({
          url,
          exito: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return resultados;
  }

  /**
   * Captura screenshots usando Playwright (para Instagram y Facebook)
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
   * Captura screenshots usando capture-website (para otros sitios)
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

  /**
   * Combina resultados de datos y screenshots
   */
  combinarResultados(urls, datos, screenshots, tipo) {
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const dato = datos[i] || { exito: false };
      const screenshot = screenshots[i] || { exito: false };
      
      resultados.push({
        url,
        tipo,
        exito: dato.exito || screenshot.exito,
        datos: dato,
        screenshot: screenshot,
        timestamp: new Date().toISOString()
      });
    }
    
    return resultados;
  }

  /**
   * Extrae el username de una URL de Instagram
   */
  extraerUsername(url) {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extrae el post ID de una URL de Instagram
   */
  extraerPostId(url) {
    const match = url.match(/instagram\.com\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extrae el nombre de la página de una URL de Facebook
   */
  extraerPageName(url) {
    const match = url.match(/facebook\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Verifica si una URL es de Instagram
   */
  esUrlInstagram(url) {
    return url.includes('instagram.com');
  }

  /**
   * Verifica si una URL es de Facebook
   */
  esUrlFacebook(url) {
    return url.includes('facebook.com');
  }

  /**
   * Cierra todos los servicios
   */
  async cerrar() {
    if (this.screenshotService) {
      await this.screenshotService.cerrar();
    }
  }
}
