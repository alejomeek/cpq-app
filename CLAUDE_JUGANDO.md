# PROYECTO: CePeQu - Implementación Jugando y Educando

**ÚLTIMA ACTUALIZACIÓN: 2026-01-20 00:45**

> **📌 NOTA IMPORTANTE - ESTADO ACTUAL:**  
> COMANDO 1 está al 95% completado. Hay un error de Firestore batch limit (500 operaciones máx).  
> Ver detalles completos en: **COMANDO_1_ESTADO.md**  
>
> **REORGANIZACIÓN DE COMANDOS:**
> - El COMANDO 1B (Auto-sync) ahora es **COMANDO 7 (OPCIONAL)** para después
> - COMANDO 1 = Sincronización Manual con Cloud Functions
>
> **Próximo paso:** Aplicar fix de batches de 500 en `functions/index.js` y deploy

---

# PROYECTO: CePeQu - Implementación Jugando y Educando

**Cliente:** Didácticos Jugando y Educando SAS  
**Fecha inicio:** 2026-01-19  
**Objetivo:** Implementar CePeQu como sistema CPQ para reemplazar aplicación actual de Streamlit Cloud

---

## 1. CONTEXTO DEL PROYECTO

### 1.1 Situación Actual
- **App actual:** Streamlit Cloud + Python + Firebase + Wix API
- **Usuarios:** Tiendas en Barranquilla y Medellín
- **Productos:** ~1000 productos sincronizados desde Wix en tiempo real
- **Cotizaciones:** Históricas en Firebase (no se migrarán)
- **PDF:** Estilo profesional con logo, imágenes de productos, campo de flete

### 1.2 Objetivo de la Implementación
- Migrar a CePeQu manteniendo todas las funcionalidades actuales
- Mejorar UX con interfaz moderna React
- Mantener integración con Wix API
- Crear 2 cuentas: `barranquilla@jugandoyeducando.com` y `medellin@jugandoyeducando.com`

### 1.3 Estrategia de Migración
- **Fase 1-2 (Semanas 1-2):** Uso paralelo (pueden usar ambas apps)
- **Fase 3 (Semana 3+):** Solo CePeQu (sunset de Streamlit)

---

## 2. DECISIONES ARQUITECTÓNICAS

### 2.1 Sincronización con Wix API

**Decisión Final:** Implementación por fases (Manual primero, Auto-sync después)

#### FASE 1: Sincronización Manual ⚡ (COMANDO 1A)

**Implementación:**
- `wixService.js` en el frontend (no requiere Firebase Functions)
- Botón "Sincronizar Ahora" en Configuración
- Sincronización on-demand cuando el usuario lo presione
- Productos se guardan en Firestore para lectura rápida
- Timestamp de última sincronización visible para el usuario

**Ventajas:**
- ✅ Funciona inmediatamente, sin deploy de backend
- ✅ Más rápido de implementar y testear
- ✅ Menos riesgo, debugging más simple
- ✅ No requiere activar billing en Firebase
- ✅ Iteración rápida si hay que ajustar lógica

**Uso real esperado:**
- Usuario sincroniza 1-2 veces al día (mañana al llegar)
- Si hay cambio urgente de precio → presiona de nuevo
- Suficiente para productos educativos (precios no cambian cada hora)

#### FASE 2: Auto-Sync (COMANDO 1B - OPCIONAL, DESPUÉS)

**Implementación futura:**
- Firebase Scheduled Function ejecuta sync cada 12 horas
- Requiere activar billing en Firebase
- Deploy de Cloud Function
- Monitoreo de ejecuciones automáticas

**Cuándo implementar:** Solo si usuarios reportan que olvidar sincronizar causa problemas

**Costo FASE 2:** $0/mes (dentro del free tier de Firebase)

**Comportamiento de actualización:**
```javascript
// Productos en Firestore se actualizan con merge
{
  sku: "26921",
  nombre: "Libro Pintura Hadas",
  precio_iva_incluido: 39900,  // ← Se actualiza si cambió en Wix
  imagen_url: "https://...",
  inventory: 150,
  lastSync: "2026-01-19T10:30:00Z"
}
```

