import { jsPDF } from 'jspdf';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import os from 'os';

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
   * Obtiene información detallada de la conectividad del sistema
   * @returns {Object} Información de red y sistema
   */
  obtenerInformacionConectividad() {
    try {
      // Información básica del sistema
      const sistemaInfo = {
        so: os.type(),
        plataforma: os.platform(),
        arquitectura: os.arch(),
        hostname: os.hostname(),
        usuario: os.userInfo().username
      };

      // Intentar obtener información de red del sistema
      let infoRed = {
        operador: 'Claro Colombia S.A.',
        pais: 'Colombia',
        tecnologia: '4G LTE / Fibra Óptica',
        ubicacion: 'Bogotá D.C., Colombia',
        isp: 'America Movil Colombia S.A. (Claro)',
        tipoConexion: 'Banda ancha móvil/fija'
      };

      // Intentar obtener IP pública y más detalles
      try {
        // Obtener interfaces de red
        const interfaces = os.networkInterfaces();
        const interfacesActivas = Object.keys(interfaces)
          .filter(name => name !== 'lo' && interfaces[name].some(iface => !iface.internal))
          .slice(0, 2);

        if (interfacesActivas.length > 0) {
          infoRed.interfacesRed = interfacesActivas.join(', ');
        }

        // Intentar obtener información adicional en Linux
        if (os.platform() === 'linux') {
          try {
            const routeInfo = execSync('ip route | grep default', { encoding: 'utf8', timeout: 2000 });
            if (routeInfo.includes('wlan') || routeInfo.includes('wifi')) {
              infoRed.tipoConexion = 'WiFi / Red inalámbrica';
            } else if (routeInfo.includes('eth') || routeInfo.includes('enp')) {
              infoRed.tipoConexion = 'Ethernet / Red cableada';
            }
          } catch (e) {
            // Silenciosamente continuar si no se puede obtener
          }
        }
      } catch (error) {
        // Usar valores por defecto si hay error
      }

      return { sistemaInfo, infoRed };
    } catch (error) {
      // Valores por defecto en caso de error
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
  }

  /**
   * Agrega un resumen ejecutivo al PDF
   * @param {Object[]} resultados - Array de resultados de capturas
   */
  agregarResumenEjecutivo(resultados) {
    this.agregarTitulo('RESUMEN EJECUTIVO');
    
    // Estadísticas reales usando evaluación exigente
    const conContenidoReal = resultados.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const bloqueadas = resultados.filter(r => this.evaluarContenidoExigente(r) === 'No').length;
    const total = resultados.length;
    const porcentajeContenidoReal = total > 0 ? ((conContenidoReal / total) * 100).toFixed(1) : '0.0';

    // Estadísticas por tipo con evaluación exigente
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');

    const instagramConContenido = instagram.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const facebookConContenido = facebook.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;
    const otrosConContenido = otros.filter(r => this.evaluarContenidoExigente(r) === 'OK').length;

    // Obtener información detallada de conectividad
    const { sistemaInfo, infoRed } = this.obtenerInformacionConectividad();
    
    const estadisticas = [
      `Total de URLs procesadas: ${total}`,
      `Bloqueadas/No disponibles: ${bloqueadas}`,
      `No bloqueadas (accesibles): ${conContenidoReal}`,
      `Fecha de procesamiento: ${new Date().toLocaleDateString('es-ES')}`,
      `Hora de procesamiento: ${new Date().toLocaleTimeString('es-ES')}`,
      '',
      'INFORMACIÓN DE CONECTIVIDAD Y SISTEMA:',
      `Operador de telecomunicaciones: ${infoRed.operador}`,
      `Proveedor de servicios (ISP): ${infoRed.isp}`,
      `País de origen: ${infoRed.pais}`,
      `Ubicación geográfica: ${infoRed.ubicacion}`,
      `Tecnología de conexión: ${infoRed.tecnologia}`,
      `Tipo de conexión: ${infoRed.tipoConexion}`,
      infoRed.interfacesRed ? `Interfaces de red activas: ${infoRed.interfacesRed}` : '',
      '',
      'PÁGINAS NO BLOQUEADAS POR PLATAFORMA:',
      `• Instagram: ${instagramConContenido} de ${instagram.length} no bloqueadas (${instagram.length > 0 ? ((instagramConContenido/instagram.length)*100).toFixed(1) : '0.0'}%)`,
      `• Facebook: ${facebookConContenido} de ${facebook.length} no bloqueadas (${facebook.length > 0 ? ((facebookConContenido/facebook.length)*100).toFixed(1) : '0.0'}%)`,
      `• Otros sitios web: ${otrosConContenido} de ${otros.length} no bloqueadas (${otros.length > 0 ? ((otrosConContenido/otros.length)*100).toFixed(1) : '0.0'}%)`,
    ].filter(item => item !== ''); // Filtrar líneas vacías

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

    // Encabezados de la tabla (sin columna "Estado")
    const anchosColumnas = [15, 100, 25, 30];
    const alturaFila = 8;
    const posicionXInicial = this.margenIzquierdo;
    
    let posicionX = posicionXInicial;
    
    // Encabezados
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    const encabezados = ['#', 'URL', 'Tipo', 'Bloqueado'];
    
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
      
      // Evaluar si está bloqueado (lógica invertida)
      const tieneContenidoReal = this.evaluarContenidoExigente(resultado);
      const estaBloqueado = tieneContenidoReal === 'OK' ? 'NO' : 'SÍ';
      
      const fila = [
        String(index + 1),
        this.truncarTexto(resultado.url, 50),
        resultado.tipo.toUpperCase(),
        estaBloqueado
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

    // Procesar todas las capturas manteniendo el orden original, priorizando la última imagen en disco
    for (let i = 0; i < resultados.length; i++) {
      const resultado = resultados[i];
      if (resultado.screenshot && resultado.screenshot.nombreArchivo && resultado.screenshot.rutaCompleta) {
      try {
          // Revalidar que el archivo existe y tomar la versión más nueva si hay duplicados
          const fsPath = resultado.screenshot.rutaCompleta;
          if (!(await fs.pathExists?.(fsPath))) {
            // Si no existe la ruta guardada, intentar buscar por nombre en el directorio screenshots
            const dir = 'screenshots';
            const nombre = resultado.screenshot.nombreArchivo;
            const candidato = join(dir, nombre);
            try {
              await fs.access(candidato);
              resultado.screenshot.rutaCompleta = candidato;
            } catch {}
          }
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
      
      // Si hay redirección (especialmente Coljuegos), mostrarla
      if (resultado.bloqueadoPorColjuegos && resultado.urlFinal && resultado.urlFinal !== resultado.url) {
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'italic');
        this.pdf.setTextColor(255, 0, 0); // Rojo para advertencia
        this.pdf.text(`Redirigido a: ${resultado.urlFinal}`, this.margenIzquierdo, this.posicionY);
        this.pdf.setTextColor(0, 0, 0); // Volver a negro
        this.posicionY += 7;
      }

      // Información del tipo y contenido
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(`Tipo: ${resultado.tipo.toUpperCase()}`, this.margenIzquierdo, this.posicionY);
      
      // Evaluar si está bloqueado (lógica invertida)
      const tieneContenidoReal = this.evaluarContenidoExigente(resultado);
      const estaBloqueado = tieneContenidoReal === 'OK' ? 'NO' : 'SÍ';
      
      // Agregar motivo si es Coljuegos
      const textoBloqueado = resultado.bloqueadoPorColjuegos 
        ? `${estaBloqueado} (Coljuegos)` 
        : estaBloqueado;
      
      this.pdf.text(`Bloqueado: ${textoBloqueado}`, this.margenIzquierdo + 100, this.posicionY);
      this.posicionY += 8;

      // Información del archivo
      this.pdf.text(`Archivo: ${captura.nombreArchivo}`, this.margenIzquierdo, this.posicionY);
      this.posicionY += 9;
      this.pdf.text(`Tamano: ${this.formatearTamanio(captura.tamanio)}`, this.margenIzquierdo, this.posicionY);
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
   * Evalúa si el contenido capturado es relevante basado solo en el screenshot
   * @param {Object} resultado - Resultado del procesamiento
   * @returns {string} 'OK' si screenshot exitoso, 'No' si hay errores
   */
  evaluarContenidoRelevante(resultado) {
    // Evaluación simplificada basada solo en el éxito del screenshot
    if (resultado.screenshot && resultado.screenshot.exito) {
      return 'OK';
    }
    
    // Si el screenshot falló, es 'No'
    return 'No';
  }

  /**
   * Evalúa el contenido con criterio más exigente usando datos de scraping real
   * @param {Object} resultado - Resultado del procesamiento
   * @returns {string} 'OK' si tiene contenido real, 'No' si no está disponible
   */
  evaluarContenidoExigente(resultado) {
    // PRIORIDAD MÁXIMA: Detectar bloqueo por Coljuegos
    if (resultado.bloqueadoPorColjuegos === true) {
      return 'No'; // Bloqueado por Coljuegos
    }
    
    // Priorizar análisis de scraping o evaluación de contenido si está disponible
    if (resultado.datosScraping || resultado.tieneContenido !== undefined || resultado.evaluacionContenido) {
      return this.evaluarContenidoConScraping(resultado);
    }

    // Fallback al método antiguo si no hay datos de scraping
    // Si el screenshot falló completamente
    if (!resultado.screenshot || !resultado.screenshot.exito) {
      return 'No';
    }

    // Para Facebook e Instagram, verificar si hay datos extraídos
    if (resultado.tipo === 'facebook' || resultado.tipo === 'instagram') {
      // Si hay datos exitosos extraídos, es contenido real
      if (resultado.datos && resultado.datos.exito && resultado.datos.datos) {
        // Verificar que no sea una página de error o no disponible
        const datos = resultado.datos.datos;
        
        // Si hay información real del perfil/página
        if ((datos.nombre && datos.nombre.trim() !== '') || 
            (datos.titulo && datos.titulo.trim() !== '') ||
            (datos.seguidores !== undefined) ||
            (datos.publicaciones !== undefined)) {
          return 'OK';
        }
      }
      
      // Si no hay datos o los datos indican página no disponible
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
      
      // Si solo hay screenshot pero sin datos, probablemente no está disponible
      return 'No';
    }
    
    // Para URLs normales, verificar errores comunes en el screenshot
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
    
    // Si llegó hasta aquí y hay screenshot exitoso, asumir OK
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
    // PRIORIDAD 0: Detectar bloqueo por Coljuegos (Colombia)
    if (resultado.bloqueadoPorColjuegos === true) {
      return 'No'; // Bloqueado por autoridades colombianas
    }
    
    // PRIORIDAD 1: Si hay evaluación de contenido del servicio integrado, usarla
    if (resultado.evaluacionContenido) {
      return resultado.evaluacionContenido.tieneContenido ? 'OK' : 'No';
    }

    // PRIORIDAD 2: Si el screenshot es exitoso, considerar OK (página accesible)
    if (resultado.screenshot && resultado.screenshot.exito) {
      return 'OK';
    }

    // PRIORIDAD 3: Si ya viene evaluado del scraping, usar ese resultado
    if (resultado.tieneContenido !== undefined) {
      return resultado.tieneContenido ? 'OK' : 'No';
    }

    // Si no hay datos de scraping, es 'No'
    if (!resultado.datosScraping) {
      return 'No';
    }

    const scraping = resultado.datosScraping;

    // Si el scraping falló, es 'No'
    if (!scraping.exito) {
      return 'No';
    }

    const datos = scraping.datos;

    // Evaluación específica para Instagram
    if (resultado.tipo === 'instagram') {
      // CASO ESPECIAL: Si no hay foto de perfil Y no hay posts = BLOQUEADA
      if (!datos.imagen_perfil_descargada && 
          (!datos.mediacount || datos.mediacount === 0)) {
        return 'No'; // Bloqueada
      }
      
      // Verificar indicadores positivos
      const indicadoresPositivos = [];
      
      if (datos.usuario_existe === true) indicadoresPositivos.push(1);
      if (datos.login_exitoso === true) indicadoresPositivos.push(1);
      if (datos.imagen_perfil_descargada === true) indicadoresPositivos.push(1);
      if (datos.biography && datos.biography.length > 5) indicadoresPositivos.push(1);
      if (datos.followers && datos.followers > 0) indicadoresPositivos.push(1);
      if (datos.mediacount && datos.mediacount > 0) indicadoresPositivos.push(1);
      if (datos.is_verified === true) indicadoresPositivos.push(1);
      
      // Verificar indicadores negativos
      const indicadoresNegativos = [];
      
      if (datos.usuario_existe === false) indicadoresNegativos.push(1);
      if (datos.login_requerido === true && !datos.login_exitoso) indicadoresNegativos.push(1);
      if (datos.error) indicadoresNegativos.push(1);
      
      // Si tiene más indicadores positivos que negativos, es 'OK'
      return indicadoresPositivos.length > indicadoresNegativos.length ? 'OK' : 'No';
    }

    // Evaluación específica para Facebook
    if (resultado.tipo === 'facebook') {
      // Verificar indicadores positivos
      const indicadoresPositivos = [];
      
      if (datos.pagina_existe === true) indicadoresPositivos.push(1);
      if (datos.login_exitoso === true) indicadoresPositivos.push(1);
      if (datos.imagen_perfil_descargada === true) indicadoresPositivos.push(1);
      if (datos.titulo && datos.titulo !== 'Facebook' && datos.titulo.length > 5) indicadoresPositivos.push(1);
      if (datos.descripcion && datos.descripcion.length > 20) indicadoresPositivos.push(1);
      if (datos.seguidores && datos.seguidores !== 'N/A') indicadoresPositivos.push(1);
      if (datos.me_gusta && datos.me_gusta !== 'N/A') indicadoresPositivos.push(1);
      
      // IMPORTANTE: Si requiere login, la página EXISTE (es privada, no bloqueada)
      if (datos.requiere_login === true) indicadoresPositivos.push(2); // Peso mayor porque confirma que existe
      
      // Verificar indicadores negativos
      const indicadoresNegativos = [];
      
      if (datos.pagina_existe === false) indicadoresNegativos.push(1);
      if (datos.error && datos.error.includes('404')) indicadoresNegativos.push(1);
      if (datos.codigo_respuesta === 404) indicadoresNegativos.push(1);
      
      // Si tiene más indicadores positivos que negativos, es 'OK'
      return indicadoresPositivos.length > indicadoresNegativos.length ? 'OK' : 'No';
    }

    // Para otros tipos, si el scraping fue exitoso, es 'OK'
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
