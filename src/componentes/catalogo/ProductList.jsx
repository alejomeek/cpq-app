import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/context/useAuth';
import ProductCard from './ProductCard.jsx';
import ProductDetails from './ProductDetails.jsx';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import AlertDialog from '../comunes/AlertDialog.jsx';
import {
  PlusIcon,
  Search,
  LayoutGrid,
  List,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select.jsx";
import { Badge } from '@/ui/badge.jsx';
import { DataTable } from '@/ui/DataTable.jsx';
import { createColumns } from './columns.jsx';

const ProductList = ({ db, onProductClick, onEditProduct, onAddNewProduct }) => {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' o 'list'

  // Nuevos estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // NUEVO: Estado para dialog de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState([]);

  // NUEVO: Estado para sheet de detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Cargar productos
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'usuarios', user.uid, 'productos'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error al obtener productos:", err);
        setError("Error al cargar los productos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach(product => {
      if (product.categorias && Array.isArray(product.categorias)) {
        product.categorias.forEach(cat => cats.add(cat));
      }
    });
    return Array.from(cats);
  }, [products]);

  // NUEVO: Función para eliminar productos seleccionados
  const handleDeleteSelected = (selectedRows) => {
    const productsToDelete = selectedRows.map(row => row.original);
    setProductsToDelete(productsToDelete);
    setDeleteDialogOpen(true);
  };

  // NUEVO: Abrir detalles del producto
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  // NUEVO: Editar producto
  const handleEditProductClick = (product) => {
    if (onEditProduct) {
      onEditProduct(product); // Llamar la función del padre
    }
  };

  // NUEVO: Duplicar producto
  const handleDuplicateProduct = async (product) => {
    if (!user?.uid) return;

    try {
      const { addDoc, collection } = await import('firebase/firestore');

      const duplicatedProduct = {
        ...product,
        nombre: `${product.nombre} (Copia)`,
        sku: product.sku ? `${product.sku}-COPY` : undefined,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
      };

      delete duplicatedProduct.id;

      await addDoc(collection(db, 'usuarios', user.uid, 'productos'), duplicatedProduct);

      console.log('Producto duplicado exitosamente');
    } catch (error) {
      console.error('Error al duplicar producto:', error);
    }
  };

  // NUEVO: Eliminar un solo producto
  const handleDeleteProduct = (product) => {
    setProductsToDelete([product]);
    setDeleteDialogOpen(true);
  };

  // NUEVO: Confirmar eliminación
  const confirmDeletion = async () => {
    if (!user?.uid) return;

    try {
      // Eliminar cada producto
      await Promise.all(
        productsToDelete.map(product =>
          deleteDoc(doc(db, 'usuarios', user.uid, 'productos', product.id))
        )
      );

      setDeleteDialogOpen(false);
      setProductsToDelete([]);

      console.log(`${productsToDelete.length} producto(s) eliminado(s) exitosamente`);
    } catch (error) {
      console.error('Error al eliminar productos:', error);
    }
  };

  // Definir columns DESPUÉS de todas las funciones
  const columns = useMemo(() =>
    createColumns(
      handleProductClick,
      handleEditProductClick,
      handleDuplicateProduct,
      handleDeleteProduct
    ),
    [onEditProduct]
  );

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.nombre?.toLowerCase().includes(query) ||
        product.descripcion?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)
      );
    }

    // Filtro por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(product => product.tipo === selectedType);
    }

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product =>
        product.categorias?.includes(selectedCategory)
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.nombre || '').localeCompare(b.nombre || '');
        case 'price-asc':
          return ((a.precio_iva_incluido || a.precioBase) || 0) - ((b.precio_iva_incluido || b.precioBase) || 0);
        case 'price-desc':
          return ((b.precio_iva_incluido || b.precioBase) || 0) - ((a.precio_iva_incluido || a.precioBase) || 0);
        case 'newest':
          return (b.fechaCreacion?.toMillis() || 0) - (a.fechaCreacion?.toMillis() || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, selectedType, selectedCategory, sortBy]);

  // Calcular totales de paginación
  const totalItems = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedCategory]);

  // Obtener productos de la página actual
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  // Funciones de navegación
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Estados de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de Productos</h1>
          <p className="text-muted-foreground mt-1">
            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} productos
            {totalItems !== products.length && ` (${products.length} total)`}
          </p>
        </div>
        <Button onClick={onAddNewProduct} size="lg">
          <PlusIcon className="mr-2 h-5 w-5" />
          Crear Producto
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col gap-4">
        {/* Búsqueda */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, descripción o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="composite">Compuesto</SelectItem>
              <SelectItem value="kit">Kit</SelectItem>
            </SelectContent>
          </Select>

          {categories.length > 0 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre (A-Z)</SelectItem>
              <SelectItem value="price-asc">Precio (Menor)</SelectItem>
              <SelectItem value="price-desc">Precio (Mayor)</SelectItem>
              <SelectItem value="newest">Más reciente</SelectItem>
            </SelectContent>
          </Select>

          {/* Selector de vista */}
          <div className="flex items-center border rounded-lg p-1 ml-auto">
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              className="px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros activos */}
      {(searchQuery || selectedType !== 'all' || selectedCategory !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {selectedType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {selectedType}
              <button
                onClick={() => setSelectedType('all')}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoría: {selectedCategory}
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedCategory('all');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Contenido */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery || selectedType !== 'all' || selectedCategory !== 'all'
              ? 'No se encontraron productos'
              : 'No hay productos'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || selectedType !== 'all' || selectedCategory !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : '¡Crea tu primer producto para empezar!'}
          </p>
          {(!searchQuery && selectedType === 'all' && selectedCategory === 'all') && (
            <Button onClick={onAddNewProduct}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Crear Primer Producto
            </Button>
          )}
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                  onEdit={handleEditProductClick}
                  onDuplicate={handleDuplicateProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={paginatedProducts}
              onDeleteSelectedItems={handleDeleteSelected}
            />
          )}

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 mt-6">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {/* Primera página */}
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(1)}
                        className="w-9"
                      >
                        1
                      </Button>
                      {currentPage > 4 && <span className="px-2">...</span>}
                    </>
                  )}

                  {/* Páginas cercanas */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const distance = Math.abs(page - currentPage);
                      return distance <= 2 || page === 1 || page === totalPages;
                    })
                    .filter((page, index, array) => {
                      if (page === 1 || page === totalPages) return false;
                      return true;
                    })
                    .map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-9"
                      >
                        {page}
                      </Button>
                    ))
                  }

                  {/* Última página */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className="w-9"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Ir a página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ir a:</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      goToPage(page);
                    }
                  }}
                  className="w-16 text-center"
                />
              </div>
            </div>
          )}
        </>
      )}


      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeletion}
        title="¿Estás completamente seguro?"
        description={`Esta acción no se puede deshacer. Se eliminarán permanentemente ${productsToDelete.length} producto(s).`}
      />

      {/* Sheet de detalles del producto */}
      <ProductDetails
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditProductClick}
        onDuplicate={handleDuplicateProduct}
        onDelete={handleDeleteProduct}
      />
    </div>
  );
};

export default ProductList;