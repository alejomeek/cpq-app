# Cambios: IVA Selectivo + Flete en PDF + Sin Decimales

## 🎯 Objetivos

1. **IVA Selectivo por Producto:** Productos con "libro" o "patineta" en el título están exentos de IVA
2. **Mostrar Flete en PDFs:** Agregar línea de flete en la sección de totales de los 4 estilos
3. **Formato Sin Decimales:** Mostrar todos los montos como enteros (sin .00)

---

## 📋 Cambio 1: IVA Selectivo por Producto

### Lógica de Detección

Los productos están **exentos de IVA** si su nombre contiene:
- "libro" (case-insensitive)
- "patineta" (case-insensitive)

Todos los demás productos tienen IVA del 19%.

### Archivos a Modificar

#### 1.1 `functions/index.js` - Cloud Function de Sincronización Wix

**Ubicación:** Función `syncWixProducts`

**Agregar función helper:**
```javascript
// Función para detectar si un producto está exento de IVA
function isExentoIVA(productName) {
  if (!productName) return false;
  const name = productName.toLowerCase();
  return name.includes('libro') || name.includes('patineta');
}
```

**Modificar donde se crea `productData`:**
```javascript
const productData = {
  sku: product.sku || '',
  nombre: product.name || '',
  descripcion: cleanDescription,
  precio_iva_incluido: product.priceData?.price || 0,
  precioBase: product.priceData?.price || 0,
  imagen_url: imageUrl,
  inventory: product.stock?.quantity || 0,
  categoria: product.productType || 'General',
  exento_iva: isExentoIVA(product.name), // ← NUEVO
  lastSync: Timestamp.now(),
  fechaActualizacion: Timestamp.now()
};
```

#### 1.2 `src/componentes/cotizador/QuoteForm.jsx`

**Modificar función `calculateTotals()`:**

**ANTES:**
```javascript
const calculateTotals = () => {
  const lineasValidas = Array.isArray(quote.lineas) ? quote.lineas : [];
  const subtotal = lineasValidas.reduce((acc, line) => acc + ((parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0)), 0);
  const tax = subtotal * 0.19;
  const fleteValue = quote.fleteType === 'incluido' ? 0 : (parseFloat(quote.fleteValue) || 0);
  const total = subtotal + tax + fleteValue;
  return { subtotal, tax, fleteValue, total };
};
```

**DESPUÉS:**
```javascript
const calculateTotals = () => {
  const lineasValidas = Array.isArray(quote.lineas) ? quote.lineas : [];
  
  // Subtotal (sin cambios)
  const subtotal = lineasValidas.reduce((acc, line) => 
    acc + ((parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0)), 0
  );
  
  // IVA solo para productos NO exentos
  const tax = lineasValidas.reduce((acc, line) => {
    const product = products.find(p => p.id === line.productId);
    if (product?.exento_iva) return acc; // Sin IVA para productos exentos
    const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0);
    return acc + (lineTotal * 0.19);
  }, 0);
  
  const fleteValue = quote.fleteType === 'incluido' ? 0 : (parseFloat(quote.fleteValue) || 0);
  const total = subtotal + tax + fleteValue;
  
  return { subtotal, tax, fleteValue, total };
};
```

**Modificar columna "Impuestos" en la tabla:**

**ANTES:**
```javascript
<td className="px-6 py-2 text-center text-foreground">19% IVA</td>
```

**DESPUÉS:**
```javascript
<td className="px-6 py-2 text-center text-foreground">
  {(() => {
    const product = products.find(p => p.id === line.productId);
    return product?.exento_iva ? 'Exento' : '19% IVA';
  })()}
</td>
```

#### 1.3 PDFs - Los 4 Estilos

**Archivos:**
- `src/componentes/configuracion/estilos/pdf/QuotePDF Bubble.jsx`
- `src/componentes/configuracion/estilos/pdf/QuotePDF Light.jsx`
- `src/componentes/configuracion/estilos/pdf/QuotePDF Striped.jsx`
- `src/componentes/configuracion/estilos/pdf/QuotePDF Wave.jsx`

**En cada archivo, modificar la tabla de productos:**

**ANTES:**
```javascript
<Text style={[styles.colTax]}>19%</Text>
```

**DESPUÉS:**
```javascript
<Text style={[styles.colTax]}>
  {(() => {
    const product = products.find(p => p.id === line.productId);
    return product?.exento_iva ? 'Exento' : '19%';
  })()}
</Text>
```

---

## 📋 Cambio 2: Mostrar Flete en PDFs

### Archivos a Modificar

**Los 4 estilos de PDF** (mismos archivos del punto 1.3)

**Ubicación:** Sección de totales (después de "IVA 19%")

**Agregar línea de flete ANTES del total final:**

```javascript
{/* Sección de totales existente */}
<View style={styles.totalRow}>
  <Text style={styles.totalLabel}>Base imponible</Text>
  <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
</View>
<View style={styles.totalRow}>
  <Text style={styles.totalLabel}>IVA 19%</Text>
  <Text style={styles.totalValue}>{formatCurrency(quote.impuestos)}</Text>
</View>

{/* NUEVO: Mostrar flete si existe */}
{quote.fleteValue > 0 && (
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>Flete</Text>
    <Text style={styles.totalValue}>{formatCurrency(quote.fleteValue)}</Text>
  </View>
)}

{/* Total final */}
<View style={styles.totalFinal}>
  <Text style={styles.totalFinalLabel}>Total</Text>
  <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
</View>
```

