import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/useAuth';
import { getFunctions } from 'firebase/functions';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from './QuotePDF.jsx';
import ProductoForm from '../catalogo/ProductoForm.jsx';
import { getNextQuoteNumber } from '../../utils/quoteNumbering.js';
import {
  createQuoteLineFromCatalogProduct,
  createQuoteLineFromManualProduct,
  fetchCatalogProducts,
  normalizeManualProduct,
} from '@/lib/catalogApi';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Separator } from '@/ui/separator.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select.jsx";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group.jsx";
import { Label } from "@/ui/label.jsx";
import { Trash2, AlertCircle, X, ShoppingCart, ArrowLeft, Mail } from 'lucide-react';
import { DatePicker } from '@/ui/DatePicker.jsx';
import { SendEmailDialog } from './SendEmailDialog.jsx';
import { useSendQuoteEmail } from '@/hooks/useSendQuoteEmail.jsx';
import { Badge } from '@/ui/badge.jsx';
import { getStatusStyle, AVAILABLE_STATES } from '@/utils/quoteStates.js';

// Una línea sin producto es sólo un borrador de la interfaz; nunca forma parte
// de una cotización guardada ni determina si la cotización es histórica.
const hasSelectedProduct = (line) => Boolean(line?.productId);
const isHistoricalQuote = (quoteId, lines) => Boolean(
  quoteId && (Array.isArray(lines) ? lines : []).some(
    (line) => hasSelectedProduct(line) && !line.productSnapshotAt
  )
);

// --- Sub-componente: NotificationModal (sin cambios) ---
const NotificationModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[70]">
    <div className="bg-card border rounded-2xl p-8 max-w-sm w-full text-center shadow-lg animate-fade-in-up text-card-foreground">
      <div className="text-destructive mb-4"><AlertCircle className="w-16 h-16 mx-auto" strokeWidth={1.5} /></div>
      <h2 className="text-2xl font-bold mb-4 text-foreground">{message}</h2>
      <Button variant="destructive" onClick={onClose} className="w-full">Aceptar</Button>
    </div>
  </div>
);

