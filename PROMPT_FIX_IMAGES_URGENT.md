# URGENTE: Fix imágenes Wix - Estructura de datos incorrecta

## PROBLEMA CONFIRMADO

**Todas las imágenes en Firestore son placeholders:**
```
https://placehold.co/600x400/1e293b/94a3b8?text=Sin+Imagen
```

Esto significa que la Cloud Function NO está encontrando las URLs reales de Wix.

---

## CAUSA RAÍZ

En `functions/index.js`, la función `fetchAllWixProducts` está buscando imágenes en rutas que no existen en la estructura de datos de Wix.

**Código actual (líneas 352-375):**
```javascript
// Obtener imagen
let imageUrl = 'https://placehold.co/100x100/EEE/333?text=S/I';
const media = p.media || {};

// DEBUG: Ver estructura real
if (items.indexOf(p) < 3) {
  console.log('🔍 DEBUG Producto:', {
    name: p.name,
    media: JSON.stringify(p.media, null, 2),
    // ...
  });
}

// 4 fallbacks
if (media.mainMedia?.image?.url) {
  imageUrl = media.mainMedia.image.url;
} else if (media.items?.[0]?.image?.url) {
  imageUrl = media.items[0].image.url;
} else if (p.mainMedia?.url) {
  imageUrl = p.mainMedia.url;
} else if (media.mainMedia?.thumbnail?.url) {
  imageUrl = media.mainMedia.thumbnail.url;
}
```

**NINGUNO de los 4 fallbacks está funcionando** → Todos los productos usan placeholder.

---

## SOLUCIÓN

### Paso 1: Agregar logs MÁS detallados

Modificar el DEBUG para ver la estructura COMPLETA de UN producto:

```javascript
// DEBUG EXTENDIDO
if (items.indexOf(p) === 0) {
  console.log('==========================================');
  console.log('🔍 ESTRUCTURA COMPLETA DEL PRIMER PRODUCTO:');
  console.log('==========================================');
  console.log(JSON.stringify(p, null, 2));
  console.log('==========================================');
}
```

### Paso 2: Verificar estructura real de Wix API

Según documentación de Wix:
https://dev.wix.com/docs/rest/business-solutions/stores/catalog/product-object

La imagen puede venir en:
- `media.mainMedia.image.url`
- `media.items[0].image.url`  
- `mediaItems[0].url`
- `ribbon` (para productos sin media)

**Agregar estos fallbacks adicionales:**

```javascript
let imageUrl = 'https://placehold.co/100x100/EEE/333?text=S/I';

// Intentar TODAS las rutas posibles
if (p.media?.mainMedia?.image?.url) {
  imageUrl = p.media.mainMedia.image.url;
} else if (p.media?.items?.length > 0 && p.media.items[0].image?.url) {
  imageUrl = p.media.items[0].image.url;
} else if (p.mediaItems?.length > 0 && p.mediaItems[0].url) {
  imageUrl = p.mediaItems[0].url;
} else if (p.mainMedia?.url) {
  imageUrl = p.mainMedia.url;
} else if (p.media?.mainMedia?.thumbnail?.url) {
  imageUrl = p.media.mainMedia.thumbnail.url;
}  else if (p.ribbon?.media?.image?.url) {
  imageUrl = p.ribbon.media.image.url;
}

// Si sigue siendo placeholder, log de warning
if (imageUrl.includes('placehold')) {
  console.log(`⚠️ No se encontró imagen para: ${p.name} (SKU: ${p.sku})`);
}
```

### Paso 3: Deploy con logs extendidos

1. Modificar `functions/index.js` con logs completos
2. Deploy: `firebase deploy --only functions:syncWixProducts`
3. Sincronizar desde UI
4. Ver logs en Firebase Console (o terminal)
5. Copiar la estructura JSON completa del primer producto
6. Ajustar código según estructura real

---

## ARCHIVOS A MODIFICAR

- `functions/index.js` (líneas 352-380)

---

## RESULTADO ESPERADO

Después de ver los logs con la estructura completa:
1. Identificar la ruta correcta para las imágenes
2. Implementar el fallback correcto
3. Re-deploy
4. Re-sincronizar
5. Verificar que imágenes reales aparezcan en el catálogo

---

## ¿Puedes implementar esto?

1. Agregar el log de estructura completa
2. Agregar los fallbacks adicionales
3. Deploy
4. Mostrarme el log JSON completo del primer producto
