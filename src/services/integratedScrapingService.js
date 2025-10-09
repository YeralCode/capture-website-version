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
        concurrencia: 1  // Capturas una por una para evitar problemas
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

    console.log(chalk.green(`✅ Validación exitosa - iniciando procesamiento secuencial`));
    console.log(chalk.yellow(`🔄 Procesamiento: Una URL por vez en orden exacto del archivo`));

    // 🚀 PROCESAMIENTO SECUENCIAL EN ORDEN EXACTO
    const resultados = await this.procesarUrlsEnOrden(urls);

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
        
        // Espera entre URLs para evitar sobreposiciones (excepto en la última)
        if (i < urls.length - 1) {
          console.log(chalk.gray(`⏳ Esperando estabilización antes de la siguiente URL...`));
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ [${numero}/${total}] Error: ${error.message}`));
        
        // Agregar resultado de error para mantener el orden
        resultados.push({
          url,
          tipo: this.determinarTipoUrl(url),
          exito: false,
          error: error.message,
          screenshot: null,
          datos: null
        });
        
        // Espera también en caso de error
        if (i < urls.length - 1) {
          console.log(chalk.gray(`⏳ Esperando estabilización antes de la siguiente URL...`));
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      }
    }
    
    const tiempoTotal = Date.now() - inicioTotal;
    console.log(chalk.green(`\n🎉 PROCESAMIENTO COMPLETADO en ${(tiempoTotal / 1000).toFixed(2)}s`));
    console.log(chalk.blue(`📊 Velocidad promedio: ${(total / (tiempoTotal / 1000)).toFixed(2)} URLs/segundo`));
    
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
        
        // Espera entre cada dominio para evitar sobreposiciones
        console.log(chalk.gray('⏳ Esperando estabilización antes del siguiente dominio...'));
        await new Promise(resolve => setTimeout(resolve, 5000));
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
          
          // Espera entre URLs para evitar sobreposiciones
          if (i < urlsGrupo.length - 1) {
            console.log(chalk.gray(`  ⏳ Esperando estabilización antes de la siguiente URL...`));
            await new Promise(resolve => setTimeout(resolve, 8000));
          }
          
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
   * Procesa una URL individual con scraping Y screenshot
   */
  async procesarUrlParaScreenshot(url) {
    const tipo = this.determinarTipoUrl(url);
    
    try {
      let datosScraping = null;
      
      // Ejecutar scraping para Facebook e Instagram usando scripts de Python
      if (tipo === 'facebook') {
        console.log(chalk.cyan(`🔍 Ejecutando scraping de Facebook: ${url}`));
        datosScraping = await this.ejecutarScrapingFacebook(url);
      } else if (tipo === 'instagram') {
        console.log(chalk.cyan(`🔍 Ejecutando scraping de Instagram: ${url}`));
        datosScraping = await this.ejecutarScrapingInstagram(url);
      }
      
      // Capturar screenshot con nombre personalizado basado en la URL
      console.log(chalk.gray(`📸 Capturando screenshot: ${url}`));
      const nombreBase = this.generarNombreBaseDesdeUrl(url, tipo);
      const screenshot = await this.screenshotService.capturarScreenshot(url, 0, true, nombreBase);
      
      // Evaluar contenido basado en los datos de scraping
      const evaluacionContenido = this.evaluarContenidoBasadoEnScraping(datosScraping, tipo);
      
      return {
        url,
        tipo,
        exito: screenshot.exito,
        screenshot,
        datos: datosScraping, // Datos del scraping de Python
        evaluacionContenido, // Nueva evaluación de contenido
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(chalk.red(`❌ Error procesando ${url}: ${error.message}`));
      
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
        evaluacionContenido: { tieneContenido: false, razon: 'Error en procesamiento' },
        timestamp: new Date().toISOString()
      };
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
      
      // Extraer nombre de página de la URL
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const pageName = pathParts[0] || '';
      
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
        timeout: 60000
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
        delay: 3 // Añadir delay para evitar rate limiting
      });
      
      const comando = `${venvPython} "${scriptPath}" '${parametros}'`;
      const resultado = execSync(comando, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 90000 // Aumentar timeout para Instagram
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
   * Evalúa el contenido basado en los datos de scraping
   */
  evaluarContenidoBasadoEnScraping(datosScraping, tipo) {
    if (!datosScraping || !datosScraping.exito) {
      return {
        tieneContenido: false,
        razon: 'Scraping falló o no disponible',
        detalles: datosScraping?.error || 'Sin datos'
      };
    }

    const datos = datosScraping.datos || datosScraping;

    if (tipo === 'facebook') {
      return this.evaluarContenidoFacebook(datos);
    } else if (tipo === 'instagram') {
      return this.evaluarContenidoInstagram(datos);
    } else {
      return {
        tieneContenido: true, // Para sitios normales asumimos que tienen contenido
        razon: 'Sitio web normal',
        detalles: 'No requiere evaluación especial'
      };
    }
  }

  /**
   * Evalúa contenido específico de Facebook
   */
  evaluarContenidoFacebook(datos) {
    // Verificar si la página existe
    if (datos.pagina_existe === false) {
      return {
        tieneContenido: false,
        razon: 'Página no existe',
        detalles: 'La página de Facebook no fue encontrada'
      };
    }

    // Verificar si requiere login
    if (datos.requiere_login === true && datos.login_exitoso === false) {
      return {
        tieneContenido: false,
        razon: 'Requiere login',
        detalles: 'Página privada o requiere autenticación'
      };
    }

    // Verificar si hay posts
    const tienePosts = datos.posts_recientes && datos.posts_recientes.length > 0;
    const tieneImagenPerfil = datos.imagen_perfil_descargada === true;

    if (!tienePosts && !tieneImagenPerfil) {
      return {
        tieneContenido: false,
        razon: 'Sin contenido visible',
        detalles: 'No hay posts ni imagen de perfil disponible'
      };
    }

    return {
      tieneContenido: true,
      razon: 'Contenido disponible',
      detalles: `Posts: ${datos.posts_recientes?.length || 0}, Imagen perfil: ${tieneImagenPerfil ? 'Sí' : 'No'}`
    };
  }

  /**
   * Evalúa contenido específico de Instagram
   */
  evaluarContenidoInstagram(datos) {
    // Verificar si el usuario existe
    if (datos.usuario_existe === false) {
      return {
        tieneContenido: false,
        razon: 'Usuario no existe',
        detalles: 'El perfil de Instagram no fue encontrado'
      };
    }

    // Verificar si está bloqueado por rate limiting
    if (datos.bloqueado === true) {
      return {
        tieneContenido: false,
        razon: 'Bloqueado por rate limiting',
        detalles: 'Instagram ha bloqueado temporalmente el acceso'
      };
    }

    // Verificar si es cuenta privada
    if (datos.privado === true) {
      return {
        tieneContenido: false,
        razon: 'Cuenta privada',
        detalles: 'El perfil de Instagram es privado'
      };
    }

    // Verificar si tiene contenido (posts o imagen de perfil)
    const tienePosts = datos.posts && datos.posts.length > 0;
    const tieneImagenPerfil = datos.imagen_perfil_descargada === true;
    const tieneSeguidores = datos.followers && datos.followers !== 'N/A';

    // CASO ESPECIAL: Si no hay foto de perfil Y no hay posts = BLOQUEADA
    if (!tieneImagenPerfil && (!tienePosts || datos.mediacount === 0)) {
      return {
        tieneContenido: false,
        razon: 'Perfil bloqueado',
        detalles: 'Sin imagen de perfil y sin posts - perfil bloqueado'
      };
    }

    if (!tienePosts && !tieneImagenPerfil) {
      return {
        tieneContenido: false,
        razon: 'Sin contenido visible',
        detalles: 'No hay posts ni imagen de perfil disponible'
      };
    }

    return {
      tieneContenido: true,
      razon: 'Contenido disponible',
      detalles: `Posts: ${datos.posts?.length || 0}, Seguidores: ${datos.followers || 'N/A'}, Imagen perfil: ${tieneImagenPerfil ? 'Sí' : 'No'}`
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
