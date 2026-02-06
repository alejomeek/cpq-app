# Solución: Imágenes no se muestran en PDFs

## Problema
Las imágenes de productos manuales no aparecen en los PDFs generados debido a problemas de CORS con Firebase Storage.

## Cambios Realizados

### 1. QuoteForm.jsx - DownloadPDFButton
He agregado una función que convierte las imágenes a base64 antes de generar el PDF:
- Detecta URLs de Firebase Storage
- Las descarga y convierte a base64
- Si falla por CORS, usa imagen placeholder

### 2. useSendQuoteEmail.jsx
He agregado la misma funcionalidad para el envío de emails:
- Convierte imágenes a base64 antes de generar el PDF
- Maneja errores de CORS con fallback a placeholder

## Configuración de CORS en Firebase Storage (REQUERIDO)

Para que las imágenes funcionen completamente, necesitas configurar CORS en Firebase Storage:

### Opción 1: Usando gsutil (Recomendado)

1. **Instalar Google Cloud SDK:**
   ```bash
   # macOS
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Inicializar
   gcloud init
   ```

2. **Aplicar configuración CORS:**
   ```bash
   gsutil cors set cors.json gs://app-cpq.firebasestorage.app
   ```

3. **Verificar configuración:**
   ```bash
   gsutil cors get gs://app-cpq.firebasestorage.app
   ```

### Opción 2: Usando Firebase Console (Más Fácil)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto "app-cpq"
3. Ve a **Storage** en el menú lateral
4. Click en los 3 puntos verticales (⋮) junto al nombre del bucket
5. Selecciona **"Edit bucket permissions"** o **"Permisos"**
6. En la pestaña **"CORS"**, agrega esta configuración:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
7. Guarda los cambios

### Opción 3: Reglas de Storage (Complementario)

Asegúrate de que las reglas de Firebase Storage permitan lectura pública:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /productos/{userId}/{allPaths=**} {
      // Lectura pública para imágenes de productos
      allow read: if true;
      // Escritura solo para el usuario autenticado
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Verificación

Después de configurar CORS:

1. **Limpia el caché del navegador**
2. **Recarga la aplicación** (Ctrl+Shift+R o Cmd+Shift+R)
3. **Intenta descargar un PDF** con productos que tengan imágenes
4. **Verifica la consola** - no deberían aparecer errores de CORS

## Comportamiento Actual

- ✅ Si CORS está configurado: Las imágenes se cargarán correctamente
- ⚠️ Si CORS NO está configurado: Aparecerá imagen placeholder "Sin Imagen"
- ✅ Las imágenes de Wix (productos sincronizados) funcionan normalmente

## Logs para Debugging

Abre la consola del navegador (F12) al generar un PDF y busca:
- `🖼️ Convirtiendo imágenes a base64...` - Conversión iniciada
- `Failed to fetch image: [URL]` - Error de CORS
- `Error converting image to base64: [URL]` - Error general

## Archivo CORS Actual

El archivo `cors.json` en la raíz del proyecto contiene:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

Este permite todas las URLs origen (*) para peticiones GET.
