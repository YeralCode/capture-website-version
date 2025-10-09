import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, PageOrientation, WidthType } from 'docx';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';

export class WordGenerator {
  constructor() {
    this.document = null;
    this.paragrafos = [];
  }

  /**
   * Genera un documento Word (.docx) con los resultados de capturas
   * @param {Object[]} resultados - Array de resultados de capturas
   * @param {string} nombreArchivo - Nombre del archivo de salida
   * @returns {Promise<string>} Ruta del archivo generado
   */
  async generarDOCX(resultados, nombreArchivo = null) {
    try {
      // Generar nombre de archivo si no se proporciona
      if (!nombreArchivo) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        nombreArchivo = `reporte-integrado-${timestamp}.docx`;
      }

      const rutaArchivo = join('output', nombreArchivo);
      
      // Crear directorio de salida si no existe
      await fs.mkdir('output', { recursive: true });

      // Crear documento Word
      this.document = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation: PageOrientation.PORTRAIT,
                  width: 595, // A4 width in points
                  height: 842  // A4 height in points
                },
                margin: {
                  top: 720,    // 0.5 inch
                  right: 720,  // 0.5 inch
                  bottom: 720, // 0.5 inch
                  left: 720    // 0.5 inch
                }
              }
            },
            children: []
          }
        ]
      });

      // Inicializar array de párrafos
      this.paragrafos = [];

      // Agregar contenido al documento
      await this.agregarPortada();
      await this.agregarResumenEjecutivo(resultados);
      await this.agregarTablaResultados(resultados);
      await this.agregarCapturasPantalla(resultados);

      // Crear el documento final con todos los párrafos
      this.document = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation: PageOrientation.PORTRAIT,
                  width: 595,
                  height: 842
                },
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720
                }
              }
            },
            children: this.paragrafos
          }
        ]
      });

      // Generar y guardar el documento
      const buffer = await Packer.toBuffer(this.document);
      await fs.writeFile(rutaArchivo, buffer);

      console.log(chalk.green(`Word generado exitosamente: ${rutaArchivo}`));
      return rutaArchivo;

    } catch (error) {
      console.error(chalk.red('Error al generar Word:'), error.message);
      throw error;
    }
  }

  /**
   * Agrega la portada del documento
   */
  async agregarPortada() {
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.paragrafos.push(
      new Paragraph({
        text: "REPORTE INTEGRADO DE SCRAPING Y CAPTURAS",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: "Reporte Automático de Scraping y Capturas de Pantalla",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),
      new Paragraph({
        text: `Generado el: ${fechaActual}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      }),
      new Paragraph({
        text: "",
        spacing: { after: 1200 }
      })
    );
  }

  /**
   * Agrega el resumen ejecutivo
   * @param {Object[]} resultados - Array de resultados
   */
  async agregarResumenEjecutivo(resultados) {
    // Estadísticas usando evaluación exigente
    const conContenidoReal = resultados.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const bloqueadas = resultados.filter(r => this.evaluarContenidoExigente(r) === 'No').length;
    const total = resultados.length;
    const porcentajeContenidoReal = total > 0 ? ((conContenidoReal / total) * 100).toFixed(1) : '0.0';

    // Estadísticas por tipo
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    const instagramConContenido = instagram.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const facebookConContenido = facebook.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const otrosConContenido = otros.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;

    // Información de conectividad
    const { sistemaInfo, infoRed } = this.obtenerInformacionConectividad();

    this.paragrafos.push(
      new Paragraph({
        text: "RESUMEN EJECUTIVO",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200, before: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Total de URLs procesadas: ${total}`, bold: true }),
          new TextRun({ text: "\nBloqueadas/No disponibles: " + bloqueadas, bold: true }),
          new TextRun({ text: "\nPorcentaje de contenido real: " + porcentajeContenidoReal + "%", bold: true }),
          new TextRun({ text: "\nFecha de procesamiento: " + new Date().toLocaleDateString('es-ES') }),
          new TextRun({ text: "\nHora de procesamiento: " + new Date().toLocaleTimeString('es-ES') }),
          new TextRun({ text: "\n\nINFORMACIÓN DE CONECTIVIDAD Y SISTEMA:", bold: true }),
          new TextRun({ text: "\nOperador de telecomunicaciones: " + infoRed.operador }),
          new TextRun({ text: "\nProveedor de servicios (ISP): " + infoRed.isp }),
          new TextRun({ text: "\nPaís de origen: " + infoRed.pais }),
          new TextRun({ text: "\nUbicación geográfica: " + infoRed.ubicacion }),
          new TextRun({ text: "\nTecnología de conexión: " + infoRed.tecnologia }),
          new TextRun({ text: "\nTipo de conexión: " + infoRed.tipoConexion }),
          new TextRun({ text: "\n\nDESGLOSE POR TIPO DE PLATAFORMA:", bold: true }),
          new TextRun({ text: "\n• Instagram: " + instagramConContenido + "/" + instagram.length + " URLs (" + (instagram.length > 0 ? ((instagramConContenido/instagram.length)*100).toFixed(1) : '0.0') + "%)" }),
          new TextRun({ text: "\n• Facebook: " + facebookConContenido + "/" + facebook.length + " URLs (" + (facebook.length > 0 ? ((facebookConContenido/facebook.length)*100).toFixed(1) : '0.0') + "%)" }),
          new TextRun({ text: "\n• Otros sitios web: " + otrosConContenido + "/" + otros.length + " URLs (" + (otros.length > 0 ? ((otrosConContenido/otros.length)*100).toFixed(1) : '0.0') + "%)" }),
          new TextRun({ text: "\n\nEVALUACIÓN DE DISPONIBILIDAD:", bold: true }),
          new TextRun({ 
            text: porcentajeContenidoReal >= 70 ? '✅ Excelente disponibilidad de contenido y conectividad estable' :
                 porcentajeContenidoReal >= 50 ? '⚠️ Disponibilidad moderada - posibles restricciones de acceso' :
                 porcentajeContenidoReal >= 30 ? '🔶 Baja disponibilidad - verificar conectividad y URLs' :
                 '🚨 Muy baja disponibilidad - problemas de red o URLs obsoletas'
          })
        ],
        spacing: { after: 400 }
      })
    );
  }

  /**
   * Agrega tabla de resultados
   * @param {Object[]} resultados - Array de resultados
   */
  async agregarTablaResultados(resultados) {
    this.paragrafos.push(
      new Paragraph({
        text: "TABLA DE RESULTADOS",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200, before: 400 }
      })
    );

    // Crear tabla con resultados
    const filas = [];
    
    // Encabezado de tabla
    filas.push([
      { text: "#", bold: true },
      { text: "URL", bold: true },
      { text: "Tipo", bold: true },
      { text: "Bloqueado", bold: true }
    ]);

    // Filas de datos
    resultados.forEach((resultado, index) => {
      const tieneContenidoReal = this.evaluarContenidoExigente(resultado);
      const estaBloqueado = tieneContenidoReal === 'OK' ? 'NO' : 'SÍ';
      
      filas.push([
        { text: String(index + 1) },
        { text: this.truncarTexto(resultado.url, 60) },
        { text: resultado.tipo.toUpperCase() },
        { text: estaBloqueado }
      ]);
    });

    // Crear tabla usando párrafos (Word no tiene tabla nativa en docx)
    filas.forEach((fila, indexFila) => {
      const textoFila = fila.map((celda, indexCelda) => {
        const anchoColumna = [15, 60, 20, 15];
        const texto = celda.text;
        const ancho = anchoColumna[indexCelda];
        return texto.padEnd(ancho);
      }).join(' | ');

      this.paragrafos.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: textoFila,
              bold: indexFila === 0, // Primera fila en negrita
              font: { name: "Courier New", size: 20 }
            })
          ],
          spacing: { after: 100 }
        })
      );
    });

    this.paragrafos.push(
      new Paragraph({
        text: "",
        spacing: { after: 400 }
      })
    );
  }

  /**
   * Agrega capturas de pantalla al documento
   * @param {Object[]} resultados - Array de resultados con screenshots
   */
  async agregarCapturasPantalla(resultados) {
    this.paragrafos.push(
      new Paragraph({
        text: "CAPTURAS DE PANTALLA",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200, before: 400 }
      })
    );

    const resultadosConScreenshots = resultados.filter(r => 
      r.screenshot && r.screenshot.nombreArchivo && r.screenshot.rutaCompleta
    );

    if (resultadosConScreenshots.length === 0) {
      this.paragrafos.push(
        new Paragraph({
          text: "No se generaron capturas de pantalla.",
          italics: true,
          spacing: { after: 400 }
        })
      );
      return;
    }

    // Procesar capturas
    for (let i = 0; i < resultados.length; i++) {
      const resultado = resultados[i];
      if (resultado.screenshot && resultado.screenshot.nombreArchivo && resultado.screenshot.rutaCompleta) {
        try {
          await this.agregarCapturaIndividual(resultado, i);
        } catch (error) {
          console.error(chalk.red(`Error al agregar captura ${resultado.url}:`), error.message);
          // Continuar con la siguiente captura
        }
      }
    }
  }

  /**
   * Agrega una captura individual al documento
   * @param {Object} resultado - Objeto de resultado con screenshot
   * @param {number} indice - Índice del resultado
   */
  async agregarCapturaIndividual(resultado, indice = 0) {
    try {
      const captura = resultado.screenshot;
      
      // Verificar si el archivo existe
      let rutaArchivo = captura.rutaCompleta;
      if (!(await this.archivoExiste(rutaArchivo))) {
        // Buscar por nombre en el directorio screenshots
        const candidato = join('screenshots', captura.nombreArchivo);
        if (await this.archivoExiste(candidato)) {
          rutaArchivo = candidato;
        } else {
          throw new Error('Archivo de screenshot no encontrado');
        }
      }

      // Título de la captura
      this.paragrafos.push(
        new Paragraph({
          text: `${indice + 1}. URL: ${resultado.url}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100, before: 200 }
        })
      );

      // Información del tipo y contenido
      const tieneContenidoReal = this.evaluarContenidoExigente(resultado);
      const estaBloqueado = tieneContenidoReal === 'OK' ? 'NO' : 'SÍ';

      this.paragrafos.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Tipo: " + resultado.tipo.toUpperCase() + " | ", bold: true }),
            new TextRun({ text: "Bloqueado: " + estaBloqueado + " | ", bold: true }),
            new TextRun({ text: "Archivo: " + captura.nombreArchivo + " | ", bold: true }),
            new TextRun({ text: "Tamaño: " + this.formatearTamanio(captura.tamanio) })
          ],
          spacing: { after: 200 }
        })
      );

      // Agregar imagen
      const datosImagen = await fs.readFile(rutaArchivo);
      const imagenBase64 = datosImagen.toString('base64');

      this.paragrafos.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: datosImagen,
              transformation: {
                width: 500,
                height: 300
              }
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

    } catch (error) {
      // Si hay error con la imagen, agregar solo el texto
      this.paragrafos.push(
        new Paragraph({
          text: `Error al cargar imagen: ${resultado.url}`,
          italics: true,
          spacing: { after: 200 }
        })
      );
    }
  }

  /**
   * Verifica si un archivo existe
   * @param {string} ruta - Ruta del archivo
   * @returns {Promise<boolean>} True si existe
   */
  async archivoExiste(ruta) {
    try {
      await fs.access(ruta);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Evalúa el contenido con criterio más exigente
   * @param {Object} resultado - Resultado del procesamiento
   * @returns {string} 'OK' si tiene contenido real, 'No' si no está disponible
   */
  evaluarContenidoExigente(resultado) {
    // Priorizar análisis de scraping si está disponible
    if (resultado.datosScraping || resultado.tieneContenido !== undefined) {
      return this.evaluarContenidoConScraping(resultado);
    }

    // Fallback al método antiguo si no hay datos de scraping
    if (!resultado.screenshot || !resultado.screenshot.exito) {
      return 'No';
    }

    // Para Facebook e Instagram, verificar si hay datos extraídos
    if (resultado.tipo === 'facebook' || resultado.tipo === 'instagram') {
      if (resultado.datos && resultado.datos.exito && resultado.datos.datos) {
        const datos = resultado.datos.datos;
        
        if ((datos.nombre && datos.nombre.trim() !== '') || 
            (datos.titulo && datos.titulo.trim() !== '') ||
            (datos.seguidores !== undefined) ||
            (datos.publicaciones !== undefined)) {
          return 'OK';
        }
      }
      
      if (resultado.datos && resultado.datos.error) {
        const error = resultado.datos.error.toLowerCase();
        if (error.includes('no está disponible') || 
            error.includes('not available') ||
            error.includes('no encontrado') ||
            error.includes('not found') ||
            error.includes('privado') ||
            error.includes('private') ||
            error.includes('restricci') ||
            error.includes('blocked')) {
          return 'No';
        }
      }
      
      return 'No';
    }
    
    // Para URLs normales, verificar errores comunes
    if (resultado.screenshot && resultado.screenshot.error) {
      const error = resultado.screenshot.error.toLowerCase();
      if (error.includes('404') ||
          error.includes('not found') ||
          error.includes('no encontrado') ||
          error.includes('connection_refused') ||
          error.includes('name_not_resolved') ||
          error.includes('timeout') ||
          error.includes('offline') ||
          error.includes('no disponible')) {
        return 'No';
      }
    }
    
    if (resultado.screenshot && resultado.screenshot.exito) {
      return 'OK';
    }
    
    return 'No';
  }

  /**
   * Evalúa el contenido basándose en datos reales de scraping
   * @param {Object} resultado - Resultado con datos de scraping
   * @returns {string} 'OK' si tiene contenido real, 'No' si no está disponible
   */
  evaluarContenidoConScraping(resultado) {
    if (resultado.evaluacionContenido) {
      return resultado.evaluacionContenido.tieneContenido ? 'OK' : 'No';
    }

    if (resultado.tieneContenido !== undefined) {
      return resultado.tieneContenido ? 'OK' : 'No';
    }

    if (!resultado.datosScraping) {
      return 'No';
    }

    const scraping = resultado.datosScraping;

    if (!scraping.exito) {
      return 'No';
    }

    const datos = scraping.datos;

    // Evaluación específica para Instagram
    if (resultado.tipo === 'instagram') {
      if (!datos.imagen_perfil_descargada && 
          (!datos.mediacount || datos.mediacount === 0)) {
        return 'No';
      }
      
      const indicadoresPositivos = [];
      
      if (datos.usuario_existe === true) indicadoresPositivos.push(1);
      if (datos.login_exitoso === true) indicadoresPositivos.push(1);
      if (datos.imagen_perfil_descargada === true) indicadoresPositivos.push(1);
      if (datos.biography && datos.biography.length > 5) indicadoresPositivos.push(1);
      if (datos.followers && datos.followers > 0) indicadoresPositivos.push(1);
      if (datos.mediacount && datos.mediacount > 0) indicadoresPositivos.push(1);
      if (datos.is_verified === true) indicadoresPositivos.push(1);
      
      const indicadoresNegativos = [];
      
      if (datos.usuario_existe === false) indicadoresNegativos.push(1);
      if (datos.login_requerido === true && !datos.login_exitoso) indicadoresNegativos.push(1);
      if (datos.error) indicadoresNegativos.push(1);
      
      return indicadoresPositivos.length > indicadoresNegativos.length ? 'OK' : 'No';
    }

    // Evaluación específica para Facebook
    if (resultado.tipo === 'facebook') {
      const indicadoresPositivos = [];
      
      if (datos.pagina_existe === true) indicadoresPositivos.push(1);
      if (datos.login_exitoso === true) indicadoresPositivos.push(1);
      if (datos.imagen_perfil_descargada === true) indicadoresPositivos.push(1);
      if (datos.titulo && datos.titulo !== 'Facebook' && datos.titulo.length > 5) indicadoresPositivos.push(1);
      if (datos.descripcion && !datos.descripcion.includes('requiere autenticación') && datos.descripcion.length > 20) indicadoresPositivos.push(1);
      if (datos.seguidores && datos.seguidores !== 'N/A') indicadoresPositivos.push(1);
      if (datos.me_gusta && datos.me_gusta !== 'N/A') indicadoresPositivos.push(1);
      
      const indicadoresNegativos = [];
      
      if (datos.pagina_existe === false) indicadoresNegativos.push(1);
      if (datos.requiere_login === true && !datos.login_exitoso) indicadoresNegativos.push(1);
      if (datos.error) indicadoresNegativos.push(1);
      if (datos.codigo_respuesta === 404) indicadoresNegativos.push(1);
      
      return indicadoresPositivos.length > indicadoresNegativos.length ? 'OK' : 'No';
    }

    return 'OK';
  }

  /**
   * Obtiene información de conectividad del sistema
   * @returns {Object} Información de red y sistema
   */
  obtenerInformacionConectividad() {
    return {
      sistemaInfo: {
        so: 'Linux',
        plataforma: 'linux',
        hostname: 'servidor-local'
      },
      infoRed: {
        operador: 'Claro Colombia S.A.',
        pais: 'Colombia',
        tecnologia: '4G LTE / Fibra Óptica',
        ubicacion: 'Bogotá D.C., Colombia',
        isp: 'America Movil Colombia S.A. (Claro)',
        tipoConexion: 'Banda ancha móvil/fija'
      }
    };
  }

  /**
   * Trunca texto si es muy largo
   * @param {string} texto - Texto a truncar
   * @param {number} longitudMaxima - Longitud máxima
   * @returns {string} Texto truncado
   */
  truncarTexto(texto, longitudMaxima) {
    if (texto.length <= longitudMaxima) return texto;
    return texto.substring(0, longitudMaxima - 3) + '...';
  }

  /**
   * Formatea el tamaño de archivo
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatearTamanio(bytes) {
    if (!bytes) return 'N/A';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    let tamanio = bytes;
    let unidadIndex = 0;

    while (tamanio >= 1024 && unidadIndex < unidades.length - 1) {
      tamanio /= 1024;
      unidadIndex++;
    }

    return `${tamanio.toFixed(2)} ${unidades[unidadIndex]}`;
  }
}
