import fs from 'fs';

// Leer los datos crudos de Wix que acabamos de extraer
const rawProducts = JSON.parse(fs.readFileSync('wix_products_raw.json', 'utf8'));

// Funciones helper copiadas de functions/index.js
function isExentoIVA(productName) {
    if (!productName) return false;
    const name = productName.toLowerCase();
    return name.includes('libro') || name.includes('patineta');
}

function stripHtmlTags(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

// Transformar productos tal como lo hace la Cloud Function
const firestoreProducts = rawProducts.map(p => {
    // Obtener precio
    const price = p.price?.price || p.priceData?.price || 0;

    // Obtener inventario
    const stockInfo = p.stock || {};
    let inventory = stockInfo.quantity || 0;
    if (inventory === null && stockInfo.inStock) {
        inventory = 999;
    }

    // Obtener imagen
    let imageUrl = 'https://placehold.co/100x100/EEE/333?text=S/I';

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

    // IMPORTANTE: En functions/index.js línea 500 se hace:
    // batch.set(docRef, { ...product, ...customFields }, { merge: true });
    // Esto significa que guardamos TOOOODA la data de Wix más nuestros campos calculados.

    return {
        ...p, // Data cruda de Wix (id, slug, visible, media, etc.)

        // Campos sobrescritos o nuevos para CePeQu
        sku: String(p.sku || ''),
        nombre: p.name || 'Sin Nombre',
        descripcion: stripHtmlTags(p.description || ''),
        precio_iva_incluido: parseFloat(price) || 0,
        precioBase: parseFloat(price) || 0,
        imagen_url: imageUrl,
        inventory: parseInt(inventory) || 0,
        categoria: p.productType || 'General',
        exento_iva: isExentoIVA(p.name),

        // Metadatos simulados
        lastSync: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
});

fs.writeFileSync('firestore_products_sample.json', JSON.stringify(firestoreProducts, null, 2));
console.log('✅ Transformación completada. Guardado en firestore_products_sample.json');
