# 🔐 Sistema de Sesiones Persistentes para Facebook e Instagram

## 📋 ¿Cómo funciona?

El sistema ahora tiene **DOS mejoras importantes**:

### 1. ⏰ Tiempo de espera extendido (1 minuto)
Cuando inicias sesión por primera vez, el sistema espera **1 minuto** después de ingresar las credenciales. Esto te permite:
- ✅ Resolver captchas manualmente
- ✅ Completar verificaciones de dos pasos
- ✅ Aprobar notificaciones en tu teléfono
- ✅ Cualquier intervención manual necesaria

### 2. 💾 Sesiones guardadas y reutilizables
Una vez que inicias sesión exitosamente, las **cookies de sesión se guardan** en archivos:
- `sesiones/facebook_cookies.json` - Sesión de Facebook
- `sesiones/instagram_cookies.json` - Sesión de Instagram

**La próxima vez que ejecutes el programa, NO tendrás que iniciar sesión de nuevo**. El sistema:
1. Carga las cookies guardadas
2. Verifica que la sesión sigue válida
3. Si es válida, continúa sin login
4. Si expiró, pide login nuevamente

---

## 🚀 Cómo usar

### Primera ejecución (Login inicial)

```bash
node src/index_integrated.js
```

**Proceso automático:**
1. El programa abre el navegador visible
2. Navega a Facebook e ingresa las credenciales
3. ⏰ **ESPERA 1 MINUTO** - Si hay captcha o verificación, resuélvelo ahora
4. Guarda la sesión de Facebook
5. Navega a Instagram e ingresa las credenciales  
6. ⏰ **ESPERA 1 MINUTO** - Si hay captcha o verificación, resuélvelo ahora
7. Guarda la sesión de Instagram
8. Comienza a procesar las URLs

**Durante el 1 minuto:**
- Verás un contador regresivo en la terminal
- Si necesitas resolver un captcha, hazlo en el navegador visible
- Si todo está bien, solo espera que termine la cuenta regresiva

### Ejecuciones siguientes (Sesiones guardadas)

```bash
node src/index_integrated.js
```

**Proceso optimizado:**
1. ✅ Detecta cookies guardadas de Facebook
2. ✅ Verifica que la sesión sigue válida
3. ✅ Reutiliza la sesión (SIN LOGIN)
4. ✅ Detecta cookies guardadas de Instagram
5. ✅ Verifica que la sesión sigue válida
6. ✅ Reutiliza la sesión (SIN LOGIN)
7. ▶️ Comienza inmediatamente a procesar URLs

**¡No más logins repetidos! 🎉**

---

## 🔄 Si las sesiones expiran

Si las cookies expiran (generalmente después de varios días):
1. El sistema detecta automáticamente que la sesión no es válida
2. Muestra: `⚠️ Sesión guardada expiró, realizando nuevo login...`
3. Vuelve a hacer el proceso de login con 1 minuto de espera
4. Guarda las nuevas cookies

---

## 📁 Archivos de sesión

Las cookies se guardan en:
```
sesiones/
├── facebook_cookies.json
└── instagram_cookies.json
```

**NO COMPARTAS ESTOS ARCHIVOS** - Contienen tus sesiones activas.

Si quieres forzar un nuevo login, simplemente elimina estos archivos:
```bash
rm -rf sesiones/
```

---

## 🛡️ Seguridad

- Las cookies se guardan localmente en tu máquina
- No se comparten ni se suben a ningún servidor
- Son específicas de tu sesión
- Puedes eliminarlas en cualquier momento

---

## 💡 Ventajas

### Antes:
- ❌ Login en cada ejecución
- ❌ Resolver captchas cada vez
- ❌ Proceso lento
- ❌ Riesgo de bloqueo por múltiples logins

### Ahora:
- ✅ Login solo la primera vez (o cuando expira)
- ✅ 1 minuto para resolver captchas
- ✅ Sesiones reutilizadas automáticamente
- ✅ Proceso mucho más rápido
- ✅ Menos riesgo de bloqueo

---

## 🎯 Ejemplo de uso

### Primera vez:
```
🔑 Iniciando autenticación de Facebook...
📝 No se encontraron cookies guardadas
🔐 Realizando login manual en Facebook...
📝 Rellenando credenciales...
🚪 Enviando login...
⏰ Esperando 1 minuto para permitir intervención manual...
   ⏳ Tiempo restante: 60 segundos...
   ⏳ Tiempo restante: 59 segundos...
   ... (resuelve captcha si aparece) ...
   ⏳ Tiempo restante: 1 segundos...

✅ Login de Facebook completamente exitoso
✅ Cookies guardadas en: sesiones/facebook_cookies.json
```

### Segunda vez (y siguientes):
```
🔑 Iniciando autenticación de Facebook...
✅ Cookies cargadas desde: sesiones/facebook_cookies.json
🎉 Usando sesión guardada de Facebook (sin necesidad de login)
✅ Sesión de Facebook válida y reutilizada

🎉 ¡PERFECTO! Comenzando proceso de capturas...
```

---

## 🔧 Configuración

Las credenciales están en `src/services/screenshotService.js`:

```javascript
const FACEBOOK_CREDENTIALS = {
  username: "3022159238",
  password: "6897861Yps@"
};

const INSTAGRAM_CREDENTIALS = {
  username: "ypulido2004@gmail.com",
  password: "6897861Yps@"
};
```

---

## ❓ Preguntas frecuentes

**P: ¿Cuánto duran las sesiones guardadas?**
R: Generalmente varios días o semanas, depende de Facebook/Instagram.

**P: ¿Puedo usar esto en diferentes computadoras?**
R: No, las cookies son específicas de cada máquina. Tendrás que hacer login inicial en cada una.

**P: ¿Qué pasa si cambio mi contraseña?**
R: Elimina las cookies guardadas y haz login de nuevo con la nueva contraseña.

**P: ¿Puedo desactivar la espera de 1 minuto?**
R: Sí, puedes modificar el número en el código, pero no es recomendable (puede fallar con captchas).

---

## 🎉 ¡Listo!

Ahora tu proceso de captura es mucho más eficiente:
- Login solo cuando sea necesario
- Sesiones reutilizadas automáticamente
- Tiempo para resolver verificaciones manualmente
- Proceso más rápido y confiable