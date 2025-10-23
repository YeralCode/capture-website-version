import captureWebsite from 'capture-website';
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import https from 'https';
import http from 'http';

/**
 * Credenciales para login automático en Facebook
 */
const FACEBOOK_CREDENTIALS = {
  username: "3022159238",
  password: "6897861Yps@"
};

/**
 * Credenciales específicas para login automático en Instagram
 */
const INSTAGRAM_CREDENTIALS = {
  username: "ypulido2004@gmail.com",
  password: "6897861Yps@"
};

/**ea 1 minuto desp
 * Rutas para guardar cookies de sesión persistentes
 */
const COOKIES_DIR = join(process.cwd(), 'sesiones');
const FACEBOOK_COOKIES_FILE = join(COOKIES_DIR, 'facebook_cookies.json');
const INSTAGRAM_COOKIES_FILE = join(COOKIES_DIR, 'instagram_cookies.json');

/**
 * Guarda las cookies de una sesión en un archivo
 */
async function guardarCookies(context, archivo) {
  try {
    // Crear directorio si no existe
    await fs.mkdir(COOKIES_DIR, { recursive: true });
    
    // Obtener cookies del contexto
    const cookies = await context.cookies();
    
    // Guardar cookies en archivo JSON
    await fs.writeFile(archivo, JSON.stringify(cookies, null, 2));
    console.log(`✅ Cookies guardadas en: ${archivo}`);
    return true;
  } catch (error) {
    console.log(`⚠️ Error guardando cookies: ${error.message}`);
    return false;
  }

}

/**
 * Carga cookies desde un archivo al contexto
 */
async function cargarCookies(context, archivo) {
  try {
    if (!existsSync(archivo)) {
      console.log(`📝 No se encontraron cookies guardadas en: ${archivo}`);
      return false;
    }
    
    // Leer cookies del archivo
    const cookiesData = await fs.readFile(archivo, 'utf-8');
    const cookies = JSON.parse(cookiesData);
    
    // Agregar cookies al contexto
    await context.addCookies(cookies);
    console.log(`✅ Cookies cargadas desde: ${archivo}`);
    return true;
  } catch (error) {
    console.log(`⚠️ Error cargando cookies: ${error.message}`);
    return false;
  }
}

/**
 * Verifica el estado HTTP de una URL (solo para URLs normales, NO Facebook/Instagram)
 * @param {string} url - URL a verificar
 * @returns {Promise<{estado: string, mensaje: string}>}
 */
async function verificarUrlHttp(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        // Permitir certificados auto-firmados
        rejectUnauthorized: false
      };

      const req = client.request(options, (res) => {
        const statusCode = res.statusCode;
        const location = res.headers.location;
        
        if (200 <= statusCode && statusCode < 300) {
          resolve({
            estado: "Activo", 
            mensaje: `Responde ${statusCode}${location ? ` (redirige a ${location})` : ''}`
          });
        } else if (300 <= statusCode && statusCode < 400) {
          resolve({
            estado: "Redirige", 
            mensaje: `Redirige a ${location || 'URL desconocida'}`
          });
        } else if (400 <= statusCode && statusCode < 500) {
          resolve({
            estado: "Inactivo", 
            mensaje: `Error cliente ${statusCode}`
          });
        } else if (500 <= statusCode && statusCode < 600) {
          resolve({
            estado: "Error servidor", 
            mensaje: `Error ${statusCode}`
          });
        } else {
          resolve({
            estado: "Desconocido", 
            mensaje: `Código ${statusCode}`
          });
        }
      });

      req.on('error', (error) => {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          resolve({
            estado: "Sin respuesta", 
            mensaje: "No se puede conectar al servidor"
          });
        } else if (error.code === 'ETIMEDOUT') {
          resolve({
            estado: "Sin respuesta", 
            mensaje: "Tiempo de espera agotado"
          });
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          resolve({
            estado: "Error SSL", 
            mensaje: "Certificado no válido"
          });
        } else {
          resolve({
            estado: "Error", 
            mensaje: error.message
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          estado: "Sin respuesta", 
          mensaje: "Tiempo de espera agotado"
        });
      });

      req.setTimeout(10000);
      req.end();

    } catch (error) {
      resolve({
        estado: "Error", 
        mensaje: error.message
      });
    }
  });
}

/**
 * Realiza login automático en Facebook usando las credenciales - VERSIÓN PERSISTENTE CON ESPERA EXTENDIDA
 */
async function realizarLoginFacebookPersistente(page) {
  try {
    console.log('🔐 Realizando login automático en Facebook...');
    
    // Configurar cookies básicas para evitar verificación
    await page.context().addCookies([
      {
        name: 'locale',
        value: 'es_ES',
        domain: '.facebook.com',
        path: '/'
      },
      {
        name: 'dpr',
        value: '1',
        domain: '.facebook.com',
        path: '/'
      }
    ]);
    
    // Navegar directamente a página principal primero para obtener cookies
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Buscar campos de login en la página principal
    let emailField = await page.$('input[name="email"]');
    let passwordField = await page.$('input[name="pass"]');
    
    // Si no están en la página principal, ir a la página de login móvil (menos verificaciones)
    if (!emailField || !passwordField) {
      console.log('📱 Navegando a página de login móvil (evita verificaciones)...');
      await page.goto('https://m.facebook.com/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Esperar campos de login con múltiples selectores
      try {
        await page.waitForSelector('input[name="email"], input[data-testid="royal_email"]', { timeout: 10000 });
      } catch {
        console.log('⚠️ No se encontraron campos de login');
        return false;
      }
      
      emailField = await page.$('input[name="email"]') || await page.$('input[data-testid="royal_email"]');
      passwordField = await page.$('input[name="pass"]') || await page.$('input[data-testid="royal_pass"]');
    }
    
    if (!emailField || !passwordField) {
      console.log('❌ No se encontraron campos de email/contraseña');
      return false;
    }
    
    console.log('📝 Rellenando credenciales...');
    
    // Limpiar y rellenar email de manera más humana
    await emailField.click();
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
    
    // Escribir email caracter por caracter
    for (const char of FACEBOOK_CREDENTIALS.username) {
      await page.keyboard.type(char);
      await page.waitForTimeout(50 + Math.random() * 50); // Delay aleatorio
    }
    
    await page.waitForTimeout(500);
    
    // Limpiar y rellenar contraseña
    await passwordField.click();
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
    
    // Escribir contraseña caracter por caracter
    for (const char of FACEBOOK_CREDENTIALS.password) {
      await page.keyboard.type(char);
      await page.waitForTimeout(50 + Math.random() * 50); // Delay aleatorio
    }
    
    await page.waitForTimeout(1000);
    
    console.log('🚪 Enviando login...');
    
    // Buscar botón de login con múltiples selectores
    const loginButton = await page.$('button[name="login"]') || 
                       await page.$('input[type="submit"]') || 
                       await page.$('button[data-testid="royal_login_button"]') ||
                       await page.$('button:has-text("Iniciar sesión")') ||
                       await page.$('button:has-text("Log in")');
    
    if (loginButton) {
      await loginButton.click();
    } else {
      // Fallback: presionar Enter
      await page.keyboard.press('Enter');
    }
    
    // ⏰ ESPERA EXTENDIDA DE 60 SEGUNDOS PARA INTERVENCIÓN MANUAL
    console.log(chalk.yellow('⏰ Esperando 60 segundos para permitir intervención manual (captcha, verificación, etc.)...'));
    console.log(chalk.cyan('   Si necesitas resolver un captcha o verificación, hazlo ahora.'));
    
    for (let i = 60; i > 0; i--) {
      process.stdout.write(`\r   ⏳ Tiempo restante: ${i} segundos...`);
      await page.waitForTimeout(1000);
    }
    console.log('\n');
    
    // Verificar si el login fue exitoso
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    console.log(`🔍 URL actual después del login: ${currentUrl}`);
    
    // Verificar si está en verificación de dos pasos
    const requiereVerificacion = currentUrl.includes('two_step_verification') || 
                                currentUrl.includes('checkpoint') ||
                                pageContent.includes('two_step_verification') ||
                                pageContent.includes('checkpoint');
    
    // Verificar indicadores de login exitoso (página principal/feed, NO verificación)
    const loginCompletamenteExitoso = !requiereVerificacion && (
                                     currentUrl.includes('home.php') || 
                                     currentUrl.includes('feed') || 
                                     currentUrl.includes('facebook.com/?') ||
                                     (currentUrl.includes('facebook.com') && !currentUrl.includes('login')) ||
                                     pageContent.includes('data-testid="search"') ||
                                     pageContent.includes('feed') ||
                                     pageContent.includes('navigation')
                                     );
    
    // Verificar indicadores de fallo de login
    const loginFallo = currentUrl.includes('login') || 
                      pageContent.includes('Correo electrónico o teléfono') ||
                      pageContent.includes('Contraseña') ||
                      pageContent.includes('Iniciar sesión') ||
                      pageContent.includes('Log in');
    
    // 💾 GUARDAR COOKIES SIEMPRE (incluso si el login es parcial)
    // Esto permite reutilizar la sesión en futuras ejecuciones
    await guardarCookies(page.context(), FACEBOOK_COOKIES_FILE);
    
    if (loginCompletamenteExitoso && !loginFallo) {
      console.log('✅ Login de Facebook completamente exitoso - acceso completo');
      console.log('💾 Cookies guardadas para futuras sesiones');
      return true;
    } else if (requiereVerificacion) {
      console.log('⚠️ Facebook requiere verificación de dos pasos - login parcial');
      console.log('💾 Cookies guardadas - la sesión se reutilizará en futuras ejecuciones');
      console.log('🔄 Continuando con la sesión actual...');
      return true; // Cambiar a true para que considere que hay sesión
    } else if (loginFallo) {
      console.log('❌ Login de Facebook falló - aún en página de login');
      console.log('💾 Cookies guardadas (aunque el login falló, podrían ser útiles)');
      return false;
    } else {
      console.log('🔄 Estado de login incierto - guardando sesión para reintentar');
      console.log('💾 Cookies guardadas para futuras sesiones');
      return true; // Cambiar a true para intentar usar esta sesión
    }
    
  } catch (error) {
    console.log(`❌ Error durante login de Facebook: ${error.message}`);
    return false;
  }
}

/**
 * Realiza login directo en Instagram con credenciales específicas - CON ESPERA EXTENDIDA
 */
async function realizarLoginInstagramDirecto(page) {
  try {
    console.log('🔑 Realizando login directo en Instagram...');
    
    // Navegar a página de login de Instagram
    await page.goto('https://www.instagram.com/accounts/login/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log('📝 Rellenando credenciales de Instagram...');
    
    // Esperar a que aparezcan los campos de login
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // Rellenar campos con las credenciales específicas de Instagram
    await page.fill('input[name="username"]', INSTAGRAM_CREDENTIALS.username);
    await page.waitForTimeout(300);
    
    await page.fill('input[name="password"]', INSTAGRAM_CREDENTIALS.password);
    await page.waitForTimeout(300);
    
    // Hacer click en login
    console.log('🚀 Enviando credenciales de Instagram...');
    await page.click('button[type="submit"]');
    
    // ⏰ ESPERA EXTENDIDA DE 60 SEGUNDOS PARA INTERVENCIÓN MANUAL
    console.log(chalk.yellow('⏰ Esperando 60 segundos para permitir intervención manual (captcha, verificación, etc.)...'));
    console.log(chalk.cyan('   Si necesitas resolver un captcha o verificación, hazlo ahora.'));
    
    for (let i = 60; i > 0; i--) {
      process.stdout.write(`\r   ⏳ Tiempo restante: ${i} segundos...`);
      await page.waitForTimeout(1000);
    }
    console.log('\n');
    
    // Verificar si el login fue exitoso
    const currentUrl = page.url();
    console.log(`📍 URL después del login: ${currentUrl}`);
    
    // 💾 GUARDAR COOKIES SIEMPRE (incluso si el login es parcial)
    await guardarCookies(page.context(), INSTAGRAM_COOKIES_FILE);
    
    if (currentUrl.includes('instagram.com/') && !currentUrl.includes('login') && !currentUrl.includes('accounts/login')) {
      console.log('✅ Login directo de Instagram exitoso');
      
      // Intentar saltarse verificaciones adicionales si las hay
      try {
        const skipButtons = [
          'button:has-text("Ahora no")',
          'button:has-text("Not Now")', 
          'button:has-text("No, gracias")',
          'button[class*="not-now"]',
          'button:has-text("Omitir")'
        ];
        
        for (const selector of skipButtons) {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForTimeout(1000);
            console.log('⏩ Saltando verificación adicional...');
            break;
          }
        }
      } catch (e) {
        // Ignorar errores al saltar verificaciones
      }
      
      console.log('💾 Cookies guardadas para futuras sesiones');
      return true;
    } else if (currentUrl.includes('challenge')) {
      console.log('⚠️ Instagram requiere verificación de seguridad');
      console.log('💾 Cookies guardadas - la sesión se reutilizará en futuras ejecuciones');
      return true; // Cambiar a true para intentar usar la sesión
    } else {
      console.log('⚠️ Login de Instagram no completado o requiere pasos adicionales');
      console.log('💾 Cookies guardadas para futuras sesiones');
      return true; // Cambiar a true para intentar usar la sesión
    }
    
  } catch (error) {
    console.log(`⚠️ Error durante login directo de Instagram: ${error.message}`);
    return false;
  }
}

/**
 * Configuración por defecto para las capturas de pantalla
 */
const CONFIGURACION_DEFECTO = {
  width: 1920,
  height: 1080,
  scaleFactor: 1,
  format: 'png',
  quality: 0.9,
  fullPage: false,
  timeout: 30, // Reducir timeout para sitios que no respondan
  delay: 8, // Aumentar delay para mejor carga y evitar sobreposiciones
  waitForElement: null,
  usarNavegadorReal: true, // ¡NUEVA OPCIÓN! true = navegador real visible, false = simulado
  hideElements: [
    '.cookie-banner',
    '.cookie-notice',
    '#cookie-consent',
    '.gdpr-banner',
    '.cookie-popup',
    '.privacy-banner',
    '[id*="cookie"]',
    '[class*="cookie"]',
    '[class*="gdpr"]'
  ],
  blockAds: true,
  darkMode: false,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
};

/**
 * Configuración de Playwright optimizada para Ubuntu 23.10+ con AppArmor
 * Configurada para obtener screenshots de alta calidad como navegador real
 */
// Configuración para navegador REAL visible CON barra de navegación
const PLAYWRIGHT_OPTIONS_REAL = {
  headless: false, // ¡NAVEGADOR REAL VISIBLE!
  slowMo: 100,     // Pausa entre acciones (reducido para velocidad)
  args: [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--no-first-run',
    '--disable-default-apps',
    '--show-toolbar',           // Mostrar barra de herramientas
    '--disable-infobars',       // Quitar barras de información molestas
    '--window-size=1920,1080',  // Tamaño fijo de ventana
    '--force-device-scale-factor=1'
  ],
  // Configuración para que se vea la barra completa
  devtools: false
};

// Configuración headless para casos donde no se puede usar navegador visible
const PLAYWRIGHT_OPTIONS_HEADLESS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
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
    '--disable-client-side-phishing-detection',
    '--disable-popup-blocking',
    '--disable-translate',
    '--disable-windows10-custom-titlebar',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-blink-features=AutomationControlled',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--force-device-scale-factor=1',
    '--high-dpi-support=1'
  ]
};

