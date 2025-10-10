# 🧪 TEST RÁPIDO: Detección de Bloqueo por Coljuegos

## ⚡ Ejecución Rápida

```bash
node test-coljuegos-detection.js
```

## 📋 URLs de Prueba (4 sitios)

Las siguientes URLs de sitios de apuestas serán probadas con **HTTP**:

1. `http://02789bet.com`
2. `http://050p.bet`
3. `http://057317.win`
4. `http://064452.win`

## ✅ Resultado Esperado

**TODAS** las URLs deben:
- 🔄 Redirigir a: `https://www.coljuegos.gov.co/publicaciones/301824`
- 🚫 Marcarse como: **"Bloqueado: SÍ (Coljuegos)"**
- 📸 Screenshot: Página de advertencia de Coljuegos

## 📊 Verificación en PDF

Abre el PDF generado en `output/` y verifica:

```
1. URL: http://02789bet.com
   Redirigido a: https://www.coljuegos.gov.co/publicaciones/301824

Tipo: OTRO
Bloqueado: SÍ (Coljuegos)  ← ESTO DEBE APARECER
```

## 📝 Configuración Actual

**Archivo:** `289_perfiles_redes_sociales_10_12_2024_LIMPIO.txt`
**Protocolo:** HTTP (configurado en `index_integrated.js`)

## 🎯 Criterio de Éxito

✅ Test exitoso si:
- 4 de 4 URLs bloqueadas por Coljuegos
- PDF muestra "(Coljuegos)" en todas
- Screenshots muestran advertencia oficial

## 📚 Documentación Completa

Ver: `INSTRUCCIONES_TEST_COLJUEGOS.md`

---

**🚀 ¡Ejecuta el test ahora!**
```bash
node test-coljuegos-detection.js
```


