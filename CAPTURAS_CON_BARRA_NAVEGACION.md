# 📸 Capturas de Pantalla con Barra de Navegación Real

## 🎯 Objetivo
Este documento explica cómo el sistema captura pantallas mostrando la **barra de navegación real** del navegador usando herramientas nativas de Ubuntu, en lugar de recrear un navegador simulado.

## ✅ Herramientas Requeridas (Ya instaladas en tu sistema)

Tu sistema Ubuntu ya tiene las siguientes herramientas instaladas:

1. ✅ **xdotool** - Identifica ventanas del sistema
2. ✅ **ImageMagick (import)** - ⭐ MEJOR OPCIÓN - Captura con marco de ventana
3. ✅ **gnome-screenshot** - Captura nativa de GNOME
4. ✅ **scrot** - Captura rápida y ligera

## 🔧 Cómo Funciona

### Flujo de Captura

```
1. Playwright abre navegador REAL (headless: false)
   ↓
2. Navega a la URL solicitada
   ↓
3. Espera a que la página cargue completamente
   ↓
4. Identifica la ventana del navegador con xdotool
   ↓
5. Captura con herramientas del sistema:
   
   Intento 1: ImageMagick (import)
      ├─ Captura ventana específica con marco
      └─ Incluye barra de título y navegación
   
   Intento 2: gnome-screenshot
      ├─ Captura ventana enfocada
      └─ Nativo de GNOME
   
   Intento 3: scrot
      ├─ Captura ventana activa
      └─ Rápido y eficiente
   
   Fallback: Playwright screenshot
      └─ Sin barra de navegación (último recurso)
```

### Métodos de Captura Implementados

#### 🥇 Método 1: ImageMagick (import) - RECOMENDADO
```bash
import -window <ID_VENTANA> -frame "screenshot.png"
```
**Ventajas:**
- ✅ Captura con borde y decoraciones de ventana
- ✅ Incluye barra de título y navegación
- ✅ Alta calidad de imagen
- ✅ Funciona con ID de ventana específico

#### 🥈 Método 2: gnome-screenshot
```bash
gnome-screenshot -w -f "screenshot.png"
```
**Ventajas:**
- ✅ Nativo de GNOME Desktop
- ✅ Captura ventana enfocada automáticamente
- ✅ Incluye decoraciones de ventana

#### 🥉 Método 3: scrot
```bash
scrot -u -z "screenshot.png"
```
**Ventajas:**
- ✅ Muy rápido
- ✅ Ligero (bajo consumo de recursos)
- ✅ Captura ventana activa

#### 🔄 Método 4: maim (Opcional)
```bash
maim -i <ID_VENTANA> "screenshot.png"
```
**Ventajas:**
- ✅ Alternativa moderna a scrot
- ✅ Mejor manejo de múltiples monitores

## 🚀 Uso

El sistema está configurado para usar **navegador real visible** por defecto:

```javascript
const configuracion = {
  usarNavegadorReal: true,  // ← Ya configurado por defecto
  width: 1920,
  height: 1080
};
```

### Ejemplo de Captura

```javascript
const service = new ScreenshotService({
  directorioSalida: './screenshots',
  usarNavegadorReal: true  // Navegador visible con captura de sistema
});

await service.inicializarConInstagram();
await service.capturarScreenshot('https://example.com', 1, true);
```

## 🔍 Identificación de Ventanas

El sistema usa **dos estrategias** para identificar la ventana del navegador:

### Estrategia 1: Búsqueda por Nombre
```bash
xdotool search --name "Chrome" | head -1
```
Busca ventanas que contengan "Chrome" en el título.

### Estrategia 2: Ventana Activa (Fallback)
```bash
xdotool getactivewindow
```
Usa la ventana actualmente enfocada.

## 📊 Comparación: Antes vs Después

### ❌ Antes (Navegador Simulado)
- Screenshot de Playwright sin barra de navegación
- Marco HTML/CSS simulado
- No muestra URL real en barra de direcciones
- Parece captura de contenido web, no de navegador

### ✅ Después (Navegador Real)
- Screenshot del sistema con barra de navegación real
- URL visible en barra de direcciones
- Botones de navegación (atrás, adelante, recargar)
- Parece captura de navegador real (porque lo es)

