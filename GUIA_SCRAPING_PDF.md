# 📘 Guía: Script de Scraping Real con PDF

Esta guía explica cómo usar **`index_scraping_pdf.js`** para hacer scraping real de Facebook e Instagram y generar un PDF.

---

## 🎯 ¿Qué Hace Este Script?

1. **Lee URLs** de un archivo de texto
2. **Hace scraping REAL** usando scripts de Python
3. **Evalúa contenido** (si la página existe, tiene datos, etc.)
4. **Genera PDF** con análisis detallado
5. **Guarda JSON** con todos los datos extraídos

---

## 🚀 Cómo Usarlo

### Paso 1: Preparar el Archivo de URLs

Crea un archivo de texto con URLs (una por línea):

```bash
# Opción A: Usar el archivo de ejemplo
nano urls-scraping-prueba.txt

# Opción B: Usar tus archivos existentes
# Ya tienes: 289_perfiles_redes_sociales_10_12_2024.txt
```

**Formato del archivo:**
```
https://www.facebook.com/pagina1
https://www.facebook.com/pagina2
https://www.instagram.com/usuario1
https://www.instagram.com/usuario2
# Comentarios con # se ignoran
```

### Paso 2: Ejecutar el Script

**Con archivo por defecto (`test-scraping-urls.txt`):**
```bash
node src/index_scraping_pdf.js
```

**Con archivo personalizado:**
```bash
node src/index_scraping_pdf.js urls-scraping-prueba.txt
```

**Con tus archivos de redes sociales:**
```bash
node src/index_scraping_pdf.js 289_perfiles_redes_sociales_10_12_2024.txt
```

---

## 📊 ¿Qué URLs Procesa?

| Tipo | ¿Hace Scraping? | ¿Qué Extrae? |
|------|-----------------|--------------|
| **Facebook** | ✅ Sí | Nombre, descripción, imagen de perfil, seguidores |
| **Instagram** | ✅ Sí | Username, bio, followers, posts, imagen de perfil |
| **Otros sitios** | ❌ No | Los ignora |

---

## 📄 Archivos Generados

Después de ejecutar, obtendrás:

1. **JSON con datos completos:**
   ```
   resultados-scraping-2025-10-06.json
   ```
   Contiene todos los datos extraídos de cada URL

2. **PDF con análisis:**
   ```
   output/reporte-scraping-2025-10-06.pdf
   ```
   Contiene evaluación visual de cada URL

---

## 🔍 Evaluación de Contenido

El script determina si una URL tiene contenido usando **indicadores reales**:

### Facebook - Indicadores Positivos:
- ✅ Página existe
- ✅ Imagen de perfil descargada
- ✅ Tiene título válido
- ✅ Tiene descripción

### Facebook - Indicadores Negativos:
- ❌ Página no existe
- ❌ Requiere login
- ❌ Error al acceder

### Instagram - Indicadores Positivos:
- ✅ Usuario existe
- ✅ Imagen de perfil descargada
- ✅ Tiene seguidores > 0
- ✅ Tiene posts > 0

### Instagram - Indicadores Negativos:
- ❌ Usuario no existe
- ❌ Perfil privado sin acceso
- ❌ Login requerido

---

## ⚙️ Requisitos

Este script **necesita**:

1. ✅ Python con el entorno virtual activado
2. ✅ Scripts de Python en `src/scripts/python/`
3. ✅ Credenciales de Facebook/Instagram (si aplica)

**Verificar:**
```bash
# Ver si el entorno virtual existe
ls -la venv_scraping/

# Ver si los scripts de Python existen
ls -la src/scripts/python/
```

---

## 🆚 Diferencias con Otros Scripts

| Script | ¿Hace Scraping? | ¿Toma Capturas? | Velocidad | Uso |
|--------|-----------------|-----------------|-----------|-----|
| `index_scraping_pdf.js` | ✅ Sí | ❌ No | 🐢 Lento | Análisis profundo |
| `regenerar-pdf-rapido.js` | ❌ No | ❌ No | ⚡⚡⚡ Muy rápido | Regenerar PDF |
| `index_integrated.js` | ✅ Sí | ✅ Sí | 🐌 Muy lento | Todo completo |

---

## 💡 Casos de Uso

### Usar `index_scraping_pdf.js` cuando:
- ✅ Quieres validar si perfiles/páginas existen
- ✅ Necesitas extraer datos reales (followers, posts, etc.)
- ✅ Quieres evaluar contenido sin tomar capturas
- ✅ Tienes pocas URLs (< 100)

### NO usar cuando:
- ❌ Tienes más de 500 URLs (muy lento)
- ❌ Solo quieres capturas de pantalla
- ❌ Ya tienes capturas y solo necesitas PDF
- ❌ Necesitas procesar sitios web normales (no FB/IG)

---

## 📝 Ejemplo Completo

```bash
# 1. Ir al directorio del proyecto
cd /home/yeralcode/Documentos/ITRC/PROJECT/screenshots-web-faceboock/capture-website-version

# 2. Crear archivo con URLs de prueba (ya está creado)
cat urls-scraping-prueba.txt

# 3. Ejecutar el script
node src/index_scraping_pdf.js urls-scraping-prueba.txt

# 4. Ver resultados
ls -lh resultados-scraping-*.json
ls -lh output/reporte-scraping-*.pdf
```

---

## 🔧 Solución de Problemas

### Error: "No se encontró el archivo de URLs"
**Causa:** El archivo no existe o está en otra ubicación

**Solución:**
```bash
# Verificar que el archivo existe
ls -la urls-scraping-prueba.txt

# Usar ruta completa si es necesario
node src/index_scraping_pdf.js /ruta/completa/al/archivo.txt
```

### Error: "Error ejecutando script de Python"
**Causa:** Entorno virtual no activado o falta dependencia

**Solución:**
```bash
# Activar entorno virtual
source venv_scraping/bin/activate

# Instalar dependencias si faltan
pip install instaloader playwright
```

### Scraping muy lento
**Causa:** Hay pausa de 2 segundos entre cada URL (línea 202)

**Solución:**
- Para pocas URLs (< 50): Normal, deja que termine
- Para muchas URLs (> 100): Usa `regenerar-pdf-rapido.js` en su lugar

---

## 🎯 Recomendación

**Para tus archivos grandes (1473 URLs):**

No uses `index_scraping_pdf.js` porque:
- Tomaría ~50 minutos (2 seg × 1473 URLs)
- Python puede fallar a mitad de camino
- Es innecesario si solo quieres el PDF

**En su lugar:**
```bash
# Usa el script rápido que ya creamos
node regenerar-pdf-rapido.js
```

**Usa `index_scraping_pdf.js` solo para:**
- Validar 10-50 URLs específicas
- Extraer datos detallados de perfiles importantes
- Análisis profundo de casos específicos

---

## 📞 Resumen Rápido

```bash
# PARA POCAS URLs CON SCRAPING REAL:
node src/index_scraping_pdf.js urls-scraping-prueba.txt

# PARA MUCHAS URLs SIN SCRAPING (RÁPIDO):
node regenerar-pdf-rapido.js

# PARA REGENERAR PDF SUPER RÁPIDO:
node regenerar-pdf-simple.js
```

Cada script tiene su propósito. ¡Elige el correcto según tus necesidades!

