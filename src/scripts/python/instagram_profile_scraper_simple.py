#!/usr/bin/env python3
import sys
import json
import os
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

# Intentar importar instaloader como método alternativo
try:
    import instaloader
    INSTALOADER_DISPONIBLE = True
except ImportError:
    INSTALOADER_DISPONIBLE = False
    print("⚠️ instaloader no disponible, usando solo método web scraping")

def extraer_perfil_instagram_simple(parametros):
    """
    Extrae información básica de un perfil de Instagram usando múltiples métodos:
    1. Primero intenta con instaloader (más confiable)
    2. Si falla, usa web scraping básico
    Incluye descarga de imagen de perfil para verificar existencia
    """
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        username = params.get('username', '')
        directorio = params.get('directorio', 'scraped_data')
        max_posts = params.get('maxPosts', 10)
        incluir_comentarios = params.get('incluirComentarios', False)
        
        if not username:
            raise ValueError("Username es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        # Intentar primero con instaloader (método más confiable)
        if INSTALOADER_DISPONIBLE:
            print(f"🔄 Intentando extracción con instaloader para {username}...")
            try:
                resultado_instaloader = extraer_con_instaloader(username, directorio)
                if resultado_instaloader and resultado_instaloader.get('exito'):
                    print(f"✅ Datos extraídos exitosamente con instaloader")
                    return resultado_instaloader
                else:
                    print(f"⚠️ Instaloader falló, intentando método web scraping...")
            except Exception as e:
                print(f"⚠️ Error con instaloader: {str(e)}")
                print(f"🔄 Intentando método de respaldo con web scraping...")
        
        # Si instaloader no funciona o no está disponible, usar web scraping
        print(f"🔄 Extrayendo con método web scraping para {username}...")
        
        # URL del perfil
        url_perfil = f"https://www.instagram.com/{username}/"
        
        # Múltiples User-Agents para evitar detección
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
        ]
        
        import random
        selected_user_agent = random.choice(user_agents)
        
        # Headers mejorados para simular un navegador real
        headers = {
            'User-Agent': selected_user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'DNT': '1',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
        
        # Crear sesión para mantener cookies
        session = requests.Session()
        session.headers.update(headers)
        
        # Intentar múltiples estrategias para evitar login
        response = None
        metodos_intentados = []
        
        # Método 1: URL con parámetro __a=1 (API antigua de Instagram)
        try:
            url_api = f"https://www.instagram.com/{username}/?__a=1&__d=1"
            response = session.get(url_api, timeout=30)
            metodos_intentados.append("API __a=1")
            
            if response.status_code == 200 and 'login' not in response.url.lower():
                print(f"✅ Acceso exitoso con API __a=1")
            else:
                raise Exception("API method failed")
                
        except Exception as e:
            print(f"⚠️ Método API falló: {str(e)}")
            
            # Método 2: URL estándar con headers mejorados
            try:
                response = session.get(url_perfil, timeout=30)
                metodos_intentados.append("URL estándar")
                
                if 'login' in response.url.lower() or response.status_code != 200:
                    raise Exception("Standard method redirected to login")
                    
            except Exception as e:
                print(f"⚠️ Método estándar falló: {str(e)}")
                
                # Método 3: URL con embed (para widgets)
                try:
                    url_embed = f"https://www.instagram.com/p/{username}/embed/"
                    response = session.get(url_embed, timeout=30)
                    metodos_intentados.append("Embed URL")
                    
                except Exception as e:
                    print(f"⚠️ Método embed falló: {str(e)}")
                    
                    # Método 4: Última oportunidad con URL básica
                    try:
                        # Limpiar sesión y usar nuevos headers
                        session = requests.Session()
                        headers['User-Agent'] = random.choice(user_agents)
                        session.headers.update(headers)
                        response = session.get(url_perfil, timeout=30, allow_redirects=False)
                        metodos_intentados.append("URL básica sin redirects")
                        
                    except Exception as e:
                        print(f"❌ Todos los métodos fallaron: {str(e)}")
                        response = session.get(url_perfil, timeout=30)  # Último intento
                        metodos_intentados.append("Último intento")
        
        print(f"📝 Métodos intentados: {', '.join(metodos_intentados)}")
        
        # Verificar si nos redirige al login
        if 'login' in response.url or response.status_code == 302:
            print(f"⚠️ Instagram requiere login para {username}, obteniendo información limitada...")
            
            # Intentar acceder a la información pública mínima
            # Probar diferentes enfoques para obtener información sin login
            try:
                # Intentar con una URL directa diferente
                url_alternativa = f"https://www.instagram.com/{username}/?__a=1"
                response_alt = session.get(url_alternativa, timeout=30)
                
                if response_alt.status_code == 200 and 'login' not in response_alt.url:
                    response = response_alt
                else:
                    # Si no funciona, usar la respuesta original pero marcar como limitada
                    datos_limitados = True
            except:
                datos_limitados = True
        
        if response.status_code != 200 and response.status_code != 302:
            raise Exception(f"Error HTTP {response.status_code}: {response.reason}")
        
        # Parsear HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Verificar si estamos en página de login (detección mejorada)
        login_detectado = (
            'login' in response.url.lower() or 
            '/accounts/login/' in response.url or
            soup.find('input', {'name': 'username'}) is not None or
            'log in' in soup.get_text().lower()[:1000] or
            'iniciar sesión' in soup.get_text().lower()[:1000] or
            'sign up' in soup.get_text().lower()[:1000] or
            'registrate' in soup.get_text().lower()[:1000] or
            'not available' in soup.get_text().lower()[:1000] or
            len(soup.get_text().strip()) < 500  # Página muy vacía, probablemente restringida
        )
        
        # Extraer información básica del perfil
        datos_perfil = {
            'username': username,
            'url': url_perfil,
            'titulo': soup.find('title').text if soup.find('title') else f"@{username}",
            'descripcion': '',
            'seguidores': 'N/A',
            'seguidos': 'N/A',
            'posts': 'N/A',
            'es_privado': False,
            'es_verificado': False,
            'biografia': '',
            'enlace_externo': '',
            'imagen_perfil': '',
            'posts_detallados': [],
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': 'web_scraping_simple',
            'imagen_perfil_descargada': False,
            'ruta_imagen_perfil': None,
            'usuario_existe': False,
            'login_requerido': login_detectado,
            'acceso_limitado': login_detectado
        }
        
        # Si detectamos login, intentar método alternativo con instaloader
        if login_detectado:
            print(f"🔒 Acceso limitado para {username} - Instagram requiere autenticación")
            
            # Intentar usar instaloader como método alternativo
            if INSTALOADER_DISPONIBLE:
                print(f"🔄 Intentando método alternativo con instaloader...")
                try:
                    resultado_instaloader = extraer_con_instaloader(username, directorio)
                    if resultado_instaloader and resultado_instaloader.get('exito'):
                        print(f"✅ Datos extraídos exitosamente con instaloader")
                        # Combinar datos de instaloader con los datos básicos
                        datos_insta = resultado_instaloader.get('datos', {})
                        if datos_insta:
                            datos_perfil.update(datos_insta)
                            datos_perfil['metodo'] = 'web_scraping_simple + instaloader'
                        return resultado_instaloader
                except Exception as e:
                    print(f"⚠️ Error con instaloader: {str(e)}")
            
            # Si instaloader no funciona, continuar con método básico
            # Marcar que el usuario probablemente existe si llegamos aquí
            datos_perfil['usuario_existe'] = True
            datos_perfil['descripcion'] = 'Perfil de Instagram (requiere autenticación para ver contenido completo)'
            
            # Intentar extraer datos básicos incluso con restricción de login
            try:
                datos_limitados = extraer_datos_instagram_alternativos(username, session)
                if datos_limitados:
                    print(f"🔓 Datos básicos extraídos a pesar de restricción de login")
                    datos_perfil.update(datos_limitados)
                    datos_perfil['metodo'] = 'web_scraping_simple + API alternativa (limitada)'
                    datos_perfil['acceso_limitado'] = True
            except Exception as e:
                print(f"⚠️ No se pudieron extraer datos limitados: {str(e)}")
            
            # Intentar extraer el título si está disponible
            title_tag = soup.find('title')
            if title_tag and title_tag.text:
                title_text = title_tag.text
                if username.lower() in title_text.lower() and 'instagram' in title_text.lower():
                    datos_perfil['titulo'] = title_text
                    datos_perfil['usuario_existe'] = True
            
            # Buscar cualquier meta información disponible
            meta_desc = soup.find('meta', {'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                datos_perfil['descripcion'] = meta_desc.get('content')
            
            # Intentar buscar imagen de perfil en meta tags
            og_image = soup.find('meta', {'property': 'og:image'})
            if og_image and og_image.get('content'):
                datos_perfil['imagen_perfil'] = og_image.get('content')
        else:
            print(f"✅ Acceso completo para {username}")
            # Procesar normalmente si no hay restricción de login
            
            # Intentar extraer datos usando métodos alternativos primero
            datos_alternativos = extraer_datos_instagram_alternativos(username, session)
            if datos_alternativos:
                print(f"🎯 Datos alternativos encontrados, actualizando perfil...")
                datos_perfil.update(datos_alternativos)
                datos_perfil['metodo'] = 'web_scraping_simple + API alternativa'
                datos_perfil['usuario_existe'] = True
            
            # Intentar extraer datos del JSON embebido en el HTML
            try:
                # Buscar scripts que contengan datos JSON
                script_tags = soup.find_all('script', type='text/javascript')
                for script in script_tags:
                    if script.string and 'window._sharedData' in script.string:
                        # Extraer JSON de window._sharedData
                        start = script.string.find('window._sharedData = ') + len('window._sharedData = ')
                        end = script.string.find(';</script>', start)
                        if end == -1:
                            end = script.string.find(';', start)
                        
                        if start > 0 and end > start:
                            json_str = script.string[start:end]
                            try:
                                data = json.loads(json_str)
                                if 'entry_data' in data and 'ProfilePage' in data['entry_data']:
                                    profile_data = data['entry_data']['ProfilePage'][0]['graphql']['user']
                                    
                                    datos_perfil.update({
                                        'seguidores': profile_data.get('edge_followed_by', {}).get('count', datos_perfil['seguidores']),
                                        'seguidos': profile_data.get('edge_follow', {}).get('count', datos_perfil['seguidos']),
                                        'posts': profile_data.get('edge_owner_to_timeline_media', {}).get('count', datos_perfil['posts']),
                                        'biografia': profile_data.get('biography', datos_perfil['biografia']),
                                        'enlace_externo': profile_data.get('external_url', datos_perfil['enlace_externo']),
                                        'es_privado': profile_data.get('is_private', datos_perfil['es_privado']),
                                        'es_verificado': profile_data.get('is_verified', datos_perfil['es_verificado']),
                                        'nombre_completo': profile_data.get('full_name', datos_perfil.get('nombre_completo', '')),
                                        'imagen_perfil': profile_data.get('profile_pic_url_hd', profile_data.get('profile_pic_url', datos_perfil['imagen_perfil'])),
                                        'usuario_existe': True
                                    })
                                    
                                    print(f"🎯 Datos extraídos de window._sharedData")
                                    break
                            except json.JSONDecodeError:
                                continue
                                
            except Exception as e:
                print(f"⚠️ Error extrayendo _sharedData: {str(e)}")
        
        # Intentar extraer información del meta description (solo si no hay login)
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            descripcion = meta_desc.get('content')
            if not datos_perfil['descripcion']:  # Solo si no tenemos descripción ya
            datos_perfil['descripcion'] = descripcion
            
                        # Intentar extraer números de seguidores, seguidos, posts (solo si no los tenemos)
            if datos_perfil['seguidores'] == 'N/A':
            numeros = re.findall(r'([\d,]+)', descripcion)
            if len(numeros) >= 3:
                datos_perfil['seguidores'] = numeros[0]
                datos_perfil['seguidos'] = numeros[1] 
                datos_perfil['posts'] = numeros[2]
        
            # Intentar extraer biografía y verificar si el usuario existe (solo si no hay login)
        script_tags = soup.find_all('script', type='application/ld+json')
        for script in script_tags:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'mainEntity' in data:
                    main_entity = data['mainEntity']
                    if isinstance(main_entity, dict):
                        if 'description' in main_entity:
                            datos_perfil['biografia'] = main_entity['description']
                        if 'url' in main_entity:
                            datos_perfil['enlace_externo'] = main_entity['url']
            except:
                continue
        
        # Buscar imagen de perfil en el HTML (funciona tanto con login como sin login)
        try:
            imagen_url = None
            
            # Buscar meta tags de Open Graph
            og_image = soup.find('meta', {'property': 'og:image'})
            if og_image and og_image.get('content'):
                imagen_url = og_image.get('content')
                datos_perfil['imagen_perfil'] = imagen_url
                
            # Si no encontramos imagen, buscar en otros lugares del HTML
            if not imagen_url:
                # Buscar en script tags (a veces contienen URLs de imágenes)
                script_tags = soup.find_all('script')
                for script in script_tags:
                    if script.string:
                        # Buscar URLs de imágenes en JavaScript
                        img_matches = re.findall(r'https://[^"\']*\.instagram\.com[^"\']*\.jpg', script.string)
                        if img_matches:
                            imagen_url = img_matches[0]
                            datos_perfil['imagen_perfil'] = imagen_url
                            break
                
                # Si aún no encontramos, buscar en img tags
                if not imagen_url:
                    img_tags = soup.find_all('img')
                    for img in img_tags:
                        src = img.get('src', '')
                        if 'profile' in src.lower() or 'avatar' in src.lower() or 'instagram.com' in src:
                            imagen_url = src
                            datos_perfil['imagen_perfil'] = imagen_url
                            break
            
            # Intentar descargar la imagen de perfil si la encontramos
            if imagen_url:
                try:
                    # Crear directorio para imágenes de perfil
                    directorio_imagenes = os.path.join(directorio, 'profile_images')
                    os.makedirs(directorio_imagenes, exist_ok=True)
                    
                    # Descargar imagen de perfil usando la sesión
                    img_response = session.get(imagen_url, timeout=30)
                    if img_response.status_code == 200 and len(img_response.content) > 1000:  # Verificar que no sea imagen vacía
                        # Generar nombre de archivo único
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        extension = os.path.splitext(urlparse(imagen_url).path)[1] or '.jpg'
                        nombre_imagen = f'profile_{username}_{timestamp}{extension}'
                        ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                        
                        # Guardar imagen
                        with open(ruta_imagen, 'wb') as f:
                            f.write(img_response.content)
                        
                        datos_perfil['imagen_perfil_descargada'] = True
                        datos_perfil['ruta_imagen_perfil'] = ruta_imagen
                        datos_perfil['tamanio_imagen_perfil'] = len(img_response.content)
                        datos_perfil['usuario_existe'] = True  # Si podemos descargar la imagen, el usuario existe
                        
                        print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
                    else:
                        print(f"⚠️ No se pudo descargar imagen de perfil: HTTP {img_response.status_code} o imagen muy pequeña")
                except Exception as e:
                    print(f"⚠️ Error al descargar imagen de perfil: {str(e)}")
                    datos_perfil['error_imagen_perfil'] = str(e)
                    
        except Exception as e:
            print(f"⚠️ Error al buscar imagen de perfil: {str(e)}")
            datos_perfil['error_busqueda_imagen'] = str(e)
        
        # Verificar si el usuario existe basándose en el contenido de la página
        if 'not found' in response.text.lower() or 'page not found' in response.text.lower():
            datos_perfil['usuario_existe'] = False
            datos_perfil['error'] = 'Usuario no encontrado'
        elif datos_perfil['imagen_perfil_descargada']:
            datos_perfil['usuario_existe'] = True
        elif login_detectado:
            # Si detectamos login, probablemente el usuario existe
            datos_perfil['usuario_existe'] = True
            datos_perfil['acceso_limitado'] = True
        elif 'instagram' in datos_perfil['titulo'].lower() and username in datos_perfil['titulo'].lower():
            datos_perfil['usuario_existe'] = True
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'instagram_profile_{username}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_perfil, f, ensure_ascii=False, indent=2)
        
        # Crear mensaje informativo
        estado_acceso = "acceso limitado (requiere login)" if login_detectado else "acceso completo"
        mensaje = f'Perfil de {username} extraído exitosamente (método simple) - Usuario existe: {datos_perfil["usuario_existe"]} - Estado: {estado_acceso}'
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_perfil,
            'mensaje': mensaje
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer perfil: {str(e)}'
        }

def extraer_datos_instagram_alternativos(username, session):
    """
    Extrae datos usando métodos alternativos de Instagram
    """
    datos_encontrados = {}
    
    # Método 1: Intentar extraer de JSON embebido
    try:
        # Probar diferentes endpoints
        endpoints = [
            f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}",
            f"https://www.instagram.com/{username}/?__a=1",
            f"https://i.instagram.com/api/v1/users/web_profile_info/?username={username}"
        ]
        
        for endpoint in endpoints:
            try:
                response = session.get(endpoint, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    if 'data' in data and 'user' in data['data']:
                        user_data = data['data']['user']
                        datos_encontrados = {
                            'username': user_data.get('username', username),
                            'seguidores': user_data.get('edge_followed_by', {}).get('count', 'N/A'),
                            'seguidos': user_data.get('edge_follow', {}).get('count', 'N/A'),
                            'posts': user_data.get('edge_owner_to_timeline_media', {}).get('count', 'N/A'),
                            'biografia': user_data.get('biography', ''),
                            'enlace_externo': user_data.get('external_url', ''),
                            'es_privado': user_data.get('is_private', False),
                            'es_verificado': user_data.get('is_verified', False),
                            'nombre_completo': user_data.get('full_name', ''),
                            'imagen_perfil': user_data.get('profile_pic_url_hd', user_data.get('profile_pic_url', ''))
                        }
                        print(f"✅ Datos extraídos de endpoint: {endpoint}")
                        return datos_encontrados
            except:
                continue
                
    except Exception as e:
        print(f"⚠️ Error extrayendo datos alternativos: {str(e)}")
    
    return datos_encontrados

def extraer_con_instaloader(username, directorio):
    """
    Extrae información de Instagram usando instaloader como método alternativo
    """
    try:
        if not INSTALOADER_DISPONIBLE:
            raise Exception("instaloader no está disponible")
            
        # Configurar instaloader con opciones para evitar rate limiting
        loader = instaloader.Instaloader(
            download_pictures=False,  # Desactivar para ser menos invasivos
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,  # Desactivar para ser más rápido
            compress_json=False,
            max_connection_attempts=3
        )
        
        # Crear directorio temporal para instaloader
        directorio_temp = os.path.join(directorio, 'temp_instaloader')
        os.makedirs(directorio_temp, exist_ok=True)
        
        # Cambiar al directorio temporal
        old_cwd = os.getcwd()
        os.chdir(directorio_temp)
        
        try:
            # Cargar perfil
            profile = instaloader.Profile.from_username(loader.context, username)
            
            # Extraer información del perfil
            datos_perfil = {
                'username': profile.username,
                'url': f"https://www.instagram.com/{profile.username}/",
                'titulo': f"@{profile.username}",
                'descripcion': profile.biography or '',
                'seguidores': str(profile.followers),
                'seguidos': str(profile.followees),
                'posts': str(profile.mediacount),
                'es_privado': profile.is_private,
                'es_verificado': profile.is_verified,
                'biografia': profile.biography or '',
                'enlace_externo': profile.external_url or '',
                'imagen_perfil': profile.profile_pic_url,
                'nombre_completo': profile.full_name or '',
                'posts_detallados': [],
                'fecha_extraccion': datetime.now().isoformat(),
                'metodo': 'instaloader',
                'imagen_perfil_descargada': False,
                'ruta_imagen_perfil': None,
                'usuario_existe': True,
                'login_requerido': False,
                'acceso_limitado': False
            }
            
            # Intentar descargar imagen de perfil
            try:
                if profile.profile_pic_url:
                    import urllib.request
                    directorio_imagenes = os.path.join(directorio, 'profile_images')
                    os.makedirs(directorio_imagenes, exist_ok=True)
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    nombre_imagen = f'profile_{username}_{timestamp}.jpg'
                    ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                    
                    urllib.request.urlretrieve(profile.profile_pic_url, ruta_imagen)
                    
                    datos_perfil['imagen_perfil_descargada'] = True
                    datos_perfil['ruta_imagen_perfil'] = ruta_imagen
                    
                    # Obtener tamaño del archivo
                    if os.path.exists(ruta_imagen):
                        datos_perfil['tamanio_imagen_perfil'] = os.path.getsize(ruta_imagen)
                    
                    print(f"✅ Imagen de perfil descargada con instaloader: {ruta_imagen}")
            except Exception as e:
                print(f"⚠️ Error al descargar imagen con instaloader: {str(e)}")
            
            # Guardar datos en archivo JSON
            archivo_salida = os.path.join(directorio, f'instagram_profile_{username}_{datetime.now().strftime("%Y%m%d_%H%M%S")}_instaloader.json')
            with open(archivo_salida, 'w', encoding='utf-8') as f:
                json.dump(datos_perfil, f, ensure_ascii=False, indent=2)
            
            return {
                'exito': True,
                'archivo': archivo_salida,
                'datos': datos_perfil,
                'mensaje': f'Perfil de {username} extraído exitosamente con instaloader - Usuario existe: True'
            }
            
        finally:
            # Volver al directorio original
            os.chdir(old_cwd)
            
            # Limpiar directorio temporal
            try:
                import shutil
                shutil.rmtree(directorio_temp)
            except:
                pass
    
    except Exception as e:
        print(f"⚠️ Error en instaloader: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer perfil con instaloader: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python instagram_profile_scraper_simple.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_perfil_instagram_simple(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
