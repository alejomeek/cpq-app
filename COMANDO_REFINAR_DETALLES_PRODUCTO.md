# Comando: Refinar Vista de Detalles del Producto

**Objetivo:** Limpiar y corregir la visualización de los detalles del producto (Sheet/Modal) para que coincida con la nueva estructura simplificada.

**Fecha:** 23/01/2026

---

## 🎯 Comando 1: Corregir Imagen del Producto

**Archivo:** `src/componentes/catalogo/ProductDetails.jsx`

**Problema:** El componente busca `product.imagenUrl` (camelCase) pero el esquema de datos usa `product.imagen_url` (con underscore). Esto causa que aparezca el label "Sin Imagen" incluso cuando el producto tiene imagen.

**Acción:** Actualizar todas las referencias de `imagenUrl` a `imagen_url`.

**Cambios:**
En la línea 76 (aprox):
```javascript
// Antes
src={product.imagenUrl || 'https://placehold.co/600x400/...'}

// Después
src={product.imagen_url || 'https://placehold.co/600x400/...'}
```

---

## 🎯 Comando 2: Eliminar Duplicar y Limpiar Precios

**Archivo:** `src/componentes/catalogo/ProductDetails.jsx`

**Acción 1:** Eliminar el botón de "Duplicar".
- Eliminar el bloque que usa `onDuplicate` (líneas 96-104 aprox).
- (Opcional) Eliminar el import de `Copy` de 'lucide-react' si ya no se usa.

**Acción 2:** Simplificar la sección de "Precios y Márgenes".
- Dejar únicamente el cuadro de "Precio de Venta" (renombrar a "Precio").
- Eliminar el cuadro de "Costo".
- Eliminar el cuadro de "Ganancia".
- Eliminar el cuadro de "Margen".

**Lógica de UI:**
Mantener el `grid grid-cols-2` pero dejando solo un elemento que ocupe todo el ancho o simplemente el primer cuadro.

---

## 🎯 Comando 3: Limpiar Cálculos y Variables Innecesarias

**Archivo:** `src/componentes/catalogo/ProductDetails.jsx`

**Acción:** Eliminar código muerto que ya no se usará tras los cambios anteriores.

**Cambios:**
1. Eliminar cálculo de `ganancia` y `margen` (líneas 57-60 aprox).
2. Eliminar el import de `TrendingUp` de 'lucide-react'.

---

## ✅ Checklist de Verificación

- [ ] La imagen del producto aparece correctamente en el modal.
- [ ] Ya no existe el botón "Duplicar" en los detalles.
- [ ] La sección de precios solo muestra el "Precio" (sin costo, ganancia ni margen).
- [ ] El código está libre de variables de cálculo de margen y ganancias.
- [ ] No hay errores de "undefined" al abrir el modal.

---

## 🚀 Instrucción para Claude Code

"Ejecuta los Comandos 1, 2 y 3 del archivo @COMANDO_REFINAR_DETALLES_PRODUCTO.md para limpiar la vista de detalles de productos y corregir la visualización de imágenes."
