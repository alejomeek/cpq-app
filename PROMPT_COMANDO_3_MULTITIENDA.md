# COMANDO 3: Multi-Tienda y Campo Flete

## OBJETIVO

Implementar sistema de multi-tienda y campo de flete en cotizaciones:
1. **Multi-tienda:** Barranquilla y Medellín con numeración separada
2. **Campo Flete:** Manual (usuario ingresa valor) o "Incluido" (valor = 0)
3. **Numeración automática:** COT-BQ-0001, COT-MED-0001, etc.

---

## 1. SISTEMA DE NUMERACIÓN POR TIENDA

### Firestore: `usuarios/{userId}/contadores/`

Estructura:
```javascript
usuarios/
  └── {userId}/
      └── contadores/
          ├── cotizacion_barranquilla → { count: 47 }
          └── cotizacion_medellin → { count: 23 }
```

### Función para obtener siguiente número

**Ubicación:** Crear utility `src/utils/quoteNumbering.js`

```javascript
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Genera el siguiente número de cotización para una tienda
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} userId - ID del usuario
 * @param {string} tienda - "Barranquilla" o "Medellin"
 * @returns {Promise<string>} - Número de cotización (ej: "COT-BQ-0001")
 */
export async function getNextQuoteNumber(db, userId, tienda) {
  const tiendaNormalized = tienda.toLowerCase();
  const counterRef = doc(db, 'usuarios', userId, 'contadores', `cotizacion_${tiendaNormalized}`);
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    // Obtener count actual o empezar en 0
    const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
    const newCount = currentCount + 1;
    
    // Actualizar contador
    transaction.set(counterRef, { count: newCount });
    
    // Generar número con prefijo
    const prefix = tienda === "Barranquilla" ? "BQ" : "MED";
    const paddedNumber = String(newCount).padStart(4, '0');
    
    return `COT-${prefix}-${paddedNumber}`;
  });
}
```

**Testing de esta función:**
```javascript
// Ejemplo de uso:
const quoteNumber = await getNextQuoteNumber(db, user.uid, "Barranquilla");
// → "COT-BQ-0001"

const quoteNumber2 = await getNextQuoteNumber(db, user.uid, "Medellin");
// → "COT-MED-0001"
```

---

## 2. CAMPO DE TIENDA EN COTIZACIONES

### Modificar estructura de cotización en Firestore

**Firestore: `usuarios/{userId}/cotizaciones/{quoteId}`**

```javascript
{
  // ... campos existentes ...
  tienda: "Barranquilla",  // o "Medellin"
  numero: "COT-BQ-0047",    // Auto-generado según tienda
  
  // Campo de flete (nuevo)
  fleteType: "manual",       // "manual" o "incluido"
  fleteValue: 13200,         // 0 si es "incluido"
  
  // Totales
  subtotal: 798000,
  total: 811200              // subtotal + fleteValue
}
```

---

## 3. COMPONENTE: QuoteForm (MODIFICAR)

**Ubicación:** `src/componentes/cotizador/QuoteForm.jsx` (o similar)

### A. Agregar selector de tienda

Agregar al formulario:

```jsx
<div className="space-y-2">
  <Label htmlFor="tienda">Tienda *</Label>
  <Select
    value={formData.tienda}
    onValueChange={(value) => handleFieldChange('tienda', value)}
  >
    <SelectTrigger id="tienda">
      <SelectValue placeholder="Selecciona una tienda" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Barranquilla">
        🏪 Barranquilla
      </SelectItem>
      <SelectItem value="Medellin">
        🏪 Medellín
      </SelectItem>
    </SelectContent>
  </Select>
</div>
```

### B. Agregar campo de flete

Agregar en la sección de totales:

