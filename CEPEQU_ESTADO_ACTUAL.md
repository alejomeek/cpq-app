# 📊 CEPEQU - ESTADO ACTUAL DEL PROYECTO
## Configure-Price-Quote System

**Fecha de generación:** 24 de enero de 2026
**Última actualización del código:** 23 de enero de 2026
**Estado:** 🟢 PRODUCCIÓN ACTIVA + DESARROLLO CONTINUO

---

## 1. INFORMACIÓN GENERAL

### Descripción
**CePeQu** es una aplicación web moderna de Configure-Price-Quote (CPQ) diseñada para gestionar el ciclo completo de cotizaciones comerciales, desde la configuración de catálogos de productos hasta el envío automatizado de presupuestos por email con generación de insights mediante IA.

### Cliente Actual
**Jugando y Educando** - E-commerce de juguetes educativos integrado con Wix

### Estado de Producción
- ✅ **Frontend:** Desplegado en Vercel
- ✅ **Backend:** Firebase Cloud Functions + Vercel Serverless
- ✅ **Database:** Firestore (proyecto `app-cpq`)
- ✅ **Integración Wix:** Funcional con sincronización manual
- 🔄 **En desarrollo:** Refinamiento de protección de productos Wix

### URLs
- **Frontend:** `https://cpq-app-vercel.vercel.app`
- **Cloud Functions Base:** `https://us-central1-app-cpq.cloudfunctions.net/`
- **API Insights:** `/api/generate-insights` (Vercel Function)

---

## 2. STACK TECNOLÓGICO ACTUAL

### Frontend
- **Framework:** React 19.1.1
- **Build Tool:** Vite 7.1.7
- **UI Library:** Radix UI (40+ componentes) + Tailwind CSS 3.4.18
- **Routing:** Sistema de estado interno (no usa React Router)
- **State Management:** React Context API (AuthContext)
- **PDF Generation:** @react-pdf/renderer 4.3.1
- **Charts:** Recharts 3.3.0
- **Tables:** @tanstack/react-table 8.21.3
- **Drag & Drop:** @dnd-kit (Kanban de cotizaciones)
- **CSV Parsing:** papaparse 5.5.3
- **Icons:** lucide-react 0.545.0

### Backend
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Authentication (email/password)
- **Cloud Functions:** Firebase Functions v2 (Node.js 20)
- **Serverless API:** Vercel Functions
- **Storage:** Firebase Cloud Storage (logos de empresa)

### Integraciones Externas
| Servicio | Propósito | Ubicación Config |
|----------|-----------|------------------|
| **Wix API** | Sincronización de catálogo de productos | Firebase Secrets |
| **Resend** | Envío de emails transaccionales con PDFs | Firebase Secrets |
| **OpenAI** | Generación de insights con GPT-4o-mini | Vercel Env Vars |
| **Braintrust** | Monitoreo de llamadas a IA | Vercel Env Vars |

### Deployment
- **Frontend Hosting:** Vercel (auto-deploy on push to main)
- **Backend Functions:** Firebase Cloud Functions (us-central1)
- **CI/CD:** GitHub → Vercel (automático)

---

## 3. FUNCIONALIDADES IMPLEMENTADAS

### ✅ 3.1 Módulo de Cotizaciones (COMPLETO)

**Ubicación:** `src/componentes/cotizador/`

#### Funcionalidades Core
- **Sistema de numeración:** Números secuenciales únicos por usuario (COT-0001, COT-0002, etc.)
  - Implementación: Transacciones atómicas de Firestore
  - Archivo: `src/utils/firestoreUtils.js:obtenerSiguienteNumeroCotizacion()`

- **Estados de cotización:**
  - Borrador → Enviada → En negociación → Aprobada/Rechazada/Vencida
  - Cambio visual mediante selector de chips o drag & drop

- **Vistas disponibles:**
  - 📋 **Vista Lista:** Tabla con búsqueda, filtros, ordenamiento (DataTable)
  - 📌 **Vista Kanban:** Drag & drop con @dnd-kit para gestión visual de estados
    - Archivos: `QuoteBoard.jsx`, `QuoteColumn.jsx`

#### Capacidades de Edición
- Selector de cliente (dropdown con búsqueda)
- Captura de líneas de productos:
  - Búsqueda inline de productos
  - Modal de catálogo completo para selección
  - Cantidad y precio editables por línea
- Condiciones de pago (dropdown configurable)
- Fecha de vencimiento (DatePicker opcional)
- Cálculo automático en tiempo real:
  - Subtotal
  - IVA 19% (fijo actualmente)
  - Total

#### Generación de PDFs
- **Archivo:** `QuotePDF.jsx`
- **Estilos disponibles:** 4 plantillas visuales
  - Light (minimalista)
  - Wave (con ondas decorativas)
  - Bubble (con elementos circulares)
  - Striped (con franjas)
- **Renderizado:** @react-pdf/renderer (generación en browser)
- **Logo:** Cargado directamente desde URL de Wix (no base64 para mejor performance)

#### Envío por Email
- **Archivo:** `SendEmailDialog.jsx`, `useSendQuoteEmail.jsx`
- **Flujo:**
  1. Generar PDF en memoria
  2. Convertir a base64
  3. Llamar Cloud Function `sendQuoteEmail`
  4. Enviar via Resend con PDF adjunto
  5. Actualizar estado en Firestore (Enviada, metadata de envío)
- **Metadata guardada:**
  - `enviadoPorEmail: true`
  - `emailEnviadoA: "cliente@email.com"`
  - `fechaEnvio: Timestamp`
  - `resendEmailId: "re_xxxxx"`

#### Limitaciones conocidas
- IVA fijo al 19% (no configurable por línea aún)
- No soporta descuentos por línea
- No permite múltiples impuestos simultáneos

---

### ✅ 3.2 Módulo de Gestión de Productos (COMPLETO)

**Ubicación:** `src/componentes/catalogo/`

#### Tipos de Productos
1. **Productos Manuales:** Creados por el usuario en la aplicación
2. **Productos Wix:** Sincronizados desde Wix API (marcados con `lastSync`)

#### Gestión de Productos Manuales
- **CRUD completo:**
  - Crear: `ProductoForm.jsx` con formulario completo
  - Editar: Carga de datos existentes + actualización
  - Duplicar: Copia de producto con nuevo ID
  - Eliminar: Borrado con confirmación
- **Campos capturados:**
  - SKU (único por usuario)
  - Nombre
  - Descripción
  - Precio base
  - URL de imagen
  - Control de IVA (exento/no exento)
  - Categoría (opcional)

#### Sincronización con Wix
- **Archivo principal:** `src/services/wixService.js`
- **Cloud Function:** `functions/index.js:syncWixProducts`
- **Trigger:** Manual desde `WixIntegrationModule.jsx` (botón "Sincronizar Ahora")
- **Proceso:**
  1. Autenticación con credenciales de Firebase Secrets
  2. Fetch paginado de productos (100 por página)
  3. Procesamiento y formateo de cada producto
  4. Guardado en lotes de 500 en Firestore
  5. Metadata guardada en `usuarios/{userId}/settings/wix_sync`

#### Campos Extraídos de Wix
```javascript
{
  sku: string,                    // ID del documento
  nombre: string,                 // product.name
  descripcion: string,            // HTML limpiado automáticamente
  precio_iva_incluido: float,    // price.price o priceData.price
  precioBase: float,             // Duplicado por compatibilidad
  imagen_url: string,            // 8 rutas de fallback exploradas
  inventory: integer,            // stock.quantity (999 si inStock)
  categoria: string,             // product.productType
  exento_iva: boolean,           // Detectado por palabras clave
  lastSync: Timestamp            // ⚠️ Marca de producto Wix
}
```

#### Detección Automática de Imágenes Wix
**8 rutas de fallback exploradas** (en orden):
1. `p.media.mainMedia.image.url`
2. `p.media.items[0].image.url`
3. `p.mediaItems[0].url`
4. `p.mainMedia.url`
5. `p.media.mainMedia.thumbnail.url`
6. `p.ribbon.media.image.url`
7. Placeholder genérico

**Logs:** ⚠️ en consola si no encuentra imagen

#### Detección de IVA Exento
```javascript
function isExentoIVA(productName) {
  const name = productName.toLowerCase();
  return name.includes('libro') || name.includes('patineta');
}
```
**Extensible:** Agregar palabras clave al array

#### Protección de Productos Wix
**Mecanismo:** Flag `lastSync` marca productos sincronizados desde Wix

**Validaciones implementadas:**
- `ProductCard.jsx` (línea 75, 113): Botones Editar/Eliminar deshabilitados si `product.lastSync`
- `ProductDetails.jsx` (línea 79, 88): Botones Editar/Eliminar deshabilitados si `product.lastSync`
- Dropdown menus: Condición `!product.lastSync && onEdit` en todas partes

**Último commit relacionado (23/01/2026):**
`714655d - feat: habilitar edición real de productos manuales y restringir acciones en productos Wix`

#### Vistas Disponibles
- 📋 **Vista Tabla:** DataTable con ordenamiento, búsqueda
- 🃏 **Vista Cards:** Grid responsivo
- 📄 **Vista Detalles:** Sheet panel lateral
- 🔍 **Filtros:** Todos, Solo Manuales, Solo Wix

#### Limitaciones conocidas
- Sincronización Wix es manual (no automática)
- No soporta variantes de productos Wix
- Detección de IVA exento limitada a palabras clave

---

### ✅ 3.3 Módulo de Gestión de Clientes (COMPLETO)

**Ubicación:** `src/componentes/clientes/`

#### Tipos de Clientes
1. **Persona:** Individuos
2. **Compañía:** Empresas con contacto designado

#### Campos Capturados
**Comunes:**
- Tipo (Persona/Compañía)
- Nombre
- Email
- Teléfono
- Dirección completa (calle, ciudad, departamento, país)
- Número de identificación (NIT para compañías, ID para personas)

**Exclusivos de Compañías:**
- Sitio web
- Nombre de contacto
- Puesto de trabajo del contacto

#### Funcionalidades
- **CRUD completo:**
  - Crear: `ClientForm.jsx`
  - Editar: Carga de datos existentes
  - Eliminar: Con confirmación
- **Importación masiva:** CSV con papaparse
  - Archivo: `ClientImport.jsx`
  - Mapeo automático de columnas
  - Validación de datos
- **Búsqueda:** En tiempo real por nombre
- **Vistas:** Tabla (DataTable) y Cards (CardView)
- **Integración:** Vinculación automática con cotizaciones

#### Navegación
- Desde dashboard: Click en top cliente → Navega a vista filtrada
- Desde cotizaciones: Selector de cliente con búsqueda

#### Limitaciones conocidas
- No soporta múltiples contactos por compañía
- No tiene historial de interacciones
- Importación CSV no valida emails/teléfonos

---

### ✅ 3.4 Módulo Dashboard (COMPLETO)

**Ubicación:** `src/ui/dashboard.jsx`, `src/componentes/dashboard/`

#### Tab "Métricas"

**Cards Principales (StatCard.jsx):**
- 💰 **Monto Aprobado:** Total de cotizaciones aprobadas
- 📈 **Tasa de Conversión:** % de cotizaciones aprobadas
- 📅 **Cotizaciones Este Mes:** Contador mensual

