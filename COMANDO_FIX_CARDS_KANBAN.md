# Comando: Corregir UI de Tarjetas Kanban

**Objetivo:** 
1. Evitar que el nombre del cliente se salga de la tarjeta (controlar overflow).
2. Eliminar decimales en el precio total.

**Fecha:** 23/01/2026

---

## 🎯 Comando 1: Arreglar Desbordamiento y Decimales

**Archivo:** `src/componentes/cotizador/QuoteCard.jsx`

**Acciones:**
1. **Control del Nombre del Cliente:**
   - Asegurar que el contenedor del texto tenga un ancho máximo o un comportamiento de recorte más agresivo.
   - Usar `line-clamp-1` o asegurar que el contenedor padre tenga `max-w-full`.

2. **Formato de Moneda:**
   - Cambiar `.toFixed(2)` por un formato sin decimales.

**Cambios Técnicos Sugeridos:**

En el renderizado del nombre del cliente (alrededor de línea 41-43):
```jsx
{/* Antes */}
<p className="text-sm text-muted-foreground truncate">{quote.clienteNombre}</p>

{/* Después (Asegurando que el div padre tenga overflow-hidden) */}
<div className="overflow-hidden">
  <h3 className="font-bold text-card-foreground truncate">{quote.numero}</h3>
  <p className="text-sm text-muted-foreground truncate max-w-[180px]">{quote.clienteNombre}</p>
</div>
```

En el renderizado del precio (alrededor de línea 54):
```jsx
{/* Antes */}
${(quote.total || 0).toFixed(2)}

{/* Después */}
${(quote.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
```

---

## ✅ Checklist de Verificación

- [ ] El nombre del cliente largo ya no se sale de la tarjeta blanca.
- [ ] Si el nombre es muy largo, se ve así: "INSTITUCIÓN EDUCATIVA PRE..."
- [ ] El precio ahora se ve limpio: `$ 1.310.331` (Sin decimales).
- [ ] La tarjeta blanca mantiene su forma rectangular perfecta sin deformarse.

---

## 🚀 Instrucción para Claude Code

"Ejecuta el Comando 1 del archivo @COMANDO_FIX_CARDS_KANBAN.md para corregir el desbordamiento del nombre del cliente y eliminar los decimales en las tarjetas del tablero."