/**
 * Servicio para capturar screenshots de sitios web
 */
export class ScreenshotService {
  constructor(configuracion = {}) {
    this.configuracion = { ...CONFIGURACION_DEFECTO, ...configuracion };
    this.browser = null;
    this.sessionContext = null; // Contexto para mantener sesiones de FB/IG
    this.paginaActiva = null; // Única pestaña persistente
    this.loginRealizado = {
      facebook: false,
      instagram: false
    };
    this.estadisticas = {
      exitosas: 0,
      fallidas: 0,
      errores404: 0,
      erroresConexion: 0,
      otrosErrores: 0,
      paginasNoDisponibles: 0, // Contador para páginas con error de conexión
      tamanioTotal: 0,
      // NUEVAS estadísticas de verificación HTTP
      verificacionesHttp: {
        activas: 0,
        redirige: 0,
        inactivas: 0,
        errorServidor: 0,
        sinRespuesta: 0,
        errorSSL: 0,
        otros: 0
      }
    };
  }

  /**
   * Obtiene o crea una única pestaña persistente para toda la sesión (MODO SECUENCIAL)
   */
  async obtenerPagina() {
    if (this.paginaActiva && !this.paginaActiva.isClosed()) {
      return this.paginaActiva;
    }
    this.paginaActiva = await this.sessionContext.newPage();
    if (!this.configuracion.usarNavegadorReal) {
      await this.paginaActiva.setViewportSize({
        width: this.configuracion.width,
        height: this.configuracion.height + 100
      });
    }
    return this.paginaActiva;
  }

  /**
   * Crea una nueva página independiente para procesamiento paralelo
   */
  async crearPaginaNueva() {
    const nuevaPagina = await this.sessionContext.newPage();
    if (!this.configuracion.usarNavegadorReal) {
      await nuevaPagina.setViewportSize({
        width: this.configuracion.width,
        height: this.configuracion.height + 100
      });
    }
    return nuevaPagina;
  }

