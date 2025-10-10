#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { cargarMultiplesArchivosUrls, filtrarUrlsValidas } from './utils/urlLoader.js';
import { IntegratedScrapingService } from './services/integratedScrapingService.js';
import { PDFGenerator } from './services/pdfGenerator.js';
import { WordGenerator } from './services/wordGenerator.js';
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
    this.wordGenerator = null;
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
      
      // 🔐 INICIALIZAR SESIONES DE FACEBOOK E INSTAGRAM
      console.log(chalk.blue('\n🔐 PREPARANDO SESIONES DE AUTENTICACIÓN...\n'));
      await this.inicializarSesionesCompletas();
      
      // Mostrar configuración
      this.mostrarConfiguracion();
      
    } catch (error) {
      spinner.fail('❌ Error al inicializar servicios');
      console.error(chalk.red(error.message));
      throw error;
    }
  }

  /**
   * Inicializa las sesiones de Facebook e Instagram antes del procesamiento
   */
  async inicializarSesionesCompletas() {
    const spinner = ora('🔐 Iniciando sesiones de Facebook e Instagram...').start();
    
    try {
      // Usar el método específico de inicialización completa del servicio integrado
      await this.integratedService.inicializar();
      
      spinner.succeed('✅ Sesiones de Facebook e Instagram listas');
      console.log(chalk.green('🎉 ¡Ambas plataformas autenticadas!'));
      console.log(chalk.cyan('📘 Facebook: Autenticado con credenciales principales'));
      console.log(chalk.cyan('📱 Instagram: Autenticado directamente (sin Facebook Connect)'));
      console.log(chalk.cyan('🚀 Las capturas irán directamente al contenido sin mostrar login'));
      console.log(chalk.cyan('🔄 Las sesiones se mantendrán durante todo el proceso\n'));
      
    } catch (error) {
      spinner.fail('❌ Error al inicializar sesiones');
      console.log(chalk.yellow('⚠️ Continuando sin autenticación completa...'));
      console.log(chalk.gray('Las capturas de Facebook/Instagram pueden mostrar pantallas de login\n'));
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

      // Paso 2: Filtrar URLs válidas (OPTIMIZADO: Desactivado por defecto para mayor velocidad)
      // La validación HTTP previa ralentiza el proceso, se hace validación al capturar
      const urlsFinales = this.configuracion.red?.validarUrls === true ? 
        await this.validarUrls(urls) : urls;

      // Paso 2.5: Mostrar análisis de URLs y autenticación requerida
      await this.analizarUrlsYAutenticacion(urlsFinales);

      // Paso 3: Procesar URLs con scraping y capturas
      const resultados = await this.procesarUrls(urlsFinales);

      // Paso 4: Generar reportes con datos extraídos y screenshots (OPTIMIZADO)
      // Preparar datos una sola vez para ambos formatos
      console.log(chalk.blue('\n📊 PREPARANDO DATOS PARA REPORTES...\n'));
      const datosReporte = this.prepararDatosParaPDF(resultados);
      
      const rutaPdf = await this.generarReportePDF(resultados, datosReporte);
      const rutaDocx = await this.generarReporteWord(resultados, datosReporte);

      // Paso 5: Mostrar resumen final
      this.mostrarResumenFinal(resultados, rutaPdf, rutaDocx);

    } catch (error) {
      console.error(chalk.red('\n❌ Error durante la ejecución:'), error.message);
      
      // Error específico de autenticación
      if (error.message.includes('Autenticación requerida fallida')) {
        console.log(chalk.red('\n🚨 PROBLEMA DE AUTENTICACIÓN DETECTADO'));
        console.log(chalk.yellow('💡 ACCIONES RECOMENDADAS:'));
        console.log(chalk.yellow('  1. Verificar que las credenciales estén correctas'));
        console.log(chalk.yellow('  2. Verificar conexión a internet'));
        console.log(chalk.yellow('  3. Revisar si Facebook/Instagram requieren verificación adicional'));
        console.log(chalk.yellow('  4. Intentar ejecutar solo con URLs normales (sin FB/IG)'));
      }
      
      if (this.configuracion?.logging?.nivel === 'debug') {
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
      // Puede ser string simple o { archivo, protocolo } para especificar HTTP/HTTPS
      const archivosUrls = [
        // URLs de redes sociales (HTTPS por defecto)
        // '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
        
        // URLs de sitios web (HTTP - sitios de casinos/apuestas)
        { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' },
        
        // Otros archivos (comentados)
        // 'urls_test_login.txt',        // URLs de prueba para login
        // 'urls_test_final.txt',        // URLs de prueba final
        // 'urls_prueba.txt',
        // '2415 sitios web_dic_2024.txt'
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
   * Analiza las URLs y verifica si la autenticación es suficiente (OPTIMIZADO)
   */
  async analizarUrlsYAutenticacion(urls) {
    console.log(chalk.blue('\n🔍 ANÁLISIS DE URLs Y AUTENTICACIÓN REQUERIDA\n'));
    
    // Categorizar URLs (OPTIMIZADO: Una sola pasada)
    const categorias = urls.reduce((acc, url) => {
      if (url.includes('instagram.com')) {
        acc.instagram++;
      } else if (url.includes('facebook.com')) {
        acc.facebook++;
      } else {
        acc.otros++;
      }
      return acc;
    }, { instagram: 0, facebook: 0, otros: 0 });
    
    // Mostrar resumen
    console.log(chalk.cyan('📊 RESUMEN DE URLs:'));
    console.log(chalk.gray(`  📱 Instagram: ${categorias.instagram} URLs`));
    console.log(chalk.gray(`  📘 Facebook: ${categorias.facebook} URLs`));
    console.log(chalk.gray(`  🌐 Otros sitios: ${categorias.otros} URLs`));
    console.log(chalk.gray(`  📋 Total: ${urls.length} URLs\n`));
    
    // Verificar autenticación requerida
    const requiereAuth = categorias.facebook > 0 || categorias.instagram > 0;
    
    if (requiereAuth) {
      console.log(chalk.yellow('🔐 AUTENTICACIÓN REQUERIDA:'));
      if (categorias.facebook > 0) {
        console.log(chalk.yellow(`  📘 Facebook: Requerido para ${categorias.facebook} URLs`));
      }
      if (categorias.instagram > 0) {
        console.log(chalk.yellow(`  📱 Instagram: Requerido para ${categorias.instagram} URLs`));
      }
      console.log(chalk.blue('\n🔄 La validación de autenticación se realizará antes del procesamiento...'));
    } else {
      console.log(chalk.green('✅ No se requiere autenticación especial (solo URLs normales)'));
    }
    
    if (categorias.otros > 0) {
      console.log(chalk.cyan(`🌐 URLs normales: ${categorias.otros} se procesarán directamente\n`));
    }
  }

  /**
   * Procesa URLs con scraping y capturas (OPTIMIZADO - sesiones ya están iniciadas)
   */
  async procesarUrls(urls) {
    console.log(chalk.blue('\n📸 PROCESANDO URLs CON SESIONES PRE-AUTENTICADAS\n'));
    console.log(chalk.cyan('🔐 Facebook e Instagram ya están autenticados'));
    console.log(chalk.cyan('⚡ Las capturas serán más rápidas sin login repetido\n'));
    
    const resultados = await this.integratedService.procesarUrls(urls);

    // Actualizar estadísticas (OPTIMIZADO: Una sola pasada)
    const stats = resultados.reduce((acc, r) => {
      if (r.exito) acc.exitosas++;
      else acc.fallidas++;
      return acc;
    }, { exitosas: 0, fallidas: 0 });

    this.estadisticas.urlsExitosas = stats.exitosas;
    this.estadisticas.urlsFallidas = stats.fallidas;

    return resultados;
  }

  /**
   * Genera el reporte PDF con datos extraídos y screenshots (OPTIMIZADO)
   * @param {Array} resultados - Resultados del procesamiento
   * @param {Array} datosPreparados - Datos ya preparados (opcional, para evitar duplicación)
   */
  async generarReportePDF(resultados, datosPreparados = null) {
    console.log(chalk.blue('\n📄 GENERANDO REPORTE PDF INTEGRADO\n'));
    
    const spinner = ora('Generando PDF con datos extraídos...').start();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `reporte-integrado-${timestamp}.pdf`;
      
      // OPTIMIZADO: Usar datos preparados si están disponibles
      const datosParaPDF = datosPreparados || this.prepararDatosParaPDF(resultados);
      
      spinner.text = `Generando PDF con ${datosParaPDF.length} resultados...`;
      const rutaPdf = await this.pdfGenerator.generarPDF(datosParaPDF, nombreArchivo);
      
      spinner.succeed(chalk.green(`✅ PDF integrado generado: ${datosParaPDF.length} páginas`));
      return rutaPdf;
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Error al generar PDF: ' + error.message));
      console.error(chalk.gray('Se intentará continuar sin PDF...'));
      return null; // Continuar sin PDF si falla
    }
  }

  /**
   * Genera el reporte Word con datos extraídos y screenshots (OPTIMIZADO)
   * @param {Array} resultados - Resultados del procesamiento
   * @param {Array} datosPreparados - Datos ya preparados (opcional, para evitar duplicación)
   */
  async generarReporteWord(resultados, datosPreparados = null) {
    console.log(chalk.blue('\n📝 GENERANDO REPORTE WORD (.docx)\n'));
    
    const spinner = ora('Generando Word con datos extraídos...').start();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `reporte-integrado-${timestamp}.docx`;
      
      // OPTIMIZADO: Usar datos preparados si están disponibles
      const datosParaWord = datosPreparados || this.prepararDatosParaPDF(resultados);
      
      spinner.text = `Generando Word con ${datosParaWord.length} resultados...`;
      const rutaDocx = await this.wordGenerator.generarDOCX(datosParaWord, nombreArchivo);
      
      spinner.succeed(chalk.green(`✅ Word integrado generado: ${datosParaWord.length} páginas`));
      return rutaDocx;
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Error al generar Word: ' + error.message));
      console.error(chalk.gray('Se intentará continuar sin Word...'));
      return null; // Continuar sin Word si falla
    }
  }

  /**
   * Prepara los datos para el PDF incluyendo screenshots y datos extraídos (OPTIMIZADO)
   */
  prepararDatosParaPDF(resultados) {
    return resultados.map(resultado => {
      const datosBase = {
        url: resultado.url,
        tipo: resultado.tipo,
        exito: resultado.exito,
        timestamp: resultado.timestamp,
        screenshot: resultado.screenshot,
        datosScraping: resultado.datos,
        evaluacionContenido: resultado.evaluacionContenido, // NUEVO: Incluir evaluación de contenido
        resumen: {
          url: resultado.url,
          tipo: resultado.tipo,
          exito: resultado.exito
        }
      };

      // Agregar datos específicos de scraping al resumen
      if (resultado.datos?.exito) {
        if (resultado.tipo === 'instagram') {
          datosBase.resumen.datosInstagram = {
            username: resultado.datos.datos?.username,
            followers: resultado.datos.datos?.followers,
            posts: resultado.datos.datos?.posts?.length || 0
          };
        } else if (resultado.tipo === 'facebook') {
          datosBase.resumen.datosFacebook = {
            pageName: resultado.datos.datos?.pageName,
            posts: resultado.datos.datos?.posts?.length || 0
          };
        }
      }

      // Agregar info de screenshot al resumen
      if (resultado.screenshot?.exito) {
        datosBase.resumen.screenshot = {
          archivo: resultado.screenshot.nombreArchivo,
          tamanio: resultado.screenshot.tamanio
        };
      }

      return datosBase;
    });
  }

  /**
   * Muestra la configuración actual
   */
  mostrarConfiguracion() {
    console.log(chalk.cyan('\n⚙️ CONFIGURACIÓN INTEGRADA:'));
    console.log(chalk.green(`  🔐 Autenticación: Facebook + Instagram iniciadas automáticamente`));
    console.log(chalk.green(`  📸 Capturas: Con barra de navegador real visible`));
    console.log(chalk.gray(`  • Instagram: Screenshots con login directo`));
    console.log(chalk.gray(`  • Facebook: Screenshots con sesión pre-autenticada`));
    console.log(chalk.gray(`  • Otros sitios: Screenshots directas`));
    console.log(chalk.gray(`  • Resolución: ${this.configuracion.screenshots.width}x${this.configuracion.screenshots.height}`));
    console.log(chalk.gray(`  • Timeout: ${this.configuracion.screenshots.timeout}s`));
    console.log(chalk.gray(`  • Concurrencia: ${this.configuracion.screenshots.concurrencia}`));
    console.log(chalk.gray(`  • Directorio screenshots: ${this.configuracion.archivos?.directorioScreenshots || 'screenshots'}`));
    console.log(chalk.gray(`  • Directorio output: ${this.configuracion.archivos?.directorioOutput || 'output'}`));
  }

  /**
   * Muestra el resumen final de la ejecución (OPTIMIZADO)
   */
  mostrarResumenFinal(resultados, rutaPdf, rutaDocx) {
    const porcentajeExito = ((this.estadisticas.urlsExitosas / this.estadisticas.totalUrls) * 100).toFixed(1);
    const tiempoMinutos = (this.estadisticas.tiempoTotal / 1000 / 60).toFixed(2);

    // Estadísticas por tipo (OPTIMIZADO: Una sola pasada con reduce)
    const stats = resultados.reduce((acc, r) => {
      if (!acc[r.tipo]) {
        acc[r.tipo] = { total: 0, exitosos: 0, conDatos: 0, conScreenshots: 0 };
      }
      acc[r.tipo].total++;
      if (r.exito) acc[r.tipo].exitosos++;
      if (r.datos?.exito) acc[r.tipo].conDatos++;
      if (r.screenshot?.exito) acc[r.tipo].conScreenshots++;
      return acc;
    }, {});

    console.log(chalk.green.bold('\n🎉 PROCESO INTEGRADO COMPLETADO\n'));
    console.log(chalk.cyan('📊 ESTADÍSTICAS FINALES:'));
    console.log(chalk.gray(`  • Total URLs procesadas: ${this.estadisticas.totalUrls}`));
    console.log(chalk.green(`  • Exitosos: ${this.estadisticas.urlsExitosas}`));
    console.log(chalk.red(`  • Fallidos: ${this.estadisticas.urlsFallidas}`));
    console.log(chalk.yellow(`  • Porcentaje de éxito: ${porcentajeExito}%`));
    console.log(chalk.blue(`  • Tiempo total: ${tiempoMinutos} minutos`));
    console.log(chalk.magenta(`  • PDF generado: ${rutaPdf}`));
    console.log(chalk.magenta(`  • Word generado: ${rutaDocx}`));

    // Mostrar estadísticas por tipo (si existen)
    if (stats.instagram) {
      const ig = stats.instagram;
      console.log(chalk.cyan('\n📱 INSTAGRAM (SCRAPING + SCREENSHOTS):'));
      console.log(chalk.gray(`  • URLs: ${ig.total}`));
      console.log(chalk.green(`  • Exitosos: ${ig.exitosos}`));
      console.log(chalk.blue(`  • Con datos extraídos: ${ig.conDatos}`));
      console.log(chalk.blue(`  • Con screenshots: ${ig.conScreenshots}`));
    }

    if (stats.facebook) {
      const fb = stats.facebook;
      console.log(chalk.cyan('\n📘 FACEBOOK (SCRAPING + SCREENSHOTS):'));
      console.log(chalk.gray(`  • URLs: ${fb.total}`));
      console.log(chalk.green(`  • Exitosos: ${fb.exitosos}`));
      console.log(chalk.blue(`  • Con datos extraídos: ${fb.conDatos}`));
      console.log(chalk.blue(`  • Con screenshots: ${fb.conScreenshots}`));
    }

    if (stats.otro) {
      const otros = stats.otro;
      console.log(chalk.cyan('\n🌐 OTROS SITIOS (SOLO SCREENSHOTS):'));
      console.log(chalk.gray(`  • URLs: ${otros.total}`));
      console.log(chalk.green(`  • Exitosos: ${otros.exitosos}`));
      console.log(chalk.blue(`  • Con screenshots: ${otros.conScreenshots}`));
    }

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
