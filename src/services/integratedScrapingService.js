import { ScreenshotService } from './screenshotService.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio integrado para captura de screenshots únicamente
 * Todos los sitios: Solo Screenshots con Playwright (incluye marcas de agua)
 * NO realiza scraping de datos
 */
export class IntegratedScrapingService {
  constructor(configuracion = {}) {
    this.configuracion = {
      screenshots: {
        width: 1920,
        height: 1080,
        timeout: 120,
        concurrencia: 2
      },
      ...configuracion
    };
    
    // Solo crear el servicio de screenshots
    this.screenshotService = new ScreenshotService({...this.configuracion.screenshots, directorioSalida: "screenshots"});
    
    this.resultadosCompletos = [];
    this.inicializado = false; // Flag para evitar doble inicialización
  }

  /**
   * Inicializa el servicio de screenshots con autenticación completa
   */
  async inicializar() {
    if (this.inicializado) {
      console.log(chalk.cyan('🔄 Servicio ya inicializado, usando sesiones existentes'));
      return;
    }

    const spinner = ora('Inicializando servicio con autenticación completa...').start();
    
    try {
      // Usar inicialización completa que incluye login de Facebook e Instagram
      await this.screenshotService.inicializarConInstagram();
      
      this.inicializado = true; // Marcar como inicializado
      
      spinner.succeed('✅ Servicio inicializado con sesiones de Facebook e Instagram');
      console.log(chalk.green('🔐 Las sesiones se mantendrán durante todo el proceso'));
    } catch (error) {
      spinner.fail('❌ Error al inicializar servicio con autenticación');
      throw error;
    }
  }

  /**
   * Procesa URLs solo para capturas de pantalla (con sesiones pre-autenticadas) - OPTIMIZADO
   */
  async procesarUrls(urls) {
    console.log(chalk.blue('\n🚀 PROCESANDO URLs CON SESIONES PRE-AUTENTICADAS (MODO OPTIMIZADO)\n'));
    
    // Categorizar URLs para mostrar información
    const urlsInstagram = urls.filter(url => this.esUrlInstagram(url));
    const urlsFacebook = urls.filter(url => this.esUrlFacebook(url));
    const urlsOtros = urls.filter(url => !this.esUrlInstagram(url) && !this.esUrlFacebook(url));

    console.log(chalk.cyan(`📱 Instagram: ${urlsInstagram.length} URLs`));
    console.log(chalk.cyan(`📘 Facebook: ${urlsFacebook.length} URLs`));
    console.log(chalk.cyan(`🌐 Otros sitios: ${urlsOtros.length} URLs`));

    // 🔐 VALIDAR AUTENTICACIÓN CRÍTICA
    await this.validarAutenticacionRequerida(urlsFacebook, urlsInstagram);

    console.log(chalk.green(`✅ Validación exitosa - iniciando procesamiento optimizado`));
    console.log(chalk.yellow(`⚡ Procesamiento en paralelo + Cache + Agrupación inteligente`));

    // 🚀 PROCESAMIENTO OPTIMIZADO EN PARALELO
    const resultados = await this.procesarUrlsOptimizado(urls);

    return resultados;
  }

