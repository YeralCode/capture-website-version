import { jsPDF } from 'jspdf';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Generador de PDF para reportes de capturas de pantalla integrados
 */
export class PDFGenerator {
  constructor() {
    this.pdf = null;
    this.margenIzquierdo = 20;
    this.margenSuperior = 20;
    this.margenDerecho = 20;
    this.margenInferior = 20;
    this.anchoPagina = 210; // A4 en mm
    this.altoPagina = 297;
    this.areaUtilAncho = this.anchoPagina - this.margenIzquierdo - this.margenDerecho;
    this.areaUtilAlto = this.altoPagina - this.margenSuperior - this.margenInferior;
    this.posicionY = this.margenSuperior;
  }

  /**
   * Inicializa un nuevo documento PDF
   * @param {string} titulo - Título del documento
   */
  inicializarDocumento(titulo = 'Reporte Integrado de Scraping y Screenshots') {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.posicionY = this.margenSuperior;
    
    // Configurar metadatos
    this.pdf.setProperties({
      title: titulo,
      subject: 'Reporte automatico de scraping y capturas de sitios web',
      author: 'Integrated Scraping & Screenshot Tool',
      creator: 'Integrated Scraping Tool',
      keywords: 'scraping, screenshots, web, automation, pdf, instagram, facebook'
    });

    this.agregarPortada(titulo);
  }

  /**
   * Agrega la portada del documento
   * @param {string} titulo - Título del documento
   */
  agregarPortada(titulo) {
    // Título principal
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.centrarTexto(titulo, this.posicionY + 40);

    // Subtítulo
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'normal');
    this.centrarTexto('Reporte Automatico de Scraping y Capturas de Pantalla', this.posicionY + 60);

    // Fecha
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    this.pdf.setFontSize(12);
    this.centrarTexto(`Generado el: ${fechaActual}`, this.posicionY + 80);

    // Línea decorativa
    this.pdf.setLineWidth(0.5);
    this.pdf.line(
      this.margenIzquierdo + 30,
      this.posicionY + 100,
      this.anchoPagina - this.margenDerecho - 30,
      this.posicionY + 100
    );

