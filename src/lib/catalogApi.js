const CATALOG_ENDPOINT = '/api/catalog-products';

export async function fetchCatalogProducts(user, { q = '', page = 1, pageSize = 30, signal } = {}) {
  if (!user) {
    throw new Error('Debes iniciar sesión para consultar el catálogo.');
  }

  const token = await user.getIdToken();
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (q.trim()) params.set('q', q.trim());

  const response = await fetch(`${CATALOG_ENDPOINT}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo cargar el catálogo.');
  }

  if (!Array.isArray(payload.products) || !payload.pagination) {
    throw new Error('El servidor devolvió una respuesta de catálogo inválida. Verifica que /api/catalog-products esté disponible.');
  }

  return payload;
}

/**
 * Convierte un producto vivo en una línea independiente de su catálogo.
 * Una vez guardada, la cotización sólo debe leer estos campos de la línea.
 */
export function createQuoteLineFromCatalogProduct(product, quantity = 1) {
  const taxable = product.taxable !== false;

  return {
    source: 'shopify',
    catalogProductId: product.id,
    manualProductId: null,
    // Se mantiene para compatibilidad con las cotizaciones y PDFs existentes.
    productId: product.id,
    sku: product.sku,
    productName: product.title,
    quantity: Number(quantity) || 1,
    price: Number(product.price) || 0,
    taxable,
    taxRate: taxable ? 0.19 : 0,
    imageUrl: product.imageUrl || null,
    productSnapshotAt: new Date().toISOString(),
  };
}

/**
 * Normaliza un documento Firebase del catálogo manual sin enviarlo a Supabase.
 */
export function normalizeManualProduct(product) {
  const taxable = product.taxable ?? !product.exento_iva;
  const taxRate = Number.isFinite(Number(product.taxRate))
    ? Number(product.taxRate)
    : (taxable ? 0.19 : 0);

  return {
    id: product.id,
    source: 'manual',
    sku: product.sku || '',
    title: product.nombre || product.title || 'Producto manual sin nombre',
    price: Number(product.unitPrice ?? product.precioBase ?? product.price) || 0,
    taxable,
    taxRate,
    imageUrl: product.imagen_url || product.imageUrl || null,
    imageAltText: product.nombre || product.title || null,
    vendor: null,
    inventoryTracked: false,
  };
}

export function createQuoteLineFromManualProduct(product, quantity = 1) {
  const normalized = normalizeManualProduct(product);

  return {
    source: 'manual',
    catalogProductId: null,
    manualProductId: normalized.id,
    productId: normalized.id,
    sku: normalized.sku,
    productName: normalized.title,
    quantity: Number(quantity) || 1,
    price: normalized.price,
    taxable: normalized.taxable,
    taxRate: normalized.taxRate,
    imageUrl: normalized.imageUrl,
    productSnapshotAt: new Date().toISOString(),
  };
}
