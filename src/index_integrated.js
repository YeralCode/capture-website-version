#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { cargarMultiplesArchivosUrls, filtrarUrlsValidas } from './utils/urlLoader.js';
import { IntegratedScrapingService } from './services/integratedScrapingService.js';
import { PDFGenerator } from './services/pdfGenerator.js';
import { 
  configuracionDefecto, 
  fusionarConfiguracion, 
  validarConfiguracion,
  obtenerConfiguracionDesdeEnv 
} from './config/configuracion.js';

/**
 * Clase principal para orquestar el proceso de scraping y capturas integrado
 * Instagram y Facebook: Scraping + Screenshots
 * Otros sitios: Solo Screenshots con Puppeteer
 */
class IntegratedScrapingAutomation {
  constructor(configuracionPersonalizada = {}) {
    // Fusionar configuración de diferentes fuentes
    const configEnv = obtenerConfiguracionDesdeEnv();
    this.configuracion = fusionarConfiguracion({
      ...configEnv,
      ...configuracionPersonalizada,
      // Configuración específica para scraping
      scraping: {
        directorioSalida: 'scraped_data',
        maxPosts: 10,
        incluirComentarios: false,
        incluirReacciones: true
      }
    });
    
    this.integratedService = null;
    this.pdfGenerator = null;
    this.estadisticas = {
      inicioEjecucion: null,
      finEjecucion: null,
      totalUrls: 0,
      urlsExitosas: 0,
      urlsFallidas: 0,
      errores404: 0,
      erroresConexion: 0,
      otrosErrores: 0,
      tiempoTotal: 0
    };
  }

  /**
   * Inicializa los servicios necesarios
   */
  async inicializar() {
    const spinner = ora('Inicializando servicios integrados de scraping y capturas...').start();
    
    try {
      // Validar configuración
      const validacion = validarConfiguracion(this.configuracion);
      
      if (!validacion.esValida) {
        spinner.fail('❌ Configuración inválida');
        validacion.errores.forEach(error => console.error(chalk.red(`  • ${error}`)));
        process.exit(1);
      }

      if (validacion.advertencias.length > 0) {
        spinner.warn('⚠️ Advertencias en la configuración:');
        validacion.advertencias.forEach(advertencia => 
          console.warn(chalk.yellow(`  • ${advertencia}`))
        );
      }

      // Inicializar servicios integrados
      this.integratedService = new IntegratedScrapingService(this.configuracion);
      this.pdfGenerator = new PDFGenerator();

      spinner.succeed('✅ Servicios integrados inicializados correctamente');
      
      // Mostrar configuración
      this.mostrarConfiguracion();
      
    } catch (error) {
      spinner.fail('❌ Error al inicializar servicios');
      console.error(chalk.red(error.message));
      throw error;
    }
  }

