# PROYECTO: CePeQu - Sistema CPQ (Configure-Price-Quote)

**Versión:** 1.0.0
**Última actualización:** 2026-01-19

---

## 1. RESUMEN EJECUTIVO

CePeQu es una aplicación web moderna de Configure-Price-Quote (CPQ) diseñada para gestionar el ciclo completo de cotizaciones comerciales, desde la configuración de catálogos de productos hasta el envío automatizado de presupuestos por email con generación de insights mediante IA.

**Características principales:**
- Gestión completa de catálogo de productos
- CRM básico para gestión de clientes
- Sistema de cotizaciones con múltiples estados (Borrador → Enviada → En negociación → Aprobada/Rechazada)
- Generación de PDFs con múltiples estilos visuales
- Envío automatizado de cotizaciones por email
- Dashboard con métricas y analytics en tiempo real
- Panel de insights con IA (OpenAI GPT-4) para análisis de negocio
- Sistema multi-tenant (cada usuario tiene sus datos aislados)

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Stack Tecnológico

**Frontend:**
- **Framework:** React 19.1.1
- **Build Tool:** Vite 7.1.7
- **UI Library:** Radix UI + Tailwind CSS 3.4.18
- **Routing:** Sistema de estado interno (no usa React Router)
- **State Management:** React Context API (AuthContext)
- **PDF Generation:** @react-pdf/renderer 4.3.1
- **Charts:** Recharts 3.3.0
- **Drag & Drop:** @dnd-kit
- **Data Tables:** @tanstack/react-table 8.21.3

**Backend:**
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Authentication
- **Cloud Functions:** Firebase Functions v2 (Node.js 20)
- **Serverless API:** Vercel Functions
- **Email Service:** Resend
- **AI Service:** OpenAI GPT-4o-mini
- **AI Monitoring:** Braintrust

**Hosting & Deployment:**
- **Frontend:** Vercel
- **Backend Functions:** Firebase + Vercel
- **CI/CD:** Vercel auto-deploy

### 2.2 Estructura de Carpetas

```
cpq-app/
│
├── src/                                    # Código fuente principal
│   ├── App.jsx                            # ✨ Componente raíz, routing, Firebase init
│   ├── main.jsx                           # Entry point de React
│   ├── index.css                          # Estilos globales + Tailwind
│   │
│   ├── componentes/                       # Componentes por feature
│   │   ├── login/                         # Autenticación
│   │   │   └── LoginPage.jsx              # Login con Firebase Auth
│   │   │
│   │   ├── dashboard/                     # Panel principal
│   │   │   ├── InsightsPanelPro.jsx       # ✨ Panel de IA con insights
│   │   │   ├── QuotesFunnelChart.jsx      # Gráfico de embudo de cotizaciones
│   │   │   ├── RecentQuotesTable.jsx      # Tabla de últimas cotizaciones
│   │   │   └── StatCard.jsx               # Cards de métricas
│   │   │
│   │   ├── catalogo/                      # Gestión de productos
│   │   │   ├── CatalogoPage.jsx           # Vista principal del catálogo
│   │   │   ├── ProductList.jsx            # Lista de productos (tabla/cards)
│   │   │   ├── ProductCard.jsx            # Card individual de producto
│   │   │   ├── ProductoForm.jsx           # ✨ Formulario crear/editar producto
│   │   │   ├── SimpleProductForm.jsx      # Formulario simplificado
│   │   │   ├── ManageCategories.jsx       # Gestión de categorías
│   │   │   └── ManageAttributes.jsx       # Gestión de atributos personalizados
│   │   │
│   │   ├── cotizador/                     # Sistema de cotizaciones
│   │   │   ├── QuotesPage.jsx             # Vista principal de cotizaciones
│   │   │   ├── QuoteForm.jsx              # ✨ Formulario crear/editar cotización
│   │   │   ├── QuoteList.jsx              # Lista de cotizaciones
│   │   │   ├── QuoteBoard.jsx             # Vista Kanban de cotizaciones
│   │   │   ├── QuoteCard.jsx              # Card de cotización
│   │   │   ├── QuotePDF.jsx               # ✨ Generador de PDF dinámico
│   │   │   └── SendEmailDialog.jsx        # Dialog para envío de email
│   │   │
│   │   ├── clientes/                      # Gestión de clientes
│   │   │   ├── ClientesPage.jsx           # Vista principal de clientes
│   │   │   ├── ClientList.jsx             # Lista de clientes
│   │   │   ├── ClientForm.jsx             # ✨ Formulario crear/editar cliente
│   │   │   ├── ClientCard.jsx             # Card de cliente
│   │   │   └── ClientImport.jsx           # Importación masiva desde CSV
│   │   │
│   │   ├── configuracion/                 # Configuración del sistema
│   │   │   ├── SettingsPage.jsx           # Vista principal de configuración
│   │   │   ├── condiciones/               # Términos y condiciones
│   │   │   ├── impuestos/                 # Configuración de impuestos
│   │   │   └── estilos/                   # Estilos de PDF
│   │   │       └── pdf/                   # Plantillas PDF: Light, Wave, Bubble, Striped
│   │   │
│   │   └── comunes/                       # Componentes compartidos
│   │       ├── AlertDialog.jsx
│   │       ├── CardView.jsx
│   │       ├── InfoDialog.jsx
│   │       ├── Notification.jsx
│   │       └── SelectionToolbar.jsx
│   │
│   ├── context/                           # Estado global
│   │   ├── AuthContext.jsx                # ✨ Context de autenticación
│   │   └── useAuth.js                     # Hook para consumir AuthContext
│   │
│   ├── hooks/                             # Custom hooks
│   │   ├── useSelection.js                # Hook para selección múltiple
│   │   ├── useSendQuoteEmail.jsx          # Hook para envío de emails
│   │   └── use-mobile.js                  # Hook para detección mobile
│   │
│   ├── ui/                                # Componentes UI base (Radix + Tailwind)
│   │   ├── AppSidebar.jsx                 # ✨ Barra lateral principal
│   │   ├── dashboard.jsx                  # ✨ Dashboard principal
│   │   ├── DataTable.jsx                  # Tabla genérica con ordenamiento
│   │   ├── DatePicker.jsx                 # Selector de fechas
│   │   ├── theme-provider.jsx             # Provider para tema claro/oscuro
│   │   ├── mode-toggle.jsx                # Toggle de tema
│   │   └── [30+ componentes Radix UI]     # button, card, input, dialog, etc.
│   │
│   ├── utils/                             # Funciones auxiliares
│   │   ├── firestoreUtils.js              # ✨ Utilidades de Firestore
│   │   └── dashboardUtils.js              # ✨ Lógica de métricas del dashboard
│   │
│   └── lib/
│       └── utils.js                       # Utilidades generales (cn, etc.)
│
├── functions/                             # Firebase Cloud Functions
│   ├── index.js                           # ✨ Función sendQuoteEmail
│   └── package.json                       # Dependencies: firebase-admin, resend
│
├── api/                                   # Vercel Serverless Functions
│   ├── generate-insights.js               # ✨ Función de generación de insights con IA
│   └── versiones-generate-insights/       # Versiones anteriores del endpoint
│
├── public/                                # Archivos estáticos
│   ├── fonts/                             # Fuentes personalizadas
│   └── style-previews/                    # Previews de estilos PDF
│
├── dist/                                  # Build output (generado)
│
└── Archivos de configuración:
    ├── package.json                       # ✨ Dependencias frontend
    ├── vite.config.js                     # Configuración de Vite
    ├── firebase.json                      # Configuración Firebase
    ├── vercel.json                        # Configuración Vercel
    ├── tailwind.config.js                 # Configuración Tailwind
    ├── jsconfig.json                      # Path alias (@/* = src/*)
    └── .env.example                       # Template de variables de entorno
```

