# ⚡ Inicio Rápido - Sistema de Sesiones Persistentes

## 🎯 Para ejecutar desde cero

### Opción 1: Ejecución normal (recomendada)
```bash
node src/index_integrated.js
```

**¿Qué pasará?**
1. 🔐 El navegador se abrirá (VISIBLE) 
2. 📝 Ingresará automáticamente las credenciales de Facebook
3. ⏰ **ESPERARÁ 1 MINUTO** ← Si ves un captcha, resuélvelo ahora
4. 💾 Guardará la sesión de Facebook
5. 📝 Ingresará automáticamente las credenciales de Instagram  
6. ⏰ **ESPERARÁ 1 MINUTO** ← Si ves un captcha, resuélvelo ahora
7. 💾 Guardará la sesión de Instagram
8. 🚀 Comenzará a capturar screenshots

**Durante el 1 minuto:**
- Verás un contador en la terminal: `⏳ Tiempo restante: 60 segundos...`
- Si hay captcha → Resuélvelo en el navegador visible
- Si no hay captcha → Solo espera tranquilamente

---

### Opción 2: Verificar sesiones guardadas
```bash
node test-sesiones.js
```

**Te mostrará:**
- ✅ Si tienes sesiones guardadas de Facebook/Instagram
- 📅 Cuándo se guardaron
- 🍪 Cuántas cookies hay
- 📏 Tamaño de los archivos

---

### Opción 3: Forzar nuevo login (eliminar sesiones)
```bash
rm -rf sesiones/
node src/index_integrated.js
```

**Útil cuando:**
- Cambiaste las contraseñas
- Las sesiones expiraron
- Quieres empezar desde cero

---

## 📊 Diferencia entre Primera vez vs. Siguientes veces

### 🆕 Primera ejecución (NO hay cookies)
```
⏰ Tiempo estimado: ~2.5-3.5 minutos
  
  - Login Facebook: 65 segundos
  - Login Instagram: 65 segundos  
  - Procesamiento de URLs: variable
```

### ⚡ Ejecuciones siguientes (CON cookies guardadas)
```
⚡ Tiempo estimado: mucho más rápido!
  
  - Verificación Facebook: 3 segundos ✅
  - Verificación Instagram: 3 segundos ✅
  - Procesamiento de URLs: variable
```

**Ahorro: ~2 minutos por ejecución** 🎉

---

## 🔍 Mensajes importantes que verás

### ✅ Sesión reutilizada (BUENO)
```
🎉 Usando sesión guardada de Facebook (sin necesidad de login)
✅ Sesión de Facebook válida y reutilizada
```
**Significa:** No necesitas hacer login, las cookies funcionan.

---

### ⚠️ Sesión expiró (NORMAL)
```
⚠️ Sesión guardada expiró, realizando nuevo login...
```
**Significa:** Las cookies expiraron, se hará login nuevamente.

---

### ⏰ Esperando intervención (ACCIÓN REQUERIDA)
```
⏰ Esperando 1 minuto para permitir intervención manual...
   Si necesitas resolver un captcha o verificación, hazlo ahora.
   ⏳ Tiempo restante: 55 segundos...
```
**Qué hacer:**
- Si ves captcha en el navegador → Resuélvelo
- Si NO ves captcha → Solo espera
- Tienes 1 minuto completo

---

## 🎓 Comandos útiles

### Ver sesiones guardadas
```bash
node test-sesiones.js
```

### Eliminar sesión de Facebook solamente
```bash
rm sesiones/facebook_cookies.json
```

### Eliminar sesión de Instagram solamente
```bash
rm sesiones/instagram_cookies.json
```

### Eliminar TODAS las sesiones
```bash
rm -rf sesiones/
```

### Ver contenido de las cookies (avanzado)
```bash
cat sesiones/facebook_cookies.json | jq
cat sesiones/instagram_cookies.json | jq
```

---

## 🚨 Solución de problemas rápida

### "No se pudo iniciar sesión"
**Solución:**
```bash
# 1. Eliminar sesiones
rm -rf sesiones/

# 2. Ejecutar de nuevo
node src/index_integrated.js

# 3. Durante el 1 minuto, resolver cualquier verificación
```

---

### "Sesión expiró muy rápido"
**Posibles causas:**
- Cambio de contraseña
- IP diferente
- Facebook/Instagram detectó actividad sospechosa

**Solución:**
```bash
rm -rf sesiones/
node src/index_integrated.js
# Resolver captchas con cuidado
```

---

### "El navegador se cierra solo"
**Solución:**
- Asegúrate que `usarNavegadorReal: true` en la configuración
- No cierres el navegador manualmente durante la ejecución

---

## 📁 Estructura de archivos

```
sesiones/                           ← Se crea automáticamente
├── facebook_cookies.json          ← Sesión de Facebook
└── instagram_cookies.json         ← Sesión de Instagram
```

**IMPORTANTE:** 
- ⛔ NO subas estos archivos a Git (ya están en `.gitignore`)
- ⛔ NO compartas estos archivos
- ✅ Están solo en tu computadora local

---

## 💡 Tips

1. **Primera vez:** Ten paciencia durante el 1 minuto de espera
2. **Captchas:** Resuélvelos con calma, tienes tiempo
3. **Sesiones:** Una vez guardadas, duran varios días
4. **Verificar:** Usa `node test-sesiones.js` para ver el estado
5. **Limpiar:** Borra `sesiones/` si algo falla

---

## 🎯 Flujo recomendado

```bash
# 1. Verificar estado actual
node test-sesiones.js

# 2. Si no hay sesiones o expiraron, ejecutar
node src/index_integrated.js

# 3. Durante login, estar atento a captchas (1 minuto)

# 4. Una vez guardadas, las ejecuciones serán automáticas y rápidas
```

---

## 📞 Ayuda adicional

- 📖 **Guía completa:** Lee `INSTRUCCIONES_SESIONES.md`
- 📝 **Cambios técnicos:** Lee `CHANGELOG_SESIONES.md`
- 🔍 **Verificar sesiones:** `node test-sesiones.js`
- 🔍 **Depurar login de Instagram:** `node src/test-instagram-login.mjs`

---

## ✨ ¡Listo para comenzar!

```bash
# Comando principal
node src/index_integrated.js
```

**Recuerda:** 
- ⏰ Espera 1 minuto después de login
- 🔍 Resuelve captchas si aparecen
- 💾 Las sesiones se guardan automáticamente
- ⚡ La próxima vez será mucho más rápida 