    this.nuevaPagina();
  }

  /**
   * Agrega un resumen ejecutivo al PDF
   * @param {Object[]} resultados - Array de resultados de capturas
   */
  agregarResumenEjecutivo(resultados) {
    this.agregarTitulo('RESUMEN EJECUTIVO');
    
    const exitosos = resultados.filter(r => r.exito).length;
    const fallidos = resultados.filter(r => !r.exito).length;
    const total = resultados.length;
    const porcentajeExito = ((exitosos / total) * 100).toFixed(1);

    // Estadísticas por tipo
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    const estadisticas = [
      `Total de URLs procesadas: ${total}`,
      `Procesos exitosos: ${exitosos}`,
      `Procesos fallidos: ${fallidos}`,
      `Porcentaje de exito: ${porcentajeExito}%`,
      `Fecha de procesamiento: ${new Date().toLocaleDateString('es-ES')}`,
      '',
      'Desglose por tipo:',
      `• Instagram: ${instagram.length} URLs`,
      `• Facebook: ${facebook.length} URLs`,
      `• Otros sitios: ${otros.length} URLs`
    ];

    this.agregarLista(estadisticas);
    this.posicionY += 10;
  }

  /**
   * Agrega análisis detallado de los resultados
   * @param {Object[]} resultados - Array de resultados de capturas
   */
  agregarAnalisisDetallado(resultados) {
    // Análisis detallado eliminado según solicitud del usuario
    // Se mantiene solo la tabla de resultados y capturas
  }

  /**
   * Agrega una lista de elementos
   * @param {string[]} elementos - Array de elementos
   */
  agregarLista(elementos) {
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    
    elementos.forEach(elemento => {
      this.verificarEspacioDisponible(5);
      this.pdf.text(elemento, this.margenIzquierdo, this.posicionY);
      this.posicionY += 5;
    });
  }

  /**
   * Agrega una tabla de resultados simplificada
   * @param {Object[]} resultados - Array de resultados
   */
  async agregarTablaResultados(resultados) {
    this.agregarTitulo('TABLA DE RESULTADOS');

    // Encabezados de la tabla
    const anchosColumnas = [15, 85, 25, 25, 20];
    const alturaFila = 8;
    const posicionXInicial = this.margenIzquierdo;
    
    let posicionX = posicionXInicial;
    
    // Encabezados
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    const encabezados = ['#', 'URL', 'Tipo', 'Estado', 'Contenido'];
    
    encabezados.forEach((encabezado, index) => {
      this.pdf.text(encabezado, posicionX, this.posicionY);
      posicionX += anchosColumnas[index];
    });
    
    this.posicionY += alturaFila;
    
    // Línea separadora
    this.pdf.setLineWidth(0.2);
    this.pdf.line(
      this.margenIzquierdo,
      this.posicionY - 2,
      this.anchoPagina - this.margenDerecho,
      this.posicionY - 2
    );
    this.posicionY += 3;

    // Filas de datos
    this.pdf.setFont('helvetica', 'normal');
    resultados.forEach((resultado, index) => {
      this.verificarEspacioDisponible(alturaFila + 5);
      
      posicionX = posicionXInicial;
      
      // Determinar estado más descriptivo del screenshot
      let estadoScreenshot = 'OK';
      let tieneContenido = 'OK';
      
      if (!resultado.screenshot || !resultado.screenshot.exito) {
        tieneContenido = 'No';
        if (resultado.screenshot?.tipoError === '404' || resultado.screenshot?.error?.includes('404')) {
          estadoScreenshot = 'Error 404';
        } else if (resultado.screenshot?.tipoError === 'conexion' || resultado.screenshot?.error?.includes('CONNECTION_REFUSED')) {
          estadoScreenshot = 'Offline';
        } else if (resultado.screenshot?.tipoError === 'timeout') {
          estadoScreenshot = 'Timeout';
        } else {
          estadoScreenshot = 'Error';
        }
      } else {
        // Evaluar si el contenido extraído es relevante
        tieneContenido = this.evaluarContenidoRelevante(resultado);
      }
      
      const fila = [
        String(index + 1),
        this.truncarTexto(resultado.url, 42),
        resultado.tipo.toUpperCase(),
        estadoScreenshot,
        tieneContenido
      ];

      fila.forEach((celda, colIndex) => {
        this.pdf.text(celda, posicionX, this.posicionY);
        posicionX += anchosColumnas[colIndex];
      });

      this.posicionY += alturaFila;
    });

    this.posicionY += 10;
  }

  /**
   * Agrega capturas de pantalla al PDF
   * @param {Object[]} resultados - Array de resultados con screenshots
   */
  async agregarCapturasPantalla(resultados) {
    this.agregarTitulo('CAPTURAS DE PANTALLA');

    // Incluir TODOS los resultados que tienen archivo de screenshot (exitosos o con error)
    const resultadosConScreenshots = resultados.filter(r => 
      r.screenshot && r.screenshot.nombreArchivo && r.screenshot.rutaCompleta
    );

    if (resultadosConScreenshots.length === 0) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text('No se generaron capturas de pantalla.', this.margenIzquierdo, this.posicionY);
      this.posicionY += 10;
      return;
    }

    // Procesar todas las capturas manteniendo el orden original
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
   * Agrega una captura individual al PDF
   * @param {Object} resultado - Objeto de resultado con screenshot
   * @param {number} indice - Índice del resultado
   */
  async agregarCapturaIndividual(resultado, indice = 0) {
    try {
      const captura = resultado.screenshot;
      
      // Verificar si hay suficiente espacio para la imagen
      const alturaImagenEstimada = 120; // Altura estimada de la imagen
      this.verificarEspacioDisponible(alturaImagenEstimada + 50);

      // Título de la captura
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${indice + 1}. URL: ${resultado.url}`, this.margenIzquierdo, this.posicionY);
      this.posicionY += 8;

      // Información del tipo y estado
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(`Tipo: ${resultado.tipo.toUpperCase()}`, this.margenIzquierdo, this.posicionY);
      
      // Determinar estado descriptivo del screenshot
      let estadoScreenshot = 'OK';
      if (!captura.exito) {
        if (captura.tipoError === '404' || captura.error?.includes('404')) {
          estadoScreenshot = 'Pagina no encontrada';
        } else if (captura.tipoError === 'conexion' || captura.error?.includes('CONNECTION_REFUSED')) {
          estadoScreenshot = 'Sitio no disponible';
        } else if (captura.tipoError === 'timeout') {
          estadoScreenshot = 'Tiempo agotado';
        } else {
          estadoScreenshot = 'No accesible';
        }
      }
      
      this.pdf.text(`Estado: ${estadoScreenshot}`, this.margenIzquierdo + 100, this.posicionY);
      this.posicionY += 8;

      // Información del archivo
      this.pdf.text(`Archivo: ${captura.nombreArchivo}`, this.margenIzquierdo, this.posicionY);
      this.pdf.text(`Tamano: ${this.formatearTamanio(captura.tamanio)}`, this.margenIzquierdo + 100, this.posicionY);
      this.posicionY += 8;

      // Leer y convertir imagen
      const datosImagen = await fs.readFile(captura.rutaCompleta);
      const imagenBase64 = datosImagen.toString('base64');
      const formatoImagen = this.obtenerFormatoImagen(captura.nombreArchivo);

      // Calcular dimensiones de la imagen en el PDF
      const anchoMaximo = this.areaUtilAncho;
      const altoMaximo = 100; // Limitar altura máxima
      
      // Agregar imagen al PDF
      this.pdf.addImage(
        `data:image/${formatoImagen};base64,${imagenBase64}`,
        formatoImagen.toUpperCase(),
        this.margenIzquierdo,
        this.posicionY,
        anchoMaximo,
        altoMaximo,
        undefined,
        'FAST'
      );

      this.posicionY += altoMaximo + 15;

      // Línea separadora
      this.pdf.setLineWidth(0.2);
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(
        this.margenIzquierdo,
        this.posicionY - 5,
        this.anchoPagina - this.margenDerecho,
        this.posicionY - 5
      );
      this.pdf.setDrawColor(0, 0, 0); // Resetear color

    } catch (error) {
      // Si hay error con la imagen, agregar solo el texto
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text(`Error al cargar imagen: ${resultado.url}`, this.margenIzquierdo, this.posicionY);
      this.posicionY += 20;
    }
  }

  /**
   * Agrega datos extraídos al PDF
   * @param {Object[]} resultados - Array de resultados con datos extraídos
   */
  async agregarDatosExtraidos(resultados) {
    this.agregarTitulo('DATOS EXTRAIDOS');

    // Filtrar solo resultados con datos exitosos
    const resultadosConDatos = resultados.filter(r => r.datos && r.datos.exito);

    if (resultadosConDatos.length === 0) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text('No se extrajeron datos exitosamente.', this.margenIzquierdo, this.posicionY);
      this.posicionY += 10;
      return;
    }

    for (const resultado of resultadosConDatos) {
      this.verificarEspacioDisponible(30);
      
      // Título del resultado
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`URL: ${resultado.url}`, this.margenIzquierdo, this.posicionY);
      this.posicionY += 8;

      // Información básica
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      
      const datos = resultado.datos.datos;
      if (datos) {
        if (resultado.tipo === 'instagram') {
          this.pdf.text(`Username: ${datos.username || 'N/A'}`, this.margenIzquierdo, this.posicionY);
          this.pdf.text(`Seguidores: ${datos.seguidores || 'N/A'}`, this.margenIzquierdo + 80, this.posicionY);
          this.posicionY += 5;
          this.pdf.text(`Posts: ${datos.posts || 'N/A'}`, this.margenIzquierdo, this.posicionY);
          this.pdf.text(`Verificado: ${datos.es_verificado ? 'Si' : 'No'}`, this.margenIzquierdo + 80, this.posicionY);
          this.posicionY += 5;
          if (datos.biografia) {
            this.pdf.text(`Biografia: ${this.truncarTexto(datos.biografia, 80)}`, this.margenIzquierdo, this.posicionY);
            this.posicionY += 5;
          }
        } else if (resultado.tipo === 'facebook') {
          this.pdf.text(`Pagina: ${datos.page_name || 'N/A'}`, this.margenIzquierdo, this.posicionY);
          this.pdf.text(`Titulo: ${this.truncarTexto(datos.titulo || 'N/A', 60)}`, this.margenIzquierdo + 80, this.posicionY);
          this.posicionY += 5;
          if (datos.descripcion) {
            this.pdf.text(`Descripcion: ${this.truncarTexto(datos.descripcion, 80)}`, this.margenIzquierdo, this.posicionY);
            this.posicionY += 5;
          }
        }
      }

      this.posicionY += 10;
    }
  }

  /**
   * Agrega un título de sección
   * @param {string} titulo - Título a agregar
   */
  agregarTitulo(titulo) {
    this.verificarEspacioDisponible(20);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(titulo, this.margenIzquierdo, this.posicionY);
    this.posicionY += 15;
  }

  /**
   * Agrega un subtítulo de sección
   * @param {string} subtitulo - Subtítulo a agregar
   */
  agregarSubtitulo(subtitulo) {
    this.verificarEspacioDisponible(15);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(subtitulo, this.margenIzquierdo, this.posicionY);
    this.posicionY += 12;
  }

  /**
   * Agrega un sub-subtítulo de sección
   * @param {string} subsubtitulo - Sub-subtítulo a agregar
   */
  agregarSubSubtitulo(subsubtitulo) {
    this.verificarEspacioDisponible(10);
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(subsubtitulo, this.margenIzquierdo + 5, this.posicionY);
    this.posicionY += 8;
  }

  /**
   * Centra texto en la página
   * @param {string} texto - Texto a centrar
   * @param {number} y - Posición Y
   */
  centrarTexto(texto, y) {
    const anchoTexto = this.pdf.getTextWidth(texto);
    const x = (this.anchoPagina - anchoTexto) / 2;
    this.pdf.text(texto, x, y);
  }

  /**
   * Verifica si hay suficiente espacio en la página actual
   * @param {number} alturaRequerida - Altura requerida en mm
   */
  verificarEspacioDisponible(alturaRequerida) {
    if (this.posicionY + alturaRequerida > this.altoPagina - this.margenInferior) {
      this.nuevaPagina();
    }
  }

  /**
   * Crea una nueva página
   */
  nuevaPagina() {
    this.pdf.addPage();
    this.posicionY = this.margenSuperior;
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
   * Evalúa si el contenido extraído es relevante o útil
   * @param {Object} resultado - Resultado del procesamiento
   * @returns {string} 'OK' si hay contenido relevante, 'No' si no
   */
  evaluarContenidoRelevante(resultado) {
    // Para Instagram: verificar si se extrajo información útil
    if (resultado.tipo === 'instagram') {
      if (resultado.datos && resultado.datos.exito) {
        const datos = resultado.datos.datos;
        // Verificar si tiene información relevante
        if (datos.seguidores && datos.seguidores !== 'N/A' && datos.seguidores !== 'No disponible') {
          return 'OK';
        }
        if (datos.descripcion && datos.descripcion.length > 10) {
          return 'OK';
        }
        if (datos.posts_recientes && datos.posts_recientes.length > 0) {
          return 'OK';
        }
        // Si no hay datos relevantes o pide login
        if (datos.requiere_login || datos.acceso_limitado) {
          return 'No';
        }
      }
      return 'No';
    }
    
    // Para Facebook: verificar si se extrajo información útil
    if (resultado.tipo === 'facebook') {
      if (resultado.datos && resultado.datos.exito) {
        const datos = resultado.datos.datos;
        // Verificar si tiene información relevante
        if (datos.seguidores && datos.seguidores !== 'N/A' && datos.seguidores !== 'No disponible') {
          return 'OK';
        }
        if (datos.descripcion && datos.descripcion.length > 10) {
          return 'OK';
        }
        if (datos.me_gusta && datos.me_gusta !== 'N/A') {
          return 'OK';
        }
        // Si solo pide login o no hay contenido útil
        if (datos.requiere_login || datos.necesita_login_activo) {
          return 'No';
        }
      }
      return 'No';
    }
    
    // Para otros sitios: si el screenshot es exitoso, asumimos contenido OK
    // (ya que no extraemos datos específicos de estos)
    return 'OK';
  }

  /**
   * Obtiene el formato de imagen basado en la extensión
   * @param {string} nombreArchivo - Nombre del archivo
   * @returns {string} Formato de imagen
   */
  obtenerFormatoImagen(nombreArchivo) {
    const extension = nombreArchivo.split('.').pop().toLowerCase();
    return extension === 'jpg' ? 'jpeg' : extension;
  }

  /**
   * Analiza los resultados de screenshots de forma simplificada
   * @param {Object[]} resultados - Array de resultados
   * @returns {string[]} Array de líneas de análisis simplificado
   */
  analizarScreenshotsSimplificado(resultados) {
    const total = resultados.length;
    const exitosos = resultados.filter(r => r.screenshot && r.screenshot.exito).length;
    const con404 = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === '404' || r.screenshot.error?.includes('404'))).length;
    const conErrorConexion = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === 'conexion' || r.screenshot.error?.includes('CONNECTION_REFUSED'))).length;
    const conTimeout = resultados.filter(r => r.screenshot && r.screenshot.tipoError === 'timeout').length;
    const otrosErrores = total - exitosos - con404 - conErrorConexion - conTimeout;
    
    const porcentajeExitosos = total > 0 ? ((exitosos / total) * 100).toFixed(1) : '0.0';
    const porcentaje404 = total > 0 ? ((con404 / total) * 100).toFixed(1) : '0.0';

    return [
      `RESUMEN DE ${total} URLs PROCESADAS:`,
      '',
      `Sitios con contenido accesible: ${exitosos} (${porcentajeExitosos}%)`,
      `Paginas con error 404 (no encontradas): ${con404} (${porcentaje404}%)`,
      `Sitios no disponibles (offline): ${conErrorConexion}`,
      `Timeouts de conexion: ${conTimeout}`,
      `Otros errores: ${otrosErrores}`,
      '',
      'INTERPRETACION:',
      exitosos > total * 0.7 ? 'Excelente tasa de acceso al contenido' : 
      exitosos > total * 0.3 ? 'Tasa moderada de acceso al contenido' : 
      'Baja tasa de acceso, revisar URLs',
      con404 > total * 0.5 ? 'Alto numero de URLs obsoletas o incorrectas' : 
      con404 > total * 0.2 ? 'Numero moderado de URLs obsoletas' : 
      'Pocas URLs obsoletas detectadas'
    ];
  }

  /**
   * Analiza los resultados de Instagram de forma global
   * @param {Object[]} resultados - Array de resultados de Instagram
   * @returns {string[]} Array de líneas de análisis global
   */
  analizarInstagramGlobal(resultados) {
    const total = resultados.length;
    const conDatos = resultados.filter(r => r.datos && r.datos.exito).length;
    const perfilesPrivados = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.es_privado).length;
    const perfilesVerificados = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.es_verificado).length;
    const conImagenPerfil = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.imagen_perfil_descargada).length;
    const requierenLogin = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.login_requerido).length;

    const porcentajeDatos = total > 0 ? ((conDatos / total) * 100).toFixed(1) : '0.0';
    const porcentajeVerificados = conDatos > 0 ? ((perfilesVerificados / conDatos) * 100).toFixed(1) : '0.0';
    const porcentajePrivados = total > 0 ? ((perfilesPrivados / total) * 100).toFixed(1) : '0.0';

    return [
      `• Total procesado: ${total} perfiles de Instagram`,
      `• Extracción exitosa: ${conDatos} perfiles (${porcentajeDatos}%)`,
      `• Perfiles verificados: ${perfilesVerificados} (${porcentajeVerificados}% del total extraído)`,
      `• Perfiles privados: ${perfilesPrivados} (${porcentajePrivados}%)`,
      `• Restricciones de login: ${requierenLogin} perfiles`,
      `• Imágenes descargadas: ${conImagenPerfil} de ${conDatos} exitosos`,
      '',
      'Conclusión global:',
      total === 0 ? '- Sin URLs de Instagram para procesar' :
      porcentajeDatos > 80 ? '- Excelente tasa de extracción de datos' :
      porcentajeDatos > 50 ? '- Tasa moderada de extracción de datos' :
      '- Baja tasa de extracción (restricciones de acceso)'
    ];
  }

  /**
   * Analiza los resultados de Facebook de forma global
   * @param {Object[]} resultados - Array de resultados de Facebook
   * @returns {string[]} Array de líneas de análisis global
   */
  analizarFacebookGlobal(resultados) {
    const total = resultados.length;
    const conDatos = resultados.filter(r => r.datos && r.datos.exito).length;
    const paginasPublicas = resultados.filter(r => r.datos && r.datos.datos && !r.datos.datos.es_privado).length;
    const conImagenPerfil = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.imagen_perfil_descargada).length;
    const requierenLogin = resultados.filter(r => r.datos && r.datos.datos && r.datos.datos.necesita_login_activo).length;

    const porcentajeDatos = total > 0 ? ((conDatos / total) * 100).toFixed(1) : '0.0';
    const porcentajePublicas = total > 0 ? ((paginasPublicas / total) * 100).toFixed(1) : '0.0';

    return [
      `• Total procesado: ${total} páginas de Facebook`,
      `• Extracción exitosa: ${conDatos} páginas (${porcentajeDatos}%)`,
      `• Páginas públicas: ${paginasPublicas} (${porcentajePublicas}%)`,
      `• Páginas con restricciones de login: ${requierenLogin}`,
      `• Imágenes descargadas: ${conImagenPerfil} de ${conDatos} exitosos`,
      '',
      'Conclusión global:',
      total === 0 ? '- Sin URLs de Facebook para procesar' :
      porcentajeDatos > 80 ? '- Excelente tasa de extracción de datos' :
      porcentajeDatos > 50 ? '- Tasa moderada de extracción de datos' :
      '- Baja tasa de extracción (restricciones de acceso o autenticación)'
    ];
  }

  /**
   * Analiza los resultados de otros sitios de forma global
   * @param {Object[]} resultados - Array de resultados de otros sitios
   * @returns {string[]} Array de líneas de análisis global
   */
  analizarOtrosSitiosGlobal(resultados) {
    const total = resultados.length;
    const exitosos = resultados.filter(r => r.screenshot && r.screenshot.exito).length;
    const con404 = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === '404' || r.screenshot.error?.includes('404'))).length;
    const noDisponibles = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === 'conexion' || r.screenshot.error?.includes('CONNECTION_REFUSED'))).length;
    
    // Analizar tipos de sitios por dominio (distribución global)
    const dominios = {};
    resultados.forEach(r => {
      try {
        const url = r.url.startsWith('http') ? r.url : `https://${r.url}`;
        const dominio = new URL(url).hostname.replace(/^www\./, '');
        const extension = dominio.split('.').pop();
        dominios[extension] = (dominios[extension] || 0) + 1;
      } catch (error) {
        // Ignorar URLs malformadas
      }
    });

    const extensionMasComun = Object.keys(dominios).reduce((a, b) => dominios[a] > dominios[b] ? a : b, '');
    
    const porcentajeExitosos = total > 0 ? ((exitosos / total) * 100).toFixed(1) : '0.0';
    const porcentaje404 = total > 0 ? ((con404 / total) * 100).toFixed(1) : '0.0';
    const porcentajeNoDisponible = total > 0 ? ((noDisponibles / total) * 100).toFixed(1) : '0.0';

    const analisis = [
      `• Total procesado: ${total} sitios web generales`,
      `• Accesibles con contenido: ${exitosos} (${porcentajeExitosos}%)`,
      `• Error 404 (no encontrados): ${con404} (${porcentaje404}%)`,
      `• No disponibles/offline: ${noDisponibles} (${porcentajeNoDisponible}%)`,
      `• Extensión predominante: .${extensionMasComun} (${dominios[extensionMasComun] || 0} sitios)`,
      '',
      'Distribución de dominios:',
      ...Object.entries(dominios)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ext, count]) => `- .${ext}: ${count} sitios (${((count/total)*100).toFixed(1)}%)`),
      ''
    ];

    // Análisis global del tipo de contenido
    if (dominios['bet'] > 0 || dominios['casino'] > 0 || dominios['poker'] > 0) {
      analisis.push('Caracterización del contenido:');
      analisis.push('- Predominan sitios de apuestas y entretenimiento online');
      analisis.push('- Alta volatilidad en disponibilidad (típico del sector)');
      analisis.push('- Posibles restricciones geográficas o de acceso');
    } else if (dominios['com'] > (dominios['bet'] || 0)) {
      analisis.push('Caracterización del contenido:');
      analisis.push('- Sitios comerciales y corporativos mayoritarios');
      analisis.push('- Estabilidad variable según el proveedor');
    }

    return analisis;
  }

  /**
   * Analiza los errores encontrados de forma global
   * @param {Object[]} resultados - Array de resultados
   * @returns {string[]} Array de líneas de análisis global
   */
  analizarErroresGlobal(resultados) {
    const errores404 = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === '404' || r.screenshot.error?.includes('404'))).length;
    const erroresConexion = resultados.filter(r => r.screenshot && (r.screenshot.tipoError === 'conexion' || r.screenshot.error?.includes('CONNECTION_REFUSED'))).length;
    const erroresTimeout = resultados.filter(r => r.screenshot && r.screenshot.tipoError === 'timeout').length;
    const erroresDNS = resultados.filter(r => r.screenshot && r.screenshot.tipoError === 'dns').length;
    const erroresAuth = resultados.filter(r => r.datos && r.datos.error?.includes('login')).length;

    const total = resultados.length;
    const totalErrores = errores404 + erroresConexion + erroresTimeout + erroresDNS;
    const porcentajeErrores = total > 0 ? ((totalErrores / total) * 100).toFixed(1) : '0.0';

    return [
      `• Análisis global de ${total} URLs procesadas`,
      `• Total de errores técnicos: ${totalErrores} (${porcentajeErrores}%)`,
      `• Distribución de errores:`,
      `  - Páginas 404 (no encontradas): ${errores404}`,
      `  - Conexión rechazada (offline): ${erroresConexion}`,
      `  - Timeouts de respuesta: ${erroresTimeout}`,
      `  - Errores de DNS: ${erroresDNS}`,
      `  - Restricciones de autenticación: ${erroresAuth}`,
      '',
      'Diagnóstico global:',
      totalErrores === 0 ? '- Excelente: Sin errores técnicos detectados' :
      porcentajeErrores < 20 ? '- Bueno: Baja tasa de errores técnicos' :
      porcentajeErrores < 50 ? '- Moderado: Tasa media de errores' :
      '- Problemas: Alta tasa de errores requiere atención',
      '',
      'Principal causa identificada:',
      erroresConexion > errores404 ? '- Sitios temporalmente inaccesibles o bloqueados' : 
      errores404 > erroresConexion ? '- URLs obsoletas o recursos eliminados' :
      erroresTimeout > 0 ? '- Problemas de conectividad o sobrecarga de servidores' :
      '- Errores distribuidos sin patrón dominante'
    ];
  }

  /**
   * Genera recomendaciones globales basadas en los resultados
   * @param {Object[]} resultados - Array de resultados
   * @returns {string[]} Array de recomendaciones globales
   */
  generarRecomendacionesGlobales(resultados) {
    const total = resultados.length;
    const exitosos = resultados.filter(r => r.screenshot && r.screenshot.exito).length;
    const porcentajeExito = total > 0 ? (exitosos / total) * 100 : 0;
    const erroresConexion = resultados.filter(r => r.screenshot && r.screenshot.error?.includes('CONNECTION_REFUSED')).length;
    const errores404 = resultados.filter(r => r.screenshot && r.screenshot.error?.includes('404')).length;

    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    const recomendaciones = [];

    // Recomendaciones basadas en tasa de éxito general
    if (porcentajeExito < 30) {
      recomendaciones.push('📋 Gestión de URLs:');
      recomendaciones.push('• Auditar y depurar la lista actual de URLs');
      recomendaciones.push('• Verificar y actualizar URLs obsoletas');
      recomendaciones.push('• Implementar validación previa de URLs');
    } else if (porcentajeExito > 80) {
      recomendaciones.push('✅ Optimización exitosa:');
      recomendaciones.push('• Mantener la estrategia actual de procesamiento');
      recomendaciones.push('• Considerar aumentar la frecuencia de monitoreo');
    }

    // Recomendaciones específicas por problemas técnicos
    if (erroresConexion > total * 0.3) {
      recomendaciones.push('🔧 Conectividad:');
      recomendaciones.push('• Evaluar horarios de menor carga para el procesamiento');
      recomendaciones.push('• Considerar implementar reintentos automáticos');
      recomendaciones.push('• Verificar si hay restricciones de red o firewall');
    }

    if (errores404 > total * 0.3) {
      recomendaciones.push('🔗 Calidad de URLs:');
      recomendaciones.push('• Implementar validación automática de URLs');
      recomendaciones.push('• Crear proceso de limpieza periódica de enlaces');
      recomendaciones.push('• Establecer fuentes más actualizadas de URLs');
    }

    // Recomendaciones específicas por plataforma
    if (instagram.length > 0 || facebook.length > 0) {
      const requierenAuth = [...instagram, ...facebook].filter(r => 
        r.datos && (r.datos.datos?.login_requerido || r.datos.datos?.necesita_login_activo)
      ).length;
      
      if (requierenAuth > 0) {
        recomendaciones.push('🔐 Autenticación en redes sociales:');
        recomendaciones.push('• Implementar sistema de credenciales rotativas');
        recomendaciones.push('• Considerar uso de proxies residenciales');
        recomendaciones.push('• Evaluar APIs oficiales cuando sea posible');
      }
    }

    // Recomendaciones operativas
    recomendaciones.push('⚡ Mejoras operativas sugeridas:');
    recomendaciones.push('• Implementar monitoreo continuo de salud del sistema');
    recomendaciones.push('• Configurar alertas automáticas para fallas críticas');
    recomendaciones.push('• Establecer métricas de rendimiento y disponibilidad');

    if (recomendaciones.length === 0) {
      recomendaciones.push('🎯 Sistema funcionando óptimamente:');
      recomendaciones.push('• Mantener la configuración y procesos actuales');
      recomendaciones.push('• Considerar expansión del alcance de monitoreo');
      recomendaciones.push('• Implementar análisis predictivo para optimizar recursos');
    }

    return recomendaciones;
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

  /**
   * Genera y guarda el PDF
   * @param {Object[]} resultados - Resultados de las capturas
   * @param {string} nombreArchivo - Nombre del archivo PDF de salida
   * @returns {Promise<string>} Ruta del archivo generado
   */
  async generarPDF(resultados, nombreArchivo = null) {
    try {
      // Generar nombre de archivo si no se proporciona
      if (!nombreArchivo) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        nombreArchivo = `reporte-integrado-${timestamp}.pdf`;
      }

      const rutaArchivo = join('output', nombreArchivo);
      
      // Crear directorio de salida si no existe
      await fs.mkdir('output', { recursive: true });

      // Inicializar documento
      this.inicializarDocumento();

      // Agregar contenido
      this.agregarResumenEjecutivo(resultados);
      
      // Agregar análisis detallado
      this.agregarAnalisisDetallado(resultados);
      
      await this.agregarTablaResultados(resultados);
      
      // Agregar capturas de pantalla (incluye todas las capturas, exitosas y con error)
      await this.agregarCapturasPantalla(resultados);
      
      // Agregar datos extraídos
      await this.agregarDatosExtraidos(resultados);

      // Guardar PDF
      const pdfBuffer = this.pdf.output('arraybuffer');
      await fs.writeFile(rutaArchivo, Buffer.from(pdfBuffer));

      console.log(chalk.green(`PDF generado exitosamente: ${rutaArchivo}`));
      return rutaArchivo;

    } catch (error) {
      console.error(chalk.red('Error al generar PDF:'), error.message);
      throw error;
    }
  }
}
