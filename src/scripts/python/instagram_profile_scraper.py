#!/usr/bin/env python3
import sys
import json
import os
import instaloader
import requests
from datetime import datetime
from urllib.parse import urlparse

# Credenciales de Instagram
INSTAGRAM_CREDENTIALS = {
    "username": "ypulido2004@gmail.com",
    "password": "6897861Yps@"
}

def extraer_perfil_instagram(parametros):
    """
    Extrae información de un perfil de Instagram usando instaloader
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
                # Crear directorio para sesiones persistentes
        directorio_sesiones = os.path.join(os.getcwd(), 'sesiones_instagram')
        os.makedirs(directorio_sesiones, exist_ok=True)
        
        # Inicializar instaloader con directorio de sesiones
        loader = instaloader.Instaloader(
            download_pictures=True,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=incluir_comentarios,
            save_metadata=True,
            compress_json=False,
            dirname_pattern=directorio_sesiones,
            filename_pattern='{profile}'
        )
        
        # Intentar cargar sesión existente
        login_exitoso = False
        session_file = os.path.join(directorio_sesiones, f'session-{INSTAGRAM_CREDENTIALS["username"]}')
        
        try:
            if os.path.exists(session_file):
                print(f"🔄 Cargando sesión guardada de Instagram...")
                loader.load_session_from_file(INSTAGRAM_CREDENTIALS['username'], session_file)
                print("✅ Sesión de Instagram cargada exitosamente")
                login_exitoso = True
            else:
                raise Exception("No hay sesión guardada")
        except Exception as e:
            # Si no hay sesión o falló, hacer login
            try:
                print(f"🔐 Iniciando sesión en Instagram con {INSTAGRAM_CREDENTIALS['username']}...")
                loader.login(INSTAGRAM_CREDENTIALS['username'], INSTAGRAM_CREDENTIALS['password'])
                print("✅ Login exitoso en Instagram")
                
                # Guardar sesión para uso futuro
                try:
                    loader.save_session_to_file(session_file)
                    print(f"💾 Sesión guardada en: {session_file}")
                except Exception as save_error:
                    print(f"⚠️ No se pudo guardar la sesión: {str(save_error)}")
                
                login_exitoso = True
            except Exception as login_error:
                print(f"⚠️ Error en login: {str(login_error)}")
                print("🔄 Continuando sin autenticación...")
                login_exitoso = False
        
        # Obtener perfil
        profile = instaloader.Profile.from_username(loader.context, username)
        
        # Verificar si el perfil existe y es accesible
        if not profile:
            raise ValueError(f"Perfil {username} no encontrado o no accesible")
        
        # Extraer información básica del perfil
        datos_perfil = {
            'username': profile.username,
            'userid': profile.userid,
            'full_name': profile.full_name,
            'biography': profile.biography,
            'followers': profile.followers,
            'followees': profile.followees,
            'mediacount': profile.mediacount,
            'is_private': profile.is_private,
            'is_verified': profile.is_verified,
            'is_business': getattr(profile, 'is_business', False),
            'external_url': profile.external_url,
            'profile_pic_url': profile.profile_pic_url,
            'igtvcount': getattr(profile, 'igtvcount', 0),
            'videocount': getattr(profile, 'videocount', 0),
            'highlight_reel_count': getattr(profile, 'highlight_reel_count', 0),
            'business_category_name': getattr(profile, 'business_category_name', ''),
            'contact_phone_number': getattr(profile, 'contact_phone_number', ''),
            'public_email': getattr(profile, 'public_email', ''),
            'posts': [],
            'imagen_perfil_descargada': False,
            'ruta_imagen_perfil': None,
            'login_exitoso': login_exitoso,
            'usuario_existe': True,
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': 'instaloader_con_login' if login_exitoso else 'instaloader_sin_login'
        }
        
        # Intentar descargar la imagen de perfil
        try:
            if profile.profile_pic_url:
                # Crear directorio para imágenes de perfil
                directorio_imagenes = os.path.join(directorio, 'profile_images')
                os.makedirs(directorio_imagenes, exist_ok=True)
                
                # Descargar imagen de perfil
                response = requests.get(profile.profile_pic_url, timeout=30)
                if response.status_code == 200:
                    # Generar nombre de archivo único
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    extension = os.path.splitext(urlparse(profile.profile_pic_url).path)[1] or '.jpg'
                    nombre_imagen = f'profile_{username}_{timestamp}{extension}'
                    ruta_imagen = os.path.join(directorio_imagenes, nombre_imagen)
                    
                    # Guardar imagen
                    with open(ruta_imagen, 'wb') as f:
                        f.write(response.content)
                    
                    datos_perfil['imagen_perfil_descargada'] = True
                    datos_perfil['ruta_imagen_perfil'] = ruta_imagen
                    datos_perfil['tamanio_imagen_perfil'] = len(response.content)
                    
                    print(f"✅ Imagen de perfil descargada: {ruta_imagen}")
                else:
                    print(f"⚠️ No se pudo descargar imagen de perfil: HTTP {response.status_code}")
        except Exception as e:
            print(f"⚠️ Error al descargar imagen de perfil: {str(e)}")
            datos_perfil['error_imagen_perfil'] = str(e)
        
        # Extraer posts recientes
        posts_extraidos = 0
        try:
            for post in profile.get_posts():
                if posts_extraidos >= max_posts:
                    break
                    
                post_data = {
                    'shortcode': post.shortcode,
                    'date': post.date.isoformat() if post.date else None,
                    'caption': post.caption,
                    'likes': post.likes,
                    'comments': post.comments,
                    'is_video': post.is_video,
                    'video_view_count': post.video_view_count if post.is_video else None,
                    'url': f"https://www.instagram.com/p/{post.shortcode}/",
                    'media_url': post.url,
                    'thumbnail_url': post.url if not post.is_video else None,
                    'video_url': post.video_url if post.is_video else None,
                    'location': {
                        'name': post.location.name if post.location else None,
                        'id': post.location.id if post.location else None
                    } if post.location else None,
                    'tagged_users': [user.username for user in post.tagged_users] if post.tagged_users else [],
                    'hashtags': post.caption_hashtags if post.caption_hashtags else [],
                    'mentions': post.caption_mentions if post.caption_mentions else []
                }
                
                # Agregar comentarios si se solicitan
                if incluir_comentarios and post.comments > 0:
                    try:
                        comentarios = []
                        for comment in post.get_comments():
                            comentarios.append({
                                'id': comment.id,
                                'text': comment.text,
                                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                                'owner': {
                                    'username': comment.owner.username,
                                    'userid': comment.owner.userid,
                                    'is_verified': comment.owner.is_verified
                                },
                                'likes_count': comment.likes_count
                            })
                        post_data['comentarios_detallados'] = comentarios
                    except Exception as e:
                        post_data['error_comentarios'] = str(e)
                
                datos_perfil['posts'].append(post_data)
                posts_extraidos += 1
        except Exception as e:
            print(f"⚠️ Error al extraer posts: {str(e)}")
            datos_perfil['error_posts'] = str(e)
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'instagram_profile_{username}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_perfil, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_perfil,
            'mensaje': f'Perfil de {username} extraído exitosamente con imagen de perfil'
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer perfil: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python instagram_profile_scraper.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_perfil_instagram(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
