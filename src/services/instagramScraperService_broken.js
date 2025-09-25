import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio para extraer información de Instagram usando web scraping simple
 */
export class InstagramScraperService {
  constructor(configuracion = {}) {
    this.configuracion = {
      directorioSalida: 'scraped_data',
      maxPosts: 10,
      incluirComentarios: false,
      incluirHistorias: false,
      ...configuracion
    };
    this.datosExtraidos = [];
  }

  /**
   * Inicializa el servicio y crea directorios necesarios
   */
  async inicializar() {
    try {
      await fs.mkdir(this.configuracion.directorioSalida, { recursive: true });
      console.log(chalk.green(`📁 Directorio de datos extraídos: ${this.configuracion.directorioSalida}`));
    } catch (error) {
      console.error(chalk.red('❌ Error al crear directorio de salida:'), error.message);
      throw error;
    }
  }

  /**
   * Extrae información de un perfil de Instagram
   * @param {string} username - Nombre de usuario de Instagram
   * @returns {Promise<Object>} Datos del perfil
   */
  async extraerPerfil(username) {
    const spinner = ora(`Extrayendo perfil de Instagram: ${username}`).start();
    
    try {
      // Limpiar el username (remover @ si existe)
      const usernameLimpio = username.replace('@', '').replace('instagram.com/', '');
      
      const datosPerfil = await this.ejecutarScriptPython('instagram_profile_scraper_simple.py', {
        username: usernameLimpio,
        directorio: this.configuracion.directorioSalida,
        maxPosts: this.configuracion.maxPosts,
        incluirComentarios: this.configuracion.incluirComentarios
      });

      const resultado = {
        tipo: 'instagram_profile',
        username: usernameLimpio,
        url: `https://www.instagram.com/${usernameLimpio}/`,
        datos: datosPerfil,
        timestamp: new Date().toISOString(),
        exito: true
      };

      this.datosExtraidos.push(resultado);
      spinner.succeed(chalk.green(`✅ Perfil extraído: ${usernameLimpio}`));
      return resultado;

    } catch (error) {
      spinner.fail(chalk.red(`❌ Error al extraer perfil ${username}: ${error.message}`));
      
      const resultado = {
        tipo: 'instagram_profile',
        username: username,
        url: `https://www.instagram.com/${username}/`,
        datos: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        exito: false
      };

      this.datosExtraidos.push(resultado);
      return resultado;
    }
  }

  /**
   * Extrae información de un post específico de Instagram
   * @param {string} postUrl - URL del post de Instagram
   * @returns {Promise<Object>} Datos del post
   */
  async extraerPost(postUrl) {
    const spinner = ora(`Extrayendo post de Instagram: ${postUrl}`).start();
    
    try {
      // Extraer shortcode del post de la URL
      const shortcode = this.extraerShortcodeDeUrl(postUrl);
      
      if (!shortcode) {
        throw new Error('No se pudo extraer el shortcode del post');
      }

      // Para posts, usamos el mismo método que perfiles pero con la URL completa
      const datosPost = await this.ejecutarScriptPython('instagram_profile_scraper_simple.py', {
        username: shortcode, // Usar shortcode como username para posts
        directorio: this.configuracion.directorioSalida,
        incluirComentarios: this.configuracion.incluirComentarios
      });

      const resultado = {
        tipo: 'instagram_post',
        shortcode: shortcode,
        url: postUrl,
        datos: datosPost,
        timestamp: new Date().toISOString(),
        exito: true
      };

      this.datosExtraidos.push(resultado);
      spinner.succeed(chalk.green(`✅ Post extraído: ${shortcode}`));
      return resultado;

    } catch (error) {
      spinner.fail(chalk.red(`❌ Error al extraer post ${postUrl}: ${error.message}`));
      
      const resultado = {
        tipo: 'instagram_post',
        url: postUrl,
        datos: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        exito: false
      };

      this.datosExtraidos.push(resultado);
      return resultado;
    }
  }

  /**
   * Extrae shortcode de una URL de Instagram
   * @param {string} url - URL del post
   * @returns {string|null} Shortcode del post
   */
  extraerShortcodeDeUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Patrones comunes de URLs de Instagram
      const patrones = [
        /\/p\/([^\/]+)\//,  // /p/SHORTCODE/
        /\/reel\/([^\/]+)\//, // /reel/SHORTCODE/
        /\/tv\/([^\/]+)\//   // /tv/SHORTCODE/
      ];

