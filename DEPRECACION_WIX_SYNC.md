# Deprecación de Integración con Wix - Resumen de Cambios

**Fecha:** 2026-02-06  
**Motivo:** Migración a sistema de sincronización externo desde Master Database

---

## 🎯 Objetivo

Eliminar completamente la funcionalidad de sincronización manual con Wix de la App CPQ, ya que ahora los productos se sincronizan externamente mediante el script `cpq-sync.js` desde Master Database.

---

## ✅ Cambios Realizados

### 1. **Frontend - Eliminación de UI**

#### `src/componentes/configuracion/SettingsPage.jsx`
- ❌ Eliminado import: `import WixIntegrationModule from './WixIntegrationModule.jsx'`
- ❌ Eliminado tab "Integración Wix" de la interfaz
- ✅ Cambiado grid de tabs de `grid-cols-5` a `grid-cols-4`
- ✅ Tabs restantes: Condiciones de Pago, Impuestos, Estilos de Cotización, Empresa

**Antes:**
```jsx
<TabsList className="grid w-full grid-cols-5 max-w-5xl">
  <TabsTrigger value="condiciones">Condiciones de Pago</TabsTrigger>
  <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
  <TabsTrigger value="estilos">Estilos de Cotización</TabsTrigger>
  <TabsTrigger value="empresa">Empresa</TabsTrigger>
  <TabsTrigger value="wix">Integración Wix</TabsTrigger>
</TabsList>
```

**Después:**
```jsx
<TabsList className="grid w-full grid-cols-4 max-w-4xl">
  <TabsTrigger value="condiciones">Condiciones de Pago</TabsTrigger>
  <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
  <TabsTrigger value="estilos">Estilos de Cotización</TabsTrigger>
  <TabsTrigger value="empresa">Empresa</TabsTrigger>
</TabsList>
```

### 2. **Frontend - Archivos Eliminados**

#### ❌ `src/componentes/configuracion/WixIntegrationModule.jsx`
- Módulo completo de sincronización con Wix
- UI con botón "Sincronizar Ahora"
- Estado de última sincronización

#### ❌ `src/services/wixService.js`
- Función `syncWixToFirestore()`
- Cliente HTTP para llamar Cloud Function de Wix

### 3. **Backend - Cloud Functions**

#### `functions/index.js`

**Eliminado:**
- ❌ Secrets de Wix:
  ```javascript
  const wixApiKey = defineSecret('WIX_API_KEY');
  const wixSiteId = defineSecret('WIX_SITE_ID');
  ```

- ❌ Función `fetchAllWixProducts(apiKey, siteId)` (líneas 293-415)
  - Paginación de productos de Wix API
  - Mapeo de estructura Wix a estructura CPQ
  - Extracción de imágenes con múltiples fallbacks

- ❌ Función `isExentoIVA(productName)` (líneas 420-424)
  - Detección de productos exentos de IVA

- ❌ Función `stripHtmlTags(html)` (líneas 429-440)
  - Limpieza de HTML en descripciones

- ❌ Cloud Function `exports.syncWixProducts` (líneas 442-535)
  - HTTP endpoint para sincronización
  - Escritura a Firestore en batches
  - Timestamp de última sincronización

### 4. **Código Mantenido (IMPORTANTE)**

#### ✅ Detección de URLs de Wix en Imágenes

Se **MANTIENE** la lógica de optimización de imágenes de Wix en:

**`src/componentes/cotizador/QuoteForm.jsx` (línea 176):**
```javascript
// Reducir tamaño de imágenes de Wix (optimización)
let optimizedUrl = url;
if (url.includes('wixstatic.com')) {
  // Reemplazar tamaños grandes por tamaños pequeños (máx 300x300 para PDF)
  optimizedUrl = url.replace(/\/fit\/w_\d+,h_\d+/, '/fit/w_300,h_300');
  console.log('🔧 Optimizing Wix image:', optimizedUrl);
}
```

**`src/hooks/useSendQuoteEmail.jsx` (línea 26):**
```javascript
// Reducir tamaño de imágenes de Wix (optimización)
let optimizedUrl = url;
if (url.includes('wixstatic.com')) {
  // Reemplazar tamaños grandes por tamaños pequeños (máx 300x300 para PDF)
  optimizedUrl = url.replace(/\/fit\/w_\d+,h_\d+/, '/fit/w_300,h_300');
  console.log('🔧 Optimizing Wix image:', optimizedUrl);
}
```

