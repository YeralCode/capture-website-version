import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import puppeteer from 'puppeteer';

class VerificadorContenido {
  constructor() {
    this.browser = null;
    this.resultados = [];
    this.urlsProcesadas = new Set();
  }

  async inicializar() {
    console.log('🚀 Inicializando navegador...');
    this.browser = await puppeteer.launch({
      headless: true,
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
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    });
  }

  async cerrar() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async verificarInstagram(url) {
    try {
      const page = await this.browser.newPage();
      
      // Configurar user agent y headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navegar a la URL
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Esperar un poco para que cargue el contenido
      await page.waitForTimeout(3000);
      
      // Verificar si es una página de error o no disponible
      const titulo = await page.title();
      const urlActual = page.url();
      
      // Patrones que indican error o no disponible
      const patronesError = [
        'not found', '404', 'error', 'unavailable', 'private', 'suspended',
        'no disponible', 'no encontrado', 'error 404', 'página no encontrada'
      ];
      
      const esError = patronesError.some(patron => 
        titulo.toLowerCase().includes(patron) || 
        urlActual.toLowerCase().includes(patron)
      );
      
      if (esError) {
        await page.close();
        return {
          tieneContenido: false,
          razon: 'Página de error o no disponible',
          titulo: titulo,
          urlFinal: urlActual
        };
      }
      
      // Verificar si es solo la página principal de Instagram (sin usuario específico)
      if (urlActual === 'https://www.instagram.com/' || urlActual === 'https://instagram.com/') {
        await page.close();
        return {
          tieneContenido: false,
          razon: 'Solo página principal de Instagram (sin usuario específico)',
          titulo: titulo,
          urlFinal: urlActual
        };
      }
      
      // Buscar elementos que indiquen contenido real
      const elementosContenido = await page.evaluate(() => {
        // Buscar elementos típicos de un perfil de Instagram
        const selectores = [
          'article', // Posts
          '[data-testid="user-avatar"]', // Avatar del usuario
          'h2', // Nombre del usuario
          'span', // Biografía
          'a[href*="/p/"]', // Enlaces a posts
          'img[alt*="Photo by"]', // Imágenes de posts
          'div[role="button"]' // Botones de interacción
        ];
        
        let elementosEncontrados = 0;
        selectores.forEach(selector => {
          const elementos = document.querySelectorAll(selector);
          if (elementos.length > 0) {
            elementosEncontrados += elementos.length;
          }
        });
        
        return elementosEncontrados;
      });
      
      // Verificar si hay contenido real
      const tieneContenidoReal = elementosContenido > 5; // Al menos 5 elementos de contenido
      
      await page.close();
      
      return {
        tieneContenido: tieneContenidoReal,
        razon: tieneContenidoReal ? 'Contenido real encontrado' : 'Poco o ningún contenido real',
        titulo: titulo,
        urlFinal: urlActual,
        elementosContenido: elementosContenido
      };
      
    } catch (error) {
      return {
        tieneContenido: false,
        razon: `Error al verificar: ${error.message}`,
        titulo: '',
        urlFinal: url,
        error: error.message
      };
    }
  }

  async verificarFacebook(url) {
    try {
      const page = await this.browser.newPage();
      
      // Configurar user agent y headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navegar a la URL
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Esperar un poco para que cargue el contenido
      await page.waitForTimeout(3000);
      
      // Verificar si es una página de error o no disponible
      const titulo = await page.title();
      const urlActual = page.url();
      
      // Patrones que indican error o no disponible
      const patronesError = [
        'not found', '404', 'error', 'unavailable', 'private', 'suspended',
        'no disponible', 'no encontrado', 'error 404', 'página no encontrada',
        'content not available', 'this page is not available'
      ];
      
      const esError = patronesError.some(patron => 
        titulo.toLowerCase().includes(patron) || 
        urlActual.toLowerCase().includes(patron)
      );
      
      if (esError) {
        await page.close();
        return {
          tieneContenido: false,
          razon: 'Página de error o no disponible',
          titulo: titulo,
          urlFinal: urlActual
        };
      }
      
      // Verificar si es solo la página principal de Facebook
      if (urlActual === 'https://www.facebook.com/' || urlActual === 'https://facebook.com/') {
        await page.close();
        return {
          tieneContenido: false,
          razon: 'Solo página principal de Facebook (sin página específica)',
          titulo: titulo,
          urlFinal: urlActual
        };
      }
      
      // Buscar elementos que indiquen contenido real
      const elementosContenido = await page.evaluate(() => {
        // Buscar elementos típicos de una página de Facebook
        const selectores = [
          '[data-testid="post_message"]', // Mensajes de posts
          '[data-testid="story-subtitle"]', // Subtítulos de historias
          'h1', // Títulos de página
          'h2', // Subtítulos
          'div[role="article"]', // Artículos/posts
          'img[alt*="Photo"]', // Imágenes
          'div[data-testid="post"]', // Posts
          'span[dir="auto"]' // Texto con contenido
        ];
        
        let elementosEncontrados = 0;
        selectores.forEach(selector => {
          const elementos = document.querySelectorAll(selector);
          if (elementos.length > 0) {
            elementosEncontrados += elementos.length;
          }
        });
        
        return elementosEncontrados;
      });
      
      // Verificar si hay contenido real
      const tieneContenidoReal = elementosContenido > 3; // Al menos 3 elementos de contenido
      
      await page.close();
      
      return {
        tieneContenido: tieneContenidoReal,
        razon: tieneContenidoReal ? 'Contenido real encontrado' : 'Poco o ningún contenido real',
        titulo: titulo,
        urlFinal: urlActual,
        elementosContenido: elementosContenido
      };
      
    } catch (error) {
      return {
        tieneContenido: false,
        razon: `Error al verificar: ${error.message}`,
        titulo: '',
        urlFinal: url,
        error: error.message
      };
    }
  }

