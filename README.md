# 🌐 Sistema Integrado de Captura y Scraping Web

Sistema automatizado para capturar screenshots y extraer datos de sitios web, incluyendo Facebook e Instagram, con generación automática de reportes en PDF y Word.

---

## 📋 Tabla de Contenidos

- [Requisitos Previos](#-requisitos-previos)
- [Instalación Paso a Paso en Windows](#-instalación-paso-a-paso-en-windows)
- [Configuración](#-configuración)
- [Ejecución del Proyecto](#-ejecución-del-proyecto)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Solución de Problemas](#-solución-de-problemas)

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** (versión 18 o superior)
2. **Python** (versión 3.10 o superior)
3. **Git** (opcional, para clonar el repositorio)

---

## 🪟 Instalación Paso a Paso en Windows

### **Paso 1: Instalar Node.js**

1. Descarga Node.js desde: https://nodejs.org/
2. Descarga la versión **LTS** (Long Term Support)
3. Ejecuta el instalador y sigue las instrucciones
4. **Importante:** Marca la opción "Add to PATH" durante la instalación

**Verificar instalación:**
```bash
node --version
npm --version
```

Deberías ver algo como:
```
v18.17.0
9.6.7
```

---

### **Paso 2: Instalar Python**

1. Descarga Python desde: https://www.python.org/downloads/
2. Descarga la versión **3.10 o superior**
3. Ejecuta el instalador
4. **MUY IMPORTANTE:** ✅ Marca la casilla "Add Python to PATH"
5. Haz clic en "Install Now"

**Verificar instalación:**
```bash
python --version
pip --version
```

Deberías ver algo como:
```
Python 3.10.11
pip 23.2.1
```

---

### **Paso 3: Descargar el Proyecto**

**Opción A - Con Git:**
```bash
git clone <url-del-repositorio>
cd capture-website-version
```

**Opción B - Sin Git:**
1. Descarga el proyecto como ZIP
2. Extrae el archivo ZIP
3. Abre el CMD o PowerShell
4. Navega a la carpeta del proyecto:
```bash
cd ruta\donde\extraiste\capture-website-version
```

---

### **Paso 4: Instalar Dependencias de Node.js**

Dentro de la carpeta del proyecto, ejecuta:

```bash
npm install
```

Este proceso puede tardar **5-10 minutos** la primera vez. Instalará:
- Playwright (navegador automatizado)
- Librerías de generación de PDF
- Librerías de procesamiento de imágenes
- Y más de 200 paquetes necesarios

**Espera el mensaje:**
```
✓ Packages installed successfully
```

---

### **Paso 5: Instalar Navegadores de Playwright**

Playwright necesita descargar navegadores especiales. Ejecuta:

```bash
npx playwright install chromium
```

Este comando descargará **~300 MB** de archivos.

**Espera el mensaje:**
```
✓ Chromium downloaded successfully
```

---

### **Paso 6: Crear Entorno Virtual de Python**

El proyecto usa scripts de Python para scraping. Crea un entorno virtual:

```bash
python -m venv venv_scraping
```

**Activar el entorno virtual:**

En **CMD**:
```bash
venv_scraping\Scripts\activate
```

En **PowerShell**:
```bash
venv_scraping\Scripts\Activate.ps1
```

**Nota:** Si PowerShell da error de permisos, ejecuta:
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Deberías ver** `(venv_scraping)` al inicio de tu línea de comando.

---

### **Paso 7: Instalar Dependencias de Python**

Con el entorno virtual **activado**, instala las librerías necesarias:

```bash
pip install instaloader requests beautifulsoup4 facebook-scraper
```

**Espera el mensaje:**
```
Successfully installed...
```

**Desactivar el entorno virtual** (por ahora):
```bash
deactivate
```

---

## ⚙️ Configuración

### **Paso 8: Configurar Credenciales**

El sistema necesita credenciales para acceder a Facebook e Instagram.

**Edita el archivo:** `src/services/screenshotService.js`

Busca las líneas **13-24** y actualiza con tus credenciales:

```javascript
const FACEBOOK_CREDENTIALS = {
  username: "TU_USUARIO_FACEBOOK",  // Puede ser email o teléfono
  password: "TU_CONTRASEÑA_FACEBOOK"
};

const INSTAGRAM_CREDENTIALS = {
  username: "TU_USUARIO_INSTAGRAM",  // Email o nombre de usuario
  password: "TU_CONTRASEÑA_INSTAGRAM"
};
```

**⚠️ IMPORTANTE:** 
- Usa credenciales de cuentas de prueba, NO tu cuenta personal
- Guarda este archivo de forma segura
- NO subas las credenciales a repositorios públicos

---

### **Paso 9: Preparar Archivos de URLs**

El sistema procesa URLs desde archivos de texto. Ya existen ejemplos:

**Archivos disponibles:**
- `1203_SITIOS_WEB_11_2024.txt` - Sitios web normales (HTTP)
- `2415 sitios web_dic_2024.txt` - Más sitios web
- `289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt` - Perfiles de redes sociales

**Para usar tu propio archivo:**

1. Crea un archivo `.txt` en la raíz del proyecto
2. Agrega una URL por línea:
   ```
   https://www.ejemplo.com
   https://www.facebook.com/pagina-ejemplo
   https://www.instagram.com/usuario-ejemplo
   ```

3. Edita `src/index_integrated.js` en la **línea 203**:
   ```javascript
   const archivosUrls = [
     { archivo: 'TU_ARCHIVO.txt', protocolo: 'https' }
   ];
   ```

---

## 🚀 Ejecución del Proyecto

### **Paso 10: Ejecutar el Sistema**

**Abre una terminal** (CMD o PowerShell) en la carpeta del proyecto y ejecuta:

```bash
node src/index_integrated.js
```

### **Qué Esperar:**

El sistema hará lo siguiente automáticamente:

1. **🔐 Autenticación (2-3 minutos)**
   - Iniciará sesión en Facebook
   - Iniciará sesión en Instagram
   - **Se abrirá un navegador visible** - NO lo cierres
   - Esperará 60 segundos para verificación manual si es necesario

2. **📸 Captura de Screenshots (variable)**
   - Procesará cada URL
   - Tomará screenshots con la barra del navegador visible
   - Guardará en la carpeta `screenshots/`
   - Progreso: `[X/TOTAL] Procesando: url...`

3. **📊 Generación de Reportes (1-2 minutos)**
   - Creará un PDF con todas las capturas
   - Creará un Word (.docx) con todas las capturas
   - Guardará en la carpeta `output/`

### **Resultados:**

Al finalizar, encontrarás:

```
✅ PDF generado: output/reporte-integrado-2025-XX-XX.pdf
✅ Word generado: output/reporte-integrado-2025-XX-XX.docx
```

**Tiempo estimado:**
- 10 URLs: ~5 minutos
- 50 URLs: ~20 minutos
- 100 URLs: ~40 minutos
- 1000 URLs: ~6-8 horas

---

## 📁 Estructura del Proyecto

```
capture-website-version/
├── src/
│   ├── config/
│   │   └── configuracion.js          # Configuración general
│   ├── services/
│   │   ├── integratedScrapingService.js  # Servicio principal
│   │   ├── screenshotService.js      # Capturas de pantalla
│   │   ├── pdfGenerator.js           # Generación de PDF
│   │   └── wordGenerator.js          # Generación de Word
│   ├── utils/
│   │   └── urlLoader.js              # Carga de URLs
│   ├── scripts/
│   │   └── python/
│   │       ├── facebook_page_scraper_simple.py
│   │       └── instagram_profile_scraper_simple.py
│   └── index_integrated.js           # 🎯 Archivo principal
│
├── screenshots/                      # 📸 Capturas generadas
├── output/                           # 📄 PDFs y Word generados
├── scraped_data/                     # 📊 Datos extraídos
├── sesiones/                         # 🔐 Sesiones guardadas
├── venv_scraping/                    # 🐍 Entorno virtual Python
│
├── 1203_SITIOS_WEB_11_2024.txt      # 📝 URLs de ejemplo
├── package.json                      # Dependencias Node.js
└── README.md                         # 📖 Este archivo
```

---

## 🛠️ Solución de Problemas

### **Problema: "node no se reconoce como comando"**

**Solución:**
1. Reinstala Node.js marcando "Add to PATH"
2. O agrega manualmente Node.js al PATH de Windows:
   - Panel de Control → Sistema → Configuración avanzada del sistema
   - Variables de entorno → PATH
   - Agrega: `C:\Program Files\nodejs\`

---

### **Problema: "python no se reconoce como comando"**

**Solución:**
1. Reinstala Python marcando "Add Python to PATH"
2. O agrega manualmente Python al PATH:
   - Agrega: `C:\Users\TU_USUARIO\AppData\Local\Programs\Python\Python310\`

---

### **Problema: Error al activar venv en PowerShell**

**Solución:**
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### **Problema: "Cannot find module 'chalk'"**

**Solución:**
```bash
npm install
```

---

### **Problema: Error de login en Facebook/Instagram**

**Posibles causas:**
1. Credenciales incorrectas
2. Cuenta bloqueada por intentos de login
3. Verificación de dos factores activada

**Soluciones:**
1. Verifica las credenciales en `src/services/screenshotService.js`
2. Usa una cuenta de prueba sin 2FA
3. Durante los 60 segundos de espera, resuelve captchas manualmente

---

### **Problema: El navegador se cierra inmediatamente**

**Solución:**
- Esto es normal si hay un error
- Revisa la consola para ver el mensaje de error
- Verifica que las credenciales sean correctas

---

### **Problema: "ECONNREFUSED" o errores de red**

**Solución:**
1. Verifica tu conexión a Internet
2. Desactiva temporalmente firewall/antivirus
3. Algunas URLs pueden estar bloqueadas regionalmente

---

### **Problema: Proceso muy lento**

**Optimizaciones:**
1. Reduce el número de URLs en tu archivo de prueba
2. Aumenta la concurrencia en `src/config/configuracion.js`:
   ```javascript
   concurrencia: 3  // Procesa 3 URLs simultáneamente
   ```
3. Cierra otros programas que consuman recursos

---

## 📊 Características del Sistema

### **✅ Capturas de Pantalla**
- Navegador real visible (con barra de direcciones)
- Resolución: 1920x1080
- Formato: PNG
- Detecta páginas bloqueadas/no disponibles
- Maneja errores 404, timeouts, etc.

### **✅ Scraping de Datos**
- **Instagram:** Username, seguidores, biografía, posts
- **Facebook:** Nombre de página, descripción, posts
- Datos guardados en `scraped_data/`

### **✅ Reportes Generados**
- **PDF:** Con capturas y análisis de disponibilidad
- **Word:** Mismo contenido en formato editable
- Incluye resumen ejecutivo
- Tabla de resultados
- Información de conectividad

### **✅ Detección Inteligente**
- Páginas bloqueadas por Coljuegos (Colombia)
- Contenido privado vs bloqueado
- Páginas no encontradas (404)
- Sitios offline

---

## 🔐 Seguridad y Privacidad

1. **Credenciales:** Se almacenan localmente, NUNCA se envían a terceros
2. **Sesiones:** Se guardan en `sesiones/` para reutilización
3. **Datos:** Todos los datos se procesan localmente
4. **Cookies:** Se almacenan en archivos JSON locales

---

## 🆘 Soporte

Si encuentras problemas:

1. **Revisa la consola** - Los errores se muestran con colores:
   - 🔴 Rojo: Errores críticos
   - 🟡 Amarillo: Advertencias
   - 🟢 Verde: Éxito

2. **Verifica los logs** en la carpeta `output/`

3. **Archivos importantes para debug:**
   - `sesiones/facebook_cookies.json`
   - `sesiones/instagram_cookies.json`
   - Archivos en `scraped_data/`

---

## 📝 Notas Importantes

- **Primera ejecución:** Puede tardar más por autenticación inicial
- **Sesiones persistentes:** Los logins se guardan para futuras ejecuciones
- **Límites de rate:** Instagram/Facebook pueden bloquear después de ~100 URLs
- **Pausas automáticas:** El sistema hace pausas cada 40-50 capturas
- **Navegador visible:** NO cierres el navegador durante el proceso

---

## 🎯 Comandos Rápidos

```bash
# Instalar todo
npm install
npx playwright install chromium
python -m venv venv_scraping
venv_scraping\Scripts\activate
pip install instaloader requests beautifulsoup4 facebook-scraper
deactivate

# Ejecutar
node src/index_integrated.js

# Ver resultados
cd output
dir
```

---


**¡Listo! 🎉 Ahora puedes ejecutar el sistema en Windows sin problemas.**
