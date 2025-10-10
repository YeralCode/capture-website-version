# Mejora de Detección de Bloqueos en Facebook

## 📅 Fecha: 10 de Octubre de 2025

## 🎯 Problema Identificado

La detección de páginas bloqueadas en Facebook era **demasiado restrictiva** y no detectaba correctamente algunos perfiles bloqueados.

### Casos de Prueba:
1. ✅ `https://web.facebook.com/profile.php?id=61563445625314` - Debe estar ACCESIBLE
2. ❌ `https://www.facebook.com/profile.php?id=61556781188682` - Debe estar BLOQUEADA (pero salía accesible)
3. ✅ `https://www.facebook.com/bingopingolive` - Debe estar ACCESIBLE
4. ❌ `https://www.facebook.com/lina.gomez.96387` - Debe estar BLOQUEADA (pero salía accesible)

---

## 🔧 Solución Implementada

### Lógica Anterior (Restrictiva):
```javascript
const perfilNoEncontrado = tieneContenidoDeError && 
                          (fueRedirigidoAPaginaPrincipal || tieneParametroRedireccion || esContenidoEspecifico);
```

**Problema:** Solo detectaba bloqueo si había:
- Mensaje de error **Y**
- (Redirección O Parámetro _rdr O Contenido específico)

Muchos perfiles bloqueados tienen el mensaje de error pero **NO** cumplen las otras condiciones.

---

### Lógica Nueva (Mejorada):
```javascript
const perfilNoEncontrado = 
  // CASO 1: Mensaje de error + redirección clara
  (tieneContenidoDeError && (fueRedirigidoAPaginaPrincipal || tieneParametroRedireccion)) ||
  // CASO 2: Contenido específico con error (video/post eliminado)
  (esContenidoEspecifico && tieneContenidoDeError) ||
  // CASO 3: Mensaje de error + título sospechoso + contenido escaso (NUEVA LÓGICA)
  (tieneContenidoDeError && tituloEsError && contenidoMuyEscaso) ||
  // CASO 4: Mensaje de error + clases de error en HTML
  (tieneContenidoDeError && tieneClaseError);
```

---

## 🆕 Nuevas Detecciones Agregadas

### 1. **Análisis del Título de la Página**
```javascript
const tituloPagina = await page.title();
const tituloEsError = tituloPagina.toLowerCase().includes('facebook') && tituloPagina.length < 30;
```
- Títulos muy cortos como "Facebook" (sin nombre de perfil) indican página bloqueada
- Perfiles normales tienen títulos descriptivos largos

### 2. **Detección de Contenido Escaso**
```javascript
const contenidoMuyEscaso = contenidoPagina.replace(/<[^>]*>/g, '').trim().length < 1000;
```
- Páginas bloqueadas tienen muy poco contenido (< 1000 caracteres)
- Perfiles normales tienen mucho más contenido

### 3. **Detección de Clases de Error en HTML**
```javascript
const tieneClaseError = contenidoPagina.includes('class="error"') || 
                       contenidoPagina.includes('error-page') ||
                       contenidoPagina.includes('not-found');
```
- Facebook usa clases CSS específicas para páginas de error

### 4. **Mensajes de Error Ampliados**
```javascript
const tieneContenidoDeError = contenidoLower.includes('this content isn\'t available') ||
                             contenidoLower.includes('contenido no está disponible') ||
                             contenidoLower.includes('content not found') ||
                             contenidoLower.includes('contenido no se encuentra') ||
                             // ... más variantes
```
- Más variantes de mensajes de error
- Detección en inglés y español

---

## 📊 Logs de Depuración

Se agregó un análisis detallado que muestra **SOLO PARA FACEBOOK**:

```
🔍 ANÁLISIS DE DETECCIÓN (FACEBOOK):
   📄 Título: "Facebook" (length: 8)
   ⚠️  Tiene mensaje de error: SÍ
   🔄 Redirigido a principal: NO
   🔗 Parámetro redireccion: NO
   📝 Contenido escaso: SÍ (345 chars)
   🏷️  Clase de error: NO
   🎬 Contenido específico: NO
   ❌ Título de error: SÍ
   ➡️  RESULTADO FINAL: 🚫 BLOQUEADO
```

Esto permite **ver exactamente** qué está detectando el sistema y por qué.

---

## 🎯 Casos de Detección de Bloqueo

| Caso | Condiciones | Resultado |
|------|-------------|-----------|
| **CASO 1** | Mensaje error + redirección a home | 🚫 BLOQUEADO |
| **CASO 2** | Contenido específico (video/post) + error | 🚫 BLOQUEADO |
| **CASO 3** | Mensaje error + título corto + poco contenido | 🚫 BLOQUEADO (NUEVO) |
| **CASO 4** | Mensaje error + clases CSS de error | 🚫 BLOQUEADO (NUEVO) |
| Sin error | Página normal | ✅ ACCESIBLE |
| Solo login | Requiere autenticación | ✅ ACCESIBLE |

---

## ✅ Ventajas de la Nueva Lógica

1. **Más precisa:** Detecta más casos de bloqueo real
2. **Solo Facebook:** La lógica mejorada está **dentro del bloque `if (esFacebook)`**, no afecta a Instagram ni otros sitios
3. **Debug visible:** Muestra análisis completo para entender la decisión
4. **Multi-criterio:** Combina varios indicadores en lugar de depender de uno solo
5. **Maneja casos edge:** Detecta perfiles bloqueados que la lógica anterior no detectaba

---

## 🔒 Garantía de No Afectar Otros Sitios

La lógica mejorada está **exclusivamente dentro del bloque de Facebook:**

```javascript
if (esFacebook) {
  // ... toda la lógica mejorada aquí ...
  console.log(`🔍 ANÁLISIS DE DETECCIÓN (FACEBOOK):`);
  // ...
} else if (esInstagram) {
  // Instagram mantiene su lógica original sin cambios
} else {
  // Otros sitios sin cambios
}
```

**Instagram y otros sitios NO son afectados.**

---

## 🧪 Pruebas Recomendadas

1. Ejecutar con las 4 URLs de prueba
2. Verificar que los logs de DEBUG muestren información clara
3. Confirmar que URLs 2 y 4 sean detectadas como BLOQUEADAS
4. Confirmar que URLs 1 y 3 sean detectadas como ACCESIBLES
5. Verificar que Instagram sigue funcionando igual

---

## 📝 Archivo Modificado

- **Archivo:** `src/services/screenshotService.js`
- **Líneas:** 950-1010
- **Función:** `capturarConPlaywright()`
- **Scope:** Solo Facebook (no afecta Instagram ni otros)

---

## 🚀 Próximos Pasos

1. Probar con las URLs proporcionadas
2. Revisar los logs de DEBUG para entender las detecciones
3. Ajustar umbrales si es necesario (ej: contenido escaso < 1000 chars)
4. Confirmar que la detección funciona correctamente


