#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import PDFDocument from 'pdfkit';

console.log('🚀 Iniciando proceso de scraping y generación de PDF final...\n');

// Función para ejecutar scripts de Python
function ejecutarScrapingPython(scriptPath, parametros) {
    try {
        const comando = `./venv_scraping/bin/python "${scriptPath}" '${JSON.stringify(parametros)}'`;
        console.log(`🔄 Ejecutando: ${scriptPath}`);
        
        const resultado = execSync(comando, { 
            encoding: 'utf8',
            timeout: 60000, // 60 segundos timeout
            stdio: 'pipe'
        });
        
        // Extraer solo la línea que contiene el JSON válido
        const lineas = resultado.split('\n');
        let jsonLine = '';
        
        for (const linea of lineas) {
            if (linea.trim().startsWith('{') && linea.includes('"exito"')) {
                jsonLine = linea.trim();
                break;
            }
        }
        
        if (!jsonLine) {
            throw new Error('No se encontró JSON válido en la salida');
        }
        
        return JSON.parse(jsonLine);
    } catch (error) {
        console.error(`❌ Error ejecutando ${scriptPath}:`, error.message);
        return {
            exito: false,
            error: error.message,
            datos: null
        };
    }
}

// Función para analizar si una página tiene contenido real basado en el JSON
function analizarContenidoReal(datos, tipo) {
    if (!datos || !datos.exito) {
        return {
            tieneContenido: false,
            razon: 'Error en el scraping o datos no disponibles',
            confianza: 0
        };
    }

    const info = datos.datos || {};
    
    if (tipo === 'facebook') {
        // Análisis específico para Facebook
        const indicadoresPositivos = [];
        const indicadoresNegativos = [];
        
        // Verificar si la página existe
        if (info.pagina_existe === false) {
            indicadoresNegativos.push('Página no existe');
        } else if (info.pagina_existe === true) {
            indicadoresPositivos.push('Página existe');
        }
        
        // Verificar si hay login exitoso
        if (info.login_exitoso === true) {
            indicadoresPositivos.push('Login exitoso');
        }
        
        // Verificar si requiere login (contenido limitado)
        if (info.requiere_login === true) {
            indicadoresNegativos.push('Requiere login - contenido limitado');
        }
        
        // Verificar si hay título real
        if (info.titulo && info.titulo.length > 5 && !info.titulo.includes('Facebook')) {
            indicadoresPositivos.push('Título descriptivo encontrado');
        }
        
        // Verificar si hay descripción
        if (info.descripcion && info.descripcion.length > 10) {
            indicadoresPositivos.push('Descripción encontrada');
        }
        
        // Verificar si se descargó imagen de perfil
        if (info.imagen_perfil_descargada === true) {
            indicadoresPositivos.push('Imagen de perfil descargada');
        }
        
        // Verificar si hay posts
        if (info.posts_recientes && info.posts_recientes.length > 0) {
            indicadoresPositivos.push('Posts recientes encontrados');
        }
        
        // Verificar si hay seguidores/me gusta
        if (info.seguidores && info.seguidores !== 'N/A' && info.seguidores !== '0') {
            indicadoresPositivos.push('Seguidores encontrados');
        }
        
        if (info.me_gusta && info.me_gusta !== 'N/A' && info.me_gusta !== '0') {
            indicadoresPositivos.push('Me gusta encontrados');
        }
        
        // Verificar errores específicos
        if (info.error) {
            indicadoresNegativos.push(`Error: ${info.error}`);
        }
        
        // Calcular confianza
        const totalIndicadores = indicadoresPositivos.length + indicadoresNegativos.length;
        const confianza = totalIndicadores > 0 ? (indicadoresPositivos.length / totalIndicadores) * 100 : 0;
        
        const tieneContenido = indicadoresPositivos.length > indicadoresNegativos.length && confianza > 30;
        
        return {
            tieneContenido,
            razon: tieneContenido ? 
                `Contenido real encontrado: ${indicadoresPositivos.join(', ')}` :
                `Sin contenido real: ${indicadoresNegativos.join(', ')}`,
            confianza: Math.round(confianza),
            indicadoresPositivos,
            indicadoresNegativos
        };
        
    } else if (tipo === 'instagram') {
        // Análisis específico para Instagram
        const indicadoresPositivos = [];
        const indicadoresNegativos = [];
        
        // Verificar si el usuario existe
        if (info.usuario_existe === false) {
            indicadoresNegativos.push('Usuario no existe');
        } else if (info.usuario_existe === true) {
            indicadoresPositivos.push('Usuario existe');
        }
        
        // Verificar si requiere login
        if (info.login_requerido === true || info.acceso_limitado === true) {
            indicadoresNegativos.push('Requiere login - acceso limitado');
        }
        
        // Verificar si hay login exitoso
        if (info.login_exitoso === true) {
            indicadoresPositivos.push('Login exitoso');
        }
        
        // Verificar si hay biografía
        if (info.biografia && info.biografia.length > 5) {
            indicadoresPositivos.push('Biografía encontrada');
        }
        
        // Verificar si se descargó imagen de perfil
        if (info.imagen_perfil_descargada === true) {
            indicadoresPositivos.push('Imagen de perfil descargada');
        }
        
        // Verificar si hay seguidores (compatibilidad con ambos formatos)
        const seguidores = info.seguidores || info.followers;
        if (seguidores && seguidores !== 'N/A' && seguidores !== '0' && seguidores > 0) {
            indicadoresPositivos.push('Seguidores encontrados');
        }
        
        // Verificar si hay posts (compatibilidad con ambos formatos)
        const posts = info.posts || info.mediacount;
        if (posts && posts !== 'N/A' && posts !== '0' && posts > 0) {
            indicadoresPositivos.push('Posts encontrados');
        }
        
        // Verificar si es verificado (compatibilidad con ambos formatos)
        if (info.es_verificado === true || info.is_verified === true) {
            indicadoresPositivos.push('Cuenta verificada');
        }
        
        // Verificar si es privado
        if (info.es_privado === true || info.is_private === true) {
            indicadoresNegativos.push('Cuenta privada');
        }
        
        // Verificar errores específicos
        if (info.error) {
            indicadoresNegativos.push(`Error: ${info.error}`);
        }
        
        // Calcular confianza
        const totalIndicadores = indicadoresPositivos.length + indicadoresNegativos.length;
        const confianza = totalIndicadores > 0 ? (indicadoresPositivos.length / totalIndicadores) * 100 : 0;
        
        const tieneContenido = indicadoresPositivos.length > indicadoresNegativos.length && confianza > 30;
        
        return {
            tieneContenido,
            razon: tieneContenido ? 
                `Contenido real encontrado: ${indicadoresPositivos.join(', ')}` :
                `Sin contenido real: ${indicadoresNegativos.join(', ')}`,
            confianza: Math.round(confianza),
            indicadoresPositivos,
            indicadoresNegativos
        };
    }
    
    return {
        tieneContenido: false,
        razon: 'Tipo de página no reconocido',
        confianza: 0
    };
}

