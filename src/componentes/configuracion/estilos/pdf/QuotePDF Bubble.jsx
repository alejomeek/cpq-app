import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// === Fuente principal ===
Font.register({
  family: 'Lato',
  fonts: [
    { src: '/fonts/Lato-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Lato-Bold.ttf', fontWeight: 'bold' },
  ],
});

// === Colores ===
const colors = {
  accent: '#B86B42',
  text: '#333333',
  gray: '#666666',
  lightGray: '#F5F5F5',
  border: '#E0E0E0',
  background: '#FAF6F3',
  white: '#FFFFFF',
};

// === Estilos ===
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Lato',
    fontSize: 10,
    color: colors.text,
    paddingTop: 60,
    paddingHorizontal: 50,
    paddingBottom: 80,
    backgroundColor: colors.white,
    position: 'relative',
  },

  // BURBUJA SUPERIOR
  bubbleTop: {
    position: 'absolute',
    top: -180,
    right: -220,
    width: 700,
    height: 340,
    backgroundColor: colors.background,
    borderBottomLeftRadius: 360,
  },

  // TÍTULO DE LA COTIZACIÓN
  bubbleTitleContainer: {
    position: 'absolute',
    top: 75,
    right: 60,
  },
  bubbleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: 'right',
  },

  // BURBUJA INFERIOR
  bubbleBottom: {
    position: 'absolute',
    bottom: -150,
    left: -200,
    width: 600,
    height: 300,
    backgroundColor: colors.background,
    borderTopRightRadius: 300,
  },

  // ENCABEZADO EMPRESA
  companyInfo: {
    marginBottom: 40,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  companyDetails: {
    fontSize: 9,
    color: colors.gray,
    lineHeight: 1.3,
  },

  // BLOQUE DE INFORMACIÓN PRINCIPAL
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 35,
    marginBottom: 25,
  },

  infoSection: {
    width: '23%',
  },
  infoLabel: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 1.3,
  },

  // TABLA
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    color: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableRowWithImage: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    objectFit: 'cover',
    marginRight: 8,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colDescription: { width: '34%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '16%', textAlign: 'right' },
  colTax: { width: '12%', textAlign: 'center' },
  colImporte: { width: '23%', textAlign: 'right' },

  // TOTALES
  totalsBox: {
    marginTop: 10,
    alignSelf: 'flex-end',
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: colors.gray,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  totalFinalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },

  // CONDICIONES DE PAGO
  payment: {
    marginTop: 25,
  },
  paymentText: {
    fontSize: 9,
    color: colors.text,
  },
  paymentLabel: {
    fontWeight: 'bold',
  },

  // PIE DE PÁGINA
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.gray,
  },
});

// === FUNCIONES AUXILIARES ===
const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });

const formatDate = (date) => {
  try {
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-CO');
  } catch {
    return 'Fecha no disponible';
  }
};

// === COMPONENTE PRINCIPAL ===
const QuotePDF = ({ quote, client, products = [] }) => {
  // Función auxiliar para obtener la imagen del producto
  const getProductImage = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.imagen_url || 'https://placehold.co/200x200/e5e7eb/6b7280?text=Sin+Imagen';
  };

  return (
  <Document author="DIDACTICOS JUGANDO Y EDUCANDO SAS" title={`Cotización ${quote.numero}`}>
    <Page size="A4" style={styles.page}>
      {/* BURBUJA SUPERIOR */}
      <View style={styles.bubbleTop} fixed />

      {/* TÍTULO DE LA COTIZACIÓN */}
      <View style={styles.bubbleTitleContainer} fixed>
        <Text style={styles.bubbleTitle}>Cotización n° {quote.numero}</Text>
      </View>

      {/* BURBUJA INFERIOR */}
      <View style={styles.bubbleBottom} fixed />

      {/* ENCABEZADO EMPRESA */}
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>DIDACTICOS JUGANDO Y EDUCANDO SAS</Text>
        <Text style={styles.companyDetails}>AVENIDA 19 114 A 22</Text>
        <Text style={styles.companyDetails}>BOGOTÁ</Text>
        <Text style={styles.companyDetails}>Colombia</Text>
        <Text style={styles.companyDetails}>NIT: 901144615-6</Text>
      </View>

      {/* BLOQUE COMBINADO: CLIENTE / COMERCIAL / EMISIÓN / VENCIMIENTO */}
      <View style={styles.infoBox}>
        {/* CLIENTE */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Cliente</Text>
          <Text style={styles.infoValue}>
            {client?.nombre || quote.clienteNombre}
            {'\n'}
            {client?.direccion?.calle || 'Dirección no disponible'}
            {'\n'}
            {`${client?.direccion?.ciudad || ''}${client?.direccion?.departamento ? ', ' + client.direccion.departamento : ''}`}
          </Text>
        </View>

        {/* COMERCIAL */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Comercial</Text>
          <Text style={styles.infoValue}>
            {quote.comercial || 'No asignado'}
          </Text>
        </View>

        {/* EMISIÓN */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Emisión</Text>
          <Text style={styles.infoValue}>{formatDate(quote.fechaCreacion)}</Text>
        </View>

        {/* VENCIMIENTO */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Vencimiento</Text>
          <Text style={styles.infoValue}>
            {quote.vencimiento ? formatDate(quote.vencimiento) : 'No especificado'}
          </Text>
        </View>
      </View>

      {/* TABLA */}
      <View>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDescription]}>DESCRIPCIÓN</Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>CANTIDAD</Text>
          <Text style={[styles.tableHeaderCell, styles.colPrice]}>PRECIO UNITARIO</Text>
          <Text style={[styles.tableHeaderCell, styles.colTax]}>IMPUESTOS</Text>
          <Text style={[styles.tableHeaderCell, styles.colImporte]}>IMPORTE</Text>
        </View>

        {quote.lineas.map((line, i) => (
          <View key={i} style={styles.tableRowWithImage}>
            <View style={[styles.colDescription, styles.productInfo]}>
              <Image
                src={getProductImage(line.productId)}
                style={styles.productImage}
              />
              <Text>{line.productName}</Text>
            </View>

            <Text style={[styles.colQty]}>{line.quantity.toFixed(2)} Unidades</Text>
            <Text style={[styles.colPrice]}>{formatCurrency(line.price)}</Text>
            <Text style={[styles.colTax]}>19%</Text>
            <Text style={[styles.colImporte]}>{formatCurrency(line.quantity * line.price)}</Text>
          </View>
        ))}
      </View>

      {/* TOTALES */}
      <View style={styles.totalsBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Base imponible</Text>
          <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>IVA 19%</Text>
          <Text style={styles.totalValue}>{formatCurrency(quote.impuestos)}</Text>
        </View>
        <View style={styles.totalFinal}>
          <Text style={styles.totalFinalLabel}>Total</Text>
          <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
        </View>
      </View>

      {/* CONDICIONES DE PAGO */}
      <View style={styles.payment}>
        <Text style={styles.paymentText}>
          <Text style={styles.paymentLabel}>Condiciones de pago: </Text>
          {quote.condicionesPago || 'No especificadas'}
        </Text>
      </View>

      {/* PIE DE PÁGINA */}
      <View style={styles.footer} fixed>
        <Text>Pie de página</Text>
        <Text>Página 1 / 1</Text>
      </View>
    </Page>
  </Document>
  );
};

export default QuotePDF;
