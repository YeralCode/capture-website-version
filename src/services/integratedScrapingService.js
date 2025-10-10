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
        timeout: 60,
        concurrencia: 2  // SEMI-PARALELO: 2 capturas con barra de navegación
      },
      ...configuracion
    };
    
    // Solo crear el servicio de screenshots
    this.screenshotService = new ScreenshotService({...this.configuracion.screenshots, directorioSalida: "screenshots"});
    
    this.resultadosCompletos = [];
    this.inicializado = false; // Flag para evitar doble inicialización
    this.contadorCapturas = { facebook: 0, instagram: 0 }; // Contador para rate limiting
  }

  /**
   * Limpia una URL de parámetros innecesarios (UTM, etc.) - OPTIMIZADO
   */
  limpiarUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // OPTIMIZADO: Set para búsqueda O(1)
      const parametrosAEliminar = new Set([
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'igsh', 'igshid', 'ig_web_button_share_sheet',
        'fbclid', 'mibextid', '_rdc', '_rdr'
      ]);
      
      // OPTIMIZADO: Filtrar parámetros en una pasada
      const paramsValidos = new URLSearchParams();
      for (const [key, value] of urlObj.searchParams) {
        if (!parametrosAEliminar.has(key)) {
          paramsValidos.append(key, value);
        }
      }
      
      // Reconstruir URL limpia
      const paramsStr = paramsValidos.toString();
      let urlLimpia = urlObj.origin + urlObj.pathname;
      if (paramsStr) {
        urlLimpia += '?' + paramsStr;
      }
      
      // Limpiar slash final
      urlLimpia = urlLimpia.replace(/\/$/, '');
      
      if (urlLimpia !== url) {
        console.log(chalk.cyan(`🧹 URL limpiada: ${url} → ${urlLimpia}`));
      }
      
      return urlLimpia;
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Error limpiando URL, usando original: ${error.message}`));
      return url;
    }
  }

  /**
   * Verifica rate limiting y aplica delays progresivos para evitar bloqueos
   */
  async verificarYAplicarDelay(tipo) {
    const limites = {
      facebook: { cada: 50, delay: 2000 },  // Cada 50 capturas, 2s de delay (optimizado)
      instagram: { cada: 40, delay: 3000 }  // Cada 40 capturas, 3s de delay (optimizado)
    };
    
    if (tipo === 'facebook' || tipo === 'instagram') {
      const config = limites[tipo];
      const contador = this.contadorCapturas[tipo];
      
      // Aplicar delays progresivos cada N capturas
      if (contador > 0 && contador % config.cada === 0) {
        const delaySegundos = config.delay / 1000;
        console.log(chalk.yellow(`\n⏸️  PAUSA ANTI-RATE-LIMIT: ${tipo.toUpperCase()}`));
        console.log(chalk.cyan(`   📊 Capturas procesadas: ${contador}`));
        console.log(chalk.cyan(`   ⏳ Esperando ${delaySegundos}s para evitar bloqueo...\n`));
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      
      // Advertencia cercana al límite conocido
      if (contador > 0 && contador % 50 === 0) {
        console.log(chalk.yellow(`⚠️  ADVERTENCIA: ${contador} capturas de ${tipo} - considera pausar pronto`));
      }
    }
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
    
    // OPTIMIZADO: Categorizar URLs en una sola pasada
    const categorias = urls.reduce((acc, url) => {
      if (this.esUrlInstagram(url)) {
        acc.instagram.push(url);
      } else if (this.esUrlFacebook(url)) {
        acc.facebook.push(url);
      } else {
        acc.otros.push(url);
      }
      return acc;
    }, { instagram: [], facebook: [], otros: [] });

    console.log(chalk.cyan(`📱 Instagram: ${categorias.instagram.length} URLs`));
    console.log(chalk.cyan(`📘 Facebook: ${categorias.facebook.length} URLs`));
    console.log(chalk.cyan(`🌐 Otros sitios: ${categorias.otros.length} URLs`));

    // 🔐 VALIDAR AUTENTICACIÓN CRÍTICA
    await this.validarAutenticacionRequerida(categorias.facebook, categorias.instagram);

    console.log(chalk.green(`✅ Validación exitosa - iniciando procesamiento paralelo optimizado`));
    console.log(chalk.yellow(`🚀 Procesamiento: ${this.configuracion.screenshots.concurrencia} URLs simultáneas`));

    // 🚀 PROCESAMIENTO PARALELO OPTIMIZADO
    const resultados = await this.procesarUrlsParalelo(urls);

    return resultados;
  }

  /**
   * Procesa URLs en orden secuencial exacto (sin agrupación por dominio)
   */
  async procesarUrlsEnOrden(urls) {
    const inicioTotal = Date.now();
    console.log(chalk.blue('\n📋 PROCESANDO URLs EN ORDEN SECUENCIAL EXACTO\n'));
    
    const resultados = [];
    const total = urls.length;
    
    console.log(chalk.cyan(`📊 Total de URLs a procesar: ${total}`));
    console.log(chalk.yellow(`🔄 Procesamiento: Una por una en orden exacto`));
    
    // Procesar cada URL en el orden exacto del archivo
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const numero = i + 1;
      
      console.log(chalk.blue(`\n[${numero}/${total}] Procesando: ${url}`));
      
      try {
        const resultado = await this.procesarUrlParaScreenshot(url);
        resultados.push(resultado);
        
        console.log(chalk.green(`✅ [${numero}/${total}] Completado: ${url}`));
        
        // Espera reducida entre URLs - OPTIMIZADO: 800ms en lugar de 8s
        if (i < urls.length - 1) {
          console.log(chalk.gray(`⏳ Esperando estabilización...`));
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ [${numero}/${total}] Error: ${error.message}`));
        
        // OPTIMIZADO: Usar método estandarizado
        resultados.push(this.crearResultadoError(url, error.message));
        
        // Espera reducida también en caso de error - OPTIMIZADO
        if (i < urls.length - 1) {
          console.log(chalk.gray(`⏳ Esperando estabilización...`));
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }
    
    const tiempoTotal = Date.now() - inicioTotal;
    console.log(chalk.green(`\n🎉 PROCESAMIENTO COMPLETADO en ${(tiempoTotal / 1000).toFixed(2)}s`));
    console.log(chalk.blue(`📊 Velocidad promedio: ${(total / (tiempoTotal / 1000)).toFixed(2)} URLs/segundo`));
    
    return resultados;
  }

  /**
   * Procesa URLs en paralelo con concurrencia controlada - OPTIMIZADO
   */
  async procesarUrlsParalelo(urls) {
    const inicioTotal = Date.now();
    const concurrencia = this.configuracion.screenshots.concurrencia || 5;
    
    console.log(chalk.blue(`\n⚡ PROCESAMIENTO PARALELO CON ${concurrencia} URLs SIMULTÁNEAS\n`));
    
    const resultados = [];
    const total = urls.length;
    
    // Procesar URLs en lotes paralelos
    for (let i = 0; i < urls.length; i += concurrencia) {
      const lote = urls.slice(i, i + concurrencia);
      const numeroLote = Math.floor(i / concurrencia) + 1;
      const totalLotes = Math.ceil(urls.length / concurrencia);
      
      console.log(chalk.cyan(`\n📦 Lote ${numeroLote}/${totalLotes} - Procesando ${lote.length} URLs semi-paralelo...\n`));
      
      // SEMI-PARALELO: Procesar con pequeños delays entre cada inicio
      const resultadosLote = [];
      const promesas = [];
      
      for (let idx = 0; idx < lote.length; idx++) {
        const url = lote[idx];
        const numeroGlobal = i + idx + 1;
        
        console.log(chalk.blue(`[${numeroGlobal}/${total}] Iniciando: ${url}`));
        
        // OPTIMIZADO: Iniciar procesamiento con manejo de error simplificado
        const promesa = this.procesarUrlParaScreenshot(url, true)
          .then(resultado => {
            console.log(chalk.green(`✅ [${numeroGlobal}/${total}] Completado: ${url}`));
            return resultado;
          })
          .catch(error => {
            console.error(chalk.red(`❌ [${numeroGlobal}/${total}] Error: ${error.message}`));
            return this.crearResultadoError(url, error.message);
          });
        
        promesas.push(promesa);
        
        // Delay entre inicios para que las pestañas se carguen escalonadas
        if (idx < lote.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
      
      // Esperar a que terminen todas
      const loteCompleto = await Promise.all(promesas);
      resultadosLote.push(...loteCompleto);
      resultados.push(...resultadosLote);
      
      // Pequeña pausa entre lotes para estabilidad (solo si hay más lotes)
      if (i + concurrencia < urls.length) {
        console.log(chalk.gray(`\n⏳ Pausa breve antes del siguiente lote...\n`));
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Mostrar progreso
      const urlsProcesadas = resultados.length;
      const porcentaje = Math.round((urlsProcesadas / total) * 100);
      console.log(chalk.green(`\n✅ Progreso: ${urlsProcesadas}/${total} (${porcentaje}%)`));
    }
    
    const tiempoTotal = Date.now() - inicioTotal;
    const tiempoSegundos = tiempoTotal / 1000;
    const velocidad = (total / tiempoSegundos).toFixed(2);
    
    console.log(chalk.green(`\n🎉 PROCESAMIENTO PARALELO COMPLETADO en ${tiempoSegundos.toFixed(2)}s`));
    console.log(chalk.cyan(`📊 Velocidad promedio: ${velocidad} URLs/segundo`));
    console.log(chalk.magenta(`⚡ Mejora de rendimiento: ~${concurrencia}x más rápido que secuencial`));
    
    return resultados;
  }

  /**
   * Procesamiento optimizado con paralelización y agrupación inteligente (DEPRECADO)
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
      
      // Procesar secuencialmente para evitar sobreposiciones
      const resultadosLote = [];
      for (const promesa of promesasLote) {
        const resultado = await promesa;
        resultadosLote.push({ status: 'fulfilled', value: resultado });
        
        // Espera entre cada dominio para evitar sobreposiciones (OPTIMIZADO)
        console.log(chalk.gray('⏳ Esperando estabilización antes del siguiente dominio...'));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
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
   * Agrupa URLs por dominio para optimizar la navegación (OPTIMIZADO)
   */
  agruparUrlsPorDominio(urls) {
    // OPTIMIZADO: Usar reduce para una sola pasada
    const grupos = urls.reduce((acc, url) => {
      try {
        const urlObj = new URL(url);
        const dominio = urlObj.hostname;
        
        if (!acc.has(dominio)) {
          acc.set(dominio, []);
        }
        acc.get(dominio).push(url);
      } catch (error) {
        // URL inválida, crear grupo especial
        if (!acc.has('urls-invalidas')) {
          acc.set('urls-invalidas', []);
        }
        acc.get('urls-invalidas').push(url);
      }
      return acc;
    }, new Map());
    
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
          
          // Espera entre URLs para evitar sobreposiciones (OPTIMIZADO)
          if (i < urlsGrupo.length - 1) {
            console.log(chalk.gray(`  ⏳ Esperando estabilización antes de la siguiente URL...`));
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
        } catch (error) {
          console.error(chalk.red(`  ❌ [${numero}/${urlsGrupo.length}] ${dominio}: ${error.message}`));
          
          // OPTIMIZADO: Usar método estandarizado
          resultados.push(this.crearResultadoError(url, error.message));
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
   * Procesa una URL individual con scraping Y screenshot
   * @param {string} url - URL a procesar
   * @param {boolean} modoParalelo - Si true, usa páginas independientes para cada captura
   */
  async procesarUrlParaScreenshot(url, modoParalelo = false) {
    // PASO 1: Limpiar URL de parámetros innecesarios
    const urlLimpia = this.limpiarUrl(url);
    const tipo = this.determinarTipoUrl(urlLimpia);
    
    // PASO 2: Verificar rate limiting y agregar delay progresivo
    await this.verificarYAplicarDelay(tipo);
    
    try {
      let datosScraping = null;
      
      // 🚀 OPTIMIZACIÓN: Solo scraping para Instagram (Facebook usa solo JavaScript/Playwright)
      if (tipo === 'instagram') {
        console.log(chalk.cyan(`🔍 Ejecutando scraping de Instagram: ${urlLimpia}`));
        datosScraping = await this.ejecutarScrapingInstagram(urlLimpia);
        this.contadorCapturas.instagram++;
      } else if (tipo === 'facebook') {
        console.log(chalk.cyan(`📸 Facebook: usando solo JavaScript/Playwright (sin Python)`));
        this.contadorCapturas.facebook++;
      }
      
      // Capturar screenshot con nombre personalizado basado en la URL
      console.log(chalk.gray(`📸 Capturando screenshot: ${urlLimpia}`));
      const nombreBase = this.generarNombreBaseDesdeUrl(urlLimpia, tipo);
      const screenshot = await this.screenshotService.capturarScreenshot(urlLimpia, 0, true, nombreBase, modoParalelo);
      
      // DETECTAR REDIRECCIÓN A COLJUEGOS (sitio bloqueado por autoridades colombianas)
      const urlFinal = screenshot.urlFinal || screenshot.url || urlLimpia;
      const esBloqueadoPorColjuegos = urlFinal.includes('coljuegos.gov.co');
      
      if (esBloqueadoPorColjuegos) {
        console.log(chalk.red(`🚫 SITIO BLOQUEADO POR COLJUEGOS: ${urlLimpia} → ${urlFinal}`));
        console.log(chalk.yellow(`⚠️ Este sitio de apuestas es ilegal en Colombia según Coljuegos`));
        
        // Retornar inmediatamente como bloqueado
        return {
          url: urlLimpia, // URL original
          urlFinal: urlFinal, // URL de redirección (Coljuegos)
          tipo,
          exito: false, // Marcar como no exitoso porque está bloqueado
          bloqueadoPorColjuegos: true,
          screenshot: {
            ...screenshot,
            urlOriginal: urlLimpia, // Guardar URL original
            urlRedireccion: urlFinal // URL de redirección
          },
          datos: null,
          evaluacionContenido: { 
            tieneContenido: false, 
            razon: 'Bloqueado por Coljuegos (Colombia)',
            detalles: `Sitio de apuestas ilegal redirigido a ${urlFinal}`
          },
          estado: 'BLOQUEADO_COLJUEGOS',
          timestamp: new Date().toISOString()
        };
      }
      
      // DEBUG: Verificar flags del screenshot
      if (screenshot.paginaBloqueada) {
        console.log(chalk.red(`🚫 FLAG DE BLOQUEO DETECTADO: ${screenshot.razonBloqueo}`));
      }
      
      // Evaluar contenido basado en JavaScript/Playwright (prioridad) y scraping (solo Instagram)
      const evaluacionContenido = this.evaluarContenidoBasadoEnScraping(datosScraping, tipo, screenshot.exito, screenshot);
      
      // Análisis mejorado del estado
      let estadoFinal = 'ACCESIBLE';
      let mensajeEstado = '';
      
      // FACEBOOK: Solo JavaScript/Playwright (sin Python)
      if (tipo === 'facebook') {
        if (screenshot.exito && !screenshot.paginaBloqueada) {
          estadoFinal = 'ACCESIBLE';
          mensajeEstado = 'Página ACCESIBLE (validado con JavaScript/Playwright)';
          console.log(chalk.green(`✅ ${mensajeEstado}`));
        } else if (screenshot.paginaBloqueada) {
          estadoFinal = 'BLOQUEADO';
          mensajeEstado = `Página BLOQUEADA/NO ENCONTRADA: ${screenshot.razonBloqueo}`;
          console.log(chalk.red(`🚫 ${mensajeEstado}`));
        } else {
          estadoFinal = 'ERROR';
          mensajeEstado = 'Error al acceder a la página';
          console.log(chalk.red(`❌ ${mensajeEstado}`));
        }
      }
      // INSTAGRAM: Scraping + JavaScript/Playwright
      else if (tipo === 'instagram') {
        if (screenshot.exito && (!datosScraping || !datosScraping.exito)) {
          // Screenshot OK pero scraping falló
          if (datosScraping?.datos?.es_contenido_especifico) {
            estadoFinal = 'CONTENIDO_ESPECIFICO';
            mensajeEstado = `${datosScraping.datos.tipo_contenido} específico - revisar screenshot para estado`;
          } else if (datosScraping?.datos?.requiere_login) {
            estadoFinal = 'PRIVADO';
            mensajeEstado = 'Página privada (requiere login) - EXISTE pero no es público';
          } else {
            estadoFinal = 'ACCESIBLE';
            mensajeEstado = 'Perfil ACCESIBLE (scraping falló pero screenshot OK)';
          }
          console.log(chalk.green(`✅ ${mensajeEstado}`));
        } else if (screenshot.exito && datosScraping?.exito) {
          estadoFinal = 'COMPLETO';
          mensajeEstado = 'Screenshot Y scraping exitosos';
          console.log(chalk.green(`✅ ${mensajeEstado}`));
        }
      }
      // OTROS SITIOS: Solo screenshot
      else {
        if (screenshot.exito) {
          estadoFinal = 'ACCESIBLE';
          mensajeEstado = 'Sitio ACCESIBLE';
          console.log(chalk.green(`✅ ${mensajeEstado}`));
        }
      }
      
      return {
        url: urlLimpia, // Usar URL limpia
        urlFinal: urlFinal, // URL final (puede ser diferente si hubo redirección)
        tipo,
        exito: screenshot.exito,
        bloqueadoPorColjuegos: false,
        screenshot,
        datos: datosScraping, // Datos del scraping de Python
        evaluacionContenido, // Nueva evaluación de contenido
        estado: estadoFinal, // NUEVO: estado interpretado
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(chalk.red(`❌ Error procesando ${url}: ${error.message}`));
      
      // OPTIMIZADO: Usar método estandarizado
      return this.crearResultadoError(url, error.message);
    }
  }

  /**
   * Genera un nombre base de archivo a partir de la URL
   * Ejemplos:
   *  - https://www.instagram.com/rifaregionaldelcaribe_oficial/ → "rifaregionaldelcaribe_oficial_instagram-com"
   *  - https://www.facebook.com/Bingoparatodos → "Bingoparatodos_facebook-com"
   *  - https://vavadap.casino → "vavadap-casino"
   */
  generarNombreBaseDesdeUrl(url, tipo) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostnameNorm = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
      const parts = urlObj.pathname.split('/').filter(Boolean);
      let entidad = '';
      
      if (tipo === 'instagram') {
        entidad = parts[0] || 'perfil';
        return `${entidad}_${hostnameNorm}`;
      }
      
      if (tipo === 'facebook') {
        entidad = parts[0] || 'pagina';
        return `${entidad}_${hostnameNorm}`;
      }
      
      // Otros sitios: solo dominio normalizado
      return hostnameNorm;
    } catch {
      // Fallback seguro
      return url.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'captura';
    }
  }

  /**
   * Ejecuta el scraping de Facebook usando el script de Python con cookies de sesión
   */
  async ejecutarScrapingFacebook(url) {
    try {
      const { execSync } = await import('child_process');
      const { join } = await import('path');
      const { readFileSync, existsSync } = await import('fs');
      
      
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Manejar URLs con parámetro id (ej: profile.php?id=123456)
      let pageName = pathParts[0] || '';
      
      if (pageName === 'profile.php' || pageName === 'profile') {
        // Extraer el ID del query string
        const idParam = urlObj.searchParams.get('id');
        if (idParam) {
          pageName = idParam;
          console.log(chalk.cyan(`🔍 URL con parámetro ID detectada: profile.php?id=${idParam}`));
        }
      }
      
      // Detectar si es una URL de video/post específico (puede estar eliminado)
      const esVideo = pathParts.includes('videos') || pathParts.includes('posts') || pathParts.includes('watch');
      const esPostEspecifico = pathParts.length > 1 && /^\d+$/.test(pathParts[pathParts.length - 1]);
      
      if (esVideo || esPostEspecifico) {
        console.log(chalk.yellow(`⚠️ URL de contenido específico detectada (video/post): ${url}`));
        return {
          exito: false,
          error: 'URL de contenido específico - verificar con screenshot',
          datos: {
            pagina_existe: null, // Desconocido
            es_contenido_especifico: true,
            tipo_contenido: esVideo ? 'video' : 'post',
            requiere_verificacion_visual: true
          }
        };
      }
      
      if (!pageName) {
        return { exito: false, error: 'No se pudo extraer nombre de página' };
      }
      
      const scriptPath = join(process.cwd(), 'src/scripts/python/facebook_page_scraper_simple.py');
      const venvPython = join(process.cwd(), 'venv_scraping/bin/python');
      
      // Verificar si existen cookies de Facebook
      const cookiesPath = join(process.cwd(), 'sesiones/facebook_cookies.json');
      let cookiesData = null;
      
      if (existsSync(cookiesPath)) {
        try {
          const cookiesContent = readFileSync(cookiesPath, 'utf8');
          cookiesData = JSON.parse(cookiesContent);
          console.log(chalk.green(`🍪 Usando cookies de Facebook para ${pageName}`));
        } catch (error) {
          console.log(chalk.yellow(`⚠️ Error leyendo cookies de Facebook: ${error.message}`));
        }
      } else {
        console.log(chalk.yellow(`⚠️ No se encontraron cookies de Facebook en ${cookiesPath}`));
      }
      
      const parametros = JSON.stringify({
        pageName: pageName,
        directorio: 'scraped_data',
        maxPosts: 5,
        cookies: cookiesData // Pasar las cookies al script de Python
      });
      
      const comando = `${venvPython} "${scriptPath}" '${parametros}'`;
      const resultado = execSync(comando, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000 // Reducido a 30s para Facebook (optimizado)
      });
      
      // Extraer solo la última línea JSON
      const lineas = resultado.trim().split('\n');
      const ultimaLinea = lineas[lineas.length - 1];
      const datos = JSON.parse(ultimaLinea);
      
      return datos;
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Error en scraping de Facebook: ${error.message}`));
      return { exito: false, error: error.message };
    }
  }

  /**
   * Ejecuta el scraping de Instagram usando el script de Python con cookies de sesión
   */
  async ejecutarScrapingInstagram(url) {
    try {
      const { execSync } = await import('child_process');
      const { join } = await import('path');
      const { readFileSync, existsSync } = await import('fs');
      
      // Extraer username de la URL
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const username = pathParts[0] || '';
      
      // Verificar si es un post/reel (no un perfil)
      if (pathParts.includes('p') || pathParts.includes('reel') || pathParts.includes('tv')) {
        return { 
          exito: false, 
          error: 'URL de post/reel no soportada',
          datos: { usuario_existe: false }
        };
      }
      
      if (!username) {
        return { exito: false, error: 'No se pudo extraer username' };
      }
      
      // Usar versión SIMPLE para evitar llamadas graphql y 401
      const scriptPath = join(process.cwd(), 'src/scripts/python/instagram_profile_scraper_simple.py');
      const venvPython = join(process.cwd(), 'venv_scraping/bin/python');
      
      // Verificar si existen cookies de Instagram
      const cookiesPath = join(process.cwd(), 'sesiones/instagram_cookies.json');
      let cookiesData = null;
      
      if (existsSync(cookiesPath)) {
        try {
          const cookiesContent = readFileSync(cookiesPath, 'utf8');
          cookiesData = JSON.parse(cookiesContent);
          console.log(chalk.green(`🍪 Usando cookies de Instagram para @${username}`));
        } catch (error) {
          console.log(chalk.yellow(`⚠️ Error leyendo cookies de Instagram: ${error.message}`));
        }
      } else {
        console.log(chalk.yellow(`⚠️ No se encontraron cookies de Instagram en ${cookiesPath}`));
      }
      
      const parametros = JSON.stringify({
        username: username,
        directorio: 'scraped_data',
        maxPosts: 5,
        cookies: cookiesData, // Pasar las cookies al script de Python
        delay: 1 // Reducido a 1s para velocidad (optimizado)
      });
      
      const comando = `${venvPython} "${scriptPath}" '${parametros}'`;
      const resultado = execSync(comando, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 45000 // Reducido a 45s para Instagram (optimizado)
      });
      
      // Extraer solo la última línea JSON
      const lineas = resultado.trim().split('\n');
      const ultimaLinea = lineas[lineas.length - 1];
      const datos = JSON.parse(ultimaLinea);
      
      return datos;
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Error en scraping de Instagram: ${error.message}`));
      
      // Si es error de rate limiting, devolver datos básicos
      if (error.message.includes('401') || error.message.includes('rate limit')) {
        console.log(chalk.red(`🚫 Rate limiting detectado para Instagram, usando datos básicos`));
        return {
          exito: false,
          error: 'Rate limiting - Instagram bloqueado temporalmente',
          datos: {
            usuario_existe: false,
            bloqueado: true,
            razon: 'Rate limiting'
          }
        };
      }
      
      return { exito: false, error: error.message };
    }
  }

  /**
   * Evalúa el contenido basado SOLO en el navegador JavaScript (Playwright)
   * El navegador ve el contenido REAL renderizado, es la fuente más confiable
   */
  evaluarContenidoBasadoEnScraping(datosScraping, tipo, screenshotExitoso = false, screenshot = null) {
    // ⚠️ USAR SOLO JAVASCRIPT: El navegador ve el contenido REAL renderizado
    // Python solo ve HTML inicial y tiene rate limiting
    if (screenshot && screenshot.paginaBloqueada) {
      return {
        tieneContenido: false,
        razon: 'Página bloqueada/no encontrada (detectado por navegador)',
        detalles: screenshot.razonBloqueo || 'Página no disponible'
      };
    }
    
    // Si el screenshot fue exitoso y NO está bloqueado, la página existe
    if (screenshotExitoso && screenshot && !screenshot.paginaBloqueada) {
      return {
        tieneContenido: true,
        razon: 'Página disponible (verificado por navegador)',
        detalles: 'El navegador pudo acceder y renderizar la página correctamente'
      };
    }
    
    // Si el screenshot falló completamente
    if (!screenshotExitoso) {
      return {
        tieneContenido: false,
        razon: 'No se pudo acceder a la página',
        detalles: 'El navegador no pudo cargar la página'
      };
    }
    
    // Si llegamos aquí: screenshot exitoso y NO bloqueado
    // La página existe y es accesible
    return {
      tieneContenido: true,
      razon: 'Página accesible',
      detalles: 'La página se cargó correctamente en el navegador'
    };
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
   * Crea un objeto de resultado de error estandarizado (NUEVO - evita duplicación)
   */
  crearResultadoError(url, mensajeError) {
    return {
      url,
      tipo: this.determinarTipoUrl(url),
      exito: false,
      error: mensajeError,
      screenshot: {
        exito: false,
        error: mensajeError,
        tipoError: 'screenshot_error'
      },
      datos: null,
      evaluacionContenido: { tieneContenido: false, razon: 'Error en procesamiento' },
      timestamp: new Date().toISOString()
    };
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
