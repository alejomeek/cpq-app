import { useState } from 'react';
import React from 'react';
import { httpsCallable } from 'firebase/functions';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from '@/componentes/cotizador/QuotePDF.jsx';

export const useSendQuoteEmail = (functions) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

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
  const convertOnlyFirebaseImages = async (allProducts, quoteLines, batchSize = 3) => {
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

      // 0. Convertir SOLO las imágenes de Firebase Storage que están en esta cotización
      const productsWithBase64Images = await convertOnlyFirebaseImages(products, quote.lineas, 3);

      console.log('✅ Imágenes procesadas correctamente');

      // 1. Generar PDF
      console.log('📄 Generando PDF...');
      const blob = await pdf(
        <QuotePDF quote={quote} client={client} products={productsWithBase64Images} styleName={quoteStyleName} />
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