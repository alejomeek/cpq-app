# Simplificar sincronización Wix - Remover inputs de credenciales

## CONTEXTO ACTUAL

Ya tengo implementada la sincronización de Wix con Firebase Cloud Functions.

**Lo que funciona:**
- Cloud Function `syncWixProducts` en `functions/index.js` (líneas 384-466)
- Frontend `WixIntegrationModule.jsx` con inputs de API Key y Site ID
- Servicio `wixService.js` que llama a la function

**Problema:**
- Usuario tiene que ingresar credenciales manualmente
- Quiero que solo presione "Sincronizar" sin ver credenciales

---

## CAMBIOS NECESARIOS

### CAMBIO 1: functions/index.js (líneas 392-400)

**ACTUAL:**
```javascript
try {
  const { apiKey, siteId, userId } = req.body;

  if (!apiKey || !siteId || !userId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  console.log(`📦 Obteniendo productos de Wix para usuario: ${userId}`);
```

**CAMBIAR A:**
```javascript
try {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  // Credenciales desde variables de entorno
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;

  if (!apiKey || !siteId) {
    throw new Error('Wix credentials not configured');
  }

  console.log(`📦 Obteniendo productos de Wix para usuario: ${userId}`);
```

---

### CAMBIO 2: src/services/wixService.js

**Buscar esta línea:**
```javascript
body: JSON.stringify({ apiKey, siteId, userId })
```

**CAMBIAR A:**
```javascript
body: JSON.stringify({ userId })
```

---

### CAMBIO 3: src/componentes/configuracion/WixIntegrationModule.jsx

**Simplificar el componente:**

1. Eliminar estos imports y estados:
   - `const [apiKey, setApiKey] = useState('')`
   - `const [siteId, setSiteId] = useState('')`

2. Eliminar los inputs de API Key y Site ID (líneas ~100-124)

3. Mantener solo:
   - Botón "Sincronizar Ahora"
   - Loading state
   - Mensaje de resultado
   - Timestamp de última sync

4. Actualizar la función `handleSync` para NO pasar apiKey/siteId

---

### CAMBIO 4: functions/.env (CREAR ARCHIVO)

Crear `functions/.env` con:

```env
WIX_API_KEY=IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQwYzY3NjM2LTBkOTctNDFlNy1hYWQ4LThmZTIyNWRjMjFiN1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImVkYTRiNzRkLTI1YmYtNDc5My05ZmQ3LWJiODQwYzA5MTQyMlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3OTA5ZmY5ZC1kN2U5LTQ4YzktOTcyZi02ZDM1M2VlNmU0NDJcIn19IiwiaWF0IjoxNzY1MjQzNjMxfQ.QmPtRgP-sggDlRYdZVcESBg7wmy4UCi0a8dexIxaqLfIBjySYb4n38tCzCeOjQi_kfyMT-T1ya8eOfh_yXuHGtgDlO_jRlZNOTnMHO4DDldQD97i_o2IjOjkoutB4cVK92XKIOg_WRUoVWTzeubhtB63pAaDubOwm9bPkDaO4LLAY6O7kg9PXScx3jIMndIrar1oDuk4O5gMdQCiCc7c4UsHFk96o4EC2KKzcatIFUpbKAgqM8yH0I7nTKXdXQb87WHVYzIhoMFyJ0SONkfJAVMsl_oLfNcSIuL9486hfh4jq-y5V3o0CcS-SuTb76PemhjozRKDAQJPXaSSRfLNEw
WIX_SITE_ID=a290c1b4-e593-4126-ae4e-675bd07c1a42
```

---

### CAMBIO 5: functions/.gitignore (MODIFICAR)

Asegurar que `functions/.gitignore` tiene:
```
.env
```

---

## RESULTADO ESPERADO

Usuario ve solo esto:

```
┌─────────────────────────────────────┐
│  Sincronización con Wix             │
├─────────────────────────────────────┤
│                                     │
│  Última sync: 20/01/2026 17:30     │
│  Productos: 8,234                   │
│                                     │
│  [Sincronizar Ahora]                │
│                                     │
└─────────────────────────────────────┘
```

Sin campos de API Key ni Site ID.

---

## DESPUÉS DE IMPLEMENTAR

1. **Deploy:** `firebase deploy --only functions:syncWixProducts`
2. **Git:** Asegurar que `.env` NO se commitea
3. **Test:** Ir a Configuración y presionar Sincronizar

---

## IMPORTANTE

- Las credenciales quedan en `functions/.env` (NUNCA en Git)
- El frontend NO tiene acceso a ellas
- Cloud Function las lee de `process.env`
- Usuario solo ve botón de sincronizar

---

**¿Puedes hacer estos 5 cambios?**