**Notas importantes:**
- Cotizaciones históricas NO se actualizan (mantienen precio al que se cotizó)
- Cotizaciones nuevas usan precio actual sincronizado
- Productos eliminados en Wix se mantienen en Firestore (no se borran)

### 2.2 Multi-tienda

**Estructura de datos:**
- **Productos:** Compartidos (NO tienen campo `tienda`)
- **Clientes:** Separados por tienda (campo `tienda`)
- **Cotizaciones:** Campo `tienda` para identificar origen

**Selector de tienda:**
- Ubicación: Header de la aplicación
- Opciones: "Barranquilla" | "Medellin"
- Persistencia: `localStorage` para recordar última tienda seleccionada
- Filtrado: Todas las queries de clientes y cotizaciones filtran por tienda actual

### 2.3 Clientes

**Decisión:** Separados por tienda (registros diferentes)

```javascript
// Firestore: usuarios/{userId}/clientes/{clientId}
{
  nombre: "Dayanna Rocio Rubiano Montaña",
  nit: "1010103543",
  direccion: "CLL 7 # 8-45 EDIFICIO PASTAS Y VINO",
  telefono: "",
  email: "",
  ciudad: "Riohacha - Guajira",
  tienda: "Barranquilla"  // ← Campo para filtrar
}
```

**Implicación:** Si el mismo cliente compra en ambas tiendas, hay que crearlo 2 veces

### 2.4 Número de Cotización

**Formato:** Auto-incremental por tienda

**Ejemplos:**
- Barranquilla: `COT-BQ-0001`, `COT-BQ-0002`, ...
- Medellín: `COT-MED-0001`, `COT-MED-0002`, ...

**Implementación:**
```javascript
// Firestore
usuarios/{userId}/contadores/
├── cotizacion_barranquilla → { count: 47 }
└── cotizacion_medellin → { count: 23 }

// Función
async function getNextQuoteNumber(userId, tienda) {
  const counterRef = db.doc(`usuarios/${userId}/contadores/cotizacion_${tienda.toLowerCase()}`);
  
  return await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const newCount = (counterDoc.data()?.count || 0) + 1;
    
    transaction.set(counterRef, { count: newCount });
    
    const prefix = tienda === "Barranquilla" ? "BQ" : "MED";
    return `COT-${prefix}-${String(newCount).padStart(4, '0')}`;
  });
}
```

### 2.5 Estados de Cotización

**Estados (sin emojis):**
- `Creada` (azul)
- `Enviada` (morado)
- `Aprobada` (verde)
- `Rechazada` (rojo)
- `Facturada` (gris)

**Colores en QuoteCard:**
```javascript
const getStatusColor = (estado) => {
  switch(estado) {
    case 'Creada': return 'bg-blue-100 text-blue-800';
    case 'Enviada': return 'bg-purple-100 text-purple-800';
    case 'Aprobada': return 'bg-green-100 text-green-800';
    case 'Rechazada': return 'bg-red-100 text-red-800';
    case 'Facturada': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

### 2.6 Términos y Condiciones

**Ubicación:** `usuarios/{userId}/settings/terminos_condiciones`

```javascript
{
  Barranquilla: "Forma de pago: Transferencia o consignación...",
  Medellin: "Forma de pago: Efectivo contra entrega..."
}
```

**Comportamiento:** Se muestran automáticamente en PDF según la tienda de la cotización

### 2.7 Vigencia de Cotización

**Default:** "5 DÍAS HÁBILES" (editable por cotización)

```javascript
// Firestore: usuarios/{userId}/settings/quote_defaults
{
  vigencia: "5 DÍAS HÁBILES"
}