**Alertas:**
- ⚠️ Cotizaciones que vencen en 48 horas
- Navegación directa a cotización urgente

**Cards Secundarios:**
- Total de cotizaciones
- Cotizaciones en negociación
- Borradores pendientes

**Top 3 Clientes:**
- Nombre del cliente
- Monto total de cotizaciones
- Número de cotizaciones
- Click → Navega a vista de cliente

**Gráficos:**
- 📊 **Tendencia (6 meses):** Gráfico de líneas con monto por mes
  - Archivo: `QuotesFunnelChart.jsx` con Recharts
- 🔄 **Distribución por Estado:** Gráfico de embudo
  - Estados: Borrador → Enviada → En negociación → Aprobada

**Tabla de Cotizaciones Recientes:**
- Últimas 10 cotizaciones
- Columnas: Número, Cliente, Monto, Estado, Fecha
- Click en row → Abrir cotización

#### Tab "Insights con IA"

**Archivo:** `InsightsPanelPro.jsx`

**Sistema de Caché Inteligente:**
- Duración: 24 horas
- Invalidación automática: Si se crea nueva cotización
- Storage: localStorage
- Indicador visual: "Generados hace 4h" (con emoji de reloj)

**Generación de Insights:**
- Botón: "Generar Insights"
- Endpoint: `/api/generate-insights` (Vercel Function)
- Modelo: GPT-4o-mini
- Análisis realizado:
  1. **Productos:** Más cotizados, conversión, bundling potencial
  2. **Clientes:** Mejor tasa, leads fríos, patrones de compra
  3. **Temporal:** Ciclo de venta promedio, estacionalidad
  4. **Precios:** Ticket promedio, descuentos efectivos
  5. **Oportunidades:** Cross-selling, productos infrautilizados

**Estructura de Insights:**
```javascript
{
  resumenEjecutivo: "Top 3 hallazgos más importantes",
  insightsDescriptivos: [
    { tipo: "producto", titulo: "...", descripcion: "..." },
    { tipo: "cliente", titulo: "...", descripcion: "..." }
  ],
  insightsPredictivos: [
    { titulo: "...", prediccion: "..." }
  ],
  recomendaciones: [
    { prioridad: "alta", titulo: "...", accion: "..." }
  ]
}
```

**Metadata retornada:**
- Modelo usado
- Tokens consumidos
- Costo aproximado (~$0.00002 por llamada)
- Duración
- Tracking en Braintrust

#### Limitaciones conocidas
- Insights limitados a datos del usuario (no hay benchmark general)
- No persiste insights en Firestore (solo localStorage)
- Requiere al menos 1 cotización para generar insights

---

### ✅ 3.5 Módulo de Configuración (COMPLETO)

**Ubicación:** `src/componentes/configuracion/`

#### Tabs Disponibles

**1. Impuestos**
- CRUD de tasas impositivas
- Campos: Nombre, Porcentaje, Aplicable a
- Estado: Activo/Inactivo
- Limitación: Actualmente solo se usa IVA 19% fijo en cotizaciones

**2. Condiciones de Pago**
- CRUD de términos de pago
- Campos: Nombre, Descripción
- Ordenamiento: Drag & drop con @dnd-kit
- Campo `orden` para persistencia
- Usado en: QuoteForm selector de condiciones

**3. Estilos de PDF**
- Módulo: `QuoteStylesModule.jsx`
- Selector visual con previews de plantillas
- 4 estilos disponibles: Light, Wave, Bubble, Striped
- Storage: `usuarios/{userId}/configuracion/global:quoteStyle`
- Aplicación: Automática en generación de PDFs

**4. Integración Wix**
- Módulo: `WixIntegrationModule.jsx`
- Botón: "Sincronizar Ahora"
- Indicador: Última sincronización (fecha + hora)
- Logs: Cantidad de productos sincronizados
- Requiere: Credenciales en Firebase Secrets

**5. Configuración de Empresa**
- Módulo: `CompanySettingsModule.jsx`
- Campos: Nombre, NIT, Dirección, Teléfono, Email, Sitio Web
- Logo: Upload a Firebase Storage (automático)
- Uso: Datos en PDFs de cotizaciones
- Storage: `usuarios/{userId}/settings/company`

#### Archivos de Implementación
- `SettingsPage.jsx` - Container principal con tabs
- `impuestos/TaxesModule.jsx`
- `condiciones/PaymentTermsModule.jsx`
- `estilos/QuoteStylesModule.jsx`
- `WixIntegrationModule.jsx`
- `CompanySettingsModule.jsx`

---

### ✅ 3.6 Módulo de Autenticación (COMPLETO)

**Ubicación:** `src/componentes/login/`, `src/context/`

#### Sistema de Auth
- **Proveedor:** Firebase Authentication
- **Método actual:** Email/Password
- **Extensible:** Google, GitHub (configuración en Firebase Console)

#### Contexto Global
- **Archivo:** `AuthContext.jsx`
- **Hook:** `useAuth.js`
- **Datos expuestos:**
  ```javascript
  const { user, loading } = useAuth();
  // user = { uid, email, displayName, ... }
  ```

#### Protección de Rutas
- **Archivo:** `App.jsx`
- **Validación:** Verifica `user` antes de renderizar componentes
- **Redirect:** Si no hay user → `<LoginPage />`

#### Multi-tenant
- **Patrón:** Cada usuario tiene datos aislados
- **Estructura:** `usuarios/{userId}/...`
- **Validación:** Todos los componentes incluyen `user.uid` en queries

#### Limitaciones conocidas
- No soporta recuperación de contraseña (UI no implementada)
- No tiene roles (Admin, Vendedor, Viewer)
- No persiste tema oscuro/claro por usuario

---

## 4. ESTRUCTURA DE DATOS (FIRESTORE)