**Nota:** Si `fleteType === 'incluido'`, no mostrar la línea (porque `fleteValue` será 0).

---

## 📋 Cambio 3: Formato Sin Decimales

### Archivos a Modificar

#### 3.1 `src/componentes/cotizador/QuoteForm.jsx`

**Modificar todas las ocurrencias de `.toFixed(2)` a `.toFixed(0)`:**

**Ubicaciones:**
1. Columna "Importe" en la tabla de líneas
2. Subtotal en el card de totales
3. IVA en el card de totales
4. Flete en el card de totales
5. Total en el card de totales

**ANTES:**
```javascript
<span>${subtotal.toFixed(2)}</span>
<span>${tax.toFixed(2)}</span>
<span>${fleteValue.toFixed(2)}</span>
<span>${total.toFixed(2)}</span>
<td>${((line.quantity || 0) * (line.price || 0)).toFixed(2)}</td>
```

**DESPUÉS:**
```javascript
<span>${subtotal.toFixed(0)}</span>
<span>${tax.toFixed(0)}</span>
<span>${fleteValue.toFixed(0)}</span>
<span>${total.toFixed(0)}</span>
<td>${((line.quantity || 0) * (line.price || 0)).toFixed(0)}</td>
```

#### 3.2 PDFs - Los 4 Estilos

**Modificar función `formatCurrency`:**

**ANTES:**
```javascript
const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
```

**DESPUÉS:**
```javascript
const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0, // ← NUEVO: Forzar 0 decimales
  });
```

**Nota:** Si `formatCurrency` ya tiene `minimumFractionDigits: 0`, solo agregar `maximumFractionDigits: 0`.

#### 3.3 Otros componentes que muestren montos

**Buscar en:**
- `src/componentes/cotizador/QuoteList.jsx`
- `src/componentes/dashboard/*.jsx`
- `src/componentes/cotizador/columns.jsx`

**Cambiar:** `.toFixed(2)` → `.toFixed(0)`

---

## ✅ Criterios de Éxito

### IVA Selectivo:
- [ ] Productos con "libro" en el nombre muestran "Exento" en la columna de impuestos
- [ ] Productos con "patineta" en el nombre muestran "Exento"
- [ ] Otros productos muestran "19% IVA"
- [ ] El cálculo del total es correcto (IVA solo para productos NO exentos)
- [ ] Los PDFs muestran "Exento" o "19%" correctamente

### Flete en PDFs:
- [ ] Si el flete es manual y tiene valor > 0, aparece en la sección de totales del PDF
- [ ] Si el flete es "incluido", NO aparece línea de flete
- [ ] El total incluye el flete correctamente

### Sin Decimales:
- [ ] Todos los montos en QuoteForm se muestran sin decimales (ej: $833605 en vez de $833605.00)
- [ ] Todos los montos en PDFs se muestran sin decimales
- [ ] El formato es consistente en toda la app

---

## 🧪 Testing

### Test 1: IVA Selectivo
1. Sincronizar productos de Wix
2. Verificar en Firestore que productos con "libro" o "patineta" tienen `exento_iva: true`
3. Crear cotización con:
   - 1 libro (debe mostrar "Exento")
   - 1 patineta (debe mostrar "Exento")
   - 1 juguete normal (debe mostrar "19% IVA")
4. Verificar que el total de IVA sea correcto (solo del juguete)
5. Generar PDF y verificar que muestre "Exento" y "19%" correctamente

### Test 2: Flete en PDF
1. Crear cotización con flete manual de $50000
2. Generar PDF
3. Verificar que aparezca línea "Flete: $50.000"
4. Crear otra cotización con flete incluido
5. Generar PDF
6. Verificar que NO aparezca línea de flete

### Test 3: Sin Decimales
1. Crear cotización con productos
2. Verificar que todos los montos se muestren sin .00
3. Generar PDF
4. Verificar que todos los montos en el PDF estén sin decimales

---

## 📝 Notas Importantes

1. **Sincronización Wix:** Después de modificar la Cloud Function, re-sincronizar productos para que se marque `exento_iva`.

2. **Productos Existentes:** Los productos ya sincronizados NO tendrán el campo `exento_iva`. Opciones:
   - Re-sincronizar (recomendado)
   - O agregar migración para marcar productos existentes

3. **Categorías Futuras:** Si agregan más categorías exentas, modificar la función `isExentoIVA` en `functions/index.js`.

4. **Precios en Wix:** Confirmar que los precios en Wix ya incluyen IVA (según lo mencionado).

---

## 🚀 Orden de Ejecución

1. Modificar `functions/index.js` (IVA selectivo)
2. Deploy de Cloud Function: `firebase deploy --only functions`
3. Re-sincronizar productos desde la app
4. Modificar `QuoteForm.jsx` (IVA + decimales)
5. Modificar los 4 PDFs (IVA + flete + decimales)
6. Modificar otros componentes (decimales)
7. Testing completo
8. Commit y push

---

**¿Listo para ejecutar?**
