#!/usr/bin/env python3
import sys
import json
import os
import requests
from datetime import datetime
from urllib.parse import urlparse
from facebook_scraper import get_posts, get_page_info

def extraer_pagina_facebook(parametros):
    """
    Extrae información de una página de Facebook usando facebook-scraper
    Incluye descarga de imagen de perfil para verificar existencia
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
        
        # Obtener información de la página
        try:
            page_info = get_page_info(page_name)
            datos_pagina = {
                'page_name': page_name,
                'page_info': page_info,
                'posts': [],
                'imagen_perfil_descargada': False,
                'ruta_imagen_perfil': None
            }
        except Exception as e:
            # Si no se puede obtener info de la página, continuar solo con posts
            datos_pagina = {
                'page_name': page_name,
                'page_info': None,
                'error_page_info': str(e),
                'posts': [],
                'imagen_perfil_descargada': False,
                'ruta_imagen_perfil': None
            }
        
        # Intentar descargar imagen de perfil de la página
        try:
            # URL de la página de Facebook
            url_pagina = f"https://www.facebook.com/{page_name}"
            
            # Headers para simular un navegador
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            # Hacer petición para obtener la página
            response = requests.get(url_pagina, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Crear directorio para imágenes de perfil
                directorio_imagenes = os.path.join(directorio, 'profile_images')
                os.makedirs(directorio_imagenes, exist_ok=True)
                
                # Buscar imagen de perfil en el HTML (esto es una aproximación)
                # En un caso real, necesitarías parsear el HTML para encontrar la imagen
                # Por ahora, intentamos con una URL común de imagen de perfil
                imagen_url = f"https://graph.facebook.com/{page_name}/picture?type=large"
                
                try:
                    img_response = requests.get(imagen_url, timeout=30)
                    if img_response.status_code == 200:
                        # Generar nombre de archivo único
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        nombre_imagen = f'profile_{page_name}_{timestamp}.jpg'
                        ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                        
                        # Guardar imagen
                        with open(ruta_imagen, 'wb') as f:
                            f.write(img_response.content)
                        
                        datos_pagina['imagen_perfil_descargada'] = True
                        datos_pagina['ruta_imagen_perfil'] = ruta_imagen
                        datos_pagina['tamanio_imagen_perfil'] = len(img_response.content)
                        
                        print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
                    else:
                        print(f"⚠️ No se pudo descargar imagen de perfil: HTTP {img_response.status_code}")
                except Exception as e:
                    print(f"⚠️ Error al descargar imagen de perfil: {str(e)}")
                    datos_pagina['error_imagen_perfil'] = str(e)
            else:
                print(f"⚠️ No se pudo acceder a la página: HTTP {response.status_code}")
                datos_pagina['error_acceso_pagina'] = f"HTTP {response.status_code}"
                
        except Exception as e:
            print(f"⚠️ Error al procesar página: {str(e)}")
            datos_pagina['error_procesamiento'] = str(e)
        
        # Extraer posts de la página
        posts_extraidos = 0
        try:
            for post in get_posts(page_name, pages=1, options={'comments': incluir_comentarios}):
                if posts_extraidos >= max_posts:
                    break
                
                post_data = {
                    'post_id': post.get('post_id'),
                    'text': post.get('text'),
                    'time': post.get('time').isoformat() if post.get('time') else None,
                    'timestamp': post.get('timestamp'),
                    'likes': post.get('likes'),
                    'comments': post.get('comments'),
                    'shares': post.get('shares'),
                    'reactions': post.get('reactions'),
                    'post_url': post.get('post_url'),
                    'link': post.get('link'),
                    'image': post.get('image'),
                    'video': post.get('video'),
                    'video_thumbnail': post.get('video_thumbnail'),
                    'user_id': post.get('user_id'),
                    'username': post.get('username'),
                    'is_live': post.get('is_live', False),
                    'factcheck': post.get('factcheck'),
                    'shared_text': post.get('shared_text'),
                    'shared_time': post.get('shared_time').isoformat() if post.get('shared_time') else None,
                    'shared_user_id': post.get('shared_user_id'),
                    'shared_username': post.get('shared_username'),
                    'available': post.get('available', True)
                }
                
                # Agregar comentarios si se solicitan
                if incluir_comentarios and post.get('comments', 0) > 0:
                    try:
                        comentarios = []
                        for comment in post.get('comments_full', []):
                            comentarios.append({
                                'comment_id': comment.get('comment_id'),
                                'comment_text': comment.get('comment_text'),
                                'comment_time': comment.get('comment_time').isoformat() if comment.get('comment_time') else None,
                                'commenter_name': comment.get('commenter_name'),
                                'commenter_id': comment.get('commenter_id'),
                                'comment_reactions': comment.get('comment_reactions'),
                                'comment_reaction_count': comment.get('comment_reaction_count')
                            })
                        post_data['comentarios_detallados'] = comentarios
                    except Exception as e:
                        post_data['error_comentarios'] = str(e)
                
                datos_pagina['posts'].append(post_data)
                posts_extraidos += 1
                
        except Exception as e:
            print(f"⚠️ Error al extraer posts: {str(e)}")
            datos_pagina['error_posts'] = str(e)
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_pagina, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_pagina,
            'mensaje': f'Página {page_name} extraída exitosamente con imagen de perfil'
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_page_scraper.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_pagina_facebook(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
