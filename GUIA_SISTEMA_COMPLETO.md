# 🌐 Guía: Sistema Completo de Scraping + Capturas + PDF

## ✨ ¿Qué hace este sistema?

`index_completo.js` es la **versión mejorada y unificada** que combina:

- ✅ **Scraping real** de Facebook e Instagram
- ✅ **Capturas de pantalla** de TODAS las URLs (FB, IG, y normales)
- ✅ **Evaluación inteligente** de contenido
- ✅ **PDF completo** con análisis + imágenes
- ✅ **JSON detallado** con todos los datos

---

## 🎯 Características Principales

### 1. Scraping Inteligente
- **Facebook:** Extrae nombre, descripción, seguidores, posts
- **Instagram:** Extrae username, followers, bio, posts
- **Evaluación:** Determina si el contenido existe realmente

### 2. Capturas Universales
- **Facebook/Instagram:** Con autenticación (evita login)
- **Sitios normales:** Captura directa
- **Todas las URLs:** Sin importar el tipo

### 3. Análisis Automático
- **Validación:** Verifica si hay contenido real
- **Confianza:** Calcula nivel de confianza (0-100%)
- **Categorización:** Separa por tipo (FB/IG/Normal)

### 4. Salidas Completas
- **PDF:** Reporte visual con capturas
- **JSON:** Datos estructurados para análisis

---

## 🚀 Cómo Usar

### Paso 1: Configurar Archivos de URLs

Edita el archivo `src/index_completo.js` en la línea **169-176**:

```javascript
const archivosUrls = [
  // Descomentar los que quieras usar:
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',  // ✅ Activo
  // '1203_SITIOS_WEB_11_2024.txt',                      // ⚪ Desactivado
  // 'urls_prueba.txt',                                  // ⚪ Desactivado
];
```

**Ejemplo - Solo redes sociales:**
```javascript
const archivosUrls = [
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
];
```

**Ejemplo - Redes sociales + Sitios web:**
```javascript
const archivosUrls = [
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
  '1203_SITIOS_WEB_11_2024.txt',
];
```

**Ejemplo - Solo sitios web:**
```javascript
const archivosUrls = [
  '1203_SITIOS_WEB_11_2024.txt',
];
```

### Paso 2: Ejecutar

```bash
cd /home/yeralcode/Documentos/ITRC/PROJECT/screenshots-web-faceboock/capture-website-version

node src/index_completo.js
```

---

## 📊 Proceso Completo

```
┌─────────────────────────────────────────┐
│  1. CARGAR URLs                         │
│     Desde archivos configurados         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  2. AUTENTICACIÓN                       │
│     Facebook + Instagram (si aplica)    │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  3. PROCESAMIENTO                       │
│     Para cada URL:                      │
│     • Scraping (FB/IG)                  │
│     • Captura (TODAS)                   │
│     • Evaluación                        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  4. ANÁLISIS                            │
│     • Validar contenido                 │
│     • Calcular confianza                │
│     • Categorizar resultados            │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  5. GENERAR SALIDAS                     │
│     • PDF completo                      │
│     • JSON con datos                    │
└─────────────────────────────────────────┘
```

---

## 📄 Archivos Generados

### 1. PDF Completo
```
output/reporte-completo-2025-10-06T12-00-00.pdf
```

**Contiene:**
- ✅ Resumen ejecutivo con estadísticas
- ✅ Tabla de resultados con evaluación
- ✅ Todas las capturas de pantalla
- ✅ Análisis de disponibilidad

### 2. JSON con Datos
```
resultados-completo-2025-10-06.json
```

**Contiene:**
```json
[
  {
    "url": "https://www.facebook.com/ejemplo",
    "tipo": "facebook",
    "exito": true,
    "tieneContenido": true,
    "confianza": 90,
    "screenshot": {
      "exito": true,
      "nombreArchivo": "facebook_ejemplo_2025-10-06.png",
      "tamanio": 245678
    },
    "datosScraping": {
      "exito": true,
      "datos": {
        "pagina_existe": true,
        "titulo": "Ejemplo Página",
        "seguidores": "1,234"
      }
    }
  }
]
```

---

## 🔍 Evaluación de Contenido

### Para Facebook e Instagram (con scraping):

**Indicadores Positivos (+):**
- ✅ Página/usuario existe
- ✅ Imagen de perfil descargada
- ✅ Tiene título/nombre válido
- ✅ Tiene descripción/bio
- ✅ Tiene seguidores
- ✅ Tiene posts

**Indicadores Negativos (-):**
- ❌ Página/usuario no existe
- ❌ Requiere login
- ❌ Error al acceder
- ❌ Perfil privado sin acceso

**Resultado:** Más positivos que negativos = ✅ CON CONTENIDO

### Para Sitios Normales (solo captura):

**Evaluación por tamaño:**
- ✅ Captura > 10KB = Probablemente tiene contenido
- ❌ Captura < 10KB = Probablemente vacía o error

### Nivel de Confianza (0-100%):

- 🟢 **90-100%:** Muy confiable (scraping + captura exitosos)
- 🟡 **70-89%:** Confiable (solo captura o scraping parcial)
- 🟠 **50-69%:** Moderado (captura pequeña)
- 🔴 **0-49%:** Baja confianza (errores o sin datos)

