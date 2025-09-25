#!/bin/bash

echo "=== CONSTRUYENDO Y PROBANDO SISTEMA DE SCREENSHOTS ==="

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "Error: Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

echo "1. Construyendo imagen Docker..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "Error: Falló la construcción de la imagen Docker"
    exit 1
fi

echo "2. Creando directorios necesarios..."
mkdir -p screenshots output scraped_data

echo "3. Ejecutando prueba del sistema..."
docker-compose up --abort-on-container-exit

echo "4. Verificando resultados..."
echo "Screenshots generados:"
ls -la screenshots/

echo "PDFs generados:"
ls -la output/

echo "Datos extraídos:"
ls -la scraped_data/

echo "=== PRUEBA COMPLETADA ==="
