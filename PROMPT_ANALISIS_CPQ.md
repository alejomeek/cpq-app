# ANÁLISIS: Mapeo de Campos Wix → CPQ

## 🎯 CONTEXTO

Estamos implementando una arquitectura donde Master Database (alimentado por Wix) proyectará productos a CPQ sin embeddings.

Actualmente CPQ se alimenta directamente de Wix y tiene embeddings pesados que hacen lenta la app.

## 📋 TU TAREA

Necesito que analices el código de CPQ-APP para entender cómo se mapean los campos de Wix a la estructura de productos en CPQ.

---

## 🔍 PREGUNTAS ESPECÍFICAS

### 1. **¿Dónde está el código que sincroniza Wix → CPQ?**

Busca en el proyecto CPQ-APP:
- Archivos que hagan fetch a Wix API
- Funciones que procesen productos de Wix
- Transformaciones de datos Wix → CPQ

Archivos probables:
- `sync.js`, `wix-sync.js`, `products.js`
- Carpetas: `/services`, `/utils`, `/api`

---

### 2. **¿Cómo se mapea cada campo?**

Para cada campo en la estructura CPQ, necesito saber de dónde viene:

**Estructura CPQ actual:**
```javascript
{
  sku: "10022",                    // ¿De dónde? → Wix: ???
  nombre: "Juego de retos...",     // ¿De dónde? → Wix: product.name?
  descripcion: "7 años + ...",     // ¿De dónde? → Wix: product.description?
  categoria: "physical",           // ¿De dónde? → Wix: product.productType?
  precioBase: 109900,              // ¿Se calcula? ¿Cómo?
  precio_iva_incluido: 109900,    // ¿Se calcula? ¿Cómo?
  inventory: 0,                    // ¿De dónde? → Wix: product.stock.quantity?
  exento_iva: false,               // ¿Se calcula? ¿Cómo?
  imagen_url: "https://...",       // ¿De dónde? → Wix: product.media.mainMedia.image.url?
  fechaActualizacion: "...",       // ¿Timestamp local?
  lastSync: "...",                 // ¿Timestamp de sync?
  embedding: [...]                 // ← ESTE LO VAMOS A QUITAR
}
```

**Para cada campo, documenta:**
- Campo de origen en Wix
- Si se aplica alguna transformación
- Si se calcula (fórmula o lógica)

---

### 3. **¿Cómo se calculan los campos especiales?**

**precioBase:**
```javascript
// ¿Es directamente de Wix?
// ¿O se calcula desde price.discountedPrice / price.price?
// ¿Tiene alguna lógica especial?
```

**precio_iva_incluido:**
```javascript
// ¿Se calcula como: precioBase * 1.19?
// ¿O viene de priceData.price de Wix?
// ¿Depende de exento_iva?
```

**exento_iva:**
```javascript
// ¿Cómo se determina si un producto está exento?
// ¿Viene de algún campo de Wix?
// ¿O es una lista hardcodeada de SKUs?
// ¿O se basa en categoría?
```

---

### 4. **¿Hay campos que CPQ agrega/mantiene propios?**

Campos que NO vienen de Wix pero CPQ los necesita:
- notas_internas
- descuentos_personalizados
- ultima_cotizacion
- favorito
- etc.

---

## 📤 FORMATO DE RESPUESTA

Por favor responde en este formato:

```markdown
## MAPEO WIX → CPQ

### Archivo(s) de sincronización
- `ruta/archivo.js` - líneas X-Y
- Función principal: `syncWixProducts()`

### Mapeo de campos

| Campo CPQ | Origen Wix | Transformación | Notas |
|-----------|------------|----------------|-------|
| sku | product.sku | Ninguna | Directo |
| nombre | product.name | Ninguna | Directo |
| precioBase | product.price.price | Se divide por 1.19 | Precio sin IVA |
| exento_iva | N/A | Lógica custom | Basado en categoría |
| ... | ... | ... | ... |

### Lógica de cálculo de precios

```javascript
// Código exacto de cómo se calculan:
// - precioBase
// - precio_iva_incluido
// - exento_iva
```

### Campos específicos de CPQ

- `notas_internas`: No viene de Wix, lo mantiene CPQ
- `favorito`: Campo local de CPQ
- etc.
```

---

## 🎯 OBJETIVO FINAL

Con tu análisis, podremos crear la proyección correcta:

```javascript
// Master → CPQ projection
function projectMasterToCPQ(masterProduct) {
  return {
    sku: masterProduct.sku,
    nombre: masterProduct.name,
    precioBase: calcularPrecioBase(masterProduct.price),  // ← Tu análisis
    precio_iva_incluido: calcularPrecioIVA(masterProduct.price, exento), // ← Tu análisis
    exento_iva: determinarExentoIVA(masterProduct),  // ← Tu análisis
    // ... resto según tu mapeo
    // ⚠️ NO incluir embedding
  };
}
```

---

## ⚠️ IMPORTANTE

- Busca el código ACTUAL de CPQ-APP
- No asumas, busca la implementación real
- Si hay múltiples formas de hacer algo, documenta todas
- Si algo no está claro, indícalo

---

**¡Gracias! Esta información es crítica para la migración correcta.**
