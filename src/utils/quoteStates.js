/**
 * Utilidades para manejo de estados de cotizaciones
 */

/**
 * Obtiene las clases de estilo para un estado de cotización
 * @param {string} estado - Estado de la cotización
 * @returns {object} - Objeto con clases CSS y metadata
 */
export function getStatusStyle(estado) {
    const defaultStyle = {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-200',
        border: 'border-gray-200 dark:border-gray-700',
        badge: 'secondary',
        icon: '📝',
        label: 'Borrador'
    };

    const styles = {
        'Borrador': {
            bg: 'bg-gray-100 dark:bg-gray-800',
            text: 'text-gray-800 dark:text-gray-200',
            border: 'border-gray-200 dark:border-gray-700',
            badge: 'secondary',
            icon: '📝',
            label: 'Borrador'
        },
        'Enviada': {
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            text: 'text-blue-800 dark:text-blue-200',
            border: 'border-blue-200 dark:border-blue-700',
            badge: 'default',
            icon: '📨',
            label: 'Enviada'
        },
        'Ganada': {
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-800 dark:text-green-200',
            border: 'border-green-200 dark:border-green-700',
            badge: 'outline',
            icon: '✅',
            label: 'Ganada'
        },
        'Perdida': {
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-800 dark:text-red-200',
            border: 'border-red-200 dark:border-red-700',
            badge: 'destructive',
            icon: '❌',
            label: 'Perdida'
        }
    };

    return styles[estado] || defaultStyle;
}

/**
 * Lista de todos los estados disponibles
 */
export const AVAILABLE_STATES = [
    'Borrador',
    'Enviada',
    'Ganada',
    'Perdida'
];

/**
 * Estado por defecto al crear una cotización
 */
export const DEFAULT_STATE = 'Borrador';

/**
 * Valida si una transición de estado es válida
 * @param {string} currentState - Estado actual
 * @param {string} newState - Estado nuevo
 * @returns {boolean} - true si la transición es válida
 */
export function validateStateTransition(currentState, newState) {
    const validTransitions = {
        'Borrador': ['Enviada', 'Ganada', 'Perdida'],  // Puede saltar directo
        'Enviada': ['Ganada', 'Perdida', 'Borrador'],  // Permitir volver
        'Ganada': ['Enviada'],  // Permitir reabrir
        'Perdida': ['Enviada']  // Permitir reabrir
    };

    return validTransitions[currentState]?.includes(newState) || false;
}

/**
 * Calcula métricas de estados
 * @param {Array} quotes - Array de cotizaciones
 * @returns {object} - Objeto con métricas
 */
export function calculateStateMetrics(quotes) {
    const borradores = quotes.filter(q => q.estado === 'Borrador').length;
    const enviadas = quotes.filter(q => q.estado === 'Enviada').length;
    const ganadas = quotes.filter(q => q.estado === 'Ganada').length;
    const perdidas = quotes.filter(q => q.estado === 'Perdida').length;

    const total = quotes.length;
    const procesadas = ganadas + perdidas;
    const conversionRate = procesadas > 0 ? ((ganadas / procesadas) * 100).toFixed(1) : 0;

    return {
        borradores,
        enviadas,
        ganadas,
        perdidas,
        total,
        conversionRate
    };
}
