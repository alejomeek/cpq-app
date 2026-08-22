import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, PackageSearch, Search } from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { fetchCatalogProducts } from '@/lib/catalogApi';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';

const PAGE_SIZE = 30;

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function SupabaseCatalogBrowser() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState({ products: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadCatalog = useCallback(async (signal) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCatalogProducts(user, { q: search, page, pageSize: PAGE_SIZE, signal });
      setCatalog(result);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message || 'No se pudo cargar el catálogo.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, search, user]);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal);
    return () => controller.abort();
  }, [loadCatalog]);

  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const pagination = catalog.pagination || { page, total: 0, totalPages: 0 };
  const firstItem = pagination.total ? ((page - 1) * PAGE_SIZE) + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, pagination.total || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de productos</h1>
          <p className="mt-1 text-muted-foreground">Catálogo sincronizado desde Shopify mediante Supabase. Disponible en modo consulta.</p>
        </div>
        <Badge variant="secondary">Solo lectura</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pl-10" placeholder="Buscar por título, SKU o proveedor…" />
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /><span>{error}</span></div>
          <Button variant="outline" onClick={() => loadCatalog()}>Reintentar</Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-muted-foreground">Cargando catálogo…</div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <PackageSearch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="font-semibold">No se encontraron productos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ajusta la búsqueda o verifica que el catálogo esté sincronizado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-lg border bg-card">
              <div className="aspect-[4/3] bg-muted">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAltText || product.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin imagen</div>}
              </div>
              <div className="space-y-2 p-4">
                <p className="line-clamp-2 font-semibold">{product.title}</p>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                {product.vendor && <p className="text-sm text-muted-foreground">{product.vendor}</p>}
                <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                <div className="flex flex-wrap gap-1">
                  {product.taxable === false && <Badge variant="outline">Exento</Badge>}
                  {product.inventoryTracked && <Badge variant="secondary">Inventario controlado</Badge>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {firstItem}–{lastItem} de {pagination.total} productos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagination.totalPages === 0 || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
