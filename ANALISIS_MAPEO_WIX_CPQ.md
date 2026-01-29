## MAPEO WIX → CPQ

### Archivo(s) de sincronización
- `functions/index.js` - líneas 297-535
- Función principal: `syncWixProducts()` (línea 442) y su helper `fetchAllWixProducts` (línea 297)

### Mapeo de campos

| Campo CPQ | Origen Wix | Transformación | Notas |
|-----------|------------|----------------|-------|
| `sku` | `product.sku` | String cast | Fallback a string vacío |
| `nombre` | `product.name` | Fallback 'Sin Nombre' | - |
| `descripcion` | `product.description` | `stripHtmlTags()` | Elimina HTML tags usando RegExp |
| `categoria` | `product.productType` | Fallback 'General' | - |
| `precioBase` | `product.priceData.price` | `parseFloat()` | **¡OJO!** Usa el mismo valor que con IVA (Precio de lista) |
| `precio_iva_incluido` | `product.priceData.price` | `parseFloat()` | Se asigna igual que `precioBase` |
| `inventory` | `product.stock.quantity` | Lógica de stock infinito | Si quantity es null pero `inStock`=true, pone 999 |
| `exento_iva` | `product.name` | Función `isExentoIVA()` | Detecta palabras clave en el nombre |
| `imagen_url` | `product.media...` | Múltiples fallbacks | Busca en mainMedia, items, mediaItems, ribbon, placehold.co |
| `lastSync` | - | `new Date()` | Generado en sincronización |
| `fechaActualizacion` | - | `new Date()` | Generado en sincronización |

### Lógica de cálculo de precios

Actualmente, el código **NO** hace cálculos matemáticos de impuestos durante la sincronización (no divide por 1.19). Toma el precio de lista de Wix y lo asigna a ambos campos.

```javascript
// functions/index.js líneas ~340-398
const price = p.price?.price || p.priceData?.price || 0;

// ...

return {
  // ...
  precio_iva_incluido: parseFloat(price) || 0,
  precioBase: parseFloat(price) || 0, // <--- ATENCIÓN: Asigna lo mismo
  exento_iva: isExentoIVA(p.name)     // <--- Lógica basada en nombre
};
```

**Lógica de Exento IVA:**
```javascript
// functions/index.js líneas 420-424
function isExentoIVA(productName) {
  if (!productName) return false;
  const name = productName.toLowerCase();
  return name.includes('libro') || name.includes('patineta');
}
```

### Campos específicos de CPQ

La función de sincronización guarda todo el objeto de Wix mezclado con los campos formateados (`...product` en línea ~500), pero los campos explícitamente manejados y transformados por CPQ son:

- `exento_iva`: Calculado basado en el nombre (hardcoded logic).
- `lastSync`: Timestamp de cuándo corrió la Cloud Function.
- `fechaActualizacion`: Timestamp de actualización.
- `descripcion`: Limpiada de HTML.

**Nota Crítica:** El código actual hace un merge con `...product` al guardar en Firestore (línea 500: `batch.set(docRef, { ...product, ...formatted... })`), lo que significa que **TODOS** los campos crudos de Wix (como `ribbons`, `collections`, `variants`, `additionalInfoSections`) se están guardando en CPQ, inflando el tamaño del documento.
