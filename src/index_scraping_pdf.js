#!/usr/bin/env node

import { PDFGenerator } from './services/pdfGenerator.js';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { execSync } from 'child_process';

console.log(chalk.blue.bold('\n=== SISTEMA INTEGRADO DE SCRAPING Y GENERACIÓN DE PDF ===\n'));

/**
 * Ejecuta scripts de Python para scraping
 */
function ejecutarScrapingPython(scriptPath, parametros) {
    try {
        const comando = `./venv_scraping/bin/python "${scriptPath}" '${JSON.stringify(parametros)}'`;
        
        const resultado = execSync(comando, { 
            encoding: 'utf8',
            timeout: 60000,
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
        console.error(chalk.red(`❌ Error ejecutando ${scriptPath}:`), error.message);
        return {
            exito: false,
            error: error.message,
            datos: null
        };
    }
}

/**
 * Procesa URLs con scraping real
 */
async function procesarUrlsConScraping(archivoUrls) {
    console.log(chalk.cyan('📋 Leyendo archivo de URLs...'));
    
    if (!await fs.access(archivoUrls).then(() => true).catch(() => false)) {
        console.error(chalk.red('❌ No se encontró el archivo de URLs:', archivoUrls));
        return [];
    }
    
    const contenido = await fs.readFile(archivoUrls, 'utf8');
    const urls = contenido.split('\n')
        .map(url => url.trim())
        .filter(url => url && !url.startsWith('#'));
    
    console.log(chalk.green(`📊 Total de URLs a procesar: ${urls.length}\n`));
    
    const resultados = [];
    let procesadas = 0;
    
    for (const url of urls) {
        procesadas++;
        console.log(chalk.cyan(`\n🔄 Procesando ${procesadas}/${urls.length}: ${url}`));
        
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
                
                const match = url.match(/facebook\.com\/([^\/\?]+)/);
                if (match) {
                    const pageName = match[1];
                    console.log(chalk.blue(`  📘 Scraping Facebook: ${pageName}`));
                    
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
                    
                    // Evaluar contenido
                    if (datosScraping.exito && datosScraping.datos) {
                        const datos = datosScraping.datos;
                        let indicadoresPositivos = 0;
                        let indicadoresNegativos = 0;
                        
                        if (datos.pagina_existe === true) indicadoresPositivos++;
                        if (datos.imagen_perfil_descargada === true) indicadoresPositivos++;
                        if (datos.titulo && datos.titulo !== 'Facebook') indicadoresPositivos++;
                        if (datos.descripcion && !datos.descripcion.includes('requiere autenticación')) indicadoresPositivos++;
                        
                        if (datos.pagina_existe === false) indicadoresNegativos++;
                        if (datos.requiere_login === true) indicadoresNegativos++;
                        if (datos.error) indicadoresNegativos++;
                        
                        resultado.tieneContenido = indicadoresPositivos > indicadoresNegativos;
                        resultado.confianza = Math.round((indicadoresPositivos / (indicadoresPositivos + indicadoresNegativos)) * 100);
                    }
                    
                    console.log(resultado.tieneContenido ? 
                        chalk.green(`  ✅ CON CONTENIDO (${resultado.confianza}%)`) : 
                        chalk.red(`  ❌ SIN CONTENIDO (${resultado.confianza}%)`));
                }
                
            } else if (url.includes('instagram.com')) {
                resultado.tipo = 'instagram';
                
                const match = url.match(/instagram\.com\/([^\/\?]+)/);
                if (match) {
                    const username = match[1];
                    
                    // Verificar si es un post en lugar de perfil
                    if (username === 'p' || username === 'reel' || username === 'tv') {
                        console.log(chalk.yellow(`  ⚪ URL es un post/reel, no un perfil`));
                        resultado.tieneContenido = false;
                        resultado.razon = 'URL es un post/reel de Instagram, no un perfil';
                    } else {
                        console.log(chalk.blue(`  📷 Scraping Instagram: ${username}`));
                        
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
                        
                        // Evaluar contenido
                        if (datosScraping.exito && datosScraping.datos) {
                            const datos = datosScraping.datos;
                            let indicadoresPositivos = 0;
                            let indicadoresNegativos = 0;
                            
                            if (datos.usuario_existe === true) indicadoresPositivos++;
                            if (datos.imagen_perfil_descargada === true) indicadoresPositivos++;
                            if (datos.followers && datos.followers > 0) indicadoresPositivos++;
                            if (datos.mediacount && datos.mediacount > 0) indicadoresPositivos++;
                            
                            if (datos.usuario_existe === false) indicadoresNegativos++;
                            if (datos.login_requerido === true) indicadoresNegativos++;
                            if (datos.error) indicadoresNegativos++;
                            
                            resultado.tieneContenido = indicadoresPositivos > indicadoresNegativos;
                            resultado.confianza = indicadoresPositivos + indicadoresNegativos > 0 ? 
                                Math.round((indicadoresPositivos / (indicadoresPositivos + indicadoresNegativos)) * 100) : 0;
                        }
                        
                        console.log(resultado.tieneContenido ? 
                            chalk.green(`  ✅ CON CONTENIDO (${resultado.confianza}%)`) : 
                            chalk.red(`  ❌ SIN CONTENIDO (${resultado.confianza}%)`));
                    }
                }
                
            } else {
                resultado.tipo = 'otro';
                resultado.razon = 'URL no es de Facebook o Instagram';
                console.log(chalk.gray(`  ⚪ URL no procesada`));
            }
            
        } catch (error) {
            console.error(chalk.red(`  ❌ Error: ${error.message}`));
            resultado.razon = `Error: ${error.message}`;
        }
        
        resultados.push(resultado);
        
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return resultados;
}

/**
 * Función principal
 */
async function main() {
    try {
        const archivoUrls = process.argv[2] || '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt';
        
        console.log(chalk.blue(`📁 Archivo: ${archivoUrls}\n`));
        
        // Procesar URLs con scraping
        const resultados = await procesarUrlsConScraping(archivoUrls);
        
        // Guardar resultados JSON
        const timestamp = new Date().toISOString().split('T')[0];
        const archivoJSON = `resultados-scraping-${timestamp}.json`;
        await fs.writeFile(archivoJSON, JSON.stringify(resultados, null, 2));
        console.log(chalk.green(`\n💾 Resultados guardados: ${archivoJSON}`));
        
        // Generar PDF
        console.log(chalk.cyan('\n📄 Generando PDF con análisis de contenido...\n'));
        
        const pdfGenerator = new PDFGenerator();
        const nombrePDF = `reporte-scraping-${timestamp}.pdf`;
        await pdfGenerator.generarPDF(resultados, nombrePDF);
        
        // Resumen final
        const conContenido = resultados.filter(r => r.tieneContenido).length;
        const sinContenido = resultados.length - conContenido;
        
        console.log(chalk.green.bold('\n🎉 PROCESO COMPLETADO EXITOSAMENTE!\n'));
        console.log(chalk.white('📊 Resumen:'));
        console.log(chalk.white(`   Total procesado: ${resultados.length} URLs`));
        console.log(chalk.green(`   ✅ Con contenido: ${conContenido}`));
        console.log(chalk.red(`   ❌ Sin contenido: ${sinContenido}`));
        console.log(chalk.white(`   📄 PDF generado: output/${nombrePDF}\n`));
        
    } catch (error) {
        console.error(chalk.red('❌ Error en el proceso:'), error);
        process.exit(1);
    }
}

main();


