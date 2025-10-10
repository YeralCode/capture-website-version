# 🔄 SOPORTE PARA HTTP Y HTTPS

## Fecha: 9 de Octubre, 2025

---

## 📊 RESUMEN

El sistema ahora soporta cargar URLs con **HTTP o HTTPS** según el archivo especificado. Esto es útil para sitios web que solo funcionan con HTTP (como algunos casinos/apuestas).

---

## 🎯 CAMBIOS IMPLEMENTADOS

### 1. ✅ **Protocolo Configurable por Archivo**

Ahora puedes especificar qué protocolo usar para cada archivo de URLs:

**ANTES (solo HTTPS):**
```javascript
const archivosUrls = [
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
  '1203_SITIOS_WEB_11_2024.txt'
];
```
- Todas las URLs se cargaban con `https://`

**AHORA (HTTP o HTTPS configurable):**
```javascript
const archivosUrls = [
  // String simple = HTTPS por defecto
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
  
  // Objeto con protocolo = HTTP
  { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' }
];
```

---

## 🔧 MODIFICACIONES REALIZADAS

### `urlLoader.js`

#### 1. **Función `formatearUrl` - Protocolo configurable**

```javascript
// ANTES:
export function formatearUrl(dominio) {
  if (dominio.startsWith('http://') || dominio.startsWith('https://')) {
    return dominio;
  }
  return `https://${dominio}`; // Siempre HTTPS
}

// AHORA:
export function formatearUrl(dominio, protocolo = 'https') {
  if (dominio.startsWith('http://') || dominio.startsWith('https://')) {
    return dominio;
  }
  return `${protocolo}://${dominio}`; // Protocolo configurable
}
```

#### 2. **Función `cargarUrlsDesdeArchivo` - Acepta protocolo**

```javascript
// ANTES:
export async function cargarUrlsDesdeArchivo(urlsFilePath = 'urls.txt') {
  // ...
  acc.push(formatearUrl(lineaLimpia)); // Siempre HTTPS
  // ...
}

// AHORA:
export async function cargarUrlsDesdeArchivo(urlsFilePath = 'urls.txt', protocolo = 'https') {
  // ...
  acc.push(formatearUrl(lineaLimpia, protocolo)); // Protocolo configurable
  
  const protocoloInfo = protocolo === 'http' ? ' (HTTP)' : ' (HTTPS)';
  console.log(chalk.green(`✅ Cargadas ${urls.length} URLs desde ${urlsFilePath}${protocoloInfo}`));
  // ...
}
```

#### 3. **Función `cargarMultiplesArchivosUrls` - Soporta objetos con protocolo**

```javascript
// ANTES:
export async function cargarMultiplesArchivosUrls(archivosUrls) {
  const resultados = await Promise.allSettled(
    archivosUrls.map(async (archivo) => {
      const urls = await cargarUrlsDesdeArchivo(archivo); // Solo string
      // ...
    })
  );
}