```jsx
{/* Campo de Flete */}
<div className="border-t pt-4 space-y-3">
  <Label>Flete</Label>
  
  <RadioGroup
    value={formData.fleteType}
    onValueChange={(value) => handleFleteTypeChange(value)}
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="incluido" id="flete-incluido" />
      <Label htmlFor="flete-incluido" className="font-normal cursor-pointer">
        Incluido en el precio
      </Label>
    </div>
    
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="manual" id="flete-manual" />
      <Label htmlFor="flete-manual" className="font-normal cursor-pointer">
        Agregar valor de flete
      </Label>
    </div>
  </RadioGroup>
  
  {/* Input de flete (solo si es manual) */}
  {formData.fleteType === 'manual' && (
    <div className="pl-6">
      <Label htmlFor="fleteValue" className="text-sm">Valor del flete</Label>
      <Input
        id="fleteValue"
        type="number"
        min="0"
        value={formData.fleteValue || ''}
        onChange={(e) => handleFieldChange('fleteValue', parseFloat(e.target.value) || 0)}
        placeholder="$ 0"
        className="mt-1"
      />
    </div>
  )}
</div>
```

### C. Funciones handler

```javascript
const handleFleteTypeChange = (type) => {
  setFormData(prev => ({
    ...prev,
    fleteType: type,
    fleteValue: type === 'incluido' ? 0 : prev.fleteValue || 0
  }));
};

// Calcular total incluyendo flete
const calculateTotal = () => {
  const subtotal = calculateSubtotal(); // Suma de productos
  const fleteValue = formData.fleteType === 'incluido' ? 0 : (formData.fleteValue || 0);
  return subtotal + fleteValue;
};
```

### D. Estados iniciales

Actualizar estado inicial:

```javascript
const [formData, setFormData] = useState({
  // ... campos existentes ...
  tienda: '',            // Vacío inicialmente, usuario debe seleccionar
  numero: '',            // Se genera automáticamente al guardar
  fleteType: 'incluido', // Default: incluido
  fleteValue: 0,
});
```

---

## 4. GENERAR NÚMERO AL CREAR COTIZACIÓN

### En la función de guardar cotización:

```javascript
const handleSaveQuote = async () => {
  try {
    setSaving(true);
    
    // Validar que tienda esté seleccionada
    if (!formData.tienda) {
      alert('Selecciona una tienda');
      return;
    }
    
    // Generar número de cotización
    const quoteNumber = await getNextQuoteNumber(db, user.uid, formData.tienda);
    
    // Calcular totales
    const subtotal = calculateSubtotal();
    const fleteValue = formData.fleteType === 'incluido' ? 0 : (formData.fleteValue || 0);
    const total = subtotal + fleteValue;
    
    // Crear objeto de cotización
    const quoteData = {
      ...formData,
      numero: quoteNumber,
      subtotal,
      fleteValue,
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.uid
    };
    
    // Guardar en Firestore
    await addDoc(collection(db, 'usuarios', user.uid, 'cotizaciones'), quoteData);
    
    alert(`✅ Cotización ${quoteNumber} creada exitosamente`);
    
    // Resetear formulario o navegar
    navigate('quotes-list');
    
  } catch (error) {
    console.error('Error creando cotización:', error);
    alert('Error al crear la cotización');
  } finally {
    setSaving(false);
  }
};
```

---

## 5. MOSTRAR NÚMERO EN LA UI

### En QuotesList o QuoteCard:

```jsx
<div className="flex items-center justify-between">
  <div>
    <h3 className="font-semibold text-lg">{quote.numero}</h3>
    <p className="text-sm text-muted-foreground">
      {quote.tienda} • {formatDate(quote.createdAt)}
    </p>
  </div>
  
  <Badge variant={getStatusVariant(quote.estado)}>
    {quote.estado}
  </Badge>
</div>
```

---

## 6. PDF: INCLUIR TIENDA Y FLETE

### En el componente PDF (cuando se implemente COMANDO 6):