### 2.3 Dependencias Principales

**Frontend (`package.json`):**
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "vite": "^7.1.7",

    // Firebase
    "firebase": "^12.5.0",

    // UI Framework
    "@radix-ui/react-*": "varios paquetes",
    "tailwindcss": "^3.4.18",
    "lucide-react": "^0.545.0",

    // Funcionalidades
    "@react-pdf/renderer": "^4.3.1",
    "recharts": "^3.3.0",
    "@tanstack/react-table": "^8.21.3",
    "@dnd-kit/*": "drag and drop",
    "papaparse": "^5.5.3",
    "date-fns": "^4.1.0"
  }
}
```

**Backend Cloud Functions (`functions/package.json`):**
```json
{
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.0.1",
    "resend": "^6.4.2"
  }
}
```

**Backend Serverless API (`api/package.json`):**
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "braintrust": "^0.4.9"
  }
}
```

### 2.4 Integraciones y Servicios Externos

| Servicio | Propósito | Configuración |
|----------|-----------|---------------|
| **Firebase Auth** | Autenticación de usuarios | Variables VITE_FIREBASE_* en .env |
| **Firestore** | Base de datos NoSQL | Mismo proyecto Firebase |
| **Firebase Functions** | Backend serverless (emails) | `/functions/index.js` |
| **Vercel** | Hosting frontend + API | `vercel.json` |
| **Resend** | Envío de emails transaccionales | RESEND_API_KEY en Firebase Functions |
| **OpenAI** | Generación de insights con IA | OPENAI_API_KEY en Vercel |
| **Braintrust** | Monitoreo de llamadas IA | BRAINTRUST_API_KEY en Vercel |

---

## 3. MODELOS DE DATOS

### 3.1 Estructura de Firestore

**Base de datos multi-tenant:** Cada usuario tiene sus propias colecciones anidadas bajo `usuarios/{userId}/`

