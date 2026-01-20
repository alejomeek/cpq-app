# DISCUSIÓN: ¿Dónde guardar las credenciales de Wix de forma segura?

**Fecha:** 2026-01-20  
**Contexto:** CePeQu - Jugando y Educando  
**Objetivo:** Pre-cargar credenciales de Wix sin tener que ingresarlas manualmente

---

## 🔴 PROBLEMA ACTUAL

### Situación:
- Usuario tiene que ingresar manualmente API Key y Site ID cada vez que limpia cookies o usa nuevo navegador
- Las credenciales se guardan SOLO en Firestore después del primer ingreso
- No hay forma de pre-cargarlas automáticamente

### Solución inicial propuesta (RECHAZADA):
```javascript
// Variables de entorno Vite
VITE_WIX_API_KEY=IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0...
VITE_WIX_SITE_ID=a290c1b4-e593-4126-ae4e-675bd07c1a42
```

**Problema:** Las variables `VITE_*` SÍ se exponen en el navegador (bundle de frontend)
```javascript
// En el bundle de producción:
console.log(import.meta.env.VITE_WIX_API_KEY)
// → "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0..."
// ⚠️ Cualquiera puede ver esto en DevTools
```

---

## 🛡️ REQUERIMIENTOS DE SEGURIDAD

### 1. API Keys NO deben estar en el código frontend
- ❌ Hardcoded en `.jsx` files
- ❌ Variables de entorno `VITE_*` (se compilan en el bundle)
- ❌ Archivo `.env.local` commiteado

### 2. API Keys NO deben ser visibles en DevTools
- ❌ Network tab (requests desde navegador)
- ❌ Console (variables globales)
- ❌ Source code (bundle JavaScript)

### 3. Usuario NO debe tener que ingresarlas manualmente
- ✅ Pre-cargadas automáticamente
- ✅ Persistentes entre sesiones

---

## 💡 OPCIONES DISPONIBLES

### **OPCIÓN 1: Firestore (ACTUAL) ✅**

**Implementación:**
```javascript
// Las credenciales se guardan después del primer ingreso
usuarios/{userId}/settings/wix_credentials
{
  apiKey: "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0...",
  siteId: "a290c1b4-e593-4126-ae4e-675bd07c1a42",
  updatedAt: Timestamp
}
```

**✅ Pros:**
- Seguro (no expuesto en frontend)
- Multi-usuario (cada usuario tiene sus propias credenciales)
- Ya implementado
- Persiste entre sesiones

**❌ Contras:**
- Usuario tiene que ingresar credenciales UNA VEZ la primera vez
- Si nunca las ingresó, campos quedan vacíos

**Seguridad:** ⭐⭐⭐⭐⭐ (5/5)

---

### **OPCIÓN 2: Cloud Function con Secret Manager**

**Implementación:**
```javascript
// functions/index.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

exports.getWixCredentials = onCall(async (request) => {
  if (!request.auth) throw new Error('Not authenticated');
  
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/app-cpq/secrets/wix-api-key/versions/latest',
  });
  
  return {
    apiKey: version.payload.data.toString(),
    siteId: process.env.WIX_SITE_ID
  };
});
```

**Frontend:**
```javascript
// Llamar Cloud Function para obtener credenciales
const { data } = await getFunctions().httpsCallable('getWixCredentials')();
setApiKey(data.apiKey);
setSiteId(data.siteId);
```

**✅ Pros:**
- Muy seguro (credenciales en Google Secret Manager)
- Centralizadas (actualizas en un solo lugar)
- Multi-entorno (dev/staging/prod)
- Automático (usuario nunca las ve)

**❌ Contras:**
- Requiere Secret Manager ($0.06 per 10K accesos - casi gratis)
- Más complejo de configurar
- Requiere deploy de Cloud Function adicional

**Seguridad:** ⭐⭐⭐⭐⭐ (5/5)  
**Complejidad:** ⭐⭐⭐⭐ (4/5)

---

### **OPCIÓN 3: Cloud Function Inline (Sin Secret Manager)**

**Implementación:**
```javascript
// functions/index.js
exports.syncWixProducts = onRequest({ cors: true }, async (req, res) => {
  // Credenciales hardcoded en la function (NO en env vars)
  const DEFAULT_WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0...";
  const DEFAULT_WIX_SITE_ID = "a290c1b4-e593-4126-ae4e-675bd07c1a42";
  
  const { userId } = req.body;
  
  // Intentar obtener credenciales de Firestore primero
  const userCreds = await getUserCredentials(userId);
  
  const apiKey = userCreds?.apiKey || DEFAULT_WIX_API_KEY;
  const siteId = userCreds?.siteId || DEFAULT_WIX_SITE_ID;
  
  // ... resto del código
});
```

