#!/usr/bin/env python3
import os
import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path
import re
from urllib.parse import urlparse

def extraer_username_instagram(url):
    """Extrae el username de una URL de Instagram"""
    try:
        # Patrones comunes de URLs de Instagram
        patrones = [
            r'instagram\.com/([^/?]+)',
            r'instagram\.com/p/([^/?]+)',
            r'instagram\.com/reel/([^/?]+)',
            r'instagram\.com/tv/([^/?]+)'
        ]
        
        for patron in patrones:
            match = re.search(patron, url)
            if match:
                username = match.group(1)
                # Limpiar el username (quitar caracteres extra)
                username = re.sub(r'[^a-zA-Z0-9._]', '', username)
                return username
        return None
    except:
        return None

def extraer_page_name_facebook(url):
    """Extrae el page name de una URL de Facebook"""
    try:
        # Patrones comunes de URLs de Facebook
        patrones = [
            r'facebook\.com/([^/?]+)',
            r'facebook\.com/people/[^/]+/(\d+)',
            r'facebook\.com/pages/[^/]+/(\d+)'
        ]
        
        for patron in patrones:
            match = re.search(patron, url)
            if match:
                page_name = match.group(1)
                return page_name
        return None
    except:
        return None

def ejecutar_scraper_instagram(username, directorio_salida):
    """Ejecuta el scraper de Instagram y retorna el resultado"""
    try:
        parametros = {
            'username': username,
            'directorio': directorio_salida,
            'maxPosts': 5,
            'incluirComentarios': False
        }
        
        cmd = [
            'python3', 
            'src/scripts/python/instagram_profile_scraper_simple.py',
            json.dumps(parametros)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                'exito': False,
                'error': result.stderr,
                'mensaje': 'Error ejecutando scraper de Instagram'
            }
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error ejecutando scraper de Instagram: {str(e)}'
        }

def ejecutar_scraper_facebook(page_name, directorio_salida):
    """Ejecuta el scraper de Facebook y retorna el resultado"""
    try:
        parametros = {
            'pageName': page_name,
            'directorio': directorio_salida,
            'maxPosts': 5,
            'incluirComentarios': False,
            'incluirReacciones': True
        }
        
        cmd = [
            'python3', 
            'src/scripts/python/facebook_page_scraper_simple.py',
            json.dumps(parametros)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                'exito': False,
                'error': result.stderr,
                'mensaje': 'Error ejecutando scraper de Facebook'
            }
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error ejecutando scraper de Facebook: {str(e)}'
        }

