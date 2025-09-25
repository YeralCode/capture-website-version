import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio para extraer información de Instagram usando scripts simples de Python
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
      
      if (datosPerfil.exito) {
        this.datosExtraidos.push(datosPerfil);
        spinner.succeed(chalk.green(`✅ Perfil extraído: ${usernameLimpio}`));
        return datosPerfil;
      } else {
        throw new Error(datosPerfil.error || 'Error desconocido');
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`❌ Error en perfil ${username}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Extrae información de un post de Instagram
   * @param {string} postId - ID del post de Instagram
   * @returns {Promise<Object>} Datos del post
   */
  async extraerPost(postId) {
    const spinner = ora(`Extrayendo post de Instagram: ${postId}`).start();
    
    try {
      const datosPost = await this.ejecutarScriptPython('instagram_profile_scraper_simple.py', {
        username: postId, // Usar el postId como username para el script simple
        directorio: this.configuracion.directorioSalida,
        maxPosts: 1,
        incluirComentarios: this.configuracion.incluirComentarios
      });
      
      if (datosPost.exito) {
        this.datosExtraidos.push(datosPost);
        spinner.succeed(chalk.green(`✅ Post extraído: ${postId}`));
        return datosPost;
      } else {
        throw new Error(datosPost.error || 'Error desconocido');
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`❌ Error en post ${postId}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Ejecuta un script de Python
   * @param {string} scriptName - Nombre del script
   * @param {Object} parametros - Parámetros para el script
   * @returns {Promise<Object>} Resultado del script
   */
  async ejecutarScriptPython(scriptName, parametros) {
    return new Promise((resolve, reject) => {
      const scriptPath = join(process.cwd(), 'src', 'scripts', 'python', scriptName);
      const parametrosJson = JSON.stringify(parametros);
      
      const python = spawn('python3', [scriptPath, parametrosJson], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            // Filtrar solo la última línea que contiene el JSON válido
            const lines = stdout.trim().split('\n');
            let jsonLine = '';
            
            // Buscar la línea que comienza con '{' (JSON)
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim();
              if (line.startsWith('{') && line.endsWith('}')) {
                jsonLine = line;
                break;
              }
            }
            
            if (!jsonLine) {
              throw new Error('No se encontró JSON válido en la salida');
            }
            
            const resultado = JSON.parse(jsonLine);
            resolve(resultado);
          } catch (error) {
            console.error('Stdout completo:', stdout);
            console.error('Stderr:', stderr);
            reject(new Error(`Error al parsear resultado: ${error.message}`));
          }
        } else {
          reject(new Error(`Script falló con código ${code}: ${stderr}`));
        }
      });
      
      python.on('error', (error) => {
        reject(new Error(`Error al ejecutar script: ${error.message}`));
      });
    });
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
