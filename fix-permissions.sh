#!/bin/bash

echo "🔧 Arreglando permisos de archivos generados..."

# Cambiar propietario de todos los archivos generados
sudo chown -R yeralcode:yeralcode screenshots/ output/ scraped_data/ 2>/dev/null || true

# Asegurar permisos de lectura para todos
chmod -R 644 screenshots/*.png 2>/dev/null || true
chmod -R 644 output/*.pdf 2>/dev/null || true
chmod -R 644 scraped_data/*.json 2>/dev/null || true

echo "✅ Permisos arreglados correctamente"
echo "📁 Archivos accesibles:"
echo "  • PDFs: output/"
echo "  • Screenshots: screenshots/"
echo "  • Datos: scraped_data/"