**Razón:** Los 8000+ productos existentes en Firestore tienen URLs de `static.wixstatic.com`. Estas URLs son públicas y permanentes, por lo que deben seguir funcionando para generar PDFs.

---

## 🔍 Verificaciones Realizadas

### ✅ Build Exitoso
```bash
npm run build
✓ built in 5.81s
```
- Sin errores de compilación
- Sin imports rotos
- Solo advertencias de tamaño de chunks (no críticas)

### ✅ Detección de URLs Wix
```bash
grep "wixstatic\.com" src/**/*.{js,jsx}
```
**Resultados:**
- `src/hooks/useSendQuoteEmail.jsx:26` ✅
- `src/componentes/cotizador/QuoteForm.jsx:176` ✅
- `src/componentes/cotizador/QuoteForm.jsx:284` (logo de empresa) ✅
- `src/componentes/cotizador/columns.jsx:150` (logo de empresa) ✅

---

## 📊 Impacto en la Base de Datos

### Productos Existentes
- **Cantidad:** ~8000 productos sincronizados previamente desde Wix
- **Estado:** ✅ PERMANECEN en Firestore
- **Imágenes:** ✅ URLs de `static.wixstatic.com` siguen funcionando
- **Sincronización futura:** ✅ Se hará desde Master Database (externo)

### Metadata de Sincronización
```
usuarios/{userId}/settings/wix_sync
  - lastSync: timestamp
  - productsCount: number
```
**Estado:** ⚠️ Permanece en Firestore pero ya no se actualiza (legacy data)

---

## 🔄 Nuevo Flujo de Sincronización

### Antes (DEPRECADO)
```
Usuario → App CPQ → Botón "Sincronizar Ahora" 
  → Cloud Function syncWixProducts 
  → Wix API 
  → Firestore
```

### Ahora (ACTIVO)
```
Administrador → Terminal → cd master-database 
  → node cpq-sync.js full 
  → Master Database (local) 
  → Firebase Firestore (CPQ)
```

**Ventajas:**
- ✅ Sincronización controlada externamente
- ✅ No depende de la App CPQ
- ✅ Puede correr en background/cron
- ✅ Centralizado en Master Database

---

## 🧪 Testing Recomendado

### 1. Verificar UI de Settings
- [ ] Abrir Settings → Solo 4 tabs visibles
- [ ] No debe aparecer tab "Integración Wix"

### 2. Verificar Productos Existentes
- [ ] Abrir Catálogo → Ver productos
- [ ] Imágenes de productos sincronizados desde Wix deben verse correctamente

### 3. Verificar Generación de PDFs
- [ ] Crear cotización con productos que tengan imágenes de Wix
- [ ] Descargar PDF → Imágenes deben verse optimizadas (300x300)
- [ ] Enviar por email → PDF adjunto debe tener imágenes

### 4. Verificar Build & Deploy
- [ ] `npm run build` sin errores
- [ ] Deploy a Vercel exitoso
- [ ] Deploy de Cloud Functions: `firebase deploy --only functions`

---

## 📝 Notas Importantes

### ⚠️ Secrets de Firebase Functions
Las secrets de Wix pueden permanecer en Firebase Functions sin causar problemas:
```bash
firebase functions:secrets:delete WIX_API_KEY
firebase functions:secrets:delete WIX_SITE_ID
```
**Opcional:** Eliminarlas para mantener limpieza, pero no son necesarias ya que no se usan.

### ⚠️ Archivos de Documentación
Los siguientes archivos contienen referencias a Wix pero son **solo documentación** (no afectan la app):
- `CEPEQU_ESTADO_ACTUAL.md`
- `CLAUDE_JUGANDO.md`
- `WIX_SETUP.md`
- `WIX_CREDENTIALS_SECURITY.md`
- `PROMPT_SIMPLIFY_WIX.md`
- etc.

**Acción:** Opcional mantenerlos como referencia histórica o eliminarlos.

---

## ✅ Checklist Final

- [x] Eliminar WixIntegrationModule.jsx
- [x] Eliminar wixService.js
- [x] Eliminar tab de Wix en SettingsPage
- [x] Eliminar secrets de Wix en functions/index.js
- [x] Eliminar Cloud Function syncWixProducts
- [x] Verificar que detección de URLs Wix se mantiene
- [x] Build exitoso sin errores
- [ ] Deploy a producción
- [ ] Testing en ambiente productivo

---

**Autor:** Claude Sonnet 4.5  
**Revisado por:** [Pendiente]