  /**
   * Ejecuta el proceso completo de scraping y capturas
   */
  async ejecutar() {
    this.estadisticas.inicioEjecucion = new Date();
    
    try {
      console.log(chalk.blue.bold('\n🚀 INICIANDO PROCESO INTEGRADO DE SCRAPING Y CAPTURAS\n'));
      
      // Paso 1: Cargar URLs desde múltiples archivos
      const urls = await this.cargarUrls();
      this.estadisticas.totalUrls = urls.length;

      if (urls.length === 0) {
        console.log(chalk.yellow('⚠️ No se encontraron URLs para procesar'));
        return;
      }

      // Paso 2: Filtrar URLs válidas (opcional)
      const urlsFinales = this.configuracion.red.validarUrls ? 
        await this.validarUrls(urls) : urls;

      // Paso 3: Procesar URLs con scraping y capturas
      const resultados = await this.procesarUrls(urlsFinales);

      // Paso 4: Generar PDF con datos extraídos y screenshots
      const rutaPdf = await this.generarReportePDF(resultados);

      // Paso 5: Mostrar resumen final
      this.mostrarResumenFinal(resultados, rutaPdf);

    } catch (error) {
      console.error(chalk.red('\n❌ Error durante la ejecución:'), error.message);
      
      if (this.configuracion.logging.nivel === 'debug') {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    } finally {
      this.estadisticas.finEjecucion = new Date();
      this.estadisticas.tiempoTotal = this.estadisticas.finEjecucion - this.estadisticas.inicioEjecucion;
      
      // Cerrar servicios
      if (this.integratedService) {
        await this.integratedService.cerrar();
      }
    }
  }

  /**
   * Carga las URLs desde múltiples archivos
   */
  async cargarUrls() {
    const spinner = ora('Cargando URLs desde múltiples archivos...').start();
    
    try {
      // Lista de archivos de URLs a procesar
      const archivosUrls = [
        // 'urls_test_login.txt',        // URLs de prueba para login
        // 'urls_test_final.txt'        // URLs de prueba final
        // 'urls_prueba.txt',
        '289_perfiles_redes_sociales_10_12_2024.txt',
        '1203_SITIOS_WEB_11_2024.txt',   // URLs principales de prueba
        '2415 sitios web_dic_2024.txt'
        // 'urls_prueba_test.txt'        // URLs de prueba (primeras 5)
      ];

      const urls = await cargarMultiplesArchivosUrls(archivosUrls);
      spinner.succeed(chalk.green(`✅ Cargadas ${urls.length} URLs`));
      return urls;
    } catch (error) {
      spinner.fail('❌ Error al cargar URLs');
      throw error;
    }
  }

  /**
   * Valida las URLs antes de procesarlas
   */
  async validarUrls(urls) {
    const spinner = ora('Validando URLs...').start();
    
    try {
      const urlsValidas = await filtrarUrlsValidas(urls);
      const urlsInvalidas = urls.length - urlsValidas.length;
      
      if (urlsInvalidas > 0) {
        spinner.warn(chalk.yellow(`⚠️ ${urlsInvalidas} URLs no válidas ignoradas`));
      } else {
        spinner.succeed(chalk.green('✅ Todas las URLs son válidas'));
      }
      
      return urlsValidas;
    } catch (error) {
      spinner.fail('❌ Error al validar URLs');
      throw error;
    }
  }

  /**
   * Procesa URLs con scraping y capturas
   */
  async procesarUrls(urls) {
    console.log(chalk.blue('\n🔄 PROCESANDO URLs CON SCRAPING Y CAPTURAS\n'));
    
    const resultados = await this.integratedService.procesarUrls(urls);

    // Actualizar estadísticas
    this.estadisticas.urlsExitosas = resultados.filter(r => r.exito).length;
    this.estadisticas.urlsFallidas = resultados.filter(r => !r.exito).length;

    return resultados;
  }

  /**
   * Genera el reporte PDF con datos extraídos y screenshots
   */
  async generarReportePDF(resultados) {
    console.log(chalk.blue('\n📄 GENERANDO REPORTE PDF INTEGRADO\n'));
    
    const spinner = ora('Generando PDF con datos extraídos...').start();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `reporte-integrado-${timestamp}.pdf`;
      
      // Crear datos para el PDF que incluyan tanto screenshots como datos extraídos
      const datosParaPDF = this.prepararDatosParaPDF(resultados);
      
      const rutaPdf = await this.pdfGenerator.generarPDF(datosParaPDF, nombreArchivo);
      
      spinner.succeed(chalk.green('✅ PDF integrado generado exitosamente'));
      return rutaPdf;
      
    } catch (error) {
      spinner.fail('❌ Error al generar PDF');
      throw error;
    }
  }

  /**
   * Prepara los datos para el PDF incluyendo screenshots y datos extraídos
   */
  prepararDatosParaPDF(resultados) {
    return resultados.map(resultado => ({
      url: resultado.url,
      tipo: resultado.tipo,
      exito: resultado.exito,
      timestamp: resultado.timestamp,
      screenshot: resultado.screenshot,
      datosExtraidos: resultado.datos,
      resumen: this.generarResumenResultado(resultado)
    }));
  }

  /**
   * Genera un resumen de cada resultado
   */
  generarResumenResultado(resultado) {
    const resumen = {
      url: resultado.url,
      tipo: resultado.tipo,
      exito: resultado.exito
    };

    if (resultado.datos && resultado.datos.exito) {
      if (resultado.tipo === 'instagram') {
        resumen.datosInstagram = {
          username: resultado.datos.datos?.username,
          followers: resultado.datos.datos?.followers,
          posts: resultado.datos.datos?.posts?.length || 0
        };
      } else if (resultado.tipo === 'facebook') {
        resumen.datosFacebook = {
          pageName: resultado.datos.datos?.pageName,
          posts: resultado.datos.datos?.posts?.length || 0
        };
      }
    }

    if (resultado.screenshot && resultado.screenshot.exito) {
      resumen.screenshot = {
        archivo: resultado.screenshot.nombreArchivo,
        tamanio: resultado.screenshot.tamanio
      };
    }

    return resumen;
  }

