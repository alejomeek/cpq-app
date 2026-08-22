# Plan de migración del catálogo CPQ a Supabase

## Propósito

Este documento es la guía de trabajo y traspaso para sustituir el catálogo de
productos que hoy usa CPQ en Firebase por el catálogo existente en Supabase.
Debe leerse antes de cambiar catálogo, cotizador, PDF, correo o los endpoints
de catálogo. Actualizar el estado de las fases y las decisiones si el alcance
cambia.

## Contexto y fuentes de referencia

El catálogo pertenece al proyecto OMS y su trabajo de sincronización está en:

- Worktree: `/Users/alejomeek/Documents/oms-jugando-educando-n8n`
- Rama: `codex/n8n-catalog-sync`
- Commit de referencia al iniciar este plan: `d6b7e81` (`docs: add catalog integration handoff`)
- Handoff: `docs/catalog-supabase-integration-handoff.md`
- Operación de sync: `docs/n8n-catalog-sync-plan.md`
- Esquema: `supabase/migrations/20260814021500_shopify_catalog.sql`

El directorio original del OMS (`/Users/alejomeek/Documents/oms-jugando-educando`)
estaba en la rama `codex/flex-delivery-validation-oms`, commit `a827b82`, con
cambios locales de usuario. No es base de este trabajo y no se debe modificar.

## Decisiones ya aprobadas

1. **Shopify es la única fuente de verdad**. Supabase es su réplica de lectura
   para CPQ.
2. CPQ tiene dos fuentes de catálogo explícitas:
   - **Shopify**: productos sincronizados en Supabase, de sólo lectura.
   - **Manual**: productos privados creados por el usuario en
     `usuarios/{uid}/productos` de Firebase.
3. CPQ no crea, actualiza, borra ni corrige `catalog_products`, sus relaciones,
   el watermark ni la sincronización. Toda corrección de catálogo ocurre en
   Shopify y llega por la sincronización existente.
4. El corte inicial no depende de reconciliación. Posteriormente se aprobó una
   **limpieza única y controlada**: se auditan productos manuales Firebase con
   SKU normalizado exacto contra filas activas de Supabase y sólo se borran de
   Firebase después de revisar el reporte mínimo y confirmar el borrado. No se
   guarda backup de datos completos. No hay migración, escritura ni modificación
   alguna en Supabase.
5. Los productos manuales Firebase continúan siendo operativos. No se migran,
   duplican ni sincronizan hacia Supabase bajo ninguna circunstancia.
6. Cada línea de cotización debe conservar su instantánea histórica. Un cambio
   posterior en Shopify o Supabase no puede modificar una cotización, PDF o
   correo ya emitido.
7. No se diseñará reserva de inventario en este alcance. La disponibilidad es
   informativa y se rige explícitamente por `inventory_tracked` e
   `inventory_policy`; `inventory_quantity = 0` no implica automáticamente que
   el artículo no sea cotizable.

## Restricciones importantes del catálogo

- Una fila de `public.catalog_products` representa una variante/SKU vendible.
- La llave comercial de integración es `sku`; la llave técnica opcional es
  `catalog_products.id`.
- Toda consulta de nuevos productos debe incluir `deleted_at IS NULL`.
- El sincronizador excluye productos Shopify sin SKU o con SKU duplicado. CPQ
  no debe inventar SKU ni crear filas manuales para sortear esa exclusión.
- La moneda debe definirse explícitamente en CPQ. Los precios de Supabase son
  numéricos y no incluyen formato monetario.
- Un SKU manual puede coincidir con un SKU Shopify: el origen y el ID de la
  fuente, no el SKU aislado, identifican una línea de cotización.

## Arquitectura objetivo

```text
Usuario CPQ
  -> Firebase Auth
  -> frontend React
  -> Productos Shopify: API Vercel (GET, token Firebase)
      -> Supabase con credencial server-side y solo SELECT
      -> catalog_products + product_images
  -> Productos manuales: Firestore por usuario
      -> usuarios/{uid}/productos

Shopify -> sincronización n8n/OMS -> Supabase
```

El frontend no recibirá una `service_role` ni escribirá directamente en
Supabase. Como el esquema concede lectura a `authenticated` de Supabase y CPQ
usa Firebase Auth, el backend debe validar el ID token de Firebase antes de
consultar Supabase. El endpoint se limitará a lectura y a columnas necesarias
para CPQ. Las operaciones manuales de Firebase nunca llaman a ese endpoint.

## Contrato de datos para las líneas de cotización

Las líneas nuevas deben conservar los nombres de compatibilidad actuales
(`productId`, `productName`, `quantity`, `price`) y además guardar la fuente y
la instantánea suficientes para que no se requiera consultar el catálogo vivo:

