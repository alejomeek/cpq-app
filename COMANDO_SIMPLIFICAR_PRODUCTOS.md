# Comando: Simplificar Formulario de Productos Manuales

**Objetivo:** Estandarizar productos manuales para que sean idénticos a los sincronizados de Wix.

**Fecha:** 23/01/2026

---

## 📋 Requisitos

### Campos del Formulario:
1. **Nombre** (obligatorio)
2. **Descripción** (opcional, textarea)
3. **SKU** (obligatorio, único - validar contra TODOS los productos)
4. **Precio con IVA** (obligatorio - el usuario ingresa el precio final)
5. **☑️ Exento de IVA** (checkbox)
6. **Imagen** (obligatorio - subir archivo a Firebase Storage)

### Campos Automáticos (no se muestran):
- `precio_iva_incluido` = `precioBase` (mismo valor)
- `inventory` = 0 (fijo)
- `categoria` = "physical" (fijo)
- `exento_iva` = valor del checkbox
- `imagen_url` = URL generada al subir archivo
- `fechaCreacion` = serverTimestamp()
- `fechaActualizacion` = serverTimestamp()
- NO incluir `lastSync` (para identificar como manual)

### Eliminados:
- ❌ Costo
- ❌ Ganancia
- ❌ Margen (%)
- ❌ Categorías (sistema custom)
- ❌ Atributos (sistema custom)
- ❌ Input de inventario

---

## 🎯 Comando 1: Validar SKU Único

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Agregar función para validar que el SKU no exista en ningún producto (manual o Wix).

**Lógica:**
```javascript
const validateUniqueSKU = async (sku) => {
  if (!sku.trim()) return false;
  
  const productsRef = collection(db, 'usuarios', user.uid, 'productos');
  const q = query(productsRef, where('sku', '==', sku.trim()));
  const snapshot = await getDocs(q);
  
  return snapshot.empty; // true si no existe, false si ya existe
};
```

**Validación:**
- Ejecutar al perder foco del campo SKU
- Mostrar error si ya existe: "El SKU ya existe en otro producto"
- No permitir guardar si el SKU está duplicado

---

## 🎯 Comando 2: Subir Imagen a Firebase Storage

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Agregar funcionalidad para subir imagen a Firebase Storage.

**Imports necesarios:**
```javascript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
```

**Lógica:**
```javascript
const handleImageUpload = async (file) => {
  if (!file) return null;
  
  const storage = getStorage();
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `productos/${user.uid}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};
```

**UI:**
- Input tipo file: `<input type="file" accept="image/*" />`
- Mostrar nombre del archivo seleccionado
- Botón "Cambiar Imagen" si ya hay una seleccionada
- Validar que se haya seleccionado una imagen antes de guardar

---

## 🎯 Comando 3: Simplificar Formulario

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Eliminar campos innecesarios y reorganizar el formulario.

**Estructura del Estado:**
```javascript
const [product, setProduct] = useState({
  nombre: '',
  descripcion: '',
  sku: '',
  precioBase: 0,
  exento_iva: false,
  imagen_url: ''
});

const [imageFile, setImageFile] = useState(null);
const [skuError, setSkuError] = useState('');
```

**Eliminar:**
- ❌ Estado `profit`
- ❌ Estado `margin`
- ❌ Estado `allAttributes`
- ❌ Estado `allCategories`
- ❌ Estado `productAttributes`
- ❌ Estado `selectedCategories`
- ❌ Todos los useEffect relacionados con categorías/atributos
- ❌ Funciones de manejo de categorías/atributos
- ❌ Dialogs de ManageAttributes y ManageCategories

---

## 🎯 Comando 4: Actualizar UI del Formulario

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Rediseñar el formulario con los nuevos campos.

**Layout:**

```jsx
<form onSubmit={handleSubmit}>
  <h2>Crear Producto</h2>
  
  {/* Sección 1: Información Básica */}
  <Card>
    <CardHeader>
      <CardTitle>Información del Producto</CardTitle>
    </CardHeader>
    <CardContent>
      <div>
        <label>Nombre *</label>
        <Input name="nombre" value={product.nombre} onChange={handleChange} required />
      </div>
      
      <div>
        <label>Descripción</label>
        <Textarea name="descripcion" value={product.descripcion} onChange={handleChange} rows={6} />
      </div>
      
      <div>
        <label>SKU *</label>
        <Input 
          name="sku" 
          value={product.sku} 
          onChange={handleChange}
          onBlur={handleSKUBlur}
          required 
        />
        {skuError && <p className="text-red-500 text-sm">{skuError}</p>}
      </div>
    </CardContent>
  </Card>
  
  {/* Sección 2: Precio e IVA */}
  <Card>
    <CardHeader>
      <CardTitle>Precio</CardTitle>
    </CardHeader>
    <CardContent>
      <div>
        <label>Precio con IVA *</label>
        <Input 
          name="precioBase" 
          type="number" 
          value={product.precioBase} 
          onChange={handleChange} 
          required 
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="exento_iva"
          checked={product.exento_iva}
          onChange={(e) => setProduct(prev => ({ ...prev, exento_iva: e.target.checked }))}
        />
        <label htmlFor="exento_iva">Exento de IVA</label>
      </div>
    </CardContent>
  </Card>
  
  {/* Sección 3: Imagen */}
  <Card>
    <CardHeader>
      <CardTitle>Imagen del Producto *</CardTitle>
    </CardHeader>
    <CardContent>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files[0])}
        required={!product.imagen_url}
      />
      {imageFile && <p className="text-sm text-gray-600 mt-2">Archivo: {imageFile.name}</p>}
    </CardContent>
  </Card>
  
  <Button type="submit" disabled={isSaving || !!skuError}>
    {isSaving ? 'Guardando...' : 'Guardar Producto'}
  </Button>