  async extraerUrlsDeCapturas() {
    console.log('🔍 Extrayendo URLs de capturas existentes...');
    
    // Leer todos los archivos del directorio screenshots
    const archivos = await fs.readdir('screenshots');
    const archivosPNG = archivos.filter(archivo => archivo.endsWith('.png'));
    
    console.log(`📁 Encontrados ${archivosPNG.length} archivos PNG`);
    
    const urls = [];
    
    for (const archivo of archivosPNG) {
      try {
        // Extraer información del nombre del archivo
        let url = '';
        let tipo = 'otro';
        
        // Determinar tipo y URL basado en el nombre del archivo
        if (archivo.includes('instagram')) {
          tipo = 'instagram';
          // Intentar reconstruir la URL de Instagram
          const usuarioMatch = archivo.match(/instagram_([a-zA-Z0-9_\.]+)/);
          if (usuarioMatch && usuarioMatch[1]) {
            url = `https://www.instagram.com/${usuarioMatch[1]}`;
          } else {
            url = `https://www.instagram.com/unknown_user`;
          }
        } else if (archivo.includes('facebook')) {
          tipo = 'facebook';
          // Intentar reconstruir la URL de Facebook
          const paginaMatch = archivo.match(/facebook_([a-zA-Z0-9_\.]+)/);
          if (paginaMatch && paginaMatch[1]) {
            url = `https://www.facebook.com/${paginaMatch[1]}`;
          } else {
            url = `https://www.facebook.com/unknown_page`;
          }
        } else {
          // Para otros sitios, usar el nombre del archivo (antes de la fecha) como URL base
          const nombreSinExtension = archivo.replace('.png', '');
          const urlBaseMatch = archivo.match(/^([a-zA-Z0-9_\.-]+)_/);
          if (urlBaseMatch && urlBaseMatch[1]) {
            url = `https://${urlBaseMatch[1].replace(/_/g, '.')}`;
          } else {
            url = `https://unknown-site.com/${nombreSinExtension}`;
          }
        }
        
        // Solo agregar URLs de Instagram y Facebook
        if (tipo === 'instagram' || tipo === 'facebook') {
          if (!this.urlsProcesadas.has(url)) {
            urls.push({ url, tipo, archivo });
            this.urlsProcesadas.add(url);
          }
        }
        
      } catch (error) {
        console.log(`⚠️ Error procesando archivo ${archivo}:`, error.message);
      }
    }
    
    console.log(`📊 Extraídas ${urls.length} URLs únicas (Instagram y Facebook)`);
    return urls;
  }

