import React, { useState, useEffect } from 'react';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/useAuth';

const ProductoForm = ({ db, product, onClose }) => {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        nombre: '',
        precioBase: '', // Se usa para pedir el "Precio con IVA"
        sku: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const isEditMode = product && product.id;

    useEffect(() => {
        if (product) {
            setFormData({
                nombre: product.nombre || '',
                precioBase: product.precio_iva_incluido || product.precioBase || '',
                sku: product.sku || '',
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (file) => {
        if (!file) return null;
        const storage = getStorage();
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `productos/${user.uid}/${fileName}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user || !user.uid) {
            setError('Error: Usuario no autenticado.');
            return;
        }

        if (!formData.nombre.trim()) {
            setError('El nombre del producto es requerido.');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            let imagen_url = product?.imagen_url || '';
            if (imageFile) {
                imagen_url = await handleImageUpload(imageFile);
            }

            const precioConIva = parseFloat(formData.precioBase) || 0;
            const precioSinIva = precioConIva / 1.19;

            const dataToSave = {
                nombre: formData.nombre.trim(),
                sku: formData.sku.trim(),
                precioBase: precioSinIva, // El precio sin impuestos
                precio_iva_incluido: precioConIva, // El precio final con impuestos

                exento_iva: false,
                categoria: "physical",
                inventory: 0,
                imagen_url: imagen_url,
                fechaActualizacion: serverTimestamp(),
            };

            if (isEditMode) {
                await setDoc(
                    doc(db, "usuarios", user.uid, "productos", product.id),
                    dataToSave,
                    { merge: true }
                );
                onClose();
            } else {
                dataToSave.fechaCreacion = serverTimestamp();
                const newDocRef = await addDoc(
                    collection(db, "usuarios", user.uid, "productos"),
                    dataToSave
                );
                onClose({ id: newDocRef.id, ...dataToSave });
            }
        } catch (err) {
            console.error("Error al guardar producto:", err);
            setError('Error al guardar el producto.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    {isEditMode ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="nombre" className="block mb-1.5 text-sm font-semibold text-gray-700">
                            Nombre del Producto *
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                            required
                            disabled={isSaving}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="precioBase" className="block mb-1.5 text-sm font-semibold text-gray-700">
                                Precio con IVA *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    name="precioBase"
                                    value={formData.precioBase}
                                    onChange={handleChange}
                                    step="any"
                                    min="0"
                                    required
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="0"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="sku" className="block mb-1.5 text-sm font-semibold text-gray-700">
                                SKU
                            </label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                            Imagen del Producto
                        </label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-36 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all overflow-hidden relative group">
                                {imageFile || product?.imagen_url ? (
                                    <>
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : product?.imagen_url}
                                            alt="Vista previa"
                                            className="absolute inset-0 w-full h-full object-contain p-2"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            <span className="text-white text-sm font-medium">Cambiar imagen</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-10 h-10 mb-3 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                        <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-indigo-600">Haz clic para subir</span> o arrastra</p>
                                        <p className="text-xs text-gray-400">PNG, JPG o WEBP</p>
                                    </div>
                                )}
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setImageFile(e.target.files[0]);
                                        }
                                    }}
                                    disabled={isSaving}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            disabled={isSaving}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center min-w-[160px]"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Producto'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductoForm;