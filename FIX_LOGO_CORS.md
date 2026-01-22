# Solución: CORS en Firebase Storage para Logo

## 🔴 Problema
```
Access to fetch at 'https://firebasestorage.googleapis.com/...' 
has been blocked by CORS policy
```

El logo existe en Firebase Storage pero el navegador bloquea la carga por política CORS.

---

## ✅ Solución: Configurar CORS en Firebase Storage

### Opción A: Usar Firebase Console (Más Fácil) ⭐

**Pasos:**

1. **Ir a Firebase Console:**
   - https://console.firebase.google.com
   - Seleccionar proyecto: `app-cpq`

2. **Ir a Storage:**
   - Menú lateral → Storage
   - Tab "Files"

3. **Configurar CORS:**
   - Click en "Rules" (arriba)
   - Cambiar las reglas para permitir acceso público a logos:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Regla para logos (acceso público de lectura)
    match /logos/{userId}/{fileName} {
      allow read: if true;  // Permitir lectura pública
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Otras reglas existentes...
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **Publicar cambios**

---

### Opción B: Usar gsutil (Línea de Comandos)

**Requisitos:**
- Google Cloud SDK instalado
- Autenticado con Firebase

**Pasos:**

1. **Crear archivo `cors.json`:**

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

2. **Aplicar configuración CORS:**

```bash
gsutil cors set cors.json gs://app-cpq.firebasestorage.app
```

3. **Verificar:**

```bash
gsutil cors get gs://app-cpq.firebasestorage.app
```

---

### Opción C: Workaround Temporal (Mientras configuras CORS)

**Usar URL pública directa:**

En lugar de la URL con token, usar la URL pública de Firebase Storage.

**Modificar en `CompanySettingsModule.jsx` al subir el logo:**

```javascript
// ANTES (URL con token - tiene CORS issues)
const downloadURL = await getDownloadURL(logoRef);

// DESPUÉS (URL pública - sin CORS issues)
const publicURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fullPath)}?alt=media`;
```

---

## 🎯 Recomendación

**Usar Opción A** (Firebase Console → Storage Rules)

Es la más simple y permanente. Solo toma 2 minutos.

---

## 🧪 Testing

Después de configurar CORS:

1. Limpiar caché del navegador (Cmd+Shift+R)
2. Generar PDF de nuevo
3. El logo debería aparecer sin errores CORS

---

## 📝 Notas

- El error `net::ERR_FAILED 200 (OK)` es confuso pero indica que el archivo existe (200 OK) pero CORS lo bloquea
- Las reglas de Storage solo afectan a Firebase Storage, no a Firestore
- Los logos son públicos (solo lectura), no hay riesgo de seguridad

