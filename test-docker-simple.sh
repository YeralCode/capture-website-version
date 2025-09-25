#!/bin/bash

echo "=== PRUEBA SIMPLE CON DOCKER ==="

# Limpiar contenedores anteriores
docker-compose down

# Construir imagen
echo "1. Construyendo imagen..."
docker-compose build

# Crear directorios
mkdir -p screenshots output scraped_data

# Ejecutar solo una prueba simple
echo "2. Ejecutando prueba simple..."
docker run --rm \
  -v $(pwd)/screenshots:/app/screenshots \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/scraped_data:/app/scraped_data \
  -v $(pwd)/urls_prueba_pequeno.txt:/app/urls_prueba_pequeno.txt \
  --security-opt seccomp:unconfined \
  --network host \
  capture-website-version-screenshot-scraper

echo "3. Verificando resultados..."
echo "Screenshots:"
ls -la screenshots/ | tail -5

echo "PDFs:"
ls -la output/ | tail -3

echo "Datos:"
ls -la scraped_data/ | tail -3

echo "=== PRUEBA COMPLETADA ==="
