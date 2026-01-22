# Ajustes Finales al PDF: Columnas, Desglose de IVA y Totales

## 🎯 Objetivos

1. **Redistribuir columnas de la tabla** para espaciado uniforme
2. **Mostrar precio con y sin IVA por producto** en la tabla
3. **Cambiar "Base imponible" por "Precio sin IVA"**
4. **Nueva estructura de totales:** Precio sin IVA + IVA = Subtotal, luego Subtotal + Flete = Total

---

## 📋 Cambio 1: Redistribuir Columnas de la Tabla

### Problema Actual
Las columnas tienen espaciado desigual:
- Mucho espacio entre "Cantidad" y "Precio unitario"
- Poco espacio entre "Precio unitario" e "Impuestos"
- Mucho espacio hasta "Importe"

### Solución: Nuevas Columnas

**Estructura NUEVA de la tabla:**

| Imagen + Descripción | Cantidad | Precio Unit. | IVA Unit. | Total Línea |
|---------------------|----------|--------------|-----------|-------------|
| 35% | 12% | 18% | 15% | 20% |

**Detalles:**
- **Imagen + Descripción:** 35% (mantener imagen 50x50px + nombre)
- **Cantidad:** 12% (centrado)
- **Precio Unitario:** 18% (derecha, sin IVA)
- **IVA Unitario:** 15% (derecha, IVA del producto o "Exento")
- **Total Línea:** 20% (derecha, precio con IVA incluido)

### Archivos a Modificar

**Los 4 PDFs:** Bubble, Light, Striped, Wave

**Modificar estilos de columnas:**

**ANTES:**
```javascript
colDescription: { width: '34%' },
colQty: { width: '15%', textAlign: 'center' },
colPrice: { width: '16%', textAlign: 'right' },
colTax: { width: '12%', textAlign: 'center' },
colImporte: { width: '23%', textAlign: 'right' },
```

**DESPUÉS:**
```javascript
colDescription: { width: '35%' },
colQty: { width: '12%', textAlign: 'center' },
colPriceUnit: { width: '18%', textAlign: 'right' },
colIvaUnit: { width: '15%', textAlign: 'right' },
colTotal: { width: '20%', textAlign: 'right' },
```

**Modificar header de la tabla:**

**ANTES:**
```javascript
<View style={styles.tableHeader}>
  <Text style={[styles.tableHeaderCell, styles.colDescription]}>DESCRIPCIÓN</Text>
  <Text style={[styles.tableHeaderCell, styles.colQty]}>CANTIDAD</Text>
  <Text style={[styles.tableHeaderCell, styles.colPrice]}>PRECIO UNITARIO</Text>
  <Text style={[styles.tableHeaderCell, styles.colTax]}>IMPUESTOS</Text>
  <Text style={[styles.tableHeaderCell, styles.colImporte]}>IMPORTE</Text>
</View>
```

**DESPUÉS:**
```javascript
<View style={styles.tableHeader}>
  <Text style={[styles.tableHeaderCell, styles.colDescription]}>DESCRIPCIÓN</Text>
  <Text style={[styles.tableHeaderCell, styles.colQty]}>CANT.</Text>
  <Text style={[styles.tableHeaderCell, styles.colPriceUnit]}>PRECIO UNIT.</Text>
  <Text style={[styles.tableHeaderCell, styles.colIvaUnit]}>IVA UNIT.</Text>
  <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL LÍNEA</Text>
</View>
```

---

## 📋 Cambio 2: Mostrar Precio con y sin IVA por Producto

### Lógica

Para cada línea de producto:
- **Precio Unitario (sin IVA):** `line.price` (ya viene sin IVA)
- **IVA Unitario:** 
  - Si `product.exento_iva === true` → "Exento"
  - Si no → `line.price * 0.19`
- **Total Línea (con IVA):**
  - Si exento → `line.quantity * line.price`
  - Si no → `line.quantity * (line.price * 1.19)`

### Modificar filas de la tabla

**ANTES:**
```javascript
{quote.lineas.map((line, i) => {
  const product = products.find(p => p.id === line.productId);
  return (
    <View key={i} style={styles.tableRowWithImage}>
      <View style={[styles.colDescription, styles.productInfo]}>
        <Image src={getProductImage(line.productId)} style={styles.productImage} />
        <Text>{line.productName}</Text>
      </View>
      <Text style={[styles.colQty]}>{line.quantity.toFixed(2)} Unidades</Text>
      <Text style={[styles.colPrice]}>{formatCurrency(line.price)}</Text>
      <Text style={[styles.colTax]}>
        {product?.exento_iva ? 'Exento' : '19%'}
      </Text>
      <Text style={[styles.colImporte]}>
        {formatCurrency(line.quantity * line.price)}
      </Text>
    </View>
  );
})}
```

