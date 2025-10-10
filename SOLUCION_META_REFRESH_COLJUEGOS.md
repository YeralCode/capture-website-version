# 🔧 SOLUCIÓN: Detección de Redirección META REFRESH de Coljuegos

## 🐛 PROBLEMA DETECTADO

Las URLs de sitios de apuestas **SÍ están bloqueadas por Coljuegos**, pero el sistema **NO las detectaba** como bloqueadas en el PDF.

### Causa Raíz

Coljuegos usa **redirección META REFRESH en HTML** en lugar de redirección HTTP:

```html
<meta http-equiv="refresh" content="0;URL=https://www.coljuegos.gov.co/publicaciones/301824">
```

### ¿Por qué fallaba?

1. El servidor responde `HTTP 200 OK` (sin redirección HTTP)
2. El HTML contiene un `<meta http-equiv="refresh">` que ejecuta la redirección
3. **Capturábamos la URL antes de que se ejecutara la redirección META**
4. Resultado: `page.url()` devolvía la URL original, no la de Coljuegos

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. **Espera para Redirecciones META REFRESH**

Agregamos un delay de **3 segundos** antes de capturar la URL final para permitir que las redirecciones META se ejecuten:

**En `screenshotService.js` (línea ~1195):**
```javascript
// ESPERAR REDIRECCIONES META REFRESH (Coljuegos usa <meta http-equiv="refresh">)
console.log(chalk.gray('⏳ Esperando posibles redirecciones META REFRESH (3s)...'));
await page.waitForTimeout(3000);

// CAPTURAR URL FINAL (después de posibles redirecciones)
try {
  urlFinal = page.url();
  if (urlFinal !== url && urlFinal !== urlNormalizada) {
    console.log(chalk.cyan(`🔄 Redirección detectada: ${url} → ${urlFinal}`));
  }
} catch (e) {
  console.log(chalk.gray(`⚠️ No se pudo obtener URL final: ${e.message}`));
}
```

### 2. **Espera después de Navegación**

También agregamos espera después de navegar a sitios normales:

**En `screenshotService.js` (línea ~1062):**
```javascript
console.log(`📄 Navegación exitosa a sitio normal: ${urlObjetivo}`);

// ESPERAR REDIRECCIONES META REFRESH (como las de Coljuegos)
console.log(chalk.gray('⏳ Esperando posibles redirecciones META REFRESH (3s)...'));
await page.waitForTimeout(3000);
```

---

## 🧪 VERIFICACIÓN CON CURL

Puedes verificar manualmente que las URLs tienen META REFRESH:

```bash
curl -s http://02789bet.com | grep -i "coljuegos\|refresh"
```

**Resultado:**
```html
<meta http-equiv="refresh" content="0;URL=https://www.coljuegos.gov.co/publicaciones/301824">
```

---

## 🚀 CÓMO PROBAR LA SOLUCIÓN

### Opción 1: Ejecutar el test completo

```bash
node test-coljuegos-detection.js
```

### Opción 2: Limpiar resultados anteriores y ejecutar

```bash
# Limpiar resultados viejos
rm -rf screenshots/*.png output/*.pdf

# Ejecutar test
node test-coljuegos-detection.js
```

### Opción 3: Debug de una sola URL

```bash
node debug-single-url.js
```

---

## ✅ RESULTADO ESPERADO AHORA

Con la solución implementada, deberías ver en la **consola**:

```
📄 Navegación exitosa a sitio normal: http://02789bet.com
⏳ Esperando posibles redirecciones META REFRESH (3s)...
🔄 Redirección detectada: http://02789bet.com → https://www.coljuegos.gov.co/publicaciones/301824
🚫 SITIO BLOQUEADO POR COLJUEGOS: http://02789bet.com → https://www.coljuegos.gov.co/publicaciones/301824
⚠️ Este sitio de apuestas es ilegal en Colombia según Coljuegos
```

Y en el **PDF**:

```
1. URL: http://02789bet.com
   Redirigido a: https://www.coljuegos.gov.co/publicaciones/301824

Tipo: OTRO
Bloqueado: SÍ (Coljuegos)  ✅
Archivo: 02789bet-com_2025-10-09_XX-XX-XX.png
Tamaño: ~850 KB

[Screenshot de la página de advertencia de Coljuegos]
```

---

## 📊 DIFERENCIA ANTES VS DESPUÉS

### ❌ ANTES (Incorrecto):
```
Bloqueado: NO
```

### ✅ DESPUÉS (Correcto):
```
Bloqueado: SÍ (Coljuegos)
Redirigido a: https://www.coljuegos.gov.co/publicaciones/301824
```

---

## 🔍 DETALLES TÉCNICOS

### Tipos de Redirección

| Tipo | Cómo funciona | Detección |
|------|---------------|-----------|
| **HTTP 301/302** | Redirección a nivel de servidor | `curl -I` muestra Location |
| **META REFRESH** | Tag HTML que redirige | Requiere ejecutar JS/esperar |
| **JavaScript** | `window.location =` | Requiere ejecutar JS |

### Coljuegos usa META REFRESH

Por eso necesitamos:
1. ✅ Esperar que se cargue el HTML
2. ✅ Esperar que el navegador ejecute el meta refresh
3. ✅ Capturar la URL final después de la redirección

---

## ⏱️ IMPACTO EN TIEMPO

- **Antes:** ~5 segundos por URL
- **Ahora:** ~8 segundos por URL (3s extra por URL para detectar META REFRESH)
- **Trade-off:** Vale la pena para detectar correctamente bloqueos

---

## 🐛 TROUBLESHOOTING

### Si sigue sin detectar:

1. **Aumentar el delay:**
   ```javascript
   await page.waitForTimeout(5000); // 5 segundos en vez de 3
   ```

2. **Verificar manualmente:**
   ```bash
   curl -s http://02789bet.com | grep refresh
   ```

3. **Usar debug script:**
   ```bash
   node debug-single-url.js
   ```

### Si es muy lento:

Puedes reducir a 2 segundos si tu conexión es rápida:
```javascript
await page.waitForTimeout(2000); // 2 segundos
```

---

## 📝 ARCHIVOS MODIFICADOS

- ✅ `src/services/screenshotService.js` (2 lugares con espera de 3s)
- ✅ `debug-single-url.js` (script de debug creado)
- ✅ Esta documentación

---

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar el test:**
   ```bash
   node test-coljuegos-detection.js
   ```

2. **Verificar el PDF:**
   - Abrir `output/reporte-integrado-*.pdf`
   - Confirmar que muestra "Bloqueado: SÍ (Coljuegos)" para todas las URLs

3. **Verificar screenshots:**
   - Deben mostrar la página de advertencia de Coljuegos
   - Con el texto "Esto pasa cuando usted ingresa a una página de apuestas ilegales on line"

---

## ✅ CONFIRMACIÓN DE ÉXITO

El test es exitoso si:
- ✅ 4 de 4 URLs detectadas como bloqueadas
- ✅ PDF muestra "Bloqueado: SÍ (Coljuegos)"
- ✅ URL de redirección visible en rojo
- ✅ Screenshots muestran advertencia de Coljuegos

---

**🎉 ¡La solución está lista! Ejecuta el test para verificar.**


