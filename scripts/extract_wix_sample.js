import fs from 'fs';
import fetch from 'node-fetch'; // Requires node-fetch dependency or native fetch in Node 18+

// Credenciales proporcionadas por el usuario
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQwYzY3NjM2LTBkOTctNDFlNy1hYWQ4LThmZTIyNWRjMjFiN1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImVkYTRiNzRkLTI1YmYtNDc5My05ZmQ3LWJiODQwYzA5MTQyMlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3OTA5ZmY5ZC1kN2U5LTQ4YzktOTcyZi02ZDM1M2VlNmU0NDJcIn19IiwiaWF0IjoxNzY1MjQzNjMxfQ.QmPtRgP-sggDlRYdZVcESBg7wmy4UCi0a8dexIxaqLfIBjySYb4n38tCzCeOjQi_kfyMT-T1ya8eOfh_yXuHGtgDlO_jRlZNOTnMHO4DDldQD97i_o2IjOjkoutB4cVK92XKIOg_WRUoVWTzeubhtB63pAaDubOwm9bPkDaO4LLAY6O7kg9PXScx3jIMndIrar1oDuk4O5gMdQCiCc7c4UsHFk96o4EC2KKzcatIFUpbKAgqM8yH0I7nTKXdXQb87WHVYzIhoMFyJ0SONkfJAVMsl_oLfNcSIuL9486hfh4jq-y5V3o0CcS-SuTb76PemhjozRKDAQJPXaSSRfLNEw';
const WIX_SITE_ID = 'a290c1b4-e593-4126-ae4e-675bd07c1a42';
const WIX_API_URL = 'https://www.wixapis.com/stores/v1/products/query';

async function fetchRandomWixProducts(count = 3) {
    console.log('🔄 Conectando a Wix para extraer productos reales...');

    try {
        // 1. Obtener total de productos
        const initialQuery = {
            query: { paging: { limit: 1 } }
        };

        const res = await fetch(WIX_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': WIX_API_KEY,
                'wix-site-id': WIX_SITE_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(initialQuery)
        });

        if (!res.ok) {
            console.error(`Status: ${res.status}`);
            const text = await res.text();
            throw new Error(`Error Wix API: ${text}`);
        }

        const initialData = await res.json();
        const totalProducts = initialData.totalResults; // Wix returns 'totalResults' inside metadata usually, need to check structure
        // Actually Wix V1 query returns { products: [], totalResults: number, metadata: ... }

        console.log(`📦 Total de productos en la tienda: ${totalProducts}`);

        if (!totalProducts || totalProducts === 0) {
            console.log("No hay productos en la tienda.");
            return [];
        }

        // 2. Generar offsets aleatorios
        const randomOffsets = new Set();
        while (randomOffsets.size < count) {
            const rand = Math.floor(Math.random() * totalProducts);
            randomOffsets.add(rand);
        }

        console.log(`🎲 Offsets seleccionados: ${Array.from(randomOffsets).join(', ')}`);

        const products = [];
        const rawProducts = [];

        // 3. Buscar productos reales
        for (const offset of randomOffsets) {
            const queryBody = {
                includeHiddenProducts: true,
                query: {
                    paging: { limit: 1, offset: offset }
                }
            };

            const productRes = await fetch(WIX_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': WIX_API_KEY,
                    'wix-site-id': WIX_SITE_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            });

            if (productRes.ok) {
                const data = await productRes.json();
                if (data.products && data.products.length > 0) {
                    const p = data.products[0];
                    rawProducts.push(p); // Guardar data cruda para el usuario

                    const formattedProduct = {
                        sku: p.sku || '',
                        nombre: p.name,
                        precio: p.priceData?.price || 0,
                        inventario: p.stock?.quantity, // Puede ser null si no trackea inv
                        trackInventory: p.stock?.trackInventory,
                        inStock: p.stock?.inStock,
                        imagen: p.media?.mainMedia?.image?.url || 'https://placehold.co/100',
                        categoria: p.productType,
                        wix_id: p.id
                    };

                    products.push(formattedProduct);
                    console.log(`✅ Extraído: ${formattedProduct.nombre} (SKU: ${formattedProduct.sku})`);
                }
            }
        }

        // 4. Guardar resultados RAW
        fs.writeFileSync('wix_products_raw.json', JSON.stringify(rawProducts, null, 2));
        console.log('💾 JSON COMPLETO (Estructura Wix) guardado en: wix_products_raw.json');

        return rawProducts;

    } catch (error) {
        console.error('❌ Error crítico:', error.message);
    }
}

fetchRandomWixProducts();
