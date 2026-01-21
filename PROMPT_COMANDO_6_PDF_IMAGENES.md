# COMANDO 6: Agregar Imágenes de Productos a los PDFs

## 🎯 Objetivo
Modificar los 4 estilos de PDF existentes (Bubble, Light, Striped, Wave) para que **muestren las imágenes de los productos** en la tabla de líneas de cotización.

## 📋 Contexto

### Archivos a Modificar
Los 4 archivos de estilos de PDF ubicados en:
```
src/componentes/configuracion/estilos/pdf/
├── QuotePDF Bubble.jsx
├── QuotePDF Light.jsx
├── QuotePDF Striped.jsx
└── QuotePDF Wave.jsx
```

### Problema Actual
Actualmente, la tabla de productos en los PDFs **NO muestra imágenes**. Solo muestra:
- Descripción (nombre del producto)
- Cantidad
- Precio Unitario
- Impuestos
- Importe

### Datos Disponibles

#### En `quote.lineas` (array):
```javascript
{
  productId: "abc123",
  productName: "Libro Pintura Hadas",
  quantity: 5,
  price: 39900
}
```

#### Para obtener la imagen del producto:
Necesitamos hacer un lookup en Firestore para obtener `imagen_url` del producto usando `productId`.

**Ruta Firestore:**
```
usuarios/{userId}/productos/{productId}
  └── imagen_url: "https://static.wixstatic.com/media/..."
```

## 🔧 Implementación Requerida

### Paso 1: Modificar la Estructura de Datos

**En cada archivo PDF**, el componente recibe `{ quote, client }`. Necesitamos:

1. **Agregar un nuevo prop `products`** que contenga el array completo de productos con sus imágenes.
2. **Modificar `QuotePDF.jsx`** (el router) para pasar este prop a todos los estilos.

### Paso 2: Actualizar `QuotePDF.jsx` (Router)

**Archivo:** `src/componentes/cotizador/QuotePDF.jsx`

**Cambios:**
```javascript
// ANTES
const QuotePDF = ({ quote, client, styleName }) => {
  switch (styleName) {
    case 'Bubble':
      return <QuotePDFBubble quote={quote} client={client} />;
    // ...
  }
};

// DESPUÉS
const QuotePDF = ({ quote, client, products, styleName }) => {
  switch (styleName) {
    case 'Bubble':
      return <QuotePDFBubble quote={quote} client={client} products={products} />;
    case 'Light':
      return <QuotePDFLight quote={quote} client={client} products={products} />;
    case 'Striped':
      return <QuotePDFStriped quote={quote} client={client} products={products} />;
    case 'Wave':
      return <QuotePDFWave quote={quote} client={client} products={products} />;
    default:
      return <QuotePDFBubble quote={quote} client={client} products={products} />;
  }
};
```

### Paso 3: Modificar Cada Estilo de PDF

Para **cada uno de los 4 archivos** (`Bubble.jsx`, `Light.jsx`, `Striped.jsx`, `Wave.jsx`):

#### 3.1 Importar el componente `Image`
```javascript
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
```

#### 3.2 Agregar estilos para la imagen
```javascript
const styles = StyleSheet.create({
  // ... estilos existentes ...
  
  // NUEVO: Estilos para imágenes
  productImage: {
    width: 50,
    height: 50,
    objectFit: 'cover',
    marginRight: 8,
  },
  tableRowWithImage: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: 'center', // Para centrar verticalmente la imagen
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
```

#### 3.3 Modificar la firma del componente
```javascript
// ANTES
const QuotePDF = ({ quote, client }) => (

// DESPUÉS
const QuotePDF = ({ quote, client, products = [] }) => (
```

#### 3.4 Crear función helper para obtener imagen
```javascript
// Función auxiliar para obtener la imagen del producto
const getProductImage = (productId) => {
  const product = products.find(p => p.id === productId);
  return product?.imagen_url || 'https://placehold.co/200x200/e5e7eb/6b7280?text=Sin+Imagen';
};
```

#### 3.5 Modificar la tabla de productos

**ANTES:**
```javascript
{quote.lineas.map((line, i) => (
  <View key={i} style={styles.tableRow}>
    <Text style={[styles.colDescription]}>{line.productName}</Text>
    <Text style={[styles.colQty]}>{line.quantity.toFixed(2)} Unidades</Text>
    <Text style={[styles.colPrice]}>{formatCurrency(line.price)}</Text>
    <Text style={[styles.colTax]}>19%</Text>
    <Text style={[styles.colImporte]}>{formatCurrency(line.quantity * line.price)}</Text>
  </View>
))}
```

