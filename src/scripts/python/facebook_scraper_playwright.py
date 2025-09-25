#!/usr/bin/env python3
"""
Facebook Scraper usando Playwright para simular navegador real
Usa las credenciales proporcionadas para hacer login automático
"""
import sys
import json
import asyncio
from datetime import datetime
import os

# Credenciales de Facebook
FACEBOOK_USERNAME = "3022159238"
FACEBOOK_PASSWORD = "6897861Yps@"

async def extraer_facebook_playwright(parametros):
    """
    Extrae información de Facebook usando Playwright (navegador real)
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {
            'exito': False,
            'error': 'Playwright no está instalado',
            'mensaje': 'Instala playwright con: pip install playwright && playwright install'
        }
    
    try:
        # Parsear parámetros
        params = json.loads(parametros)
        page_name = params.get('pageName', '')
        directorio = params.get('directorio', 'scraped_data')
        usar_login = params.get('usarLogin', True)
        
        if not page_name:
            raise ValueError("Nombre de página es requerido")
        
        # Crear directorio de salida
        os.makedirs(directorio, exist_ok=True)
        
        async with async_playwright() as p:
            # Lanzar navegador con configuración stealth
            browser = await p.firefox.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage'
                ]
            )
            
            # Crear contexto con configuración realista
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
                locale='es-ES',
                timezone_id='America/Bogota',
                extra_http_headers={
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1'
                }
            )
            
            # Crear página
            page = await context.new_page()
            
            # Configurar interceptores para parecer más humano
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['es-ES', 'es', 'en-US', 'en'],
                });
                
                window.chrome = {
                    runtime: {},
                };
            """)
            
            datos_extraidos = {
                'page_name': page_name,
                'url': f'https://www.facebook.com/{page_name}',
                'titulo': '',
                'descripcion': '',
                'seguidores': 'N/A',
                'me_gusta': 'N/A',
                'posts_recientes': [],
                'fecha_extraccion': datetime.now().isoformat(),
                'metodo': 'playwright_real_browser',
                'login_usado': False,
                'pagina_existe': True,
                'requiere_login': False,
                'codigo_respuesta': 200,
                'url_accedida': '',
                'contenido_extraido': False
            }
            
            if usar_login:
                print("🔐 Realizando login con Playwright...")
                login_exitoso = await realizar_login_playwright(page)
                datos_extraidos['login_usado'] = login_exitoso
                
                if login_exitoso:
                    print("✅ Login exitoso, accediendo a página con sesión autenticada")
                else:
                    print("⚠️ Login falló, intentando acceso sin autenticación")
            
            # Acceder a la página objetivo
            target_url = f'https://www.facebook.com/{page_name}'
            print(f"🌐 Navegando a: {target_url}")
            
            try:
                response = await page.goto(target_url, wait_until='domcontentloaded', timeout=30000)
                datos_extraidos['codigo_respuesta'] = response.status
                datos_extraidos['url_accedida'] = page.url
                
                # Esperar a que la página cargue
                await page.wait_for_timeout(3000)
                
                # Extraer título
                titulo_element = await page.query_selector('title')
                if titulo_element:
                    titulo = await titulo_element.inner_text()
                    datos_extraidos['titulo'] = titulo.strip()
                
                # Verificar si pide login
                login_required = await page.query_selector('input[name="email"], input[name="pass"], [data-testid="login-button"]')
                if login_required:
                    datos_extraidos['requiere_login'] = True
                    print("⚠️ La página requiere login")
                else:
                    print("✅ Página accesible, extrayendo datos...")
                    
                    # Extraer metadatos Open Graph
                    og_title = await page.query_selector('meta[property="og:title"]')
                    if og_title:
                        og_title_content = await og_title.get_attribute('content')
                        if og_title_content:
                            datos_extraidos['titulo'] = og_title_content
                    
                    og_description = await page.query_selector('meta[property="og:description"]')
                    if og_description:
                        og_desc_content = await og_description.get_attribute('content')
                        if og_desc_content:
                            datos_extraidos['descripcion'] = og_desc_content
                    
                    # Intentar extraer información específica de Facebook
                    try:
                        # Buscar números que podrían ser estadísticas
                        page_content = await page.content()
                        
                        # Buscar patrones de seguidores/likes
                        import re
                        numbers = re.findall(r'([\d,\.]+)\s*(followers?|seguidores?|likes?|me gusta|personas|following)', page_content, re.IGNORECASE)
                        
                        for number, type_match in numbers:
                            if 'follow' in type_match.lower() or 'seguidor' in type_match.lower():
                                datos_extraidos['seguidores'] = number
                            elif 'like' in type_match.lower() or 'gusta' in type_match.lower():
                                datos_extraidos['me_gusta'] = number
                        
                        if datos_extraidos['seguidores'] != 'N/A' or datos_extraidos['me_gusta'] != 'N/A':
                            datos_extraidos['contenido_extraido'] = True
                    except Exception as e:
                        print(f"⚠️ Error extrayendo estadísticas: {str(e)}")
                
            except Exception as e:
                print(f"❌ Error navegando a la página: {str(e)}")
                datos_extraidos['codigo_respuesta'] = 0
                datos_extraidos['error_navegacion'] = str(e)
            
            # Cerrar navegador
            await browser.close()
            
            # Guardar resultados
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            sufijo = "login" if datos_extraidos['login_usado'] else "noauth"
            archivo_salida = os.path.join(directorio, f'facebook_page_{page_name}_{timestamp}_{sufijo}_playwright.json')
            
            with open(archivo_salida, 'w', encoding='utf-8') as f:
                json.dump(datos_extraidos, f, ensure_ascii=False, indent=2)
            
            return {
                'exito': True,
                'archivo': archivo_salida,
                'datos': datos_extraidos,
                'mensaje': f'Página {page_name} extraída con Playwright - Login: {datos_extraidos["login_usado"]}'
            }
            
    except Exception as e:
        print(f"❌ Error crítico: {str(e)}")
        return {
            'exito': False,
            'error': str(e),
            'mensaje': f'Error al extraer página: {str(e)}'
        }

