# 🧪 INSTRUCCIONES: TEST DE DETECCIÓN COLJUEGOS

## 📋 RESUMEN DEL TEST

Este test verifica que el sistema detecte correctamente cuando las URLs son bloqueadas por [Coljuegos](https://www.coljuegos.gov.co/publicaciones/301824) (autoridad colombiana de juegos de azar).

---

## 🎯 URLS DE PRUEBA

El archivo `289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt` contiene 4 URLs de sitios de apuestas:

1. `02789bet.com` → `http://02789bet.com`
2. `050p.bet` → `http://050p.bet`
3. `057317.win` → `http://057317.win`
4. `064452.win` → `http://064452.win`

**Todas usan protocolo HTTP** (configurado en `index_integrated.js`)

---

## ✅ RESULTADO ESPERADO

Según Coljuegos, estos sitios de apuestas son **ilegales en Colombia** y deberían:

1. **Redirigir a:** `https://www.coljuegos.gov.co/publicaciones/301824`
2. **Marcarse como:** "Bloqueado: SÍ (Coljuegos)"
3. **Mostrar en PDF:**
   - URL original: `http://02789bet.com`
   - Redirigido a: `https://www.coljuegos.gov.co/...` (en rojo)
   - Bloqueado: SÍ (Coljuegos)
4. **Screenshot:** Página de advertencia de Coljuegos

---

## 🚀 CÓMO EJECUTAR EL TEST

### Opción 1: Ejecutar el script de prueba

```bash
node test-coljuegos-detection.js
```

### Opción 2: Ejecutar directamente

```bash
node src/index_integrated.js
```

### Opción 3: Con permisos de ejecución

```bash
./test-coljuegos-detection.js
```

---

## 📊 QUÉ ESPERAR DURANTE LA EJECUCIÓN

### 1. **Inicio del Test**
```
🧪 TEST: DETECCIÓN DE BLOQUEO POR COLJUEGOS

📋 Archivo de prueba: 289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt
🌐 Protocolo: HTTP (sitios de apuestas)
🎯 Objetivo: Verificar detección de redirección a Coljuegos
```

### 2. **Procesamiento de URLs**
Para cada URL deberías ver:
```
📸 Capturando screenshot: http://02789bet.com
🔄 Redirección detectada: http://02789bet.com → https://www.coljuegos.gov.co/publicaciones/301824
🚫 SITIO BLOQUEADO POR COLJUEGOS: http://02789bet.com → https://www.coljuegos.gov.co/publicaciones/301824
⚠️ Este sitio de apuestas es ilegal en Colombia según Coljuegos
```

### 3. **Generación de Reporte**
```
📄 GENERANDO REPORTE PDF INTEGRADO
📝 GENERANDO REPORTE WORD (.docx)

✅ PDF integrado generado: 4 páginas
✅ Word integrado generado: 4 páginas
```

### 4. **Resumen Final**
```
🎉 PROCESO INTEGRADO COMPLETADO

📊 ESTADÍSTICAS FINALES:
  • Total URLs procesadas: 4
  • Exitosos: 0
  • Fallidos: 4
  • Bloqueadas/No disponibles: 4
  • No bloqueadas (accesibles): 0
```

---

## 🔍 VERIFICACIÓN DE RESULTADOS

### 1. **Revisar el PDF generado**

Busca el archivo en `output/`:
```bash
ls -lh output/reporte-integrado-*.pdf
```

### 2. **Abrir el PDF**

Verifica que cada entrada muestre:

```
1. URL: http://02789bet.com
   Redirigido a: https://www.coljuegos.gov.co/publicaciones/301824

Tipo: OTRO
Bloqueado: SÍ (Coljuegos)
Archivo: 02789bet-com_2025-10-09_XX-XX-XX.png
Tamaño: ~850 KB

[Screenshot de la página de advertencia de Coljuegos]
```

### 3. **Revisar los Screenshots**

Busca las imágenes en `screenshots/`:
```bash
ls -lh screenshots/*bet*.png
ls -lh screenshots/*win*.png
```

Todos los screenshots deberían mostrar la **página de advertencia de Coljuegos** que dice:
> "Esto pasa cuando usted ingresa a una página de apuestas ilegales on line"

### 4. **Verificar Estadísticas**

En el resumen final del PDF, verifica:
- **Bloqueadas/No disponibles:** 4
- **No bloqueadas (accesibles):** 0

---

## ✅ CRITERIOS DE ÉXITO

El test es **EXITOSO** si:

1. ✅ Todas las 4 URLs son detectadas como bloqueadas
2. ✅ El PDF muestra "Bloqueado: SÍ (Coljuegos)" para todas
3. ✅ Se muestra la URL de redirección en rojo
4. ✅ Los screenshots muestran la página de Coljuegos
5. ✅ Las estadísticas muestran 4 bloqueadas, 0 accesibles

---

## ❌ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: URLs no se detectan como bloqueadas

**Causa:** Puede que no estés en Colombia o uses VPN
**Solución:** El bloqueo de Coljuegos solo funciona desde Colombia

### Problema 2: Error "No se pudo obtener URL final"

**Causa:** Problema de navegación
**Solución:** Aumentar timeout en `configuracion.js`:
```javascript
screenshots: {
  timeout: 120 // Aumentar a 120 segundos
}
```

### Problema 3: Screenshots vacíos

**Causa:** Navegación muy lenta
**Solución:** Aumentar delay en `configuracion.js`:
```javascript
screenshots: {
  delay: 3 // Aumentar a 3 segundos
}
```

---

## 📝 CONFIGURACIÓN ACTUAL

### En `index_integrated.js` (línea 203):
```javascript
{ archivo: '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt', protocolo: 'http' }
```

### En `urlLoader.js`:
- URLs sin protocolo → se les agrega `http://`
- Resultado: `02789bet.com` → `http://02789bet.com`

### En `integratedScrapingService.js`:
- Detecta redirección a `coljuegos.gov.co`
- Marca como bloqueado automáticamente

### En `pdfGenerator.js`:
- Muestra URL original
- Muestra URL de redirección en rojo
- Agrega "(Coljuegos)" al estado de bloqueo

---

## 🔧 COMANDOS ÚTILES

### Ver logs detallados:
```bash
node test-coljuegos-detection.js 2>&1 | tee test-coljuegos.log
```

### Limpiar resultados anteriores:
```bash
rm -rf screenshots/*.png
rm -rf output/*.pdf
rm -rf output/*.docx
```

### Verificar configuración:
```bash
grep -A 5 "archivosUrls" src/index_integrated.js
```

### Ver PDFs generados:
```bash
ls -lht output/*.pdf | head -5
```

---

## 📊 EJEMPLO DE SALIDA EXITOSA

```
🧪 TEST: DETECCIÓN DE BLOQUEO POR COLJUEGOS

✅ Cargadas 4 URLs desde 289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt (HTTP)

🚀 PROCESANDO URLs CON SESIONES PRE-AUTENTICADAS

📦 Lote 1/2 - Procesando 2 URLs semi-paralelo...

[1/4] Procesando: http://02789bet.com
🔄 Redirección detectada: http://02789bet.com → https://www.coljuegos.gov.co/publicaciones/301824
🚫 SITIO BLOQUEADO POR COLJUEGOS
✅ [1/4] Completado

[2/4] Procesando: http://050p.bet
🔄 Redirección detectada: http://050p.bet → https://www.coljuegos.gov.co/publicaciones/301824
🚫 SITIO BLOQUEADO POR COLJUEGOS
✅ [2/4] Completado

...

✅ Progreso: 4/4 (100%)

📄 GENERANDO REPORTE PDF INTEGRADO
✅ PDF integrado generado: reporte-integrado-2025-10-09T14-30-15.pdf

🎉 PROCESO INTEGRADO COMPLETADO

📊 ESTADÍSTICAS FINALES:
  • Total URLs procesadas: 4
  • Bloqueadas/No disponibles: 4
  • No bloqueadas (accesibles): 0
```

---

## 📚 REFERENCIAS

- [Coljuegos - Advertencia Páginas Ilegales](https://www.coljuegos.gov.co/publicaciones/301824)
- Documentación: `DETECCION_BLOQUEO_COLJUEGOS.md`
- Configuración: `SOPORTE_HTTP_HTTPS.md`

---

## 🎯 RESUMEN

Este test verifica que:
1. ✅ Las URLs con HTTP se procesan correctamente
2. ✅ Las redirecciones a Coljuegos se detectan
3. ✅ Los sitios bloqueados se marcan correctamente
4. ✅ El PDF muestra toda la información necesaria
5. ✅ Los screenshots capturan la página de advertencia

**🚀 Ejecuta:** `node test-coljuegos-detection.js`

**📄 Revisa:** El PDF en `output/reporte-integrado-*.pdf`

**✅ Verifica:** Todas las URLs deben mostrar "Bloqueado: SÍ (Coljuegos)"


