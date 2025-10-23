#!/bin/bash

# Script para instalar herramientas de captura de pantalla en Ubuntu
# Estas herramientas permiten capturar la ventana completa del navegador incluyendo la barra de direcciones

echo "================================================"
echo "Instalador de Herramientas de Captura de Pantalla"
echo "================================================"
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  No ejecutes este script como root (sin sudo)"
    echo "   El script pedirá permisos cuando sea necesario"
    exit 1
fi

echo "🔍 Verificando herramientas instaladas..."
echo ""

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Lista de herramientas a verificar/instalar
TOOLS_TO_INSTALL=()

# 1. xdotool (para encontrar ventanas)
if command_exists xdotool; then
    echo "✅ xdotool - YA INSTALADO"
else
    echo "❌ xdotool - NO INSTALADO"
    TOOLS_TO_INSTALL+=("xdotool")
fi

# 2. imagemagick (import command - RECOMENDADO)
if command_exists import; then
    echo "✅ ImageMagick (import) - YA INSTALADO"
else
    echo "❌ ImageMagick - NO INSTALADO"
    TOOLS_TO_INSTALL+=("imagemagick")
fi

# 3. gnome-screenshot
if command_exists gnome-screenshot; then
    echo "✅ gnome-screenshot - YA INSTALADO"
else
    echo "❌ gnome-screenshot - NO INSTALADO"
    TOOLS_TO_INSTALL+=("gnome-screenshot")
fi

# 4. scrot
if command_exists scrot; then
    echo "✅ scrot - YA INSTALADO"
else
    echo "❌ scrot - NO INSTALADO"
    TOOLS_TO_INSTALL+=("scrot")
fi

# 5. maim (opcional, alternativa moderna)
if command_exists maim; then
    echo "✅ maim - YA INSTALADO"
else
    echo "❌ maim - NO INSTALADO (opcional)"
    TOOLS_TO_INSTALL+=("maim")
fi

echo ""

# Si hay herramientas por instalar
if [ ${#TOOLS_TO_INSTALL[@]} -eq 0 ]; then
    echo "🎉 ¡Todas las herramientas ya están instaladas!"
    echo ""
    echo "Herramientas disponibles para captura:"
    echo "  1. ImageMagick (import) - Mejor calidad, captura con borde de ventana"
    echo "  2. gnome-screenshot - Nativo de GNOME"
    echo "  3. scrot - Ligero y rápido"
    echo "  4. xdotool - Identificación de ventanas"
    echo "  5. maim - Alternativa moderna"
    exit 0
else
    echo "📦 Herramientas a instalar: ${TOOLS_TO_INSTALL[*]}"
    echo ""
    read -p "¿Deseas instalar estas herramientas? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo ""
        echo "🔄 Actualizando lista de paquetes..."
        sudo apt update
        
        echo ""
        echo "📥 Instalando herramientas..."
        sudo apt install -y "${TOOLS_TO_INSTALL[@]}"
        
        echo ""
        echo "✅ Instalación completada!"
        echo ""
        echo "Herramientas instaladas:"
        for tool in "${TOOLS_TO_INSTALL[@]}"; do
            if [ "$tool" == "imagemagick" ]; then
                if command_exists import; then
                    echo "  ✅ $tool"
                else
                    echo "  ❌ $tool (falló)"
                fi
            else
                if command_exists "$tool"; then
                    echo "  ✅ $tool"
                else
                    echo "  ❌ $tool (falló)"
                fi
            fi
        done
        
        echo ""
        echo "🎯 Ahora puedes ejecutar el script de captura de pantallas"
        echo "   Las capturas incluirán la barra de navegación real"
    else
        echo ""
        echo "❌ Instalación cancelada"
        echo "   Nota: Sin estas herramientas, se usará el método de Playwright"
        echo "   (sin barra de navegación visible)"
        exit 1
    fi
fi

echo ""
echo "================================================"
echo "💡 INSTRUCCIONES DE USO:"
echo "================================================"
echo ""
echo "El script de captura intentará usar estas herramientas en orden:"
echo ""
echo "  1️⃣  ImageMagick (import) - MEJOR OPCIÓN"
echo "      • Captura con marco de ventana"
echo "      • Incluye barra de título y navegación"
echo "      • Alta calidad"
echo ""
echo "  2️⃣  gnome-screenshot"
echo "      • Captura de ventana enfocada"
echo "      • Integrado con GNOME"
echo ""
echo "  3️⃣  scrot"
echo "      • Captura rápida de ventana"
echo "      • Ligero y eficiente"
echo ""
echo "  4️⃣  maim"
echo "      • Alternativa moderna a scrot"
echo "      • Buena calidad"
echo ""
echo "Si todos fallan, se usará Playwright como fallback."
echo ""

