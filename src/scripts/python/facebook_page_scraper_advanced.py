#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

# Intentar importar facebook-page-scraper como método principal
try:
    from facebook_page_scraper import Facebook_scraper
    FACEBOOK_PAGE_SCRAPER_DISPONIBLE = True
    print("✅ facebook-page-scraper disponible")
except ImportError:
    FACEBOOK_PAGE_SCRAPER_DISPONIBLE = False
    print("⚠️ facebook-page-scraper no disponible")

# Intentar importar facebook_scraper como método de respaldo
try:
    from facebook_scraper import get_posts, get_page_info
    FACEBOOK_SCRAPER_DISPONIBLE = True
    print("✅ facebook_scraper disponible como respaldo")
except ImportError:
    FACEBOOK_SCRAPER_DISPONIBLE = False
    print("⚠️ facebook_scraper no disponible como respaldo")

def extraer_pagina_facebook_advanced(parametros):
    """
    Extrae información de una página de Facebook usando facebook-page-scraper (método avanzado)
    """
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        page_name = params.get('pageName', '')
        directorio = params.get('directorio', 'scraped_data')
        max_posts = params.get('maxPosts', 10)
        incluir_comentarios = params.get('incluirComentarios', False)
        incluir_reacciones = params.get('incluirReacciones', True)
        
        if not page_name:
            raise ValueError("Nombre de página es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        # URL de la página
        url_pagina = f"https://www.facebook.com/{page_name}"
        
        # Método 1: Intentar con facebook-page-scraper (más robusto)
        if FACEBOOK_PAGE_SCRAPER_DISPONIBLE:
            try:
                print(f"🔄 Extrayendo {page_name} con facebook-page-scraper...")
                
                # Configurar el scraper
                meta_ai = Facebook_scraper(
                    page_name=page_name,
                    posts_count=max_posts,
                    browser="chrome",
                    proxy=None,
                    headless=True,  # Ejecutar en modo headless para evitar ventanas
                    timeout=30
                )
                
                # Extraer información de la página
                print(f"📄 Obteniendo información de la página...")
                page_data = meta_ai.scrap_to_json()
                
                if page_data and isinstance(page_data, dict):
                    # Procesar los datos extraídos
                    datos_pagina = {
                        'page_name': page_name,
                        'url': url_pagina,
                        'titulo': page_data.get('name', ''),
                        'descripcion': page_data.get('about', ''),
                        'seguidores': page_data.get('followers', 'N/A'),
                        'me_gusta': page_data.get('likes', 'N/A'),
                        'posts_recientes': [],
                        'fecha_extraccion': datetime.now().isoformat(),
                        'metodo': 'facebook-page-scraper',
                        'imagen_perfil_descargada': False,
                        'ruta_imagen_perfil': None,
                        'pagina_existe': True,
                        'requiere_login': False,
                        'codigo_respuesta': 200
                    }
                    
                    # Extraer posts si están disponibles
                    if 'posts' in page_data and isinstance(page_data['posts'], list):
                        posts_info = []
                        for post in page_data['posts'][:max_posts]:
                            if isinstance(post, dict):
                                post_info = {
                                    'id': post.get('post_id', ''),
                                    'texto': post.get('post_text', '')[:500] if post.get('post_text') else '',
                                    'fecha': post.get('posted_on', ''),
                                    'likes': post.get('reactions', {}).get('likes', 0) if post.get('reactions') else 0,
                                    'shares': post.get('shares', 0),
                                    'comentarios': post.get('comments', 0),
                                    'tipo': post.get('post_type', ''),
                                    'imagen_url': post.get('image', ''),
                                    'video_url': post.get('video', ''),
                                    'enlace': post.get('link', '')
                                }
                                posts_info.append(post_info)
                        
                        datos_pagina['posts_recientes'] = posts_info
                        print(f"✅ Extraídos {len(posts_info)} posts")
                    
                    # Intentar extraer imagen de perfil
                    profile_pic_url = page_data.get('profile_picture_url', '')
                    if profile_pic_url:
                        try:
                            directorio_imagenes = os.path.join(directorio, 'profile_images')
                            os.makedirs(directorio_imagenes, exist_ok=True)
                            
                            img_response = requests.get(profile_pic_url, timeout=30)
                            if img_response.status_code == 200 and len(img_response.content) > 1000:
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                extension = os.path.splitext(urlparse(profile_pic_url).path)[1] or '.jpg'
                                nombre_imagen = f'profile_{page_name}_{timestamp}{extension}'
                                ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                                
                                with open(ruta_imagen, 'wb') as f:
                                    f.write(img_response.content)
                                
                                datos_pagina['imagen_perfil_descargada'] = True
                                datos_pagina['ruta_imagen_perfil'] = ruta_imagen
                                datos_pagina['tamanio_imagen_perfil'] = len(img_response.content)
                                datos_pagina['imagen_perfil'] = profile_pic_url
                                
                                print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
                        except Exception as e:
                            print(f"⚠️ Error al descargar imagen de perfil: {str(e)}")
                    
                    # Guardar datos en archivo JSON
                    archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}_advanced.json')
                    with open(archivo_salida, 'w', encoding='utf-8') as f:
                        json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
                    
                    print(f"✅ Extracción exitosa con facebook-page-scraper")
                    return {
                        'exito': True,
                        'archivo': archivo_salida,
                        'datos': datos_pagina,
                        'mensaje': f'Página {page_name} extraída exitosamente con facebook-page-scraper - Página existe: True'
                    }
                
                else:
                    raise Exception("No se pudieron extraer datos con facebook-page-scraper")
                    
            except Exception as e:
                print(f"⚠️ Error con facebook-page-scraper: {str(e)}")
                # Continuar con método de respaldo
        
        # Método 2: Respaldo con facebook_scraper si está disponible
        if FACEBOOK_SCRAPER_DISPONIBLE:
            try:
                print(f"🔄 Intentando método de respaldo con facebook_scraper...")
                
                page_info = get_page_info(page_name)
                
                datos_pagina = {
                    'page_name': page_name,
                    'url': url_pagina,
                    'titulo': page_info.get('name', ''),
                    'descripcion': page_info.get('about', ''),
                    'seguidores': page_info.get('followers', 'N/A'),
                    'me_gusta': page_info.get('likes', 'N/A'),
                    'categoria': page_info.get('category', ''),
                    'verificado': page_info.get('verified', False),
                    'website': page_info.get('website', ''),
                    'telefono': page_info.get('phone', ''),
                    'email': page_info.get('email', ''),
                    'ubicacion': page_info.get('location', {}),
                    'posts_recientes': [],
                    'fecha_extraccion': datetime.now().isoformat(),
                    'metodo': 'facebook_scraper (respaldo)',
                    'imagen_perfil_descargada': False,
                    'ruta_imagen_perfil': None,
                    'pagina_existe': True,
                    'requiere_login': False,
                    'codigo_respuesta': 200
                }
                
                # Intentar extraer algunos posts recientes
                try:
                    posts = list(get_posts(page_name, pages=1))[:max_posts]
                    posts_info = []
                    
                    for post in posts:
                        post_info = {
                            'id': post.get('post_id', ''),
                            'texto': post.get('text', '')[:500],
                            'fecha': post.get('time', '').isoformat() if post.get('time') else '',
                            'likes': post.get('likes', 0),
                            'shares': post.get('shares', 0),
                            'comentarios': post.get('comments', 0),
                            'tipo': post.get('post_type', '')
                        }
                        posts_info.append(post_info)
                    
                    datos_pagina['posts_recientes'] = posts_info
                    print(f"✅ Extraídos {len(posts_info)} posts con facebook_scraper")
                    
                except Exception as e:
                    print(f"⚠️ No se pudieron extraer posts: {str(e)}")
                
                # Intentar descargar imagen de perfil si está disponible
                if 'profile_picture' in page_info and page_info['profile_picture']:
                    try:
                        import urllib.request
                        directorio_imagenes = os.path.join(directorio, 'profile_images')
                        os.makedirs(directorio_imagenes, exist_ok=True)
                        
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        nombre_imagen = f'profile_{page_name}_{timestamp}.jpg'
                        ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                        
                        urllib.request.urlretrieve(page_info['profile_picture'], ruta_imagen)
                        
                        datos_pagina['imagen_perfil_descargada'] = True
                        datos_pagina['ruta_imagen_perfil'] = ruta_imagen
                        datos_pagina['imagen_perfil'] = page_info['profile_picture']
                        
                        if os.path.exists(ruta_imagen):
                            datos_pagina['tamanio_imagen_perfil'] = os.path.getsize(ruta_imagen)
                        
                        print(f"✅ Imagen de perfil descargada con facebook_scraper: {ruta_imagen}")
                    except Exception as e:
                        print(f"⚠️ Error al descargar imagen con facebook_scraper: {str(e)}")
                
                # Guardar datos en archivo JSON
                archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}_facebook_scraper.json')
                with open(archivo_salida, 'w', encoding='utf-8') as f:
                    json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
                
                print(f"✅ Extracción exitosa con facebook_scraper")
                return {
                    'exito': True,
                    'archivo': archivo_salida,
                    'datos': datos_pagina,
                    'mensaje': f'Página {page_name} extraída exitosamente con facebook_scraper - Página existe: True'
                }
                
            except Exception as e:
                print(f"⚠️ Error con facebook_scraper: {str(e)}")
        
        # Método 3: Respaldo básico si todo lo demás falla
        print(f"⚠️ Todos los métodos avanzados fallaron, usando método básico...")
        return extraer_metodo_basico(page_name, url_pagina, directorio)
        
    except Exception as e:
        print(f"❌ Error crítico: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

def extraer_metodo_basico(page_name, url_pagina, directorio):
    """
    Método básico de extracción usando requests
    """
    try:
        print(f"🔄 Usando método básico para {page_name}...")
        
        headers = {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
        
        session = requests.Session()
        session.headers.update(headers)
        
        response = session.get(url_pagina, timeout=30)
        
        datos_pagina = {
            'page_name': page_name,
            'url': url_pagina,
            'titulo': '',
            'descripcion': 'Página de Facebook (extracción básica)',
            'seguidores': 'N/A',
            'me_gusta': 'N/A',
            'posts_recientes': [],
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': 'web_scraping_basico',
            'imagen_perfil_descargada': False,
            'ruta_imagen_perfil': None,
            'pagina_existe': response.status_code == 200,
            'requiere_login': 'login' in response.text.lower(),
            'codigo_respuesta': response.status_code
        }
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extraer título
            title_tag = soup.find('title')
            if title_tag:
                datos_pagina['titulo'] = title_tag.text.strip()
            
            # Extraer meta description
            meta_desc = soup.find('meta', {'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                datos_pagina['descripcion'] = meta_desc.get('content')
            
            # Extraer Open Graph
            og_title = soup.find('meta', {'property': 'og:title'})
            if og_title and og_title.get('content'):
                datos_pagina['titulo'] = og_title.get('content')
            
            og_desc = soup.find('meta', {'property': 'og:description'})
            if og_desc and og_desc.get('content'):
                datos_pagina['descripcion'] = og_desc.get('content')
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}_basico.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_pagina,
            'mensaje': f'Página {page_name} extraída con método básico - Página existe: {datos_pagina["pagina_existe"]}'
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error en método básico: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_page_scraper_advanced.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_pagina_facebook_advanced(parametros)
    print(json.dumps(resultado, ensure_ascii=False)) 