// QuoteForm pre-llena con este valor pero usuario puede editarlo
```

### 2.8 Campo Flete

**Tipos:**
- `manual`: Usuario ingresa valor numérico
- `incluido`: Flete incluido en precio (valor = 0)

**Estructura en cotización:**
```javascript
{
  // ... otros campos
  fleteType: "manual",  // o "incluido"
  fleteValue: 13200,    // 0 si es incluido
  subtotal: 798000,
  total: 811200         // subtotal + fleteValue
}
```

**Visualización en PDF:**
```
SUBTOTAL        $798.000
FLETE           $13.200   (o "INCLUIDO")
TOTAL           $811.200
```

### 2.9 Logo y Configuración de Empresa

**Estructura:**
```javascript
// Firestore: usuarios/{userId}/settings/company
{
  company_name: "DIDACTICOS JUGANDO Y EDUCANDO SAS",
  nit: "901144615-6",
  address: "Avenida 19 # 114A - 22, Bogota",
  phone: "3153357921",
  email: "jugandoyeducando@hotmail.com",
  logo_url: "https://firebasestorage.googleapis.com/.../logo.png"
}
```

**Upload de logo:**
- Usuario sube desde Configuración
- Se guarda en Firebase Storage: `logos/{userId}/logo.png`
- URL se guarda en Firestore
- PDF consume `logo_url`

### 2.10 Estilo de PDF "Jugando"

**📄 PDF de Referencia:** `Cotizacion_NUEVA_Dayanna_Rocio_Rubiano_Montaña.pdf`

**Objetivo:** Replicar diseño exacto del PDF de Streamlit

**Especificaciones Visuales Detalladas:**

#### Header (Sección Superior)
- **Logo:** Lado izquierdo, tamaño grande (~120px altura)
- **Info empresa:** Lado derecho, texto alineado a la derecha
  - Nombre: "DIDACTICOS JUGANDO Y EDUCANDO SAS" (negrita, ~12pt)
  - NIT: "901144615-6"
  - Dirección: "Avenida 19 # 114A - 22, Bogota"
  - Teléfono: "3153357921"
  - Email: "jugandoyeducando@hotmail.com"

#### Título y Metadatos
- **"COTIZACIÓN":** Azul grande (#044C7D, ~24pt, negrita)
- **Número:** COT-BQ-XXXX debajo del título
- **Fecha y Vigencia:** En líneas separadas

#### Información del Cliente
- **Sección con header:** "Información del Cliente" (fondo gris claro)
- **Campos:**
  - Nombre del cliente
  - NIT
  - Dirección
  - Ciudad
  - Teléfono (si existe)

#### Tabla de Productos
- **Header:** Fondo azul oscuro (#044C7D), texto blanco, negrita
- **Columnas:**
  1. Imagen (70px × 70px)
  2. Descripción
  3. Cantidad
  4. Precio Unitario (con IVA incluido)
  5. Total
- **Bordes:** Grises claros (#CCCCCC)
- **Filas alternas:** Opcional, fondo blanco/gris muy claro

#### Sección de Totales
- **Alineación:** Derecha
- **Sin recuadro:** Solo texto y valores
- **Formato:**
  ```
  SUBTOTAL          $XXX.XXX
  FLETE             $XX.XXX  (o "INCLUIDO")
  ───────────────────────────
  TOTAL             $XXX.XXX
  ```

#### Footer
- **Términos y Condiciones:** Sección final
  - Header: "Términos y Condiciones" (negrita)
  - Texto: Según tienda (Barranquilla o Medellín)
- **Vigencia:** Texto centrado o en footer: "Vigencia: 5 DÍAS HÁBILES"

#### Colores de Marca
- **Azul principal:** #044C7D
- **Gris bordes:** #CCCCCC
- **Gris claro fondo:** #F5F5F5
- **Texto:** Negro (#000000)

**Archivo:** `src/componentes/configuracion/estilos/pdf/QuotePDF Jugando.jsx`

---

## 3. CREDENCIALES Y CONFIGURACIÓN

### 3.1 Firebase (Ya configurado en CePeQu)
```
Project ID: app-cpq
Service Account: firebase-adminsdk-xxxxx@app-cpq.iam.gserviceaccount.com
```

**Nota:** Este es el proyecto Firebase de CePeQu (nuevo). El proyecto `cotizaciones-app-f7a00` es del sistema antiguo de Streamlit Cloud.

### 3.2 Wix API
```javascript
// Variables de entorno (Vercel)
VITE_WIX_API_KEY=IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0...
VITE_WIX_SITE_ID=a290c1b4-e593-4126-ae4e-675bd07c1a42

