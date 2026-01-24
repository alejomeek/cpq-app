# Comando: Corregir Edición de Productos Manuales

**Objetivo:** Permitir que al darle "Editar" a un producto manual, el formulario cargue sus datos actuales (nombre, precio, sku, etc.) en lugar de aparecer vacío.

**Fecha:** 23/01/2026

---

## 🎯 Comando 1: Habilitar Carga de Datos en SimpleProductForm

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Corregir la firma del componente y el estado inicial para que acepte un producto existente.

**Cambios técnicos:**
1. **Modificar la firma:** Pasar de `({ db, onBack, onSave })` a `({ db, product: initialProduct, onBack, onSave })`.
2. **Estado Inicial Inteligente:** Cambiar el `useState` del producto para que use los datos de `initialProduct` si existen.
3. **Lógica de Guardado:** Asegurar que si existe `initialProduct.id`, se use `setDoc` para actualizar en lugar de `addDoc` para crear uno nuevo.
4. **Título Dinámico:** Cambiar el <h2> para que diga "Editar Producto" si hay un ID.

---

## ✅ Checklist de Verificación

- [ ] Al hacer clic en "Editar" en "Bloques madera", el formulario muestra el nombre "Bloques madera", el SKU "25756" y el precio "$ 152.900".
- [ ] Al guardar los cambios, el producto se actualiza correctamente en la lista.
- [ ] El título arriba a la izquierda dice "Editar Producto".
- [ ] Si se entra a crear uno nuevo (desde el botón principal), el formulario sigue apareciendo vacío y dice "Crear Producto".

---

## 🚀 Instrucción para Claude Code

"Ejecuta el Comando 1 del archivo @COMANDO_FIX_EDICION_MANUAL.md para que el formulario de edición de productos manuales cargue los datos existentes correctamente."
