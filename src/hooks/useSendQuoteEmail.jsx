import { useState } from 'react';
import React from 'react';
import { httpsCallable } from 'firebase/functions';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from '@/componentes/cotizador/QuotePDF.jsx';

/**
 * Genera el adjunto a partir de la instantánea guardada en cada línea. No lee
 * productos Firebase ni consulta el catálogo vivo de Supabase al enviar.
 */
export const useSendQuoteEmail = (functions) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendQuoteEmail = async ({ quoteId, quote, client, quoteStyleName }) => {
    setSending(true);
    setError(null);

    try {
      const blob = await pdf(
        <QuotePDF quote={quote} client={client} styleName={quoteStyleName} />
      ).toBlob();

      const pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const sendEmail = httpsCallable(functions, 'sendQuoteEmail');
      const result = await sendEmail({
        quoteId,
        quoteNumber: quote.numero,
        clientEmail: client.email,
        clientName: client.nombre,
        total: quote.total,
        vencimiento: quote.vencimiento?.toISOString ? quote.vencimiento.toISOString() : null,
        pdfBase64,
      });

      return result.data;
    } catch (sendError) {
      let message = 'Error al enviar email';
      if (sendError.code === 'functions/unauthenticated') {
        message = 'No estás autenticado. Por favor inicia sesión.';
      } else if (sendError.code === 'functions/invalid-argument') {
        message = 'Datos inválidos. Verifica el email del cliente.';
      } else if (sendError.message) {
        message = sendError.message;
      }

      setError(message);
      throw new Error(message);
    } finally {
      setSending(false);
    }
  };

  return { sendQuoteEmail, sending, error };
};