  /**
   * Procesamiento optimizado con paralelización y agrupación inteligente
   */
  async procesarUrlsOptimizado(urls) {
    const inicioTotal = Date.now();
    console.log(chalk.blue('\n⚡ INICIANDO PROCESAMIENTO OPTIMIZADO...\n'));

    // 1. Agrupar URLs por dominio para optimizar navegación
    const gruposPorDominio = this.agruparUrlsPorDominio(urls);
    
    // 2. Configurar paralelización inteligente
    const maxConcurrencia = Math.min(3, Math.ceil(urls.length / 5)); // Máximo 3 procesos paralelos
    console.log(chalk.cyan(`🔧 Configuración: ${maxConcurrencia} procesos paralelos`));

    // 3. Procesar grupos en paralelo
    const resultados = [];
    const gruposArray = Array.from(gruposPorDominio.entries());
    
    for (let i = 0; i < gruposArray.length; i += maxConcurrencia) {
      const loteGrupos = gruposArray.slice(i, i + maxConcurrencia);
      
      console.log(chalk.blue(`\n📦 Procesando lote ${Math.floor(i/maxConcurrencia) + 1} con ${loteGrupos.length} dominios...`));
      
      // Procesar grupos del lote en paralelo
      const promesasLote = loteGrupos.map(([dominio, urlsGrupo]) => 
        this.procesarGrupoDominio(dominio, urlsGrupo)
      );
      
      const resultadosLote = await Promise.allSettled(promesasLote);
      
      // Consolidar resultados
      for (const resultado of resultadosLote) {
        if (resultado.status === 'fulfilled') {
          resultados.push(...resultado.value);
        } else {
          console.error(chalk.red(`❌ Error en lote: ${resultado.reason}`));
        }
      }
      
      // Mostrar progreso
      const urlsProcesadas = resultados.length;
      const porcentajeTotal = Math.round((urlsProcesadas / urls.length) * 100);
      console.log(chalk.green(`✅ Progreso total: ${urlsProcesadas}/${urls.length} (${porcentajeTotal}%)`));
    }

    const tiempoTotal = ((Date.now() - inicioTotal) / 1000).toFixed(2);
    console.log(chalk.green(`\n🎉 PROCESAMIENTO COMPLETADO en ${tiempoTotal}s`));
    console.log(chalk.cyan(`📊 Velocidad promedio: ${(urls.length / tiempoTotal).toFixed(1)} URLs/segundo`));

    return resultados;
  }

