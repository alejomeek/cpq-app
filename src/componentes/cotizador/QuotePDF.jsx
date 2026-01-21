import React from 'react';

// 1. Importa TODOS los componentes de estilo específicos
import QuotePDFBubble from '../configuracion/estilos/pdf/QuotePDF Bubble.jsx';
import QuotePDFLight from '../configuracion/estilos/pdf/QuotePDF Light.jsx';
import QuotePDFStriped from '../configuracion/estilos/pdf/QuotePDF Striped.jsx';
import QuotePDFWave from '../configuracion/estilos/pdf/QuotePDF Wave.jsx';
// --- Eliminada la importación de QuotePDFDefault ---

// Este es el componente que importarán 'columns.jsx' y 'DownloadPDFButton'
const QuotePDF = ({ quote, client, products, styleName }) => { // Recibe quote, client, products, y styleName

  // 2. Decide qué componente de estilo renderizar
  switch (styleName) {
    case 'Bubble':
      return <QuotePDFBubble quote={quote} client={client} products={products} />;
    case 'Light':
      return <QuotePDFLight quote={quote} client={client} products={products} />;
    case 'Striped':
      return <QuotePDFStriped quote={quote} client={client} products={products} />;
    case 'Wave':
      return <QuotePDFWave quote={quote} client={client} products={products} />;
    // Añade más casos si tienes más estilos
    default:
      // Si styleName no coincide o es undefined, usa 'Bubble' como fallback y muestra una advertencia.
      console.warn(`Estilo de PDF '${styleName}' no reconocido o no proporcionado, usando 'Bubble' como fallback.`);
      return <QuotePDFBubble quote={quote} client={client} products={products} />; // Usa Bubble como fallback
  }
};

export default QuotePDF;