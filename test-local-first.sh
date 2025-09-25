#!/bin/bash

echo "=== PRUEBA LOCAL PRIMERO ==="

# Verificar directorios
mkdir -p screenshots output scraped_data

echo "1. Ejecutando prueba local..."
npm run start:integrated

echo "2. Verificando resultados locales..."
echo "Screenshots:"
ls -la screenshots/ | grep -v "^total" | tail -3

echo "PDFs:"
ls -la output/ | grep -v "^total" | tail -2

echo "Datos:"
ls -la scraped_data/ | grep -v "^total" | tail -3

if [ -f "output/reporte-integrado-"*.pdf ]; then
    echo "✅ PDF generado exitosamente"
    echo "3. Ahora probando con Docker..."
    
    # Construir imagen Docker
    docker-compose build
    
    # Ejecutar con Docker
    docker run --rm \
      -v $(pwd)/screenshots:/app/screenshots \
      -v $(pwd)/output:/app/output \
      -v $(pwd)/scraped_data:/app/scraped_data \
      -v $(pwd)/urls_prueba_pequeno.txt:/app/urls_prueba_pequeno.txt \
      -v $(pwd)/urls_instagram_facebook.txt:/app/urls_instagram_facebook.txt \
      --security-opt seccomp:unconfined \
      --shm-size=1g \
      capture-website-version-screenshot-scraper
    
    echo "4. Verificando resultados de Docker..."
    echo "Nuevos screenshots:"
    ls -la screenshots/ | grep -v "^total" | tail -3
    
    echo "Nuevos PDFs:"
    ls -la output/ | grep -v "^total" | tail -2
    
else
    echo "❌ Error en prueba local, no continuar con Docker"
fi

echo "=== PRUEBA COMPLETADA ==="