      for (const patron of patrones) {
        const match = pathname.match(patron);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Ejecuta un script de Python para extraer datos
   * @param {string} scriptName - Nombre del script Python
   * @param {Object} parametros - Parámetros para el script
   * @returns {Promise<Object>} Resultado del script
   */
  async ejecutarScriptPython(scriptName, parametros) {
    return new Promise((resolve, reject) => {
      const rutaScript = join(process.cwd(), 'src', 'scripts', 'python', scriptName);
      const args = [rutaScript, JSON.stringify(parametros)];
      
      const proceso = spawn('python3', args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: join(process.cwd(), 'venv_scraping', 'lib', 'python3.12', 'site-packages') }
      });

      let salida = '';
      let errorSalida = '';

      proceso.stdout.on('data', (data) => {
        salida += data.toString();
      });

      proceso.stderr.on('data', (data) => {
        errorSalida += data.toString();
      });

      proceso.on('close', (codigo) => {
        if (codigo === 0) {
          try {
            const resultado = JSON.parse(salida);
            resolve(resultado);
          } catch (error) {
            reject(new Error(`Error al parsear resultado: ${error.message}`));
          }
        } else {
          reject(new Error(`Script falló con código ${codigo}: ${errorSalida}`));
        }
      });

      proceso.on('error', (error) => {
        reject(new Error(`Error al ejecutar script: ${error.message}`));
      });
    });
  }

  /**
   * Procesa múltiples URLs de Instagram
   * @param {string[]} urls - Array de URLs de Instagram
   * @returns {Promise<Object[]>} Array de resultados
   */
  async procesarUrls(urls) {
    console.log(chalk.cyan(`\n📱 PROCESANDO ${urls.length} URLs DE INSTAGRAM\n`));
    
    await this.inicializar();
    const resultados = [];

    for (const url of urls) {
      try {
        if (this.esUrlDePerfil(url)) {
          const username = this.extraerUsernameDeUrl(url);
          const resultado = await this.extraerPerfil(username);
          resultados.push(resultado);
        } else if (this.esUrlDePost(url)) {
          const resultado = await this.extraerPost(url);
          resultados.push(resultado);
        } else {
          console.log(chalk.yellow(`⚠️ URL no reconocida: ${url}`));
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error procesando ${url}: ${error.message}`));
      }
    }

    this.mostrarResumen();
    return resultados;
  }

  /**
   * Verifica si una URL es de un perfil
   * @param {string} url - URL a verificar
   * @returns {boolean} True si es URL de perfil
   */
  esUrlDePerfil(url) {
    return url.includes('instagram.com/') && !url.includes('/p/') && !url.includes('/reel/') && !url.includes('/tv/');
  }

  /**
   * Verifica si una URL es de un post
   * @param {string} url - URL a verificar
   * @returns {boolean} True si es URL de post
   */
  esUrlDePost(url) {
    return url.includes('instagram.com/p/') || url.includes('instagram.com/reel/') || url.includes('instagram.com/tv/');
  }

  /**
   * Extrae username de una URL de perfil
   * @param {string} url - URL del perfil
   * @returns {string} Username extraído
   */
  extraerUsernameDeUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const username = pathname.split('/')[1];
      return username || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Muestra un resumen de los datos extraídos
   */
  mostrarResumen() {
    const exitosos = this.datosExtraidos.filter(d => d.exito).length;
    const fallidos = this.datosExtraidos.filter(d => !d.exito).length;

    console.log(chalk.yellow('\n📊 RESUMEN DE EXTRACCIÓN DE INSTAGRAM:'));
    console.log(chalk.green(`✅ Exitosos: ${exitosos}`));
    console.log(chalk.red(`❌ Fallidos: ${fallidos}`));
    console.log(chalk.blue(`📁 Directorio: ${this.configuracion.directorioSalida}\n`));
  }

  /**
   * Obtiene todos los datos extraídos
   * @returns {Object[]} Array de datos extraídos
   */
  obtenerDatosExtraidos() {
    return this.datosExtraidos;
  }

  /**
   * Obtiene solo los datos exitosos
   * @returns {Object[]} Array de datos exitosos
   */
  obtenerDatosExitosos() {
    return this.datosExtraidos.filter(d => d.exito);
  }
  }
  /**
   * Extrae datos de múltiples URLs de Instagram
   * @param {string[]} urls - URLs de Instagram a procesar
   * @returns {Promise<Object[]>} Array de resultados
   */
  async extraerDatos(urls) {
    const resultados = [];
    
    for (const url of urls) {
      try {
        let resultado;
        
        if (url.includes('/p/')) {
          // Es un post
          const postId = this.extraerPostId(url);
          resultado = await this.extraerPost(postId);
        } else {
          // Es un perfil
          const username = this.extraerUsername(url);
          resultado = await this.extraerPerfil(username);
        }
        
        resultados.push({
          url,
          exito: true,
          datos: resultado,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        resultados.push({
          url,
          exito: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return resultados;
  }

  /**
   * Extrae el username de una URL de Instagram
   */
  extraerUsername(url) {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extrae el post ID de una URL de Instagram
   */
  extraerPostId(url) {
    const match = url.match(/instagram\.com\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
}
