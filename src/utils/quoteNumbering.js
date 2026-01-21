import { doc, runTransaction } from 'firebase/firestore';

/**
 * Genera el siguiente número de cotización para una tienda
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} userId - ID del usuario
 * @param {string} tienda - "Barranquilla" o "Medellin"
 * @returns {Promise<string>} - Número de cotización (ej: "COT-BQ-0001")
 */
export async function getNextQuoteNumber(db, userId, tienda) {
  const tiendaNormalized = tienda.toLowerCase();
  const counterRef = doc(db, 'usuarios', userId, 'contadores', `cotizacion_${tiendaNormalized}`);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    // Obtener count actual o empezar en 0
    const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
    const newCount = currentCount + 1;

    // Actualizar contador
    transaction.set(counterRef, { count: newCount });

    // Generar número con prefijo
    const prefix = tienda === "Barranquilla" ? "BQ" : "MED";
    const paddedNumber = String(newCount).padStart(4, '0');

    return `COT-${prefix}-${paddedNumber}`;
  });
}