  async verificarTodasLasUrls() {
    console.log('🚀 Iniciando verificación de contenido...');
    
    const urls = await this.extraerUrlsDeCapturas();
    
    if (urls.length === 0) {
      console.log('❌ No se encontraron URLs de Instagram o Facebook para verificar');
      return;
    }
    
    console.log(`\n📋 Verificando ${urls.length} URLs...`);
    
    for (let i = 0; i < urls.length; i++) {
      const { url, tipo, archivo } = urls[i];
      
      console.log(`\n[${i + 1}/${urls.length}] Verificando ${tipo}: ${url}`);
      
      let resultado;
      if (tipo === 'instagram') {
        resultado = await this.verificarInstagram(url);
      } else if (tipo === 'facebook') {
        resultado = await this.verificarFacebook(url);
      } else {
        resultado = {
          tieneContenido: false,
          razon: 'Tipo no soportado para verificación',
          titulo: '',
          urlFinal: url
        };
      }
      
      const resultadoCompleto = {
        url: url,
        tipo: tipo,
        archivo: archivo,
        verificacion: resultado,
        timestamp: new Date().toISOString()
      };
      
      this.resultados.push(resultadoCompleto);
      
      // Mostrar resultado
      const estado = resultado.tieneContenido ? '✅' : '❌';
      console.log(`   ${estado} ${resultado.razon}`);
      if (resultado.elementosContenido !== undefined) {
        console.log(`   📊 Elementos encontrados: ${resultado.elementosContenido}`);
      }
      
      // Pequeña pausa entre verificaciones para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async guardarResultados() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nombreArchivo = `verificacion-contenido-${timestamp}.json`;
    
    const datos = {
      timestamp: new Date().toISOString(),
      totalUrls: this.resultados.length,
      resultados: this.resultados,
      estadisticas: this.calcularEstadisticas()
    };
    
    await fs.writeFile(nombreArchivo, JSON.stringify(datos, null, 2));
    console.log(`\n💾 Resultados guardados en: ${nombreArchivo}`);
    
    return nombreArchivo;
  }

  calcularEstadisticas() {
    const instagram = this.resultados.filter(r => r.tipo === 'instagram');
    const facebook = this.resultados.filter(r => r.tipo === 'facebook');
    
    const instagramConContenido = instagram.filter(r => r.verificacion.tieneContenido).length;
    const facebookConContenido = facebook.filter(r => r.verificacion.tieneContenido).length;
    
    return {
      instagram: {
        total: instagram.length,
        conContenido: instagramConContenido,
        sinContenido: instagram.length - instagramConContenido,
        porcentajeContenido: instagram.length > 0 ? ((instagramConContenido / instagram.length) * 100).toFixed(1) : 0
      },
      facebook: {
        total: facebook.length,
        conContenido: facebookConContenido,
        sinContenido: facebook.length - facebookConContenido,
        porcentajeContenido: facebook.length > 0 ? ((facebookConContenido / facebook.length) * 100).toFixed(1) : 0
      },
      total: {
        total: this.resultados.length,
        conContenido: instagramConContenido + facebookConContenido,
        sinContenido: this.resultados.length - instagramConContenido - facebookConContenido,
        porcentajeContenido: this.resultados.length > 0 ? (((instagramConContenido + facebookConContenido) / this.resultados.length) * 100).toFixed(1) : 0
      }
    };
  }

  mostrarEstadisticas() {
    const stats = this.calcularEstadisticas();
    
    console.log('\n📈 ESTADÍSTICAS DE VERIFICACIÓN:');
    console.log(`\n📸 Instagram (${stats.instagram.total} URLs):`);
    console.log(`   ✅ Con contenido real: ${stats.instagram.conContenido} (${stats.instagram.porcentajeContenido}%)`);
    console.log(`   ❌ Sin contenido/No disponible: ${stats.instagram.sinContenido} (${(100 - stats.instagram.porcentajeContenido).toFixed(1)}%)`);
    
    console.log(`\n📘 Facebook (${stats.facebook.total} URLs):`);
    console.log(`   ✅ Con contenido real: ${stats.facebook.conContenido} (${stats.facebook.porcentajeContenido}%)`);
    console.log(`   ❌ Sin contenido/No disponible: ${stats.facebook.sinContenido} (${(100 - stats.facebook.porcentajeContenido).toFixed(1)}%)`);
    
    console.log(`\n🎯 RESUMEN TOTAL:`);
    console.log(`   📊 Total procesado: ${stats.total.total} URLs`);
    console.log(`   ✅ Con contenido real: ${stats.total.conContenido} (${stats.total.porcentajeContenido}%)`);
    console.log(`   ❌ Sin contenido/No disponible: ${stats.total.sinContenido} (${(100 - stats.total.porcentajeContenido).toFixed(1)}%)`);
  }
}

async function main() {
  const verificador = new VerificadorContenido();
  
  try {
    await verificador.inicializar();
    await verificador.verificarTodasLasUrls();
    await verificador.guardarResultados();
    verificador.mostrarEstadisticas();
    
    console.log('\n🎉 Verificación completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error(error.stack);
  } finally {
    await verificador.cerrar();
  }
}

main();
