#!/usr/bin/env python3
"""
Facebook Scraper Directo usando facebook_scraper
Sin navegadores automatizados, más rápido y estable
"""
import sys
import json
import os
from datetime import datetime
import time

# Credenciales
FACEBOOK_USERNAME = "3022159238"
FACEBOOK_PASSWORD = "6897861Yps@"

def extraer_facebook_directo(parametros):
    """
    Extrae información de Facebook usando facebook_scraper directamente
    """
    try:
        from facebook_scraper import get_profile, get_page_info, set_cookies
        print("✅ facebook_scraper importado correctamente")
    except ImportError:
        return {
            'exito': False,
            'error': 'facebook_scraper no está disponible',
            'mensaje': 'facebook_scraper no está instalado'
        }
    
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        page_name = params.get('pageName', '')
        directorio = params.get('directorio', 'scraped_data')
        
        if not page_name:
            raise ValueError("Nombre de página es requerido")
        
        # Crear directorio
        os.makedirs(directorio, exist_ok=True)
        
        print(f"🔍 Extrayendo información de: {page_name}")
        
        datos_extraidos = {
            'page_name': page_name,
            'url': f'https://www.facebook.com/{page_name}',
            'titulo': '',
            'descripcion': '',
            'seguidores': 'N/A',
            'me_gusta': 'N/A',
            'posts_recientes': [],
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': 'facebook_scraper_directo',
            'pagina_existe': True,
            'requiere_login': False,
            'contenido_extraido': False,
            'autenticacion_usada': False
        }
        
        # Configurar cookies básicas si están disponibles
        try:
            # Usar cookies básicas para mejor acceso
            cookies_basicas = {
                'locale': 'es_ES',
                'datr': 'ejemplo123',  # Cookie básica para evitar algunos filtros
            }
            set_cookies(cookies_basicas)
            print("🍪 Cookies básicas configuradas")
        except:
            print("⚠️ No se pudieron configurar cookies")
        
        resultados_obtenidos = False
        
        # Método 1: get_profile
        try:
            print(f"📋 Método 1: Extrayendo perfil con get_profile...")
            profile_info = get_profile(page_name, timeout=30)
            
            if profile_info and hasattr(profile_info, '__dict__'):
                profile_dict = dict(profile_info)
                print(f"✅ get_profile exitoso - Campos: {list(profile_dict.keys())}")
                
                # Extraer información útil
                datos_extraidos['titulo'] = profile_dict.get('Name', profile_dict.get('name', ''))
                datos_extraidos['descripcion'] = profile_dict.get('About', profile_dict.get('about', ''))
                
                # Intentar extraer estadísticas
                if 'Followers' in profile_dict:
                    datos_extraidos['seguidores'] = str(profile_dict['Followers'])
                elif 'followers' in profile_dict:
                    datos_extraidos['seguidores'] = str(profile_dict['followers'])
                
                if 'Likes' in profile_dict:
                    datos_extraidos['me_gusta'] = str(profile_dict['Likes'])
                elif 'likes' in profile_dict:
                    datos_extraidos['me_gusta'] = str(profile_dict['likes'])
                
                # Verificar si obtuvimos información útil
                if (datos_extraidos['titulo'] or 
                    datos_extraidos['descripcion'] or 
                    datos_extraidos['seguidores'] != 'N/A' or 
                    datos_extraidos['me_gusta'] != 'N/A'):
                    
                    datos_extraidos['contenido_extraido'] = True
                    resultados_obtenidos = True
                    print("📊 Información útil extraída con get_profile")
                
                # Guardar datos raw para debug
                datos_extraidos['datos_raw_profile'] = profile_dict
                
            else:
                print("⚠️ get_profile no devolvió datos válidos")
                
        except Exception as e:
            print(f"⚠️ Error con get_profile: {str(e)}")
        
        # Método 2: get_page_info (si get_profile no funcionó bien)
        if not resultados_obtenidos:
            try:
                print(f"📄 Método 2: Extrayendo información con get_page_info...")
                page_info = get_page_info(page_name, timeout=30)
                
                if page_info and hasattr(page_info, '__dict__'):
                    page_dict = dict(page_info)
                    print(f"✅ get_page_info exitoso - Campos: {list(page_dict.keys())}")
                    
                    # Extraer información de page_info
                    if not datos_extraidos['titulo']:
                        datos_extraidos['titulo'] = page_dict.get('name', page_dict.get('Name', ''))
                    
                    if not datos_extraidos['descripcion']:
                        datos_extraidos['descripcion'] = page_dict.get('about', page_dict.get('About', ''))
                    
                    # Buscar estadísticas en page_info
                    for key, value in page_dict.items():
                        if 'follow' in key.lower() and datos_extraidos['seguidores'] == 'N/A':
                            datos_extraidos['seguidores'] = str(value)
                        elif 'like' in key.lower() and datos_extraidos['me_gusta'] == 'N/A':
                            datos_extraidos['me_gusta'] = str(value)
                    
                    if (datos_extraidos['titulo'] or 
                        datos_extraidos['descripcion'] or 
                        datos_extraidos['seguidores'] != 'N/A' or 
                        datos_extraidos['me_gusta'] != 'N/A'):
                        
                        datos_extraidos['contenido_extraido'] = True
                        resultados_obtenidos = True
                        print("📊 Información útil extraída con get_page_info")
                    
                    # Guardar datos raw para debug
                    datos_extraidos['datos_raw_pageinfo'] = page_dict
                    
                else:
                    print("⚠️ get_page_info no devolvió datos válidos")
                    
            except Exception as e:
                print(f"⚠️ Error con get_page_info: {str(e)}")
        
        # Evaluar resultados finales
        if resultados_obtenidos:
            print("🎉 Extracción exitosa con facebook_scraper")
            datos_extraidos['estado_autenticacion'] = 'no_requerida'
            datos_extraidos['necesita_login_activo'] = False
        else:
            print("⚠️ No se pudo extraer información útil")
            datos_extraidos['requiere_login'] = True
            datos_extraidos['necesita_login_activo'] = True
            datos_extraidos['mensaje_usuario'] = "No se pudo acceder al contenido sin autenticación"
        
        # Guardar resultados
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{timestamp}_directo.json')
        
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_extraidos, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_extraidos,
            'mensaje': f'Página {page_name} extraída con facebook_scraper directo'
        }
        
    except Exception as e:
        print(f"❌ Error crítico: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

def main():
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_scraper_directo.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_facebook_directo(parametros)
    print(json.dumps(resultado, ensure_ascii=False))

if __name__ == "__main__":
    main() 