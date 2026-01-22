import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/useAuth';
import { getFunctions } from 'firebase/functions';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from './QuotePDF.jsx';
import ProductoForm from '../catalogo/ProductoForm.jsx';
import { obtenerSiguienteNumeroCotizacion } from '../../utils/firestoreUtils.js';
import { getNextQuoteNumber } from '../../utils/quoteNumbering.js';
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

// --- Sub-componente: ProductCatalogModal (sin cambios) ---
const ProductCatalogModal = ({ products, onAddToCart, onClose, initialCart }) => {
  const [cart, setCart] = useState(initialCart);
  const handleQuantityChange = (productId, quantity) => {
    const newQuantity = Math.max(0, quantity);
    const newCart = { ...cart };
    if (newQuantity === 0) delete newCart[productId];
    else newCart[productId] = newQuantity;
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
        <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 pr-4">
          {products.map(product => (
            <div key={product.id} className="bg-muted p-4 rounded-lg flex flex-col justify-between shadow-lg text-muted-foreground">
              <div className="flex-grow">
                <h3 className="font-bold text-foreground">{product.nombre}</h3>
                <p className="text-sm mt-1">SKU: {product.sku || 'N/A'}</p>
                <p className="text-xl font-semibold text-primary mt-2">${(product.precioBase || 0).toFixed(0)}</p>
              </div>
              <div className="mt-4">
                {cart[product.id] > 0 ? (
                  <div className="flex items-center justify-between">
                    <Button variant="secondary" size="icon" onClick={() => handleQuantityChange(product.id, (cart[product.id] || 0) - 1)} className="w-10 h-10 rounded-md font-bold text-lg">-</Button>
                    <span className="font-bold text-lg text-foreground">{cart[product.id]}</span>
                    <Button size="icon" onClick={() => handleQuantityChange(product.id, (cart[product.id] || 0) + 1)} className="w-10 h-10 rounded-md font-bold text-lg">+</Button>
                  </div>
                ) : (<Button onClick={() => handleQuantityChange(product.id, 1)} className="w-full flex items-center justify-center gap-2"> <ShoppingCart className="w-5 h-5" /> Añadir </Button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t"><Button onClick={() => onAddToCart(cart)} className="w-full"> Volver a la cotización </Button></div>
      </div>
    </div>
  );
};

// --- Sub-componente: InlineProductSearch (sin cambios) ---
const InlineProductSearch = ({ products, onProductSelect, onCancel, onCreateNew, index }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const searchRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onCancel(index);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef, onCancel, index]);

  useEffect(() => {
    if (results.length > 0 || (query.length > 0 && results.length === 0)) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [results.length, query, updatePosition]);

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery.length > 0) {
      setResults(products.filter(p => p.nombre.toLowerCase().includes(newQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(newQuery.toLowerCase()))));
    }
    else { setResults([]); }
  };

  const selectProduct = (product) => { onProductSelect(index, product); };

  return (
    <div ref={searchRef}>
      <Input ref={inputRef} type="text" value={query} onChange={handleQueryChange} placeholder="Buscar producto..." autoFocus />
      {(results.length > 0 || query.length > 0) && (
        <div className="fixed z-20 bg-popover border rounded-lg max-h-60 overflow-y-auto shadow-lg text-popover-foreground" style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px` }}>
          {results.map(product => (
            <div key={product.id} onClick={() => selectProduct(product)} className="p-3 cursor-pointer hover:bg-accent border-b">
              <p className="font-semibold">{product.nombre}</p>
              <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
            </div>
          ))}
          <div onClick={() => onCreateNew(query)} className="p-3 cursor-pointer text-primary hover:bg-accent">
            <p className="font-semibold">+ Crear "{query}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-componente: DownloadPDFButton ---
const DownloadPDFButton = ({ quoteId, loading, clients, quote, subtotal, tax, total, quoteStyleName, products }) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const styleToUse = quoteStyleName || 'Bubble';

  if (!quoteId || loading) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    console.log(`[DownloadPDFButton] Using PDF Style: ${styleToUse}`);
    try {
      const currentClient = clients.find(c => c.id === quote.clienteId);
      if (!currentClient) throw new Error("Client data not found");

      // NUEVO: Cargar logo de empresa desde Firestore
      let companyLogoUrl = null;
      try {
        const { getFirestore, doc: firestoreDoc, getDoc } = await import('firebase/firestore');
        const db = getFirestore();
        const companySettingsRef = firestoreDoc(db, 'usuarios', user.uid, 'settings', 'company');
        const companySettingsSnap = await getDoc(companySettingsRef);

        console.log('[PDF] Company settings exists:', companySettingsSnap.exists());

        if (companySettingsSnap.exists()) {
          const data = companySettingsSnap.data();
          companyLogoUrl = data?.logo_url || null;
          console.log('[PDF] Company logo URL:', companyLogoUrl);
        } else {
          console.warn('[PDF] No company settings found');
        }
      } catch (logoError) {
        console.error('[PDF] Error loading company logo:', logoError);
        // Continuar sin logo si hay error
      }

      const doc = <QuotePDF
        quote={{
          ...quote,
          subtotal,
          impuestos: tax,
          total,
          companyLogoUrl  // ← NUEVO: Pasar logo al PDF
        }}
        client={currentClient}
        products={products}
        styleName={styleToUse}
      />;
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quote.numero || 'cotizacion'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
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
  });
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [errorNotification, setErrorNotification] = useState(null);
  const [canSave, setCanSave] = useState(true);
  const [globalConfig, setGlobalConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // NUEVO: Estados para envío de email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // NUEVO: Hook de envío de email
  const functions = getFunctions();
  const { sendQuoteEmail, sending: sendingEmail } = useSendQuoteEmail(functions);

  // --- Funciones de Carga ---
  const fetchProducts = useCallback(async () => {
    // ¡CAMBIO! Ruta anidada con user.uid
    if (!user || !user.uid) return;
    const productsSnap = await getDocs(collection(db, "usuarios", user.uid, "productos"));
    setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, [db, user]);

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
        const paymentTermsQuery = query(
          collection(db, "usuarios", user.uid, "condicionesPago"),
          where("activo", "==", true)
        );

        const [clientsSnap, termsSnap, configSnap] = await Promise.all([
          getDocs(collection(db, "usuarios", user.uid, "clientes")),
          getDocs(paymentTermsQuery),
          getDoc(configRef)
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
        setLoadingConfig(false);

        await fetchProducts();

        if (quoteId) {
          // ¡CAMBIO! Ruta anidada con user.uid
          const quoteRef = doc(db, "usuarios", user.uid, "cotizaciones", quoteId);
          const quoteSnap = await getDoc(quoteRef);
          if (quoteSnap.exists()) {
            const data = quoteSnap.data();
            setQuote({
              ...data,
              vencimiento: data.vencimiento ? data.vencimiento.toDate() : null,
              lineas: data.lineas || [],
              tienda: data.tienda || 'Barranquilla',        // Default para cotizaciones antiguas
              fleteType: data.fleteType || 'incluido',       // Default para cotizaciones antiguas
              fleteValue: data.fleteValue || 0               // Default para cotizaciones antiguas
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
  }, [db, quoteId, fetchProducts, user]);

  const handleOpenProductForm = (productData) => {
    setProductToEdit(productData);
    setIsProductFormOpen(true);
  };

  const handleCloseProductForm = (newProduct) => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
    if (newProduct) {
      fetchProducts();
    }
  };

  const handleInputChange = (e) => setQuote(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLineChange = (index, field, value) => {
    const newLines = [...quote.lineas];
    const numericValue = (field === 'quantity' || field === 'price') ? parseFloat(value) : value;
    newLines[index][field] = (field === 'quantity' || field === 'price') ? (isNaN(numericValue) ? '' : numericValue) : value;
    setQuote(prev => ({ ...prev, lineas: newLines }));
  };

  const handleInlineProductSelect = (index, product) => {
    const newLines = [...quote.lineas];
    newLines[index] = { productId: product.id, productName: product.nombre, quantity: 1, price: product.precioBase || 0 };
    setQuote(prev => ({ ...prev, lineas: newLines }));
  };

  const addEmptyLine = () => {
    if (!quote.lineas.some(line => line.productId === null)) {
      setQuote(prev => ({ ...prev, lineas: [...prev.lineas, { productId: null, productName: '', quantity: 1, price: 0 }] }));
    }
  };

  const cancelSearchLine = (index) => setQuote(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }));
  const removeLine = (index) => setQuote(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }));

  // NUEVO: Manejar cambio de tienda y generar número
  const handleTiendaChange = async (tienda) => {
    try {
      setQuote(prev => ({ ...prev, tienda, numero: 'Generando...' }));
      setCanSave(false);

      // Solo generar número si es una cotización nueva
      if (!quoteId) {
        const quoteNumber = await getNextQuoteNumber(db, user.uid, tienda);
        setQuote(prev => ({ ...prev, numero: quoteNumber }));
        setCanSave(true);
      } else {
        // Si está editando, mantener el número existente
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
      subtotal,
      impuestos: tax,
      total,
      lineas: quote.lineas.filter(line => line.productId).map(line => ({
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
        products: products,
        quoteStyleName: globalConfig?.quoteStyle || 'Bubble'
      });

      // Éxito - el dialog se cierra automáticamente
      // El estado ya se actualiza en Firestore por la Cloud Function
    } catch (error) {
      console.error('Error enviando email:', error);
      setErrorNotification({ message: error.message || 'Error al enviar email' });
    }
  };

  // --- Función de Cálculo (MODIFICADA para incluir flete e IVA selectivo) ---
  const calculateTotals = () => {
    const lineasValidas = Array.isArray(quote.lineas) ? quote.lineas : [];

    // Subtotal (sin cambios)
    const subtotal = lineasValidas.reduce((acc, line) =>
      acc + ((parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0)), 0
    );

    // IVA solo para productos NO exentos
    const tax = lineasValidas.reduce((acc, line) => {
      const product = products.find(p => p.id === line.productId);
      if (product?.exento_iva) return acc; // Sin IVA para productos exentos
      const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0);
      return acc + (lineTotal * 0.19);
    }, 0);

    const fleteValue = quote.fleteType === 'incluido' ? 0 : (parseFloat(quote.fleteValue) || 0);
    const total = subtotal + tax + fleteValue;

    return { subtotal, tax, fleteValue, total };
  };
  const { subtotal, tax, fleteValue, total } = calculateTotals();

  const handleAddToCart = (cart) => {
    const newLineas = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return { productId, productName: product?.nombre || '', quantity, price: product?.precioBase || 0 };
    });
    setQuote(prev => ({ ...prev, lineas: [...prev.lineas.filter(l => l.productId !== null), ...newLineas] }));
    setIsCatalogOpen(false);
  };

  if ((loading || loadingConfig) && (!quote.numero || quote.numero === 'ERROR')) return <p className="text-center text-muted-foreground">Cargando cotización...</p>;

  // --- RENDERIZADO (sin cambios) ---
  return (
    <div className="space-y-8">
      {errorNotification && <NotificationModal message={errorNotification.message} onClose={() => setErrorNotification(null)} />}
      {isCatalogOpen && <ProductCatalogModal products={products} onClose={() => setIsCatalogOpen(false)} onAddToCart={handleAddToCart} initialCart={quote.lineas.reduce((acc, line) => { if (line.productId) acc[line.productId] = line.quantity; return acc; }, {})} />}
      {isProductFormOpen && <ProductoForm db={db} product={productToEdit} onClose={handleCloseProductForm} />}

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
              products={products}
            />
            {/* NUEVO: Botón Enviar por Email */}
            {quoteId && (
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
                      <InlineProductSearch products={products} index={index} onProductSelect={handleInlineProductSelect} onCancel={cancelSearchLine} onCreateNew={handleOpenProductForm} />
                    ) : (line.productName)}
                  </td>
                  <td className="px-6 py-2"><Input type="number" value={line.quantity} onChange={e => handleLineChange(index, 'quantity', e.target.value)} className="text-center" /></td>
                  <td className="px-6 py-2"><Input type="number" value={line.price} onChange={e => handleLineChange(index, 'price', e.target.value)} className="text-right" /></td>

                  {/* IVA Unitario */}
                  <td className="px-6 py-2 text-right text-foreground">
                    {(() => {
                      const product = products.find(p => p.id === line.productId);
                      if (product?.exento_iva) return 'Exento';
                      const ivaUnit = (line.price || 0) * 0.19;
                      return `$${ivaUnit.toFixed(0)}`;
                    })()}
                  </td>

                  {/* Total Línea (con IVA) */}
                  <td className="px-6 py-2 text-right font-semibold text-foreground">
                    {(() => {
                      const product = products.find(p => p.id === line.productId);
                      const precioSinIva = line.price || 0;
                      const ivaUnit = product?.exento_iva ? 0 : (precioSinIva * 0.19);
                      const precioConIva = precioSinIva + ivaUnit;
                      const totalLinea = (line.quantity || 0) * precioConIva;
                      return `$${totalLinea.toFixed(0)}`;
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(index)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Button variant="link" className="p-0 h-auto" onClick={addEmptyLine}>+ Añadir un producto</Button>
          <Button variant="link" className="p-0 h-auto" onClick={() => setIsCatalogOpen(true)}>
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