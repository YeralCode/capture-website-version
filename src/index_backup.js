#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { cargarMultiplesArchivosUrls, filtrarUrlsValidas } from './utils/urlLoader.js';
import { ScreenshotService } from './services/screenshotService.js';
import { PDFGenerator } from './services/pdfGenerator.js';
import { 
  configuracionDefecto, 
  fusionarConfiguracion, 
  validarConfiguracion,
  obtenerConfiguracionDesdeEnv 
} from './config/configuracion.js';

/**
 * Clase principal para orquestar el proceso de capturas con manejo de errores 404
 */
class ScreenshotAutomationWith404Handling {
  constructor(configuracionPersonalizada = {}) {
    // Fusionar configuración de diferentes fuentes
    const configEnv = obtenerConfiguracionDesdeEnv();
    this.configuracion = fusionarConfiguracion({
      ...configEnv,
      ...configuracionPersonalizada
    });
    
    this.screenshotService = null;
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
    const spinner = ora('Inicializando servicios con manejo de errores 404...').start();
    
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

      // Inicializar servicios
      this.screenshotService = new ScreenshotService(this.configuracion.screenshots);
      this.pdfGenerator = new PDFGenerator();

      spinner.succeed('✅ Servicios inicializados correctamente');
      
      // Mostrar configuración
      this.mostrarConfiguracion();
      
    } catch (error) {
      spinner.fail('❌ Error al inicializar servicios');
      console.error(chalk.red(error.message));
      throw error;
    }
  }

  /**
   * Ejecuta el proceso completo de capturas y generación de PDF
   */
  async ejecutar() {
    this.estadisticas.inicioEjecucion = new Date();
    
    try {
      console.log(chalk.blue.bold('\n🚀 INICIANDO PROCESO DE CAPTURAS CON MANEJO DE ERRORES 404\n'));
      
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

      // Paso 3: Capturar screenshots
      const resultados = await this.capturarScreenshots(urlsFinales);

      // Paso 4: Generar PDF
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
      
      // Cerrar el navegador si está abierto
      if (this.screenshotService) {
        await this.screenshotService.cerrar();
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
        'urls_prueba.txt',    // URLs de prueba
      ];

      const urls = await cargarMultiplesArchivosUrls(archivosUrls);
      spinner.succeed(chalk.green(`✅ Cargadas ${urls.length} URLs (siempre HTTPS)`));
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
   * Captura screenshots de las URLs
   */
  async capturarScreenshots(urls) {
    console.log(chalk.blue('\n📸 INICIANDO CAPTURAS DE PANTALLA CON MANEJO DE ERRORES 404\n'));
    
    const resultados = await this.screenshotService.capturarMultiplesUrls(
      urls, 
      this.configuracion.screenshots.concurrencia
    );

    // Obtener estadísticas del servicio
    const estadisticasServicio = this.screenshotService.obtenerEstadisticas();
    this.estadisticas.urlsExitosas = estadisticasServicio.exitosas;
    this.estadisticas.urlsFallidas = estadisticasServicio.fallidas;
    this.estadisticas.errores404 = estadisticasServicio.errores404;
    this.estadisticas.erroresConexion = estadisticasServicio.erroresConexion;
    this.estadisticas.otrosErrores = estadisticasServicio.otrosErrores;

    return resultados;
  }

  /**
   * Genera el reporte PDF
   */
  async generarReportePDF(resultados) {
    console.log(chalk.blue('\n📄 GENERANDO REPORTE PDF\n'));
    
    const spinner = ora('Generando PDF...').start();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `reporte-capturas-404-${timestamp}.pdf`;
      
      const rutaPdf = await this.pdfGenerator.generarPDF(resultados, nombreArchivo);
      
      spinner.succeed(chalk.green('✅ PDF generado exitosamente'));
      return rutaPdf;
      
    } catch (error) {
      spinner.fail('❌ Error al generar PDF');
      throw error;
    }
  }

  /**
   * Muestra la configuración actual
   */
  mostrarConfiguracion() {
    console.log(chalk.cyan('\n⚙️ CONFIGURACIÓN:'));
    console.log(chalk.gray(`  • Modo: Híbrido (Puppeteer + capture-website)`));
    console.log(chalk.gray(`  • Protocolo: Siempre HTTPS`));
    console.log(chalk.gray(`  • Manejo 404: Captura páginas de error`));
    console.log(chalk.gray(`  • Resolución: ${this.configuracion.screenshots.width}x${this.configuracion.screenshots.height}`));
    console.log(chalk.gray(`  • Timeout: ${this.configuracion.screenshots.timeout}s`));
    console.log(chalk.gray(`  • Concurrencia: ${this.configuracion.screenshots.concurrencia}`));
    console.log(chalk.gray(`  • Directorio screenshots: ${this.configuracion.archivos.directorioScreenshots}`));
    console.log(chalk.gray(`  • Directorio output: ${this.configuracion.archivos.directorioOutput}`));
  }

  /**
   * Muestra el resumen final de la ejecución
   */
  mostrarResumenFinal(resultados, rutaPdf) {
    const porcentajeExito = ((this.estadisticas.urlsExitosas / this.estadisticas.totalUrls) * 100).toFixed(1);
    const porcentaje404 = ((this.estadisticas.errores404 / this.estadisticas.totalUrls) * 100).toFixed(1);
    const tiempoMinutos = (this.estadisticas.tiempoTotal / 1000 / 60).toFixed(2);

    console.log(chalk.green.bold('\n🎉 PROCESO COMPLETADO CON MANEJO DE ERRORES 404\n'));
    console.log(chalk.cyan('📊 ESTADÍSTICAS FINALES:'));
    console.log(chalk.gray(`  • Total URLs procesadas: ${this.estadisticas.totalUrls}`));
    console.log(chalk.green(`  • Capturas exitosas: ${this.estadisticas.urlsExitosas}`));
    console.log(chalk.red(`  • Capturas fallidas: ${this.estadisticas.urlsFallidas}`));
    console.log(chalk.yellow(`  • Errores 404: ${this.estadisticas.errores404} (${porcentaje404}%)`));
    console.log(chalk.blue(`  • Errores de conexión: ${this.estadisticas.erroresConexion}`));
    console.log(chalk.gray(`  • Otros errores: ${this.estadisticas.otrosErrores}`));
    console.log(chalk.yellow(`  • Porcentaje de éxito: ${porcentajeExito}%`));
    console.log(chalk.blue(`  • Tiempo total: ${tiempoMinutos} minutos`));
    console.log(chalk.magenta(`  • PDF generado: ${rutaPdf}`));

    // Mostrar URLs con error 404 si las hay
    if (this.estadisticas.errores404 > 0) {
      console.log(chalk.yellow('\n⚠️ URLs CON ERROR 404:'));
      const urls404 = resultados.filter(r => r.esError404);
      urls404.forEach(r => {
        console.log(chalk.gray(`  • ${r.url}`));
      });
    }

    console.log(chalk.green.bold('\n✨ ¡Revisa el archivo PDF para ver los resultados!\n'));
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
  ScreenshotAutomationWith404Handling.manejarErroresGlobales();

  // Mostrar banner de inicio
  console.log(chalk.blue.bold('🌐 SCREENSHOT AUTOMATION TOOL (CON MANEJO DE ERRORES 404)'));
  console.log(chalk.gray('Herramienta para capturar screenshots con manejo de errores 404 y generar reportes PDF\n'));

  try {
    // Crear y ejecutar la automatización
    const automation = new ScreenshotAutomationWith404Handling();
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

export { ScreenshotAutomationWith404Handling };