**DESPUÉS:**
```javascript
{quote.lineas.map((line, i) => (
  <View key={i} style={styles.tableRowWithImage}>
    {/* Columna de Imagen + Descripción */}
    <View style={[styles.colDescription, styles.productInfo]}>
      <Image 
        src={getProductImage(line.productId)} 
        style={styles.productImage}
      />
      <Text>{line.productName}</Text>
    </View>
    
    <Text style={[styles.colQty]}>{line.quantity.toFixed(2)} Unidades</Text>
    <Text style={[styles.colPrice]}>{formatCurrency(line.price)}</Text>
    <Text style={[styles.colTax]}>19%</Text>
    <Text style={[styles.colImporte]}>{formatCurrency(line.quantity * line.price)}</Text>
  </View>
))}
```

### Paso 4: Actualizar los Llamados al PDF

Necesitamos asegurarnos de que donde se genera el PDF, se pasen los productos.

**Archivos a revisar:**
- `src/componentes/cotizador/DownloadPDFButton.jsx` (o similar)
- Cualquier lugar donde se llame a `pdf(QuotePDF).toBlob()`

**Ejemplo de cambio:**
```javascript
// ANTES
const blob = await pdf(
  <QuotePDF 
    quote={quoteData} 
    client={clientData} 
    styleName={styleName} 
  />
).toBlob();

// DESPUÉS
const blob = await pdf(
  <QuotePDF 
    quote={quoteData} 
    client={clientData} 
    products={products}  // ← NUEVO
    styleName={styleName} 
  />
).toBlob();
```

**Nota:** Si `products` no está disponible en ese contexto, necesitarás:
1. Cargar los productos desde Firestore antes de generar el PDF
2. O pasarlos como prop desde el componente padre

## 📐 Consideraciones de Diseño

### Tamaño de Imagen
- **Ancho:** 50px
- **Alto:** 50px
- **Margen derecho:** 8px (separación del texto)

### Manejo de Errores
- Si `imagen_url` no existe → usar placeholder: `https://placehold.co/200x200/e5e7eb/6b7280?text=Sin+Imagen`
- Si `productId` no se encuentra en el array `products` → usar el mismo placeholder

### Alineación
- La imagen debe estar **centrada verticalmente** con el texto del nombre del producto
- Usar `alignItems: 'center'` en el contenedor de la fila

### Columnas
Ajustar el ancho de la columna "Descripción" si es necesario para acomodar la imagen:
```javascript
colDescription: { width: '40%' }, // Aumentar si era 34%
```

## ✅ Criterios de Éxito

1. **Los 4 estilos de PDF muestran imágenes** de productos en la tabla
2. **Las imágenes se cargan correctamente** desde las URLs de Wix
3. **Si no hay imagen**, se muestra un placeholder gris con texto "Sin Imagen"
4. **La alineación es correcta** (imagen + texto centrados verticalmente)
5. **El PDF se genera sin errores** en todos los estilos
6. **El diseño general no se rompe** (márgenes, espaciado, colores se mantienen)

## 🧪 Testing

Después de implementar:

1. **Crear una cotización** con productos que tengan imágenes
2. **Generar PDF** en cada uno de los 4 estilos
3. **Verificar** que las imágenes aparecen correctamente
4. **Probar** con un producto sin imagen (debe mostrar placeholder)
5. **Revisar** que el layout no se rompe en ningún estilo

## 📝 Notas Adicionales

- **No modificar** los colores, fuentes o diseño general de cada estilo
- **Solo agregar** la funcionalidad de imágenes
- **Mantener** la consistencia entre los 4 estilos
- **Usar** `@react-pdf/renderer` versión actual del proyecto

## 🚀 Orden de Ejecución

1. Modificar `QuotePDF.jsx` (router) para aceptar y pasar `products`
2. Modificar `QuotePDF Bubble.jsx` (empezar con uno para probar)
3. Probar que funciona con Bubble
4. Replicar cambios en `Light.jsx`, `Striped.jsx`, `Wave.jsx`
5. Actualizar componentes que generan PDFs para pasar `products`
6. Testing final de los 4 estilos

---

**¿Tienes alguna duda sobre la implementación?**
