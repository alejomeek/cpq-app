import fs from 'fs';

// Leer los datos crudos reales
const rawProducts = JSON.parse(fs.readFileSync('wix_products_raw.json', 'utf8'));

// Helper para limpiar HTML (como en tu app)
function stripHtmlTags(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
}

// Simular un vector de embedding (1536 dimensiones es lo estándar de OpenAI)
// Generamos solo 50 números para no hacer el archivo ilegible, pero representa el vector.
function generateMockEmbedding() {
    const embedding = [];
    for (let i = 0; i < 1536; i++) {
        embedding.push((Math.random() * 0.1) - 0.05);
    }
    return embedding;
}

const firestoreView = rawProducts.map(p => {
    const price = p.priceData?.price || 0;

    // Lógica de imagen simplificada (como en tu app)
    let imageUrl = p.media?.mainMedia?.image?.url || '';
    if (!imageUrl && p.media?.items?.length) imageUrl = p.media.items[0].image.url;

    return {
        sku: String(p.sku),
        nombre: p.name,
        descripcion: stripHtmlTags(p.description),
        categoria: p.productType || "physical",

        // Precios e Inventario
        precioBase: price,
        precio_iva_incluido: price,
        inventory: p.stock?.quantity || 0,
        exento_iva: false, // Simplificado para el ejemplo

        // Imágenes y Fechas
        imagen_url: imageUrl,
        lastSync: "2026-01-23T23:05:27.000Z", // Fecha ejemplo como en la imagen
        fechaActualizacion: "2026-01-23T23:05:27.000Z",

        // 🔥 EL CULPABLE: Vector de Embedding
        embeddingGeneratedAt: "2026-01-24T18:20:56.411Z",
        embedding: generateMockEmbedding() // Array gigante de números
    };
});

fs.writeFileSync('firestore_actual_view.json', JSON.stringify(firestoreView, null, 2));
console.log('✅ Generado firestore_actual_view.json con estructura idéntica a la imagen.');
