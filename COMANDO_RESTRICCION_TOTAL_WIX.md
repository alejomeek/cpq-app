# Comando: Restricción Total de Acciones para Productos Wix

**Objetivo:** Eliminar cualquier opción de Editar o Eliminar para productos sincronizados de Wix en toda la interfaz de Catálogo (Tarjetas y Detalles).

**Fecha:** 23/01/2026

---

## 🎯 Comando 1: Limpiar Tarjetas de Producto (ProductCard)

**Archivo:** `src/componentes/catalogo/ProductCard.jsx`

**Acciones:**
1. **Hover Overlay:** Ocultar el botón "Editar" si el producto es de Wix (`lastSync`).
2. **Menú Dropdown (Tres puntitos):** Ocultar las opciones "Editar" y "Eliminar" si el producto es de Wix.

**Lógica sugerida:**
```jsx
// Para el botón de Editar en el hover (alrededor de línea 75)
{!product.lastSync && onEdit && (
  <Button ...>Editar</Button>
)}

// Para el menú Dropdown (alrededor de línea 113 y 127)
{!product.lastSync && onEdit && (
  <DropdownMenuItem ...>Editar</DropdownMenuItem>
)}
{!product.lastSync && onDelete && (
  <DropdownMenuItem ...>Eliminar</DropdownMenuItem>
)}
```

---

## 🎯 Comando 2: Bloquear Eliminación en Detalles (ProductDetails)

**Archivo:** `src/componentes/catalogo/ProductDetails.jsx`

**Acción:** Ocultar el botón de la papelera (Eliminar) si el producto es de Wix.

**Lógica sugerida:**
```jsx
// Alrededor de la línea 88
{!product.lastSync && onDelete && (
  <Button ...>
    <Trash2 ... />
  </Button>
)}
```

---

## ✅ Checklist de Verificación

- [ ] Un producto de Wix no muestra "Editar" al pasar el mouse.
- [ ] El menú de tres puntos de un producto de Wix solo muestra "Ver detalles".
- [ ] En la hoja de detalles de un producto de Wix, no aparece ni el botón "Editar" ni la papelera roja.
- [ ] Los productos manuales (sin `lastSync`) conservan todas sus funciones (Ver, Editar, Eliminar).

---

## 🚀 Instrucción para Claude Code

"Ejecuta el Comando 1 y el Comando 2 del archivo @COMANDO_RESTRICCION_TOTAL_WIX.md para blindar los productos de Wix contra ediciones o eliminaciones accidentales."
