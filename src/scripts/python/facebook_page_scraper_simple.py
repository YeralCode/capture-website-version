#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

# Intentar importar facebook_scraper como método alternativo
try:
    from facebook_scraper import get_posts, get_page_info
    FACEBOOK_SCRAPER_DISPONIBLE = True
except ImportError:
    FACEBOOK_SCRAPER_DISPONIBLE = False
    print("⚠️ facebook_scraper no disponible, usando solo método web scraping")

def extraer_pagina_facebook_simple(parametros):
    """
    Extrae información básica de una página de Facebook usando múltiples métodos anti-login
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
        
        # Métodos de acceso sin login - probamos varios enfoques
        metodos = [
            {
                'nombre': 'Facebook Bot',
                'url': url_pagina,
                'headers': {
                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            },
            {
                'nombre': 'mbasic Mobile',
                'url': f"https://mbasic.facebook.com/{page_name}",
                'headers': {
                    'User-Agent': 'Opera/9.80 (J2ME/MIDP; Opera Mini/4.2.14912/870; U; id) Presto/2.4.15',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            },
            {
                'nombre': 'Googlebot',
                'url': url_pagina,
                'headers': {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en',
                    'Accept-Encoding': 'gzip, deflate'
                }
            },
            {
                'nombre': 'm.facebook Mobile',
                'url': f"https://m.facebook.com/{page_name}",
                'headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            },
            {
                'nombre': 'Embed Plugin',
                'url': f"https://www.facebook.com/plugins/page.php?href=https://www.facebook.com/{page_name}&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId",
                'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            }
        ]
        
        response = None
        session = None
        metodo_exitoso = None
        
        # Probar cada método hasta encontrar uno que funcione
        for metodo in metodos:
            try:
                print(f"🔄 Probando método: {metodo['nombre']}")
                
                session = requests.Session()
                session.headers.update(metodo['headers'])
                
                response = session.get(metodo['url'], timeout=30, allow_redirects=True)
                
                # Verificar si es exitoso
                es_login = (
                    'login' in response.url.lower() or
                    'iniciar sesión' in response.text.lower() or
                    'entrar en facebook' in response.text.lower() or
                    'log in' in response.text.lower() or
                    len(response.text.strip()) < 500  # Página muy vacía
                )
                
                if response.status_code == 200 and not es_login:
                    print(f"✅ Acceso exitoso con método: {metodo['nombre']}")
                    metodo_exitoso = metodo['nombre']
                    break
                else:
                    print(f"⚠️ Método {metodo['nombre']} falló (login detectado o error)")
                    
            except Exception as e:
                print(f"⚠️ Error en método {metodo['nombre']}: {str(e)}")
                continue
        
        # Si ningún método funcionó, intentar con facebook_scraper
        if not response or metodo_exitoso is None:
            if FACEBOOK_SCRAPER_DISPONIBLE:
                try:
                    print(f"🔄 Intentando con facebook_scraper como último recurso...")
                    resultado_scraper = extraer_con_facebook_scraper(page_name, directorio)
                    if resultado_scraper and resultado_scraper.get('exito'):
                        return resultado_scraper
                except Exception as scraper_error:
                    print(f"⚠️ facebook_scraper también falló: {str(scraper_error)}")
        
            # Último intento con método básico
            print(f"⚠️ Todos los métodos fallaron, último intento básico...")
            try:
                session = requests.Session()
                response = session.get(url_pagina, timeout=30)
                metodo_exitoso = "Último intento básico"
            except Exception as e:
                print(f"❌ Error crítico: {str(e)}")
                response = None
        
        print(f"📝 Método exitoso: {metodo_exitoso}")
        
        # Extraer información básica de la página
        datos_pagina = {
            'page_name': page_name,
            'url': url_pagina,
            'titulo': '',
            'descripcion': '',
            'seguidores': 'N/A',
            'me_gusta': 'N/A',
            'posts_recientes': [],
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': f'web_scraping_simple ({metodo_exitoso})',
            'imagen_perfil_descargada': False,
            'ruta_imagen_perfil': None,
            'pagina_existe': False,
            'codigo_respuesta': response.status_code if response else 0
        }
        
        if response and response.status_code == 200:
            # Parsear HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extraer título
            title_tag = soup.find('title')
            if title_tag:
                datos_pagina['titulo'] = title_tag.text.strip()
            
            # Verificar si la página existe
            login_detectado = (
                'log in to facebook' in response.text.lower() or 
                'log in' in response.text.lower() or
                'iniciar sesión' in response.text.lower() or
                'entrar en facebook' in response.text.lower() or
                '/login/' in response.url or
                len(soup.get_text().strip()) < 300
            )
            
            if 'not found' in response.text.lower() or 'page not found' in response.text.lower():
                datos_pagina['pagina_existe'] = False
                datos_pagina['error'] = 'Página no encontrada'
            elif login_detectado:
                print(f"🔒 Página requiere login - contenido limitado")
                datos_pagina['pagina_existe'] = True
                datos_pagina['requiere_login'] = True
                datos_pagina['descripcion'] = 'Página de Facebook (requiere autenticación para ver contenido completo)'
            else:
                datos_pagina['pagina_existe'] = True
                print(f"✅ Contenido de página accesible sin login")
        
        # Intentar extraer información del meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc and meta_desc.get('content'):
                if not datos_pagina['descripcion'] or 'requiere autenticación' in datos_pagina['descripcion']:
            datos_pagina['descripcion'] = meta_desc.get('content')
        
        # Intentar extraer información de Open Graph
        og_title = soup.find('meta', {'property': 'og:title'})
        if og_title and og_title.get('content'):
            datos_pagina['titulo'] = og_title.get('content')
        
        og_desc = soup.find('meta', {'property': 'og:description'})
        if og_desc and og_desc.get('content'):
                if not datos_pagina['descripcion'] or 'requiere autenticación' in datos_pagina['descripcion']:
            datos_pagina['descripcion'] = og_desc.get('content')
            
            # Buscar imagen de perfil
            imagen_url = None
            try:
                # Buscar meta tags de Open Graph para imagen
                og_image = soup.find('meta', {'property': 'og:image'})
                
                if og_image and og_image.get('content'):
                    imagen_url = og_image.get('content')
                else:
                    # Buscar en otros lugares del HTML
                    img_tags = soup.find_all('img')
                    for img in img_tags:
                        src = img.get('src', '')
                        if 'profile' in src.lower() or 'avatar' in src.lower() or 'scontent' in src:
                            imagen_url = src
                            break
                
                if imagen_url:
                    datos_pagina['imagen_perfil'] = imagen_url
                    
                    # Intentar descargar la imagen de perfil
                    try:
                        directorio_imagenes = os.path.join(directorio, 'profile_images')
                        os.makedirs(directorio_imagenes, exist_ok=True)
                        
                        img_response = session.get(imagen_url, timeout=30)
                        if img_response.status_code == 200 and len(img_response.content) > 1000:
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            extension = os.path.splitext(urlparse(imagen_url).path)[1] or '.jpg'
                            nombre_imagen = f'profile_{page_name}_{timestamp}{extension}'
                            ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                            
                            with open(ruta_imagen, 'wb') as f:
                                f.write(img_response.content)
                            
                            datos_pagina['imagen_perfil_descargada'] = True
                            datos_pagina['ruta_imagen_perfil'] = ruta_imagen
                            datos_pagina['tamanio_imagen_perfil'] = len(img_response.content)
                            datos_pagina['pagina_existe'] = True
                            
                            print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
                        else:
                            print(f"⚠️ No se pudo descargar imagen de perfil: HTTP {img_response.status_code}")
                    except Exception as e:
                        print(f"⚠️ Error al descargar imagen de perfil: {str(e)}")
                else:
                    print(f"⚠️ No se encontró imagen de perfil en la página")
                    
            except Exception as e:
                print(f"⚠️ Error al buscar imagen de perfil: {str(e)}")
        
        elif response and response.status_code == 404:
            datos_pagina['pagina_existe'] = False
            datos_pagina['error'] = 'Página no encontrada (404)'
        else:
            datos_pagina['pagina_existe'] = False
            datos_pagina['error'] = f'Error HTTP {response.status_code if response else "sin respuesta"}'
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_pagina,
            'mensaje': f'Página {page_name} extraída con método {metodo_exitoso} - Página existe: {datos_pagina["pagina_existe"]}'
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

def extraer_con_facebook_scraper(page_name, directorio):
    """
    Extrae información de Facebook usando facebook_scraper como método alternativo
    """
    try:
        if not FACEBOOK_SCRAPER_DISPONIBLE:
            raise Exception("facebook_scraper no está disponible")
            
        print(f"🔄 Extrayendo información de {page_name} con facebook_scraper...")
        
        page_info = get_page_info(page_name)
        
        datos_pagina = {
            'page_name': page_name,
            'url': f"https://www.facebook.com/{page_name}",
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
            'metodo': 'facebook_scraper',
            'imagen_perfil_descargada': False,
            'ruta_imagen_perfil': None,
            'pagina_existe': True,
            'requiere_login': False
        }
        
        # Intentar extraer algunos posts recientes
        try:
            posts = list(get_posts(page_name, pages=1))[:5]
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
            print(f"✅ Extraídos {len(posts_info)} posts recientes")
            
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
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_pagina,
            'mensaje': f'Página {page_name} extraída exitosamente con facebook_scraper - Página existe: True'
        }
        
    except Exception as e:
        print(f"⚠️ Error en facebook_scraper: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página con facebook_scraper: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_page_scraper_simple.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_pagina_facebook_simple(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
