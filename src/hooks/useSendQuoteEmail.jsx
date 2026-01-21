import { useState } from 'react';
import React from 'react';
import { httpsCallable } from 'firebase/functions';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from '@/componentes/cotizador/QuotePDF.jsx';

export const useSendQuoteEmail = (functions) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendQuoteEmail = async ({
    quoteId,
    quote,
    client,
    products,
    quoteStyleName
  }) => {
    setSending(true);
    setError(null);

    try {
      console.log('📧 Iniciando envío de email...');

      // 1. Generar PDF
      console.log('📄 Generando PDF...');
      const blob = await pdf(
        <QuotePDF quote={quote} client={client} products={products} styleName={quoteStyleName} />
      ).toBlob();

      // 2. Convertir blob a base64
      console.log('🔄 Convirtiendo PDF a base64...');
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 3. Preparar datos
      const emailData = {
        quoteId,
        quoteNumber: quote.numero,
        clientEmail: client.email,
        clientName: client.nombre,
        total: quote.total,
        vencimiento: quote.vencimiento?.toISOString ? quote.vencimiento.toISOString() : null,
        pdfBase64: base64
      };

      console.log('📨 Llamando Cloud Function...', {
        quoteNumber: emailData.quoteNumber,
        clientEmail: emailData.clientEmail,
        pdfSize: `${(base64.length / 1024).toFixed(2)} KB`
      });

      // 4. Llamar Cloud Function
      const sendEmail = httpsCallable(functions, 'sendQuoteEmail');
      const result = await sendEmail(emailData);

      console.log('✅ Email enviado exitosamente:', result.data);
      
      setSending(false);
      return result.data;

    } catch (err) {
      console.error('❌ Error enviando email:', err);
      
      let errorMessage = 'Error al enviar email';
      
      if (err.code === 'functions/unauthenticated') {
        errorMessage = 'No estás autenticado. Por favor inicia sesión.';
      } else if (err.code === 'functions/invalid-argument') {
        errorMessage = 'Datos inválidos. Verifica que el email del cliente sea correcto.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSending(false);
      throw new Error(errorMessage);
    }
  };

  return { sendQuoteEmail, sending, error };
};