```
Firestore Database:
usuarios/
  └── {userId}/
      ├── contadores/
      │   └── cotizacion
      │       └── numeroActual: number (ej: 9)
      │
      ├── clientes/
      │   └── {clientId}
      │       ├── tipo: string ("persona" | "compañia")
      │       ├── nombre: string
      │       ├── email: string
      │       ├── telefono: string
      │       ├── direccion: object
      │       │   ├── calle: string
      │       │   ├── ciudad: string
      │       │   ├── departamento: string
      │       │   └── pais: string
      │       ├── identificacionNumero: string (NIT o ID)
      │       ├── sitioWeb: string (opcional, solo compañías)
      │       ├── nombreContacto: string (opcional, solo compañías)
      │       ├── puestoTrabajo: string (opcional, solo compañías)
      │       ├── fechaCreacion: timestamp
      │       └── fechaActualizacion: timestamp
      │
      ├── productos/
      │   └── {productId}
      │       ├── nombre: string
      │       ├── descripcion: string
      │       ├── sku: string
      │       ├── precioBase: number
      │       ├── fechaCreacion: timestamp
      │       └── fechaActualizacion: timestamp
      │
      ├── cotizaciones/
      │   └── {quoteId}
      │       ├── numero: string (ej: "COT-0009")
      │       ├── estado: string ("Borrador" | "Enviada" | "En negociación" | "Aprobada" | "Rechazada" | "Vencida")
      │       ├── clienteId: string
      │       ├── clienteNombre: string (desnormalizado)
      │       ├── condicionesPago: string
      │       ├── vencimiento: timestamp
      │       ├── subtotal: number
      │       ├── impuestos: number
      │       ├── total: number
      │       ├── lineas: array[
      │       │   {
      │       │     productId: string,
      │       │     productName: string,
      │       │     quantity: number,
      │       │     price: number
      │       │   }
      │       │ ]
      │       ├── fechaCreacion: timestamp
      │       ├── fechaActualizacion: timestamp
      │       ├── enviadoPorEmail: boolean (opcional)
      │       ├── emailEnviadoA: string (opcional)
      │       ├── fechaEnvio: timestamp (opcional)
      │       └── resendEmailId: string (opcional)
      │
      ├── impuestos/
      │   └── {taxId}
      │       ├── nombre: string
      │       ├── porcentaje: number
      │       ├── activo: boolean
      │       └── aplicableA: string
      │
      ├── condicionesPago/
      │   └── {conditionId}
      │       ├── nombre: string
      │       ├── descripcion: string
      │       ├── activo: boolean
      │       └── orden: number
      │
      └── configuracion/
          └── global
              └── quoteStyle: string ("Light" | "Wave" | "Bubble" | "Striped")
```

### 3.2 Tipos TypeScript Principales

Aunque el proyecto usa JavaScript, estos son los modelos implícitos:

```typescript
// Cliente
interface Cliente {
  id: string;
  tipo: 'persona' | 'compañia';
  nombre: string;
  email: string;
  telefono: string;
  direccion: {
    calle: string;
    ciudad: string;
    departamento: string;
    pais: string;
  };
  identificacionNumero: string; // NIT o ID
  sitioWeb?: string; // Solo compañías
  nombreContacto?: string; // Solo compañías
  puestoTrabajo?: string; // Solo compañías
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

// Producto
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  sku: string;
  precioBase: number;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

// Línea de Cotización
interface LineaCotizacion {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

// Cotización
interface Cotizacion {
  id: string;
  numero: string; // "COT-0009"
  estado: 'Borrador' | 'Enviada' | 'En negociación' | 'Aprobada' | 'Rechazada' | 'Vencida';
  clienteId: string;
  clienteNombre: string;
  condicionesPago: string;
  vencimiento: Timestamp | null;
  subtotal: number;
  impuestos: number;
  total: number;
  lineas: LineaCotizacion[];
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  enviadoPorEmail?: boolean;
  emailEnviadoA?: string;
  fechaEnvio?: Timestamp;
  resendEmailId?: string;
}

// Impuesto
interface Impuesto {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
  aplicableA: string;
}

// Condición de Pago
interface CondicionPago {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

// Configuración Global
interface ConfiguracionGlobal {
  quoteStyle: 'Light' | 'Wave' | 'Bubble' | 'Striped';
}
```

### 3.3 Generación de Números de Cotización

**Ubicación:** `src/utils/firestoreUtils.js`

```javascript
/**
 * Genera números secuenciales únicos por usuario usando transacciones atómicas
 * Formato: "COT-0001", "COT-0002", etc.
 *
 * Ruta: usuarios/{userId}/contadores/cotizacion
 *   - numeroActual: number
 */
export async function obtenerSiguienteNumeroCotizacion(db, userId) {
  const contadorRef = doc(db, 'usuarios', userId, 'contadores', 'cotizacion');

  const nuevoNumero = await runTransaction(db, async (transaction) => {
    const contadorDoc = await transaction.get(contadorRef);

    if (!contadorDoc.exists()) {
      transaction.set(contadorRef, { numeroActual: 1 });
      return 1;
    }

    const numeroNuevo = contadorDoc.data().numeroActual + 1;
    transaction.update(contadorRef, { numeroActual: numeroNuevo });
    return numeroNuevo;
  });

  return `COT-${String(nuevoNumero).padStart(4, '0')}`;
}
```

---

## 4. FLUJOS DE NEGOCIO

### 4.1 Flujo: Crear una Cotización (Paso a Paso)

**1. Usuario accede a QuotesPage**
- Ruta: `App.jsx` navega a `'quotes'`
- Se renderiza: `<QuotesPage db={db} navigate={handleNavigate} />`

**2. Usuario hace click en "Nueva Cotización"**
- `QuotesPage.jsx` cambia estado a `showForm: true`
- Se renderiza: `<QuoteForm db={db} quoteId={null} onBack={handleBack} />`

**3. QuoteForm se inicializa**
```javascript
// src/componentes/cotizador/QuoteForm.jsx (líneas 217-296)

useEffect(() => {
  async function loadInitialData() {
    // 1. Cargar clientes, productos, condiciones de pago
    const [clientsSnap, termsSnap, configSnap] = await Promise.all([
      getDocs(collection(db, "usuarios", user.uid, "clientes")),
      getDocs(query(collection(db, "usuarios", user.uid, "condicionesPago"))),
      getDoc(doc(db, 'usuarios', user.uid, 'configuracion', 'global'))
    ]);

    // 2. Si NO es edición, generar nuevo número de cotización
    if (!quoteId) {
      const formattedNumber = await obtenerSiguienteNumeroCotizacion(db, user.uid);
      // formattedNumber = "COT-0009"
      setQuote(prev => ({ ...prev, numero: formattedNumber }));
    }
  }
  loadInitialData();
}, [db, quoteId, user]);
```

**4. Usuario captura datos:**
- **Cliente:** Select dropdown con lista de clientes
- **Vencimiento:** DatePicker (opcional)
- **Condiciones de pago:** Select dropdown con condiciones activas
- **Líneas de cotización:**
  - Click "Añadir un producto" → Inline search de productos
  - O click "Abrir Catálogo" → Modal con todos los productos (grid)
  - Por cada línea: cantidad, precio unitario (editable)

**5. Cálculos en tiempo real:**
```javascript
// src/componentes/cotizador/QuoteForm.jsx (líneas 425-432)
const calculateTotals = () => {
  const subtotal = lineasValidas.reduce((acc, line) =>
    acc + (parseFloat(line.quantity) * parseFloat(line.price)), 0);
  const tax = subtotal * 0.19; // IVA 19% fijo
  const total = subtotal + tax;
  return { subtotal, tax, total };
};
```

**6. Usuario guarda la cotización:**
```javascript
// src/componentes/cotizador/QuoteForm.jsx (líneas 336-384)
const handleSave = async () => {
  const { subtotal, tax, total } = calculateTotals();

  const quoteData = {
    numero: quote.numero,
    estado: quote.estado, // Default: "Borrador"
    clienteId: quote.clienteId,
    clienteNombre: selectedClient?.nombre,
    condicionesPago: quote.condicionesPago,
    vencimiento: quote.vencimiento ? Timestamp.fromDate(quote.vencimiento) : null,
    subtotal,
    impuestos: tax,
    total,
    lineas: quote.lineas.filter(line => line.productId).map(line => ({
      productId: line.productId,
      productName: line.productName,
      quantity: parseFloat(line.quantity),
      price: parseFloat(line.price)
    })),
    fechaCreacion: serverTimestamp(), // Solo si es nueva
    fechaActualizacion: serverTimestamp()
  };

  if (quoteId) {
    // Actualizar existente
    await setDoc(doc(db, "usuarios", user.uid, "cotizaciones", quoteId), quoteData, { merge: true });
  } else {
    // Crear nueva
    await addDoc(collection(db, "usuarios", user.uid, "cotizaciones"), quoteData);
  }

  onBack(true); // Volver a lista y refrescar
};
```

**7. Outputs generados:**
- ✅ Documento en Firestore: `usuarios/{userId}/cotizaciones/{quoteId}`
- ✅ Número único: "COT-0009"
- ✅ Estado inicial: "Borrador"
- ✅ Timestamps de creación y actualización

### 4.2 Flujo: Enviar Cotización por Email

**1. Usuario abre cotización existente**
- Click en row de tabla → `QuotesPage` navega a `QuoteForm` con `quoteId`

**2. Usuario hace click en "Enviar por Email"**
```javascript
// src/componentes/cotizador/QuoteForm.jsx (líneas 475-484)
<Button onClick={() => setEmailDialogOpen(true)}>
  <Mail className="mr-2 h-4 w-4" />
  Enviar por Email
</Button>
```

**3. Se abre SendEmailDialog**
- Precarga: email del cliente desde Firestore
- Usuario puede editar el email antes de enviar

**4. Usuario confirma envío**
```javascript
// src/componentes/cotizador/QuoteForm.jsx (líneas 387-422)
const handleSendEmail = async (email) => {
  await sendQuoteEmail({
    quoteId: quoteId,
    quote: { ...quote, total, subtotal, impuestos: tax },
    client: { ...client, email: email },
    quoteStyleName: globalConfig?.quoteStyle || 'Bubble'
  });
};
```

**5. Hook useSendQuoteEmail ejecuta:**
```javascript
// src/hooks/useSendQuoteEmail.jsx
const sendQuoteEmail = async ({ quoteId, quote, client, quoteStyleName }) => {
  // 1. Generar PDF en memoria
  const doc = <QuotePDF quote={quote} client={client} styleName={quoteStyleName} />;
  const blob = await pdf(doc).toBlob();

  // 2. Convertir a base64
  const pdfBase64 = await blobToBase64(blob);

  // 3. Llamar a Firebase Cloud Function
  const sendQuoteEmailFn = httpsCallable(functions, 'sendQuoteEmail');
  await sendQuoteEmailFn({
    quoteId,
    quoteNumber: quote.numero,
    clientEmail: client.email,
    clientName: client.nombre,
    userEmail: user.email,
    userName: user.displayName,
    total: quote.total,
    vencimiento: quote.vencimiento,
    pdfBase64
  });
};
```

**6. Firebase Cloud Function ejecuta:**
```javascript
// functions/index.js (líneas 16-286)
exports.sendQuoteEmail = onCall(async (request) => {
  // 1. Validar autenticación
  if (!request.auth) throw new Error('No autenticado');

  // 2. Obtener datos del request
  const { quoteId, pdfBase64, clientEmail, quoteNumber, ... } = request.data;

  // 3. Configurar Resend
  const resend = new Resend(resendApiKey.value());

  // 4. Convertir base64 a Buffer
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  // 5. Enviar email con Resend
  const { data: sendData } = await resend.emails.send({
    from: 'cotizaciones@cepequ.com',
    to: [clientEmail],
    subject: `Cotización ${quoteNumber} - ${clientName}`,
    html: `<!-- HTML con diseño profesional -->`,
    attachments: [{
      filename: `${quoteNumber}.pdf`,
      content: pdfBuffer
    }]
  });

  // 6. Actualizar Firestore
  await db.collection('usuarios')
    .doc(request.auth.uid)
    .collection('cotizaciones')
    .doc(quoteId)
    .update({
      estado: 'Enviada',
      enviadoPorEmail: true,
      emailEnviadoA: clientEmail,
      fechaEnvio: admin.firestore.FieldValue.serverTimestamp(),
      resendEmailId: sendData.id
    });

  return { success: true, emailId: sendData.id };
});
```

**7. Outputs generados:**
- ✅ Email enviado al cliente con PDF adjunto
- ✅ Estado de cotización actualizado a "Enviada"
- ✅ Metadata de envío almacenada en Firestore
- ✅ ID de Resend guardado para tracking

### 4.3 Flujo: Generación de Insights con IA

**1. Usuario accede al Dashboard**
- Tab "Insights con IA" → Renderiza `<InsightsPanelPro db={db} />`

**2. Sistema verifica caché**
```javascript
// src/componentes/dashboard/InsightsPanelPro.jsx (líneas 21-59)
const isCacheValid = async () => {
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedQuoteCount = localStorage.getItem(CACHE_QUOTE_COUNT_KEY);

  // 1. Verificar si han pasado más de 24 horas
  const cacheAge = Date.now() - parseInt(cachedTimestamp);
  if (cacheAge > 24 * 60 * 60 * 1000) return false;

  // 2. Verificar si hay nuevas cotizaciones
  const quotesSnapshot = await getDocs(collection(db, "usuarios", user.uid, "cotizaciones"));
  if (quotesSnapshot.size !== parseInt(cachedQuoteCount)) return false;

  return true; // Caché válido
};
```

**3. Si caché es válido → Cargar desde localStorage**
```javascript
const loadFromCache = () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    setInsights(JSON.parse(cached));
    return true;
  }
  return false;
};
```

**4. Si NO hay caché válido → Usuario hace click "Generar Insights"**

**5. Sistema recopila todos los datos:**
```javascript
// src/componentes/dashboard/InsightsPanelPro.jsx (líneas 124-346)
const fetchCompleteData = async () => {
  // 1. TODAS las cotizaciones con detalles completos
  const quotesSnapshot = await getDocs(
    query(collection(db, "usuarios", user.uid, "cotizaciones"),
    orderBy("fechaCreacion", "desc"))
  );

  // 2. TODOS los clientes
  const clientesSnapshot = await getDocs(collection(db, "usuarios", user.uid, "clientes"));

  // 3. TODOS los productos
  const productosSnapshot = await getDocs(collection(db, "usuarios", user.uid, "productos"));

  // 4. Calcular métricas agregadas
  const totalCotizaciones = quotesSnapshot.size;
  const aprobadas = cotizaciones.filter(q => q.estado === 'Aprobada').length;
  const tasaConversion = (aprobadas / totalCotizaciones * 100).toFixed(1);

  // 5. Análisis de productos (más cotizados, tasa de conversión, etc.)
  const productosMap = new Map();
  cotizaciones.forEach(cotizacion => {
    cotizacion.items?.forEach(prod => {
      // Agregar estadísticas por producto
    });
  });

  return {
    cotizaciones: { todas: [...], totalCotizaciones, aprobadas, tasaConversion, ... },
    clientes: { total: ..., lista: [...] },
    productos: { total: ..., analisis: [...] },
    alertas: { urgentes: ..., borradoresAntiguos: ... }
  };
};
```

**6. Sistema llama a Vercel Serverless Function:**
```javascript
// src/componentes/dashboard/InsightsPanelPro.jsx (líneas 376-393)
const idToken = await getAuth().currentUser.getIdToken();

const response = await fetch('/api/generate-insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ completeData })
});
```

**7. Vercel Function procesa con OpenAI:**
```javascript
// api/generate-insights.js (líneas 62-195)
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: `Eres un analista de negocios experto en CPQ...

      ÁREAS CRÍTICAS DE ANÁLISIS:
      1. ANÁLISIS DE PRODUCTOS: ¿Qué productos se cotizan más pero NO se aprueban?
      2. ANÁLISIS DE CLIENTES: ¿Qué clientes tienen mejor tasa de conversión?
      3. ANÁLISIS TEMPORAL: ¿Cuánto tiempo tarda una cotización en cerrarse?
      4. ANÁLISIS DE PRECIOS: ¿Productos con ticket promedio más alto?
      5. OPORTUNIDADES OCULTAS: Cross-selling potencial, productos infrautilizados

      Responde en JSON con:
      {
        "resumenEjecutivo": "...",
        "insightsDescriptivos": [...],
        "insightsPredictivos": [...],
        "recomendaciones": [...]
      }`
    },
    {
      role: "user",
      content: `Analiza estos datos: ${JSON.stringify(completeData)}`
    }
  ],
  response_format: { type: "json_object" },
  temperature: 0.7
});

const insights = JSON.parse(completion.choices[0].message.content);
```

**8. Función retorna insights + metadata:**
```javascript
return res.status(200).json({
  success: true,
  insights,
  metadata: {
    model: "gpt-4o-mini",
    tokensUsed: completion.usage.total_tokens,
    cost: (tokensUsed * 0.00002).toFixed(4),
    duration: `${Date.now() - startTime}ms`,
    braintrustTracked: true
  }
});
```

**9. Sistema guarda en caché y renderiza:**
```javascript
// Guardar en localStorage
saveToCache(generatedInsights, quoteCount);

// Renderizar insights
setInsights(generatedInsights);
```

**10. Outputs generados:**
- ✅ Resumen ejecutivo con top 3 hallazgos
- ✅ 4-6 insights descriptivos (productos más cotizados, conversión, etc.)
- ✅ 2-3 predicciones basadas en tendencias
- ✅ 3-5 recomendaciones accionables con prioridad
- ✅ Caché válido por 24h o hasta nueva cotización
- ✅ Logs en Braintrust para monitoreo

---

## 5. COMPONENTES Y RUTAS PRINCIPALES

### 5.1 Sistema de Navegación

**No usa React Router:** El routing se maneja con estado interno en `App.jsx`

```javascript
// src/App.jsx (líneas 43-82)
const [route, setRoute] = useState('dashboard');
const [targetQuoteId, setTargetQuoteId] = useState(null);
const [navigationState, setNavigationState] = useState(null);

const handleNavigate = (newRoute, payload = null, state = null) => {
  setRoute(newRoute);
  setTargetQuoteId(payload);
  setNavigationState(state);
};

const renderRoute = () => {
  const props = { db, navigate: handleNavigate };
  switch (route) {
    case 'dashboard': return <Dashboard {...props} />;
    case 'clients': return <ClientesPage {...props} navigationState={navigationState} />;
    case 'catalog': return <CatalogoPage {...props} />;
    case 'quotes': return <QuotesPage {...props} initialQuoteId={targetQuoteId} />;
    case 'settings': return <SettingsPage {...props} />;
    default: return <Dashboard {...props} />;
  }
};
```

**Rutas disponibles:**
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `dashboard` | `Dashboard` | Panel principal con métricas y insights |
| `clients` | `ClientesPage` | Gestión de clientes (CRUD) |
| `catalog` | `CatalogoPage` | Gestión de productos (CRUD) |
| `quotes` | `QuotesPage` | Gestión de cotizaciones (CRUD + Kanban) |
| `settings` | `SettingsPage` | Configuración (impuestos, condiciones, estilos PDF) |
| `login` | `LoginPage` | Autenticación (si no hay usuario) |

### 5.2 Componentes Core

#### AppSidebar (`src/ui/AppSidebar.jsx`)
Barra lateral con navegación principal:
- Logo de la aplicación
- Menú de navegación (Dashboard, Cotizaciones, Catálogo, Clientes, Configuración)
- Avatar de usuario + dropdown (tema, logout)
- Responsive (colapsable en mobile)

#### Dashboard (`src/ui/dashboard.jsx`)
Panel principal con:
- **Tab "Métricas":**
  - Cards principales: Monto Aprobado, Tasa de Conversión, Cotizaciones Este Mes
  - Alertas de cotizaciones urgentes (vencen en 48h)
  - Cards secundarios: Total Cotizaciones, En Negociación, Borradores
  - Top 3 Clientes (con monto total)
  - Gráfico de tendencia (6 meses)
  - Gráfico de distribución por estado (embudo)
  - Tabla de cotizaciones recientes
- **Tab "Insights con IA":**
  - Panel `<InsightsPanelPro />` con análisis inteligente

#### InsightsPanelPro (`src/componentes/dashboard/InsightsPanelPro.jsx`)
Panel de insights con IA:
- Sistema de caché inteligente (24h o nueva cotización)
- Botón "Generar Insights" (llama a OpenAI vía Vercel)
- Indicador de edad del caché (ej: "4h")
- Renderizado de insights:
  - Resumen ejecutivo
  - Cards de insights descriptivos (color según tipo)
  - Cards de predicciones
  - Lista de recomendaciones con prioridad

#### QuoteForm (`src/componentes/cotizador/QuoteForm.jsx`)
Formulario complejo de cotizaciones:
- Selector de estado visual (chips: Borrador, Enviada, etc.)
- Información principal: Cliente, Vencimiento, Condiciones de pago
- Tabla de líneas de cotización:
  - Búsqueda inline de productos
  - Modal de catálogo completo
  - Cantidad y precio editables por línea
- Cálculo automático: Subtotal, IVA 19%, Total
- Botones de acción:
  - Guardar Cotización
  - Descargar PDF (con estilo configurable)
  - Enviar por Email (solo si está guardada)

#### QuotePDF (`src/componentes/cotizador/QuotePDF.jsx`)
Generador dinámico de PDFs:
- Usa `@react-pdf/renderer`
- Soporta múltiples estilos: Light, Wave, Bubble, Striped
- Carga de estilos desde: `src/componentes/configuracion/estilos/pdf/`
- Renderiza: Logo, datos de empresa, datos de cliente, tabla de productos, totales

### 5.3 Páginas Principales

