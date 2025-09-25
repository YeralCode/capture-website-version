import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Servicio para extraer información de Facebook usando scripts simples de Python
 */
export class FacebookScraperService {
  constructor(configuracion = {}) {
    this.configuracion = {
      directorioSalida: 'scraped_data',
      maxPosts: 10,
      incluirComentarios: false,
      incluirReacciones: true,
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
   * Extrae información de una página de Facebook
   * @param {string} pageName - Nombre de la página de Facebook
   * @returns {Promise<Object>} Datos de la página
   */
  async extraerPagina(pageName) {
    const spinner = ora(`Extrayendo página de Facebook: ${pageName}`).start();
    
    try {
      // Limpiar el pageName
      const pageNameLimpio = pageName.replace('facebook.com/', '');
      
      // Usar el nuevo scraper con autenticación
      const datosPagina = await this.ejecutarScriptPython('facebook_page_scraper_auth.py', {
        pageName: pageNameLimpio,
        directorio: this.configuracion.directorioSalida,
        maxPosts: this.configuracion.maxPosts,
        incluirComentarios: this.configuracion.incluirComentarios,
        incluirReacciones: this.configuracion.incluirReacciones,
        usarAuth: true  // Habilitar autenticación
      });
      
      if (datosPagina.exito) {
        this.datosExtraidos.push(datosPagina);
        spinner.succeed(chalk.green(`✅ Página extraída: ${pageNameLimpio}`));
        return datosPagina;
      } else {
        throw new Error(datosPagina.error || 'Error desconocido');
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`❌ Error en página ${pageName}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Extrae información de un perfil de Facebook
   * @param {string} profileName - Nombre del perfil de Facebook
   * @returns {Promise<Object>} Datos del perfil
   */
  async extraerPerfil(profileName) {
    // Para Facebook, los perfiles y páginas se manejan igual
    return await this.extraerPagina(profileName);
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
