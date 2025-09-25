#!/usr/bin/env python3
import sys
import json
import os
import instaloader
from datetime import datetime

def extraer_post_instagram(parametros):
    """
    Extrae información de un post específico de Instagram usando instaloader
    """
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        shortcode = params.get('shortcode', '')
        directorio = params.get('directorio', 'scraped_data')
        incluir_comentarios = params.get('incluirComentarios', False)
        
        if not shortcode:
            raise ValueError("Shortcode es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        # Inicializar instaloader
        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=incluir_comentarios,
            save_metadata=True,
            compress_json=False
        )
        
        # Obtener post
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
        
        # Extraer información del post
        datos_post = {
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
            'owner': {
                'username': post.owner_username,
                'userid': post.owner_id,
                'is_verified': post.owner_profile.is_verified if post.owner_profile else False,
                'is_private': post.owner_profile.is_private if post.owner_profile else False
            },
            'location': {
                'name': post.location.name if post.location else None,
                'id': post.location.id if post.location else None
            } if post.location else None,
            'tagged_users': [user.username for user in post.tagged_users] if post.tagged_users else [],
            'hashtags': post.caption_hashtags if post.caption_hashtags else [],
            'mentions': post.caption_mentions if post.caption_mentions else [],
            'is_sponsored': post.is_sponsored,
            'sponsor_users': [user.username for user in post.sponsor_users] if post.sponsor_users else []
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
                datos_post['comentarios_detallados'] = comentarios
            except Exception as e:
                datos_post['error_comentarios'] = str(e)
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'instagram_post_{shortcode}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_post, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_post,
            'mensaje': f'Post {shortcode} extraído exitosamente'
        }
        
    except Exception as e:
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer post: {str(e)}'
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python instagram_post_scraper.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_post_instagram(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