  /**
   * Muestra la configuración actual
   */
  mostrarConfiguracion() {
    console.log(chalk.cyan('\n⚙️ CONFIGURACIÓN INTEGRADA:'));
    console.log(chalk.gray(`  • Instagram: Scraping + Screenshots`));
    console.log(chalk.gray(`  • Facebook: Scraping + Screenshots`));
    console.log(chalk.gray(`  • Otros sitios: Solo Screenshots con Puppeteer`));
    console.log(chalk.gray(`  • Instagram comentarios: ${this.configuracion.scraping.incluirComentarios ? 'Sí' : 'No'}`));
    console.log(chalk.gray(`  • Facebook reacciones: ${this.configuracion.scraping.incluirReacciones ? 'Sí' : 'No'}`));
    console.log(chalk.gray(`  • Max posts: ${this.configuracion.scraping.maxPosts}`));
    console.log(chalk.gray(`  • Resolución: ${this.configuracion.screenshots.width}x${this.configuracion.screenshots.height}`));
    console.log(chalk.gray(`  • Timeout: ${this.configuracion.screenshots.timeout}s`));
    console.log(chalk.gray(`  • Concurrencia: ${this.configuracion.screenshots.concurrencia}`));
    console.log(chalk.gray(`  • Directorio datos: ${this.configuracion.scraping.directorioSalida}`));
    console.log(chalk.gray(`  • Directorio screenshots: ${this.configuracion.archivos.directorioScreenshots}`));
    console.log(chalk.gray(`  • Directorio output: ${this.configuracion.archivos.directorioOutput}`));
  }

  /**
   * Muestra el resumen final de la ejecución
   */
  mostrarResumenFinal(resultados, rutaPdf) {
    const porcentajeExito = ((this.estadisticas.urlsExitosas / this.estadisticas.totalUrls) * 100).toFixed(1);
    const tiempoMinutos = (this.estadisticas.tiempoTotal / 1000 / 60).toFixed(2);

    // Estadísticas por tipo
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    console.log(chalk.green.bold('\n🎉 PROCESO INTEGRADO COMPLETADO\n'));
    console.log(chalk.cyan('📊 ESTADÍSTICAS FINALES:'));
    console.log(chalk.gray(`  • Total URLs procesadas: ${this.estadisticas.totalUrls}`));
    console.log(chalk.green(`  • Exitosos: ${this.estadisticas.urlsExitosas}`));
    console.log(chalk.red(`  • Fallidos: ${this.estadisticas.urlsFallidas}`));
    console.log(chalk.yellow(`  • Porcentaje de éxito: ${porcentajeExito}%`));
    console.log(chalk.blue(`  • Tiempo total: ${tiempoMinutos} minutos`));
    console.log(chalk.magenta(`  • PDF generado: ${rutaPdf}`));

    console.log(chalk.cyan('\n📱 INSTAGRAM (SCRAPING + SCREENSHOTS):'));
    console.log(chalk.gray(`  • URLs: ${instagram.length}`));
    console.log(chalk.green(`  • Exitosos: ${instagram.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con datos extraídos: ${instagram.filter(r => r.datos?.exito).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${instagram.filter(r => r.screenshot?.exito).length}`));

    console.log(chalk.cyan('\n📘 FACEBOOK (SCRAPING + SCREENSHOTS):'));
    console.log(chalk.gray(`  • URLs: ${facebook.length}`));
    console.log(chalk.green(`  • Exitosos: ${facebook.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con datos extraídos: ${facebook.filter(r => r.datos?.exito).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${facebook.filter(r => r.screenshot?.exito).length}`));

    console.log(chalk.cyan('\n🌐 OTROS SITIOS (SOLO SCREENSHOTS CON PUPPETEER):'));
    console.log(chalk.gray(`  • URLs: ${otros.length}`));
    console.log(chalk.green(`  • Exitosos: ${otros.filter(r => r.exito).length}`));
    console.log(chalk.blue(`  • Con screenshots: ${otros.filter(r => r.screenshot?.exito).length}`));

    console.log(chalk.green.bold('\n✨ ¡Revisa el archivo PDF y los datos extraídos para ver los resultados!\n'));
  }

  /**
   * Maneja errores no capturados
   */
  static manejarErroresGlobales() {
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n💥 Error no capturado:'), error.message);
      console.error(chalk.gray(error.stack));
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('\n💥 Promesa rechazada no manejada:'), reason);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n⚠️ Proceso interrumpido por el usuario'));
      process.exit(0);
    });
  }
}

/**
 * Función principal
 */
async function main() {
  // Configurar manejo de errores globales
  IntegratedScrapingAutomation.manejarErroresGlobales();

  // Mostrar banner de inicio
  console.log(chalk.blue.bold('🌐 INTEGRATED SCRAPING & SCREENSHOT AUTOMATION TOOL'));
  console.log(chalk.gray('Instagram/Facebook: Scraping + Screenshots | Otros sitios: Solo Screenshots con Puppeteer\n'));

  try {
    // Crear y ejecutar la automatización
    const automation = new IntegratedScrapingAutomation();
    await automation.inicializar();
    await automation.ejecutar();
    
  } catch (error) {
    console.error(chalk.red('❌ Error fatal:'), error.message);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegratedScrapingAutomation };
