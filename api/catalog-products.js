import { createClient } from '@supabase/supabase-js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/* global process */

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

function getFirebaseAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: getRequiredEnv('FIREBASE_PROJECT_ID'),
        clientEmail: getRequiredEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: getRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  }

  return getAuth();
}

function getSupabaseClient() {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getPageNumber(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getPageSize(value) {
  const pageSize = Number.parseInt(value, 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function normalizeSearchTerm(value) {
  if (typeof value !== 'string') return '';

  // `.or()` usa sintaxis PostgREST. Estos caracteres pueden cambiar el filtro
  // en vez de ser parte de una búsqueda de texto, así que se descartan.
  return value
    .trim()
    .replace(/[%,_(),.]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

function toCatalogProduct(product) {
  const images = Array.isArray(product.product_images) ? product.product_images : [];
  const primaryImage = [...images].sort((a, b) => a.position - b.position)[0] || null;

  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    descriptionHtml: product.description_html,
    vendor: product.vendor,
    productType: product.product_type,
    tags: product.tags || [],
    price: product.price,
    compareAtPrice: product.compare_at_price,
    taxable: product.taxable,
    inventoryQuantity: product.inventory_quantity,
    inventoryTracked: product.inventory_tracked,
    inventoryPolicy: product.inventory_policy,
    imageUrl: primaryImage?.url || null,
    imageAltText: primaryImage?.alt_text || null,
  };
}

/**
 * Catálogo CPQ de sólo lectura.
 *
 * El navegador se autentica con Firebase. El endpoint valida ese ID token y
 * usa una credencial Supabase exclusivamente del servidor para consultar la
 * réplica Shopify. No se expone ninguna operación de escritura.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    await getFirebaseAuth().verifyIdToken(token);

    const page = getPageNumber(req.query.page);
    const pageSize = getPageSize(req.query.pageSize);
    const search = normalizeSearchTerm(req.query.q);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = getSupabaseClient()
      .from('catalog_products')
      .select(
        `
          id,
          sku,
          title,
          description_html,
          vendor,
          product_type,
          tags,
          price,
          compare_at_price,
          taxable,
          inventory_quantity,
          inventory_tracked,
          inventory_policy,
          product_images (url, alt_text, position)
        `,
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('title', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,sku.ilike.%${search}%,vendor.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Supabase catalog query failed:', error);
      return res.status(502).json({ error: 'No se pudo consultar el catálogo' });
    }

    return res.status(200).json({
      products: (data || []).map(toCatalogProduct),
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Catalog API failed:', error);

    if (error?.code === 'auth/argument-error' || error?.code === 'auth/id-token-expired' || error?.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'No autorizado' });
    }

    return res.status(500).json({ error: 'Error de configuración del catálogo' });
  }
}