// Endpoint
POST https://www.wixapis.com/stores/v1/products/query
Headers:
  Authorization: {VITE_WIX_API_KEY}
  wix-site-id: {VITE_WIX_SITE_ID}
  Content-Type: application/json
```

### 3.3 Cuentas de Usuario
- `barranquilla@jugandoyeducando.com` (password: se genera al crear)
- `medellin@jugandoyeducando.com` (password: se genera al crear)

---

## 4. COMANDOS DE IMPLEMENTACIÓN

### COMANDO 1A: Sincronización Manual con Wix API ⚡

**Objetivo:** Crear servicio de sincronización manual usando Vercel Edge Function como proxy

⚠️ **NOTA IMPORTANTE:** Wix API **bloquea peticiones directas desde navegadores** por CORS policy. 
Necesitamos un backend proxy. Usamos Vercel Edge Functions (complejidad baja, deploy con git push).

---

#### 🏗️ Arquitectura de la Solución

```
Frontend (React)
    ↓
Vercel Edge Function (/api/sync-wix)
    ↓
Wix API
    ↓
Firebase Firestore
```

---

#### 📁 **Archivos a crear:**

**1. `api/sync-wix.js`** - Vercel Edge Function (Backend Proxy)

```javascript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Inicializar Firebase Admin (solo una vez)
let adminApp;
try {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
} catch (error) {
  // Ya inicializado
}

const db = getFirestore();

