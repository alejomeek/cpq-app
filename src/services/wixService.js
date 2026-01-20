/**
 * Sincroniza productos de Wix a Firestore usando Firebase HTTP Cloud Function
 * @param {Object} db - Instancia de Firestore (no se usa, la Cloud Function maneja Firestore)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncWixToFirestore(db, userId) {
  try {
    // Detectar si estamos en desarrollo o producción
    const isDev = import.meta.env.DEV;

    // URL de la Cloud Function
    // En desarrollo: Firebase Emulators (localhost:5001)
    // En producción: Cloud Functions desplegadas
    const functionUrl = isDev
      ? 'http://127.0.0.1:5001/app-cpq/us-central1/syncWixProducts'
      : 'https://us-central1-app-cpq.cloudfunctions.net/syncWixProducts';

    console.log(`Sincronizando con: ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || 'Sync failed');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error syncing Wix:', error);
    throw error;
  }
}
