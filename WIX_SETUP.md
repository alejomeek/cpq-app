# Configuración de Integración con Wix API

## 🏗️ Arquitectura

La sincronización de productos desde Wix usa la siguiente arquitectura:

```
Frontend (React)
    ↓ fetch('/api/sync-wix')
Vercel Edge Function (api/sync-wix.js)
    ↓ Evita CORS
Wix API (https://www.wixapis.com)
    ↓ Retorna productos con paginación
Firebase Firestore (usuarios/{userId}/productos)
```

**¿Por qué necesitamos Edge Function?**
- Wix API bloquea peticiones directas desde navegadores por política CORS
- La Edge Function actúa como proxy backend para evitar este problema

---

## 📋 Variables de Entorno Necesarias

### Para Desarrollo Local (Testing con Vercel Dev)

Crear `.env.local` en la raíz del proyecto:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=cotizaciones-app-f7a00
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cotizaciones-app-f7a00.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**¿Dónde obtener estas credenciales?**
1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar proyecto: `cotizaciones-app-f7a00`
3. Ir a Project Settings → Service Accounts
4. Click en "Generate new private key"
5. Descargar archivo JSON
6. Copiar los valores al `.env.local`

**⚠️ IMPORTANTE:**
- Nunca commitear `.env.local` a Git (ya está en .gitignore)
- La private key debe tener `\n` literales (no saltos de línea reales)

---

### Para Producción (Vercel Dashboard)

Configurar en: **Vercel Dashboard → Project cpq-app → Settings → Environment Variables**

Agregar las siguientes variables:

| Variable | Valor | Scope |
|----------|-------|-------|
| `FIREBASE_PROJECT_ID` | `cotizaciones-app-f7a00` | Production, Preview |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@...` | Production, Preview |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Production, Preview |

**Notas:**
- Usar scope "Production, Preview" para que funcione en todos los environments
- La private key debe estar entrecomillada y con `\n` literales

---

## 🧪 Testing Local

### Paso 1: Instalar Dependencias

```bash
npm install
```

Esto instalará `firebase-admin` automáticamente.

### Paso 2: Configurar Variables de Entorno

Crear `.env.local` con las credenciales de Firebase Admin (ver sección anterior).

### Paso 3: Iniciar Vercel Dev

```bash
npm install -g vercel  # Solo la primera vez
vercel dev
```

Esto iniciará:
- Frontend en `http://localhost:3000`
- Edge Functions en `/api/*`

**Alternativa (sin Vercel CLI):**
```bash
npm run dev
```

Pero NO funcionará la Edge Function localmente (solo en producción).

### Paso 4: Probar Sincronización

1. Abrir `http://localhost:3000`
2. Login con usuario existente
3. Ir a **Configuración → Integración Wix**
4. Ingresar credenciales:
   - **API Key:** `IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0...`
   - **Site ID:** `a290c1b4-e593-4126-ae4e-675bd07c1a42`
5. Click en **"Sincronizar Ahora"**
6. Esperar ~20-40 segundos
7. Verificar mensaje: **"✅ ~1000 productos sincronizados exitosamente"**

### Paso 5: Verificar Resultados

1. Ir a **Catálogo**
2. Deberías ver ~1000 productos de Jugando y Educando
3. Verificar que tienen:
   - SKU
   - Nombre
   - Precio
   - Imagen (URL de Wix)
   - Inventario

---

## 🚀 Deploy a Producción

### Método 1: Git Push (Recomendado)

```bash
git add .
git commit -m "feat: add Wix API integration"
git push origin main
```

Vercel detectará automáticamente:
- El nuevo archivo `api/sync-wix.js`
- Las actualizaciones en `vercel.json`
- Y desplegará todo

### Método 2: Vercel CLI

```bash
vercel --prod
```

---

## 🔧 Troubleshooting

### Error: "Firebase Admin already initialized"

**Causa:** La Edge Function intenta inicializar Firebase Admin múltiples veces.

**Solución:** Ya está manejado en el código con try/catch:
```javascript
try {
  adminApp = initializeApp({ ... });
} catch (error) {
  // Ya inicializado
}
```

### Error: "CORS policy blocked"

**Causa:** Intentando llamar a Wix API directamente desde el frontend.

**Solución:** Asegúrate de que `wixService.js` llama a `/api/sync-wix` y NO a `https://www.wixapis.com` directamente.

### Error: "Missing required fields"

**Causa:** La Edge Function no recibe `apiKey`, `siteId` o `userId`.

**Solución:** Verificar que `WixIntegrationModule.jsx` envía correctamente:
```javascript
body: JSON.stringify({ apiKey, siteId, userId })
```

### Error: "Firebase Admin credentials not found"

**Causa:** Variables de entorno no configuradas en Vercel.

**Solución:**
1. Ir a Vercel Dashboard → Settings → Environment Variables
2. Agregar las 3 variables (ver sección de producción)
3. Redesplegar: `git push` o `vercel --prod --force`

### Sincronización lenta (>60 segundos)

**Causa:** Wix tiene muchos productos y la función está alcanzando el timeout.

**Solución:** El código ya implementa paginación cursor-based que maneja TODOS los productos. Si aún es lento:
1. Verificar que `vercel.json` tiene `maxDuration: 60`
2. Considerar dividir en múltiples requests (no necesario para ~1000 productos)

---

## 📊 Resultado Esperado

Después de una sincronización exitosa:

- ✅ ~1000 productos en Firestore: `usuarios/{userId}/productos/{sku}`
- ✅ Timestamp de última sincronización: `usuarios/{userId}/settings/wix_sync`
- ✅ Frontend muestra: "✅ 1023 productos sincronizados exitosamente"
- ✅ Tiempo de ejecución: 20-40 segundos
- ✅ Productos visibles en Catálogo inmediatamente

---

## 🔐 Seguridad

- ✅ Las credenciales de Wix se envían en el body (no expuestas en URL)
- ✅ La Edge Function valida que todos los campos requeridos estén presentes
- ✅ La private key de Firebase nunca se expone al frontend
- ✅ Firestore rules deben validar que `userId` coincide con el usuario autenticado

**Regla de Firestore recomendada:**
```javascript
match /usuarios/{userId}/productos/{productId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 📝 Mantenimiento

### ¿Con qué frecuencia sincronizar?

Según el documento del proyecto:
- **Recomendado:** 1-2 veces al día (mañana al llegar)
- **Si hay cambio urgente:** Sincronizar manualmente
- **Productos educativos:** Los precios no cambian frecuentemente

### Auto-Sync (OPCIONAL - Fase 2)

**NO implementar ahora.** Solo si usuarios reportan problemas por olvidar sincronizar.

Requeriría:
- Firebase Scheduled Function (ejecuta cada 12 horas)
- Activar Blaze Plan (billing) en Firebase
- Deploy con `firebase deploy --only functions`

---

**Última actualización:** 2026-01-19
**Autor:** Claude Code (Sonnet 4.5)
