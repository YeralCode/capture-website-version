#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime
from facebook_scraper import get_profile

def extraer_perfil_facebook(parametros):
    """
    Extrae información de un perfil de Facebook usando facebook-scraper
    """
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        profile_name = params.get('profileName', '')
        directorio = params.get('directorio', 'scraped_data')
        
        if not profile_name:
            raise ValueError("Nombre de perfil es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        # Obtener información del perfil
        try:
            profile_info = get_profile(profile_name)
            datos_perfil = {
                'profile_name': profile_name,
                'profile_info': profile_info,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'exito': False,
                'error': str(e),
                'mensaje': f'Error al extraer perfil: {str(e)}'
            }
        
        # Guardar datos en archivo JSON
        archivo_salida = os.path.join(directorio, f'facebook_profile_{profile_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_perfil, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_perfil,
            'mensaje': f'Perfil {profile_name} extraído exitosamente'
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
            'mensaje': 'Uso: python facebook_profile_scraper.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_perfil_facebook(parametros)
    print(json.dumps(resultado, ensure_ascii=False))
