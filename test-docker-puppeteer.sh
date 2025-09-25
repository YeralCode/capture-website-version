#!/bin/bash

echo "=== PRUEBA DOCKER CON PUPPETEER ==="

# Limpiar contenedores anteriores
docker-compose down 2>/dev/null || true

# Construir imagen
echo "1. Construyendo imagen Docker..."
docker-compose build

# Crear directorios
mkdir -p screenshots output scraped_data

# Ejecutar contenedor con configuración específica para Puppeteer
echo "2. Ejecutando contenedor con Puppeteer..."
docker run --rm \
  -v $(pwd)/screenshots:/app/screenshots \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/scraped_data:/app/scraped_data \
  -v $(pwd)/urls_prueba_pequeno.txt:/app/urls_prueba_pequeno.txt \
  -v $(pwd)/urls_instagram_facebook.txt:/app/urls_instagram_facebook.txt \
  --security-opt seccomp:unconfined \
  --shm-size=2g \
  --cap-add=SYS_ADMIN \
  --network host \
  capture-website-version-screenshot-scraper

echo "3. Verificando resultados..."
echo "Screenshots nuevos:"
ls -la screenshots/ | tail -5

echo "PDFs nuevos:"
ls -la output/ | tail -3

echo "Datos nuevos:"
ls -la scraped_data/ | tail -3

echo "=== PRUEBA COMPLETADA ==="
