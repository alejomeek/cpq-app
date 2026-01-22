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
  white: '#FFFFFF',
};

// === Estilos ===
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Lato',
    fontSize: 10,
    color: colors.text,
    paddingTop: 40,
    paddingHorizontal: 50,
    paddingBottom: 60,
    backgroundColor: colors.white,
  },

  // --- ENCABEZADO EMPRESA ---
  companyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  companyInfoLeft: {
    width: '30%',
  },
  companyInfoRight: {
    width: '65%',
    textAlign: 'right',
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
  companyLogo: {
    width: 80,
    height: 80,
    objectFit: 'contain',
    marginBottom: 10,
  },

  // --- TÍTULO PRINCIPAL ---
  quoteTitle: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  // --- ENCABEZADO PRINCIPAL (Emisión / Cliente) ---
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  infoSection: {
    width: '35%',
  },
  quoteLabel: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 3,
  },
  quoteValue: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 1.4,
  },

  // --- CLIENTE (alineación izquierda) ---
  clientSection: {
    width: '55%',
    textAlign: 'left',
  },

  // --- TABLA ---
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: 4,
    marginBottom: 2,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  tableRowWithImage: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
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
    paddingRight: 8,
  },
  altRow: {
    backgroundColor: colors.lightGray,
  },
  colDescription: { width: '28%' },
  colQty: { width: '10%', textAlign: 'center', paddingLeft: 15 },
  colPriceUnit: { width: '22%', textAlign: 'right' },
  colIvaUnit: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  // --- TOTALES ---
  totalsBox: {
    marginTop: 10,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginTop: 5,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.accent,
  },
  totalFinalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.accent,
  },

  // --- CONDICIONES ---
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

  // --- PIE DE PÁGINA ---
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.gray,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
});

// === Funciones auxiliares ===
const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
        {/* ENCABEZADO EMPRESA */}
        <View style={styles.companyInfo}>
          {/* Logo de empresa (izquierda) */}
          <View style={styles.companyInfoLeft}>
            {quote.companyLogoUrl && (
              <Image src={quote.companyLogoUrl} style={styles.companyLogo} />
            )}
          </View>

          {/* Datos de empresa (derecha) */}
          <View style={styles.companyInfoRight}>
            <Text style={styles.companyName}>DIDACTICOS JUGANDO Y EDUCANDO SAS</Text>
            <Text style={styles.companyDetails}>AVENIDA 19 114 A 22</Text>
            <Text style={styles.companyDetails}>BOGOTÁ</Text>
            <Text style={styles.companyDetails}>Colombia</Text>
            <Text style={styles.companyDetails}>NIT: 901144615-6</Text>
          </View>
        </View>

        {/* TÍTULO PRINCIPAL */}
        <Text style={styles.quoteTitle}>{quote.numero}</Text>

        {/* INFORMACIÓN PRINCIPAL: Emisión / Cliente */}
        <View style={styles.quoteHeader}>
          {/* Emisión y Vencimiento */}
          <View style={styles.infoSection}>
            <Text style={styles.quoteLabel}>Emisión</Text>
            <Text style={styles.quoteValue}>{formatDate(quote.fechaCreacion)}</Text>

            <Text style={[styles.quoteLabel, { marginTop: 6 }]}>Vencimiento</Text>
            <Text style={styles.quoteValue}>
              {quote.vencimiento ? formatDate(quote.vencimiento) : 'No especificado'}
            </Text>
          </View>

          {/* Cliente (alineado a la izquierda) */}
          <View style={styles.clientSection}>
            <Text style={styles.quoteLabel}>Cliente</Text>
            <Text style={styles.quoteValue}>
              {client?.nombre || quote.clienteNombre}
            </Text>
            <Text style={{ fontSize: 9 }}>
              {client?.direccion?.calle || 'Dirección no disponible'}
            </Text>
            <Text style={{ fontSize: 9 }}>
              {`${client?.direccion?.ciudad || 'Ciudad no disponible'}, ${client?.direccion?.departamento || ''
                }`}
            </Text>
          </View>
        </View>

        {/* TABLA */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colDescription]}>Descripción</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Cant.</Text>
            <Text style={[styles.headerCell, styles.colPriceUnit]}>Precio Unit.</Text>
            <Text style={[styles.headerCell, styles.colIvaUnit]}>IVA Unit.</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Total Línea</Text>
          </View>

          {quote.lineas.map((line, i) => {
            const product = products.find(p => p.id === line.productId);

            // CORRECCIÓN: line.price ya viene CON IVA incluido desde Wix
            // Necesitamos calcular el precio SIN IVA
            const precioConIvaOriginal = line.price;
            const precioSinIva = product?.exento_iva
              ? precioConIvaOriginal  // Si está exento, el precio es el mismo
              : precioConIvaOriginal / 1.19;  // Si tiene IVA, dividir por 1.19

            const ivaUnitario = product?.exento_iva ? 0 : (precioSinIva * 0.19);
            const precioConIva = precioSinIva + ivaUnitario;  // Esto debería ser igual a line.price
            const totalLinea = line.quantity * precioConIva;

            return (
              <View key={i} style={[styles.tableRowWithImage, i % 2 === 1 && styles.altRow]}>
                {/* Imagen + Descripción */}
                <View style={[styles.colDescription, styles.productInfo]}>
                  <Image
                    src={getProductImage(line.productId)}
                    style={styles.productImage}
                  />
                  <Text>{line.productName}</Text>
                </View>

                {/* Cantidad */}
                <Text style={[styles.colQty]}>{line.quantity.toFixed(0)}</Text>

                {/* Precio Unitario (SIN IVA) */}
                <Text style={[styles.colPriceUnit]}>{formatCurrency(precioSinIva)}</Text>

                {/* IVA Unitario */}
                <Text style={[styles.colIvaUnit]}>
                  {product?.exento_iva ? 'Exento' : formatCurrency(ivaUnitario)}
                </Text>

                {/* Total Línea (Precio sin IVA + IVA) */}
                <Text style={[styles.colTotal]}>{formatCurrency(totalLinea)}</Text>
              </View>
            );
          })}
        </View>

        {/* TOTALES */}
        <View style={styles.totalsBox}>
          {/* Precio sin IVA */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Precio sin IVA</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
          </View>

          {/* IVA 19% */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 19%</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.impuestos)}</Text>
          </View>

          {/* Subtotal (Precio sin IVA + IVA) */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.subtotal + quote.impuestos)}
            </Text>
          </View>

          {/* Flete (solo si > 0) */}
          {quote.fleteValue > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Flete</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.fleteValue)}</Text>
            </View>
          )}

          {/* Total Final */}
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
          </View>
        </View>

        {/* CONDICIONES */}
        <View style={styles.payment}>
          <Text style={styles.paymentText}>
            <Text style={styles.paymentLabel}>Condiciones de pago: </Text>
            {quote.condicionesPago || 'No especificadas'}
          </Text>
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.footer} fixed>
          <Text>Cotización emitida por Didácticos Jugando y Educando SAS</Text>
          <Text render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default QuotePDF;
