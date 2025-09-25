#!/bin/bash

echo "=== PRUEBA INTERACTIVA CON DOCKER ==="

# Limpiar contenedores anteriores
docker-compose down 2>/dev/null || true

# Construir imagen
echo "1. Construyendo imagen..."
docker-compose build

# Crear directorios en el host
mkdir -p screenshots output scraped_data

# Ejecutar de manera interactiva con más logs
echo "2. Ejecutando contenedor de manera interactiva..."
docker run --rm -it \
  -v $(pwd)/screenshots:/app/screenshots \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/scraped_data:/app/scraped_data \
  -v $(pwd)/urls_prueba_pequeno.txt:/app/urls_prueba_pequeno.txt \
  -v $(pwd)/urls_instagram_facebook.txt:/app/urls_instagram_facebook.txt \
  --security-opt seccomp:unconfined \
  --network host \
  --env DEBUG=1 \
  capture-website-version-screenshot-scraper

echo "3. Verificando resultados en el host..."
echo "Screenshots generados:"
ls -la screenshots/ | grep -v "^total" | tail -5

echo "PDFs generados:"
ls -la output/ | grep -v "^total" | tail -3

echo "Datos extraídos:"
ls -la scraped_data/ | grep -v "^total" | tail -3

echo "=== PRUEBA COMPLETADA ==="
