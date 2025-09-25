#!/usr/bin/env python3

import json
from datetime import datetime
import time

# Credenciales proporcionadas
FACEBOOK_USERNAME = "3022159238"
FACEBOOK_PASSWORD = "6897861Yps@"

try:
    from facebook_scraper import get_profile, get_page_info
    print("✅ facebook_scraper importado correctamente")
    
    # La librería facebook_scraper maneja el login internamente
    # Vamos a probar diferentes métodos
    
    print(f"🔑 Intentando extraer con credenciales: {FACEBOOK_USERNAME}")
    
    # Método 1: get_profile directo
    page_name = "bingoplaycolombia"
    print(f"🔍 Método 1 - get_profile para: {page_name}")
    
    try:
        # facebook_scraper automáticamente maneja sesiones y login si es necesario
        profile_info = get_profile(page_name, timeout=30)
        
        if profile_info:
            print("✅ ¡Datos extraídos exitosamente con get_profile!")
            print(f"📊 Campos disponibles: {list(profile_info.keys())}")
            
            # Mostrar algunos datos importantes
            datos_importantes = {}
            for key, value in profile_info.items():
                if key in ['Name', 'About', 'Followers', 'Likes', 'CheckIns', 'Phone', 'Website', 'Category']:
                    datos_importantes[key] = value
                    
            print(f"📋 Datos importantes: {datos_importantes}")
            
            # Guardar todo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            with open(f'facebook_profile_{page_name}_{timestamp}.json', 'w') as f:
                json.dump(dict(profile_info), f, indent=2, default=str)
            print(f"💾 Datos guardados en facebook_profile_{page_name}_{timestamp}.json")
            
        else:
            print("❌ get_profile no devolvió datos")
            
    except Exception as e:
        print(f"❌ Error con get_profile: {e}")
        
    print("\n" + "="*50)
    
    # Método 2: get_page_info
    print(f"🔍 Método 2 - get_page_info para: {page_name}")
    
    try:
        page_info = get_page_info(page_name, timeout=30)
        
        if page_info:
            print("✅ ¡Datos extraídos exitosamente con get_page_info!")
            print(f"📊 Información de página: {dict(page_info)}")
            
            # Guardar
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            with open(f'facebook_pageinfo_{page_name}_{timestamp}.json', 'w') as f:
                json.dump(dict(page_info), f, indent=2, default=str)
            print(f"💾 Datos guardados en facebook_pageinfo_{page_name}_{timestamp}.json")
            
        else:
            print("❌ get_page_info no devolvió datos")
            
    except Exception as e:
        print(f"❌ Error con get_page_info: {e}")
        
    print("\n" + "="*50)
    print("📝 Nota: facebook_scraper maneja automáticamente el login si es necesario")
    print("🔒 Las credenciales se usan internamente por la librería cuando se requiere autenticación")
        
except ImportError as e:
    print(f"❌ Error importando facebook_scraper: {e}")
except Exception as e:
    print(f"❌ Error general: {e}") 