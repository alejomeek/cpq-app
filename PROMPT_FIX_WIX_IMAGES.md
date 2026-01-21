# FIX: Imágenes y descripciones del catálogo Wix

## PROBLEMAS IDENTIFICADOS

### Problema 1: Imágenes no se cargan
- Todos los productos muestran "Sin imagen"  
- El placeholder funciona pero las URLs reales no

### Problema 2: Descripciones con HTML crudo
Las descripciones traen HTML sin procesar:
```html
<p><strong>5 años +</strong></p><p>Ábaco Vertical...</p>
```

Necesitamos mostrar solo el texto plano.

---

## INVESTIGACIÓN NECESARIA

### 1. Revisar estructura de datos de Wix

En `functions/index.js` líneas 340-370, agregar logs temporales para ver:
- ¿Qué estructura tiene realmente `p.media`?
- ¿La URL de imagen viene en `.image.url` o en otro campo?
- ¿Viene la descripción en HTML?

**Agregar:**
```javascript
// Después de línea 335 (dentro del map de items)
if (items.indexOf(p) < 3) {
  console.log(`🔍 DEBUG Producto ${items.indexOf(p)}:`, {
    name: p.name,
    media: JSON.stringify(p.media, null, 2),
    description: p.description?.substring(0, 150),
    price: p.price,
    priceData: p.priceData
  });
}
```

### 2. Comparar con app_cotizaciones.py

**En Streamlit (líneas 118-128):**
```python
# Imagen
image_url = "https://placehold.co/100x100/EEE/333?text=S/I"
media = p.get('media', {})
if media and media.get('mainMedia'):
    full_url = media['mainMedia'].get('image', {}).get('url', '')
    if full_url:
        image_url = full_url
```

**Preguntas:**
- ¿El código JS hace lo mismo que el Python?
- ¿Hay diferencia entre `.get('media')` vs `p.media`?

---

## SOLUCIONES PROPUESTAS

### Para imágenes:

**Opción A:** Verificar estructura de datos
```javascript
// Probar múltiples rutas posibles:
let imageUrl = 'https://placehold.co/100x100/EEE/333?text=S/I';

// Intentar diferentes paths
if (p.media?.mainMedia?.image?.url) {
  imageUrl = p.media.mainMedia.image.url;
} else if (p.media?.items?.[0]?.image?.url) {
  imageUrl = p.media.items[0].image.url;
} else if (p.mainMedia?.url) {
  imageUrl = p.mainMedia.url;
}
```

**Opción B:** Logs + redeploy + test
1. Agregar logs
2. Deploy: `firebase deploy --only functions`
3. Sincronizar desde UI
4. Ver logs en Firebase Console
5. Ajustar código según logs

### Para descripciones HTML:

**Solución:** Strip HTML tags

```javascript
// Nueva función helper
function stripHtmlTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remover tags HTML
    .replace(/&nbsp;/g, ' ') // Spaces
    .replace(/&amp;/g, '&')  // Ampersands
    .replace(/&lt;/g, '<')   // Less than
    .replace(/&gt;/g, '>')   // Greater than
    .trim();
}

// En la sección de formateo:
descripcion: stripHtmlTags(p.description || ''),
```

---

## TAREAS ESPECÍFICAS

1. **Agregar logs de debugging** en `functions/index.js`
2. **Deploy** la función
3. **Sincronizar** desde UI (app.cepequ.com)
4. **Ver logs** en Firebase Console → Functions → syncWixProducts → Logs
5. **Analizar** la estructura real de `media` y `description`
6. **Ajustar código** según hallazgos
7. **Implementar** stripHtmlTags para descripciones
8. **Re-deploy** y **test** final

---

## INFORMACIÓN ADICIONAL

### URLs de Wix API que pueden ayudar:
- https://dev.wix.com/docs/rest/business-solutions/stores/catalog/product-object
- Especialmente revisar el campo `media`

### Código Streamlit funcional:
Ver `app_cotizaciones.py` líneas 50-155

### Alternative fallback:
Si la URL no funciona, podemos:
- Guardar placeholder
- Permitir al usuario editar manualmente en `SimpleProductForm.jsx`

---

## RESULTADO ESPERADO

**Imágenes:**
- ✅ ProductCard muestra imagen real de Wix
- ✅ Fallback a placeholder solo si no hay imagen
- ✅ URLs válidas que cargan en el navegador

**Descripciones:**
- ✅ Texto plano sin HTML
- ✅ Sin tags `<p>`, `<strong>`, `<br>`, etc.
- ✅ Máximo 200 caracteres en preview

---

¿Puedes investigar y arreglar ambos problemas?

**Prioridad:** Alta - afecta visualización del catálogo completo