### Arquitectura Multi-Tenant

```
Firestore Database (proyecto: app-cpq):
│
usuarios/
  └── {userId}/                           # Aislamiento por usuario
      │
      ├── contadores/
      │   └── cotizacion
      │       └── numeroActual: number    # Ej: 9 (para COT-0009)
      │
      ├── clientes/
      │   └── {clientId}
      │       ├── tipo: "persona" | "compañia"
      │       ├── nombre: string
      │       ├── email: string
      │       ├── telefono: string
      │       ├── direccion: {
      │       │   calle: string,
      │       │   ciudad: string,
      │       │   departamento: string,
      │       │   pais: string
      │       │ }
      │       ├── identificacionNumero: string  # NIT o ID
      │       ├── sitioWeb?: string             # Solo compañías
      │       ├── nombreContacto?: string       # Solo compañías
      │       ├── puestoTrabajo?: string        # Solo compañías
      │       ├── fechaCreacion: Timestamp
      │       └── fechaActualizacion: Timestamp
      │
      ├── productos/
      │   └── {productId}                       # SKU como ID
      │       ├── nombre: string
      │       ├── descripcion: string
      │       ├── sku: string
      │       ├── precioBase: number
      │       ├── precio_iva_incluido: number   # Solo Wix
      │       ├── imagen_url: string
      │       ├── inventory: number             # Solo Wix
      │       ├── categoria: string
      │       ├── exento_iva: boolean
      │       ├── lastSync?: Timestamp          # ⚠️ Marca Wix
      │       ├── fechaCreacion: Timestamp
      │       └── fechaActualizacion: Timestamp
      │
      ├── cotizaciones/
      │   └── {quoteId}
      │       ├── numero: string                # "COT-0009"
      │       ├── estado: string                # Ver estados abajo
      │       ├── clienteId: string
      │       ├── clienteNombre: string         # Desnormalizado
      │       ├── condicionesPago: string
      │       ├── vencimiento: Timestamp | null
      │       ├── subtotal: number
      │       ├── impuestos: number
      │       ├── total: number
      │       ├── lineas: [
      │       │   {
      │       │     productId: string,
      │       │     productName: string,
      │       │     quantity: number,
      │       │     price: number              # Precio unitario
      │       │   }
      │       │ ]
      │       ├── fechaCreacion: Timestamp
      │       ├── fechaActualizacion: Timestamp
      │       ├── enviadoPorEmail?: boolean
      │       ├── emailEnviadoA?: string
      │       ├── fechaEnvio?: Timestamp
      │       └── resendEmailId?: string        # ID de Resend
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
      │       └── orden: number                 # Para ordenamiento
      │
      ├── configuracion/
      │   └── global
      │       └── quoteStyle: "Light" | "Wave" | "Bubble" | "Striped"
      │
      └── settings/
          ├── company
          │   ├── nombre: string
          │   ├── nit: string
          │   ├── direccion: string
          │   ├── telefono: string
          │   ├── email: string
          │   ├── sitioWeb: string
          │   └── logoUrl: string               # Firebase Storage URL
          │
          └── wix_sync
              ├── lastSync: Timestamp
              ├── productsCount: number
              └── status: "success" | "error"
```

### Estados de Cotización

```javascript
const ESTADOS = [
  "Borrador",          // Creada pero no finalizada
  "Enviada",          // Enviada por email al cliente
  "En negociación",   // Cliente respondió, en conversación
  "Aprobada",         // Cliente aceptó
  "Rechazada",        // Cliente rechazó
  "Vencida"           // Pasó fecha de vencimiento
];
```

### Ejemplo de Documento: Cotización

```json
{
  "id": "abc123",
  "numero": "COT-0009",
  "estado": "Enviada",
  "clienteId": "cliente_xyz",
  "clienteNombre": "Jugando y Educando",
  "condicionesPago": "30 días",
  "vencimiento": Timestamp(2026-02-24),
  "subtotal": 100000,
  "impuestos": 19000,
  "total": 119000,
  "lineas": [
    {
      "productId": "SKU-001",
      "productName": "Lego Classic",
      "quantity": 2,
      "price": 50000
    }
  ],
  "fechaCreacion": Timestamp(2026-01-24),
  "fechaActualizacion": Timestamp(2026-01-24),
  "enviadoPorEmail": true,
  "emailEnviadoA": "cliente@email.com",
  "fechaEnvio": Timestamp(2026-01-24),
  "resendEmailId": "re_abc123"
}
```

---

## 5. ARCHIVOS CLAVE DEL PROYECTO

### 5.1 Frontend Core

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **App.jsx** | `src/` | Componente raíz, routing interno, Firebase init | ~200 |
| **AuthContext.jsx** | `src/context/` | Context de autenticación, provider global | ~80 |
| **firestoreUtils.js** | `src/utils/` | Utilidades Firestore, generación de números de cotización | ~150 |

### 5.2 Módulo Cotizaciones

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **QuoteForm.jsx** | `src/componentes/cotizador/` | Formulario crear/editar cotización, lógica principal | ~800 |
| **QuoteList.jsx** | `src/componentes/cotizador/` | Vista tabla de cotizaciones con DataTable | ~200 |
| **QuoteBoard.jsx** | `src/componentes/cotizador/` | Vista Kanban con drag & drop | ~250 |
| **QuotePDF.jsx** | `src/componentes/cotizador/` | Generador dinámico de PDFs, 4 estilos | ~350 |
| **SendEmailDialog.jsx** | `src/componentes/cotizador/` | Dialog para envío de email | ~150 |
| **useSendQuoteEmail.jsx** | `src/hooks/` | Hook para envío de emails (lógica reutilizable) | ~120 |