```js
{
  // Referencia a la fuente, sólo para trazabilidad.
  source: "shopify" | "manual",
  catalogProductId: "uuid de catalog_products o null",
  manualProductId: "id Firebase o null",
  productId: "id de la fuente", // compatibilidad con lectores existentes
  sku: "SKU comercial",

  // Instantánea comercial.
  productName: "Título cotizado",
  quantity: 1,
  price: 12345.67,          // precio unitario antes de IVA y descuento global
  unitPriceIncludingTax: 14691.15, // precio Shopify publicado; sólo Shopify gravable
  catalogPriceIncludesTax: true,
  taxable: true,
  taxRate: 0.19,
  imageUrl: "https://...", // primera imagen disponible; puede ser null
  productSnapshotAt: "ISO timestamp",

  // El descuento global vigente sigue en quote.discount. Si se habilitan
  // descuentos por línea, se guarda el porcentaje o monto en esta línea.
}
```

Al guardar una cotización se persistirá la instantánea, no sólo el identificador.
PDF, descarga y envío de correo calcularán imágenes e impuestos a partir de la
línea almacenada. Para cotizaciones antiguas sin estos campos se mantendrán los
valores guardados de la cotización y se usará un fallback visual seguro; nunca
se sustituirá precio o impuesto histórico con el producto actual de Supabase.

Para Shopify, `catalog_products.price` es el precio publicado con IVA incluido
en productos gravables. Al crear una línea nueva CPQ lo conserva en
`unitPriceIncludingTax`, calcula `price` como base antes de IVA y deja el total
de la línea igual al precio publicado. Esta conversión se aplica sólo a nuevas
líneas Shopify; no se reescriben cotizaciones ya guardadas.

## Plan de ejecución

### Fase 0 — Preparación y seguridad

- [x] Verificar que la integración use exclusivamente el worktree
  `oms-jugando-educando-n8n` como referencia; no modificar el OMS original.
- [ ] Añadir al entorno local de CPQ sólo los nombres de variables necesarios:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y las credenciales server-side
  existentes de Firebase Admin. No copiar secretos desde OMS ni versionarlos.
- [ ] Configurar las mismas variables, por entorno, en Vercel.
- [x] Añadir `@supabase/supabase-js` al proyecto CPQ.

### Fase 1 — API de catálogo de solo lectura

- [x] Crear un endpoint Vercel autenticado con Firebase Admin.
- [x] Rechazar peticiones sin un ID token Firebase válido.
- [x] Implementar exclusivamente `GET`; no exponer `POST`, `PATCH`, `PUT` ni
  `DELETE` para el catálogo.
- [x] Consultar campos explícitos de `catalog_products` y la primera imagen de
  `product_images`; filtrar siempre `deleted_at IS NULL`.
- [x] Implementar búsqueda, paginación y límites controlados en servidor para
  no descargar todo el catálogo en el navegador.
- [x] Devolver un DTO CPQ estable: ID, SKU, título, descripción, precio,
  `taxable`, disponibilidad, clasificación e imagen principal.
- [ ] Probar contra Supabase respuestas de búsqueda, producto sin imagen y
  catálogo vacío. La respuesta 401 y el rechazo de métodos distintos de GET se
  probaron localmente; falta configurar las variables server-side.

### Fase 2 — Cliente de catálogo en CPQ

- [x] Crear un cliente/hook que obtenga el token Firebase actual y llame al
  endpoint de Fase 1.
- [x] Añadir estados de carga, error y reintento; no hacer fallback silencioso
  al catálogo Firebase.
- [x] Transformar el DTO del API a la estructura de instantánea de una línea.
- [x] Definir claramente la moneda visible y el formato de precios COP.

### Fase 3 — Reemplazo completo de la interfaz de catálogo

- [x] Cambiar la página **Catálogo** a un explorador de Supabase de sólo
  lectura: búsqueda, filtros y detalle del producto.
- [x] Añadir un filtro/sección clara para **Shopify sincronizado** y otra para
  **Productos manuales**.
- [x] Mantener las acciones crear, editar, duplicar y borrar únicamente para
  productos manuales Firebase; nunca ofrecerlas para Shopify.
- [x] No borrar ni mover documentos Firebase existentes durante esta fase.

### Fase 4 — Cotizador y persistencia de instantáneas

- [x] Buscar Shopify mediante el cliente Supabase y productos manuales mediante
  Firestore; mostrar el origen de cada resultado.
- [x] Crear líneas con la instantánea completa y con `source`,
  `catalogProductId` o `manualProductId` según corresponda.
- [x] Calcular IVA desde `line.taxable` y `line.taxRate`, no desde una búsqueda
  de producto actual.
- [x] Mantener descuento global, flete, estados, numeración y clientes sin
  cambios funcionales.
- [x] Asegurar que editar una cotización existente no reemplace sus datos
  históricos con el precio, título o impuesto actual del catálogo.

