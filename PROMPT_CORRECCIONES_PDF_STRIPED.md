# Correcciones Urgentes al PDF Striped

## 🎯 Archivo a Modificar

**SOLO:** `src/componentes/configuracion/estilos/pdf/QuotePDF Striped.jsx`

---

## 🐛 Problema 1: Precios Incorrectos en la Tabla

### Error Actual
- **Precio Unit.** muestra precio CON IVA (incorrecto)
- **IVA Unit.** está correcto ✅
- **Total Línea** debe ser: Precio Unit. (sin IVA) + IVA Unit.

### Solución

**Modificar el mapeo de líneas de productos:**

**ANTES (INCORRECTO):**
```javascript
{quote.lineas.map((line, i) => {
  const product = products.find(p => p.id === line.productId);
  const precioSinIva = line.price;
  const ivaUnitario = product?.exento_iva ? 0 : (line.price * 0.19);
  const precioConIva = precioSinIva + ivaUnitario;
  const totalLinea = line.quantity * precioConIva;
  
  return (
    <View key={i} style={styles.tableRowWithImage}>
      {/* ... */}
      <Text style={[styles.colPriceUnit]}>{formatCurrency(precioSinIva)}</Text>
      <Text style={[styles.colIvaUnit]}>
        {product?.exento_iva ? 'Exento' : formatCurrency(ivaUnitario)}
      </Text>
      <Text style={[styles.colTotal]}>{formatCurrency(totalLinea)}</Text>
    </View>
  );
})}
```

**DESPUÉS (CORRECTO):**
```javascript
{quote.lineas.map((line, i) => {
  const product = products.find(p => p.id === line.productId);
  
  // CORRECCIÓN: line.price ya viene CON IVA incluido desde Wix
  // Necesitamos calcular el precio SIN IVA
  const precioConIvaOriginal = line.price;
  const precioSinIva = product?.exento_iva 
    ? precioConIvaOriginal  // Si está exento, el precio es el mismo
    : precioConIvaOriginal / 1.19;  // Si tiene IVA, dividir por 1.19
  
  const ivaUnitario = product?.exento_iva ? 0 : (precioSinIva * 0.19);
  const precioConIva = precioSinIva + ivaUnitario;  // Esto debería ser igual a line.price
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
      
      {/* Precio Unitario (SIN IVA) */}
      <Text style={[styles.colPriceUnit]}>{formatCurrency(precioSinIva)}</Text>
      
      {/* IVA Unitario */}
      <Text style={[styles.colIvaUnit]}>
        {product?.exento_iva ? 'Exento' : formatCurrency(ivaUnitario)}
      </Text>
      
      {/* Total Línea (Precio sin IVA + IVA) */}
      <Text style={[styles.colTotal]}>{formatCurrency(totalLinea)}</Text>
    </View>
  );
})}
```

---

## 🐛 Problema 2: Agregar Logo de Empresa

### Ubicación
Esquina superior izquierda (donde actualmente hay espacio en blanco)

### Solución

**1. Agregar import de Image (si no está):**
```javascript
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
```

**2. Agregar estilo para el logo:**
```javascript
const styles = StyleSheet.create({
  // ... estilos existentes ...
  
  companyLogo: {
    width: 80,
    height: 80,
    objectFit: 'contain',
    marginBottom: 10,
  },
});
```

**3. Modificar sección de encabezado de empresa:**

**ANTES:**
```javascript
{/* ENCABEZADO EMPRESA */}
<View style={styles.companyInfo}>
  <Text style={styles.companyName}>DIDACTICOS JUGANDO Y EDUCANDO SAS</Text>
  <Text style={styles.companyDetails}>AVENIDA 19 114 A 22</Text>
  <Text style={styles.companyDetails}>BOGOTÁ</Text>
  <Text style={styles.companyDetails}>Colombia</Text>
  <Text style={styles.companyDetails}>NIT: 901144615-6</Text>
</View>
```

**DESPUÉS:**
```javascript
{/* ENCABEZADO EMPRESA */}
<View style={styles.companyInfo}>
  {/* Logo de empresa (si existe) */}
  {quote.companyLogoUrl && (
    <Image src={quote.companyLogoUrl} style={styles.companyLogo} />
  )}
  
  <Text style={styles.companyName}>DIDACTICOS JUGANDO Y EDUCANDO SAS</Text>
  <Text style={styles.companyDetails}>AVENIDA 19 114 A 22</Text>
  <Text style={styles.companyDetails}>BOGOTÁ</Text>
  <Text style={styles.companyDetails}>Colombia</Text>
  <Text style={styles.companyDetails}>NIT: 901144615-6</Text>
</View>
```

**4. Actualizar llamadas al PDF para pasar el logo:**

En `QuoteForm.jsx` (DownloadPDFButton) y otros lugares donde se genera el PDF:

**ANTES:**
```javascript
const doc = <QuotePDF 
  quote={{ ...quote, subtotal, impuestos: tax, total }} 
  client={currentClient} 
  products={products} 
  styleName={styleToUse} 
/>;
```

**DESPUÉS:**
```javascript
// Cargar logo desde settings
const companySettings = await getDoc(doc(db, 'usuarios', user.uid, 'settings', 'company'));
const companyLogoUrl = companySettings.data()?.logo_url || null;

const doc = <QuotePDF 
  quote={{ 
    ...quote, 
    subtotal, 
    impuestos: tax, 
    total,
    companyLogoUrl  // ← NUEVO
  }} 
  client={currentClient} 
  products={products} 
  styleName={styleToUse} 
/>;
```

---

## 🐛 Problema 3: Quitar "Comercial: No asignado"

### Solución

**Buscar y eliminar esta sección:**

```javascript
{/* COMERCIAL */}
<View style={styles.infoSection}>
  <Text style={styles.infoLabel}>Comercial</Text>
  <Text style={styles.infoValue}>
    {quote.comercial || 'No asignado'}
  </Text>
</View>
```

**Ajustar el ancho de las secciones restantes:**

Si había 4 secciones (Cliente, Comercial, Emisión, Vencimiento), ahora serán 3.

**ANTES:**
```javascript
infoSection: {
  width: '23%',  // 4 secciones = 23% cada una
},
```

**DESPUÉS:**
```javascript
infoSection: {
  width: '30%',  // 3 secciones = ~30% cada una
},
```

---

## 🐛 Problema 4: Paginación Incorrecta (siempre "Página 1 / 1")

### Problema
El PDF tiene 3 páginas pero el footer muestra "Página 1 / 1"

### Solución

**Usar `render` prop de `@react-pdf/renderer` para obtener número de página dinámico:**

**ANTES:**
```javascript
{/* PIE DE PÁGINA */}
<View style={styles.footer} fixed>
  <Text>Pie de página</Text>
  <Text>Página 1 / 1</Text>
</View>
```

**DESPUÉS:**
```javascript
{/* PIE DE PÁGINA */}
<View style={styles.footer} fixed>
  <Text>Generado por Cepequ</Text>
  <Text render={({ pageNumber, totalPages }) => (
    `Página ${pageNumber} / ${totalPages}`
  )} />
</View>
```

---

## 🐛 Problema 5: Título del PDF

### Cambio Solicitado
- **ANTES:** "Cotización n° COT-BQ-0002"
- **DESPUÉS:** "COT-BQ-0002"

### Solución

**Buscar el título y simplificarlo:**

**ANTES:**
```javascript
<View style={styles.bubbleTitleContainer} fixed>
  <Text style={styles.bubbleTitle}>Cotización n° {quote.numero}</Text>
</View>
```

**DESPUÉS:**
```javascript
<View style={styles.bubbleTitleContainer} fixed>
  <Text style={styles.bubbleTitle}>{quote.numero}</Text>
</View>
```

---

## 🔧 Problema Bonus: Ajustar Columnas (del mensaje anterior)

### Solución

**Modificar anchos de columnas para evitar choque:**

**ANTES:**
```javascript
colDescription: { width: '35%' },
colQty: { width: '12%', textAlign: 'center' },
colPriceUnit: { width: '18%', textAlign: 'right' },
colIvaUnit: { width: '15%', textAlign: 'right' },
colTotal: { width: '20%', textAlign: 'right' },
```

**DESPUÉS:**
```javascript
colDescription: { width: '32%' },
colQty: { width: '15%', textAlign: 'center' },
colPriceUnit: { width: '18%', textAlign: 'right' },
colIvaUnit: { width: '15%', textAlign: 'right' },
colTotal: { width: '20%', textAlign: 'right' },
```

**Agregar padding al texto de descripción:**
```javascript
productInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingRight: 8,  // ← NUEVO
},
```

---

## ✅ Resumen de Cambios

1. ✅ **Precios corregidos:** Precio Unit. muestra SIN IVA, Total Línea = Precio sin IVA + IVA
2. ✅ **Logo de empresa:** Aparece en esquina superior izquierda
3. ✅ **Quitar "Comercial":** Sección eliminada, anchos ajustados
4. ✅ **Paginación dinámica:** "Página X / Y" correcto
5. ✅ **Título simplificado:** Solo "COT-BQ-0002"
6. ✅ **Columnas ajustadas:** Descripción 32%, Cantidad 15%

---

## 📝 Archivos a Modificar

1. `src/componentes/configuracion/estilos/pdf/QuotePDF Striped.jsx` (principal)
2. `src/componentes/cotizador/QuoteForm.jsx` (para pasar logo al PDF)
3. Posiblemente: `src/componentes/cotizador/QuoteList.jsx` (si genera PDFs desde ahí)

---

## 🧪 Testing

1. Crear cotización con productos exentos y no exentos
2. Verificar que Precio Unit. muestre precio SIN IVA
3. Verificar que Total Línea = Precio sin IVA + IVA
4. Verificar que el logo aparezca (si está configurado)
5. Verificar que NO aparezca "Comercial"
6. Generar PDF de 3+ páginas y verificar paginación
7. Verificar título solo muestre número de cotización

---

**¿Listo para ejecutar?**
