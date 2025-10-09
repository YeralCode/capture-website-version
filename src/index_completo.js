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
 * ✨ VERSIÓN COMPLETA Y MEJORADA ✨
 * 
 * Combina lo mejor de:
 * - index_integrated.js (scraping + capturas FB/IG)
 * - index_scraping_pdf.js (scraping detallado)
 * 
 * CARACTERÍSTICAS:
 * 1. Scraping real de Facebook/Instagram para evaluar contenido
 * 2. Capturas de pantalla de TODAS las URLs (FB, IG, normales)
 * 3. Evaluación inteligente de contenido
 * 4. PDF completo con análisis + capturas
 * 5. Configuración fácil de archivos de URLs
 */
class AutomacionCompletaScrapingCapturas {
  constructor(configuracionPersonalizada = {}) {
    const configEnv = obtenerConfiguracionDesdeEnv();
    this.configuracion = fusionarConfiguracion({
      ...configEnv,
      ...configuracionPersonalizada,
      scraping: {
        directorioSalida: 'scraped_data',
        maxPosts: 10,
        incluirComentarios: false,
        incluirReacciones: true
      },
      screenshots: {
        concurrencia: 1  // UNA POR UNA - evita que se dañen las capturas
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
      conScraping: 0,
      conCapturas: 0,
      conContenidoValidado: 0,
      tiempoTotal: 0
    };
  }

  /**
   * Inicializa los servicios necesarios
   */
  async inicializar() {
    const spinner = ora('🚀 Inicializando sistema completo...').start();
    
    try {
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

      this.integratedService = new IntegratedScrapingService(this.configuracion);
      this.pdfGenerator = new PDFGenerator();

      spinner.succeed('✅ Servicios inicializados');
      
      // Inicializar sesiones de FB/IG si hay URLs de redes sociales
      console.log(chalk.blue('\n🔐 PREPARANDO AUTENTICACIÓN...\n'));
      await this.inicializarSesiones();
      
      this.mostrarConfiguracion();
      
    } catch (error) {
      spinner.fail('❌ Error al inicializar');
      console.error(chalk.red(error.message));
      throw error;
    }
  }

  /**
   * Inicializa las sesiones de Facebook e Instagram
   */
  async inicializarSesiones() {
    const spinner = ora('🔐 Iniciando sesiones de redes sociales...').start();
    
    try {
      await this.integratedService.inicializar();
      
      spinner.succeed('✅ Sesiones listas');
      console.log(chalk.green('🎉 Facebook e Instagram autenticados'));
      console.log(chalk.cyan('📸 Las capturas evitarán pantallas de login'));
      console.log(chalk.cyan('🔄 Scraping real disponible para redes sociales\n'));
      
    } catch (error) {
      spinner.warn('⚠️ Autenticación limitada');
      console.log(chalk.yellow('Las capturas de FB/IG pueden mostrar login'));
      console.log(chalk.gray('Continuando con procesamiento básico...\n'));
    }
  }

  /**
   * Ejecuta el proceso completo
   */
  async ejecutar() {
    this.estadisticas.inicioEjecucion = new Date();
    
    try {
      console.log(chalk.blue.bold('\n🌐 SISTEMA COMPLETO: SCRAPING + CAPTURAS + PDF\n'));
      
      // Paso 1: Cargar URLs
      const urls = await this.cargarUrls();
      this.estadisticas.totalUrls = urls.length;

      if (urls.length === 0) {
        console.log(chalk.yellow('⚠️ No se encontraron URLs para procesar'));
        return;
      }

      // Paso 2: Mostrar análisis previo
      this.analizarUrls(urls);

      // Paso 3: Procesar URLs (scraping + capturas)
      let resultados = await this.procesarUrlsCompleto(urls);

      // Paso 3.1: Forzar el orden original según el archivo de entrada
      const indicePorUrl = new Map();
      urls.forEach((u, idx) => indicePorUrl.set(u.trim(), idx));
      // Algunas URLs se normalizan con https://; asegurar clave equivalente
      urls.forEach((u, idx) => {
        if (!u.startsWith('http')) {
          indicePorUrl.set(`https://${u.trim()}`, idx);
        }
      });
      resultados = resultados.map(r => ({
        ...r,
        ordenEntrada: indicePorUrl.has(r.url) ? indicePorUrl.get(r.url) : Number.MAX_SAFE_INTEGER
      })).sort((a, b) => a.ordenEntrada - b.ordenEntrada);

      // Paso 4: Generar PDF completo (con el orden original)
      const rutaPdf = await this.generarReportePDF(resultados);

      // Paso 4.1: Generar archivo de trabajo CSV con la tabla ordenada
      await this.generarWorkCSV(resultados);

      // Paso 5: Guardar JSON con datos
      await this.guardarResultadosJSON(resultados);

      // Paso 6: Mostrar resumen final
      this.mostrarResumenFinal(resultados, rutaPdf);

    } catch (error) {
      console.error(chalk.red('\n❌ Error durante la ejecución:'), error.message);
      if (this.configuracion?.logging?.nivel === 'debug') {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    } finally {
      this.estadisticas.finEjecucion = new Date();
      this.estadisticas.tiempoTotal = this.estadisticas.finEjecucion - this.estadisticas.inicioEjecucion;
      
      if (this.integratedService) {
        await this.integratedService.cerrar();
      }
    }
  }

  /**
   * Carga las URLs desde archivos configurados
   */
  async cargarUrls() {
    const spinner = ora('📋 Cargando URLs...').start();
    
    try {
      // 🎯 CONFIGURA AQUÍ TUS ARCHIVOS DE URLs
      const archivosUrls = [
        // Descomentar los que quieras usar:
        '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',  // Redes sociales
        // '1203_SITIOS_WEB_11_2024.txt',                      // Sitios web normales
        // 'urls_prueba.txt',                                  // URLs de prueba
        // 'test-scraping-urls.txt',                           // URLs de test
      ];

      const urls = await cargarMultiplesArchivosUrls(archivosUrls);
      spinner.succeed(chalk.green(`✅ Cargadas ${urls.length} URLs de ${archivosUrls.length} archivo(s)`));
      return urls;
    } catch (error) {
      spinner.fail('❌ Error al cargar URLs');
      throw error;
    }
  }

  /**
   * Analiza las URLs antes de procesar
   */
  analizarUrls(urls) {
    console.log(chalk.blue('\n🔍 ANÁLISIS DE URLs\n'));
    
    const urlsInstagram = urls.filter(url => url.includes('instagram.com'));
    const urlsFacebook = urls.filter(url => url.includes('facebook.com'));
    const urlsNormales = urls.filter(url => 
      !url.includes('instagram.com') && !url.includes('facebook.com')
    );
    
    console.log(chalk.cyan('📊 DISTRIBUCIÓN:'));
    console.log(chalk.gray(`  📱 Instagram: ${urlsInstagram.length} URLs (scraping + capturas)`));
    console.log(chalk.gray(`  📘 Facebook: ${urlsFacebook.length} URLs (scraping + capturas)`));
    console.log(chalk.gray(`  🌐 Sitios normales: ${urlsNormales.length} URLs (solo capturas)`));
    console.log(chalk.gray(`  📋 Total: ${urls.length} URLs\n`));
  }

  /**
   * Procesa URLs con scraping Y capturas
   */
  async procesarUrlsCompleto(urls) {
    console.log(chalk.blue('\n⚙️ PROCESANDO URLs (SCRAPING + CAPTURAS)\n'));
    console.log(chalk.cyan('Este proceso incluye:'));
    console.log(chalk.gray('  1. Scraping de datos (FB/IG)'));
    console.log(chalk.gray('  2. Capturas de pantalla (TODAS)'));
    console.log(chalk.gray('  3. Evaluación de contenido'));
    console.log(chalk.gray('  4. Validación automática\n'));
    
    // Procesar con el servicio integrado
    const resultados = await this.integratedService.procesarUrls(urls);

    // Evaluar y enriquecer resultados
    for (const resultado of resultados) {
      // Evaluar si tiene contenido real
      resultado.tieneContenido = this.evaluarContenido(resultado);
      
      // Calcular confianza
      resultado.confianza = this.calcularConfianza(resultado);
      
      // Actualizar estadísticas
      if (resultado.exito) {
        this.estadisticas.urlsExitosas++;
      } else {
        this.estadisticas.urlsFallidas++;
      }
      
      if (resultado.datos?.exito) {
        this.estadisticas.conScraping++;
      }
      
      if (resultado.screenshot?.exito) {
        this.estadisticas.conCapturas++;
      }
      
      if (resultado.tieneContenido) {
        this.estadisticas.conContenidoValidado++;
      }
    }

    return resultados;
  }

  /**
   * Evalúa si un resultado tiene contenido real
   */
  evaluarContenido(resultado) {
    // Para Facebook e Instagram con scraping
    if (resultado.tipo === 'facebook' || resultado.tipo === 'instagram') {
      if (resultado.datos?.exito && resultado.datos?.datos) {
        const datos = resultado.datos.datos;
        
        // Indicadores positivos
        let positivos = 0;
        let negativos = 0;
        
        if (resultado.tipo === 'facebook') {
          if (datos.pagina_existe === true) positivos++;
          if (datos.imagen_perfil_descargada === true) positivos++;
          if (datos.titulo && datos.titulo !== 'Facebook') positivos++;
          if (datos.descripcion) positivos++;
          
          if (datos.pagina_existe === false) negativos++;
          if (datos.requiere_login === true) negativos++;
          if (datos.error) negativos++;
        } else {
          if (datos.usuario_existe === true) positivos++;
          if (datos.imagen_perfil_descargada === true) positivos++;
          if (datos.followers > 0) positivos++;
          if (datos.mediacount > 0) positivos++;
          
          if (datos.usuario_existe === false) negativos++;
          if (datos.login_requerido === true) negativos++;
          if (datos.error) negativos++;
        }
        
        return positivos > negativos;
      }
    }
    
    // Para URLs normales o sin scraping, evaluar por captura
    if (resultado.screenshot?.exito) {
      // Capturas > 10KB generalmente tienen contenido
      return resultado.screenshot.tamanio > 10000;
    }
    
    return false;
  }

  /**
   * Calcula el nivel de confianza del resultado
   */
  calcularConfianza(resultado) {
    let confianza = 0;
    
    // Base: tiene screenshot exitoso
    if (resultado.screenshot?.exito) {
      confianza += 40;
      
      // Tamaño de captura razonable
      if (resultado.screenshot.tamanio > 10000) {
        confianza += 20;
      }
    }
    
    // Scraping exitoso (solo FB/IG)
    if (resultado.datos?.exito) {
      confianza += 30;
      
      // Datos válidos extraídos
      if (resultado.datos.datos) {
        confianza += 10;
      }
    }
    
    return Math.min(100, confianza);
  }

  /**
   * Genera el reporte PDF completo
   */
  async generarReportePDF(resultados) {
    console.log(chalk.blue('\n📄 GENERANDO PDF COMPLETO\n'));
    
    const spinner = ora('Creando PDF con análisis + capturas...').start();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nombreArchivo = `reporte-completo-${timestamp}.pdf`;
      
      // Preparar datos enriquecidos para el PDF
      const datosParaPDF = resultados.map(resultado => ({
        url: resultado.url,
        tipo: resultado.tipo,
        exito: resultado.exito,
        timestamp: resultado.timestamp,
        tieneContenido: resultado.tieneContenido,
        confianza: resultado.confianza,
        screenshot: resultado.screenshot,
        datosScraping: resultado.datos,
        resumen: this.generarResumen(resultado)
      }));
      
      const rutaPdf = await this.pdfGenerator.generarPDF(datosParaPDF, nombreArchivo);
      
      spinner.succeed(chalk.green('✅ PDF completo generado'));
      return rutaPdf;
      
    } catch (error) {
      spinner.fail('❌ Error al generar PDF');
      throw error;
    }
  }

  /**
   * Guarda resultados en JSON
   */
  async guardarResultadosJSON(resultados) {
    const spinner = ora('💾 Guardando datos en JSON...').start();
    
    try {
      const { promises: fs } = await import('fs');
      const timestamp = new Date().toISOString().split('T')[0];
      const nombreJSON = `resultados-completo-${timestamp}.json`;
      
      await fs.writeFile(nombreJSON, JSON.stringify(resultados, null, 2));
      
      spinner.succeed(chalk.green(`✅ JSON guardado: ${nombreJSON}`));
    } catch (error) {
      spinner.warn(chalk.yellow('⚠️ No se pudo guardar JSON'));
    }
  }

  /**
   * Genera un archivo CSV de trabajo con la tabla ordenada
   */
  async generarWorkCSV(resultados) {
    const { promises: fs } = await import('fs');
    const { join } = await import('path');
    const encabezados = ['indice','url','tipo','bloqueado','archivo_captura'];
    const filas = [encabezados.join(',')];

    for (const r of resultados) {
      const evaluacion = this.pdfGenerator?.evaluarContenidoExigente ? this.pdfGenerator.evaluarContenidoExigente(r) : (r.tieneContenido ? 'OK' : 'No');
      const bloqueado = evaluacion === 'OK' ? 'No' : 'Sí';
      const archivo = r.screenshot?.nombreArchivo || '';
      const linea = [
        (typeof r.ordenEntrada === 'number' ? r.ordenEntrada + 1 : ''),
        JSON.stringify(r.url),
        (r.tipo || '').toUpperCase(),
        bloqueado,
        JSON.stringify(archivo)
      ].join(',');
      filas.push(linea);
    }

    const contenido = filas.join('\n') + '\n';
    const ruta = join('output', 'work_reporte.csv');
    await fs.mkdir('output', { recursive: true });
    await fs.writeFile(ruta, contenido, 'utf-8');
    console.log(chalk.white(`🧩 Work CSV generado: ${ruta}`));
  }

  /**
   * Genera un resumen del resultado
   */
  generarResumen(resultado) {
    const resumen = {
      url: resultado.url,
      tipo: resultado.tipo,
      exito: resultado.exito,
      tieneContenido: resultado.tieneContenido,
      confianza: resultado.confianza
    };

    if (resultado.datos?.exito) {
      resumen.datosExtraidos = true;
      resumen.tipoScraping = resultado.tipo;
    }

    if (resultado.screenshot?.exito) {
      resumen.captura = {
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
    console.log(chalk.cyan('\n⚙️ CONFIGURACIÓN DEL SISTEMA:\n'));
    console.log(chalk.green('  ✅ Scraping: Facebook + Instagram'));
    console.log(chalk.green('  ✅ Capturas: Todas las URLs (una por una)'));
    console.log(chalk.green('  ✅ Evaluación: Automática de contenido'));
    console.log(chalk.gray(`  • Resolución: ${this.configuracion.screenshots.width}x${this.configuracion.screenshots.height}`));
    console.log(chalk.gray(`  • Timeout: ${this.configuracion.screenshots.timeout}s`));
    console.log(chalk.gray(`  • Concurrencia: ${this.configuracion.screenshots.concurrencia} (una por una)`));
    console.log(chalk.gray(`  • Directorio capturas: screenshots/`));
    console.log(chalk.gray(`  • Directorio output: output/\n`));
  }

  /**
   * Muestra el resumen final
   */
  mostrarResumenFinal(resultados, rutaPdf) {
    const porcentajeExito = ((this.estadisticas.urlsExitosas / this.estadisticas.totalUrls) * 100).toFixed(1);
    const porcentajeContenido = ((this.estadisticas.conContenidoValidado / this.estadisticas.totalUrls) * 100).toFixed(1);
    const tiempoMinutos = (this.estadisticas.tiempoTotal / 1000 / 60).toFixed(2);

    // Estadísticas por tipo
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    console.log(chalk.green.bold('\n🎉 PROCESO COMPLETADO EXITOSAMENTE\n'));
    
    console.log(chalk.cyan('📊 ESTADÍSTICAS GENERALES:'));
    console.log(chalk.gray(`  Total procesadas: ${this.estadisticas.totalUrls} URLs`));
    console.log(chalk.green(`  Exitosas: ${this.estadisticas.urlsExitosas} (${porcentajeExito}%)`));
    console.log(chalk.yellow(`  Con contenido validado: ${this.estadisticas.conContenidoValidado} (${porcentajeContenido}%)`));
    console.log(chalk.blue(`  Con scraping: ${this.estadisticas.conScraping}`));
    console.log(chalk.blue(`  Con capturas: ${this.estadisticas.conCapturas}`));
    console.log(chalk.gray(`  Tiempo total: ${tiempoMinutos} minutos\n`));

    console.log(chalk.cyan('📱 INSTAGRAM:'));
    console.log(chalk.gray(`  URLs: ${instagram.length}`));
    console.log(chalk.green(`  Exitosos: ${instagram.filter(r => r.exito).length}`));
    console.log(chalk.yellow(`  Con contenido: ${instagram.filter(r => r.tieneContenido).length}`));
    console.log(chalk.blue(`  Con scraping: ${instagram.filter(r => r.datos?.exito).length}`));
    console.log(chalk.blue(`  Con capturas: ${instagram.filter(r => r.screenshot?.exito).length}\n`));

    console.log(chalk.cyan('📘 FACEBOOK:'));
    console.log(chalk.gray(`  URLs: ${facebook.length}`));
    console.log(chalk.green(`  Exitosos: ${facebook.filter(r => r.exito).length}`));
    console.log(chalk.yellow(`  Con contenido: ${facebook.filter(r => r.tieneContenido).length}`));
    console.log(chalk.blue(`  Con scraping: ${facebook.filter(r => r.datos?.exito).length}`));
    console.log(chalk.blue(`  Con capturas: ${facebook.filter(r => r.screenshot?.exito).length}\n`));

    console.log(chalk.cyan('🌐 SITIOS NORMALES:'));
    console.log(chalk.gray(`  URLs: ${otros.length}`));
    console.log(chalk.green(`  Exitosos: ${otros.filter(r => r.exito).length}`));
    console.log(chalk.yellow(`  Con contenido: ${otros.filter(r => r.tieneContenido).length}`));
    console.log(chalk.blue(`  Con capturas: ${otros.filter(r => r.screenshot?.exito).length}\n`));

    console.log(chalk.magenta('📄 ARCHIVOS GENERADOS:'));
    console.log(chalk.white(`  ${rutaPdf}`));
    const timestamp = new Date().toISOString().split('T')[0];
    console.log(chalk.white(`  resultados-completo-${timestamp}.json\n`));

    console.log(chalk.green.bold('✨ ¡Revisa el PDF y el JSON para ver los resultados completos!\n'));
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
  AutomacionCompletaScrapingCapturas.manejarErroresGlobales();

  console.log(chalk.blue.bold('🌐 SISTEMA COMPLETO DE SCRAPING + CAPTURAS + PDF'));
  console.log(chalk.gray('Scraping de FB/IG + Capturas de TODO + Evaluación Inteligente\n'));

  try {
    const automation = new AutomacionCompletaScrapingCapturas();
    await automation.inicializar();
    await automation.ejecutar();
    
  } catch (error) {
    console.error(chalk.red('❌ Error fatal:'), error.message);
    process.exit(1);
  }
}

// Ejecutar
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AutomacionCompletaScrapingCapturas };

