# Comando: Restringir Edición de Productos de Wix

**Objetivo:** Ocultar el botón de "Editar" en la vista de detalles para productos que provienen de Wix, permitiendo la edición únicamente en productos creados de forma manual.

**Fecha:** 23/01/2026

---

## 📋 Contexto
Los productos sincronizados desde Wix no deben editarse directamente en la aplicación CPQ, ya que cualquier cambio se perdería en la próxima sincronización. Los productos manuales (identificados por la ausencia del campo `lastSync`) sí deben permitir edición.

---

## 🎯 Comando 1: Ocultar Botón Editar Condicionalmente

**Archivo:** `src/componentes/catalogo/ProductDetails.jsx`

**Acción:** Agregar una validación para mostrar el botón de "Editar" solo si el producto NO tiene el campo `lastSync`.

**Cambios:**
1. Identificar si el producto es de Wix al inicio del componente o dentro del renderizado.
2. Envolver el botón de Editar en una condición lógica.

**Código a implementar (alrededor de la línea 79):**
```jsx
{/* Cambiar esto */}
{onEdit && (
  <Button ...>
    <Edit ... />
    Editar
  </Button>
)}

{/* Por esto */}
{!product.lastSync && onEdit && (
  <Button ...>
    <Edit ... />
    Editar
  </Button>
)}
```

---

## ✅ Checklist de Verificación

- [ ] Al abrir un producto de Wix (tiene fecha de sincronización), el botón "Editar" NO aparece.
- [ ] Al abrir un producto manual (no tiene fecha de sincronización), el botón "Editar" APARECE y funciona.
- [ ] No hay errores de sintaxis en el archivo.
- [ ] El botón "Eliminar" sigue apareciendo para ambos tipos de productos (si aplica).

---

## 🚀 Instrucción para Claude Code

"Ejecuta el Comando 1 del archivo @COMANDO_RESTRINGIR_EDICION_WIX.md para ocultar el botón de editar en productos que vienen de Wix."