  /**
   * Normaliza una URL agregando protocolo si no lo tiene y corrigiendo URLs malformadas
   */
  normalizarUrl(url) {
    // Limpiar espacios
    url = url.trim();
    
    // Corregir URLs malformadas de Facebook que faltan "/"
    if (url.includes('facebook.com') && !url.includes('facebook.com/')) {
      // Detectar patterns como "facebook.comNombrePagina"
      url = url.replace(/facebook\.com([A-Za-z])/g, 'facebook.com/$1');
      console.log(`🔧 URL de Facebook corregida: ${url}`);
    }
    
    // Corregir URLs malformadas de Instagram que faltan "/"
    if (url.includes('instagram.com') && !url.includes('instagram.com/')) {
      // Detectar patterns como "instagram.comNombrePagina"
      url = url.replace(/instagram\.com([A-Za-z])/g, 'instagram.com/$1');
      console.log(`🔧 URL de Instagram corregida: ${url}`);
    }
    
    // Si ya tiene protocolo, devolverla tal como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Agregar https:// por defecto
    return `https://${url}`;
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
   * Inicializa el servicio con login automático completo de Facebook e Instagram
   */
  async inicializarConInstagram() {
    try {
      console.log('🚀 Inicializando ScreenshotService con autenticación completa...');
      
      // Inicializar normalmente primero
      await this.inicializar();
      
      // Inicializar Playwright específicamente
      await this.inicializarPlaywrightConRetry();
      
      // 🍪 CARGAR COOKIES GUARDADAS INMEDIATAMENTE AL CONTEXTO
      console.log('\n🔐 Cargando sesiones guardadas...');
      const facebookCargado = await cargarCookies(this.sessionContext, FACEBOOK_COOKIES_FILE);
      const instagramCargado = await cargarCookies(this.sessionContext, INSTAGRAM_COOKIES_FILE);
      
      // Verificar si las sesiones cargadas son válidas
      let facebookValido = false;
      let instagramValido = false;
      
      if (facebookCargado) {
        console.log('🔍 Verificando sesión de Facebook...');
        facebookValido = await this.verificarSesionFacebook();
        if (facebookValido) {
          console.log(chalk.green('✅ Sesión de Facebook válida - no se requiere login'));
          this.loginRealizado.facebook = true;
        } else {
          console.log(chalk.yellow('⚠️ Sesión de Facebook expirada'));
        }
      }
      
      if (instagramCargado) {
        console.log('🔍 Verificando sesión de Instagram...');
        instagramValido = await this.verificarSesionInstagram();
        if (instagramValido) {
          console.log(chalk.green('✅ Sesión de Instagram válida - no se requiere login'));
          this.loginRealizado.instagram = true;
        } else {
          console.log(chalk.yellow('⚠️ Sesión de Instagram expirada'));
        }
      }
      
      // Solo hacer login si las sesiones NO son válidas
      if (!facebookValido) {
        console.log('\n🔐 PASO 1: Autenticando Facebook...');
        await this.realizarLoginFacebookInicial();
      }
      
      if (!instagramValido) {
        console.log('\n📱 PASO 2: Autenticando Instagram directamente...');
        await this.prepararLoginInstagramDirecto();
      }
      
      console.log('\n📊 RESUMEN DE SESIONES:');
      console.log(`  ✅ Facebook: ${this.loginRealizado.facebook ? 'Autenticado' : 'No autenticado'}`);
      console.log(`  ✅ Instagram: ${this.loginRealizado.instagram ? 'Conectado' : 'No conectado'}`);
      
      if (this.loginRealizado.facebook && this.loginRealizado.instagram) {
        console.log(chalk.green('\n🎉 ¡PERFECTO! Ambas sesiones listas para capturas'));
        console.log(chalk.cyan('💾 Las sesiones están guardadas y se reutilizarán en futuras ejecuciones'));
      } else {
        console.log(chalk.yellow('\n⚠️ Algunas sesiones pueden requerir intervención manual'));
      }
      
      console.log(chalk.green('✅ ScreenshotService completamente inicializado'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error al inicializar ScreenshotService:'), error.message);
      throw error;
    }
  }

  /**
   * Realiza login inicial de Facebook (usado por inicializarConInstagram)
   */
  async realizarLoginFacebookInicial() {
    if (this.loginRealizado.facebook) {
      console.log('🔄 Facebook ya autenticado anteriormente');
      return true;
    }

    try {
      console.log('🔐 Realizando login manual en Facebook...');
      const paginaFacebook = await this.obtenerPagina();
      
      const loginExitoso = await realizarLoginFacebookPersistente(paginaFacebook);
      
      this.loginRealizado.facebook = true;
      
      if (loginExitoso) {
        console.log(chalk.green('✅ Login de Facebook completado y sesión guardada'));
        return true;
      } else {
        console.log(chalk.yellow('⚠️ Login de Facebook parcial, sesión guardada para reintentar'));
        return false;
      }
      
    } catch (error) {
      console.log(`⚠️ Error en login inicial de Facebook: ${error.message}`);
      this.loginRealizado.facebook = true; // Marcar para evitar reintentos
      return false;
    }
  }

  /**
   * Prepara login directo de Instagram con credenciales específicas
   */
  async prepararLoginInstagramDirecto() {
    if (this.loginRealizado.instagram) {
      console.log('🔄 Login de Instagram ya realizado anteriormente');
      return true;
    }

    try {
      console.log('🔐 Realizando login manual en Instagram...');
      const paginaInstagram = await this.obtenerPagina();
      
      // Login directo con credenciales específicas de Instagram
      const loginExitoso = await realizarLoginInstagramDirecto(paginaInstagram);
      
      // Marcar como realizado independientemente del resultado
      this.loginRealizado.instagram = true;
      
      if (loginExitoso) {
        console.log(chalk.green('✅ Instagram autenticado y sesión guardada'));
        return true;
      } else {
        console.log(chalk.yellow('⚠️ Instagram login parcial, sesión guardada para reintentar'));
        return false;
      }
      
    } catch (error) {
      console.log(`⚠️ Error en login directo de Instagram: ${error.message}`);
      this.loginRealizado.instagram = true; // Marcar para evitar reintentos
      return false;
    }
  }

  /**
   * Verifica si la sesión de Facebook cargada es válida
   */
  async verificarSesionFacebook() {
    try {
      const paginaTest = await this.obtenerPagina();
      await paginaTest.goto('https://www.facebook.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await paginaTest.waitForTimeout(1500);
      
      const urlActual = paginaTest.url();
      const contenido = await paginaTest.content();
      const sesionValida = !urlActual.includes('login') && 
                          !contenido.includes('name="email"') &&
                          !contenido.includes('Iniciar sesión en Facebook') &&
                          !contenido.includes('Log in to Facebook');
      
      // Reutilizar pestaña
      return sesionValida;
    } catch (error) {
      console.log(`⚠️ Error verificando sesión de Facebook: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica si la sesión de Instagram cargada es válida
   */
  async verificarSesionInstagram() {
    try {
      const paginaTest = await this.obtenerPagina();
      await paginaTest.goto('https://www.instagram.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await paginaTest.waitForTimeout(1500);
      
      const urlActual = paginaTest.url();
      const contenido = await paginaTest.content();
      const sesionValida = !urlActual.includes('accounts/login') && 
                          !urlActual.includes('login') &&
                          !contenido.includes('name="username"') &&
                          !contenido.includes('name="password"') &&
                          !contenido.includes('Iniciar sesión') &&
                          !contenido.includes('Log in') &&
                          !contenido.includes('Teléfono, usuario o correo electrónico');
      
      // Reutilizar pestaña
      return sesionValida;
    } catch (error) {
      console.log(`⚠️ Error verificando sesión de Instagram: ${error.message}`);
      return false;
    }
  }

  /**
   * Inicializa Playwright con retry - puede usar navegador real o simulado
   */
  async inicializarPlaywrightConRetry(maxIntentos = 3) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        const modoNavegador = this.configuracion.usarNavegadorReal ? 'NAVEGADOR REAL VISIBLE' : 'simulado (headless)';
        console.log(`Iniciando Playwright en modo ${modoNavegador} (intento ${intento}/${maxIntentos})...`);
        
        // Elegir configuración según el modo
        const opciones = this.configuracion.usarNavegadorReal ? 
          PLAYWRIGHT_OPTIONS_REAL : 
          PLAYWRIGHT_OPTIONS_HEADLESS;
        
        this.browser = await chromium.launch(opciones);
        
        // Crear contexto persistente para mantener sesiones
        if (this.configuracion.usarNavegadorReal) {
          // En navegador real, no establecer viewport para permitir que se vea la barra
          this.sessionContext = await this.browser.newContext({
            viewport: null // Usar viewport del navegador real
          });
        } else {
          // En modo simulado, usar viewport específico
          this.sessionContext = await this.browser.newContext({
            viewport: { 
              width: this.configuracion.width, 
              height: this.configuracion.height 
            }
          });
        }
        
        console.log(`✅ Playwright inicializado correctamente en modo ${modoNavegador}`);
        console.log(`🔄 Contexto de sesión creado para mantener logins`);
        return true;
    } catch (error) {
        console.log(`❌ Error en intento ${intento}: ${error.message}`);
        
        // Si falla el navegador real, intentar con headless como fallback
        if (this.configuracion.usarNavegadorReal && intento === 1) {
          console.log('🔄 Intentando con modo headless como fallback...');
          this.configuracion.usarNavegadorReal = false;
        }
        
        if (intento === maxIntentos) {
          throw new Error(`No se pudo inicializar Playwright después de ${maxIntentos} intentos: ${error.message}`);
        }
        
        // Esperar un poco antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Captura screenshot usando Playwright - SIEMPRE toma screenshot incluso en errores
   */
  async capturarConPlaywright(url, rutaCompleta, usarPaginaNueva = false) {
    if (!this.browser) {
      await this.inicializarPlaywrightConRetry();
    }

    let page;
    let huboError = false;
    let mensajeError = null;
    let paginaCreada = false; // Flag para saber si cerramos la página al final
    let urlFinal = url; // Capturar URL final después de redirecciones
    
    try {
      // Normalizar URL (agregar protocolo si no lo tiene)
      const urlNormalizada = this.normalizarUrl(url);
      
      // Modo paralelo: crear página nueva | Modo secuencial: reutilizar página
      if (usarPaginaNueva) {
        page = await this.crearPaginaNueva();
        paginaCreada = true;
      } else {
        page = await this.obtenerPagina();
      }
      
      // Configurar viewport solo en modo simulado
      if (!this.configuracion.usarNavegadorReal) {
        // En modo simulado, agregar espacio para el marco
      await page.setViewportSize({
        width: this.configuracion.width, 
          height: this.configuracion.height + 100 // Espacio extra para la barra del navegador
      });
      }
      // En navegador real, no configurar viewport para mantener el tamaño natural

      // Detectar si es Facebook o Instagram PRIMERO
      const esFacebook = urlNormalizada.includes('facebook.com');
      const esInstagram = urlNormalizada.includes('instagram.com');
      
      // 🔍 VERIFICACIÓN HTTP PREVIA para URLs normales (NO Facebook/Instagram)
      let verificacionHttp = null;
      if (!esFacebook && !esInstagram) {
        console.log(`🔍 Verificando estado HTTP de URL normal: ${urlNormalizada}`);
        verificacionHttp = await verificarUrlHttp(urlNormalizada);
        console.log(`📊 Estado HTTP: ${verificacionHttp.estado} - ${verificacionHttp.mensaje}`);
        
        // Si la URL no está activa, informar pero continuar con la captura
        if (verificacionHttp.estado !== 'Activo' && verificacionHttp.estado !== 'Redirige') {
          console.log(`⚠️ URL no está activa (${verificacionHttp.estado}), pero continuando con captura...`);
        }
      } else {
        console.log(`🚫 Saltando verificación HTTP para ${esFacebook ? 'Facebook' : 'Instagram'} (requiere navegación completa)`);
      }
      
      // Configurar headers especiales para Facebook
      let headers = { ...this.configuracion.headers };
      
      if (esFacebook) {
        // Headers de computador para Facebook (mejor detección de páginas no encontradas)
        headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        };
        console.log('💻 Usando headers de computador para Facebook');
      } else if (esInstagram) {
        // Headers optimizados para Instagram móvil
        headers = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1'
        };
        console.log('📱 Usando headers iPhone para Instagram');
      }
      
      await page.setExtraHTTPHeaders(headers);
      let loginExitoso = false;
      
      // Verificar sesiones persistentes (ya deben estar autenticadas)
      if (esFacebook) {
        if (!this.loginRealizado.facebook) {
          console.log(`🔑 Facebook no autenticado, realizando login...`);
          loginExitoso = await realizarLoginFacebookPersistente(page);
          this.loginRealizado.facebook = true;
          if (loginExitoso) {
            console.log(`✅ Login de Facebook exitoso`);
          } else {
            console.log(`⚠️ Login de Facebook parcial`);
          }
        } else {
          console.log(`✅ Facebook: Usando sesión pre-autenticada`);
          loginExitoso = true;
        }
      } else if (esInstagram) {
        if (!this.loginRealizado.instagram) {
          console.log(`📱 Instagram no autenticado, realizando login directo...`);
          
          // Login directo con credenciales específicas
          loginExitoso = await realizarLoginInstagramDirecto(page);
          
          this.loginRealizado.instagram = true;
          if (loginExitoso) {
            console.log(`✅ Instagram autenticado con credenciales directas`);
          } else {
            console.log(`⚠️ Instagram login falló`);
          }
        } else {
          console.log(`✅ Instagram: Usando sesión pre-autenticada`);
          loginExitoso = true;
        }
      }
      
      // Para Facebook e Instagram, usar versiones más confiables para screenshots
      let urlObjetivo = urlNormalizada;
      if (esFacebook) {
        // Usar versión normal de Facebook (mejor para detectar páginas no encontradas)
        // NO convertir a mbasic para que muestre errores de páginas no encontradas
        console.log(`💻 Usando versión de computador de Facebook: ${urlObjetivo}`);
      } else if (esInstagram) {
        // Para Instagram, usar la URL normal pero con estrategia especial
        console.log(`📱 Usando Instagram con detección de login: ${urlObjetivo}`);
      }
      
      console.log(`🌐 Navegando a página objetivo: ${urlObjetivo}`);
      
      let navegacionExitosa = false;
      
            // Para Facebook e Instagram, usar estrategias específicas
      if (esFacebook) {
        try {
          console.log(`🎯 Navegando a Facebook versión computador: ${urlObjetivo}`);
          await page.goto(urlObjetivo, { 
        waitUntil: 'domcontentloaded',
            timeout: 20000 
          });
          
          // Esperar tiempo adicional para que el contenido básico se cargue
          console.log(`⏳ Esperando carga completa del contenido básico...`);
          await page.waitForTimeout(3000);
          
          // Verificar la URL actual después de la navegación
          const urlActual = page.url();
          const contenidoPagina = await page.content();
          
          console.log(`🔍 URL objetivo: ${urlObjetivo}`);
          console.log(`🔍 URL actual: ${urlActual}`);
          
          // Verificar si Facebook redirigió a la página principal (perfil no encontrado)
          const fueRedirigidoAPaginaPrincipal = (
            urlActual.includes('facebook.com/?') ||
            urlActual.includes('facebook.com/home') ||
            urlActual.includes('facebook.com/feed') ||
            (urlActual === 'https://www.facebook.com/' && !urlObjetivo.endsWith('/')) ||
            urlActual.includes('facebook.com/login') ||
            urlActual.includes('facebook.com/unsupportedbrowser')
          );
          
          // ⚠️ NUEVO: Detectar redirección interna con parámetro _rdr (ej: m.facebook → www.facebook)
          // Si hay _rdr en la URL + mensaje de error = perfil bloqueado
          const tieneParametroRedireccion = urlActual.includes('_rdr') || urlActual.includes('_rdc');
          
          // Verificar si es una página de login
          const esLoginPage = contenidoPagina.includes('name="email"') || 
                              contenidoPagina.includes('name="pass"') ||
                              contenidoPagina.includes('Iniciar sesión') ||
                              contenidoPagina.includes('Móvil o correo electrónico') ||
                              urlActual.includes('login');
          
          // ⚠️ LÓGICA MEJORADA ESPECÍFICA PARA FACEBOOK: Detectar contenido bloqueado con MÁXIMA PRECISIÓN
          
          // 1. Detectar mensajes de error de Facebook (más completo)
          const contenidoLower = contenidoPagina.toLowerCase();
          const tieneContenidoDeError = contenidoLower.includes('this content isn\'t available') ||
                                       contenidoLower.includes('contenido no está disponible') ||
                                       contenidoLower.includes('este contenido no está disponible') ||
                                       contenidoLower.includes('este contenido no está disponible en este momento') ||
                                       contenidoLower.includes('sorry, this page isn\'t available') ||
                                       contenidoLower.includes('page not found') ||
                                       contenidoLower.includes('página no encontrada') ||
                                       contenidoLower.includes('this page isn\'t available right now') ||
                                       contenidoLower.includes('no se encuentra disponible') ||
                                       contenidoLower.includes('content not found') ||
                                       contenidoLower.includes('contenido no se encuentra') ||
                                       contenidoLower.includes('content isn\'t available right now') ||
                                       contenidoLower.includes('el propietario solo compartió el contenido');
          
          // 2. Detectar URL de contenido específico (video/post)
          const esContenidoEspecifico = urlObjetivo.includes('/videos/') || 
                                       urlObjetivo.includes('/posts/') || 
                                       urlObjetivo.includes('/photo/') ||
                                       urlObjetivo.includes('/permalink/');
          
          // 3. Detectar título de página que indica error
          const tituloPagina = await page.title();
          const tituloEsError = tituloPagina.toLowerCase().includes('facebook') && tituloPagina.length < 30;
          
          // 4. Detectar contenido muy escaso (página casi vacía = bloqueada)
          // Extraer solo el texto visible (sin HTML, scripts, styles)
          const textoVisible = contenidoPagina
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Quitar scripts
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Quitar styles
            .replace(/<[^>]*>/g, '')  // Quitar tags HTML
            .replace(/\s+/g, ' ')     // Normalizar espacios
            .trim();
          const contenidoMuyEscaso = textoVisible.length < 1000;
          
          // 4b. Detectar mensajes de error MUY ESPECÍFICOS (alta confianza)
          const mensajeErrorEspecifico = contenidoLower.includes('este contenido no está disponible en este momento') ||
                                        contenidoLower.includes('this content isn\'t available right now') ||
                                        contenidoLower.includes('el propietario solo compartió el contenido') ||
                                        contenidoLower.includes('owner only shared it with a small group');
          
          // 5. Detectar si el body principal tiene clase de error
          const tieneClaseError = contenidoPagina.includes('class="error"') || 
                                 contenidoPagina.includes('error-page') ||
                                 contenidoPagina.includes('not-found');
          
          // 🎯 DECISIÓN FINAL DE BLOQUEO (SOLO PARA FACEBOOK)
          // Condiciones principales de bloqueo:
          const perfilNoEncontrado = 
            // CASO 1: Mensaje de error + redirección clara
            (tieneContenidoDeError && (fueRedirigidoAPaginaPrincipal || tieneParametroRedireccion)) ||
            // CASO 2: Contenido específico con error (video/post eliminado)
            (esContenidoEspecifico && tieneContenidoDeError) ||
            // CASO 3: Mensaje de error + título sospechoso + contenido escaso
            (tieneContenidoDeError && tituloEsError && contenidoMuyEscaso) ||
            // CASO 4: Mensaje de error + clases de error en HTML
            (tieneContenidoDeError && tieneClaseError) ||
            // CASO 5: Mensaje de error MUY ESPECÍFICO (alta confianza - sin login)
            // Si tiene mensajes como "Este contenido no está disponible en este momento"
            (mensajeErrorEspecifico && !esLoginPage);
          
          // 📊 DEBUG: Mostrar análisis de detección (solo para Facebook)
          console.log(`\n🔍 ========== ANÁLISIS DE DETECCIÓN (FACEBOOK) ==========`);
          console.log(`   🌐 URL objetivo: ${urlObjetivo}`);
          console.log(`   🌐 URL actual: ${urlActual}`);
          console.log(`   📄 Título: "${tituloPagina}" (length: ${tituloPagina.length})`);
          console.log(`   ⚠️  Tiene mensaje de error: ${tieneContenidoDeError ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   🚨 Mensaje error ESPECÍFICO: ${mensajeErrorEspecifico ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   🔒 Es página de login: ${esLoginPage ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   🔄 Redirigido a principal: ${fueRedirigidoAPaginaPrincipal ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   🔗 Parámetro redireccion: ${tieneParametroRedireccion ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   📝 Texto visible escaso: ${contenidoMuyEscaso ? '✅ SÍ' : '❌ NO'} (${textoVisible.length} chars)`);
          console.log(`   🏷️  Clase de error: ${tieneClaseError ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   🎬 Contenido específico: ${esContenidoEspecifico ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   ❌ Título de error: ${tituloEsError ? '✅ SÍ' : '❌ NO'}`);
          console.log(`   ➡️  RESULTADO FINAL: ${perfilNoEncontrado ? '🚫 BLOQUEADO' : '✅ ACCESIBLE'}`);
          console.log(`========================================================\n`);
          
          if (perfilNoEncontrado) {
            const razonBloqueo = esContenidoEspecifico 
              ? '🚫 Contenido específico (video/post) no disponible o eliminado'
              : '🚫 Perfil de Facebook no encontrado (mensaje de error + redirección detectada)';
            
            console.log(razonBloqueo);
            console.log(`📄 Tomando screenshot del error para documentar`);
            console.log(`📸 Screenshot de contenido no disponible en Facebook`);
            
            // IMPORTANTE: Marcar en la página que el contenido no fue encontrado
            await page.evaluate((razon) => {
              window.__paginaBloqueada = true;
              window.__razonBloqueo = razon;
            }, razonBloqueo);
          } else if (tieneContenidoDeError && !fueRedirigidoAPaginaPrincipal && !esContenidoEspecifico) {
            console.log(`⚠️ Mensaje de error detectado PERO sin redirección (perfil general) - probablemente es un banner/aviso`);
            console.log(`✅ La página cargó correctamente en la URL esperada`);
            // NO marcar como bloqueada
          } else if (fueRedirigidoAPaginaPrincipal && esLoginPage) {
            console.log(`🔒 Facebook redirigió a login - la página puede requerir autenticación`);
            // NO marcar como bloqueada, solo requiere login
          } else if (esLoginPage) {
            console.log(`🔒 Página de Facebook requiere login, generando página informativa formal...`);
            
            // Crear página informativa formal para Facebook
            const paginaInformativa = this.generarPaginaInformativa(url, 'Facebook');
            
            // Reutilizar misma pestaña para mostrar la página informativa
            
            // Configurar viewport para la página informativa
            if (!this.configuracion.usarNavegadorReal) {
            await page.setViewportSize({
              width: this.configuracion.width, 
                height: this.configuracion.height + 100
            });
            }
            
            // Establecer el contenido de la página informativa
            await page.setContent(paginaInformativa);
            await page.waitForTimeout(1000);
            
            console.log(`📄 Página informativa generada para acceso restringido de Facebook`);
    } else {
            console.log(`✅ Navegación exitosa a perfil específico de Facebook`);
          }
          
          navegacionExitosa = true;
          
        } catch (navError) {
          console.log(`⚠️ Error con Facebook versión computador: ${navError.message}`);
          navegacionExitosa = false;
        }
      } else if (esInstagram) {
        try {
          console.log(`🎯 Navegando a Instagram: ${urlObjetivo}`);
          await page.goto(urlObjetivo, { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
          });
          
          // Esperar tiempo adicional para que el contenido se cargue
          console.log(`⏳ Esperando carga completa del contenido de Instagram...`);
          await page.waitForTimeout(3000);
          
          // Verificar si la página requiere login
          const contenidoPagina = await page.content();
          const esLoginPage = contenidoPagina.includes('name="username"') || 
                              contenidoPagina.includes('name="password"') ||
                              contenidoPagina.includes('Iniciar sesión') ||
                              contenidoPagina.includes('Log in') ||
                              contenidoPagina.includes('Teléfono, usuario o correo electrónico') ||
                              page.url().includes('accounts/login');
          
          // Verificar si el perfil no está disponible (bloqueado/eliminado)
          const perfilInstagramBloqueado = contenidoPagina.includes('Sorry, this page isn\'t available') ||
                                          contenidoPagina.includes('This page isn\'t available') ||
                                          contenidoPagina.includes('lo sentimos, esta página no está disponible') ||
                                          contenidoPagina.includes('página no está disponible');
          
          if (perfilInstagramBloqueado && !esLoginPage) {
            console.log(`🚫 Perfil de Instagram no encontrado o no disponible`);
            console.log(`📄 Tomando screenshot del error para documentar`);
            console.log(`📸 Screenshot de perfil no disponible en Instagram`);
            
            // IMPORTANTE: Marcar en la página que el perfil no fue encontrado
            await page.evaluate(() => {
              window.__paginaBloqueada = true;
              window.__razonBloqueo = 'Perfil de Instagram no encontrado o no disponible';
            });
          } else if (esLoginPage) {
            console.log(`🔒 Página de Instagram requiere login, generando página informativa formal...`);
            
            // Crear página informativa formal para Instagram
            const paginaInformativa = this.generarPaginaInformativa(url, 'Instagram');
            
            // Reutilizar misma pestaña para mostrar la página informativa
            
            // Configurar viewport para la página informativa
            await page.setViewportSize({
        width: this.configuracion.width, 
        height: this.configuracion.height 
      });

            // Establecer el contenido de la página informativa
            await page.setContent(paginaInformativa);
            await page.waitForTimeout(1000);
            
            console.log(`📄 Página informativa generada para acceso restringido de Instagram`);
          } else {
            console.log(`✅ Navegación exitosa a Instagram`);
          }
          
          navegacionExitosa = true;
          
        } catch (navError) {
          console.log(`⚠️ Error con Instagram: ${navError.message}`);
          navegacionExitosa = false;
        }
      } else {
        // Para sitios no-Facebook, navegación normal
        try {
          await page.goto(urlObjetivo, { 
        waitUntil: 'domcontentloaded',
        timeout: this.configuracion.timeout * 1000 
      });
          navegacionExitosa = true;
          
          if (loginExitoso) {
            console.log(`✅ Navegación exitosa con login completo a: ${urlObjetivo}`);
          } else if (esInstagram) {
            console.log(`⚠️ Navegación a página que puede requerir login: ${urlObjetivo}`);
          } else {
            console.log(`📄 Navegación exitosa a sitio normal: ${urlObjetivo}`);
          }
          
          // ESPERAR REDIRECCIONES META REFRESH (como las de Coljuegos)
          console.log(chalk.gray('⏳ Esperando posibles redirecciones META REFRESH (2s)...'));
          await page.waitForTimeout(2000);
          
        } catch (navError) {
          console.log(`⚠️ Error navegando a ${urlObjetivo}: ${navError.message}`);
          navegacionExitosa = false;
          
          // Si es un error de conexión, dejar que Chrome muestre su error natural
          if (navError.message.includes('ERR_CONNECTION_REFUSED') || 
              navError.message.includes('ECONNREFUSED') ||
              navError.message.includes('ERR_NAME_NOT_RESOLVED') ||
              navError.message.includes('net::ERR_')) {
            
            console.log(`🚫 Sitio no disponible, Chrome mostrará su página de error nativa`);
            
            // Incrementar contador de páginas no disponibles
            this.estadisticas.paginasNoDisponibles++;
            
            // NO crear página personalizada, dejar que Chrome muestre su error
            // La página ya tiene el error de Chrome cargado
            
            console.log(`📄 Error nativo de Chrome mantenido con barra de navegación visible`);
            
            // Marcar que hubo error 
            huboError = true;
            mensajeError = navError.message;
          }
        }
      }
      
      if (!navegacionExitosa && esFacebook) {
        console.log(`⚠️ Todas las estrategias de Facebook fallaron, tomando screenshot de lo visible`);
      }

      try {
        // Después de la navegación, esperar un momento para que cargue el contenido
        await page.waitForTimeout(2000);
        
        // Si estamos en Facebook, verificar si seguimos en una página de verificación
        if (esFacebook) {
          const urlActual = page.url();
          if (urlActual.includes('two_step_verification') || urlActual.includes('checkpoint')) {
            console.log('🔄 Detectada página de verificación, intentando saltarla...');
            
            // Intentar hacer click en "No ahora" o "Skip" si está disponible
            try {
              const skipButton = await page.$('button:has-text("No ahora"), button:has-text("Skip"), button:has-text("Not now"), a:has-text("No ahora"), a:has-text("Skip")');
              if (skipButton) {
                await skipButton.click();
                await page.waitForTimeout(1000);
                console.log('🔄 Intentando saltar verificación...');
                
                // Intentar navegar nuevamente a la página objetivo
                try {
                  await page.goto(urlNormalizada, { 
        waitUntil: 'domcontentloaded',
                    timeout: 10000 
                  });
                  console.log('🎯 Re-navegación a página objetivo después de saltar verificación');
                } catch {
                  console.log('⚠️ No se pudo re-navegar después de saltar verificación');
                }
              }
            } catch {
              console.log('⚠️ No se pudo saltar la verificación automáticamente');
            }
          }
        }

        // Esperar a que la página se cargue completamente
      await page.waitForTimeout(this.configuracion.delay * 1000);
      
      // Espera adicional para evitar sobreposiciones entre capturas
      console.log(`⏳ Esperando estabilización de página antes de captura...`);
      await page.waitForTimeout(1000);

        // Intentar esperar a que las imágenes se carguen
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (error) {
          // Si no se puede esperar networkidle, continuar
        }

        // Ocultar elementos molestos si se especifican
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

        // Hacer scroll hacia abajo y arriba para cargar contenido lazy-loaded
        try {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(500);
          await page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(300);
        } catch (error) {
          // Ignorar errores de scroll
        }

      } catch (navegacionError) {
        // Capturar el error pero mantener la página de error nativa de Chrome
        huboError = true;
        mensajeError = navegacionError.message;
        
        console.log(`⚠️ Error navegando a ${urlNormalizada}: ${navegacionError.message}`);
        console.log(`📄 Manteniendo página de error nativa de Chrome con barra de navegación`);
        
        // Incrementar contador de páginas no disponibles
        this.estadisticas.paginasNoDisponibles++;
        
        // NO reemplazar la página de error, Chrome ya muestra la suya
        // La página actual ya tiene el error de Chrome con la barra de navegación visible
      }

      // Agregar marco de navegador SOLO si estamos en modo simulado (no en navegador real)
      if (!huboError && !this.configuracion.usarNavegadorReal) {
        await this.agregarMarcoNavegador(page, url);
      }

      // SIEMPRE tomar screenshot
      if (this.configuracion.usarNavegadorReal) {
        // En navegador real, intentar captura de ventana completa con barra de direcciones
        
        // MODO PARALELO: traer pestaña al frente y capturar ventana del sistema
        // ESPERAR REDIRECCIONES META REFRESH (Coljuegos usa <meta http-equiv="refresh">)
        console.log(chalk.gray('⏳ Esperando posibles redirecciones META REFRESH (2s)...'));
        await page.waitForTimeout(2000);
        
        // CAPTURAR URL FINAL (después de posibles redirecciones)
        try {
          urlFinal = page.url();
          if (urlFinal !== url && urlFinal !== urlNormalizada) {
            console.log(chalk.cyan(`🔄 Redirección detectada: ${url} → ${urlFinal}`));
          }
        } catch (e) {
          console.log(chalk.gray(`⚠️ No se pudo obtener URL final: ${e.message}`));
        }
        
        if (paginaCreada) {
          console.log('⚡ Semi-paralelo: Trayendo pestaña al frente...');
          
          // 1. Traer esta pestaña al frente
          await page.bringToFront();
          
          // 2. Esperar a que el sistema operativo cambie de pestaña visualmente
          await page.waitForTimeout(1500);
          
          // 3. Capturar ventana del sistema (con barra de navegación)
          console.log('📸 Capturando ventana con barra de navegación...');
          const capturaExitosa = await this.capturarVentanaCompleta(rutaCompleta, page);
          
          if (!capturaExitosa) {
            console.log('🔄 Captura de sistema falló, usando screenshot de Playwright...');
            await page.screenshot({ 
              path: rutaCompleta,
              fullPage: false,
              type: this.configuracion.format
            });
          }
        } else {
          // MODO SECUENCIAL: captura de ventana del sistema con barra
          console.log('🎯 Navegador real: Intentando capturar ventana completa con barra...');
          await page.waitForTimeout(1000);
          
          const capturaExitosa = await this.capturarVentanaCompleta(rutaCompleta, page);
          
          if (!capturaExitosa) {
            console.log('🔄 Captura de sistema falló, usando screenshot normal de Playwright...');
            await page.screenshot({ 
              path: rutaCompleta,
              fullPage: false,
              type: this.configuracion.format
            });
          }
        }
      } else {
        // En modo simulado, screenshot normal con marco
      await page.screenshot({ 
        path: rutaCompleta,
        fullPage: this.configuracion.fullPage,
        type: this.configuracion.format
      });
      }

      // Leer flags de la página antes de cerrarla
      let paginaBloqueada = false;
      let razonBloqueo = null;
      try {
        const flags = await page.evaluate(() => {
          return {
            bloqueada: window.__paginaBloqueada || false,
            razon: window.__razonBloqueo || null
          };
        });
        paginaBloqueada = flags.bloqueada;
        razonBloqueo = flags.razon;
      } catch (e) {
        // Ignorar errores al leer flags
      }
      
      // Obtener información del archivo
      const stats = await fs.stat(rutaCompleta);
      
      return {
        exito: !huboError,
        nombreArchivo: rutaCompleta.split('/').pop(),
        rutaCompleta,
        tamanio: stats.size,
        url: url, // URL original
        urlFinal: urlFinal, // URL final (después de redirecciones)
        timestamp: new Date().toISOString(),
        error: mensajeError,
        tipoError: huboError ? this.clasificarError(mensajeError) : null,
        paginaBloqueada: paginaBloqueada, // NUEVO: Flag de página bloqueada
        razonBloqueo: razonBloqueo, // NUEVO: Razón del bloqueo
        verificacionHttp: verificacionHttp // NUEVO: Resultado de verificación HTTP (solo URLs normales)
      };

    } finally {
      // Cerrar página solo si fue creada para esta captura (modo paralelo)
      if (paginaCreada && page && !page.isClosed()) {
        try {
          await page.close();
        } catch (error) {
          // Ignorar errores al cerrar
        }
      }
      // En modo secuencial, no cerrar la página compartida
    }
  }

  /**
   * Clasifica el tipo de error para estadísticas
   */
  clasificarError(mensajeError) {
    if (mensajeError.includes('404') || mensajeError.includes('Not Found')) {
      return '404';
    } else if (mensajeError.includes('ERR_CONNECTION_REFUSED') || mensajeError.includes('ECONNREFUSED')) {
      return 'conexion';
    } else if (mensajeError.includes('timeout') || mensajeError.includes('ERR_TIMED_OUT')) {
      return 'timeout';
    } else if (mensajeError.includes('ERR_NAME_NOT_RESOLVED')) {
      return 'dns';
    } else {
      return 'otro';
    }
  }

  /**
   * Actualiza las estadísticas de verificación HTTP
   */
  actualizarEstadisticasVerificacionHttp(verificacionHttp) {
    if (!verificacionHttp) return;
    
    switch (verificacionHttp.estado) {
      case 'Activo':
        this.estadisticas.verificacionesHttp.activas++;
        break;
      case 'Redirige':
        this.estadisticas.verificacionesHttp.redirige++;
        break;
      case 'Inactivo':
        this.estadisticas.verificacionesHttp.inactivas++;
        break;
      case 'Error servidor':
        this.estadisticas.verificacionesHttp.errorServidor++;
        break;
      case 'Sin respuesta':
        this.estadisticas.verificacionesHttp.sinRespuesta++;
        break;
      case 'Error SSL':
        this.estadisticas.verificacionesHttp.errorSSL++;
        break;
      default:
        this.estadisticas.verificacionesHttp.otros++;
    }
  }

  /**
   * Captura screenshot usando capture-website con configuración de sandbox - SIEMPRE toma screenshot incluso en errores
   */
  async capturarConCaptureWebsite(url, rutaCompleta) {
    // Normalizar URL (agregar protocolo si no lo tiene)
    const urlNormalizada = this.normalizarUrl(url);
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
      headers: this.configuracion.headers,
      // Opciones de Puppeteer para solucionar problema de sandbox en Ubuntu 23.10+
      puppeteerOptions: {
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
          '--disable-blink-features=AutomationControlled'
        ]
      }
    };

    let huboError = false;
    let mensajeError = null;

    try {
      await captureWebsite.file(urlNormalizada, rutaCompleta, opciones);
    } catch (error) {
      // Capturar error pero intentar con Playwright como fallback
      huboError = true;
      mensajeError = error.message;
      
      // Usar Playwright como fallback para tomar screenshot incluso en errores
      await this.capturarConPlaywright(url, rutaCompleta);
    }

    // Obtener información del archivo
    const stats = await fs.stat(rutaCompleta);
    
    return {
      exito: !huboError,
      nombreArchivo: rutaCompleta.split('/').pop(),
      rutaCompleta,
      tamanio: stats.size,
      timestamp: new Date().toISOString(),
      error: mensajeError,
      tipoError: huboError ? this.clasificarError(mensajeError) : null
    };
  }

  /**
   * Captura un screenshot de una URL - SIEMPRE intenta tomar screenshot
   * @param {string} url - URL a capturar
   * @param {number} indice - Índice de la URL
   * @param {boolean} usarPlaywright - Si true usa Playwright, si false usa capture-website
   * @param {string} nombreBasePersonalizado - Nombre base personalizado para el archivo
   * @param {boolean} modoParalelo - Si true crea página nueva para cada captura (paralelo)
   */
  async capturarScreenshot(url, indice, usarPlaywright = false, nombreBasePersonalizado = null, modoParalelo = false) {
    const spinner = ora(`Capturando ${url}`).start();
    
    try {
      // Determinar base de nombre de archivo
      let nombrePagina = 'sitio-desconocido';
      if (nombreBasePersonalizado && typeof nombreBasePersonalizado === 'string') {
        nombrePagina = nombreBasePersonalizado.replace(/[^a-zA-Z0-9_-]/g, '-');
      } else {
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
          nombrePagina = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
        } catch (error) {
          // Si no se puede parsear la URL, usar una versión limpia
          nombrePagina = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
        }
      }
      
      // Generar timestamp legible
      const now = new Date();
      const fecha = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const hora = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
      
      // Generar nombre descriptivo: base_fecha_hora.ext
      const nombreArchivo = `${nombrePagina}_${fecha}_${hora}.${this.configuracion.format}`;
      const rutaCompleta = join(this.configuracion.directorioSalida, nombreArchivo);

      let resultado;
      
      if (usarPlaywright) {
        // Usar Playwright para Instagram y Facebook (con soporte para modo paralelo)
        resultado = await this.capturarConPlaywright(url, rutaCompleta, modoParalelo);
      } else {
        // Usar capture-website para otros sitios
        resultado = await this.capturarConCaptureWebsite(url, rutaCompleta);
      }

      // Actualizar estadísticas de verificación HTTP
      if (resultado.verificacionHttp) {
        this.actualizarEstadisticasVerificacionHttp(resultado.verificacionHttp);
      }

      // Actualizar estadísticas según el resultado
      if (resultado.exito) {
        this.estadisticas.exitosas++;
        
        // Mostrar estado de verificación HTTP si está disponible
        let mensajeVerificacion = '';
        if (resultado.verificacionHttp) {
          const estado = resultado.verificacionHttp.estado;
          const icono = estado === 'Activo' ? '🟢' : estado === 'Redirige' ? '🔄' : '🟡';
          mensajeVerificacion = ` ${icono} HTTP:${estado}`;
        }
        
        spinner.succeed(chalk.green(`✅ ${url} -> ${nombreArchivo} ${usarPlaywright ? '(Playwright)' : '(capture-website)'}${mensajeVerificacion}`));
      } else {
        // Hubo error pero se tomó screenshot
        this.estadisticas.fallidas++;
        
        // Mostrar estado de verificación HTTP si está disponible
        let mensajeVerificacion = '';
        if (resultado.verificacionHttp) {
          const estado = resultado.verificacionHttp.estado;
          const icono = estado === 'Sin respuesta' ? '🔴' : estado === 'Error SSL' ? '🔒' : '🟡';
          mensajeVerificacion = ` ${icono} HTTP:${estado}`;
        }
        
        // Clasificar error para estadísticas
        switch (resultado.tipoError) {
          case '404':
            this.estadisticas.errores404++;
            spinner.warn(chalk.yellow(`📸 404 ${url} -> ${nombreArchivo} (screenshot de error tomado)${mensajeVerificacion}`));
            break;
          case 'conexion':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 Conexión ${url} -> ${nombreArchivo} (screenshot de error tomado)${mensajeVerificacion}`));
            break;
          case 'timeout':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 Timeout ${url} -> ${nombreArchivo} (screenshot de error tomado)${mensajeVerificacion}`));
            break;
          case 'dns':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 DNS ${url} -> ${nombreArchivo} (screenshot de error tomado)${mensajeVerificacion}`));
            break;
          default:
            this.estadisticas.otrosErrores++;
            spinner.warn(chalk.yellow(`📸 Error ${url} -> ${nombreArchivo} (screenshot de error tomado)${mensajeVerificacion}`));
        }
      }

      this.estadisticas.tamanioTotal += resultado.tamanio;
      return resultado;

    } catch (error) {
      // Error crítico que impidió tomar ANY screenshot
      this.estadisticas.fallidas++;
      this.estadisticas.otrosErrores++;
      
      spinner.fail(chalk.red(`❌ Error crítico ${url}: ${error.message}`));

      return {
        exito: false,
        error: error.message,
        url,
        timestamp: new Date().toISOString(),
        tipoError: 'critico'
      };
    }
  }

  /**
   * Captura múltiples screenshots - SIEMPRE usa Playwright para robustez con errores
   */
  async capturarMultiplesUrls(urls, usarPlaywright = true) {
    console.log(`\n📸 Capturando screenshots con Playwright (manejo robusto de errores)...`);
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
    const total = this.estadisticas.exitosas + this.estadisticas.fallidas;
    const screenshotsConError = this.estadisticas.fallidas; // Todos los errores tienen screenshot ahora
    
    console.log('\n📊 RESUMEN DE CAPTURAS:');
    console.log(`✅ Exitosas: ${this.estadisticas.exitosas}`);
    console.log(`📸 Screenshots con error (pero capturados): ${screenshotsConError}`);
    console.log(`   • Errores 404: ${this.estadisticas.errores404}`);
    console.log(`   • Errores de conexión: ${this.estadisticas.erroresConexion}`);
    console.log(`   • Otros errores: ${this.estadisticas.otrosErrores}`);
    console.log(`🚫 Páginas "No se puede conectar" (Firefox): ${this.estadisticas.paginasNoDisponibles}`);
    
    // Mostrar estadísticas de verificación HTTP
    const totalVerificaciones = Object.values(this.estadisticas.verificacionesHttp).reduce((a, b) => a + b, 0);
    if (totalVerificaciones > 0) {
      console.log('\n🔍 VERIFICACIONES HTTP (URLs normales):');
      console.log(`🟢 Activas: ${this.estadisticas.verificacionesHttp.activas}`);
      console.log(`🔄 Redirigen: ${this.estadisticas.verificacionesHttp.redirige}`);
      console.log(`🟡 Inactivas: ${this.estadisticas.verificacionesHttp.inactivas}`);
      console.log(`🔴 Sin respuesta: ${this.estadisticas.verificacionesHttp.sinRespuesta}`);
      console.log(`🔒 Error SSL: ${this.estadisticas.verificacionesHttp.errorSSL}`);
      console.log(`⚠️ Error servidor: ${this.estadisticas.verificacionesHttp.errorServidor}`);
      console.log(`❓ Otros: ${this.estadisticas.verificacionesHttp.otros}`);
    }
    
    console.log(`📈 Total screenshots generados: ${total}`);
    console.log(`📁 Tamaño total: ${(this.estadisticas.tamanioTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📂 Directorio: ${this.configuracion.directorioSalida}`);
    console.log(`\n💡 Nota: TODAS las URLs tienen screenshot, incluso las que dieron error 404/conexión`);
    console.log(`🔥 Las páginas no disponibles se muestran con interfaz de Firefox "No se puede conectar"`);
    console.log(`🚫 Facebook e Instagram NO usan verificación HTTP (requieren navegación completa)`);
  }

  /**
   * Genera una página que simula el login de Facebook o Instagram
   */
  generarPaginaInformativa(url, plataforma) {
    if (plataforma === 'Facebook') {
      return this.generarPaginaLoginFacebook(url);
    } else if (plataforma === 'Instagram') {
      return this.generarPaginaLoginInstagram(url);
    } else {
      return this.generarPaginaAccesoRestringido(url, plataforma);
    }
  }

  /**
   * Genera una página que simula exactamente el error de Facebook de la imagen
   */
  generarPaginaLoginFacebook(url) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Facebook</title>
          <style>
              body {
                  font-family: SFProText, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background: #18191a;
                  margin: 0;
                  padding: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #e4e6ea;
              }
              .error-container {
                  text-align: center;
                  max-width: 500px;
                  width: 90%;
                  padding: 40px 20px;
              }
              .lock-icon {
                  width: 80px;
                  height: 80px;
                  margin: 0 auto 40px;
                  position: relative;
                  display: inline-block;
              }
              .document {
                  width: 64px;
                  height: 80px;
                  background: #4267b2;
                  border-radius: 4px;
                  position: relative;
                  margin: 0 auto;
              }
              .document::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  right: 0;
                  width: 0;
                  height: 0;
                  border-left: 12px solid #4267b2;
                  border-top: 12px solid #18191a;
                  border-radius: 0 4px 0 0;
              }
              .lock {
                  position: absolute;
                  bottom: -8px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 40px;
                  height: 32px;
                  background: #3a3b3c;
                  border-radius: 4px;
                  border: 3px solid #3a3b3c;
              }
              .lock::before {
                  content: '';
                  position: absolute;
                  top: -16px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 20px;
                  height: 16px;
                  border: 3px solid #3a3b3c;
                  border-bottom: none;
                  border-radius: 16px 16px 0 0;
              }
              .lock::after {
                  content: '';
                  position: absolute;
                  top: 6px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  background: #18191a;
                  border-radius: 50%;
              }
              .error-title {
                  font-size: 24px;
                  font-weight: 400;
                  color: #e4e6ea;
                  margin-bottom: 20px;
                  line-height: 1.3;
              }
              .error-text {
                  font-size: 16px;
                  color: #b0b3b8;
                  margin-bottom: 40px;
                  line-height: 1.5;
                  max-width: 400px;
                  margin-left: auto;
                  margin-right: auto;
              }
              .action-button {
                  background: #1877f2;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  margin-bottom: 20px;
                  display: inline-block;
                  text-decoration: none;
                  min-width: 120px;
              }
              .secondary-links {
                  margin-top: 20px;
              }
              .secondary-link {
                  color: #1877f2;
                  text-decoration: none;
                  font-size: 16px;
                  font-weight: 500;
                  display: block;
                  margin: 8px 0;
              }
              .secondary-link:hover {
                  text-decoration: underline;
              }
              .url-display {
                  background: rgba(58, 59, 60, 0.3);
                  border-radius: 4px;
                  padding: 8px 12px;
                  margin: 20px auto;
                  font-family: 'Courier New', monospace;
                  font-size: 11px;
                  color: #8a8d91;
                  word-break: break-all;
                  max-width: 300px;
                  border: 1px solid #3a3b3c;
              }
          </style>
      </head>
      <body>
          <div class="error-container">
              <div class="lock-icon">
                  <div class="document"></div>
                  <div class="lock"></div>
              </div>
              
              <h1 class="error-title">Este contenido no está disponible en este momento</h1>
              
              <p class="error-text">
                  Por lo general, esto sucede porque el propietario solo compartió el contenido con un grupo reducido de personas, cambió quién puede verlo o se ha eliminado.
              </p>
              
              <div class="url-display">${url}</div>
              
              <a href="#" class="action-button">Ir al feed</a>
              
              <div class="secondary-links">
                  <a href="#" class="secondary-link">Volver</a>
                  <a href="#" class="secondary-link">Ir al servicio de ayuda</a>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera una página que simula el login de Instagram
   */
  generarPaginaLoginInstagram(url) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Instagram</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background: #fafafa;
                  margin: 0;
                  padding: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #262626;
              }
              .login-container {
                  background: white;
                  border: 1px solid #dbdbdb;
                  border-radius: 1px;
                  padding: 40px;
                  max-width: 350px;
                  width: 90%;
                  text-align: center;
              }
              .instagram-logo {
                  font-family: 'Billabong', cursive;
                  font-size: 32px;
                  margin-bottom: 30px;
                  color: #262626;
                  font-weight: 400;
              }
              .login-form {
                  margin-bottom: 20px;
              }
              .form-group {
                  margin-bottom: 6px;
              }
              .form-input {
                  width: 100%;
                  padding: 9px 8px;
                  border: 1px solid #dbdbdb;
                  border-radius: 3px;
                  background: #fafafa;
                  color: #262626;
                  font-size: 14px;
                  box-sizing: border-box;
              }
              .form-input::placeholder {
                  color: #8e8e8e;
              }
              .login-button {
                  width: 100%;
                  padding: 5px 9px;
                  background: #0095f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  margin: 16px 0;
                  height: 32px;
              }
              .divider {
                  display: flex;
                  align-items: center;
                  margin: 20px 0;
                  color: #8e8e8e;
                  font-size: 13px;
                  font-weight: 600;
              }
              .divider::before,
              .divider::after {
                  content: '';
                  flex: 1;
                  height: 1px;
                  background: #dbdbdb;
              }
              .divider::before {
                  margin-right: 18px;
              }
              .divider::after {
                  margin-left: 18px;
              }
              .facebook-login {
                  color: #385185;
                  text-decoration: none;
                  font-size: 14px;
                  font-weight: 600;
                  margin-bottom: 20px;
                  display: inline-block;
              }
              .forgot-link {
                  color: #00376b;
                  text-decoration: none;
                  font-size: 12px;
                  margin-bottom: 20px;
                  display: inline-block;
              }
              .signup-box {
                  border: 1px solid #dbdbdb;
                  border-radius: 1px;
                  padding: 20px;
                  margin-top: 10px;
                  background: white;
                  font-size: 14px;
              }
              .signup-link {
                  color: #0095f6;
                  text-decoration: none;
                  font-weight: 600;
              }
              .url-info {
                  background: #fafafa;
                  border: 1px solid #dbdbdb;
                  border-radius: 3px;
                  padding: 8px;
                  margin: 20px 0;
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                  font-size: 11px;
                  color: #8e8e8e;
                  word-break: break-all;
              }
              .notice-text {
                  font-size: 14px;
                  color: #8e8e8e;
                  margin-bottom: 20px;
                  line-height: 1.4;
              }
          </style>
      </head>
      <body>
          <div>
              <div class="login-container">
                  <h1 class="instagram-logo">Instagram</h1>
                  
                  <div class="url-info">${url}</div>
                  
                  <p class="notice-text">
                      Para ver este contenido, inicia sesión en Instagram.
                  </p>
                  
                  <div class="login-form">
                      <div class="form-group">
                          <input type="text" class="form-input" placeholder="Teléfono, usuario o correo electrónico" disabled>
                      </div>
                      <div class="form-group">
                          <input type="password" class="form-input" placeholder="Contraseña" disabled>
                      </div>
                      <button class="login-button" disabled>Entrar</button>
                  </div>
                  
                  <div class="divider">O</div>
                  
                  <a href="#" class="facebook-login">Iniciar sesión con Facebook</a>
                  
                  <br>
                  
                  <a href="#" class="forgot-link">¿Has olvidado la contraseña?</a>
              </div>
              
              <div class="signup-box">
                  ¿No tienes una cuenta? <a href="#" class="signup-link">Regístrate</a>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera una página genérica de acceso restringido (para otras plataformas)
   */
  generarPaginaAccesoRestringido(url, plataforma) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Acceso Restringido - ${url}</title>
          <style>
              body {
                  font-family: 'Segoe UI', Arial, sans-serif;
                  background: #f8f9fa;
                  margin: 0;
                  padding: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #333;
                  line-height: 1.6;
              }
              .container {
                  background: white;
                  border: 1px solid #e9ecef;
                  border-radius: 8px;
                  padding: 40px;
                  max-width: 600px;
                  width: 90%;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  text-align: center;
              }
              .header {
                  margin-bottom: 30px;
                  padding-bottom: 20px;
                  border-bottom: 1px solid #e9ecef;
              }
              .icon {
                  width: 60px;
                  height: 60px;
                  background: #6c757d;
                  border-radius: 50%;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 20px;
                  color: white;
                  font-size: 24px;
              }
              .title {
                  font-size: 24px;
                  font-weight: 600;
                  color: #495057;
                  margin: 0;
              }
              .url-display {
                  background: #f8f9fa;
                  border: 1px solid #e9ecef;
                  border-radius: 4px;
                  padding: 12px;
                  margin: 20px 0;
                  font-family: 'Courier New', monospace;
                  font-size: 14px;
                  color: #6c757d;
                  word-break: break-all;
              }
              .message {
                  font-size: 16px;
                  color: #6c757d;
                  margin: 25px 0;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="icon">🔒</div>
                  <h1 class="title">Acceso Restringido</h1>
              </div>
              
              <div class="url-display">${url}</div>
              
              <div class="message">
                  El contenido de esta página no está disponible para visualización pública.
              </div>
          </div>
      </body>
      </html>
    `;
  }



  /**
   * Genera una página de error que simula Firefox con mensaje "No se puede conectar"
   * @param {string} url - URL que falló
   * @param {string} errorMessage - Mensaje de error
   * @returns {string} HTML de la página informativa
   */
  generarPaginaError(url, errorMessage) {
    const fechaHora = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>No se puede conectar - ${url}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f6f6f6;
                overflow: hidden;
                width: 100vw;
                height: 100vh;
            }
            
            .ventana-navegador {
                background: white;
                border-radius: 10px 10px 0 0;
                box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
                margin: 15px;
                height: calc(100vh - 30px);
                display: flex;
                flex-direction: column;
                border: 1px solid #d0d0d0;
            }
            
            .barra-titulo {
                background: linear-gradient(to bottom, #e8e8e8 0%, #d6d6d6 100%);
                height: 44px;
                border-radius: 10px 10px 0 0;
                display: flex;
                align-items: center;
                padding: 0 18px;
                border-bottom: 1px solid #c0c0c0;
                position: relative;
            }
            
            .botones-ventana {
                display: flex;
                gap: 10px;
            }
            
            .boton-ventana {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: 1px solid rgba(0, 0, 0, 0.15);
                position: relative;
            }
            
            .boton-cerrar {
                background: linear-gradient(to bottom, #ff5f57 0%, #ff4943 100%);
            }
            
            .boton-minimizar {
                background: linear-gradient(to bottom, #ffbd2e 0%, #ffab00 100%);
            }
            
            .boton-maximizar {
                background: linear-gradient(to bottom, #28ca42 0%, #1fa32a 100%);
            }
            
            .titulo-ventana {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            
            .barra-navegacion {
                background: #4a4a4a;
                height: 60px;
                display: flex;
                align-items: center;
                padding: 10px 20px;
                border-bottom: 1px solid #666;
                gap: 15px;
            }
            
            .botones-navegacion {
                display: flex;
                gap: 5px;
            }
            
            .btn-nav {
                width: 36px;
                height: 36px;
                border-radius: 4px;
                background: #5a5a5a;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ccc;
                font-size: 18px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .btn-nav:hover {
                background: #666;
            }
            
            .btn-nav.disabled {
                color: #777;
                cursor: not-allowed;
            }
            
            .barra-direccion {
                flex: 1;
                height: 44px;
                background: #3a3a3a;
                border: 1px solid #555;
                border-radius: 6px;
                display: flex;
                align-items: center;
                padding: 0 20px;
                margin: 0 15px;
                font-size: 16px;
                color: #fff;
            }
            
            .icono-seguridad {
                color: #ff6b6b;
                margin-right: 12px;
                font-size: 16px;
            }
            
            .url-texto {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: 'Roboto Mono', 'Courier New', monospace;
                font-weight: 400;
                font-size: 15px;
                color: #ddd;
            }
            
            .botones-extras {
                display: flex;
                gap: 5px;
            }
            
            .contenido-pagina {
                flex: 1;
                background: #2d3142;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .error-content {
                text-align: center;
                max-width: 600px;
                padding: 40px;
            }
            
            .error-title {
                font-size: 32px;
                font-weight: 300;
                margin-bottom: 20px;
                color: #fff;
            }
            
            .error-description {
                font-size: 16px;
                color: #bbb;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            
            .error-url {
                font-size: 18px;
                color: #ff6b6b;
                font-family: 'Roboto Mono', 'Courier New', monospace;
                margin: 20px 0;
                word-break: break-all;
                background: rgba(255, 107, 107, 0.1);
                padding: 10px 15px;
                border-radius: 8px;
                border-left: 4px solid #ff6b6b;
            }
            
            .error-suggestions {
                text-align: left;
                margin: 30px 0;
            }
            
            .error-suggestions ul {
                list-style: none;
                padding: 0;
            }
            
            .error-suggestions li {
                margin: 12px 0;
                color: #ccc;
                font-size: 15px;
                padding-left: 20px;
                position: relative;
                line-height: 1.4;
            }
            
            .error-suggestions li::before {
                content: "•";
                position: absolute;
                left: 0;
                color: #fff;
            }
            
            .reintentar-btn {
                background: #0096aa;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 20px;
                transition: background-color 0.2s;
            }
            
            .reintentar-btn:hover {
                background: #0087a0;
            }
            
            .info-captura {
                position: absolute;
                bottom: 12px;
                right: 18px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 6px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 500;
                z-index: 1000;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
        </style>
    </head>
    <body>
        <div class="ventana-navegador">
            <!-- Barra de título de la ventana -->
            <div class="barra-titulo">
                <div class="botones-ventana">
                    <div class="boton-ventana boton-cerrar"></div>
                    <div class="boton-ventana boton-minimizar"></div>
                    <div class="boton-ventana boton-maximizar"></div>
                </div>
                <div class="titulo-ventana">Mozilla Firefox</div>
            </div>
            
            <!-- Barra de navegación -->
            <div class="barra-navegacion">
                <div class="botones-navegacion">
                    <div class="btn-nav disabled">◀</div>
                    <div class="btn-nav disabled">▶</div>
                    <div class="btn-nav">↻</div>
            </div>
                
                <div class="barra-direccion">
                    <span class="icono-seguridad">⚠</span>
                    <span class="url-texto">${url}</span>
                </div>
                
                <div class="botones-extras">
                    <div class="btn-nav">⋮</div>
            </div>
        </div>
        
            <!-- Contenido de error -->
            <div class="contenido-pagina">
                <div class="error-content">
                    <h1 class="error-title">No se puede conectar</h1>
                    <p class="error-description">
                        Firefox no puede establecer una conexión con el servidor en:
                    </p>
                    
                    <div class="error-url">${url}</div>
                    
                    <div class="error-suggestions">
                        <ul>
                            <li>El sitio podría estar no disponible temporalmente o demasiado ocupado. Vuelva a intentarlo en unos momentos.</li>
                            <li>Si no puede cargar ninguna página, compruebe la conexión de red de su equipo.</li>
                            <li>Si su equipo o red están protegidos por un cortafuegos o proxy, asegúrese de que Firefox tiene permiso para acceder a la web.</li>
                        </ul>
                    </div>
                    
                    <button class="reintentar-btn">Reintentar</button>
                </div>
                
                <div class="info-captura">${fechaHora}</div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Crea un marco de navegador realista alrededor del contenido de la página
   * @param {Object} page - Página de Playwright
   * @param {string} url - URL original para mostrar
   */
  async agregarMarcoNavegador(page, url) {
    try {
      // Obtener fecha y hora actuales formateadas
      const fechaHora = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Obtener el contenido actual de la página para incrustar
      const contenidoOriginal = await page.content();
      
      // Extraer solo el body del contenido original
      const bodyMatch = contenidoOriginal.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const contenidoBody = bodyMatch ? bodyMatch[1] : contenidoOriginal;
      
      // Crear el HTML completo con marco de navegador realista
      const htmlConMarco = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Captura de Pantalla - ${url}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f6f6f6;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }
        
        .ventana-navegador {
            background: white;
            border-radius: 10px 10px 0 0;
            box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
            margin: 15px;
            height: calc(100vh - 30px);
            display: flex;
            flex-direction: column;
            border: 1px solid #d0d0d0;
        }
        
        .barra-titulo {
            background: linear-gradient(to bottom, #e8e8e8 0%, #d6d6d6 100%);
            height: 44px;
            border-radius: 10px 10px 0 0;
            display: flex;
            align-items: center;
            padding: 0 18px;
            border-bottom: 1px solid #c0c0c0;
            position: relative;
        }
        
        .botones-ventana {
            display: flex;
            gap: 10px;
        }
        
        .boton-ventana {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.15);
            position: relative;
        }
        
        .boton-cerrar {
            background: linear-gradient(to bottom, #ff5f57 0%, #ff4943 100%);
        }
        
        .boton-minimizar {
            background: linear-gradient(to bottom, #ffbd2e 0%, #ffab00 100%);
        }
        
        .boton-maximizar {
            background: linear-gradient(to bottom, #28ca42 0%, #1fa32a 100%);
        }
        
        .titulo-ventana {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            font-weight: 500;
            color: #333;
        }
        
        .barra-navegacion {
            background: #f1f3f4;
            height: 60px;
            display: flex;
            align-items: center;
            padding: 10px 20px;
            border-bottom: 1px solid #dadce0;
            gap: 15px;
        }
        
        .botones-navegacion {
            display: flex;
            gap: 5px;
        }
        
        .btn-nav {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #fff;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #5f6368;
            font-size: 18px;
            cursor: pointer;
            transition: background-color 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .btn-nav:hover {
            background: #f8f9fa;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        
        .btn-nav.disabled {
            color: #dadce0;
            cursor: not-allowed;
        }
        
        .barra-direccion {
            flex: 1;
            height: 44px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            display: flex;
            align-items: center;
            padding: 0 20px;
            margin: 0 15px;
            font-size: 16px;
            color: #202124;
            box-shadow: 
                inset 0 2px 4px rgba(0,0,0,0.1),
                0 1px 3px rgba(0,0,0,0.1);
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .barra-direccion:hover {
            border-color: #dadce0;
            box-shadow: 
                inset 0 2px 4px rgba(0,0,0,0.15),
                0 2px 6px rgba(0,0,0,0.15);
        }
        
        .icono-seguridad {
            color: #34a853;
            margin-right: 12px;
            font-size: 16px;
            font-weight: bold;
        }
        
        .url-texto {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: 'Roboto Mono', 'Courier New', monospace;
            font-weight: 500;
            font-size: 15px;
            letter-spacing: 0.5px;
            position: relative;
        }
        
        .url-texto::after {
            content: '|';
            color: #4285f4;
            animation: blink 1s infinite;
            margin-left: 2px;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        .iconos-direccion {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: 10px;
        }
        
        .icono-direccion {
            color: #5f6368;
            font-size: 16px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .icono-direccion:hover {
            background: #f8f9fa;
        }
        
        .botones-extras {
            display: flex;
            gap: 5px;
        }
        
        .contenido-pagina {
            flex: 1;
            background: white;
            position: relative;
            overflow: hidden;
        }
        
        .info-captura {
            position: absolute;
            bottom: 12px;
            right: 18px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .contenido-wrapper {
            width: 100%;
            height: 100%;
            overflow: auto;
            background: white;
        }
    </style>
</head>
<body>
    <div class="ventana-navegador">
        <!-- Barra de título de la ventana -->
        <div class="barra-titulo">
            <div class="botones-ventana">
                <div class="boton-ventana boton-cerrar"></div>
                <div class="boton-ventana boton-minimizar"></div>
                <div class="boton-ventana boton-maximizar"></div>
            </div>
            <div class="titulo-ventana">Google Chrome</div>
        </div>
        
        <!-- Barra de navegación -->
        <div class="barra-navegacion">
            <div class="botones-navegacion">
                <div class="btn-nav disabled">◀</div>
                <div class="btn-nav disabled">▶</div>
                <div class="btn-nav">↻</div>
            </div>
            
            <div class="barra-direccion">
                <span class="icono-seguridad">🔒</span>
                <span class="url-texto">${url}</span>
                <div class="iconos-direccion">
                    <span class="icono-direccion">⭐</span>
                    <span class="icono-direccion">👤</span>
                </div>
            </div>
            
            <div class="botones-extras">
                <div class="btn-nav">⋮</div>
            </div>
        </div>
        
        <!-- Contenido de la página -->
        <div class="contenido-pagina">
            <div class="contenido-wrapper" id="contenido-wrapper">
                ${contenidoBody}
            </div>
            <div class="info-captura">${fechaHora}</div>
        </div>
    </div>
</body>
</html>`;

      // Establecer el nuevo contenido con el marco del navegador
      await page.setContent(htmlConMarco);
      
      // Esperar a que se renderice completamente
      await page.waitForTimeout(1000);
      
      // Intentar esperar a que se carguen las imágenes y otros recursos
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
        // Si no se puede esperar networkidle, continuar
        console.log('⚠️ No se pudo esperar networkidle para el marco del navegador');
      }

    } catch (error) {
      console.log(`⚠️ Error agregando marco de navegador: ${error.message}`);
      // Continuar con el screenshot aunque falle el marco
    }
  }

  /**
   * Captura la ventana completa del navegador incluyendo barra de direcciones usando herramientas del sistema
   */
  async capturarVentanaCompleta(rutaCompleta, page) {
    try {
      console.log('📸 Intentando captura con herramientas del sistema de Ubuntu...');
      
      // Esperar a que la página esté completamente visible y renderizada
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const timestamp = Date.now();
      const tempPath = `/tmp/browser_screenshot_${timestamp}.png`;
      
      // Estrategia 1: Obtener el ID de la ventana del navegador usando Playwright
      let windowId = null;
      try {
        // Intentar obtener el ID de la ventana desde el navegador
        const browserWindowId = await page.evaluate(() => {
          return window.outerWidth && window.outerHeight ? true : false;
        });
        
        if (browserWindowId) {
          // Buscar la ventana de Chrome/Chromium por título
          try {
            const searchResult = execSync('xdotool search --name "Chrome" 2>/dev/null | head -1', { 
              encoding: 'utf8',
              timeout: 2000 
            }).trim();
            
            if (searchResult) {
              windowId = searchResult;
              console.log(`🔍 Ventana de Chrome encontrada: ${windowId}`);
            }
          } catch (e) {
            console.log('⚠️ No se pudo encontrar ventana por nombre');
          }
        }
      } catch (e) {
        console.log('⚠️ No se pudo evaluar ventana del navegador');
      }
      
      // Estrategia 2: Si no se encontró por nombre, usar ventana activa
      if (!windowId) {
        try {
          windowId = execSync('xdotool getactivewindow 2>/dev/null', { 
            encoding: 'utf8',
            timeout: 2000 
          }).trim();
          console.log(`🔍 Usando ventana activa: ${windowId}`);
        } catch (e) {
          console.log('⚠️ No se pudo obtener ventana activa');
        }
      }
      
      // Intentar diferentes métodos de captura
      let capturaExitosa = false;
      
      // MÉTODO 1: import de ImageMagick con ID de ventana específico (MEJOR CALIDAD)
      if (windowId) {
        try {
          console.log(`📷 Intentando captura con import (ImageMagick) de ventana ${windowId}...`);
          execSync(`import -window ${windowId} -frame "${tempPath}" 2>/dev/null`, { 
            timeout: 8000,
            stdio: 'pipe'
          });
          
          // Verificar que el archivo se creó y tiene contenido
          const stats = await fs.stat(tempPath);
          if (stats.size > 1000) { // Al menos 1KB
            console.log(`✅ Captura exitosa con import (${(stats.size / 1024).toFixed(2)} KB)`);
            capturaExitosa = true;
          }
        } catch (error) {
          console.log(`⚠️ Falló captura con import: ${error.message}`);
        }
      }
      
      // MÉTODO 2: gnome-screenshot (ventana enfocada)
      if (!capturaExitosa) {
        try {
          console.log('📷 Intentando captura con gnome-screenshot...');
          execSync(`gnome-screenshot -w -f "${tempPath}" 2>/dev/null`, { 
            timeout: 8000,
            stdio: 'pipe'
          });
          
          const stats = await fs.stat(tempPath);
          if (stats.size > 1000) {
            console.log(`✅ Captura exitosa con gnome-screenshot (${(stats.size / 1024).toFixed(2)} KB)`);
            capturaExitosa = true;
          }
        } catch (error) {
          console.log(`⚠️ Falló captura con gnome-screenshot: ${error.message}`);
        }
      }
      
      // MÉTODO 3: scrot (ventana enfocada)
      if (!capturaExitosa) {
        try {
          console.log('📷 Intentando captura con scrot...');
          execSync(`scrot -u -z "${tempPath}" 2>/dev/null`, { 
            timeout: 8000,
            stdio: 'pipe'
          });
          
          const stats = await fs.stat(tempPath);
          if (stats.size > 1000) {
            console.log(`✅ Captura exitosa con scrot (${(stats.size / 1024).toFixed(2)} KB)`);
            capturaExitosa = true;
          }
        } catch (error) {
          console.log(`⚠️ Falló captura con scrot: ${error.message}`);
        }
      }
      
      // MÉTODO 4: maim (alternativa moderna)
      if (!capturaExitosa) {
        try {
          console.log('📷 Intentando captura con maim...');
          if (windowId) {
            execSync(`maim -i ${windowId} "${tempPath}" 2>/dev/null`, { 
              timeout: 8000,
              stdio: 'pipe'
            });
          } else {
            execSync(`maim -u "${tempPath}" 2>/dev/null`, { 
              timeout: 8000,
              stdio: 'pipe'
            });
          }
          
          const stats = await fs.stat(tempPath);
          if (stats.size > 1000) {
            console.log(`✅ Captura exitosa con maim (${(stats.size / 1024).toFixed(2)} KB)`);
            capturaExitosa = true;
          }
        } catch (error) {
          console.log(`⚠️ Falló captura con maim: ${error.message}`);
        }
      }
      
      // Si algún método funcionó, mover el archivo
      if (capturaExitosa) {
        try {
          await fs.access(tempPath);
          await fs.copyFile(tempPath, rutaCompleta);
          await fs.unlink(tempPath);
          
          console.log(chalk.green('✅ Screenshot de ventana completa guardado exitosamente con barra de navegación visible'));
          return true;
        } catch (error) {
          console.log(`❌ Error moviendo archivo: ${error.message}`);
          return false;
        }
      } else {
        console.log(chalk.yellow('❌ Todos los métodos de captura del sistema fallaron'));
        return false;
      }
      
    } catch (error) {
      console.log(`⚠️ Error general capturando ventana completa: ${error.message}`);
      return false;
    }
  }

  /**
   * Cierra el navegador y limpia sesiones
   */
  async cerrar() {
    if (this.sessionContext) {
      await this.sessionContext.close();
      this.sessionContext = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    // Limpiar estado de logins para próxima ejecución
    this.loginRealizado = {
      facebook: false,
      instagram: false
    };
  }
}