### Fase 5 — PDF, descarga y correo

- [x] Actualizar los cuatro estilos PDF para tomar nombre, imagen e impuesto
  de la instantánea de la línea.
- [x] Eliminar la necesidad de cargar productos Firebase antes de descargar o
  enviar una cotización.
- [x] Simplificar el procesamiento de imágenes para usar `imageUrl` de la
  instantánea; mantener placeholders para líneas antiguas o imágenes fallidas.
- [ ] Verificar que el email adjunto y la descarga muestren los mismos totales
  y datos de la cotización guardada.

### Fase 6 — Validación y corte

- [ ] Validar una cotización nueva con catálogo Supabase, múltiples líneas,
  artículo gravable y exento, descuento y flete.
- [ ] Validar PDF y envío por correo de una cotización nueva.
- [ ] Validar una cotización histórica sin consultar catálogo Firebase ni
  sobrescribir su información.
- [x] Ejecutar `npm run build` y corregir errores nuevos del alcance.
- [x] Revisar que las únicas lecturas/escrituras activas a
  `usuarios/{uid}/productos` correspondan al catálogo manual y que no exista
  ninguna escritura a Supabase.
- [ ] Actualizar este documento con el commit, fecha de corte y cualquier
  excepción conocida.

### Fase 7 — Limpieza puntual de duplicados manuales

- [x] Crear un script local de auditoría que compare SKU exacto y no escriba
  en ninguna fuente.
- [x] Ejecutar la auditoría para el usuario CPQ objetivo y revisar los
  candidatos, productos sin SKU y posibles excepciones.
- [x] Borrar por lotes sólo los documentos candidatos confirmados, con una
  segunda orden explícita y un recibo local de borrado.
- [ ] Verificar en la interfaz que el catálogo manual disminuyó y que las
  cotizaciones históricas siguen intactas.

## Fuera de alcance

- Modificar Shopify, Supabase `catalog_products`, imágenes, categorías,
  watermark, servicio `oms-catalog-sync`, n8n o webhooks.
- Importar, migrar o sincronizar productos Firebase hacia Supabase.
- Cualquier borrado adicional de productos Firebase manuales fuera de la
  limpieza puntual, auditada y confirmada de la Fase 7.
- Reservar inventario, descontar stock o implementar listas de precio por
  cliente.
- Cambiar las cotizaciones antiguas para igualarlas al catálogo actual.

## Criterios de finalización

La migración está terminada sólo cuando:

1. La interfaz de catálogo diferencia Shopify (Supabase) de productos manuales
   (Firebase), y cada fuente tiene sólo las acciones permitidas.
2. No existe una ruta de producción que cree o actualice productos Shopify en
   Firebase o Supabase desde CPQ, ni una ruta que migre productos manuales a
   Supabase.
3. Las líneas nuevas tienen la instantánea completa y PDF/correo no requieren
   consultar el catálogo vivo para reproducirlas.
4. Las cotizaciones históricas siguen siendo visibles y sus totales no cambian.
5. La aplicación compila y la configuración de producción mantiene las claves
   de Supabase exclusivamente en el servidor.

## Estado actual

- Fecha: 2026-08-22.
- Fase activa: **validación funcional final en producción**.
- Decisión confirmada: no hubo reconciliación como condición de corte. La
  limpieza posterior aprobada elimina sólo duplicados exactos de Firebase; los
  manuales restantes continúan exclusivamente en Firebase.
- Implementación local: `api/catalog-products.js` expone sólo lectura de
  Shopify/Supabase; la página Catálogo conserva una pestaña independiente para
  productos manuales Firebase; el selector de cotización combina ambas fuentes
  y persiste el origen y la instantánea de cada línea. No existe código CPQ que
  migre ni escriba productos manuales en Supabase.
- Validación local: `npm run build` y `vercel build --yes` completaron
  correctamente. Una prueba aislada del endpoint confirmó `405` para POST y
  `401` sin token; otra confirmó instantáneas correctas y separadas para una
  línea Shopify y una manual. `vercel dev` también enruta correctamente la API
  local desde que el script `dev` respeta el puerto asignado por Vercel. La
  prueba completa con un usuario Firebase autenticado sigue pendiente.
- Producción: las credenciales server-side se configuraron de forma segura en
  Vercel y el commit `dcf3299` se desplegó desde `main`. La interfaz confirmó
  la carga autenticada del catálogo Shopify desde Supabase.
- Limpieza ejecutada el 2026-08-22 para el usuario CPQ objetivo: se eliminaron
  8.734 documentos manuales que coincidían por SKU exacto con Supabase activo.
  La auditoría posterior confirmó 99 productos manuales restantes: 96 con SKU
  no disponible en Supabase y 3 sin SKU. No hubo omisiones, escritura en
  Supabase ni respaldo de datos completos.