// Función para procesar URLs y hacer scraping
async function procesarUrlsConScraping() {
    console.log('📋 Leyendo archivo de URLs...');
    
    // Leer archivo de URLs (usar archivo de prueba si está disponible)
    const archivoUrls = process.argv[2] || 'test-scraping-urls.txt';
    if (!fs.existsSync(archivoUrls)) {
        console.error('❌ No se encontró el archivo de URLs:', archivoUrls);
        return;
    }
    
    console.log(`📁 Archivo a procesar: ${archivoUrls}`);
    
    const contenido = fs.readFileSync(archivoUrls, 'utf8');
    const urls = contenido.split('\n')
        .map(url => url.trim())
        .filter(url => url && !url.startsWith('#'));
    
    console.log(`📊 Total de URLs a procesar: ${urls.length}\n`);
    
    const resultados = [];
    let procesadas = 0;
    
    for (const url of urls) {
        procesadas++;
        console.log(`\n🔄 Procesando ${procesadas}/${urls.length}: ${url}`);
        
        let resultado = {
            url: url,
            tipo: 'desconocido',
            tieneContenido: false,
            razon: 'No procesado',
            confianza: 0,
            datosScraping: null,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Determinar tipo de URL
            if (url.includes('facebook.com')) {
                resultado.tipo = 'facebook';
                
                // Extraer nombre de página de Facebook
                const match = url.match(/facebook\.com\/([^\/\?]+)/);
                if (match) {
                    const pageName = match[1];
                    console.log(`  📘 Scraping Facebook: ${pageName}`);
                    
                    const parametros = {
                        pageName: pageName,
                        directorio: 'scraped_data',
                        maxPosts: 5,
                        incluirComentarios: false,
                        incluirReacciones: true
                    };
                    
                    const datosScraping = ejecutarScrapingPython(
                        'src/scripts/python/facebook_page_scraper_simple.py',
                        parametros
                    );
                    
                    resultado.datosScraping = datosScraping;
                    const analisis = analizarContenidoReal(datosScraping, 'facebook');
                    resultado.tieneContenido = analisis.tieneContenido;
                    resultado.razon = analisis.razon;
                    resultado.confianza = analisis.confianza;
                    
                    console.log(`  ✅ Facebook: ${analisis.tieneContenido ? 'CON CONTENIDO' : 'SIN CONTENIDO'} (${analisis.confianza}% confianza)`);
                }
                
            } else if (url.includes('instagram.com')) {
                resultado.tipo = 'instagram';
                
                // Extraer username de Instagram
                const match = url.match(/instagram\.com\/([^\/\?]+)/);
                if (match) {
                    const username = match[1];
                    
                    // Verificar si es un post (/p/) o reel (/reel/) en lugar de perfil
                    if (username === 'p' || username === 'reel' || username === 'tv') {
                        console.log(`  📷 Instagram: URL es un post/reel, no un perfil`);
                        resultado.tieneContenido = false;
                        resultado.razon = 'URL es un post/reel de Instagram, no un perfil de usuario';
                        resultado.confianza = 0;
                        console.log(`  ⚪ Instagram: SIN CONTENIDO (URL no es perfil)`);
                    } else {
                        console.log(`  📷 Scraping Instagram: ${username}`);
                    
                    const parametros = {
                        username: username,
                        directorio: 'scraped_data',
                        maxPosts: 5,
                        incluirComentarios: false
                    };
                    
                    const datosScraping = ejecutarScrapingPython(
                        'src/scripts/python/instagram_profile_scraper.py',
                        parametros
                    );
                    
                    resultado.datosScraping = datosScraping;
                    const analisis = analizarContenidoReal(datosScraping, 'instagram');
                    resultado.tieneContenido = analisis.tieneContenido;
                        resultado.razon = analisis.razon;
                        resultado.confianza = analisis.confianza;
                        
                        console.log(`  ✅ Instagram: ${analisis.tieneContenido ? 'CON CONTENIDO' : 'SIN CONTENIDO'} (${analisis.confianza}% confianza)`);
                    }
                }
                
            } else {
                resultado.tipo = 'otro';
                resultado.razon = 'URL no es de Facebook o Instagram';
                console.log(`  ⚪ URL no procesada (no es Facebook/Instagram)`);
            }
            
        } catch (error) {
            console.error(`  ❌ Error procesando ${url}:`, error.message);
            resultado.razon = `Error: ${error.message}`;
        }
        
        resultados.push(resultado);
        
        // Pausa entre requests para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return resultados;
}

// Función para generar PDF con resultados del scraping
function generarPDFConScraping(resultados) {
    console.log('\n📄 Generando PDF con resultados del scraping...');
    
    const doc = new PDFDocument({ margin: 50 });
    const archivoPDF = `reporte-scraping-final-${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.pipe(fs.createWriteStream(archivoPDF));
    
    // Título principal
    doc.fontSize(20).font('Helvetica-Bold')
        .text('REPORTE FINAL DE SCRAPING', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica')
        .text(`Análisis detallado de contenido real en Facebook e Instagram`, { align: 'center' });
    
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Estadísticas generales
    const totalUrls = resultados.length;
    const facebookUrls = resultados.filter(r => r.tipo === 'facebook').length;
    const instagramUrls = resultados.filter(r => r.tipo === 'instagram').length;
    const conContenido = resultados.filter(r => r.tieneContenido).length;
    const sinContenido = totalUrls - conContenido;
    
    doc.fontSize(16).font('Helvetica-Bold').text('RESUMEN EJECUTIVO');
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica')
        .text(`• Total de URLs analizadas: ${totalUrls}`)
        .text(`• URLs de Facebook: ${facebookUrls}`)
        .text(`• URLs de Instagram: ${instagramUrls}`)
        .text(`• URLs con contenido real: ${conContenido} (${Math.round((conContenido/totalUrls)*100)}%)`)
        .text(`• URLs sin contenido: ${sinContenido} (${Math.round((sinContenido/totalUrls)*100)}%)`);
    
    doc.moveDown(2);
    
    // Tabla de resultados
    doc.fontSize(16).font('Helvetica-Bold').text('RESULTADOS DETALLADOS');
    doc.moveDown();
    
    // Encabezados de tabla
    const startY = doc.y;
    let currentY = startY;
    
    doc.fontSize(10).font('Helvetica-Bold')
        .text('URL', 50, currentY)
        .text('Tipo', 300, currentY)
        .text('Contenido', 350, currentY)
        .text('Confianza', 420, currentY)
        .text('Razón', 480, currentY);
    
    currentY += 20;
    
    // Línea separadora
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    
    // Filas de datos
    resultados.forEach((resultado, index) => {
        if (currentY > 750) { // Nueva página si es necesario
            doc.addPage();
            currentY = 50;
        }
        
        const tipo = resultado.tipo.toUpperCase();
        const contenido = resultado.tieneContenido ? 'SÍ' : 'NO';
        const confianza = `${resultado.confianza}%`;
        
        // Truncar URL si es muy larga
        const urlCorta = resultado.url.length > 40 ? 
            resultado.url.substring(0, 37) + '...' : 
            resultado.url;
        
        doc.fontSize(9).font('Helvetica')
            .text(urlCorta, 50, currentY)
            .text(tipo, 300, currentY)
            .text(contenido, 350, currentY)
            .text(confianza, 420, currentY);
        
        // Razón en múltiples líneas si es necesario
        const razon = resultado.razon.length > 30 ? 
            resultado.razon.substring(0, 27) + '...' : 
            resultado.razon;
        doc.text(razon, 480, currentY);
        
        currentY += 15;
    });
    
    // Estadísticas por tipo
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('ESTADÍSTICAS POR PLATAFORMA');
    doc.moveDown();
    
    // Facebook
    const facebookConContenido = resultados.filter(r => r.tipo === 'facebook' && r.tieneContenido).length;
    const facebookSinContenido = facebookUrls - facebookConContenido;
    
    doc.fontSize(14).font('Helvetica-Bold').text('FACEBOOK');
    doc.fontSize(12).font('Helvetica')
        .text(`• Total URLs: ${facebookUrls}`)
        .text(`• Con contenido: ${facebookConContenido} (${facebookUrls > 0 ? Math.round((facebookConContenido/facebookUrls)*100) : 0}%)`)
        .text(`• Sin contenido: ${facebookSinContenido} (${facebookUrls > 0 ? Math.round((facebookSinContenido/facebookUrls)*100) : 0}%)`);
    
    doc.moveDown();
    
    // Instagram
    const instagramConContenido = resultados.filter(r => r.tipo === 'instagram' && r.tieneContenido).length;
    const instagramSinContenido = instagramUrls - instagramConContenido;
    
    doc.fontSize(14).font('Helvetica-Bold').text('INSTAGRAM');
    doc.fontSize(12).font('Helvetica')
        .text(`• Total URLs: ${instagramUrls}`)
        .text(`• Con contenido: ${instagramConContenido} (${instagramUrls > 0 ? Math.round((instagramConContenido/instagramUrls)*100) : 0}%)`)
        .text(`• Sin contenido: ${instagramSinContenido} (${instagramUrls > 0 ? Math.round((instagramSinContenido/instagramUrls)*100) : 0}%)`);
    
    doc.end();
    
    console.log(`✅ PDF generado: ${archivoPDF}`);
    return archivoPDF;
}

// Función principal
async function main() {
    try {
        // Crear directorio para datos de scraping
        if (!fs.existsSync('scraped_data')) {
            fs.mkdirSync('scraped_data');
        }
        
        // Procesar URLs con scraping
        const resultados = await procesarUrlsConScraping();
        
        // Guardar resultados en JSON
        const archivoJSON = `resultados-scraping-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(archivoJSON, JSON.stringify(resultados, null, 2));
        console.log(`\n💾 Resultados guardados en: ${archivoJSON}`);
        
        // Generar PDF
        const archivoPDF = generarPDFConScraping(resultados);
        
        console.log('\n🎉 Proceso completado exitosamente!');
        console.log(`📄 PDF generado: ${archivoPDF}`);
        console.log(`📊 Total procesado: ${resultados.length} URLs`);
        
        const conContenido = resultados.filter(r => r.tieneContenido).length;
        console.log(`✅ Con contenido real: ${conContenido}`);
        console.log(`❌ Sin contenido: ${resultados.length - conContenido}`);
        
    } catch (error) {
        console.error('❌ Error en el proceso principal:', error);
    }
}

// Ejecutar
main();
