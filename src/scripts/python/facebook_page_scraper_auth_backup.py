#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re
import time
import random

def extraer_pagina_facebook_proxy(parametros):
    """
    Extrae información de Facebook usando técnicas avanzadas para evitar login
    Optimizado para uso con proxies residenciales (opcional)
    """
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        page_name = params.get('pageName', '')
        directorio = params.get('directorio', 'scraped_data')
        proxy = params.get('proxy', None)  # Formato: {"http": "http://user:pass@host:port"}
        
        if not page_name:
            raise ValueError("Nombre de página es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        # URL de la página
        url_pagina = f"https://www.facebook.com/{page_name}"
        
        # User-Agents reales y variados
        user_agents_reales = [
            # Chrome Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            # Firefox Windows  
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
            # Safari macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            # Mobile realistas
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
        ]
        
        # Estrategias de acceso ordenadas por efectividad
        estrategias = [
            {
                'nombre': 'mbasic Touch',
                'url': f"https://touch.facebook.com/{page_name}",
                'headers': {
                    'User-Agent': random.choice([
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
                        'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0'
                    ]),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                }
            },
            {
                'nombre': 'mbasic Basic',
                'url': f"https://mbasic.facebook.com/{page_name}",
                'headers': {
                    'User-Agent': 'Opera/9.80 (J2ME/MIDP; Opera Mini/4.2.14912/870; U; en) Presto/2.4.15',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            },
            {
                'nombre': 'Facebook External Hit',
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
                'nombre': 'Chrome Normal',
                'url': url_pagina,
                'headers': {
                    'User-Agent': random.choice(user_agents_reales),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'no-cache',
                    'DNT': '1'
                }
            },
            {
                'nombre': 'Mobile Facebook',
                'url': f"https://m.facebook.com/{page_name}",
                'headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            }
        ]
        
        # Variables para el resultado
        response = None
        session = None
        estrategia_exitosa = None
        
        # Probar cada estrategia
        for i, estrategia in enumerate(estrategias):
            try:
                print(f"🔄 Probando estrategia {i+1}/5: {estrategia['nombre']}")
                
                # Crear nueva sesión para cada intento
                session = requests.Session()
                
                # Configurar proxy si se proporciona
                if proxy:
                    session.proxies.update(proxy)
                    print(f"🌐 Usando proxy para {estrategia['nombre']}")
                
                # Configurar headers
                session.headers.update(estrategia['headers'])
                
                # Agregar delay aleatorio entre intentos (simular comportamiento humano)
                if i > 0:
                    delay = random.uniform(2, 5)
                    print(f"⏰ Esperando {delay:.1f}s antes del siguiente intento...")
                    time.sleep(delay)
                
                # Hacer petición
                response = session.get(
                    estrategia['url'], 
                    timeout=30,
                    allow_redirects=True
                )
                
                # Verificar si evitamos el login
                es_login_page = detectar_pagina_login(response)
                
                if response.status_code == 200 and not es_login_page:
                    print(f"✅ Éxito con estrategia: {estrategia['nombre']}")
                    estrategia_exitosa = estrategia['nombre']
                    break
                else:
                    status = "login detectado" if es_login_page else f"HTTP {response.status_code}"
                    print(f"⚠️ Falló {estrategia['nombre']}: {status}")
                    
            except Exception as e:
                print(f"⚠️ Error en {estrategia['nombre']}: {str(e)}")
                continue
        
        # Procesar resultados
        if not response or not estrategia_exitosa:
            raise Exception("Todas las estrategias fallaron - Facebook requiere login")
        
        print(f"📝 Estrategia exitosa: {estrategia_exitosa}")
        
        # Extraer información de la página
        datos_pagina = extraer_informacion_facebook(response, page_name, url_pagina, estrategia_exitosa)
        
        # Intentar descargar imagen de perfil si está disponible
        if datos_pagina.get('imagen_perfil'):
            descargar_imagen_perfil(datos_pagina, session, directorio)
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}_proxy.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_pagina,
            'mensaje': f'Página {page_name} extraída exitosamente con {estrategia_exitosa} - Sin login requerido'
        }
        
    except Exception as e:
        print(f"❌ Error crítico: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

def detectar_pagina_login(response):
    """
    Detecta si la respuesta es una página de login de Facebook
    """
    if not response or response.status_code != 200:
        return True
    
    text_lower = response.text.lower()
    url_lower = response.url.lower()
    
    # Indicadores de página de login
    login_indicators = [
        'login' in url_lower,
        '/accounts/login/' in url_lower,
        'log in to facebook' in text_lower,
        'iniciar sesión' in text_lower,
        'entrar en facebook' in text_lower,
        'sign up' in text_lower,
        'create account' in text_lower,
        'registrate' in text_lower,
        len(response.text.strip()) < 1000,  # Página muy vacía
        'input' in text_lower and 'password' in text_lower,  # Formulario de login
        'debes iniciar sesión' in text_lower
    ]
    
    return any(login_indicators)

def extraer_informacion_facebook(response, page_name, url_pagina, metodo):
    """
    Extrae información de la página de Facebook desde el HTML
    """
    soup = BeautifulSoup(response.text, 'html.parser')
    
    datos_pagina = {
        'page_name': page_name,
        'url': url_pagina,
        'titulo': '',
        'descripcion': '',
        'seguidores': 'N/A',
        'me_gusta': 'N/A',
        'posts_recientes': [],
        'fecha_extraccion': datetime.now().isoformat(),
        'metodo': f'facebook_proxy_scraper ({metodo})',
        'imagen_perfil_descargada': False,
        'ruta_imagen_perfil': None,
        'pagina_existe': True,
        'requiere_login': False,
        'codigo_respuesta': response.status_code,
        'url_accedida': response.url
    }
    
    # Extraer título
    title_tag = soup.find('title')
    if title_tag and title_tag.text:
        titulo = title_tag.text.strip()
        # Limpiar título de Facebook
        if titulo and titulo != 'Facebook':
            datos_pagina['titulo'] = titulo.replace(' | Facebook', '').replace(' - Facebook', '')
    
    # Extraer meta description
    meta_desc = soup.find('meta', {'name': 'description'})
    if meta_desc and meta_desc.get('content'):
        datos_pagina['descripcion'] = meta_desc.get('content')
    
    # Extraer Open Graph (más confiable)
    og_title = soup.find('meta', {'property': 'og:title'})
    if og_title and og_title.get('content'):
        datos_pagina['titulo'] = og_title.get('content')
    
    og_desc = soup.find('meta', {'property': 'og:description'})
    if og_desc and og_desc.get('content'):
        datos_pagina['descripcion'] = og_desc.get('content')
    
    # Extraer imagen de perfil (Open Graph)
    og_image = soup.find('meta', {'property': 'og:image'})
    if og_image and og_image.get('content'):
        datos_pagina['imagen_perfil'] = og_image.get('content')
    
    # Intentar extraer estadísticas si están visibles
    try:
        text_content = soup.get_text()
        
        # Buscar números que podrían ser seguidores/likes
        numbers = re.findall(r'([\d,]+)\s*(followers?|seguidores?|likes?|me gusta)', text_content, re.IGNORECASE)
        if numbers:
            for number, type_match in numbers:
                if 'follow' in type_match.lower() or 'seguidor' in type_match.lower():
                    datos_pagina['seguidores'] = number
                elif 'like' in type_match.lower() or 'gusta' in type_match.lower():
                    datos_pagina['me_gusta'] = number
                    
    except Exception as e:
        print(f"⚠️ Error extrayendo estadísticas: {str(e)}")
    
    return datos_pagina

def descargar_imagen_perfil(datos_pagina, session, directorio):
    """
    Descarga la imagen de perfil si está disponible
    """
    try:
        imagen_url = datos_pagina.get('imagen_perfil')
        if not imagen_url:
            return
            
        # Crear directorio para imágenes
        directorio_imagenes = os.path.join(directorio, 'profile_images')
        os.makedirs(directorio_imagenes, exist_ok=True)
        
        # Descargar imagen
        img_response = session.get(imagen_url, timeout=30)
        if img_response.status_code == 200 and len(img_response.content) > 1000:
            # Generar nombre de archivo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            extension = os.path.splitext(urlparse(imagen_url).path)[1] or '.jpg'
            nombre_imagen = f'profile_{datos_pagina["page_name"]}_{timestamp}{extension}'
            ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
            
            # Guardar imagen
            with open(ruta_imagen, 'wb') as f:
                f.write(img_response.content)
            
            # Actualizar datos
            datos_pagina['imagen_perfil_descargada'] = True
            datos_pagina['ruta_imagen_perfil'] = ruta_imagen
            datos_pagina['tamanio_imagen_perfil'] = len(img_response.content)
            
            print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
        else:
            print(f"⚠️ No se pudo descargar imagen: HTTP {img_response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Error descargando imagen de perfil: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_page_scraper_proxy.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_pagina_facebook_proxy(parametros)
    print(json.dumps(resultado, ensure_ascii=False)) 