### 5.3 Módulo Productos

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **CatalogoPage.jsx** | `src/componentes/catalogo/` | Vista principal catálogo, toggle tabla/cards | ~300 |
| **ProductoForm.jsx** | `src/componentes/catalogo/` | Formulario crear/editar producto manual | ~450 |
| **ProductCard.jsx** | `src/componentes/catalogo/` | Card de producto con validación Wix | ~180 |
| **ProductDetails.jsx** | `src/componentes/catalogo/` | Sheet lateral con detalles, botones protegidos | ~150 |
| **wixService.js** | `src/services/` | Lógica de sincronización Wix, fetch paginado | ~200 |

### 5.4 Módulo Clientes

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **ClientesPage.jsx** | `src/componentes/clientes/` | Vista principal clientes | ~250 |
| **ClientForm.jsx** | `src/componentes/clientes/` | Formulario crear/editar cliente | ~400 |
| **ClientImport.jsx** | `src/componentes/clientes/` | Importación masiva CSV con papaparse | ~350 |

### 5.5 Módulo Dashboard

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **dashboard.jsx** | `src/ui/` | Container principal, tabs Métricas/Insights | ~500 |
| **InsightsPanelPro.jsx** | `src/componentes/dashboard/` | Panel de IA, caché inteligente, llamada a OpenAI | ~600 |
| **dashboardUtils.js** | `src/utils/` | Lógica de cálculo de métricas, agregaciones | ~200 |

### 5.6 Backend

| Archivo | Ubicación | Descripción | Líneas |
|---------|-----------|-------------|--------|
| **functions/index.js** | `functions/` | Cloud Functions: sendQuoteEmail, syncWixProducts, getCompanyLogo | ~800 |
| **generate-insights.js** | `api/` | Vercel Function: Generación de insights con OpenAI | ~250 |

### 5.7 Configuración

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| **package.json** | `/` | Dependencias frontend, scripts |
| **vite.config.js** | `/` | Configuración de Vite, alias @/* |
| **firebase.json** | `/` | Configuración de Firebase Functions |
| **vercel.json** | `/` | Configuración de Vercel, rewrites |
| **tailwind.config.js** | `/` | Configuración de Tailwind CSS |
| **.env.local** | `/` | Variables de entorno (gitignored) |

---

## 6. CONFIGURACIÓN Y CREDENCIALES

### 6.1 Variables de Entorno Frontend

**Archivo:** `.env.local` (gitignored)

```bash
# Firebase Configuration (VITE_ prefix para Vite)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=app-cpq.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=app-cpq
VITE_FIREBASE_STORAGE_BUCKET=app-cpq.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

**⚠️ NO incluir:**
- OpenAI API Key (solo en backend)
- Resend API Key (solo en backend)
- Wix API Key (solo en backend)

### 6.2 Firebase Secrets (Cloud Functions)

**Configuración:** Firebase Console > Functions > Secrets

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx          # API key de Resend
WIX_API_KEY=wix_api_key_here            # API key de Wix
WIX_SITE_ID=wix_site_id_here            # Site ID de la tienda Wix
```

**Acceso en código:**
```javascript
const resendApiKey = defineSecret('RESEND_API_KEY');
const wixApiKey = defineSecret('WIX_API_KEY');
const wixSiteId = defineSecret('WIX_SITE_ID');
```

### 6.3 Vercel Environment Variables

**Configuración:** Vercel Dashboard > Project > Settings > Environment Variables

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx    # API key de OpenAI
BRAINTRUST_API_KEY=sk-xxxxxxxxxxxxx     # API key de Braintrust
FIREBASE_PROJECT_ID=app-cpq             # ID del proyecto Firebase
FIREBASE_CLIENT_EMAIL=...               # Service account email
FIREBASE_PRIVATE_KEY=...                # Service account private key
```

### 6.4 Servicios Externos

#### Resend (Email)
- **Propósito:** Envío de cotizaciones por email
- **Plan:** Posiblemente Free tier
- **Dominio verificado:** `cepequ.com`
- **Email from:** `cotizaciones@cepequ.com`
- **Documentación:** https://resend.com/docs

#### OpenAI (IA)
- **Propósito:** Generación de insights
- **Modelo:** gpt-4o-mini
- **Costo aprox:** $0.00002 por llamada
- **Documentación:** https://platform.openai.com/docs

#### Braintrust (Monitoreo)
- **Propósito:** Tracking de llamadas a OpenAI
- **Integración:** `wrapOpenAI()` automático
- **Dashboard:** https://braintrust.dev
- **Datos tracked:** Prompts, respuestas, tokens, latencia

#### Wix API
- **Propósito:** Sincronización de catálogo
- **Endpoint:** `https://www.wixapis.com/stores/v1/products/query`
- **Autenticación:** API Key + Site ID
- **Documentación:** https://dev.wix.com/api/rest/wix-stores/catalog/products

---

## 7. FUNCIONALIDADES PENDIENTES

### 7.1 Features No Implementadas

- [ ] **Sistema de Roles:** Admin, Vendedor, Viewer
  - Actualmente todos los usuarios tienen permisos completos

- [ ] **Descuentos en Cotizaciones:**
  - No soporta descuentos por línea
  - No soporta descuentos globales

- [ ] **Múltiples Impuestos:**
  - Solo IVA 19% fijo
  - No permite impuestos personalizados por línea

- [ ] **Firma Electrónica:**
  - No hay captura de firma del cliente

- [ ] **Integración con Pasarelas de Pago:**
  - No permite pagos directos

- [ ] **Histórico de Cambios (Audit Log):**
  - No registra quién modificó qué

- [ ] **Notificaciones Push:**
  - No hay Firebase Cloud Messaging

- [ ] **Recuperación de Contraseña:**
  - Backend soporta, UI no implementada

- [ ] **Variantes de Productos Wix:**
  - Solo producto base, sin tallas/colores

- [ ] **Sincronización Automática Wix:**
  - Actualmente es manual
  - No hay webhooks de Wix

- [ ] **Multi-moneda:**
  - Solo COP (pesos colombianos)

- [ ] **Export de Reportes:**
  - No permite exportar a Excel/CSV

- [ ] **Templates de Cotizaciones:**
  - No hay plantillas pre-configuradas

- [ ] **Búsqueda Global:**
  - No implementa Algolia/Typesense

### 7.2 Optimizaciones Técnicas Pendientes

- [ ] **Paginación en Listas:**
  - Listas largas pueden ser lentas
  - Implementar Firestore cursors

- [ ] **Índices Compuestos Firestore:**
  - Para queries complejas

- [ ] **Service Worker:**
  - Offline-first capability

- [ ] **Migración a TypeScript:**
  - Mayor type safety

- [ ] **Tests:**
  - Unitarios (Vitest)
  - E2E (Playwright)

- [ ] **Code Splitting:**
  - Lazy loading de componentes
  - Reducir bundle size

- [ ] **Persistencia de Tema:**
  - Guardar tema oscuro/claro en Firestore por usuario

---

## 8. BUGS CONOCIDOS

### 8.1 Bugs Reportados

**Ninguno documentado actualmente** en comentarios de código.

### 8.2 Comportamientos Inesperados

1. **Overflow de nombres largos (RESUELTO):**
   - Commit: `cdad3f1 - style: corregir desbordamiento de nombre de cliente`
   - Estado: ✅ Corregido

2. **Formato de moneda en Kanban (RESUELTO):**
   - Commit: `cdad3f1 - style: corregir formato de moneda en tarjetas Kanban`
   - Estado: ✅ Corregido

3. **Edición de productos manuales (RESUELTO):**
   - Problema: Validación `!product.lastSync` demasiado restrictiva
   - Commit: `714655d - feat: habilitar edición real de productos manuales`
   - Estado: ✅ Corregido

### 8.3 Limitaciones Conocidas (No bugs)

- **Cache de Insights:** Si se modifica cotización sin crear nueva, caché no se invalida
- **Logo en PDF:** Si logo no carga, PDF falla (debería tener fallback)
- **Sincronización Wix:** Si hay >10,000 productos, puede ser lento (paginación de 100)

---

## 9. DECISIONES ARQUITECTÓNICAS IMPORTANTES

### 9.1 Frontend

**1. No usar React Router**
- **Decisión:** Routing con estado interno en `App.jsx`
- **Razón:** Manejo más simple de navegación y estado compartido entre vistas
- **Implementación:**
  ```javascript
  const [route, setRoute] = useState('dashboard');
  const handleNavigate = (newRoute, payload) => { setRoute(newRoute); };
  ```

**2. Context API en lugar de Redux**
- **Decisión:** Solo `AuthContext` para autenticación
- **Razón:** Suficiente para este scope, evita boilerplate
- **Consideración futura:** Si crece el estado global, considerar Zustand

**3. PDF generado en Browser**
- **Decisión:** `@react-pdf/renderer` en frontend
- **Razón:**
  - Reduce carga del backend
  - Permite vista previa antes de enviar
  - Generación rápida (en memoria)
- **Trade-off:** Bundle size aumenta (~200KB)

**4. Logo directo desde URL (no base64)**
- **Decisión:** URL de Wix directamente en PDF
- **Razón:** Performance (no convertir a base64)
- **Limitación:** Si Wix cambia URL, logo se rompe

### 9.2 Backend

**1. Firebase Firestore (NoSQL)**
- **Decisión:** Firestore sobre Realtime Database o SQL
- **Razón:**
  - Escalabilidad horizontal
  - Queries más poderosas que Realtime Database
  - Mejor integración con Firebase Auth
  - Offline capabilities nativas

**2. Multi-tenant con subcollections**
- **Decisión:** `usuarios/{userId}/...` en lugar de colecciones planas
- **Razón:**
  - Aislamiento automático de datos
  - Seguridad con Firestore Rules simple
  - Facilita borrado completo de usuario
- **Trade-off:** No permite queries cross-user (ej: stats globales)

**3. Cloud Functions + Vercel Functions**
- **Decisión:** Híbrido (Firebase para emails, Vercel para IA)
- **Razón:**
  - Firebase: Mejor integración con Firestore y Secrets
  - Vercel: Mejor DX para API REST, más rápido cold start
  - Separación de concerns

**4. Batches de 500 para Wix sync**
- **Decisión:** Firestore batches de 500 productos
- **Razón:** Límite de Firestore (500 writes por batch)
- **Consideración:** Si >500 productos, múltiples batches

### 9.3 Seguridad

**1. Credenciales en Firebase Secrets**
- **Decisión:** Wix y Resend API keys en Firebase Secrets (no env vars)
- **Razón:**
  - No expuestas en código
  - Encriptadas por Firebase
  - Rotación fácil

**2. Validación de Auth en todas las Functions**
- **Decisión:** `if (!request.auth) throw new Error()`
- **Razón:** Evitar acceso no autorizado
- **Implementación:** Todas las `onCall` functions validan

**3. No exponer OpenAI key en frontend**
- **Decisión:** Solo en Vercel backend
- **Razón:** Evitar uso no autorizado
- **Validación:** Token de Firebase en header

### 9.4 Integración Wix

**1. Sincronización manual (no automática)**
- **Decisión:** Usuario presiona botón para sincronizar
- **Razón:**
  - Wix no tiene webhooks confiables
  - Control del usuario sobre cuándo sincronizar
  - Reduce costos de Cloud Functions
- **Consideración futura:** Cron job diario

**2. Flag `lastSync` para identificar productos Wix**
- **Decisión:** Campo `lastSync: Timestamp` marca productos Wix
- **Razón:**
  - Simple de implementar
  - Permite queries eficientes
  - No requiere colección separada
- **Validación:** `!product.lastSync` para permitir edición

**3. 8 rutas de fallback para imágenes**
- **Decisión:** Explorar múltiples paths en objeto Wix
- **Razón:** API de Wix inconsistente, estructura varía
- **Logs:** ⚠️ si no encuentra imagen

---

## 10. DEPLOYMENT Y MANTENIMIENTO

### 10.1 Proceso de Deployment

#### Frontend (Vercel)
**Automático:**
1. Push a branch `main` en GitHub
2. Vercel detecta cambio
3. Build automático: `npm run build`
4. Deploy a producción: `https://cpq-app-vercel.vercel.app`

**Manual:**
```bash
# Desde raíz del proyecto
npm run build      # Genera /dist
vercel --prod      # Deploy manual
```

#### Backend - Cloud Functions (Firebase)
**Manual:**
```bash
# Desde /functions
npm install                          # Instalar deps
firebase deploy --only functions    # Deploy todas

# Deploy función específica
firebase deploy --only functions:sendQuoteEmail
```

**Ver logs:**
```bash
firebase functions:log                  # Todos
firebase functions:log --only syncWixProducts  # Específica
```

#### Backend - Vercel Functions
**Automático:** Mismo flow que frontend (auto-deploy con Git push)

### 10.2 Scripts Importantes

**package.json (raíz):**
```bash
npm run dev        # Servidor desarrollo (http://localhost:5173)
npm run build      # Build producción (./dist)
npm run preview    # Preview del build
```

**functions/package.json:**
```bash
npm run serve      # Emulador Firebase local
npm run deploy     # Deploy a Firebase
npm run logs       # Ver logs
```

### 10.3 Actualización de Dependencias

```bash
# Frontend
npm update                    # Actualizar todas
npm install react@latest     # Actualizar específica

# Backend
cd functions
npm update
```

**⚠️ Precaución:**
- Firebase Functions: Verificar compatibilidad Node.js (actualmente 20)
- React 19: Verificar compatibilidad con Radix UI

### 10.4 Costos Actuales (Estimados)

| Servicio | Plan | Costo Mensual Estimado |
|----------|------|------------------------|
| **Vercel** | Hobby (Free) | $0 |
| **Firebase** | Spark (Free) | $0 - $25 (según uso) |
| **Resend** | Free Tier | $0 (100 emails/día) |
| **OpenAI** | Pay-as-you-go | $1 - $5 (según insights) |
| **Braintrust** | Free Tier | $0 |
| **TOTAL** | | **$1 - $30/mes** |

**Notas:**
- Firebase cobra por reads/writes (actualmente bajo)
- OpenAI cobra ~$0.00002 por insight (~$1 por 50,000 insights)
- Resend gratis hasta 100 emails/día, 3,000/mes

### 10.5 Backup y Recuperación

**Firestore:**
- Exportar: Firebase Console > Firestore > Import/Export
- Automático: No configurado (considerar Cloud Scheduler + Cloud Storage)

**Código:**
- Git: Repositorio en GitHub
- Vercel: Guarda deployments anteriores (rollback disponible)

### 10.6 Monitoreo

**Firebase:**
- Console > Functions > Logs
- Console > Firestore > Usage

**Vercel:**
- Dashboard > Analytics
- Dashboard > Logs

**Braintrust:**
- Dashboard: Tracking de todas las llamadas a OpenAI
- Métricas: Tokens, latencia, costo

---

## 11. PRÓXIMOS PASOS SUGERIDOS

### 11.1 Mejoras de Alta Prioridad

1. **Implementar Descuentos en Cotizaciones**
   - Por línea (% o monto fijo)
   - Descuento global
   - Afecta cálculo de totales

2. **Sistema de Roles y Permisos**
   - Admin: Acceso completo
   - Vendedor: Solo cotizaciones
   - Viewer: Solo lectura
   - Implementar en `AuthContext`

3. **Recuperación de Contraseña (UI)**
   - Firebase Auth ya lo soporta
   - Agregar enlace en `LoginPage`

4. **Múltiples Impuestos Configurables**
   - Permitir selección por línea
   - Usar módulo de Impuestos existente

5. **Paginación en Listas**
   - Implementar Firestore cursors
   - Especialmente para productos Wix (>100)

### 11.2 Mejoras de Media Prioridad

6. **Sincronización Automática Wix**
   - Cloud Scheduler diario
   - O webhook si Wix lo soporta

7. **Templates de Cotizaciones**
   - Cotizaciones pre-configuradas
   - Con productos frecuentes

8. **Export de Reportes**
   - Cotizaciones a CSV/Excel
   - Dashboard metrics a PDF

9. **Histórico de Cambios**
   - Audit log de modificaciones
   - Subcollection `historial` por cotización

10. **Notificaciones Push**
    - Firebase Cloud Messaging
    - Alertas de vencimiento

### 11.3 Optimizaciones Técnicas

11. **Migración a TypeScript**
    - Empezar por `utils/` y `context/`
    - Gradual, no big bang

12. **Tests Automatizados**
    - Unitarios: Vitest para utils
    - E2E: Playwright para flows críticos

13. **Code Splitting**
    - React.lazy() para módulos grandes
    - Reducir bundle inicial

14. **Service Worker**
    - Offline-first
    - Cache de datos críticos

15. **Índices Compuestos Firestore**
    - Para queries complejas (ej: cotizaciones por cliente + estado)

### 11.4 Mejoras de UX

16. **Onboarding Guiado**
    - Tour para nuevos usuarios
    - Explicación de features principales

17. **Búsqueda Global**
    - Algolia o Typesense
    - Buscar en todos los módulos

18. **Modo Oscuro Persistente**
    - Guardar en Firestore por usuario
    - Actualmente solo en localStorage

19. **Drag & Drop de Imágenes**
    - En ProductoForm
    - Upload directo a Firebase Storage

20. **Vista Previa de PDF**
    - Modal con preview antes de enviar
    - Actualmente solo descarga

---

## 12. COMMITS RECIENTES Y TENDENCIAS

### Últimos 10 Commits

```
714655d (HEAD -> main) feat: habilitar edición real de productos manuales y
        restringir acciones en productos Wix (23 ene 2026)

cdad3f1 style: corregir desbordamiento de nombre de cliente y formato de
        moneda en tarjetas Kanban (23 ene 2026)

1c78ce9 docs: comandos para restricción total de acciones en productos Wix
        (22 ene 2026)

782466c feat: restringir edición en productos Wix y corregir visualización
        de imágenes (22 ene 2026)

9abcf21 docs: Agregar comando para restringir edición de productos Wix
        (22 ene 2026)
```

### Tendencias de Desarrollo

**Últimas 2 semanas (Ene 15-24, 2026):**
- 🔒 **Seguridad:** Protección de productos Wix (5 commits)
- 🎨 **UI:** Correcciones de overflow y formato (2 commits)
- 📝 **Documentación:** Comandos y guías (3 commits)

**Áreas de enfoque actual:**
1. Refinamiento de integración con Wix
2. Protección de datos sincronizados
3. Mejoras de UI/UX en módulos existentes

**Velocidad de desarrollo:**
- Commits frecuentes (2-3 por día)
- Desarrollo activo
- Foco en estabilidad y calidad

---

## 13. INFORMACIÓN ADICIONAL

### 13.1 Cliente: Jugando y Educando

**Tipo de negocio:** E-commerce de juguetes educativos
**Plataforma actual:** Wix
**Necesidad:** Sistema CPQ para gestionar cotizaciones B2B
**Integración:** Sincronización de catálogo desde Wix

### 13.2 Contexto de Uso

**Flujo típico del usuario:**
1. Sincronizar productos desde Wix (si hay nuevos)
2. Crear cliente (o usar existente)
3. Crear cotización:
   - Seleccionar cliente
   - Agregar productos desde catálogo
   - Configurar condiciones de pago
   - Guardar
4. Descargar PDF para revisión
5. Enviar por email al cliente
6. Mover a "En negociación" en Kanban
7. Eventual aprobación → Mover a "Aprobada"

**Usuarios típicos:**
- Vendedores (crean y gestionan cotizaciones)
- Gerentes (revisan dashboard e insights)

### 13.3 Aprendizajes del Proyecto

**Buenas decisiones:**
- Multi-tenant desde el inicio (evita refactoring)
- PDF en browser (rápido y flexible)
- Uso de Radix UI (componentes accesibles)
- Cloud Functions para lógica sensible

**Desafíos enfrentados:**
- API de Wix inconsistente (8 rutas de fallback)
- Protección de productos Wix (varios intentos)
- Overflow de nombres largos (CSS complejo)

**Lecciones:**
- Validar integraciones externas temprano
- Documentar decisiones arquitectónicas
- Git commits descriptivos son oro

---

## 14. CONTACTO Y RECURSOS

### Repositorio
**GitHub:** (URL no especificada en código, inferido como privado)

### Documentación de Tecnologías
- **React:** https://react.dev
- **Vite:** https://vite.dev
- **Firebase:** https://firebase.google.com/docs
- **Radix UI:** https://www.radix-ui.com
- **Tailwind CSS:** https://tailwindcss.com
- **Vercel:** https://vercel.com/docs
- **Wix API:** https://dev.wix.com/api/rest/wix-stores

### Comunidades
- **Firebase Discord:** https://discord.gg/BN2cgc3
- **Radix UI Discord:** https://discord.com/invite/7Xb99uG
- **React Community:** https://react.dev/community

---

## 15. APÉNDICE: ESTADÍSTICAS DEL PROYECTO

### Líneas de Código (Aproximadas)
- **Total JSX/JS:** ~10,396 líneas
- **Frontend:** ~8,500 líneas
- **Backend:** ~1,050 líneas
- **Config:** ~846 líneas

### Componentes
- **UI Components (Radix):** 40+
- **Custom Components:** 50+
- **Pages:** 5 principales

### Archivos
- **Total:** ~150 archivos
- **JSX/JS:** ~80 archivos
- **Config/JSON:** ~10 archivos

### Dependencias
- **Frontend:** 30+ packages
- **Backend:** 5 packages

---

**Documento generado por:** Claude Sonnet 4.5
**Fecha:** 24 de enero de 2026
**Versión:** 1.0.0
**Próxima revisión sugerida:** Mensual o después de features mayores

---

## 🎯 QUICK REFERENCE

**Para iniciar desarrollo:**
```bash
npm run dev                      # Frontend
cd functions && npm run serve    # Backend local
```

**Para deployment:**
```bash
git push origin main                    # Auto-deploy frontend
firebase deploy --only functions        # Deploy backend
```

**Para sincronizar Wix:**
1. Ir a Configuración > Integración Wix
2. Click "Sincronizar Ahora"
3. Esperar ~30 segundos (depende de cantidad de productos)

**Para generar insights:**
1. Dashboard > Tab "Insights con IA"
2. Click "Generar Insights"
3. Esperar ~10 segundos
4. Caché válido por 24h

---

_Este documento es el estado REAL del proyecto al 24 de enero de 2026. Actualizar después de cambios mayores._
