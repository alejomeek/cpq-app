const { onCall, onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();

// Definir parámetros (Cloud Functions v2)
const resendApiKey = defineString('RESEND_API_KEY');
const fromEmail = defineString('FROM_EMAIL', { default: 'cotizaciones@cepequ.com' });

// Definir secrets de Wix
const wixApiKey = defineSecret('WIX_API_KEY');
const wixSiteId = defineSecret('WIX_SITE_ID');
const fromName = defineString('FROM_NAME', { default: 'Cepequ CPQ' });

/**
 * Cloud Function para enviar cotizaciones por email usando Resend
 */
exports.sendQuoteEmail = onCall(async (request) => {
  console.log('📧 Iniciando envío de email con Resend...');

  // 1. Validar autenticación
  if (!request.auth) {
    console.error('❌ Usuario no autenticado');
    throw new Error('Usuario no autenticado');
  }

  console.log(`✅ Usuario autenticado: ${request.auth.uid}`);

  // 2. Obtener datos
  const {
    quoteId,
    quoteNumber,
    clientEmail,
    clientName,
    userEmail,
    userName,
    total,
    vencimiento,
    pdfBase64
  } = request.data;

  // 3. Validar datos requeridos
  if (!quoteId) {
    throw new Error('quoteId es requerido');
  }
  if (!clientEmail) {
    throw new Error('clientEmail es requerido');
  }
  if (!pdfBase64) {
    throw new Error('pdfBase64 es requerido');
  }

  console.log(`📋 Datos recibidos:`, {
    quoteId,
    quoteNumber,
    clientEmail,
    clientName,
    userEmail,
    pdfSize: `${(pdfBase64.length / 1024).toFixed(2)} KB`
  });

  // 4. Configurar Resend
  const resend = new Resend(resendApiKey.value());
  console.log('✅ Resend configurado correctamente');

  try {
    // 5. Formatear fechas
    const fechaVencimiento = vencimiento
      ? new Date(vencimiento).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      : 'No especificado';

    const fechaActual = new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const totalFormateado = parseFloat(total || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // 6. Convertir base64 a Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // 7. Preparar el email
    const emailData = {
      from: `${fromName.value()} <${fromEmail.value()}>`,
      to: [clientEmail],
      reply_to: userEmail || fromEmail.value(),
      subject: `Cotización ${quoteNumber} - ${clientName}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content { 
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .quote-info { 
      background: #f8f9fa; 
      padding: 25px; 
      border-left: 4px solid #667eea; 
      margin: 25px 0;
      border-radius: 4px;
    }
    .quote-info p { 
      margin: 12px 0;
      font-size: 15px;
    }
    .quote-info strong { 
      color: #667eea;
      font-weight: 600;
      display: inline-block;
      min-width: 140px;
    }
    .quote-total {
      font-size: 20px;
      padding: 15px;
      background: #667eea;
      color: white;
      border-radius: 4px;
      margin-top: 10px;
      text-align: center;
      font-weight: 600;
    }
    .footer { 
      text-align: center; 
      padding: 30px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      color: #666; 
      font-size: 14px;
    }
    .attachment-notice {
      background: #e7f3ff;
      border: 1px solid #b3d9ff;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      text-align: center;
      color: #0066cc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Cotización ${quoteNumber}</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Estimado <strong>${clientName}</strong>,</p>
      <p>Adjunto encontrará la cotización solicitada con todos los detalles:</p>
      
      <div class="quote-info">
        <p><strong>Cotización #:</strong> ${quoteNumber}</p>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Fecha de Emisión:</strong> ${fechaActual}</p>
        <p><strong>Válida hasta:</strong> ${fechaVencimiento}</p>
        <div class="quote-total">
          Monto Total: $${totalFormateado}
        </div>
      </div>

      <div class="attachment-notice">
        📎 La cotización completa se encuentra adjunta en formato PDF
      </div>
      
      <p>Quedamos atentos a cualquier consulta o aclaración que pueda necesitar.</p>
      <p>Saludos cordiales,<br><strong>${userName || fromName.value()}</strong></p>
    </div>
    
    <div class="footer">
      <p>Este es un email automático del sistema de cotizaciones.</p>
      <p>Powered by <strong>Cepequ</strong></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      attachments: [
        {
          filename: `${quoteNumber}.pdf`,
          content: pdfBuffer,
        }
      ]
    };

    console.log('📨 Enviando email via Resend a:', clientEmail);

    // 8. Enviar email
    const { data: sendData, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('❌ Error de Resend:', error);
      throw new Error(error.message || 'Error al enviar email');
    }

    console.log('✅ Email enviado exitosamente. ID:', sendData.id);

    // 9. Actualizar Firestore
    console.log('💾 Actualizando estado en Firestore...');

    const db = admin.firestore();
    const quoteRef = db
      .collection('usuarios')
      .doc(request.auth.uid)
      .collection('cotizaciones')
      .doc(quoteId);

    await quoteRef.update({
      estado: 'Enviada',
      enviadoPorEmail: true,
      emailEnviadoA: clientEmail,
      fechaEnvio: admin.firestore.FieldValue.serverTimestamp(),
      resendEmailId: sendData.id
    });

    console.log('✅ Firestore actualizado');

    return {
      success: true,
      message: `Email enviado exitosamente a ${clientEmail}`,
      emailId: sendData.id,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error enviando email:', error);

    let errorMessage = 'Error al enviar email';

    if (error.message?.includes('Invalid email')) {
      errorMessage = 'Email inválido. Verifica la dirección de correo.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Error de configuración del servicio de email.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Detalle del error:', {
      message: errorMessage,
      stack: error.stack
    });

    throw new Error(errorMessage);
  }
});

/**
 * Cloud Function para sincronizar productos desde Wix API
 * HTTP Function que actúa como proxy para evitar CORS
 */
async function fetchAllWixProducts(apiKey, siteId) {
  let allProducts = [];
  let offset = 0;
  const limit = 100;
  let totalResults = 0;

  do {
    const body = {
      includeHiddenProducts: true,
      query: {
        paging: {
          limit: limit,
          offset: offset
        }
      }
    };

    console.log(`📦 Fetching products: offset=${offset}, limit=${limit}`);

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
    const items = data.products || [];
    totalResults = data.totalResults || 0;

    console.log(`✅ Received ${items.length} products. Total in Wix: ${totalResults}`);

    if (items.length === 0) {
      break;
    }

    const formattedProducts = items.map((p, index) => {
      // Obtener precio
      const price = p.price?.price || p.priceData?.price || 0;

      // Obtener inventario
      const stockInfo = p.stock || {};
      let inventory = stockInfo.quantity || 0;
      // Si no tiene tracking pero está "in stock", asumir stock alto
      if (inventory === null && stockInfo.inStock) {
        inventory = 999;
      }

      // DEBUG EXTENDIDO: Ver estructura COMPLETA del primer producto
      if (index === 0) {
        console.log('==========================================');
        console.log('🔍 ESTRUCTURA COMPLETA DEL PRIMER PRODUCTO:');
        console.log('==========================================');
        console.log(JSON.stringify(p, null, 2));
        console.log('==========================================');
      }

      // Obtener imagen con TODOS los fallbacks posibles
      let imageUrl = 'https://placehold.co/100x100/EEE/333?text=S/I';

      // Intentar TODAS las rutas posibles según documentación de Wix
      if (p.media?.mainMedia?.image?.url) {
        imageUrl = p.media.mainMedia.image.url;
      } else if (p.media?.items?.length > 0 && p.media.items[0].image?.url) {
        imageUrl = p.media.items[0].image.url;
      } else if (p.mediaItems?.length > 0 && p.mediaItems[0].url) {
        imageUrl = p.mediaItems[0].url;
      } else if (p.mainMedia?.url) {
        imageUrl = p.mainMedia.url;
      } else if (p.media?.mainMedia?.thumbnail?.url) {
        imageUrl = p.media.mainMedia.thumbnail.url;
      } else if (p.ribbon?.media?.image?.url) {
        imageUrl = p.ribbon.media.image.url;
      }

      // Si sigue siendo placeholder, log de warning
      if (imageUrl.includes('placehold')) {
        console.log(`⚠️ No se encontró imagen para: ${p.name} (SKU: ${p.sku})`);
      }

      // Limpiar descripción HTML
      const cleanDescription = stripHtmlTags(p.description || '');

      return {
        sku: String(p.sku || ''),
        nombre: p.name || 'Sin Nombre',
        descripcion: cleanDescription,
        precio_iva_incluido: parseFloat(price) || 0,
        precioBase: parseFloat(price) || 0,
        imagen_url: imageUrl,
        inventory: parseInt(inventory) || 0,
        categoria: p.productType || 'General',
        exento_iva: isExentoIVA(p.name)
      };
    });

    allProducts = [...allProducts, ...formattedProducts];

    console.log(`📊 Progress: ${allProducts.length} / ${totalResults} products`);

    // Si recibimos menos productos que el límite, ya no hay más
    if (items.length < limit) {
      break;
    }

    offset += limit;

  } while (offset < totalResults || totalResults === 0);

  console.log(`🎉 Total products fetched: ${allProducts.length}`);
  return allProducts;
}

/**
 * Función para detectar si un producto está exento de IVA
 */
function isExentoIVA(productName) {
  if (!productName) return false;
  const name = productName.toLowerCase();
  return name.includes('libro') || name.includes('patineta');
}

/**
 * Función helper para limpiar HTML de las descripciones
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remover tags HTML
    .replace(/&nbsp;/g, ' ') // Spaces
    .replace(/&amp;/g, '&')  // Ampersands
    .replace(/&lt;/g, '<')   // Less than
    .replace(/&gt;/g, '>')   // Greater than
    .replace(/&quot;/g, '"') // Quotes
    .replace(/&#39;/g, "'")  // Apostrophes
    .trim();
}

exports.syncWixProducts = onRequest({
  cors: true,
  secrets: [wixApiKey, wixSiteId]
}, async (req, res) => {
  console.log('🔄 Iniciando sincronización de productos Wix...');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    // Credenciales desde Firebase Secrets
    const apiKey = wixApiKey.value();
    const siteId = wixSiteId.value();

    if (!apiKey || !siteId) {
      throw new Error('Wix credentials not configured');
    }

    console.log(`📦 Obteniendo productos de Wix para usuario: ${userId}`);

    // Obtener productos con paginación
    const products = await fetchAllWixProducts(apiKey, siteId);

    console.log(`✅ Obtenidos ${products.length} productos de Wix`);

    // Filtrar productos sin SKU válido
    const validProducts = products.filter(p => p.sku && p.sku.trim() !== '');
    const invalidCount = products.length - validProducts.length;

    if (invalidCount > 0) {
      console.log(`⚠️ Excluidos ${invalidCount} productos sin SKU válido`);
    }

    console.log(`💾 Guardando ${validProducts.length} productos en Firestore...`);

    // Guardar en Firestore con batches de 500 (límite de Firestore)
    const db = admin.firestore();
    const productsRef = db.collection(`usuarios/${userId}/productos`);
    const BATCH_SIZE = 500;
    let processedCount = 0;

    // Procesar en lotes de 500
    for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = validProducts.slice(i, i + BATCH_SIZE);

      chunk.forEach(product => {
        const docRef = productsRef.doc(product.sku);
        batch.set(docRef, {
          ...product,
          lastSync: new Date(),
          fechaActualizacion: new Date()
        }, { merge: true });
      });

      await batch.commit();
      processedCount += chunk.length;
      console.log(`💾 Guardados ${processedCount} / ${validProducts.length} productos`);
    }

    // Guardar timestamp en batch separado
    const syncBatch = db.batch();
    const syncRef = db.doc(`usuarios/${userId}/settings/wix_sync`);
    syncBatch.set(syncRef, {
      lastSync: new Date(),
      productsCount: validProducts.length
    });
    await syncBatch.commit();

    console.log('✅ Sincronización completada exitosamente');

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    console.error('❌ Error en syncWixProducts:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});