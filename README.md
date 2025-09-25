# 📸 Screenshot Tool - Capture Website Version

Herramienta para capturar screenshots de sitios web usando capture-website y generar reportes PDF.

## 🚀 Características

- ✅ Captura automática de screenshots usando capture-website
- ✅ Modo híbrido con fallback a Puppeteer directo
- ✅ Generación de PDFs profesionales
- ✅ Configuración optimizada para Ubuntu 24.04
- ✅ Manejo robusto de errores
- ✅ Interfaz de usuario amigable

## 📦 Instalación

```bash
cd capture-website-version
npm install
```

## 🔧 Requisitos

- Node.js v18.0.0 o superior
- Ubuntu 24.04 (configurado para AppArmor)
- Espacio en disco suficiente para las capturas

## 🚀 Uso

1. **Preparar archivo de URLs:**
   ```bash
   echo "google.com
   github.com
   stackoverflow.com" > urls.txt
   ```

2. **Ejecutar la herramienta:**
   ```bash
   npm start
   ```

3. **Revisar resultados:**
   - Screenshots en screenshots/
   - PDF en output/

## ⚙️ Configuración

Edita src/config/configuracion.js para personalizar:
- Resolución de capturas
- Timeout
- Concurrencia
- Directorios de salida

## 🔧 Solución de Problemas

### Problema de Sandbox en Ubuntu 24.04

Si encuentras errores de sandbox, ejecuta:

```bash
echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📁 Estructura

```
capture-website-version/
├── src/
│   ├── config/configuracion.js
│   ├── services/
│   │   ├── screenshotService.js
│   │   └── pdfGenerator.js
│   ├── utils/urlLoader.js
│   └── index.js
├── screenshots/
├── output/
└── package.json
```

## �� Ventajas de esta versión

- ✅ Usa capture-website como librería principal
- ✅ Fallback automático a Puppeteer directo
- ✅ Configuración específica para Ubuntu 24.04
- ✅ Manejo de elementos a ocultar (cookies, banners)
- ✅ Soporte para diferentes formatos de imagen