**Frontend:**
```javascript
// NO necesita pasar credenciales - la function las tiene
await fetch('/api/sync-wix', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

**✅ Pros:**
- Seguro (credenciales en backend, no frontend)
- Simple (sin Secret Manager)
- Gratis (no costos adicionales)
- Usuario nunca ve las credenciales

**❌ Contras:**
- Credenciales en código fuente (visible para developers)
- Si rotan credenciales → redeploy function
- No multi-entorno fácil

**Seguridad:** ⭐⭐⭐⭐ (4/5)  
**Complejidad:** ⭐⭐ (2/5)

---

### **OPCIÓN 4: Firebase Remote Config**

**Implementación:**
```javascript
// Frontend lee Remote Config
import { getRemoteConfig, fetchAndActivate, getString } from 'firebase/remote-config';

const remoteConfig = getRemoteConfig();
await fetchAndActivate(remoteConfig);

const apiKey = getString(remoteConfig, 'wix_api_key');
const siteId = getString(remoteConfig, 'wix_site_id');
```

**❌ Pros:**
- Centralizado en Firebase Console
- Se puede cambiar sin redeploy

**🔴 Contras:**
- **LAS CREDENCIALES SE EXPONEN EN EL FRONTEND** (igual que VITE_*)
- NO es seguro para API keys sensibles
- Firebase Remote Config NO está diseñado para secrets

**Seguridad:** ⭐ (1/5) ❌ NO USAR PARA API KEYS

---

## 🎯 COMPARACIÓN RESUMIDA

| Opción | Seguridad | Complejidad | Costo | User Input | Recomendación |
|--------|-----------|-------------|-------|------------|---------------|
| **1. Firestore (actual)** | ⭐⭐⭐⭐⭐ | ⭐ | $0 | 1 vez | ✅ Buena |
| **2. Secret Manager** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0 | Nunca | ⭐ Mejor (empresas) |
| **3. Inline Function** | ⭐⭐⭐⭐ | ⭐⭐ | $0 | Nunca | ✅ Práctica |
| **4. Remote Config** | ⭐ | ⭐⭐ | $0 | Nunca | ❌ NO usar |

---

## 🤔 ANÁLISIS DE TU CASO ESPECÍFICO

### Tu situación:
- **Usuarios:** 2 tiendas (Barranquilla y Medellín)
- **Credenciales:** Las mismas para ambas cuentas (mismo Wix)
- **Rotation:** Raro que cambien las API keys de Wix
- **Team:** Solo tú como developer

### Factores a considerar:
1. **¿Las credenciales cambian frecuentemente?** → No
2. **¿Múltiples developers?** → No
3. **¿Multi-tenant con diferentes Wix por usuario?** → No (mismo Wix)
4. **¿Nivel de paranoia de seguridad?** → Alto/Medio/Bajo?

---

## 💬 PREGUNTAS PARA DISCUTIR CON CLAUDE CODE

1. **¿Qué tan sensible es tu Wix API Key?**
   - ¿Puede causar daño económico si se expone? (ej: API de pagos)
   - ¿O solo permite leer productos públicos?

2. **¿Prefieres simplicidad o máxima seguridad?**
   - Opción 3 (Inline Function) = Simple, suficientemente seguro
   - Opción 2 (Secret Manager) = Máxima seguridad, más complejo

3. **¿Cuál es tu workflow ideal?**
   - **A)** Usuario NUNCA ingresa credenciales → Opción 2 o 3
   - **B)** Usuario ingresa UNA VEZ al crear cuenta → Opción 1 (actual)

4. **¿Qué pasa si las credenciales se filtran?**
   - ¿Alguien malicioso podría hacer daño con ellas?
   - ¿O solo pueden leer tu catálogo público?

---

## 🎯 MI RECOMENDACIÓN INICIAL

**Para tu caso específico:**

### **OPCIÓN 3 (Inline Function) ⭐**

**Por qué:**
- ✅ Mismo nivel de seguridad que necesitas (credenciales en backend)
- ✅ Simple de implementar (10 minutos)
- ✅ Usuario nunca las ve
- ✅ Fallback automático: si usuario tiene credenciales personalizadas en Firestore → las usa, sino → usa las default
- ✅ Gratis
- ✅ No requiere configuración adicional

**Implementar:**
1. Modificar `functions/index.js`
2. Agregar credenciales default inline
3. Modificar frontend para NO pasar credenciales
4. Deploy
5. Listo

**Tiempo:** ~10-15 minutos

---

## 📋 SIGUIENTE PASO

Discute con Claude Code:
1. Si estás de acuerdo con Opción 3
2. Si prefieres Opción 2 (más enterprise)
3. O si quieres quedarte con Opción 1 (actual) y no cambiar nada

Una vez decidido, Claude Code puede implementarlo.

---

**Documento creado:** 2026-01-20 17:30  
**Para discusión con:** Claude Code  
**Decisión final:** [Pendiente]
