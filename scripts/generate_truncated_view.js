import fs from 'fs';

// Leer los datos crudos reales
const rawProducts = JSON.parse(fs.readFileSync('wix_products_raw.json', 'utf8'));

// Helper para limpiar HTML
function stripHtmlTags(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
}

const firestoreView = rawProducts.map(p => {
    const price = p.priceData?.price || 0;

    let imageUrl = p.media?.mainMedia?.image?.url || '';
    if (!imageUrl && p.media?.items?.length) imageUrl = p.media.items[0].image.url;

    return {
        sku: String(p.sku),
        nombre: p.name,
        descripcion: stripHtmlTags(p.description),
        categoria: p.productType || "physical",

        precioBase: price,
        precio_iva_incluido: price,
        inventory: p.stock?.quantity || 0,
        exento_iva: false,

        imagen_url: imageUrl,
        lastSync: "2026-01-23T11:05:27.000Z",
        fechaActualizacion: "2026-01-23T11:05:27.000Z",

        embeddingGeneratedAt: "2026-01-24T18:20:56.411Z",

        // Representación truncada para visualización
        // Nota: En la base de datos real hay 1536 floats.
        embedding: [
            0.04699479788541794,
            -0.0123982739281,
            0.0098234817234,
            -0.0567123981273,
            "... [1536 FLOATS TOTAL] ..."
        ]
    };
});

fs.writeFileSync('firestore_actual_view_truncated.json', JSON.stringify(firestoreView, null, 2));
console.log('✅ firestore_actual_view_truncated.json generado con embedding truncado.');