async def realizar_login_playwright(page):
    """
    Realiza login en Facebook usando Playwright (navegador real)
    """
    try:
        print("🔐 Navegando a página de login...")
        await page.goto('https://www.facebook.com/login', wait_until='domcontentloaded')
        
        # Esperar a que aparezcan los campos de login
        await page.wait_for_selector('input[name="email"]', timeout=10000)
        
        print("📝 Rellenando credenciales...")
        
        # Escribir email de manera humana
        await page.type('input[name="email"]', FACEBOOK_USERNAME, delay=100)
        await page.wait_for_timeout(500)
        
        # Escribir contraseña de manera humana
        await page.type('input[name="pass"]', FACEBOOK_PASSWORD, delay=100)
        await page.wait_for_timeout(500)
        
        print("🚪 Enviando login...")
        
        # Hacer click en el botón de login
        await page.click('button[name="login"], input[type="submit"]')
        
        # Esperar respuesta
        await page.wait_for_timeout(5000)
        
        # Verificar si el login fue exitoso
        current_url = page.url
        
        if any(indicator in current_url for indicator in ['home.php', 'feed', 'profile']):
            print("✅ Login exitoso detectado")
            return True
        elif 'login' in current_url or 'checkpoint' in current_url:
            print("❌ Login falló o requiere verificación")
            return False
        else:
            print("🔄 Estado de login incierto")
            return False
            
    except Exception as e:
        print(f"❌ Error durante login: {str(e)}")
        return False

def main():
    if len(sys.argv) != 2:
        print(json.dumps({
            'exito': False,
            'error': 'Parámetros incorrectos',
            'mensaje': 'Uso: python facebook_scraper_playwright.py <parametros_json>'
        }))
        sys.exit(1)
    
    parametros = sys.argv[1]
    resultado = asyncio.run(extraer_facebook_playwright(parametros))
    print(json.dumps(resultado, ensure_ascii=False))

if __name__ == "__main__":
    main() 