#### ClientesPage (`src/componentes/clientes/ClientesPage.jsx`)
Vista de gestión de clientes:
- Estados: `list` (lista) o `form` (crear/editar)
- Lista: Tabla con búsqueda, filtros, ordenamiento
- Importación masiva desde CSV (papaparse)
- Navegación a formulario de cliente

#### CatalogoPage (`src/componentes/catalogo/CatalogoPage.jsx`)
Vista de gestión de productos:
- Estados: `list` o `form`
- Vistas: Tabla (DataTable) o Cards (grid)
- Gestión de categorías y atributos personalizados
- Selector de tipo de producto (Simple, Configurable, Bundle)

#### QuotesPage (`src/componentes/cotizador/QuotesPage.jsx`)
Vista de gestión de cotizaciones:
- Estados: `list` (tabla), `board` (kanban), o `form` (crear/editar)
- Toggle entre vista lista y Kanban
- Búsqueda y filtros por estado
- Vista Kanban con drag & drop (dnd-kit)
- Acciones masivas: Eliminar, Cambiar estado

#### SettingsPage (`src/componentes/configuracion/SettingsPage.jsx`)
Vista de configuración:
- Tabs: Impuestos, Condiciones de Pago, Estilos de PDF
- Módulo de impuestos: CRUD de tasas impositivas
- Módulo de condiciones: CRUD de términos de pago (ordenables)
- Módulo de estilos: Selector visual de plantillas PDF (con previews)

---

## 6. CONFIGURACIÓN

### 6.1 Variables de Entorno

**Archivo:** `.env.local` (gitignored)

```bash
# Firebase Configuration (Frontend - VITE_)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123

# NO incluir OpenAI API Key en frontend
# Solo en backend (Vercel + Firebase)
```

**Firebase Functions (backend):**
```bash
# Configuradas en Firebase Console > Functions > Secrets
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=cotizaciones@cepequ.com
FROM_NAME=Cepequ CPQ
```

**Vercel (backend serverless):**
```bash
# Configuradas en Vercel Dashboard > Project > Settings > Environment Variables
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
BRAINTRUST_API_KEY=sk-xxxxxxxxxxxxx
```

### 6.2 Configuración de Firebase

**Archivo:** `firebase.json`
```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "disallowLegacyRuntimeConfig": true,
      "ignore": ["node_modules", ".git", "*.local"]
    }
  ]
}
```

**Desplegar Functions:**
```bash
cd functions
npm install
firebase deploy --only functions
```

### 6.3 Configuración de Vercel

**Archivo:** `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Desplegar a Vercel:**
```bash
# Automático en cada push a main (GitHub integration)
# O manual:
vercel --prod
```

### 6.4 Scripts de package.json

**Frontend:**
```json
{
  "scripts": {
    "dev": "vite",                    // Servidor desarrollo (http://localhost:5173)
    "build": "vite build",            // Build producción (./dist)
    "preview": "vite preview",        // Preview del build
    "lint": "eslint ."                // Linter
  }
}
```

**Firebase Functions:**
```json
{
  "scripts": {
    "serve": "firebase emulators:start --only functions",  // Emulador local
    "deploy": "firebase deploy --only functions",          // Deploy a Firebase
    "logs": "firebase functions:log"                       // Ver logs
  }
}
```

### 6.5 Configuración de Servicios

#### Resend (Email Service)
1. Crear cuenta en [resend.com](https://resend.com)
2. Obtener API Key
3. Verificar dominio (o usar sandbox)
4. Configurar en Firebase Functions:
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   ```

#### OpenAI (IA Service)
1. Crear cuenta en [platform.openai.com](https://platform.openai.com)
2. Obtener API Key
3. Configurar en Vercel Dashboard
4. Modelo usado: `gpt-4o-mini` (costo ~$0.00002 por llamada)

#### Braintrust (AI Monitoring)
1. Crear cuenta en [braintrust.dev](https://braintrust.dev)
2. Obtener API Key
3. Configurar en Vercel Dashboard
4. Tracking automático con `wrapOpenAI()`

---

## 7. GUÍAS DE USO

### 7.1 Cómo Iniciar el Proyecto

**Desarrollo local:**
```bash
# 1. Clonar repositorio
git clone https://github.com/alejomeek15/cpq-app.git
cd cpq-app

# 2. Instalar dependencias frontend
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Firebase

# 4. Iniciar servidor de desarrollo
npm run dev
# Abrir http://localhost:5173

# 5. (Opcional) Iniciar Firebase Functions local
cd functions
npm install
firebase emulators:start --only functions
```

### 7.2 Cómo Extender el Sistema

#### Añadir un nuevo campo a Cliente:
```javascript
// 1. Actualizar ClientForm.jsx
// src/componentes/clientes/ClientForm.jsx

const [client, setClient] = useState({
  // ... campos existentes
  nuevoCAMPO: '', // ✨ NUEVO
});

// 2. Añadir input en el JSX
<Input
  type="text"
  name="nuevoCAMPO"
  value={client.nuevoCAMPO}
  onChange={handleChange}
  placeholder="Nuevo Campo"
/>

// 3. El campo se guardará automáticamente en Firestore
// No se necesita migración, Firestore es schemaless
```

#### Añadir un nuevo estado a Cotización:
```javascript
// 1. Actualizar QuoteForm.jsx
// src/componentes/cotizador/QuoteForm.jsx (línea 434)

const statusOptions = [
  "Borrador",
  "Enviada",
  "En negociación",
  "Aprobada",
  "Rechazada",
  "Vencida",
  "Nuevo Estado" // ✨ NUEVO
];

// 2. Actualizar colores en QuoteCard.jsx (opcional)
// src/componentes/cotizador/QuoteCard.jsx

const getStatusColor = (estado) => {
  // ... casos existentes
  case 'Nuevo Estado': return 'bg-purple-100 text-purple-800';
};
```

#### Añadir un nuevo estilo de PDF:
```javascript
// 1. Crear nueva plantilla
// src/componentes/configuracion/estilos/pdf/QuotePDF MiEstilo.jsx

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  // Tus estilos personalizados
});

const QuotePDFMiEstilo = ({ quote, client }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Tu diseño personalizado */}
    </Page>
  </Document>
);

export default QuotePDFMiEstilo;

// 2. Registrar en QuotePDF.jsx
// src/componentes/cotizador/QuotePDF.jsx

import QuotePDFMiEstilo from '../configuracion/estilos/pdf/QuotePDF MiEstilo.jsx';

const QuotePDF = ({ quote, client, styleName = 'Bubble' }) => {
  switch(styleName) {
    case 'Light': return <QuotePDFLight {...} />;
    case 'Wave': return <QuotePDFWave {...} />;
    case 'Bubble': return <QuotePDFBubble {...} />;
    case 'Striped': return <QuotePDFStriped {...} />;
    case 'MiEstilo': return <QuotePDFMiEstilo {...} />; // ✨ NUEVO
    default: return <QuotePDFBubble {...} />;
  }
};

// 3. Añadir a selector en QuoteStylesModule.jsx
// src/componentes/configuracion/estilos/QuoteStylesModule.jsx

const styles = [
  { name: 'Light', ... },
  { name: 'Wave', ... },
  { name: 'Bubble', ... },
  { name: 'Striped', ... },
  { name: 'MiEstilo', preview: '/style-previews/miestilo.png' } // ✨ NUEVO
];
```

### 7.3 Solución de Problemas Comunes

**Error: "Firebase no definido"**
- Verificar que `.env.local` existe y tiene todas las variables VITE_FIREBASE_*
- Reiniciar servidor de desarrollo: `npm run dev`

**Error: "Usuario no autenticado" en Cloud Function**
- Verificar que el usuario está logueado en Firebase Auth
- Verificar que el token se está enviando correctamente en la llamada

**Error: "OpenAI API key inválida"**
- Verificar que OPENAI_API_KEY está configurada en Vercel
- Verificar que el proyecto tiene créditos en OpenAI

**Insights no se generan**
- Verificar que hay al menos 1 cotización en Firestore
- Revisar consola del navegador para errores
- Verificar logs en Vercel Dashboard

---

## 8. ARQUITECTURA DE SEGURIDAD

### 8.1 Autenticación

- **Proveedor:** Firebase Authentication
- **Flujo:** Email/Password (configurable para Google, GitHub, etc.)
- **Context:** `AuthContext` proporciona `user` y `loading` globalmente
- **Protección de rutas:** `App.jsx` verifica `user` antes de renderizar

### 8.2 Autorización

- **Multi-tenancy:** Cada usuario solo accede a sus datos
- **Estructura:** `usuarios/{userId}/...` en Firestore
- **Validación:** Todas las queries incluyen `user.uid` del Context
- **Backend:** Cloud Functions validan `request.auth.uid`

### 8.3 Reglas de Firestore (Recomendadas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados
    match /usuarios/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 9. PRÓXIMOS PASOS Y MEJORAS SUGERIDAS

### Funcionalidades Pendientes
- [ ] Sistema de roles (Admin, Vendedor, Viewer)
- [ ] Descuentos y promociones en líneas de cotización
- [ ] Múltiples impuestos por línea (no solo IVA 19% fijo)
- [ ] Firma electrónica de cotizaciones
- [ ] Integración con pasarelas de pago
- [ ] Histórico de cambios (audit log)
- [ ] Notificaciones push (Firebase Cloud Messaging)

### Optimizaciones Técnicas
- [ ] Implementar paginación en listas largas (usar Firestore cursors)
- [ ] Añadir índices compuestos en Firestore para queries complejas
- [ ] Implementar Service Worker para offline-first
- [ ] Migrar a TypeScript para mayor type safety
- [ ] Añadir tests unitarios (Vitest) y e2e (Playwright)
- [ ] Optimizar bundle size (code splitting, lazy loading)

### Mejoras de UX
- [ ] Onboarding guiado para nuevos usuarios
- [ ] Templates de cotizaciones pre-configuradas
- [ ] Búsqueda global (Algolia o Typesense)
- [ ] Modo claro/oscuro persistente por usuario en Firestore
- [ ] Export de reportes en Excel/CSV

---

## 10. CONTACTO Y SOPORTE

**Repositorio:** https://github.com/alejomeek15/cpq-app
**Issues:** https://github.com/alejomeek15/cpq-app/issues
**Documentación oficial de tecnologías:**
- [React](https://react.dev)
- [Vite](https://vite.dev)
- [Firebase](https://firebase.google.com/docs)
- [Radix UI](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com/docs)

---

**Última actualización:** 2026-01-19
**Generado por:** Claude Code (Sonnet 4.5)