**DESPUÉS:**
```javascript
{quote.lineas.map((line, i) => {
  const product = products.find(p => p.id === line.productId);
  const precioSinIva = line.price;
  const ivaUnitario = product?.exento_iva ? 0 : (line.price * 0.19);
  const precioConIva = precioSinIva + ivaUnitario;
  const totalLinea = line.quantity * precioConIva;
  
  return (
    <View key={i} style={styles.tableRowWithImage}>
      {/* Imagen + Descripción */}
      <View style={[styles.colDescription, styles.productInfo]}>
        <Image src={getProductImage(line.productId)} style={styles.productImage} />
        <Text>{line.productName}</Text>
      </View>
      
      {/* Cantidad */}
      <Text style={[styles.colQty]}>{line.quantity.toFixed(0)}</Text>
      
      {/* Precio Unitario (sin IVA) */}
      <Text style={[styles.colPriceUnit]}>{formatCurrency(precioSinIva)}</Text>
      
      {/* IVA Unitario */}
      <Text style={[styles.colIvaUnit]}>
        {product?.exento_iva ? 'Exento' : formatCurrency(ivaUnitario)}
      </Text>
      
      {/* Total Línea (con IVA) */}
      <Text style={[styles.colTotal]}>{formatCurrency(totalLinea)}</Text>
    </View>
  );
})}
```

---

## 📋 Cambio 3: Cambiar "Base imponible" por "Precio sin IVA"

### Archivos a Modificar

**Los 4 PDFs:** Bubble, Light, Striped, Wave

**Modificar sección de totales:**

**ANTES:**
```javascript
<View style={styles.totalRow}>
  <Text style={styles.totalLabel}>Base imponible</Text>
  <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
</View>
```

**DESPUÉS:**
```javascript
<View style={styles.totalRow}>
  <Text style={styles.totalLabel}>Precio sin IVA</Text>
  <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
</View>
```

---

## 📋 Cambio 4: Nueva Estructura de Totales

### Estructura Deseada

```
Precio sin IVA:  $669.400
IVA 19%:         $43.643
Subtotal:        $713.043
Flete:           $20.000
────────────────────────────
Total:           $733.043
```

### Lógica

- **Precio sin IVA:** Suma de todos los productos sin IVA (`quote.subtotal`)
- **IVA 19%:** IVA total calculado (`quote.impuestos`)
- **Subtotal:** Precio sin IVA + IVA (`quote.subtotal + quote.impuestos`)
- **Flete:** Solo si `quote.fleteValue > 0`
- **Total:** Subtotal + Flete (`quote.total`)

### Modificar sección de totales

**ANTES:**
```javascript
<View style={styles.totalsBox}>
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>Base imponible</Text>
    <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
  </View>
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>IVA 19%</Text>
    <Text style={styles.totalValue}>{formatCurrency(quote.impuestos)}</Text>
  </View>
  {quote.fleteValue > 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Flete</Text>
      <Text style={styles.totalValue}>{formatCurrency(quote.fleteValue)}</Text>
    </View>
  )}
  <View style={styles.totalFinal}>
    <Text style={styles.totalFinalLabel}>Total</Text>
    <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
  </View>
</View>
```

**DESPUÉS:**
```javascript
<View style={styles.totalsBox}>
  {/* Precio sin IVA */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>Precio sin IVA</Text>
    <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
  </View>
  
  {/* IVA 19% */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>IVA 19%</Text>
    <Text style={styles.totalValue}>{formatCurrency(quote.impuestos)}</Text>
  </View>
  
  {/* Subtotal (Precio sin IVA + IVA) */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>Subtotal</Text>
    <Text style={styles.totalValue}>
      {formatCurrency(quote.subtotal + quote.impuestos)}
    </Text>
  </View>
  
  {/* Flete (solo si > 0) */}
  {quote.fleteValue > 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Flete</Text>
      <Text style={styles.totalValue}>{formatCurrency(quote.fleteValue)}</Text>
    </View>
  )}
  
  {/* Total Final */}
  <View style={styles.totalFinal}>
    <Text style={styles.totalFinalLabel}>Total</Text>
    <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
  </View>
</View>
```

---

## 📋 Cambio 5: Actualizar QuoteForm.jsx (UI de la App)

Para consistencia, también debemos actualizar la interfaz de la app.

### Modificar tabla de líneas en QuoteForm.jsx

**Header de la tabla:**

**ANTES:**
```javascript
<th className="px-6 py-3">Producto</th>
<th className="px-6 py-3 w-24">Cantidad</th>
<th className="px-6 py-3 w-40">Precio Unitario</th>
<th className="px-6 py-3 w-32">Impuestos</th>
<th className="px-6 py-3 w-40 text-right">Importe</th>
```

**DESPUÉS:**
```javascript
<th className="px-6 py-3">Producto</th>
<th className="px-6 py-3 w-24">Cant.</th>
<th className="px-6 py-3 w-32">Precio Unit.</th>
<th className="px-6 py-3 w-32">IVA Unit.</th>
<th className="px-6 py-3 w-32 text-right">Total Línea</th>
```

