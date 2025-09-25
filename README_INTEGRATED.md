# Integrated Scraping & Screenshot Automation Tool

Herramienta integrada para extraer datos de Instagram y Facebook, y capturar screenshots de sitios web.

## 🚀 Características

- **Scraping de Instagram**: Extrae información de perfiles y posts usando `instaloader`
- **Scraping de Facebook**: Extrae datos de páginas y perfiles usando `facebook-scraper`
- **Captura de Screenshots**: Captura automática de pantallas de sitios web
- **Generación de PDFs**: Crea reportes PDF con datos extraídos y screenshots
- **Manejo de Errores**: Gestión robusta de errores 404 y problemas de conexión

## 📋 Requisitos

- Node.js >= 18.0.0
- Python 3.8+
- Navegador Chrome/Chromium (para Puppeteer)

## 🛠️ Instalación

1. **Clonar el repositorio**:
```bash
git clone <url-del-repositorio>
cd capture-website-version
```

2. **Instalar dependencias de Node.js**:
```bash
npm install
```

3. **Configurar entorno virtual de Python**:
```bash
python3 -m venv venv_scraping
source venv_scraping/bin/activate
pip install facebook-scraper instaloader
```

## 🎯 Uso

### Modo Integrado (Recomendado)

Ejecuta la versión integrada que combina scraping y capturas:

```bash
npm run start:integrated
```

### Modo Solo Screenshots

Ejecuta solo la captura de screenshots (versión original):

```bash
npm start
```

### Modo Desarrollo

Para desarrollo con recarga automática:

```bash
# Modo integrado
npm run dev:integrated

# Modo solo screenshots
npm run dev
```

## 📁 Estructura de Archivos

```
src/
├── services/
│   ├── integratedScrapingService.js    # Servicio integrado principal
│   ├── instagramScraperService.js      # Servicio de Instagram
│   ├── facebookScraperService.js       # Servicio de Facebook
│   ├── screenshotService.js            # Servicio de capturas
│   └── pdfGenerator.js                 # Generador de PDFs
├── scripts/
│   └── python/                         # Scripts de Python para scraping
│       ├── instagram_profile_scraper.py
│       ├── instagram_post_scraper.py
│       ├── facebook_page_scraper.py
│       └── facebook_profile_scraper.py
├── config/
│   └── configuracion.js                # Configuración del sistema
├── utils/
│   └── urlLoader.js                    # Cargador de URLs
├── index.js                            # Versión original (solo screenshots)
└── index_integrated.js                 # Versión integrada
```

## 📝 Configuración

### Archivos de URLs

Coloca las URLs a procesar en los siguientes archivos:

- `urls_instagram_facebook.txt`: URLs de Instagram y Facebook
- `urls_prueba_pequeno.txt`: URLs de prueba

### Ejemplo de URLs

**Instagram**:
```
https://www.instagram.com/username/
https://www.instagram.com/p/SHORTCODE/
https://instagram.com/username
```

**Facebook**:
```
https://www.facebook.com/pagename
https://facebook.com/pagename
```

**Otros sitios**:
```
https://google.com
https://github.com
```

## ⚙️ Configuración Avanzada

Puedes personalizar el comportamiento modificando la configuración en `src/config/configuracion.js`:

```javascript
const configuracion = {
  scraping: {
    directorioSalida: 'scraped_data',
    maxPosts: 10,
    incluirComentarios: false,
    incluirReacciones: true
  },
  screenshots: {
    width: 1920,
    height: 1080,
    timeout: 120,
    concurrencia: 2
  }
};
```

## 📊 Datos Extraídos

### Instagram

- **Perfiles**: Username, biografía, seguidores, posts, verificación
- **Posts**: Caption, likes, comentarios, hashtags, menciones, ubicación

### Facebook

- **Páginas**: Información de la página, posts recientes
- **Perfiles**: Información básica del perfil

### Screenshots

- Capturas de pantalla de todas las URLs procesadas
- Manejo de errores 404
- Múltiples formatos de salida

## 📄 Salida

El sistema genera:

1. **Datos extraídos**: Archivos JSON en `scraped_data/`
2. **Screenshots**: Imágenes PNG en `screenshots/`
3. **Reporte PDF**: Archivo consolidado en `output/`

## 🔧 Solución de Problemas

### Error de Python

Si encuentras errores relacionados con Python:

```bash
# Verificar que el entorno virtual esté activo
source venv_scraping/bin/activate

# Reinstalar dependencias
pip install --upgrade facebook-scraper instaloader
```

### Error de Puppeteer

Si hay problemas con Puppeteer:

```bash
# Instalar dependencias del sistema
sudo apt-get update
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Error de Permisos

```bash
# Hacer ejecutables los scripts de Python
chmod +x src/scripts/python/*.py
```

## 📈 Rendimiento

- **Concurrencia**: Ajusta `concurrencia` en la configuración
- **Timeouts**: Configura timeouts apropiados para tu conexión
- **Rate Limiting**: Los servicios incluyen pausas automáticas

## ⚠️ Consideraciones Legales

- Respeta los términos de servicio de Instagram y Facebook
- Usa la herramienta solo para fines legítimos
- No extraigas datos de cuentas privadas sin autorización
- Considera los límites de rate limiting

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras problemas:

1. Revisa la sección de solución de problemas
2. Verifica los logs de error
3. Abre un issue en GitHub

---

**Nota**: Esta herramienta es para fines educativos y de investigación. Úsala responsablemente y respeta los términos de servicio de las plataformas.