  /**
   * Agrupa URLs por dominio para optimizar la navegación
   */
  agruparUrlsPorDominio(urls) {
    const grupos = new Map();
    
    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const dominio = urlObj.hostname;
        
        if (!grupos.has(dominio)) {
          grupos.set(dominio, []);
        }
        grupos.get(dominio).push(url);
      } catch (error) {
        // URL inválida, crear grupo especial
        if (!grupos.has('urls-invalidas')) {
          grupos.set('urls-invalidas', []);
        }
        grupos.get('urls-invalidas').push(url);
      }
    }
    
    // Mostrar agrupación
    console.log(chalk.cyan('\n📂 AGRUPACIÓN POR DOMINIO:'));
    for (const [dominio, urlsGrupo] of grupos) {
      console.log(chalk.gray(`  ${dominio}: ${urlsGrupo.length} URLs`));
    }
    
    return grupos;
  }

  /**
   * Procesa todas las URLs de un dominio específico de forma optimizada
   */
  async procesarGrupoDominio(dominio, urlsGrupo) {
    const inicioGrupo = Date.now();
    console.log(chalk.blue(`\n🌐 Procesando dominio: ${dominio} (${urlsGrupo.length} URLs)`));
    
    const resultados = [];
    
    try {
      // Procesar URLs del mismo dominio secuencialmente para reutilizar contexto
      for (let i = 0; i < urlsGrupo.length; i++) {
        const url = urlsGrupo[i];
        const numero = i + 1;
        
        console.log(chalk.gray(`  [${numero}/${urlsGrupo.length}] ${dominio}: Procesando...`));
        
        try {
      const resultado = await this.procesarUrlParaScreenshot(url);
      resultados.push(resultado);
          
          console.log(chalk.green(`  ✅ [${numero}/${urlsGrupo.length}] ${dominio}: Completado`));
          
        } catch (error) {
          console.error(chalk.red(`  ❌ [${numero}/${urlsGrupo.length}] ${dominio}: ${error.message}`));
          
          resultados.push({
            url: url,
            tipo: this.determinarTipoUrl(url),
            exito: false,
            screenshot: {
              exito: false,
              error: error.message,
              tipoError: 'screenshot_error'
            },
            datos: null,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      const tiempoGrupo = ((Date.now() - inicioGrupo) / 1000).toFixed(2);
      console.log(chalk.green(`✅ Dominio ${dominio} completado en ${tiempoGrupo}s`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error crítico en dominio ${dominio}: ${error.message}`));
    }

    return resultados;
  }

  /**
   * Valida que las sesiones estén autenticadas cuando hay URLs de Facebook/Instagram
   */
  async validarAutenticacionRequerida(urlsFacebook, urlsInstagram) {
    console.log(chalk.blue('\n🔐 VALIDANDO AUTENTICACIÓN REQUERIDA...\n'));
    
    let erroresAutenticacion = [];
    
    // Validar Facebook si hay URLs de Facebook
    if (urlsFacebook.length > 0) {
      console.log(chalk.cyan(`📘 Validando autenticación de Facebook (${urlsFacebook.length} URLs)...`));
      
      if (!this.screenshotService.loginRealizado.facebook) {
        erroresAutenticacion.push(`❌ Facebook NO está autenticado pero hay ${urlsFacebook.length} URLs de Facebook`);
      } else {
        console.log(chalk.green(`✅ Facebook autenticado correctamente`));
      }
    } else {
      console.log(chalk.gray(`📘 Facebook: Sin URLs, validación omitida`));
    }
    
    // Validar Instagram si hay URLs de Instagram
    if (urlsInstagram.length > 0) {
      console.log(chalk.cyan(`📱 Validando autenticación de Instagram (${urlsInstagram.length} URLs)...`));
      
      if (!this.screenshotService.loginRealizado.instagram) {
        erroresAutenticacion.push(`❌ Instagram NO está autenticado pero hay ${urlsInstagram.length} URLs de Instagram`);
      } else {
        console.log(chalk.green(`✅ Instagram autenticado correctamente`));
      }
    } else {
      console.log(chalk.gray(`📱 Instagram: Sin URLs, validación omitida`));
    }
    
    // Si hay errores de autenticación, detener la ejecución
    if (erroresAutenticacion.length > 0) {
      console.log(chalk.red('\n🚨 ERRORES CRÍTICOS DE AUTENTICACIÓN:'));
      erroresAutenticacion.forEach(error => console.log(chalk.red(`  ${error}`)));
      
      console.log(chalk.yellow('\n💡 SOLUCIONES:'));
      if (urlsFacebook.length > 0 && !this.screenshotService.loginRealizado.facebook) {
        console.log(chalk.yellow('  📘 Facebook: Verificar credenciales en FACEBOOK_CREDENTIALS'));
      }
      if (urlsInstagram.length > 0 && !this.screenshotService.loginRealizado.instagram) {
        console.log(chalk.yellow('  📱 Instagram: Verificar credenciales en INSTAGRAM_CREDENTIALS'));
      }
      
      console.log(chalk.red('\n🛑 DETENIENDO EJECUCIÓN - No se pueden procesar URLs sin autenticación\n'));
      
      // Lanzar error para detener todo el proceso
      throw new Error('Autenticación requerida fallida: ' + erroresAutenticacion.join(', '));
    }
    
    console.log(chalk.green('✅ Todas las autenticaciones requeridas están correctas\n'));
  }

  /**
   * Procesa una URL individual solo para screenshot
   */
  async procesarUrlParaScreenshot(url) {
    const tipo = this.determinarTipoUrl(url);
    
    try {
      console.log(chalk.gray(`📸 Capturando: ${url}`));
      
      // Solo capturar screenshot
      const screenshot = await this.screenshotService.capturarScreenshot(url, 0, true);
      
      return {
        url,
        tipo,
        exito: screenshot.exito,
        screenshot,
        datos: null, // No extraemos datos
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(chalk.red(`❌ Error capturando ${url}: ${error.message}`));
      
      return {
        url,
        tipo,
        exito: false,
        screenshot: {
          exito: false,
          error: error.message,
          tipoError: 'screenshot_error'
        },
        datos: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Determina el tipo de URL (instagram, facebook, otro)
   */
  determinarTipoUrl(url) {
    if (this.esUrlInstagram(url)) {
      return 'instagram';
    } else if (this.esUrlFacebook(url)) {
      return 'facebook';
    } else {
      return 'otro';
    }
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
