import React, { useState } from 'react';
import ProductList from './ProductList.jsx';
import ProductTypeSelector from './ProductTypeSelector.jsx';
import SimpleProductForm from './SimpleProductForm.jsx';
import SupabaseCatalogBrowser from './SupabaseCatalogBrowser.jsx';
import { Button } from '@/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog.jsx';

/**
 * Shopify se consulta en Supabase; los productos manuales son privados y viven
 * en Firebase. Ninguna acción de esta página escribe en el catálogo Shopify.
 */
const CatalogoPage = ({ db }) => {
  const [view, setView] = useState('list');
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleAddNewProduct = () => {
    setSelectedProduct(null);
    setIsTypeSelectorOpen(true);
  };

  const handleTypeSelected = (type) => {
    setIsTypeSelectorOpen(false);
    if (type === 'simple') setView('simple-form');
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setView('simple-form');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedProduct(null);
  };

  if (view === 'simple-form') {
    return (
      <SimpleProductForm
        db={db}
        product={selectedProduct}
        onBack={handleBackToList}
        onSave={handleBackToList}
      />
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="shopify" className="w-full">
        <TabsList>
          <TabsTrigger value="shopify">Shopify sincronizado</TabsTrigger>
          <TabsTrigger value="manual">Productos manuales</TabsTrigger>
        </TabsList>

        <TabsContent value="shopify" className="mt-6">
          <SupabaseCatalogBrowser />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Estos productos son manuales y privados para tu cuenta. No se sincronizan ni migran a Shopify o Supabase.
          </div>
          <ProductList
            db={db}
            onEditProduct={handleEditProduct}
            onAddNewProduct={handleAddNewProduct}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isTypeSelectorOpen} onOpenChange={setIsTypeSelectorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Crear producto manual</DialogTitle></DialogHeader>
          <ProductTypeSelector onSelectType={handleTypeSelected} />
          <Button variant="ghost" onClick={() => setIsTypeSelectorOpen(false)}>Cancelar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogoPage;
