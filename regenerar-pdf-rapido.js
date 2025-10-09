#!/usr/bin/env node

import { PDFGenerator } from './src/services/pdfGenerator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Script optimizado para regenerar PDF desde capturas existentes
 * Maneja grandes volúmenes de URLs (1500+) de forma eficiente
 * NO realiza scraping ni toma capturas nuevas
 */

async function regenerarPDFRapido() {
  console.log(chalk.blue.bold('\n🚀 REGENERADOR RÁPIDO DE PDF DESDE CAPTURAS EXISTENTES\n'));
  console.log(chalk.cyan('📋 Este script NO toma capturas nuevas ni hace scraping'));
  console.log(chalk.cyan('📸 Solo procesa las capturas que ya existen en el directorio screenshots/\n'));

  const spinner = ora('Analizando capturas existentes...').start();

  try {
    // 1. Leer todos los archivos del directorio screenshots
    const directorioScreenshots = 'screenshots';
    let archivos = [];
    
    try {
      archivos = await fs.readdir(directorioScreenshots);
    } catch (error) {
      spinner.fail('❌ No se pudo acceder al directorio screenshots/');
      console.log(chalk.yellow('💡 Verifica que el directorio exista y contenga capturas'));
      return;
    }

    const archivosPNG = archivos.filter(archivo => archivo.endsWith('.png'));
    
    if (archivosPNG.length === 0) {
      spinner.fail('❌ No se encontraron archivos PNG en screenshots/');
      console.log(chalk.yellow('💡 Primero debes tomar capturas antes de generar el PDF'));
      return;
    }

    spinner.text = `Procesando ${archivosPNG.length} capturas encontradas...`;

    // 2. Cargar URLs desde archivos de texto
    const archivosUrls = [
      '289_perfiles_redes_sociales_10_12_2024.txt',
      '1203_SITIOS_WEB_11_2024.txt'
    ];

    const urlsOriginales = [];
    for (const archivoUrl of archivosUrls) {
      try {
        const contenido = await fs.readFile(archivoUrl, 'utf-8');
        const urls = contenido
          .split('\n')
          .map(linea => linea.trim())
          .filter(linea => linea && !linea.startsWith('#'));
        
        urlsOriginales.push(...urls);
        spinner.text = `Cargadas ${urlsOriginales.length} URLs desde archivos...`;
      } catch (error) {
        console.log(chalk.yellow(`⚠️ No se pudo leer ${archivoUrl}: ${error.message}`));
      }
    }

    console.log(chalk.gray(`\n📊 URLs originales cargadas: ${urlsOriginales.length}`));
    console.log(chalk.gray(`📸 Capturas encontradas: ${archivosPNG.length}`));

    // 3. Crear mapa de capturas con múltiples claves para mejor matching
    const mapaCapturas = new Map();
    const mapaCapturasPorArchivo = new Map();
    
    for (const archivo of archivosPNG) {
      try {
        const rutaCompleta = join(directorioScreenshots, archivo);
        const stats = await fs.stat(rutaCompleta);
        
        const infoCaptura = {
          archivo,
          rutaCompleta,
          tamanio: stats.size,
          usado: false
        };
        
        // Normalizar nombre de archivo para matching (quitar timestamp)
        const nombreSinTimestamp = archivo
          .replace('.png', '')
          .replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*$/, '')
          .replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/, '')
          .toLowerCase();
        
        // Guardar con múltiples claves para mejor matching
        mapaCapturas.set(nombreSinTimestamp, infoCaptura);
        mapaCapturasPorArchivo.set(archivo, infoCaptura);
        
        // También guardar variantes del nombre
        const nombreSinGuiones = nombreSinTimestamp.replace(/-/g, '_');
        const nombreSinGuionesBajos = nombreSinTimestamp.replace(/_/g, '-');
        
        if (nombreSinGuiones !== nombreSinTimestamp) {
          mapaCapturas.set(nombreSinGuiones, infoCaptura);
        }
        if (nombreSinGuionesBajos !== nombreSinTimestamp) {
          mapaCapturas.set(nombreSinGuionesBajos, infoCaptura);
        }
        
      } catch (error) {
        console.log(chalk.gray(`⚠️ Error procesando ${archivo}: ${error.message}`));
      }
    }

    spinner.succeed(chalk.green(`✅ ${archivosPNG.length} capturas procesadas`));

    // 4. Crear estructura de resultados con matching inteligente
    spinner.start('Construyendo estructura de resultados con validación...');
    
    const resultados = [];
    let coincidencias = 0;
    let sinCaptura = 0;
    let matchingPerfecto = 0;
    let matchingParcial = 0;

    for (const url of urlsOriginales) {
      if (!url) continue;

      // Determinar tipo de URL
      let tipo = 'otro';
      if (url.includes('instagram.com')) tipo = 'instagram';
      else if (url.includes('facebook.com') || url.includes('fb.com')) tipo = 'facebook';

      // Intentar múltiples estrategias de matching
      let captura = null;
      let tipoMatching = 'ninguno';
      
      // Estrategia 1: Normalización principal
      const urlNormalizada = normalizarUrlParaCaptura(url);
      captura = mapaCapturas.get(urlNormalizada);
      if (captura && !captura.usado) {
        tipoMatching = 'perfecto';
        matchingPerfecto++;
      }
      
      // Estrategia 2: Variantes del nombre
      if (!captura) {
        const variantes = generarVariantesUrl(url);
        for (const variante of variantes) {
          const capturaVariante = mapaCapturas.get(variante);
          if (capturaVariante && !capturaVariante.usado) {
            captura = capturaVariante;
            tipoMatching = 'variante';
            matchingParcial++;
            break;
          }
        }
      }
      
      // Estrategia 3: Búsqueda flexible para sitios web normales
      if (!captura && tipo === 'otro') {
        const dominioLimpio = extraerDominioPrincipal(url);
        for (const [clave, capturaInfo] of mapaCapturas.entries()) {
          if (!capturaInfo.usado && clave.includes(dominioLimpio)) {
            captura = capturaInfo;
            tipoMatching = 'flexible';
            matchingParcial++;
            break;
          }
        }
      }
      
      // Marcar captura como usada para evitar duplicados
      if (captura) {
        captura.usado = true;
      }

      // Evaluar si la captura tiene contenido real
      let tieneContenidoReal = false;
      if (captura && captura.tamanio > 10000) { // Más de 10KB generalmente tiene contenido
        tieneContenidoReal = true;
      }

      const resultado = {
        url: url,
        tipo: tipo,
        exito: !!captura,
        timestamp: new Date().toISOString(),
        tieneContenido: tieneContenidoReal,
        matchingInfo: tipoMatching,
        screenshot: captura ? {
          exito: true,
          nombreArchivo: captura.archivo,
          rutaCompleta: captura.rutaCompleta,
          tamanio: captura.tamanio
        } : {
          exito: false,
          error: 'No se encontró captura para esta URL'
        },
        datos: {
          exito: tieneContenidoReal,
          mensaje: tieneContenidoReal ? 
            'Captura con contenido validado' : 
            'Regeneración desde capturas existentes'
        }
      };

      resultados.push(resultado);
      
      if (captura) {
        coincidencias++;
      } else {
        sinCaptura++;
      }

      // Mostrar progreso cada 100 URLs
      if (resultados.length % 100 === 0) {
        spinner.text = `Procesadas ${resultados.length}/${urlsOriginales.length} URLs (${coincidencias} con captura)...`;
      }
    }

    spinner.succeed(chalk.green(`✅ ${resultados.length} resultados construidos con validación`));
    
    console.log(chalk.cyan('\n📊 ESTADÍSTICAS DE MATCHING Y VALIDACIÓN:'));
    console.log(chalk.green(`  ✅ Con captura: ${coincidencias} URLs (${((coincidencias/resultados.length)*100).toFixed(1)}%)`));
    console.log(chalk.blue(`    - Matching perfecto: ${matchingPerfecto}`));
    console.log(chalk.cyan(`    - Matching por variante: ${matchingParcial}`));
    console.log(chalk.yellow(`  ⚠️ Sin captura: ${sinCaptura} URLs (${((sinCaptura/resultados.length)*100).toFixed(1)}%)`));
    
    const conContenido = resultados.filter(r => r.tieneContenido).length;
    console.log(chalk.green(`  📄 Con contenido validado: ${conContenido} capturas\n`));

    // 5. Generar PDF
    spinner.start('Generando PDF optimizado...');
    
    const pdfGenerator = new PDFGenerator();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nombreArchivo = `reporte-rapido-${timestamp}.pdf`;
    
    const rutaPDF = await pdfGenerator.generarPDF(resultados, nombreArchivo);
    
    spinner.succeed(chalk.green('✅ PDF generado exitosamente'));

    // 6. Mostrar resumen final
    console.log(chalk.green.bold('\n🎉 PROCESO COMPLETADO\n'));
    console.log(chalk.cyan('📄 ARCHIVO GENERADO:'));
    console.log(chalk.white(`   ${rutaPDF}\n`));
    
    console.log(chalk.cyan('📊 RESUMEN DETALLADO:'));
    console.log(chalk.gray(`   Total de URLs procesadas: ${resultados.length}`));
    console.log(chalk.green(`   Con captura disponible: ${coincidencias} (${((coincidencias/resultados.length)*100).toFixed(1)}%)`));
    console.log(chalk.yellow(`   Sin captura: ${sinCaptura} (${((sinCaptura/resultados.length)*100).toFixed(1)}%)`));
    
    // Estadísticas por tipo
    const instagram = resultados.filter(r => r.tipo === 'instagram');
    const facebook = resultados.filter(r => r.tipo === 'facebook');
    const otros = resultados.filter(r => r.tipo === 'otro');
    
    console.log(chalk.cyan('\n📱 POR PLATAFORMA:'));
    console.log(chalk.gray(`   Instagram: ${instagram.filter(r => r.screenshot.exito).length}/${instagram.length} con captura`));
    console.log(chalk.gray(`   Facebook: ${facebook.filter(r => r.screenshot.exito).length}/${facebook.length} con captura`));
    console.log(chalk.gray(`   Otros sitios: ${otros.filter(r => r.screenshot.exito).length}/${otros.length} con captura`));

    console.log(chalk.green.bold('\n✨ ¡Listo! Revisa el PDF generado\n'));

  } catch (error) {
    spinner.fail('❌ Error al regenerar PDF');
    console.error(chalk.red('\n💥 Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Normaliza una URL para buscar su captura correspondiente
 * @param {string} url - URL original
 * @returns {string} Clave normalizada para buscar la captura
 */
function normalizarUrlParaCaptura(url) {
  try {
    // Limpiar URL
    let urlLimpia = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .replace(/\/+$/, '')
      .toLowerCase()
      .trim();

    // Para Instagram
    if (urlLimpia.includes('instagram.com')) {
      // Extraer username o post ID
      const matchPost = urlLimpia.match(/instagram\.com\/p\/([a-zA-Z0-9_\-]+)/);
      if (matchPost && matchPost[1]) {
        return `instagram_${matchPost[1]}`.toLowerCase();
      }
      
      const matchUser = urlLimpia.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
      if (matchUser && matchUser[1]) {
        // Limpiar parámetros y caracteres especiales
        const username = matchUser[1].split('?')[0].split('/')[0];
        return `instagram_${username}`.toLowerCase();
      }
      return 'instagram_unknown';
    }

    // Para Facebook
    if (urlLimpia.includes('facebook.com') || urlLimpia.includes('fb.com')) {
      // Extraer página o perfil
      const matchPage = urlLimpia.match(/(?:facebook\.com|fb\.com)\/([a-zA-Z0-9_\.\-]+)/);
      if (matchPage && matchPage[1]) {
        const pageName = matchPage[1].split('?')[0].split('/')[0];
        return `facebook_${pageName}`.toLowerCase();
      }
      
      // Para URLs con profile.php?id=
      const matchId = urlLimpia.match(/profile\.php\?id=(\d+)/);
      if (matchId && matchId[1]) {
        return `facebook_${matchId[1]}`.toLowerCase();
      }
      
      return 'facebook_unknown';
    }

    // Para otros sitios - usar dominio principal
    const dominioMatch = urlLimpia.match(/^([a-zA-Z0-9\-]+\.[a-zA-Z0-9\-\.]+)/);
    if (dominioMatch && dominioMatch[1]) {
      return dominioMatch[1].replace(/\./g, '_').replace(/-/g, '_').toLowerCase();
    }

    // Fallback: usar URL completa normalizada
    return urlLimpia.replace(/[\/\.:\?&#=]/g, '_').substring(0, 100);
  } catch (error) {
    return url.substring(0, 50).replace(/[\/\.:\?&#=]/g, '_').toLowerCase();
  }
}

/**
 * Genera variantes de una URL para mejorar el matching
 * @param {string} url - URL original
 * @returns {string[]} Array de variantes
 */
function generarVariantesUrl(url) {
  const variantes = [];
  const urlNormalizada = normalizarUrlParaCaptura(url);
  
  variantes.push(urlNormalizada);
  variantes.push(urlNormalizada.replace(/_/g, '-'));
  variantes.push(urlNormalizada.replace(/-/g, '_'));
  variantes.push(urlNormalizada.replace(/\./g, '_'));
  variantes.push(urlNormalizada.replace(/\./g, '-'));
  
  // Para Instagram, probar sin el prefijo
  if (url.includes('instagram.com')) {
    const matchUser = url.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
    if (matchUser && matchUser[1]) {
      const username = matchUser[1].split('?')[0].split('/')[0];
      variantes.push(username.toLowerCase());
      variantes.push(`instagram_${username}`.toLowerCase());
    }
  }
  
  // Para Facebook, probar sin el prefijo
  if (url.includes('facebook.com')) {
    const matchPage = url.match(/facebook\.com\/([a-zA-Z0-9_\.\-]+)/);
    if (matchPage && matchPage[1]) {
      const pageName = matchPage[1].split('?')[0].split('/')[0];
      variantes.push(pageName.toLowerCase());
      variantes.push(`facebook_${pageName}`.toLowerCase());
    }
  }
  
  // Para sitios normales
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const dominio = urlObj.hostname.replace(/^www\./, '').replace(/^m\./, '');
    variantes.push(dominio.replace(/\./g, '_'));
    variantes.push(dominio.replace(/\./g, '-'));
    variantes.push(dominio.split('.')[0]); // Solo el nombre sin extensión
  } catch (e) {
    // Ignorar errores de URL inválida
  }
  
  // Eliminar duplicados
  return [...new Set(variantes)];
}

/**
 * Extrae el dominio principal de una URL
 * @param {string} url - URL original
 * @returns {string} Dominio principal
 */
function extraerDominioPrincipal(url) {
  try {
    let urlLimpia = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .split('/')[0]
      .split('?')[0]
      .toLowerCase();
    
    // Obtener el nombre principal (sin extensión)
    const partes = urlLimpia.split('.');
    if (partes.length > 1) {
      return partes[0];
    }
    return urlLimpia;
  } catch (error) {
    return url.substring(0, 20).toLowerCase();
  }
}

// Ejecutar script
regenerarPDFRapido();

