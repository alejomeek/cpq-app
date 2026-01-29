import React from 'react';

// Iconos
const ArrowLeft = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const Plus = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const CatalogoList = ({ products, loading, navigate, onAddProduct, onEditProduct }) => {
    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 text-sm text-indigo-400 hover:underline mb-2">
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Panel
                    </button>
                    <h1 className="text-3xl font-bold">Catálogo de Productos</h1>
                </div>
                <button onClick={onAddProduct} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Crear Producto
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500 text-center">Cargando productos...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.length === 0 ? (
                        <p className="text-gray-400 col-span-full text-center">No hay productos. ¡Añade uno para empezar!</p>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{product.nombre || 'Nombre no disponible'}</h2>
                                    <p className="mt-2 text-gray-400 min-h-[40px]">{product.descripcion || 'Sin descripción.'}</p>
                                </div>
                                <div className="mt-4 flex justify-between items-end">
                                    <span className="text-sm font-medium text-gray-500">SKU: {product.sku || 'N/A'}</span>
                                    <button onClick={() => onEditProduct(product)} className="text-xs text-indigo-400 hover:underline">Editar</button>
                                    <p className="text-2xl font-bold text-indigo-400">${((product.precio_iva_incluido || product.precioBase) || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </main>
    );
};

export default CatalogoList;

