import captureWebsite from 'capture-website';
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Credenciales para login automático en Facebook/Instagram
 */
const FACEBOOK_CREDENTIALS = {
  username: "3022159238",
  password: "6897861Yps@"
};

/**
 * Realiza login automático en Facebook usando las credenciales
 */
async function realizarLoginFacebook(page) {
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
    await page.waitForTimeout(2000);
    
    // Buscar campos de login en la página principal
    let emailField = await page.$('input[name="email"]');
    let passwordField = await page.$('input[name="pass"]');
    
    // Si no están en la página principal, ir a la página de login móvil (menos verificaciones)
    if (!emailField || !passwordField) {
      console.log('📱 Navegando a página de login móvil (evita verificaciones)...');
      await page.goto('https://m.facebook.com/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
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
    
    // Esperar navegación después del login
    console.log('⏳ Esperando respuesta del login...');
    try {
      await page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' });
    } catch {
      console.log('⚠️ Timeout en navegación, verificando URL actual...');
    }
    
    await page.waitForTimeout(3000);
    
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
    
    if (loginCompletamenteExitoso && !loginFallo) {
      console.log('✅ Login de Facebook completamente exitoso - acceso completo');
      return true;
    } else if (requiereVerificacion) {
      console.log('⚠️ Facebook requiere verificación de dos pasos - login parcial');
      console.log('🔄 Continuando sin verificación completa...');
      return false; // Retornar false para que tome screenshot de la página de verificación
    } else if (loginFallo) {
      console.log('❌ Login de Facebook falló - aún en página de login');
      return false;
    } else {
      console.log('🔄 Estado de login incierto, asumiendo fallo para mejor captura');
      return false; // Cambiar a false para ser más conservador
    }
    
  } catch (error) {
    console.log(`❌ Error durante login de Facebook: ${error.message}`);
    return false;
  }
}

/**
 * Realiza login automático en Instagram usando las credenciales de Facebook
 */
async function realizarLoginInstagram(page) {
  try {
    console.log('🔐 Realizando login automático en Instagram...');
    
    // Navegar a página de login de Instagram
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
    
    // Esperar a que aparezcan los campos de login
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // Rellenar username (usando el ID de Facebook)
    await page.fill('input[name="username"]', FACEBOOK_CREDENTIALS.username);
    await page.waitForTimeout(500);
    
    // Rellenar contraseña
    await page.fill('input[name="password"]', FACEBOOK_CREDENTIALS.password);
    await page.waitForTimeout(500);
    
    // Hacer click en login
    await page.click('button[type="submit"]');
    
    // Esperar respuesta
    await page.waitForTimeout(3000);
    
    // Verificar si el login fue exitoso
    const currentUrl = page.url();
    
    if (currentUrl.includes('instagram.com/') && !currentUrl.includes('login')) {
      console.log('✅ Login de Instagram exitoso');
      return true;
    } else if (currentUrl.includes('login') || currentUrl.includes('challenge')) {
      console.log('⚠️ Login de Instagram falló o requiere verificación');
      return false;
    } else {
      console.log('🔄 Estado de login incierto, continuando...');
      return true;
    }
    
  } catch (error) {
    console.log(`⚠️ Error durante login de Instagram: ${error.message}`);
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
  delay: 3, // Aumentar delay para mejor carga
  waitForElement: null,
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
const PLAYWRIGHT_OPTIONS = {
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
    this.estadisticas = {
      exitosas: 0,
      fallidas: 0,
      errores404: 0,
      erroresConexion: 0,
      otrosErrores: 0,
      tamanioTotal: 0
    };
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
   * Inicializa Playwright con retry
   */
  async inicializarPlaywrightConRetry(maxIntentos = 3) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        console.log(`Iniciando Playwright (intento ${intento}/${maxIntentos})...`);
        
        this.browser = await chromium.launch(PLAYWRIGHT_OPTIONS);
        
        console.log('✅ Playwright inicializado correctamente');
        return true;
    } catch (error) {
        console.log(`❌ Error en intento ${intento}: ${error.message}`);
        
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
  async capturarConPlaywright(url, rutaCompleta) {
    if (!this.browser) {
      await this.inicializarPlaywrightConRetry();
    }

    let page;
    let huboError = false;
    let mensajeError = null;
    
    try {
      // Normalizar URL (agregar protocolo si no lo tiene)
      const urlNormalizada = this.normalizarUrl(url);
      
      // Crear nueva página
      page = await this.browser.newPage();
      
      // Configurar viewport
      await page.setViewportSize({
        width: this.configuracion.width, 
        height: this.configuracion.height 
      });

      // Detectar si es Facebook o Instagram PRIMERO
      const esFacebook = urlNormalizada.includes('facebook.com');
      const esInstagram = urlNormalizada.includes('instagram.com');
      
      // Configurar headers especiales para Facebook
      let headers = { ...this.configuracion.headers };
      
      if (esFacebook) {
        // Headers optimizados para mbasic.facebook.com (versión básica)
        headers = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1'
        };
        console.log('📱 Usando headers Android para mbasic.facebook.com');
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
      
      // Para Facebook, usar la MISMA estrategia exitosa que el scraper de datos
      if (esFacebook) {
        console.log(`🔑 Detectado Facebook, usando estrategia idéntica al scraper exitoso...`);
        loginExitoso = false; // No usar cookies, usar directamente touch.facebook.com
      } else if (esInstagram) {
        console.log(`🔑 Detectado Instagram, intentando login automático...`);
        loginExitoso = await realizarLoginInstagram(page);
      }
      
      // Para Facebook e Instagram, usar versiones más confiables para screenshots
      let urlObjetivo = urlNormalizada;
      if (esFacebook) {
        // Usar mbasic.facebook.com que es más confiable para screenshots
        urlObjetivo = urlNormalizada.replace('www.facebook.com', 'mbasic.facebook.com');
        console.log(`📱 Usando mbasic.facebook.com (más confiable para screenshots): ${urlObjetivo}`);
      } else if (esInstagram) {
        // Para Instagram, usar la URL normal pero con estrategia especial
        console.log(`📱 Usando Instagram con detección de login: ${urlObjetivo}`);
      }
      
      console.log(`🌐 Navegando a página objetivo: ${urlObjetivo}`);
      
      let navegacionExitosa = false;
      
            // Para Facebook e Instagram, usar estrategias específicas
      if (esFacebook) {
        try {
          console.log(`🎯 Navegando a mbasic.facebook.com: ${urlObjetivo}`);
          await page.goto(urlObjetivo, { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
          });
          
          // Esperar tiempo adicional para que el contenido básico se cargue
          console.log(`⏳ Esperando carga completa del contenido básico...`);
          await page.waitForTimeout(3000);
          
          // Verificar si la página requiere login
          const contenidoPagina = await page.content();
          const esLoginPage = contenidoPagina.includes('name="email"') || 
                              contenidoPagina.includes('name="pass"') ||
                              contenidoPagina.includes('Iniciar sesión') ||
                              contenidoPagina.includes('Móvil o correo electrónico') ||
                              page.url().includes('login');
          
          if (esLoginPage) {
            console.log(`🔒 Página de Facebook requiere login, generando página informativa formal...`);
            
            // Crear página informativa formal para Facebook
            const paginaInformativa = this.generarPaginaInformativa(url, 'Facebook');
            
            // Cerrar la página actual y crear una nueva para mostrar la página informativa
            await page.close();
            page = await this.browser.newPage();
            
            // Configurar viewport para la página informativa
            await page.setViewportSize({
              width: this.configuracion.width, 
              height: this.configuracion.height 
            });
            
            // Establecer el contenido de la página informativa
            await page.setContent(paginaInformativa);
            await page.waitForTimeout(1000);
            
            console.log(`📄 Página informativa generada para acceso restringido de Facebook`);
          } else {
            console.log(`✅ Navegación exitosa a mbasic.facebook.com (versión básica)`);
          }
          
          navegacionExitosa = true;
          
        } catch (navError) {
          console.log(`⚠️ Error con mbasic.facebook.com: ${navError.message}`);
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
          
          if (esLoginPage) {
            console.log(`🔒 Página de Instagram requiere login, generando página informativa formal...`);
            
            // Crear página informativa formal para Instagram
            const paginaInformativa = this.generarPaginaInformativa(url, 'Instagram');
            
            // Cerrar la página actual y crear una nueva para mostrar la página informativa
            await page.close();
            page = await this.browser.newPage();
            
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
          
        } catch (navError) {
          console.log(`⚠️ Error navegando a ${urlObjetivo}: ${navError.message}`);
          navegacionExitosa = false;
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
                await page.waitForTimeout(2000);
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
          await page.waitForTimeout(1000);
          await page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(500);
        } catch (error) {
          // Ignorar errores de scroll
        }

      } catch (navegacionError) {
        // Capturar el error y crear una página nueva para mostrar el error
        huboError = true;
        mensajeError = navegacionError.message;
        
        console.log(`⚠️ Error navegando a ${urlNormalizada}: ${navegacionError.message}`);
        
        // Cerrar la página con error y crear una nueva
        await page.close();
        page = await this.browser.newPage();
        
        // Configurar viewport para la página de error
        await page.setViewportSize({
        width: this.configuracion.width, 
        height: this.configuracion.height 
      });

        // Crear página de error personalizada
        const errorHtml = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Error de Conexión - ${url}</title>
              <style>
                  body {
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      background: #f5f5f5;
                      margin: 0;
                      padding: 40px;
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #333;
                  }
                  .error-container {
                      background: white;
                      border: 1px solid #ddd;
                      border-radius: 8px;
                      padding: 50px;
                      max-width: 800px;
                      width: 100%;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .error-header {
                      text-align: center;
                      margin-bottom: 40px;
                      border-bottom: 1px solid #eee;
                      padding-bottom: 20px;
                  }
                  .error-icon {
                      font-size: 48px;
                      margin-bottom: 15px;
                      color: #666;
                  }
                  .error-title {
                      font-size: 24px;
                      font-weight: normal;
                      color: #333;
                      margin: 0;
                  }
                  .error-url {
                      font-size: 16px;
                      color: #666;
                      margin: 30px 0;
                      padding: 15px;
                      background: #f8f9fa;
                      border: 1px solid #e9ecef;
                      border-radius: 4px;
                      word-break: break-all;
                      font-family: monospace;
                  }
                  .error-message {
                      font-size: 16px;
                      color: #555;
                      line-height: 1.6;
                      margin-bottom: 30px;
                  }
                  .error-causes {
                      margin: 20px 0;
                  }
                  .error-causes h4 {
                      color: #333;
                      margin-bottom: 15px;
                      font-size: 16px;
                      font-weight: 600;
                  }
                  .error-causes ul {
                      list-style: none;
                      padding: 0;
                      margin: 0;
                  }
                  .error-causes li {
                      padding: 8px 0;
                      border-bottom: 1px solid #f0f0f0;
                      color: #666;
                  }
                  .error-causes li:last-child {
                      border-bottom: none;
                  }
                  .error-causes li:before {
                      content: "• ";
                      color: #999;
                      font-weight: bold;
                      margin-right: 8px;
                  }
                  .error-details {
                      background: #f8f9fa;
                      border: 1px solid #e9ecef;
                      padding: 20px;
                      border-radius: 4px;
                      font-family: 'Courier New', monospace;
                      font-size: 13px;
                      color: #666;
                      margin-top: 30px;
                      overflow-wrap: break-word;
                  }
                  .error-details strong {
                      color: #333;
                      display: block;
                      margin-bottom: 10px;
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  }
                  .footer-info {
                      margin-top: 40px;
                      padding-top: 20px;
                      border-top: 1px solid #eee;
                      text-align: center;
                      color: #999;
                      font-size: 12px;
                  }
                  .timestamp {
                      color: #666;
                      font-size: 13px;
                      margin-bottom: 5px;
                  }
              </style>
          </head>
          <body>
              <div class="error-container">
                  <div class="error-header">
                      <div class="error-icon">⚠</div>
                      <h1 class="error-title">No se pudo conectar al sitio web</h1>
                  </div>
                  
                  <div class="error-url">${url}</div>
                  
                  <div class="error-message">
                      El servidor no pudo establecer una conexión con el sitio web solicitado.
                  </div>
                  
                  <div class="error-causes">
                      <h4>Posibles causas del problema:</h4>
                      <ul>
                          <li>El sitio web está temporalmente fuera de servicio</li>
                          <li>La dirección URL es incorrecta o no existe</li>
                          <li>Problemas de conectividad de red</li>
                          <li>El servidor no responde o está sobrecargado</li>
                          <li>El dominio ha expirado o está bloqueado</li>
                      </ul>
                  </div>
                  
                  <div class="error-details">
                      <strong>Información técnica del error:</strong>
                      ${mensajeError}
                  </div>
                  
                  <div class="footer-info">
                      <div class="timestamp">Fecha de captura: ${new Date().toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                      <div>Sistema automático de captura de pantallas web</div>
                  </div>
              </div>
          </body>
          </html>
        `;
        
        // Establecer el contenido de la página de error
        await page.setContent(errorHtml);
        await page.waitForTimeout(1500);
      }

      // Agregar marcas de agua antes del screenshot
      await this.agregarMarcasDeAgua(page, url);

      // SIEMPRE tomar screenshot
      await page.screenshot({ 
        path: rutaCompleta,
        fullPage: this.configuracion.fullPage,
        type: this.configuracion.format
      });

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

    } finally {
      if (page) {
      await page.close();
      }
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
   */
  async capturarScreenshot(url, indice, usarPlaywright = false) {
    const spinner = ora(`Capturando ${url}`).start();
    
    try {
      // Extraer nombre del dominio de la URL para nombre descriptivo
      let nombrePagina = 'sitio-desconocido';
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        nombrePagina = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
      } catch (error) {
        // Si no se puede parsear la URL, usar una versión limpia
        nombrePagina = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
      }
      
      // Generar timestamp legible
      const now = new Date();
      const fecha = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const hora = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
      
      // Generar nombre descriptivo: dominio_fecha_hora.png
      const nombreArchivo = `${nombrePagina}_${fecha}_${hora}.${this.configuracion.format}`;
      const rutaCompleta = join(this.configuracion.directorioSalida, nombreArchivo);

      let resultado;
      
      if (usarPlaywright) {
        // Usar Playwright para Instagram y Facebook
        resultado = await this.capturarConPlaywright(url, rutaCompleta);
      } else {
        // Usar capture-website para otros sitios
        resultado = await this.capturarConCaptureWebsite(url, rutaCompleta);
      }

      // Actualizar estadísticas según el resultado
      if (resultado.exito) {
        this.estadisticas.exitosas++;
        spinner.succeed(chalk.green(`✅ ${url} -> ${nombreArchivo} ${usarPlaywright ? '(Playwright)' : '(capture-website)'}`));
      } else {
        // Hubo error pero se tomó screenshot
        this.estadisticas.fallidas++;
        
        // Clasificar error para estadísticas
        switch (resultado.tipoError) {
          case '404':
            this.estadisticas.errores404++;
            spinner.warn(chalk.yellow(`📸 404 ${url} -> ${nombreArchivo} (screenshot de error tomado)`));
            break;
          case 'conexion':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 Conexión ${url} -> ${nombreArchivo} (screenshot de error tomado)`));
            break;
          case 'timeout':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 Timeout ${url} -> ${nombreArchivo} (screenshot de error tomado)`));
            break;
          case 'dns':
            this.estadisticas.erroresConexion++;
            spinner.warn(chalk.yellow(`📸 DNS ${url} -> ${nombreArchivo} (screenshot de error tomado)`));
            break;
          default:
            this.estadisticas.otrosErrores++;
            spinner.warn(chalk.yellow(`📸 Error ${url} -> ${nombreArchivo} (screenshot de error tomado)`));
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
    console.log(`📈 Total screenshots generados: ${total}`);
    console.log(`📁 Tamaño total: ${(this.estadisticas.tamanioTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📂 Directorio: ${this.configuracion.directorioSalida}`);
    console.log(`\n💡 Nota: TODAS las URLs tienen screenshot, incluso las que dieron error 404/conexión`);
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
   * Agrega marcas de agua (URL arriba y fecha/hora abajo derecha) a la página
   * @param {Object} page - Página de Playwright
   * @param {string} url - URL original para mostrar
   */
  async agregarMarcasDeAgua(page, url) {
    try {
      // Obtener fecha y hora actuales formateadas
      const fechaHora = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Inyectar CSS y elementos HTML para las marcas de agua
      await page.evaluate((urlMarca, fechaHoraMarca) => {
        // Crear CSS para las marcas de agua
        const estiloMarcas = document.createElement('style');
        estiloMarcas.textContent = `
          .marca-agua-url {
            position: fixed !important;
            top: 10px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 8px 15px !important;
            border-radius: 20px !important;
            font-family: 'Arial', sans-serif !important;
            font-size: 14px !important;
            font-weight: bold !important;
            z-index: 999999 !important;
            backdrop-filter: blur(5px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
            max-width: 80% !important;
            text-align: center !important;
            word-break: break-all !important;
          }
          
          .marca-agua-fecha {
            position: fixed !important;
            bottom: 15px !important;
            right: 15px !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 6px 12px !important;
            border-radius: 15px !important;
            font-family: 'Arial', sans-serif !important;
            font-size: 12px !important;
            font-weight: normal !important;
            z-index: 999999 !important;
            backdrop-filter: blur(5px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
          }
        `;
        document.head.appendChild(estiloMarcas);

        // Crear elemento para URL (arriba)
        const marcaUrl = document.createElement('div');
        marcaUrl.className = 'marca-agua-url';
        marcaUrl.textContent = urlMarca;
        document.body.appendChild(marcaUrl);

        // Crear elemento para fecha/hora (abajo derecha)
        const marcaFecha = document.createElement('div');
        marcaFecha.className = 'marca-agua-fecha';
        marcaFecha.textContent = fechaHoraMarca;
        document.body.appendChild(marcaFecha);

      }, url, fechaHora);

      // Esperar un momento para que las marcas se rendericen
      await page.waitForTimeout(500);

    } catch (error) {
      console.log(`⚠️ Error agregando marcas de agua: ${error.message}`);
      // Continuar con el screenshot aunque falle la marca de agua
    }
  }

  /**
   * Cierra el navegador
   */
  async cerrar() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