async function fetchAllWixProducts(apiKey, siteId) {
  let allProducts = [];
  let cursor = null;
  
  do {
    const body = {
      query: {
        paging: { 
          limit: 100,
          ...(cursor && { cursor })
        }
      }
    };
    
    const response = await fetch('https://www.wixapis.com/stores/v1/products/query', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'wix-site-id': siteId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Wix API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const formattedProducts = data.products.map(p => ({
      sku: p.sku,
      nombre: p.name,
      descripcion: p.description || '',
      precio_iva_incluido: p.priceData?.price || 0,
      precioBase: p.priceData?.price || 0,
      imagen_url: p.media?.mainMedia?.image?.url || '',
      inventory: p.stock?.quantity || 0,
      categoria: p.productType || 'General'
    }));
    
    allProducts = [...allProducts, ...formattedProducts];
    cursor = data.metadata?.cursors?.next;
    
  } while (cursor);
  
  return allProducts;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { apiKey, siteId, userId } = req.body;
    
    if (!apiKey || !siteId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Obtener todos los productos con paginación
    const products = await fetchAllWixProducts(apiKey, siteId);
    
    // Guardar en Firestore
    const batch = db.batch();
    const productsRef = db.collection(`usuarios/${userId}/productos`);
    
    products.forEach(product => {
      const docRef = productsRef.doc(product.sku);
      batch.set(docRef, {
        ...product,
        lastSync: Timestamp.now(),
        fechaActualizacion: Timestamp.now()
      }, { merge: true });
    });
    
    // Guardar timestamp de sincronización
    const syncRef = db.doc(`usuarios/${userId}/settings/wix_sync`);
    batch.set(syncRef, {
      lastSync: Timestamp.now(),
      productsCount: products.length
    });
    
    await batch.commit();
    
    return res.status(200).json({ 
      success: true, 
      count: products.length,
      products 
    });
    
  } catch (error) {
    console.error('Error in sync-wix:', error);
    return res.status(500).json({ 
      error: 'Sync failed', 
      message: error.message 
    });
  }
}
```

**2. Actualizar `src/services/wixService.js`** - Llamar a Edge Function

```javascript
export async function syncWixToFirestore(db, userId, apiKey, siteId) {
  try {
    // Llamar a Vercel Edge Function en lugar de Wix directamente
    const response = await fetch('/api/sync-wix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, siteId, userId })
    });
    
    if (!response.ok) {
      throw new Error('Sync failed');
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Error syncing Wix:', error);
    throw error;
  }
}
```

**3. `vercel.json`** - Configuración de Vercel

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  }
}
```

**4. `.env` y `.env.local`** - Variables de entorno para Edge Function

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=app-cpq
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@app-cpq.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**5. Actualizar `WixIntegrationModule.jsx`** - Ya está implementado correctamente

---

#### 🧪 **Testing Local**

**Paso 1: Instalar Vercel CLI**
```bash
npm install -g vercel
```

**Paso 2: Crear `.env.local` con credenciales Firebase Admin**
```bash
# Obtener del Firebase Console → Project Settings → Service Accounts
FIREBASE_PROJECT_ID=app-cpq
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."
```

**Paso 3: Correr Vercel Dev**
```bash
vercel dev
```

**Paso 4: Probar Sincronización**
1. Ir a Configuración → Integración Wix
2. Pegar credenciales Wix
3. Presionar "Sincronizar Ahora"
4. Verificar: "✅ ~1000 productos sincronizados"

---

#### 📊 **Resultado Esperado**

- ✅ Edge Function maneja CORS correctamente
- ✅ Sincroniza TODOS los ~1000 productos (paginación automática)
- ✅ Guarda en Firestore con `merge: true`
- ✅ Sincronización en ~20-40 segundos
- ✅ Frontend recibe confirmación con número exacto de productos

---

#### 📦 **Dependencias Adicionales**

```bash
# Instalar Firebase Admin SDK (para Vercel Edge Function)
npm install firebase-admin
```

**Nota:** El Edge Function usa `firebase-admin` (backend SDK), mientras que el frontend usa `firebase` (client SDK).

---

### COMANDO 1B: Auto-Sync (OPCIONAL - IMPLEMENTAR DESPUÉS)

**Estado:** ⏸️ **NO IMPLEMENTAR AHORA**

**Cuándo implementar:**
- Solo si usuarios reportan problemas por olvidar sincronizar
- Una vez que COMANDO 1A funciona perfectamente
- Cuando tengas tiempo para setup de Firebase Functions

**Qué haría:**
- Firebase Scheduled Function ejecuta `syncWixToFirestore()` cada 12 horas
- Requiere activar Blaze Plan (billing) en Firebase
- Deploy de función con Firebase CLI

**Por ahora:** Usar solo sincronización manual es suficiente ✅

---

### COMANDO 2: Configuración de Empresa y Logo

**Objetivo:** Crear módulo para configurar datos de la empresa y subir logo

**Testing:**
1. Ir a Configuración
2. Llenar datos de empresa
3. Subir logo (PNG recomendado)
4. Guardar
5. Verificar que logo se sube a Storage

---

### COMANDO 3: Campo Flete y Multi-tienda en Cotizaciones

**Objetivo:** Agregar campo flete, selector de tienda y número auto-incremental

**Testing:**
1. Crear nueva cotización
2. Seleccionar tienda
3. Configurar flete
4. Verificar número COT-BQ-0001
5. Verificar totales

---

### COMANDO 4: Estados Personalizados

**Objetivo:** Actualizar estados de cotización

**Estados:** Creada, Enviada, Aprobada, Rechazada, Facturada

---

### COMANDO 5: Términos y Condiciones + Vigencia

**Objetivo:** Configurar términos por tienda y vigencia default

**Testing:**
1. Configurar términos para ambas tiendas
2. Configurar vigencia
3. Verificar que aparecen en PDF

---

### COMANDO 6: Estilo PDF "Jugando"

**Objetivo:** Crear nuevo estilo de PDF que replique el diseño de Streamlit

**Testing:**
1. Crear cotización completa
2. Seleccionar estilo "Jugando"
3. Generar PDF
4. Verificar diseño idéntico al de Streamlit

---

## 5. ORDEN DE EJECUCIÓN

**Ejecutar en este orden:**

1. ✅ **COMANDO 1A** - Wix API Manual (crítico para productos) - 30-45 min
2. ✅ **COMANDO 2** - Logo y configuración empresa - 30 min
3. ✅ **COMANDO 3** - Flete y multi-tienda - 45 min
4. ✅ **COMANDO 4** - Estados personalizados - 20 min
5. ✅ **COMANDO 5** - Términos y vigencia - 30 min
6. ✅ **COMANDO 6** - Estilo PDF Jugando - 60 min
7. ⏸️ **COMANDO 1B** - Auto-Sync (OPCIONAL, después)

**Tiempo estimado FASE 1:** 3-4 horas

**Ventaja del nuevo enfoque:**
- Eliminamos dependencia de Firebase Functions deployment
- Testing inmediato de cada comando
- Menor riesgo de bloqueo técnico

---

## 6. POST-IMPLEMENTACIÓN

### 6.1 Crear Cuentas de Usuario
1. Crear usuario: barranquilla@jugandoyeducando.com
2. Crear usuario: medellin@jugandoyeducando.com
3. Enviar emails de recuperación de contraseña

### 6.2 Configuración Inicial
Para cada cuenta:
1. Configurar Wix API
2. Sincronizar productos
3. Subir logo
4. Configurar datos de empresa
5. Configurar términos
6. Seleccionar estilo PDF "Jugando"

### 6.3 Capacitación
- Video tutorial de 5 minutos
- Documento PDF con screenshots
- Sesión en vivo con usuarios

---

## 7. MANTENIMIENTO

### Costos mensuales esperados
- **Total: $0/mes** (dentro de free tier de Firebase)

### Monitoreo
- Verificar logs de sync automático cada semana
- Revisar métricas de uso en Firebase Console

---

---

## 8. NOTAS IMPORTANTES

### Estrategia de Implementación
- ⭐ **IMPORTANTE:** Empezamos con sincronización MANUAL únicamente (COMANDO 1A)
- ⭐ Auto-sync (COMANDO 1B) es OPCIONAL y se implementa después si es necesario
- ⭐ Razón: Menor complejidad, testing más rápido, sin dependencias de Firebase Functions

### Datos y Sincronización
- ⚠️ Los productos se sincronizan manualmente (botón "Sincronizar Ahora")
- ⚠️ Las cotizaciones históricas NO se actualizan si cambió el precio en Wix
- ⚠️ Los clientes son separados por tienda
- ⚠️ El logo debe ser PNG con fondo transparente
- ⚠️ Los términos se muestran automáticamente según la tienda

---

## 9. ANEXOS

### 9.1 PDF de Referencia para Estilo "Jugando"

**Archivo:** `Cotizacion_NUEVA_Dayanna_Rocio_Rubiano_Montaña.pdf`

**Instrucciones para Claude Code:**
1. **ANTES de implementar el COMANDO 6**, analiza cuidadosamente este PDF
2. El diseño debe ser **idéntico** al PDF de referencia, no una interpretación
3. Presta especial atención a:
   - Espaciado entre secciones
   - Tamaños de fuente exactos
   - Colores exactos (#044C7D)
   - Alineaciones de texto
   - Formato de números con separadores de miles ($XXX.XXX)
4. Las imágenes de productos deben mostrar la URL real del producto desde Wix
5. Si falta un campo (ej: teléfono del cliente), **no** mostrar la línea vacía

**Datos de ejemplo en el PDF:**
- Cliente: Dayanna Rocio Rubiano Montaña
- Ciudad: Riohacha - Guajira
- Tienda: Barranquilla
- Flete: Manual con valor específico

---

**Documento generado:** 2026-01-19  
**Última actualización:** 2026-01-19 23:15  
**Autor:** Claude (Sonnet 4.5) bajo dirección de Alejo