// --- Sub-componente: ProductCatalogModal ---
const ProductCatalogModal = ({ db, onAddToCart, onClose }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({});
  const [query, setQuery] = useState('');
  const [shopifyProducts, setShopifyProducts] = useState([]);
  const [manualProducts, setManualProducts] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loadingShopify, setLoadingShopify] = useState(true);
  const [loadingManual, setLoadingManual] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    getDocs(collection(db, 'usuarios', user.uid, 'productos'))
      .then((snapshot) => {
        if (active) setManualProducts(snapshot.docs.map((manual) => normalizeManualProduct({ id: manual.id, ...manual.data() })));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'No se pudieron cargar los productos manuales.');
      })
      .finally(() => {
        if (active) setLoadingManual(false);
      });

    return () => { active = false; };
  }, [db, user]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (!user) return;
      setLoadingShopify(true);
      setError(null);
      try {
        const result = await fetchCatalogProducts(user, { q: query, pageSize: 50, signal: controller.signal });
        setShopifyProducts(result.products.map((product) => ({ ...product, source: 'shopify' })));
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'No se pudo cargar el catálogo.');
      } finally {
        if (!controller.signal.aborted) setLoadingShopify(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, user]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredManualProducts = manualProducts.filter((product) => !normalizedQuery || [product.title, product.sku]
    .some((value) => value?.toLowerCase().includes(normalizedQuery)));
  const products = [
    ...(sourceFilter === 'manual' ? [] : shopifyProducts),
    ...(sourceFilter === 'shopify' ? [] : filteredManualProducts),
  ];
  const loading = (sourceFilter !== 'manual' && loadingShopify) || (sourceFilter !== 'shopify' && loadingManual);

  const handleQuantityChange = (product, quantity) => {
    const cartKey = `${product.source}:${product.id}`;
    const newQuantity = Math.max(0, quantity);
    const newCart = { ...cart };
    if (newQuantity === 0) delete newCart[cartKey];
    else newCart[cartKey] = { product, quantity: newQuantity };
    setCart(newCart);
  };
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] flex flex-col text-card-foreground">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Catálogo de Productos</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground -mr-4 -mt-4">
            <X className="w-6 h-6" /><span className="sr-only">Cerrar</span>
          </Button>
        </div>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, SKU o proveedor..." className="mb-4" autoFocus />
        <div className="mb-4 flex gap-2">
          <Button variant={sourceFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSourceFilter('all')}>Todos</Button>
          <Button variant={sourceFilter === 'shopify' ? 'default' : 'outline'} size="sm" onClick={() => setSourceFilter('shopify')}>Shopify</Button>
          <Button variant={sourceFilter === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setSourceFilter('manual')}>Manuales</Button>
        </div>
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 pr-4">
          {loading ? <p className="col-span-full py-12 text-center text-muted-foreground">Cargando productos...</p> : products.map(product => (
            <div key={`${product.source}:${product.id}`} className="bg-muted p-4 rounded-lg flex flex-col justify-between shadow-lg text-muted-foreground">
              <div className="flex-grow">
                <h3 className="font-bold text-foreground">{product.title}</h3>
                <p className="text-sm mt-1">SKU: {product.sku || 'N/A'}</p>
                <p className="text-xs font-medium mt-1">{product.source === 'manual' ? 'Producto manual' : 'Shopify sincronizado'}</p>
                <p className="text-xl font-semibold text-primary mt-2">${(product.price || 0).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{product.source === 'shopify' ? (product.taxable === false ? 'Precio Shopify · Exento' : 'Precio Shopify · IVA incluido') : 'Precio manual antes de IVA'}</p>
              </div>
              <div className="mt-4">
                {cart[`${product.source}:${product.id}`]?.quantity > 0 ? (
                  <div className="flex items-center justify-between">
                    <Button variant="secondary" size="icon" onClick={() => handleQuantityChange(product, (cart[`${product.source}:${product.id}`]?.quantity || 0) - 1)} className="w-10 h-10 rounded-md font-bold text-lg">-</Button>
                    <span className="font-bold text-lg text-foreground">{cart[`${product.source}:${product.id}`]?.quantity}</span>
                    <Button size="icon" onClick={() => handleQuantityChange(product, (cart[`${product.source}:${product.id}`]?.quantity || 0) + 1)} className="w-10 h-10 rounded-md font-bold text-lg">+</Button>
                  </div>
                ) : (<Button onClick={() => handleQuantityChange(product, 1)} className="w-full flex items-center justify-center gap-2"> <ShoppingCart className="w-5 h-5" /> Añadir </Button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t"><Button onClick={() => onAddToCart(Object.values(cart))} className="w-full"> Volver a la cotización </Button></div>
      </div>
    </div>
  );
};

// --- Sub-componente: InlineProductSearch ---
// Es el flujo rápido para una sola línea. A diferencia del buscador anterior,
// consulta Shopify y los manuales para que ambas fuentes estén disponibles.
const InlineProductSearch = ({ db, onProductSelect, onCancel, onCreateManual, index }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [shopifyProducts, setShopifyProducts] = useState([]);
  const [manualProducts, setManualProducts] = useState([]);
  const [loadingManual, setLoadingManual] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let active = true;

    getDocs(collection(db, 'usuarios', user.uid, 'productos'))
      .then((snapshot) => {
        if (active) setManualProducts(snapshot.docs.map((manual) => normalizeManualProduct({ id: manual.id, ...manual.data() })));
      })
      .catch(() => {
        if (active) setError('No se pudieron cargar los productos manuales.');
      })
      .finally(() => {
        if (active) setLoadingManual(false);
      });

    return () => { active = false; };
  }, [db, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInput = containerRef.current?.contains(event.target);
      const clickedResults = resultsRef.current?.contains(event.target);
      if (!clickedInput && !clickedResults) onCancel(index);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [index, onCancel]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setShopifyProducts([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setShopifyProducts([]);
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      setError(null);
      try {
        const result = await fetchCatalogProducts(user, { q: query, pageSize: 8, signal: controller.signal });
        setShopifyProducts(result.products.map((product) => ({ ...product, source: 'shopify' })));
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'No se pudo buscar Shopify.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, user]);

  useEffect(() => {
    if (!query.trim()) return undefined;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [query, updatePosition]);

  const normalizedQuery = query.trim().toLowerCase();
  const manualResults = manualProducts.filter((product) => (
    normalizedQuery && [product.title, product.sku]
      .some((value) => value?.toLowerCase().includes(normalizedQuery))
  )).slice(0, 8);
  const results = [...shopifyProducts, ...manualResults];

  const resultsMenu = query.trim() ? (
    <div
      ref={resultsRef}
      className="fixed z-[60] max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg text-popover-foreground"
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      {loading && <p className="p-3 text-sm text-muted-foreground">Buscando en Shopify...</p>}
      {error && <p className="p-3 text-sm text-destructive">{error}</p>}
      {results.map((product) => (
        <button key={`${product.source}:${product.id}`} type="button" onClick={() => onProductSelect(index, product)} className="w-full border-b p-3 text-left hover:bg-accent last:border-b-0">
          <p className="font-semibold">{product.title}</p>
          <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'} · {product.source === 'manual' ? 'Manual' : 'Shopify'}</p>
        </button>
      ))}
      {!loading && !loadingManual && !error && results.length === 0 && (
        <div className="p-3">
          <p className="mb-2 text-sm text-muted-foreground">No se encontraron productos.</p>
          <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => onCreateManual(query.trim(), index)}>
            + Añadir producto manualmente
          </Button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="min-w-64">
      <Input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o SKU..." autoFocus />
      {resultsMenu && createPortal(resultsMenu, document.body)}
    </div>
  );
};

// --- Sub-componente: DownloadPDFButton ---
const DownloadPDFButton = ({ quoteId, loading, clients, quote, subtotal, tax, total, quoteStyleName }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const styleToUse = quoteStyleName || 'Bubble';

  if (!quoteId || loading) return null;

  // Función para convertir imagen a base64 con manejo de CORS, timeout y límite de tamaño
  const imageUrlToBase64 = async (url, timeoutMs = 8000) => {
    try {
      // Si ya es base64, retornarla directamente
      if (url.startsWith('data:image')) {
        return url;
      }

      // Si es placeholder, retornar directamente
      if (url.includes('placehold.co')) {
        return url;
      }

      // Reducir tamaño de imágenes de Wix (optimización)
      let optimizedUrl = url;
      if (url.includes('wixstatic.com')) {
        // Reemplazar tamaños grandes por tamaños pequeños (máx 300x300 para PDF)
        optimizedUrl = url.replace(/\/fit\/w_\d+,h_\d+/, '/fit/w_300,h_300');
        console.log('🔧 Optimizing Wix image:', optimizedUrl);
      }

      // Fetch con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(optimizedUrl, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch image (${response.status}): ${optimizedUrl}`);
        return 'https://placehold.co/200x200/e5e7eb/6b7280?text=Sin+Imagen';
      }

      const blob = await response.blob();

      // Verificar tamaño del blob (máx 2MB)
      if (blob.size > 2 * 1024 * 1024) {
        console.warn(`Image too large (${(blob.size / 1024 / 1024).toFixed(2)}MB): ${optimizedUrl}`);
        return 'https://placehold.co/200x200/e5e7eb/6b7280?text=Imagen+muy+grande';
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Timeout fetching image: ${url}`);
      } else {
        console.warn(`Error converting image to base64: ${url}`, error);
      }
      return 'https://placehold.co/200x200/e5e7eb/6b7280?text=Sin+Imagen';
    }
  };

  // Función para procesar solo imágenes que necesitan conversión (solo Firebase Storage)
  const _convertOnlyFirebaseImages = async (allProducts, quoteLines, batchSize = 3) => {
    // 1. Obtener solo los productos que están en la cotización
    const productIdsInQuote = quoteLines.map(line => line.productId);
    const productsInQuote = allProducts.filter(p => productIdsInQuote.includes(p.id));

    console.log(`📦 Productos en cotización: ${productsInQuote.length} de ${allProducts.length} totales`);

    // 2. Identificar cuáles necesitan conversión (solo Firebase Storage)
    const productsNeedingConversion = productsInQuote.filter(p =>
      p.imagen_url && p.imagen_url.includes('firebasestorage.googleapis.com')
    );

    console.log(`🔧 Imágenes a convertir: ${productsNeedingConversion.length} (Firebase Storage)`);
    console.log(`✅ Imágenes sin cambios: ${productsInQuote.length - productsNeedingConversion.length} (Wix/otras)`);

    if (productsNeedingConversion.length === 0) {
      console.log('⚡ No hay imágenes de Firebase Storage, usando productos originales');
      return allProducts;
    }

    // 3. Convertir solo las necesarias en lotes
    const convertedProducts = [];
    for (let i = 0; i < productsNeedingConversion.length; i += batchSize) {
      const batch = productsNeedingConversion.slice(i, i + batchSize);
      console.log(`🖼️ Convirtiendo lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsNeedingConversion.length / batchSize)}`);

      const convertedBatch = await Promise.all(
        batch.map(async (product) => {
          const base64Image = await imageUrlToBase64(product.imagen_url);
          return { ...product, imagen_url: base64Image };
        })
      );

      convertedProducts.push(...convertedBatch);

      if (i + batchSize < productsNeedingConversion.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 4. Crear un mapa de productos convertidos
    const convertedMap = new Map(convertedProducts.map(p => [p.id, p]));

    // 5. Retornar array completo con solo los necesarios reemplazados
    return allProducts.map(p => convertedMap.get(p.id) || p);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    console.log(`[DownloadPDFButton] Using PDF Style: ${styleToUse}`);
    try {
      const currentClient = clients.find(c => c.id === quote.clienteId);
      if (!currentClient) throw new Error("Client data not found");

      // Cargar logo directamente desde Wix para mayor velocidad
      const logoUrl = "https://static.wixstatic.com/media/7909ff_fb58218a20af4d04b6b325b43056b7b2~mv2.png/v1/fill/w_287,h_61,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo_versi%C3%83%C2%B3n_final_JYE.png";
      const companyLogoBase64 = logoUrl;

      console.log('📄 Generando documento PDF...');
      const doc = <QuotePDF
        quote={{
          ...quote,
          subtotal,
          impuestos: tax,
          total,
          companyLogoUrl: companyLogoBase64  // Base64 en vez de URL
        }}
        client={currentClient}
        styleName={styleToUse}
      />;
      const blob = await pdf(doc).toBlob();

      console.log(`✅ PDF generado (${(blob.size / 1024).toFixed(2)} KB)`);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const clientSlug = (currentClient?.nombre || '')
        .trim()
        .replace(/[/\\:*?"<>|]/g, '')
        .slice(0, 40)
        .trim();
      link.download = `${quote.numero || 'cotizacion'}${clientSlug ? ` - ${clientSlug}` : ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Error al generar PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (<Button variant="outline" onClick={handleDownload} disabled={isGenerating}> {isGenerating ? 'Generando PDF...' : 'Descargar PDF'} </Button>);
};

// --- Componente Principal: QuoteForm ---
const QuoteForm = ({ db, quoteId, onBack }) => {
  const { user } = useAuth();

  // --- Estados ---
  const [quote, setQuote] = useState({
    numero: '',
    estado: 'Borrador',
    clienteId: '',
    vencimiento: null,
    condicionesPago: '',
    lineas: [],
    tienda: '',           // NUEVO: Multi-tienda
    fleteType: 'incluido', // NUEVO: Tipo de flete (incluido/manual)
    fleteValue: 0,        // NUEVO: Valor del flete
    discount: 0,          // NUEVO: Descuento en porcentaje (0-100)
  });
  const [clients, setClients] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [manualProductDraft, setManualProductDraft] = useState(null);
  const [activeLineIndex, setActiveLineIndex] = useState(null);
  const [errorNotification, setErrorNotification] = useState(null);
  const [canSave, setCanSave] = useState(true);
  const [globalConfig, setGlobalConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [emailFeatureEnabled, setEmailFeatureEnabled] = useState(true);

  // NUEVO: Estados para envío de email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // NUEVO: Hook de envío de email
  const functions = getFunctions();
  const { sendQuoteEmail, sending: sendingEmail } = useSendQuoteEmail(functions);

  useEffect(() => {
    async function loadInitialData() {
      // ¡NUEVO! Validar que el usuario esté autenticado
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadingConfig(true);
      setCanSave(true);
      setErrorNotification(null);
      try {
        // ¡CAMBIO! Rutas anidadas con user.uid
        const configRef = doc(db, 'usuarios', user.uid, 'configuracion', 'global');
        const featuresRef = doc(db, 'usuarios', user.uid, 'settings', 'features');
        const paymentTermsQuery = query(
          collection(db, "usuarios", user.uid, "condicionesPago"),
          where("activo", "==", true)
        );

        const [clientsSnap, termsSnap, configSnap, featuresSnap] = await Promise.all([
          getDocs(collection(db, "usuarios", user.uid, "clientes")),
          getDocs(paymentTermsQuery),
          getDoc(configRef),
          getDoc(featuresRef)
        ]);

        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setPaymentTerms(termsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (configSnap.exists()) {
          setGlobalConfig(configSnap.data());
          console.log("[QuoteForm] Global config loaded:", configSnap.data());
        } else {
          console.warn("[QuoteForm] Global config document not found.");
          setGlobalConfig({});
        }

        setEmailFeatureEnabled(featuresSnap.exists() ? (featuresSnap.data().emailEnabled ?? true) : true);
        setLoadingConfig(false);

        if (quoteId) {
          // ¡CAMBIO! Ruta anidada con user.uid
          const quoteRef = doc(db, "usuarios", user.uid, "cotizaciones", quoteId);
          const quoteSnap = await getDoc(quoteRef);
          if (quoteSnap.exists()) {
            const data = quoteSnap.data();
            // Recupera cotizaciones afectadas por una línea vacía guardada por
            // versiones anteriores. La línea inválida se quitará de Firestore
            // cuando el usuario guarde de nuevo la cotización.
            const savedLines = Array.isArray(data.lineas)
              ? data.lineas.filter(hasSelectedProduct)
              : [];
            setQuote({
              ...data,
              vencimiento: data.vencimiento ? data.vencimiento.toDate() : null,
              lineas: savedLines,
              tienda: data.tienda || 'Barranquilla',        // Default para cotizaciones antiguas
              fleteType: data.fleteType || 'incluido',       // Default para cotizaciones antiguas
              fleteValue: data.fleteValue || 0,              // Default para cotizaciones antiguas
              discount: data.discount || 0                   // Default para cotizaciones antiguas
            });
            setCanSave(true);
          } else {
            setErrorNotification({ message: "Cotización no encontrada." });
            setCanSave(false);
          }
        } else {
          // NUEVO: No generar número hasta que se seleccione tienda
          setQuote(prev => ({ ...prev, numero: 'Selecciona una tienda' }));
          setCanSave(false); // No permitir guardar hasta que se seleccione tienda
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setErrorNotification({ message: "Error al cargar datos. No se podrá guardar." });
        setCanSave(false);
        setLoadingConfig(false);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [db, quoteId, user]);

  const handleInputChange = (e) => setQuote(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLineChange = (index, field, value) => {
    const newLines = [...quote.lineas];
    const numericValue = (field === 'quantity' || field === 'price') ? parseFloat(value) : value;
    newLines[index][field] = (field === 'quantity' || field === 'price') ? (isNaN(numericValue) ? '' : numericValue) : value;
    setQuote(prev => ({ ...prev, lineas: newLines }));
  };

  const handleInlineProductSelect = (index, product) => {
    setQuote(prev => {
      const newLines = [...prev.lineas];
      newLines[index] = product.source === 'manual'
        ? createQuoteLineFromManualProduct(product)
        : createQuoteLineFromCatalogProduct(product);
      return { ...prev, lineas: newLines };
    });
  };

  const handleCreateManualProduct = (name, index) => {
    setActiveLineIndex(index);
    setManualProductDraft({ nombre: name });
    setIsProductFormOpen(true);
  };

  const handleCloseManualProductForm = (newProduct) => {
    setIsProductFormOpen(false);
    setManualProductDraft(null);

    if (newProduct?.id && activeLineIndex !== null) {
      handleInlineProductSelect(activeLineIndex, { ...newProduct, source: 'manual' });
    }

    setActiveLineIndex(null);
  };

  const addEmptyLine = () => {
    if (!quote.lineas.some((line) => line.productId === null)) {
      setQuote(prev => ({
        ...prev,
        lineas: [...prev.lineas, { productId: null, productName: '', quantity: 1, price: 0 }],
      }));
    }
  };

  const cancelSearchLine = (index) => setQuote(prev => ({ ...prev, lineas: prev.lineas.filter((_, lineIndex) => lineIndex !== index) }));
  const removeLine = (index) => setQuote(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }));

  // NUEVO: Manejar cambio de tienda y generar número
  const handleTiendaChange = async (tienda) => {
    try {
      setCanSave(false);

      // Solo generar número si es una cotización nueva
      if (!quoteId) {
        // Primero mostrar "Generando..."
        setQuote(prev => ({ ...prev, tienda, numero: 'Generando...' }));

        // Luego generar el número
        const quoteNumber = await getNextQuoteNumber(db, user.uid, tienda);

        // Actualizar con el número generado
        setQuote(prev => ({ ...prev, numero: quoteNumber }));
        setCanSave(true);
      } else {
        // Si está editando, solo cambiar la tienda (mantener número existente)
        setQuote(prev => ({ ...prev, tienda }));
        setCanSave(true);
      }
    } catch (error) {
      console.error('Error generando número:', error);
      setErrorNotification({ message: 'Error al generar número de cotización' });
      setQuote(prev => ({ ...prev, numero: 'ERROR' }));
      setCanSave(false);
    }
  };

  // NUEVO: Manejar cambio de tipo de flete
  const handleFleteTypeChange = (type) => {
    setQuote(prev => ({
      ...prev,
      fleteType: type,
      fleteValue: type === 'incluido' ? 0 : prev.fleteValue
    }));
  };

  // --- Función de Guardado ---
  const handleSave = async () => {
    // ¡NUEVO! Validar que el usuario esté autenticado
    if (!user || !user.uid) {
      setErrorNotification({ message: "Error: Usuario no autenticado." });
      return;
    }

    if (!canSave || !quote.numero || quote.numero === 'ERROR' || !quote.clienteId || !quote.tienda) {
      let errorMsg = "No se puede guardar la cotización.";
      if (!quote.clienteId) errorMsg = "Selecciona un cliente.";
      else if (!quote.tienda) errorMsg = "Selecciona una tienda.";
      setErrorNotification({ message: errorMsg });
      return;
    }
    setLoading(true);
    setErrorNotification(null);
    const { subtotal, tax, fleteValue, total } = calculateTotals();
    const selectedClient = clients.find(c => c.id === quote.clienteId);
    const quoteData = {
      numero: quote.numero,
      estado: quote.estado,
      clienteId: quote.clienteId,
      clienteNombre: selectedClient?.nombre || 'N/A',
      condicionesPago: quote.condicionesPago,
      vencimiento: quote.vencimiento ? Timestamp.fromDate(quote.vencimiento) : null,
      tienda: quote.tienda,          // NUEVO
      fleteType: quote.fleteType,    // NUEVO
      fleteValue: fleteValue,        // NUEVO
      discount: parseFloat(quote.discount) || 0,  // NUEVO: Descuento en porcentaje
      subtotal,
      impuestos: tax,
      total,
      lineas: quote.lineas.filter(hasSelectedProduct).map(line => ({
        ...line,
        quantity: parseFloat(line.quantity || 0),
        price: parseFloat(line.price || 0)
      })),
      fechaActualizacion: serverTimestamp()
    };
    try {
      if (quoteId) {
        // ¡CAMBIO! Ruta anidada con user.uid
        const quoteRef = doc(db, "usuarios", user.uid, "cotizaciones", quoteId);
        await setDoc(quoteRef, quoteData, { merge: true });
      } else {
        // ¡CAMBIO! Ruta anidada con user.uid
        quoteData.fechaCreacion = serverTimestamp();
        await addDoc(collection(db, "usuarios", user.uid, "cotizaciones"), quoteData);
      }
      onBack(true);
    } catch (error) {
      console.error("Error al guardar la cotización: ", error);
      setErrorNotification({ message: "Error al guardar. Revisa la consola." });
      setLoading(false);
    }
  };

  // NUEVO: Función para enviar email
  const handleSendEmail = async (email) => {
    const client = clients.find(c => c.id === quote.clienteId);

    if (!client) {
      setErrorNotification({ message: 'Cliente no encontrado' });
      return;
    }

    if (!user || !user.email) {
      setErrorNotification({ message: 'Usuario no autenticado' });
      return;
    }

    try {
      await sendQuoteEmail({
        quoteId: quoteId,
        quote: {
          ...quote,
          total,
          subtotal,
          impuestos: tax
        },
        client: {
          ...client,
          email: email // Usar el email del dialog (puede ser editado)
        },
        quoteStyleName: globalConfig?.quoteStyle || 'Bubble'
      });

      // Éxito - el dialog se cierra automáticamente
      // El estado ya se actualiza en Firestore por la Cloud Function
    } catch (error) {
      console.error('Error enviando email:', error);
      setErrorNotification({ message: error.message || 'Error al enviar email' });
    }
  };

  // --- Función de Cálculo (MODIFICADA para incluir flete, IVA selectivo y descuento) ---
  const calculateTotals = () => {
    const lineasValidas = (Array.isArray(quote.lineas) ? quote.lineas : []).filter(hasSelectedProduct);
    const quoteIsHistorical = isHistoricalQuote(quoteId, lineasValidas);

    // Las cotizaciones previas al catálogo Supabase no contienen la regla de
    // impuesto por línea. Conservamos sus totales persistidos y no los
    // recalculamos con productos actuales, para no reescribir su historia.
    if (quoteIsHistorical) {
      return {
        subtotal: Number(quote.subtotal) || 0,
        tax: Number(quote.impuestos) || 0,
        fleteValue: Number(quote.fleteValue) || 0,
        discountAmount: 0,
        total: Number(quote.total) || 0,
      };
    }

    // Subtotal (sin cambios)
    const subtotal = lineasValidas.reduce((acc, line) =>
      acc + ((parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0)), 0
    );

    // Cada línea conserva la regla tributaria con la que se cotizó.
    const tax = lineasValidas.reduce((acc, line) => {
      const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0);
      const taxRate = Number.isFinite(Number(line.taxRate))
        ? Number(line.taxRate)
        : (line.taxable === false ? 0 : 0.19);
      return acc + (lineTotal * taxRate);
    }, 0);

    // Subtotal antes de descuento
    const subtotalBeforeDiscount = subtotal + tax;

    // Calcular descuento
    const discountPercentage = parseFloat(quote.discount) || 0;
    const discountAmount = subtotalBeforeDiscount * (discountPercentage / 100);

    // Nuevo subtotal después de descuento
    const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

    const fleteValue = quote.fleteType === 'incluido' ? 0 : (parseFloat(quote.fleteValue) || 0);
    const total = subtotalAfterDiscount + fleteValue;

    return { subtotal, tax, fleteValue, discountAmount, total };
  };
  const { subtotal, tax, fleteValue, discountAmount, total } = calculateTotals();
  const quoteIsHistorical = isHistoricalQuote(quoteId, quote.lineas);

  const handleAddToCart = (cartItems) => {
    const newLineas = cartItems.map(({ product, quantity }) => (
      product.source === 'manual'
        ? createQuoteLineFromManualProduct(product, quantity)
        : createQuoteLineFromCatalogProduct(product, quantity)
    ));
    setQuote(prev => ({ ...prev, lineas: [...prev.lineas.filter(hasSelectedProduct), ...newLineas] }));
    setIsCatalogOpen(false);
  };

  if ((loading || loadingConfig) && (!quote.numero || quote.numero === 'ERROR')) return <p className="text-center text-muted-foreground">Cargando cotización...</p>;

  // --- RENDERIZADO (sin cambios) ---
  return (
    <div className="space-y-8">
      {errorNotification && <NotificationModal message={errorNotification.message} onClose={() => setErrorNotification(null)} />}
      {isCatalogOpen && <ProductCatalogModal db={db} onClose={() => setIsCatalogOpen(false)} onAddToCart={handleAddToCart} />}
      {isProductFormOpen && <ProductoForm db={db} product={manualProductDraft} onClose={handleCloseManualProductForm} />}

      <div>
        <div className="flex justify-between items-center">
          <input type="text" name="numero" value={quote.numero} readOnly className={`text-4xl font-bold bg-transparent border-none focus:ring-0 p-0 h-auto ${quote.numero === 'ERROR' ? 'text-destructive' : 'text-foreground'}`} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onBack(false)} disabled={loading && canSave}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || (loading && canSave)}>
              {loading && canSave ? 'Guardando...' : (canSave ? 'Guardar Cotización' : 'Error al Cargar')}
            </Button>
            <DownloadPDFButton
              quoteId={quoteId}
              loading={loading || loadingConfig}
              clients={clients}
              quote={quote}
              subtotal={subtotal}
              tax={tax}
              total={total}
              quoteStyleName={globalConfig?.quoteStyle}
            />
            {/* Botón Enviar por Email */}
            {quoteId && emailFeatureEnabled && (
              <Button
                variant="default"
                onClick={() => setEmailDialogOpen(true)}
                disabled={!canSave || loading || loadingConfig || !quote.clienteId}
              >
                <Mail className="mr-2 h-4 w-4" />
                Enviar por Email
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Selector de Estado con badges visuales */}
      <Card className="bg-transparent border-none">
        <CardHeader className="p-0 mb-4">
          <CardTitle>Estado de la Cotización</CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-card rounded-lg border">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_STATES.map(estado => {
                const style = getStatusStyle(estado);
                const isSelected = quote.estado === estado;
                return (
                  <Button
                    key={estado}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuote(prev => ({ ...prev, estado }))}
                    className={isSelected ? '' : `${style.border} hover:${style.bg}`}
                  >
                    <span className="mr-2">{style.icon}</span>
                    {estado}
                  </Button>
                );
              })}
            </div>

            {/* Preview del estado seleccionado */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Estado actual:</span>
              <Badge
                variant={getStatusStyle(quote.estado).badge}
                className={`${getStatusStyle(quote.estado).bg} ${getStatusStyle(quote.estado).text}`}
              >
                {getStatusStyle(quote.estado).icon} {quote.estado}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-transparent border-none">
        <CardHeader className="p-0 mb-4"><CardTitle>Información Principal</CardTitle></CardHeader>
        <CardContent className="p-6 bg-card rounded-lg border">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Tienda <span className="text-destructive">*</span>
              </label>
              <Select
                value={quote.tienda}
                onValueChange={handleTiendaChange}
                disabled={!!quoteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una tienda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Barranquilla">🏪 Barranquilla</SelectItem>
                  <SelectItem value="Medellin">🏪 Medellín</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Cliente</label>
              <Select name="clienteId" value={quote.clienteId} onValueChange={(value) => handleInputChange({ target: { name: 'clienteId', value } })}>
                <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Vencimiento</label>
              <DatePicker date={quote.vencimiento} setDate={(date) => setQuote(prev => ({ ...prev, vencimiento: date }))} placeholder="dd/mm/aaaa" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Condiciones de pago</label>
              <Select name="condicionesPago" value={quote.condicionesPago} onValueChange={(value) => handleInputChange({ target: { name: 'condicionesPago', value } })}>
                <SelectTrigger><SelectValue placeholder="Selecciona una condición" /></SelectTrigger>
                <SelectContent>{paymentTerms.map(pt => <SelectItem key={pt.id} value={pt.nombre}>{pt.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold mb-4 text-foreground">Líneas de Cotización</h2>
        {quoteIsHistorical && (
          <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Esta cotización es histórica. Sus líneas y totales se conservan sin recalcularse con el catálogo actual.
          </p>
        )}
        <div className="overflow-x-auto bg-card rounded-lg border shadow">
          <table className="w-full text-sm text-left text-foreground">
            <thead className="text-xs uppercase bg-muted text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3 w-24">Cant.</th>
                <th className="px-6 py-3 w-32">Precio Unit.</th>
                <th className="px-6 py-3 w-32">IVA Unit.</th>
                <th className="px-6 py-3 w-32 text-right">Total Línea</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quote.lineas.map((line, index) => (
                <tr key={index} className="border-b">
                  <td className="px-6 py-2">
                    {line.productId === null ? (
                      quoteIsHistorical
                        ? <p className="text-muted-foreground">Producto sin seleccionar</p>
                        : <InlineProductSearch db={db} index={index} onProductSelect={handleInlineProductSelect} onCancel={cancelSearchLine} onCreateManual={handleCreateManualProduct} />
                    ) : (
                      <div>
                        <p>{line.productName}</p>
                        {line.source && <p className="text-xs text-muted-foreground">{line.source === 'manual' ? 'Producto manual' : 'Shopify sincronizado'}{line.sku ? ` · ${line.sku}` : ''}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-2"><Input type="number" value={line.quantity} onChange={e => handleLineChange(index, 'quantity', e.target.value)} className="text-center" disabled={quoteIsHistorical} /></td>
                  <td className="px-6 py-2"><Input type="number" value={line.price} onChange={e => handleLineChange(index, 'price', e.target.value)} className="text-right" disabled={quoteIsHistorical} /></td>

                  {/* IVA Unitario */}
                  <td className="px-6 py-2 text-right text-foreground">
                    {(() => {
                      const taxRate = Number.isFinite(Number(line.taxRate)) ? Number(line.taxRate) : (line.taxable === false ? 0 : 0.19);
                      if (taxRate === 0) return 'Exento';
                      const ivaUnit = (line.price || 0) * taxRate;
                      return `$${ivaUnit.toFixed(0)}`;
                    })()}
                  </td>

                  {/* Total Línea (con IVA) */}
                  <td className="px-6 py-2 text-right font-semibold text-foreground">
                    {(() => {
                      const precioSinIva = line.price || 0;
                      const taxRate = Number.isFinite(Number(line.taxRate)) ? Number(line.taxRate) : (line.taxable === false ? 0 : 0.19);
                      const ivaUnit = precioSinIva * taxRate;
                      const precioConIva = precioSinIva + ivaUnit;
                      const totalLinea = (line.quantity || 0) * precioConIva;
                      return `$${totalLinea.toFixed(0)}`;
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={quoteIsHistorical} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Button variant="link" className="p-0 h-auto" onClick={addEmptyLine} disabled={quoteIsHistorical}>+ Añadir un producto</Button>
          <Button variant="link" className="p-0 h-auto" onClick={() => setIsCatalogOpen(true)} disabled={quoteIsHistorical}>
            Abrir Catálogo
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Card className="w-full max-w-sm bg-transparent border-none">
          <CardContent className="p-6 bg-card rounded-lg border space-y-4 text-card-foreground">
            {/* Precio sin IVA */}
            <div className="flex justify-between">
              <span>Precio sin IVA:</span>
              <span>${subtotal.toFixed(0)}</span>
            </div>

            {/* IVA 19% */}
            <div className="flex justify-between">
              <span>IVA 19%:</span>
              <span>${tax.toFixed(0)}</span>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between font-semibold">
              <span>Subtotal:</span>
              <span>${(subtotal + tax).toFixed(0)}</span>
            </div>

            <Separator />

            {/* Campo de Descuento */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Descuento (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={quote.discount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  const clampedValue = Math.max(0, Math.min(100, value));
                  setQuote(prev => ({ ...prev, discount: clampedValue }));
                }}
                placeholder="0"
                className="mt-1"
              />

              {quote.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Descuento ({quote.discount}%):</span>
                  <span className="text-destructive">- ${discountAmount.toFixed(0)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Campo de Flete */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Flete</Label>
              <RadioGroup
                value={quote.fleteType}
                onValueChange={handleFleteTypeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="incluido" id="flete-incluido" />
                  <Label htmlFor="flete-incluido" className="font-normal cursor-pointer">
                    Incluido en el precio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="flete-manual" />
                  <Label htmlFor="flete-manual" className="font-normal cursor-pointer">
                    Agregar valor de flete
                  </Label>
                </div>
              </RadioGroup>

              {quote.fleteType === 'manual' && (
                <div className="pl-6">
                  <Label htmlFor="fleteValue" className="text-sm">Valor del flete</Label>
                  <Input
                    id="fleteValue"
                    type="number"
                    min="0"
                    value={quote.fleteValue || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, fleteValue: parseFloat(e.target.value) || 0 }))}
                    placeholder="$ 0"
                    className="mt-1"
                  />
                </div>
              )}

              {quote.fleteType === 'manual' && quote.fleteValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Flete:</span>
                  <span>${fleteValue.toFixed(0)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between text-xl">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-primary">${total.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NUEVO: Dialog de Envío de Email */}
      {emailDialogOpen && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          client={clients.find(c => c.id === quote.clienteId)}
          quote={{
            ...quote,
            total,
            subtotal,
            impuestos: tax
          }}
          onSend={handleSendEmail}
          sending={sendingEmail}
        />
      )}
    </div>
  );
};

export default QuoteForm;
