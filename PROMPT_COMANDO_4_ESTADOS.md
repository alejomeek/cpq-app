# COMANDO 4: Estados Personalizados de Cotización

## OBJETIVO

Implementar sistema de estados para cotizaciones con 4 estados optimizados:
1. **Borrador** - Creada pero no enviada al cliente
2. **Enviada** - Enviada al cliente, esperando respuesta
3. **Ganada** - Cliente aceptó, se convirtió en venta
4. **Perdida** - Cliente rechazó o no respondió

---

## DECISIÓN DE DISEÑO

**Balance entre simplicidad y utilidad:**
- Solo 4 estados (vs 5 del sistema original)
- Flujo lineal simple
- Máximo 2 actualizaciones por cotización
- Métricas valiosas (tasa de conversión)

---

## 1. ESTADOS Y COLORES

### Definición de estados:

```javascript
export const QUOTE_STATES = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida'
};

export const QUOTE_STATE_COLORS = {
  'Borrador': {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    badge: 'secondary',
    icon: '📝'
  },
  'Enviada': {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    badge: 'default',
    icon: '📨'
  },
  'Ganada': {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'success',
    icon: '✅'
  },
  'Perdida': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'destructive',
    icon: '❌'
  }
};
```

---

## 2. UTILIDAD: Función helper

**Ubicación:** `src/utils/quoteStates.js` (NUEVO)

```javascript
/**
 * Obtiene las clases de estilo para un estado de cotización
 * @param {string} estado - Estado de la cotización
 * @returns {object} - Objeto con clases CSS y metadata
 */
export function getStatusStyle(estado) {
  const defaultStyle = {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    badge: 'secondary',
    icon: '📝'
  };
  
  const styles = {
    'Borrador': {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-200',
      border: 'border-gray-200 dark:border-gray-700',
      badge: 'secondary',
      icon: '📝',
      label: 'Borrador'
    },
    'Enviada': {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-200 dark:border-blue-700',
      badge: 'default',
      icon: '📨',
      label: 'Enviada'
    },
    'Ganada': {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-200 dark:border-green-700',
      badge: 'outline',
      icon: '✅',
      label: 'Ganada'
    },
    'Perdida': {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-200 dark:border-red-700',
      badge: 'destructive',
      icon: '❌',
      label: 'Perdida'
    }
  };
  
  return styles[estado] || defaultStyle;
}

/**
 * Lista de todos los estados disponibles
 */
export const AVAILABLE_STATES = [
  'Borrador',
  'Enviada',
  'Ganada',
  'Perdida'
];

/**
 * Estado por defecto al crear una cotización
 */
export const DEFAULT_STATE = 'Borrador';
```

---

## 3. MODIFICAR: QuoteForm.jsx

### A. Estado inicial

```javascript
const [formData, setFormData] = useState({
  // ... campos existentes ...
  estado: DEFAULT_STATE,  // 'Borrador' por defecto
});
```

### B. Agregar selector de estado

En el formulario, agregar sección:

```jsx
{/* Selector de Estado */}
<div className="space-y-2">
  <Label htmlFor="estado">Estado de la cotización</Label>
  <Select
    value={formData.estado}
    onValueChange={(value) => handleFieldChange('estado', value)}
  >
    <SelectTrigger id="estado">
      <SelectValue placeholder="Selecciona un estado" />
    </SelectTrigger>
    <SelectContent>
      {AVAILABLE_STATES.map(estado => {
        const style = getStatusStyle(estado);
        return (
          <SelectItem key={estado} value={estado}>
            <div className="flex items-center gap-2">
              <span>{style.icon}</span>
              <span>{estado}</span>
            </div>
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
  
  {/* Preview del estado seleccionado */}
  <div className="flex items-center gap-2 pt-2">
    <Badge variant={getStatusStyle(formData.estado).badge}>
      {getStatusStyle(formData.estado).icon} {formData.estado}
    </Badge>
  </div>
</div>
```

### C. Imports necesarios

```javascript
import { getStatusStyle, AVAILABLE_STATES, DEFAULT_STATE } from '@/utils/quoteStates';
import { Badge } from '@/ui/badge.jsx';
```

---

## 4. MODIFICAR: QuotesList y QuoteCard

### A. Mostrar estado en QuoteCard

```jsx
{/* Header con número y estado */}
<div className="flex items-center justify-between mb-2">
  <h3 className="font-semibold text-lg">{quote.numero}</h3>
  
  <Badge 
    variant={getStatusStyle(quote.estado).badge}
    className={`${getStatusStyle(quote.estado).bg} ${getStatusStyle(quote.estado).text}`}
  >
    {getStatusStyle(quote.estado).icon} {quote.estado}
  </Badge>
</div>
```

### B. Filtro por estado (opcional pero recomendado)

En QuotesList, agregar filtro:

```jsx
{/* Filtros */}
<div className="flex gap-2 flex-wrap">
  <Select value={filterEstado} onValueChange={setFilterEstado}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filtrar por estado" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos los estados</SelectItem>
      {AVAILABLE_STATES.map(estado => (
        <SelectItem key={estado} value={estado}>
          {getStatusStyle(estado).icon} {estado}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### C. Lógica de filtrado

```javascript
const [filterEstado, setFilterEstado] = useState('all');