---

## 📈 Estadísticas en el PDF

El reporte incluye:

1. **Resumen Ejecutivo:**
   - Total procesadas
   - Con contenido validado
   - Tasa de éxito
   - Información de conectividad

2. **Por Plataforma:**
   - Instagram: scraping + capturas
   - Facebook: scraping + capturas
   - Sitios normales: solo capturas

3. **Tabla Detallada:**
   - URL
   - Tipo
   - Evaluación (OK/No)
   - Captura incluida

---

## ⚙️ Configuración Avanzada

### Cambiar Archivos de URLs

Edita línea **169-176** en `src/index_completo.js`:

```javascript
const archivosUrls = [
  'tu_archivo_1.txt',
  'tu_archivo_2.txt',
  'tu_archivo_3.txt',
];
```

### Ajustar Parámetros de Scraping

Edita línea **28-33** en `src/index_completo.js`:

```javascript
scraping: {
  directorioSalida: 'scraped_data',
  maxPosts: 10,              // Número de posts a extraer
  incluirComentarios: false, // true para extraer comentarios
  incluirReacciones: true    // true para extraer likes
}
```

### Cambiar Resolución de Capturas

En `src/config/configuracion.js` o variables de entorno:

```bash
SCREENSHOT_WIDTH=1920
SCREENSHOT_HEIGHT=1080
SCREENSHOT_TIMEOUT=30
```

---

## 🆚 Comparación con Otros Scripts

| Script | Scraping FB/IG | Capturas | URLs Normales | Velocidad |
|--------|----------------|----------|---------------|-----------|
| `index_completo.js` | ✅ Sí | ✅ Todo | ✅ Sí | 🐌 Lento |
| `index_integrated.js` | ✅ Sí | ✅ Todo | ✅ Sí | 🐌 Lento |
| `index_scraping_pdf.js` | ✅ Sí | ❌ No | ❌ No | 🐢 Moderado |
| `regenerar-pdf-rapido.js` | ❌ No | ❌ No | ✅ Sí | ⚡⚡⚡ Rápido |

---

## 💡 Cuándo Usar Cada Script

### Usa `index_completo.js` cuando:
- ✅ Necesitas análisis COMPLETO
- ✅ Quieres scraping + capturas
- ✅ Tienes URLs mixtas (FB, IG, normales)
- ✅ Necesitas validación de contenido
- ✅ Tienes < 500 URLs (más es MUY lento)

### Usa `regenerar-pdf-rapido.js` cuando:
- ✅ Ya tienes capturas tomadas
- ✅ Solo quieres regenerar el PDF
- ✅ Tienes 1000+ URLs
- ✅ No necesitas scraping nuevo

### Usa `index_scraping_pdf.js` cuando:
- ✅ Solo necesitas scraping (sin capturas)
- ✅ Solo URLs de FB/IG
- ✅ Quieres análisis rápido

---

## 🔧 Solución de Problemas

### Problema: Proceso muy lento
**Causa:** Muchas URLs + scraping + capturas

**Solución:**
```bash
# Divide en lotes más pequeños
# Procesa 50-100 URLs a la vez
```

### Problema: Error de autenticación
**Causa:** Sesiones de FB/IG no válidas

**Solución:**
- Verifica credenciales
- Revisa archivos de sesiones en `sesiones/`
- El script continuará con capturas básicas

### Problema: Sin contenido en todo
**Causa:** URLs inválidas o problemas de red

**Solución:**
```bash
# Verificar conectividad
ping google.com

# Probar con URLs conocidas
# Usar archivo de prueba pequeño primero
```

---

## 📝 Ejemplo Completo

```bash
# 1. Ir al directorio
cd /home/yeralcode/Documentos/ITRC/PROJECT/screenshots-web-faceboock/capture-website-version

# 2. Editar configuración (opcional)
nano src/index_completo.js
# Cambiar línea 169-176 con tus archivos

# 3. Ejecutar
node src/index_completo.js

# 4. Esperar (puede tardar varios minutos)
# Ver progreso en pantalla

# 5. Resultados
ls -lh output/reporte-completo-*.pdf
ls -lh resultados-completo-*.json
```

---

## 🎯 Resumen Rápido

```bash
# PARA ANÁLISIS COMPLETO (scraping + capturas):
node src/index_completo.js

# PARA REGENERAR PDF RÁPIDO (sin scraping):
node regenerar-pdf-rapido.js

# PARA SOLO SCRAPING (sin capturas):
node src/index_scraping_pdf.js
```

---

## ✅ Ventajas del Sistema Completo

1. **Todo en uno:** Scraping + Capturas + Análisis
2. **Inteligente:** Evalúa contenido automáticamente
3. **Flexible:** Maneja FB, IG, y URLs normales
4. **Completo:** PDF + JSON con toda la información
5. **Validado:** Nivel de confianza en cada resultado

---

## 🎉 ¡Listo!

El sistema completo está optimizado para darte:
- 📊 **Análisis profundo** de contenido
- 📸 **Capturas visuales** de todas las URLs
- 📄 **Reporte profesional** en PDF
- 💾 **Datos estructurados** en JSON

¡Perfecto para auditorías completas de URLs!