## 🛠️ Instalación de Herramientas Faltantes

Si alguna herramienta no está instalada, ejecuta:

```bash
./install_screenshot_tools.sh
```

O instala manualmente:

```bash
# Todas las herramientas recomendadas
sudo apt update
sudo apt install -y xdotool imagemagick gnome-screenshot scrot

# Opcional: maim (alternativa moderna)
sudo apt install -y maim
```

## 🐛 Solución de Problemas

### Problema: "Captura de sistema falló"

**Solución 1:** Verifica que el navegador esté visible
```javascript
usarNavegadorReal: true  // Debe estar en true
```

**Solución 2:** Verifica herramientas instaladas
```bash
which import        # ImageMagick
which gnome-screenshot
which scrot
which xdotool
```

**Solución 3:** Aumenta tiempo de espera
```javascript
await page.waitForTimeout(2000);  // Más tiempo antes de captura
```

### Problema: "No se pudo obtener window ID"

**Causa:** xdotool no encuentra la ventana del navegador

**Solución:**
1. Asegúrate de que el navegador esté visible (no minimizado)
2. Verifica que xdotool esté instalado: `which xdotool`
3. El sistema usará ventana activa como fallback automáticamente

### Problema: "Screenshot muy pequeño o vacío"

**Causa:** La captura se hizo antes de que la página cargara

**Solución:**
```javascript
// Aumentar delay en configuración
const configuracion = {
  delay: 10,  // Aumentar de 8 a 10 segundos
  timeout: 40 // Aumentar timeout
};
```

## 📝 Notas Técnicas

### Tiempos de Espera Implementados

1. **Carga de página:** 2-3 segundos después de `domcontentloaded`
2. **Estabilización:** 1 segundo adicional antes de captura
3. **Captura del sistema:** 1.5 segundos para renderizado completo
4. **Total por captura:** ~5-7 segundos

### Calidad de Imagen

- **Formato:** PNG (sin pérdida)
- **Resolución:** 1920x1080 por defecto
- **Tamaño promedio:** 200-500 KB por screenshot

### Compatibilidad

✅ **Funciona en:**
- Ubuntu 20.04+
- Linux Mint
- Debian con GNOME/KDE
- Pop!_OS
- Elementary OS

❌ **No funciona en:**
- Servidores sin GUI (headless servers)
- Ambientes Docker sin X11
- WSL sin X server

**Solución para servidores:** El sistema automáticamente usa fallback de Playwright (sin barra de navegación).

## 🎓 Código Relevante

### Método Principal: `capturarVentanaCompleta()`

```javascript
async capturarVentanaCompleta(rutaCompleta, page) {
  // 1. Obtener ID de ventana
  const windowId = execSync('xdotool search --name "Chrome"');
  
  // 2. Intentar métodos de captura
  // Método 1: ImageMagick (mejor)
  execSync(`import -window ${windowId} -frame "${tempPath}"`);
  
  // Método 2: gnome-screenshot
  execSync(`gnome-screenshot -w -f "${tempPath}"`);
  
  // Método 3: scrot
  execSync(`scrot -u -z "${tempPath}"`);
  
  // 3. Mover archivo a ubicación final
  await fs.copyFile(tempPath, rutaCompleta);
}
```

## 📈 Mejoras Futuras

- [ ] Soporte para captura de región específica
- [ ] Opción para ocultar barra de navegación en captura
- [ ] Marcas de agua automáticas con timestamp
- [ ] Soporte para múltiples monitores
- [ ] Captura de pestañas específicas en ventana con múltiples tabs

## 🔗 Referencias

- [ImageMagick Documentation](https://imagemagick.org/script/command-line-tools.php#import)
- [xdotool Manual](https://manpages.ubuntu.com/manpages/focal/man1/xdotool.1.html)
- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts)
- [GNOME Screenshot](https://help.gnome.org/users/gnome-help/stable/screen-shot-record.html)

---

**Última actualización:** $(date '+%Y-%m-%d')
**Versión:** 2.0
**Estado:** ✅ Funcional con navegador real

