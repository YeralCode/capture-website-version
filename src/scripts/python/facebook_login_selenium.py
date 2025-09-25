#!/usr/bin/env python3
"""
Facebook Scraper con Login Real usando Selenium
Hace login con credenciales reales y extrae información
"""
import sys
import json
import time
from datetime import datetime
import os
import re

# Credenciales
FACEBOOK_USERNAME = "3022159238"
FACEBOOK_PASSWORD = "6897861Yps@"

def extraer_facebook_selenium(parametros):
    """
    Extrae información de Facebook usando Selenium con login real
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.chrome.options import Options
        from selenium.common.exceptions import TimeoutException, NoSuchElementException
    except ImportError:
        return {
            'exito': False,
            'error': 'Selenium no está disponible',
            'mensaje': 'Instala selenium con: pip install selenium'
        }
    
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        page_name = params.get('pageName', '')
        directorio = params.get('directorio', 'scraped_data')
        usar_login = params.get('usarLogin', True)
        
        if not page_name:
            raise ValueError("Nombre de página es requerido")
        
        # Crear directorio
        os.makedirs(directorio, exist_ok=True)
        
        # Configurar Firefox para ser más stealth
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
        
        firefox_options = FirefoxOptions()
        firefox_options.add_argument('--no-sandbox')
        firefox_options.add_argument('--disable-dev-shm-usage')
        firefox_options.set_preference("dom.webdriver.enabled", False)
        firefox_options.set_preference('useAutomationExtension', False)
        firefox_options.set_preference("general.useragent.override", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0")
        
        # Inicializar driver con webdriver-manager
        print("🚀 Iniciando navegador Firefox...")
        try:
            from webdriver_manager.firefox import GeckoDriverManager
            from selenium.webdriver.firefox.service import Service
            
            service = Service(GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=firefox_options)
        except ImportError:
            print("⚠️ webdriver-manager no disponible, intentando driver por defecto...")
            driver = webdriver.Firefox(options=firefox_options)
        
        # Configurar script para ocultar webdriver
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        wait = WebDriverWait(driver, 20)
        
        datos_extraidos = {
            'page_name': page_name,
            'url': f'https://www.facebook.com/{page_name}',
            'titulo': '',
            'descripcion': '',
            'seguidores': 'N/A',
            'me_gusta': 'N/A',
            'posts_recientes': [],
            'fecha_extraccion': datetime.now().isoformat(),
            'metodo': 'selenium_real_login',
            'login_exitoso': False,
            'pagina_existe': True,
            'requiere_login': False,
            'contenido_extraido': False
        }
        
        try:
            if usar_login:
                print("🔐 Realizando login con credenciales...")
                login_exitoso = realizar_login_selenium(driver, wait)
                datos_extraidos['login_exitoso'] = login_exitoso
                
                if login_exitoso:
                    print("✅ Login exitoso!")
                else:
                    print("⚠️ Login falló, intentando acceso sin autenticación")
            
            # Navegar a la página objetivo
            target_url = f'https://www.facebook.com/{page_name}'
            print(f"🌐 Navegando a: {target_url}")
            
            driver.get(target_url)
            time.sleep(5)  # Esperar carga
            
            # Extraer título
            try:
                titulo = driver.title
                datos_extraidos['titulo'] = titulo
                print(f"📄 Título: {titulo}")
            except:
                pass
            
            # Verificar si requiere login
            login_elements = driver.find_elements(By.CSS_SELECTOR, 'input[name="email"], input[name="pass"], [data-testid="login-button"]')
            if login_elements:
                datos_extraidos['requiere_login'] = True
                print("⚠️ La página requiere login")
            else:
                print("✅ Página accesible, extrayendo datos...")
                
                # Extraer información específica
                try:
                    # Buscar metadatos
                    og_title = driver.find_elements(By.CSS_SELECTOR, 'meta[property="og:title"]')
                    if og_title:
                        datos_extraidos['titulo'] = og_title[0].get_attribute('content')
                    
                    og_description = driver.find_elements(By.CSS_SELECTOR, 'meta[property="og:description"]')
                    if og_description:
                        datos_extraidos['descripcion'] = og_description[0].get_attribute('content')
                    
                    # Buscar estadísticas en el HTML
                    page_source = driver.page_source
                    
                    # Buscar números que podrían ser seguidores/likes
                    numbers = re.findall(r'([\d,\.]+)\s*(followers?|seguidores?|likes?|me gusta|personas|following)', page_source, re.IGNORECASE)
                    
                    for number, type_match in numbers:
                        if 'follow' in type_match.lower() or 'seguidor' in type_match.lower():
                            datos_extraidos['seguidores'] = number
                        elif 'like' in type_match.lower() or 'gusta' in type_match.lower():
                            datos_extraidos['me_gusta'] = number
                    
                    # Buscar elementos específicos de Facebook
                    try:
                        # Intentar encontrar información específica de la página
                        page_elements = driver.find_elements(By.CSS_SELECTOR, '[data-testid*="page"], [data-testid*="profile"], h1, h2')
                        for element in page_elements[:5]:  # Solo los primeros 5 para no sobrecargar
                            text = element.text.strip()
                            if text and len(text) > 5:
                                if not datos_extraidos['titulo'] or len(text) > len(datos_extraidos['titulo']):
                                    datos_extraidos['titulo'] = text
                                break
                    except:
                        pass
                    
                    if datos_extraidos['seguidores'] != 'N/A' or datos_extraidos['me_gusta'] != 'N/A' or datos_extraidos['descripcion']:
                        datos_extraidos['contenido_extraido'] = True
                        
                except Exception as e:
                    print(f"⚠️ Error extrayendo datos específicos: {e}")
        
        except Exception as e:
            print(f"❌ Error durante navegación: {e}")
            datos_extraidos['error_navegacion'] = str(e)
        
        finally:
            # Cerrar navegador
            driver.quit()
        
        # Guardar resultados
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        sufijo = "login" if datos_extraidos['login_exitoso'] else "noauth"
        archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{timestamp}_{sufijo}_selenium.json')
        
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos_extraidos, f, ensure_ascii=False, indent=2)
        
        return {
            'exito': True,
            'archivo': archivo_salida,
            'datos': datos_extraidos,
            'mensaje': f'Página {page_name} extraída con Selenium - Login: {datos_extraidos["login_exitoso"]}'
        }
        
    except Exception as e:
        print(f"❌ Error crítico: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

def realizar_login_selenium(driver, wait):
    """
    Realiza login en Facebook usando Selenium con credenciales reales
    """
    try:
        print("🔐 Navegando a página de login...")
        driver.get('https://www.facebook.com/login')
        
        # Esperar campos de login
        email_field = wait.until(EC.presence_of_element_located((By.NAME, 'email')))
        password_field = driver.find_element(By.NAME, 'pass')
        
        print("📝 Ingresando credenciales...")
        
        # Escribir de manera humana
        email_field.clear()
        for char in FACEBOOK_USERNAME:
            email_field.send_keys(char)
            time.sleep(0.1)
        
        time.sleep(0.5)
        
        password_field.clear()
        for char in FACEBOOK_PASSWORD:
            password_field.send_keys(char)
            time.sleep(0.1)
        
        print("🚪 Enviando login...")
        
        # Buscar botón de login
        login_button = driver.find_element(By.CSS_SELECTOR, 'button[name="login"], input[type="submit"][value*="Log"], button[data-testid="royal_login_button"]')
        login_button.click()
        
        # Esperar respuesta
        time.sleep(5)
        
        # Verificar si el login fue exitoso
        current_url = driver.current_url
        
        if any(indicator in current_url for indicator in ['home.php', 'feed', '/?sk=h_chr', 'facebook.com/?']):
            print("✅ Login exitoso detectado")
            return True
        elif 'login' in current_url or 'checkpoint' in current_url:
            print("❌ Login falló o requiere verificación")
            return False
        else:
            print("🔄 Estado de login incierto, asumiendo éxito")
            return True
            
    except Exception as e:
        print(f"❌ Error durante login: {str(e)}")
        return False

def main():
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_login_selenium.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = extraer_facebook_selenium(parametros)
    print(json.dumps(resultado, ensure_ascii=False))

if __name__ == "__main__":
    main() 