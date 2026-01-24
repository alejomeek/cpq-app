import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/useAuth';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

const SimpleProductForm = ({ db, onBack, onSave }) => {
  const { user } = useAuth();

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const validateUniqueSKU = async (sku) => {
    if (!sku.trim()) return false;

    const productsRef = collection(db, 'usuarios', user.uid, 'productos');
    const q = query(productsRef, where('sku', '==', sku.trim()));
    const snapshot = await getDocs(q);

    return snapshot.empty; // true si no existe, false si ya existe
  };

  const handleSKUBlur = async () => {
    const sku = product.sku.trim();

    if (!sku) {
      setSkuError('');
      return;
    }

    const isUnique = await validateUniqueSKU(sku);
    if (!isUnique) {
      setSkuError('El SKU ya existe en otro producto');
    } else {
      setSkuError('');
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;

    const storage = getStorage();
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `productos/${user.uid}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.uid) {
      setError('Error: Usuario no autenticado.');
      return;
    }

    if (!product.nombre.trim()) {
      setError('El nombre del producto es requerido.');
      return;
    }

    if (!product.sku.trim()) {
      setError('El SKU es requerido.');
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

    if (skuError) {
      setError('Por favor corrige los errores antes de guardar.');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Crear Producto</h2>
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Volver a la lista
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Sección 1: Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="nombre" className="text-sm font-medium text-foreground">Nombre *</label>
              <Input id="nombre" name="nombre" value={product.nombre} onChange={handleChange} required disabled={isSaving} />
            </div>

            <div>
              <label htmlFor="descripcion" className="text-sm font-medium text-foreground">Descripción</label>
              <Textarea id="descripcion" name="descripcion" value={product.descripcion} onChange={handleChange} rows={6} disabled={isSaving} />
            </div>

            <div>
              <label htmlFor="sku" className="text-sm font-medium text-foreground">SKU *</label>
              <Input
                id="sku"
                name="sku"
                value={product.sku}
                onChange={handleChange}
                onBlur={handleSKUBlur}
                required
                disabled={isSaving}
              />
              {skuError && <p className="text-red-500 text-sm mt-1">{skuError}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Precio e IVA */}
        <Card>
          <CardHeader>
            <CardTitle>Precio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="precioBase" className="text-sm font-medium text-foreground">Precio con IVA *</label>
              <Input
                id="precioBase"
                name="precioBase"
                type="number"
                value={product.precioBase}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exento_iva"
                checked={product.exento_iva}
                onChange={(e) => setProduct(prev => ({ ...prev, exento_iva: e.target.checked }))}
                disabled={isSaving}
              />
              <label htmlFor="exento_iva" className="text-sm font-medium text-foreground">Exento de IVA</label>
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Imagen */}
        <Card>
          <CardHeader>
            <CardTitle>Imagen del Producto *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              required={!product.imagen_url}
              disabled={isSaving}
            />
            {imageFile && <p className="text-sm text-gray-600 mt-2">Archivo: {imageFile.name}</p>}
            {imageFile && (
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Vista previa"
                className="w-full h-auto object-cover rounded-md max-w-md"
              />
            )}
            {!imageFile && product.imagen_url && (
              <img
                src={product.imagen_url}
                alt="Vista previa"
                className="w-full h-auto object-cover rounded-md max-w-md"
              />
            )}
            {!imageFile && !product.imagen_url && (
              <img
                src="https://placehold.co/300x200/1e293b/94a3b8?text=Imagen"
                alt="Vista previa"
                className="w-full h-auto object-cover rounded-md max-w-md"
              />
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving || !!skuError}>
          {isSaving ? 'Guardando...' : 'Guardar Producto'}
        </Button>
      </form>
  );
};

export default SimpleProductForm;