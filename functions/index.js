const { onCall, onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();

// Definir parámetros (Cloud Functions v2)
const resendApiKey = defineString('RESEND_API_KEY');
const fromEmail = defineString('FROM_EMAIL', { default: 'cotizaciones@cepequ.com' });
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
 * Cloud Function para servir el logo de empresa como base64
 * Esto evita problemas de CORS al generar PDFs
 */
exports.getCompanyLogo = onRequest({
  cors: true
}, async (req, res) => {
  console.log('🖼️ Solicitando logo de empresa...');

  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    // Obtener URL del logo desde Firestore
    const db = admin.firestore();
    const companySettingsRef = db.doc(`usuarios/${userId}/settings/company`);
    const companySettingsSnap = await companySettingsRef.get();

    if (!companySettingsSnap.exists) {
      res.status(404).json({ error: 'Company settings not found' });
      return;
    }

    const logoUrl = companySettingsSnap.data()?.logo_url;

    if (!logoUrl) {
      res.status(404).json({ error: 'Logo URL not found' });
      return;
    }

    console.log('📥 Descargando logo desde:', logoUrl);

    // Descargar el logo desde Firebase Storage
    const response = await fetch(logoUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('✅ Logo convertido a base64');

    res.status(200).json({
      success: true,
      logoBase64: dataUrl
    });

  } catch (error) {
    console.error('❌ Error obteniendo logo:', error);
    res.status(500).json({
      error: 'Failed to get logo',
      message: error.message
    });
  }
});