</form>
```

---

## 🎯 Comando 5: Actualizar Lógica de Guardado

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Modificar `handleSubmit` para incluir los nuevos campos.

**Lógica:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!user || !user.uid) {
    setError('Error: Usuario no autenticado.');
    return;
  }

  if (!product.nombre.trim() || !product.sku.trim()) {
    setError('Nombre y SKU son requeridos.');
    return;
  }
  
  if (!imageFile && !product.imagen_url) {
    setError('Debes subir una imagen del producto.');
    return;
  }

  // Validar SKU único
  const isUnique = await validateUniqueSKU(product.sku);
  if (!isUnique) {
    setSkuError('El SKU ya existe en otro producto');
    return;
  }

  setIsSaving(true);
  setError(null);

  try {
    // Subir imagen si hay una nueva
    let imagen_url = product.imagen_url;
    if (imageFile) {
      imagen_url = await handleImageUpload(imageFile);
    }

    const productToSave = {
      nombre: product.nombre.trim(),
      descripcion: product.descripcion.trim(),
      sku: product.sku.trim(),
      precioBase: parseFloat(product.precioBase) || 0,
      precio_iva_incluido: parseFloat(product.precioBase) || 0,
      exento_iva: product.exento_iva,
      imagen_url: imagen_url,
      inventory: 0,
      categoria: 'physical',
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
      // NO incluir lastSync (para identificar como manual)
    };

    await addDoc(collection(db, "usuarios", user.uid, "productos"), productToSave);
    onSave();
  } catch (err) {
    console.error("Error al guardar el producto:", err);
    setError('Error al guardar el producto.');
    setIsSaving(false);
  }
};
```

---

## 🎯 Comando 6: Eliminar Imports Innecesarios

**Archivo:** `src/componentes/catalogo/SimpleProductForm.jsx`

**Acción:** Limpiar imports que ya no se usan.

**Eliminar:**
```javascript
import ManageAttributes from './ManageAttributes.jsx';
import ManageCategories from './ManageCategories.jsx';
import { X } from 'lucide-react';
```

**Agregar:**
```javascript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { query, where, getDocs } from 'firebase/firestore';
```

---

## ✅ Checklist de Verificación

Después de implementar todos los comandos, verificar:

- [ ] El formulario solo muestra: Nombre, Descripción, SKU, Precio, Exento IVA, Imagen
- [ ] La validación de SKU único funciona
- [ ] Se puede subir una imagen y se guarda en Firebase Storage
- [ ] El producto se guarda con todos los campos correctos
- [ ] No se incluye `lastSync` en productos manuales
- [ ] El campo `categoria` es "physical"
- [ ] El campo `inventory` es 0
- [ ] `precio_iva_incluido` = `precioBase`
- [ ] No hay errores en consola
- [ ] El formulario es responsive

---

## 🚀 Orden de Ejecución

1. Comando 1: Validar SKU Único
2. Comando 2: Subir Imagen a Firebase Storage
3. Comando 3: Simplificar Formulario (estado)
4. Comando 4: Actualizar UI del Formulario
5. Comando 5: Actualizar Lógica de Guardado
6. Comando 6: Eliminar Imports Innecesarios

---

## 📝 Notas

- Los productos manuales existentes con categorías/atributos serán eliminados manualmente
- El sistema de categorías y atributos custom se elimina por completo
- El IVA siempre es 19%
- El inventario no se gestiona (siempre 0)
