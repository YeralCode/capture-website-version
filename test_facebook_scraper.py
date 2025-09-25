#!/usr/bin/env python3

import json
from datetime import datetime

try:
    from facebook_scraper import get_profile, set_cookies
    print("✅ facebook_scraper importado correctamente")
    
    # Configurar cookies de sesión
    cookies = {
        'c_user': '3022159238',  # Tu ID de usuario
        'datr': 'JHeCaG00p9N56HgVUJbJLed6',
        'sb': 'JXeCaO_7P8fB0RseTcdvirLy'
    }
    
    set_cookies(cookies)
    print("🍪 Cookies configuradas")
    
    # Probar con bingoplaycolombia
    page_name = "bingoplaycolombia"
    print(f"🔍 Intentando extraer: {page_name}")
    
    try:
        profile_info = get_profile(page_name, timeout=30)
        
        if profile_info:
            print("✅ ¡Datos extraídos exitosamente!")
            print(f"📊 Información obtenida: {dict(profile_info)}")
            
            # Guardar en archivo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            with open(f'test_facebook_{page_name}_{timestamp}.json', 'w') as f:
                json.dump(dict(profile_info), f, indent=2, default=str)
            print(f"💾 Datos guardados en test_facebook_{page_name}_{timestamp}.json")
        else:
            print("❌ No se obtuvieron datos")
            
    except Exception as e:
        print(f"❌ Error al extraer perfil: {e}")
        
except ImportError as e:
    print(f"❌ Error importando facebook_scraper: {e}")
except Exception as e:
    print(f"❌ Error general: {e}") 