const filteredQuotes = useMemo(() => {
  let filtered = quotes;
  
  if (filterEstado !== 'all') {
    filtered = filtered.filter(q => q.estado === filterEstado);
  }
  
  return filtered;
}, [quotes, filterEstado]);
```

---

## 5. QUICK ACTIONS: Botones de cambio rápido

En QuoteCard o QuoteDetails, agregar botones de acción rápida:

```jsx
{/* Actions rápidas según estado */}
<div className="flex gap-2 mt-4">
  {quote.estado === 'Borrador' && (
    <Button 
      size="sm" 
      onClick={() => handleQuickStatusChange(quote.id, 'Enviada')}
    >
      📨 Marcar como Enviada
    </Button>
  )}
  
  {quote.estado === 'Enviada' && (
    <>
      <Button 
        size="sm" 
        variant="default"
        onClick={() => handleQuickStatusChange(quote.id, 'Ganada')}
      >
        ✅ Marcar como Ganada
      </Button>
      <Button 
        size="sm" 
        variant="destructive"
        onClick={() => handleQuickStatusChange(quote.id, 'Perdida')}
      >
        ❌ Marcar como Perdida
      </Button>
    </>
  )}
</div>
```

Función handler:

```javascript
const handleQuickStatusChange = async (quoteId, newEstado) => {
  try {
    const quoteRef = doc(db, 'usuarios', user.uid, 'cotizaciones', quoteId);
    await updateDoc(quoteRef, {
      estado: newEstado,
      updatedAt: new Date()
    });
    
    // Feedback
    toast.success(`Estado actualizado a: ${newEstado}`);
  } catch (error) {
    console.error('Error actualizando estado:', error);
    toast.error('Error al actualizar el estado');
  }
};
```

---

## 6. MÉTRICAS: Dashboard (Bonus)

Si existe un Dashboard, agregar métricas:

```jsx
{/* KPIs de cotizaciones */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>📝 Borradores</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {quotes.filter(q => q.estado === 'Borrador').length}
      </p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>📨 Enviadas</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {quotes.filter(q => q.estado === 'Enviada').length}
      </p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>✅ Ganadas</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold text-green-600">
        {quotes.filter(q => q.estado === 'Ganada').length}
      </p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>📊 Tasa Conversión</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {calculateConversionRate()}%
      </p>
    </CardContent>
  </Card>
</div>
```

Función de tasa de conversión:

```javascript
const calculateConversionRate = () => {
  const enviadas = quotes.filter(q => q.estado === 'Enviada').length;
  const ganadas = quotes.filter(q => q.estado === 'Ganada').length;
  
  if (enviadas === 0 && ganadas === 0) return 0;
  
  const total = enviadas + ganadas;
  return ((ganadas / total) * 100).toFixed(1);
};
```

---

## 7. ESTRUCTURA DE DATOS

### Firestore: `usuarios/{userId}/cotizaciones/{quoteId}`

```javascript
{
  numero: "COT-BQ-0001",
  tienda: "Barranquilla",
  estado: "Enviada",        // NUEVO campo
  clienteId: "...",
  productos: [...],
  subtotal: 100000,
  total: 115000,
  createdAt: Timestamp,
  updatedAt: Timestamp      // Se actualiza al cambiar estado
}
```

---

## 8. VALIDACIONES

- Estado es **obligatorio** (default: 'Borrador')
- Solo permitir transiciones válidas:
  - Borrador → Enviada
  - Enviada → Ganada/Perdida
  - (Opcionalmente permitir volver atrás)

```javascript
const validateStateTransition = (currentState, newState) => {
  const validTransitions = {
    'Borrador': ['Enviada'],
    'Enviada': ['Ganada', 'Perdida', 'Borrador'],  // Permitir volver
    'Ganada': [],  // Estado final
    'Perdida': []  // Estado final
  };
  
  return validTransitions[currentState]?.includes(newState);
};
```

---

## 9. TESTING

1. **Crear cotización nueva:**
   - Verificar estado default: "Borrador"
   - Badge debe ser gris con 📝

2. **Cambiar a "Enviada":**
   - Selector → "Enviada"
   - Badge debe ser azul con 📨
   - Guardar y verificar en Firestore

3. **Quick actions:**
   - Desde "Enviada" → Botones de Ganada/Perdida
   - Click en "Ganada"
   - Badge debe ser verde con ✅

4. **Filtros:**
   - Crear 2 borradores, 2 enviadas, 1 ganada
   - Filtrar por "Enviada" → solo ver 2
   - Filtrar por "Ganada" → solo ver 1

5. **Métricas:**
   - Dashboard debe mostrar conteos correctos
   - Tasa de conversión debe calcularse bien

---

## 10. ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/utils/quoteStates.js` | CREAR | Funciones helper de estados |
| `src/componentes/cotizador/QuoteForm.jsx` | MODIFICAR | Agregar selector de estado |
| `src/componentes/cotizador/QuotesPage.jsx` | MODIFICAR | Agregar filtro por estado |
| `src/componentes/cotizador/QuoteCard.jsx` | MODIFICAR | Mostrar badge de estado |
| `src/ui/dashboard.jsx` | MODIFICAR (opcional) | Agregar métricas de estados |

---

## 11. UI/UX IMPROVEMENTS

### Loading states:
```jsx
{isUpdatingStatus && (
  <div className="inline-flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    Actualizando estado...
  </div>
)}
```

### Toast notifications:
```javascript
import { toast } from 'sonner';  // o tu sistema de toasts

toast.success('✅ Cotización marcada como Ganada');
toast.error('❌ Error al actualizar estado');
```

---

¿Puedes implementar COMANDO 4 completo?

1. Crear `src/utils/quoteStates.js`
2. Modificar QuoteForm con selector de estado
3. Agregar badges en QuotesList/QuoteCard
4. Implementar filtro por estado
5. Agregar quick actions (opcional pero recomendado)
6. Testing completo