**Filas de la tabla:**

**ANTES:**
```javascript
<td className="px-6 py-2">
  {(() => {
    const product = products.find(p => p.id === line.productId);
    return product?.exento_iva ? 'Exento' : '19% IVA';
  })()}
</td>
<td className="px-6 py-2 text-right font-semibold">
  ${((line.quantity || 0) * (line.price || 0)).toFixed(0)}
</td>
```

**DESPUÉS:**
```javascript
{/* IVA Unitario */}
<td className="px-6 py-2 text-right">
  {(() => {
    const product = products.find(p => p.id === line.productId);
    if (product?.exento_iva) return 'Exento';
    const ivaUnit = (line.price || 0) * 0.19;
    return `$${ivaUnit.toFixed(0)}`;
  })()}
</td>

{/* Total Línea (con IVA) */}
<td className="px-6 py-2 text-right font-semibold">
  {(() => {
    const product = products.find(p => p.id === line.productId);
    const precioSinIva = line.price || 0;
    const ivaUnit = product?.exento_iva ? 0 : (precioSinIva * 0.19);
    const precioConIva = precioSinIva + ivaUnit;
    const totalLinea = (line.quantity || 0) * precioConIva;
    return `$${totalLinea.toFixed(0)}`;
  })()}
</td>
```

### Modificar card de totales en QuoteForm.jsx

**ANTES:**
```javascript
<div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(0)}</span></div>
<div className="flex justify-between"><span>IVA 19%:</span><span>${tax.toFixed(0)}</span></div>
{/* ... flete ... */}
<div className="flex justify-between text-xl">
  <span className="font-bold">Total:</span>
  <span className="font-bold text-primary">${total.toFixed(0)}</span>
</div>
```

**DESPUÉS:**
```javascript
{/* Precio sin IVA */}
<div className="flex justify-between">
  <span>Precio sin IVA:</span>
  <span>${subtotal.toFixed(0)}</span>
</div>

{/* IVA 19% */}
<div className="flex justify-between">
  <span>IVA 19%:</span>
  <span>${tax.toFixed(0)}</span>
</div>

{/* Subtotal */}
<div className="flex justify-between font-semibold">
  <span>Subtotal:</span>
  <span>${(subtotal + tax).toFixed(0)}</span>
</div>

<Separator />

{/* Flete (si aplica) */}
{/* ... código de flete existente ... */}

<Separator />

{/* Total */}
<div className="flex justify-between text-xl">
  <span className="font-bold">Total:</span>
  <span className="font-bold text-primary">${total.toFixed(0)}</span>
</div>
```

---

## ✅ Criterios de Éxito

### Columnas de la Tabla:
- [ ] Espaciado uniforme entre columnas
- [ ] Anchos: 35%, 12%, 18%, 15%, 20%
- [ ] Headers: "DESCRIPCIÓN", "CANT.", "PRECIO UNIT.", "IVA UNIT.", "TOTAL LÍNEA"

### Desglose por Producto:
- [ ] Precio unitario muestra precio SIN IVA
- [ ] IVA unitario muestra monto de IVA o "Exento"
- [ ] Total línea muestra precio CON IVA incluido
- [ ] Cálculos correctos para productos exentos y no exentos

### Totales:
- [ ] "Base imponible" cambiado a "Precio sin IVA"
- [ ] Nueva línea "Subtotal" = Precio sin IVA + IVA
- [ ] Flete aparece después del subtotal
- [ ] Total = Subtotal + Flete
- [ ] Estructura: Precio sin IVA → IVA → Subtotal → Flete → Total

### Consistencia:
- [ ] Cambios aplicados en los 4 estilos de PDF
- [ ] Cambios aplicados en QuoteForm.jsx (UI de la app)
- [ ] Formato sin decimales mantenido

---

## 🧪 Testing

1. **Crear cotización con:**
   - 1 libro (exento)
   - 1 producto normal (con IVA)
   - Flete manual

2. **Verificar en la app:**
   - Tabla muestra precio sin IVA, IVA unitario, y total con IVA
   - Card de totales muestra: Precio sin IVA → IVA → Subtotal → Flete → Total

3. **Generar PDF:**
   - Columnas bien distribuidas
   - Desglose de IVA por producto visible
   - Totales con estructura correcta

4. **Probar en los 4 estilos:**
   - Bubble, Light, Striped, Wave

---

## 📝 Archivos a Modificar

1. `src/componentes/configuracion/estilos/pdf/QuotePDF Bubble.jsx`
2. `src/componentes/configuracion/estilos/pdf/QuotePDF Light.jsx`
3. `src/componentes/configuracion/estilos/pdf/QuotePDF Striped.jsx`
4. `src/componentes/configuracion/estilos/pdf/QuotePDF Wave.jsx`
5. `src/componentes/cotizador/QuoteForm.jsx`

---

**¿Listo para ejecutar?**
