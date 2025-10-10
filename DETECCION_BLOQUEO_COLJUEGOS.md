# 🚫 DETECCIÓN DE BLOQUEO POR COLJUEGOS (COLOMBIA)

## Fecha: 9 de Octubre, 2025

---

## 📊 RESUMEN

El sistema ahora detecta automáticamente cuando un sitio de apuestas/casino está **bloqueado por Coljuegos** (entidad reguladora de Colombia) y lo marca correctamente en los reportes.

Según [Coljuegos](https://www.coljuegos.gov.co/publicaciones/301824), los sitios de apuestas ilegales en Colombia son redirigidos a una página de advertencia oficial.

---

## 🎯 ¿QUÉ ES COLJUEGOS?

**Coljuegos** (Empresa Industrial y Comercial del Estado) es la entidad colombiana que administra el monopolio de los juegos de suerte y azar en Colombia.

Cuando un sitio de apuestas online es **ilegal en Colombia**, el acceso desde Colombia es bloqueado y redirigido a:
- `https://www.coljuegos.gov.co/publicaciones/301824`

Esta página muestra una advertencia oficial sobre sitios de apuestas ilegales.

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Detección Automática de Redirección**

El sistema detecta cuando una URL es redirigida a Coljuegos:

```javascript
// Detectar redirección a Coljuegos
const urlFinal = screenshot.urlFinal || screenshot.url || urlLimpia;
const esBloqueadoPorColjuegos = urlFinal.includes('coljuegos.gov.co');
```

### 2. **Captura de URL Original y Final**

El sistema ahora captura:
- **URL Original:** La URL que se quería visitar
- **URL Final:** La URL después de redirecciones

**En `screenshotService.js`:**
```javascript
// Capturar URL final después de navegación
try {
  urlFinal = page.url();
  if (urlFinal !== url && urlFinal !== urlNormalizada) {
    console.log(chalk.cyan(`🔄 Redirección detectada: ${url} → ${urlFinal}`));
  }
} catch (e) {
  console.log(chalk.gray(`⚠️ No se pudo obtener URL final: ${e.message}`));
}

// Retornar en resultado
return {
  // ...
  url: url, // URL original
  urlFinal: urlFinal, // URL final (después de redirecciones)
  // ...
};
```

### 3. **Clasificación como Bloqueado**

Cuando se detecta Coljuegos, el resultado se marca como bloqueado:

```javascript
if (esBloqueadoPorColjuegos) {
  console.log(chalk.red(`🚫 SITIO BLOQUEADO POR COLJUEGOS: ${urlLimpia} → ${urlFinal}`));
  console.log(chalk.yellow(`⚠️ Este sitio de apuestas es ilegal en Colombia según Coljuegos`));
  
  return {
    url: urlLimpia, // URL original
    urlFinal: urlFinal, // URL de redirección (Coljuegos)
    tipo,
    exito: false, // Marcar como no exitoso porque está bloqueado
    bloqueadoPorColjuegos: true,
    screenshot: {
      ...screenshot,
      urlOriginal: urlLimpia,
      urlRedireccion: urlFinal
    },
    evaluacionContenido: { 
      tieneContenido: false, 
      razon: 'Bloqueado por Coljuegos (Colombia)',
      detalles: `Sitio de apuestas ilegal redirigido a ${urlFinal}`
    },
    estado: 'BLOQUEADO_COLJUEGOS'
  };
}
```

### 4. **Visualización en PDF**

El PDF ahora muestra:
- URL original del sitio
- URL de redirección (Coljuegos) en rojo
- Estado "Bloqueado: SÍ (Coljuegos)"

**En `pdfGenerator.js`:**
```javascript
// Mostrar URL original
this.pdf.text(`${indice + 1}. URL: ${resultado.url}`, ...);

// Si hay redirección a Coljuegos, mostrarla en rojo
if (resultado.bloqueadoPorColjuegos && resultado.urlFinal && resultado.urlFinal !== resultado.url) {
  this.pdf.setFontSize(9);
  this.pdf.setFont('helvetica', 'italic');
  this.pdf.setTextColor(255, 0, 0); // Rojo para advertencia
  this.pdf.text(`Redirigido a: ${resultado.urlFinal}`, ...);
  this.pdf.setTextColor(0, 0, 0); // Volver a negro
}

// Mostrar estado de bloqueo con motivo
const textoBloqueado = resultado.bloqueadoPorColjuegos 
  ? `${estaBloqueado} (Coljuegos)` 
  : estaBloqueado;
  
this.pdf.text(`Bloqueado: ${textoBloqueado}`, ...);
```

---

## 📝 EJEMPLO DE FUNCIONAMIENTO

### Caso 1: Sitio Bloqueado por Coljuegos

**URL Procesada:**
```
http://dollycasino2.com
```

**Proceso:**
1. Sistema intenta acceder a `http://dollycasino2.com`
2. El sitio redirige a `https://www.coljuegos.gov.co/publicaciones/301824`
3. Sistema detecta la redirección a Coljuegos
4. Marca como bloqueado

**Salida en Consola:**
```
🔄 Redirección detectada: http://dollycasino2.com → https://www.coljuegos.gov.co/publicaciones/301824
🚫 SITIO BLOQUEADO POR COLJUEGOS: http://dollycasino2.com → https://www.coljuegos.gov.co/publicaciones/301824
⚠️ Este sitio de apuestas es ilegal en Colombia según Coljuegos
```

**En el PDF:**
```
1. URL: http://dollycasino2.com
   Redirigido a: https://www.coljuegos.gov.co/publicaciones/301824

Tipo: OTRO
Bloqueado: SÍ (Coljuegos)
Archivo: dollycasino2-com_2025-10-09_14-30-15.png
Tamaño: 856.98 KB

[Screenshot de la página de advertencia de Coljuegos]
```

### Caso 2: Sitio Accesible (No Bloqueado)

**URL Procesada:**
```
http://vibecasino.com
```

**Proceso:**
1. Sistema accede a `http://vibecasino.com`
2. No hay redirección a Coljuegos
3. Marca como accesible

**En el PDF:**
```
2. URL: http://vibecasino.com

Tipo: OTRO
Bloqueado: NO
Archivo: vibecasino-com_2025-10-09_14-30-25.png
Tamaño: 1.2 MB

[Screenshot del sitio real]
```

---

## 🔍 DETECCIÓN EN EVALUACIÓN DE CONTENIDO

El evaluador de contenido del PDF prioriza la detección de Coljuegos:

```javascript
evaluarContenidoConScraping(resultado) {
  // PRIORIDAD 0: Detectar bloqueo por Coljuegos (Colombia)
  if (resultado.bloqueadoPorColjuegos === true) {
    return 'No'; // Bloqueado por autoridades colombianas
  }
  
  // PRIORIDAD 1: Si hay evaluación de contenido del servicio integrado, usarla
  if (resultado.evaluacionContenido) {
    return resultado.evaluacionContenido.tieneContenido ? 'OK' : 'No';
  }
  
  // ... resto de evaluaciones
}
```

---

## 📊 ESTADÍSTICAS

El sistema mantiene estadísticas de sitios bloqueados:

```javascript
// En reportes, se cuenta como:
- Bloqueadas/No disponibles: +1
- No bloqueadas (accesibles): sin cambio

// Con información adicional:
- Razon: "Bloqueado por Coljuegos (Colombia)"
- Detalles: "Sitio de apuestas ilegal redirigido a https://www.coljuegos.gov.co/..."
```

---

## 🎯 VENTAJAS DE ESTA IMPLEMENTACIÓN

### 1. ✅ **Detección Precisa**
- Detecta exactamente qué sitios están bloqueados por autoridades
- Diferencia entre sitios caídos vs bloqueados legalmente

### 2. ✅ **Trazabilidad Completa**
- Guarda URL original y URL de redirección
- El screenshot muestra la página de advertencia de Coljuegos
- Información clara en reportes

### 3. ✅ **Información Legal**
- Identifica sitios de apuestas ilegales en Colombia
- Ayuda a entender el panorama regulatorio
- Documentación oficial de Coljuegos

### 4. ✅ **Reportes Mejorados**
- PDF muestra claramente qué sitios están bloqueados
- Diferencia "Bloqueado: SÍ" de "Bloqueado: SÍ (Coljuegos)"
- URL de redirección visible en rojo

---

## 🔧 CONFIGURACIÓN

No se requiere configuración adicional. La detección es automática.

**Funciona para:**
- Cualquier sitio que redirija a `coljuegos.gov.co`
- Tanto HTTP como HTTPS
- Todos los tipos de URLs (casinos, apuestas, etc.)

---

## 📋 ESTRUCTURA DE DATOS

### Resultado con Bloqueo de Coljuegos:

```javascript
{
  url: "http://dollycasino2.com",                    // URL original
  urlFinal: "https://www.coljuegos.gov.co/...",      // URL final
  tipo: "otro",
  exito: false,                                       // No exitoso (bloqueado)
  bloqueadoPorColjuegos: true,                       // Flag de bloqueo
  screenshot: {
    exito: true,                                      // Screenshot OK (de la página de advertencia)
    nombreArchivo: "dollycasino2-com_2025-10-09.png",
    urlOriginal: "http://dollycasino2.com",          // Guardado en screenshot
    urlRedireccion: "https://www.coljuegos.gov.co/..." // Guardado en screenshot
  },
  evaluacionContenido: {
    tieneContenido: false,
    razon: "Bloqueado por Coljuegos (Colombia)",
    detalles: "Sitio de apuestas ilegal redirigido a ..."
  },
  estado: "BLOQUEADO_COLJUEGOS"
}
```

---

## 🚨 CASOS DE USO

### Caso 1: Auditoría de Sitios de Apuestas
Identificar qué sitios de una lista están bloqueados legalmente en Colombia.

### Caso 2: Análisis de Mercado
Entender qué operadores de apuestas online no están autorizados en Colombia.

### Caso 3: Cumplimiento Legal
Verificar que ciertos sitios efectivamente están bloqueados por las autoridades.

### Caso 4: Documentación
Generar evidencia visual de que un sitio está bloqueado oficialmente.

---

## 📌 IMPORTANTE

- ✅ La detección solo funciona si hay redirección a Coljuegos
- ✅ El screenshot captura la página de advertencia de Coljuegos
- ✅ Se guarda tanto la URL original como la URL de redirección
- ✅ Los sitios bloqueados cuentan como "No disponibles" en estadísticas

---

## 🔗 REFERENCIAS

- [Página de Advertencia de Coljuegos](https://www.coljuegos.gov.co/publicaciones/301824)
- Coljuegos - Empresa Industrial y Comercial del Estado de Colombia
- Administradora del Monopolio Rentístico de los Juegos de Suerte y Azar

---

**🎉 ¡El sistema ahora detecta y documenta correctamente sitios bloqueados por Coljuegos!**