```jsx
{/* Header del PDF */}
<Text style={styles.quoteNumber}>{quote.numero}</Text>
<Text style={styles.storeName}>Tienda: {quote.tienda}</Text>

{/* Totales */}
<View style={styles.totalsSection}>
  <Text>Subtotal: {formatCurrency(quote.subtotal)}</Text>
  
  {quote.fleteType === 'manual' && quote.fleteValue > 0 && (
    <Text>Flete: {formatCurrency(quote.fleteValue)}</Text>
  )}
  {quote.fleteType === 'incluido' && (
    <Text>Flete: Incluido</Text>
  )}
  
  <Text style={styles.total}>TOTAL: {formatCurrency(quote.total)}</Text>
</View>
```

---

## 7. VALIDACIONES

### En el formulario:

```javascript
const validateForm = () => {
  const errors = [];
  
  if (!formData.tienda) {
    errors.push('Selecciona una tienda');
  }
  
  if (!formData.clienteId) {
    errors.push('Selecciona un cliente');
  }
  
  if (formData.productos.length === 0) {
    errors.push('Agrega al menos un producto');
  }
  
  if (formData.fleteType === 'manual' && formData.fleteValue < 0) {
    errors.push('El valor del flete no puede ser negativo');
  }
  
  return errors;
};
```

---

## 8. COMPONENTES UI NECESARIOS

Asegurarse de tener importados:

```javascript
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group.jsx';
import { Label } from '@/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/ui/select.jsx';
```

Si no existen, crearlos usando Radix UI.

---

## 9. MIGRACIÓN DE DATOS

Si ya existen cotizaciones sin estos campos:

```javascript
// Script de migración (ejecutar una vez)
const migrateExistingQuotes = async () => {
  const quotesRef = collection(db, 'usuarios', userId, 'cotizaciones');
  const snapshot = await getDocs(quotesRef);
  
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Agregar campos faltantes
    if (!data.tienda) {
      batch.update(doc.ref, {
        tienda: 'Barranquilla',  // Default
        fleteType: 'incluido',
        fleteValue: 0
      });
    }
  });
  
  await batch.commit();
  console.log('✅ Migración completada');
};
```

---

## 10. TESTING

1. **Crear cotización en Barranquilla:**
   - Seleccionar tienda: Barranquilla
   - Agregar productos
   - Flete: Incluido
   - Guardar
   - Verificar: número = "COT-BQ-0001"

2. **Crear cotización en Medellín:**
   - Seleccionar tienda: Medellín
   - Agregar productos
   - Flete: Manual → $15,000
   - Guardar
   - Verificar: número = "COT-MED-0001"
   - Verificar: total incluye flete

3. **Crear otra en Barranquilla:**
   - Verificar: número = "COT-BQ-0002"

4. **Verificar Firestore:**
   - Contador Barranquilla: count = 2
   - Contador Medellín: count = 1

---

## 11. ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/utils/quoteNumbering.js` | CREAR | Función getNextQuoteNumber |
| `src/componentes/cotizador/QuoteForm.jsx` | MODIFICAR | Agregar selector tienda y campo flete |
| Firestore contadores | AUTO | Se crean al generar primer número |

---

## 12. EJEMPLO DE DATOS COMPLETOS

```javascript
// Cotización completa con todos los campos
{
  id: "abc123",
  numero: "COT-BQ-0047",
  tienda: "Barranquilla",
  clienteId: "cliente_xyz",
  clienteNombre: "Juan Pérez",
  productos: [
    { sku: "123", nombre: "Producto A", cantidad: 2, precio: 50000 }
  ],
  subtotal: 100000,
  fleteType: "manual",
  fleteValue: 15000,
  total: 115000,
  estado: "Creada",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  userId: "user123"
}
```

---

¿Puedes implementar COMANDO 3 completo?

1. Crear `src/utils/quoteNumbering.js`
2. Modificar QuoteForm con selector de tienda
3. Agregar campo de flete (radio + input)
4. Integrar generación de número al guardar
5. Actualizar cálculo de totales
6. Testing completo