// AHORA:
export async function cargarMultiplesArchivosUrls(archivosUrls) {
  const resultados = await Promise.allSettled(
    archivosUrls.map(async (item) => {
      // Soportar tanto string como objeto { archivo, protocolo }
      const archivo = typeof item === 'string' ? item : item.archivo;
      const protocolo = typeof item === 'string' ? 'https' : (item.protocolo || 'https');
      
      const urls = await cargarUrlsDesdeArchivo(archivo, protocolo);
      // ...
    })
  );
}
```

### `index_integrated.js`

#### **Configuración de archivos con protocolo específico**

```javascript
async cargarUrls() {
  const archivosUrls = [
    // URLs de redes sociales (HTTPS por defecto)
    '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
    
    // URLs de sitios web (HTTP - sitios de casinos/apuestas)
    { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' },
    
    // Otros archivos...
  ];

  const urls = await cargarMultiplesArchivosUrls(archivosUrls);
  // ...
}
```

---

## 📝 USO Y EJEMPLOS

### Ejemplo 1: Archivo con HTTPS (por defecto)

```javascript
const archivosUrls = [
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt'  // HTTPS automático
];
```

**Resultado:**
- `facebook.com` → `https://facebook.com`
- `instagram.com` → `https://instagram.com`

### Ejemplo 2: Archivo con HTTP explícito

```javascript
const archivosUrls = [
  { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' }
];
```

**Resultado:**
- `dollycasino2.com` → `http://dollycasino2.com`
- `vibecasino.com` → `http://vibecasino.com`

### Ejemplo 3: Mezclar HTTP y HTTPS

```javascript
const archivosUrls = [
  // HTTPS por defecto
  '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
  
  // HTTP explícito
  { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' },
  
  // HTTPS explícito (opcional, es el defecto)
  { archivo: 'urls_empresas.txt', protocolo: 'https' }
];
```

---

## 🎯 CASOS DE USO

### 1. **Sitios de Casinos/Apuestas** (HTTP)
Muchos sitios de casinos y apuestas solo funcionan con HTTP:

```javascript
{ archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' }
```

**URLs procesadas:**
- `dollycasino2.com` → `http://dollycasino2.com`
- `vibecasino.com` → `http://vibecasino.com`
- `moolahverse.com` → `http://moolahverse.com`

### 2. **Redes Sociales** (HTTPS)
Facebook, Instagram, Twitter siempre usan HTTPS:

```javascript
'289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt'  // HTTPS automático
```

**URLs procesadas:**
- `facebook.com/perfil` → `https://facebook.com/perfil`
- `instagram.com/usuario` → `https://instagram.com/usuario`

### 3. **Sitios Empresariales** (HTTPS)
La mayoría de sitios empresariales usan HTTPS:

```javascript
'empresas.txt'  // HTTPS automático
```

---

## 📊 VENTAJAS

### 1. ✅ **Flexibilidad Total**
- Cada archivo puede tener su propio protocolo
- HTTPS por defecto para seguridad
- HTTP cuando sea necesario

### 2. ✅ **Compatibilidad Completa**
- Soporta URLs que ya tienen protocolo (`http://` o `https://`)
- No modifica URLs que ya están completas
- Funciona con dominios simples

### 3. ✅ **Información Clara**
```
✅ Cargadas 1203 URLs desde 1203_SITIOS_WEB_11_2024.txt (HTTP)
✅ Cargadas 289 URLs desde 289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt (HTTPS)
```

### 4. ✅ **Retrocompatible**
- Archivos antiguos sin especificar protocolo → HTTPS automático
- No rompe código existente
- Fácil migración

---

## 🔍 COMPORTAMIENTO DETALLADO

### Prioridad de Protocolos:

1. **Si la URL ya tiene protocolo** → Se usa tal cual
   - `http://sitio.com` → `http://sitio.com` ✅
   - `https://sitio.com` → `https://sitio.com` ✅

2. **Si el archivo especifica protocolo** → Se usa el especificado
   - `{ archivo: 'urls.txt', protocolo: 'http' }` → HTTP
   - `{ archivo: 'urls.txt', protocolo: 'https' }` → HTTPS

3. **Si no hay especificación** → HTTPS por defecto
   - `'urls.txt'` → HTTPS

### Ejemplos de Conversión:

| Entrada | Archivo | Protocolo | Resultado |
|---------|---------|-----------|-----------|
| `sitio.com` | Simple | HTTPS (defecto) | `https://sitio.com` |
| `sitio.com` | `{ protocolo: 'http' }` | HTTP | `http://sitio.com` |
| `http://sitio.com` | Cualquiera | Ya tiene | `http://sitio.com` |
| `https://sitio.com` | Cualquiera | Ya tiene | `https://sitio.com` |

---

## 🚀 CONFIGURACIÓN ACTUAL

### `index_integrated.js`:

```javascript
const archivosUrls = [
  // URLs de redes sociales (HTTPS por defecto) - COMENTADO
  // '289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt',
  
  // URLs de sitios web (HTTP - sitios de casinos/apuestas) - ACTIVO
  { archivo: '1203_SITIOS_WEB_11_2024.txt', protocolo: 'http' },
];
```

**Resultado actual:**
- Se procesan 1203 URLs de casinos/apuestas
- Todas con protocolo HTTP
- Optimizado para estos sitios específicos

---

## ⚙️ PARÁMETROS DE CONFIGURACIÓN

### `formatearUrl(dominio, protocolo)`

**Parámetros:**
- `dominio` (string): Dominio a formatear
- `protocolo` (string, opcional): 'http' o 'https' (defecto: 'https')

**Retorna:** URL completa formateada

### `cargarUrlsDesdeArchivo(archivo, protocolo)`

**Parámetros:**
- `archivo` (string): Ruta del archivo
- `protocolo` (string, opcional): 'http' o 'https' (defecto: 'https')

**Retorna:** Array de URLs cargadas

### `cargarMultiplesArchivosUrls(archivos)`

**Parámetros:**
- `archivos` (Array<string|Object>): 
  - String simple: `'archivo.txt'` (HTTPS por defecto)
  - Objeto: `{ archivo: 'archivo.txt', protocolo: 'http' }`

**Retorna:** Array de URLs únicas combinadas

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- ✅ Modificado `formatearUrl` para aceptar protocolo
- ✅ Modificado `cargarUrlsDesdeArchivo` para pasar protocolo
- ✅ Modificado `cargarMultiplesArchivosUrls` para soportar objetos
- ✅ Actualizado `index_integrated.js` con configuración HTTP
- ✅ Información de protocolo en logs
- ✅ Retrocompatibilidad mantenida
- ✅ Verificación de sintaxis OK
- ✅ Documentación completa

---

## 🎉 RESULTADO FINAL

**Antes:**
```
✅ Cargadas 1203 URLs desde 1203_SITIOS_WEB_11_2024.txt
```
Todas las URLs con HTTPS (muchas fallarían)

**Ahora:**
```
✅ Cargadas 1203 URLs desde 1203_SITIOS_WEB_11_2024.txt (HTTP)
```
Todas las URLs con HTTP (funcionan correctamente)

---

**🎊 ¡El sistema ahora soporta HTTP y HTTPS según sea necesario!**