def analizar_capturas_con_scraping():
    """Analiza las capturas existentes usando scraping para verificar contenido real"""
    
    print("🔍 Analizando capturas existentes con scraping de Python...")
    
    # Directorio de capturas
    directorio_capturas = Path("screenshots")
    if not directorio_capturas.exists():
        print("❌ Directorio screenshots no encontrado")
        return
    
    # Directorio de salida para datos de scraping
    directorio_scraping = Path("scraped_data")
    directorio_scraping.mkdir(exist_ok=True)
    
    # Encontrar todas las capturas PNG
    archivos_png = list(directorio_capturas.glob("*.png"))
    print(f"📁 Encontrados {len(archivos_png)} archivos PNG")
    
    resultados = []
    instagram_count = 0
    facebook_count = 0
    otros_count = 0
    
    instagram_con_contenido = 0
    instagram_sin_contenido = 0
    facebook_con_contenido = 0
    facebook_sin_contenido = 0
    
    for i, archivo_png in enumerate(archivos_png):
        print(f"🔄 Procesando {i+1}/{len(archivos_png)}: {archivo_png.name}")
        
        # Extraer URL del nombre del archivo
        nombre_archivo = archivo_png.stem
        url = nombre_archivo.replace('_', '/').replace('https', 'https://').replace('http', 'http://')
        
        # Determinar el tipo de URL
        if 'instagram.com' in url:
            instagram_count += 1
            username = extraer_username_instagram(url)
            
            if username:
                print(f"  📱 Analizando Instagram: @{username}")
                resultado_scraping = ejecutar_scraper_instagram(username, str(directorio_scraping))
                
                # Analizar resultado del scraping
                tiene_contenido = False
                if resultado_scraping.get('exito'):
                    datos = resultado_scraping.get('datos', {})
                    # Verificar si tiene datos reales
                    tiene_contenido = (
                        datos.get('usuario_existe', False) and
                        not datos.get('login_requerido', True) and
                        not datos.get('acceso_limitado', True) and
                        (datos.get('seguidores', 'N/A') != 'N/A' or 
                         datos.get('biografia', '') != '' or
                         datos.get('imagen_perfil_descargada', False))
                    )
                
                if tiene_contenido:
                    instagram_con_contenido += 1
                    estado = "✅ Con contenido real"
                else:
                    instagram_sin_contenido += 1
                    estado = "❌ Sin contenido/Error"
                
                print(f"    {estado}")
            else:
                instagram_sin_contenido += 1
                print(f"    ❌ No se pudo extraer username")
                resultado_scraping = {'exito': False, 'error': 'Username no extraído'}
            
            resultados.append({
                'archivo': archivo_png.name,
                'url': url,
                'tipo': 'Instagram',
                'username': username,
                'tiene_contenido': tiene_contenido,
                'scraping_resultado': resultado_scraping,
                'tamanio_bytes': archivo_png.stat().st_size
            })
            
        elif 'facebook.com' in url:
            facebook_count += 1
            page_name = extraer_page_name_facebook(url)
            
            if page_name:
                print(f"  📘 Analizando Facebook: {page_name}")
                resultado_scraping = ejecutar_scraper_facebook(page_name, str(directorio_scraping))
                
                # Analizar resultado del scraping
                tiene_contenido = False
                if resultado_scraping.get('exito'):
                    datos = resultado_scraping.get('datos', {})
                    # Verificar si tiene datos reales
                    tiene_contenido = (
                        datos.get('pagina_existe', False) and
                        not datos.get('requiere_login', True) and
                        (datos.get('titulo', '') != '' or
                         datos.get('descripcion', '') != '' or
                         datos.get('imagen_perfil_descargada', False))
                    )
                
                if tiene_contenido:
                    facebook_con_contenido += 1
                    estado = "✅ Con contenido real"
                else:
                    facebook_sin_contenido += 1
                    estado = "❌ Sin contenido/Error"
                
                print(f"    {estado}")
            else:
                facebook_sin_contenido += 1
                print(f"    ❌ No se pudo extraer page name")
                resultado_scraping = {'exito': False, 'error': 'Page name no extraído'}
            
            resultados.append({
                'archivo': archivo_png.name,
                'url': url,
                'tipo': 'Facebook',
                'page_name': page_name,
                'tiene_contenido': tiene_contenido,
                'scraping_resultado': resultado_scraping,
                'tamanio_bytes': archivo_png.stat().st_size
            })
            
        else:
            otros_count += 1
            # Para otros sitios, asumir que tienen contenido si la imagen es grande
            tiene_contenido = archivo_png.stat().st_size > 10000  # Más de 10KB
            
            resultados.append({
                'archivo': archivo_png.name,
                'url': url,
                'tipo': 'Otros',
                'tiene_contenido': tiene_contenido,
                'scraping_resultado': {'exito': True, 'metodo': 'análisis_tamaño'},
                'tamanio_bytes': archivo_png.stat().st_size
            })
    
    # Generar estadísticas
    print(f"\n📊 Estadísticas de análisis con scraping:")
    print(f"📱 Instagram ({instagram_count} URLs):")
    print(f"   ✅ Con contenido real: {instagram_con_contenido}")
    print(f"   ❌ Sin contenido/Error: {instagram_sin_contenido}")
    if instagram_count > 0:
        print(f"   📊 Porcentaje de contenido real: {(instagram_con_contenido/instagram_count)*100:.1f}%")
    
    print(f"📘 Facebook ({facebook_count} URLs):")
    print(f"   ✅ Con contenido real: {facebook_con_contenido}")
    print(f"   ❌ Sin contenido/Error: {facebook_sin_contenido}")
    if facebook_count > 0:
        print(f"   📊 Porcentaje de contenido real: {(facebook_con_contenido/facebook_count)*100:.1f}%")
    
    total_con_contenido = instagram_con_contenido + facebook_con_contenido + sum(1 for r in resultados if r['tipo'] == 'Otros' and r['tiene_contenido'])
    total_sin_contenido = instagram_sin_contenido + facebook_sin_contenido + sum(1 for r in resultados if r['tipo'] == 'Otros' and not r['tiene_contenido'])
    
    print(f"\n🎯 RESUMEN TOTAL:")
    print(f"   📊 Total procesado: {len(resultados)} URLs")
    print(f"   ✅ Con contenido real: {total_con_contenido}")
    print(f"   ❌ Sin contenido/Error: {total_sin_contenido}")
    print(f"   📊 Porcentaje de contenido real: {(total_con_contenido/len(resultados))*100:.1f}%")
    
    # Guardar resultados detallados
    archivo_resultados = f"resultados_scraping_analisis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(archivo_resultados, 'w', encoding='utf-8') as f:
        json.dump({
            'fecha_analisis': datetime.now().isoformat(),
            'total_archivos': len(resultados),
            'estadisticas': {
                'instagram': {
                    'total': instagram_count,
                    'con_contenido': instagram_con_contenido,
                    'sin_contenido': instagram_sin_contenido,
                    'porcentaje_contenido': (instagram_con_contenido/instagram_count)*100 if instagram_count > 0 else 0
                },
                'facebook': {
                    'total': facebook_count,
                    'con_contenido': facebook_con_contenido,
                    'sin_contenido': facebook_sin_contenido,
                    'porcentaje_contenido': (facebook_con_contenido/facebook_count)*100 if facebook_count > 0 else 0
                },
                'otros': {
                    'total': otros_count,
                    'con_contenido': sum(1 for r in resultados if r['tipo'] == 'Otros' and r['tiene_contenido']),
                    'sin_contenido': sum(1 for r in resultados if r['tipo'] == 'Otros' and not r['tiene_contenido'])
                }
            },
            'resultados_detallados': resultados
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Resultados guardados en: {archivo_resultados}")
    
    return resultados, archivo_resultados

if __name__ == "__main__":
    try:
        resultados, archivo_resultados = analizar_capturas_con_scraping()
        print(f"\n✅ Análisis completado exitosamente")
        print(f"📄 Archivo de resultados: {archivo_resultados}")
    except Exception as e:
        print(f"❌ Error durante el análisis: {str(e)}")
        sys.exit(1)
