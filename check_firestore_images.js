// Script temporal para ver qué URLs de imagen están en Firestore
const admin = require('firebase-admin');
const serviceAccount = require('./app-cpq-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkImages() {
    try {
        // Obtener usuarios
        const usuariosSnapshot = await db.collection('usuarios').limit(1).get();

        if (usuariosSnapshot.empty) {
            console.log('❌ No hay usuarios en Firestore');
            return;
        }

        const userId = usuariosSnapshot.docs[0].id;
        console.log('✅ Usuario ID:', userId);

        // Obtener primeros 3 productos
        const productosSnapshot = await db
            .collection('usuarios')
            .doc(userId)
            .collection('productos')
            .limit(3)
            .get();

        if (productosSnapshot.empty) {
            console.log('❌ No hay productos para este usuario');
            return;
        }

        console.log(`\n📦 Mostrando ${productosSnapshot.docs.length} productos:\n`);

        productosSnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`--- Producto ${index + 1} ---`);
            console.log('SKU:', data.sku || doc.id);
            console.log('Nombre:', data.nombre);
            console.log('Imagen URL:', data.imagen_url);
            console.log('Precio:', data.precio_iva_incluido);
            console.log('');
        });

        console.log('✅ Listo. Si ves "placehold.co" en las URLs, el problema es en la Cloud Function.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkImages();
