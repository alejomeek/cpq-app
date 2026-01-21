import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';

/**
 * Calcula las métricas principales (KPIs) para el dashboard DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getDashboardStats(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener las estadísticas del dashboard.");
    return {
      totalAprobado: 0,
      cotizacionesCreadas: 0,
      cotizacionesAprobadas: 0,
      cotizacionesEnviadas: 0,
      tasaAprobacion: 0,
      nuevosClientes: 0,
    };
  }

  const quotesQuery = query(collection(db, "usuarios", userId, "cotizaciones"));
  const clientsQuery = query(collection(db, "usuarios", userId, "clientes"));

  try {
    const [quotesSnapshot, clientsSnapshot] = await Promise.all([
      getDocs(quotesQuery),
      getDocs(clientsQuery)
    ]);

    const allQuotes = quotesSnapshot.docs.map(doc => doc.data());

    const totalAprobado = allQuotes
      .filter(q => q.estado === 'Ganada')
      .reduce((sum, q) => sum + q.total, 0);

    const cotizacionesCreadas = allQuotes.length;

    // Enviadas = Enviada + Ganada + Perdida
    // (Todo lo que salió de borrador)
    const cotizacionesEnviadas = allQuotes.filter(q =>
      q.estado === 'Enviada' ||
      q.estado === 'Ganada' ||
      q.estado === 'Perdida'
    ).length;

    const cotizacionesAprobadas = allQuotes.filter(q => q.estado === 'Ganada').length;

    // Tasa de conversión = Ganadas / Enviadas
    const tasaAprobacion = cotizacionesEnviadas > 0
      ? (cotizacionesAprobadas / cotizacionesEnviadas) * 100
      : 0;

    const nuevosClientes = clientsSnapshot.size;

    return {
      totalAprobado,
      cotizacionesCreadas,
      cotizacionesAprobadas,
      cotizacionesEnviadas,
      tasaAprobacion,
      nuevosClientes,
    };
  } catch (error) {
    console.error("Error al calcular las estadísticas del dashboard:", error);
    return {
      totalAprobado: 0,
      cotizacionesCreadas: 0,
      cotizacionesAprobadas: 0,
      cotizacionesEnviadas: 0,
      tasaAprobacion: 0,
      nuevosClientes: 0,
    };
  }
}

/**
 * Obtiene las 5 cotizaciones más recientes DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 * @param {number} limitCount - Número de cotizaciones a obtener (por defecto 5).
 */
export async function getRecentQuotes(db, userId, limitCount = 5) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener las cotizaciones recientes.");
    return [];
  }

  try {
    const q = query(
      collection(db, "usuarios", userId, "cotizaciones"),
      orderBy("fechaCreacion", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener las cotizaciones recientes:", error);
    return [];
  }
}

/**
 * Agrupa todas las cotizaciones DEL USUARIO por estado, en el orden del embudo.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getQuotesByStatus(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener las cotizaciones por estado.");
    return [];
  }

  const funnelOrder = [
    'Borrador',
    'Enviada',
    'Ganada',
    'Perdida',
  ];

  const statusCounts = new Map(funnelOrder.map(status => [status, 0]));

  try {
    const querySnapshot = await getDocs(collection(db, "usuarios", userId, "cotizaciones"));

    querySnapshot.forEach((doc) => {
      const quote = doc.data();
      if (quote.estado && statusCounts.has(quote.estado)) {
        statusCounts.set(quote.estado, statusCounts.get(quote.estado) + 1);
      }
    });

    const dataForChart = Array.from(statusCounts.entries())
      .map(([name, value]) => ({
        name: name,
        value: value,
      }))
      .filter(item => item.value > 0);

    return dataForChart;
  } catch (error) {
    console.error("Error al obtener las cotizaciones por estado:", error);
    return [];
  }
}

/**
 * NUEVA: Obtiene los clientes con más monto aprobado DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 * @param {number} limit - Número de clientes a retornar (por defecto 3).
 */
export async function getTopClientes(db, userId, limitCount = 3) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener top clientes.");
    return [];
  }

  try {
    const quotesRef = collection(db, "usuarios", userId, "cotizaciones");
    const quotesSnapshot = await getDocs(quotesRef);

    // Agrupar por cliente
    const clientesMap = new Map();

    quotesSnapshot.forEach(doc => {
      const data = doc.data();

      // Solo cotizaciones ganadas
      if (data.estado !== 'Ganada') return;

      const clienteId = data.clienteId;
      const clienteNombre = data.clienteNombre;
      const total = data.total || 0;

      if (!clienteId) return;

      if (clientesMap.has(clienteId)) {
        const cliente = clientesMap.get(clienteId);
        cliente.montoTotal += total;
        cliente.cantidadCotizaciones++;
      } else {
        clientesMap.set(clienteId, {
          id: clienteId,
          nombre: clienteNombre || 'Sin nombre',
          montoTotal: total,
          cantidadCotizaciones: 1
        });
      }
    });

    // Convertir a array y ordenar por monto
    const topClientes = Array.from(clientesMap.values())
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, limitCount);

    return topClientes;
  } catch (error) {
    console.error('Error obteniendo top clientes:', error);
    return [];
  }
}

/**
 * NUEVA: Obtiene cotizaciones creadas en los últimos 6 meses DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getTrendLast6Months(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener tendencia 6 meses.");
    return [];
  }

  try {
    const quotesRef = collection(db, "usuarios", userId, "cotizaciones");
    const quotesSnapshot = await getDocs(quotesRef);

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Crear array de los últimos 6 meses
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyData.push({
        mes: date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        mesCompleto: date,
        creadas: 0
      });
    }

    // Agrupar cotizaciones creadas por mes
    quotesSnapshot.forEach(doc => {
      const data = doc.data();

      // Convertir fechaCreacion a Date
      let fechaCreacionDate;
      if (data.fechaCreacion?.toDate) {
        fechaCreacionDate = data.fechaCreacion.toDate();
      } else if (data.fechaCreacion instanceof Date) {
        fechaCreacionDate = data.fechaCreacion;
      } else {
        return;
      }

      // Solo últimos 6 meses
      if (fechaCreacionDate < sixMonthsAgo) return;

      // Encontrar el mes correspondiente
      const monthIndex = monthlyData.findIndex(month => {
        const monthStart = new Date(month.mesCompleto);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
        return fechaCreacionDate >= monthStart && fechaCreacionDate <= monthEnd;
      });

      if (monthIndex !== -1) {
        monthlyData[monthIndex].creadas++;
      }
    });

    return monthlyData;
  } catch (error) {
    console.error('Error obteniendo tendencia 6 meses:', error);
    return [];
  }
}

/**
 * NUEVA: Obtiene el número de cotizaciones creadas este mes y el mes anterior DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getMonthlyQuotesCount(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener cotizaciones mensuales.");
    return {
      cotizacionesEsteMes: 0,
      cotizacionesMesAnterior: 0
    };
  }

  try {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const quotesRef = collection(db, "usuarios", userId, "cotizaciones");
    const allQuotesSnapshot = await getDocs(quotesRef);

    let cotizacionesEsteMes = 0;
    let cotizacionesMesAnterior = 0;

    allQuotesSnapshot.forEach(doc => {
      const data = doc.data();

      // Convertir fechaCreacion a Date
      let fechaCreacionDate;
      if (data.fechaCreacion?.toDate) {
        fechaCreacionDate = data.fechaCreacion.toDate();
      } else if (data.fechaCreacion instanceof Date) {
        fechaCreacionDate = data.fechaCreacion;
      } else {
        return;
      }

      // Contar mes actual
      if (fechaCreacionDate >= firstDayThisMonth) {
        cotizacionesEsteMes++;
      }

      // Contar mes anterior
      if (fechaCreacionDate >= firstDayLastMonth && fechaCreacionDate <= lastDayLastMonth) {
        cotizacionesMesAnterior++;
      }
    });

    return {
      cotizacionesEsteMes,
      cotizacionesMesAnterior
    };
  } catch (error) {
    console.error('Error obteniendo cotizaciones mensuales:', error);
    return {
      cotizacionesEsteMes: 0,
      cotizacionesMesAnterior: 0
    };
  }
}

/**
 * NUEVA: Obtiene cotizaciones urgentes (que vencen en las próximas 48 horas) DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getUrgentQuotes(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener cotizaciones urgentes.");
    return [];
  }

  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + (48 * 60 * 60 * 1000));

    const quotesRef = collection(db, "usuarios", userId, "cotizaciones");

    // Obtener todas las cotizaciones y filtrar en memoria
    // (Firestore tiene limitaciones con queries compuestas)
    const allQuotesSnapshot = await getDocs(quotesRef);

    const urgentQuotes = [];

    allQuotesSnapshot.forEach(doc => {
      const data = doc.data();

      // Verificar estado (solo enviadas)
      if (data.estado !== 'Enviada') {
        return;
      }

      // Convertir vencimiento a Date
      let vencimientoDate;
      if (data.vencimiento?.toDate) {
        vencimientoDate = data.vencimiento.toDate();
      } else if (data.vencimiento instanceof Date) {
        vencimientoDate = data.vencimiento;
      } else {
        return; // Skip si no tiene fecha válida
      }

      // Verificar si está en rango
      if (vencimientoDate >= now && vencimientoDate <= in48Hours) {
        urgentQuotes.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Ordenar por fecha de vencimiento
    urgentQuotes.sort((a, b) => {
      const dateA = a.vencimiento?.toDate ? a.vencimiento.toDate() : a.vencimiento;
      const dateB = b.vencimiento?.toDate ? b.vencimiento.toDate() : b.vencimiento;
      return dateA - dateB;
    });

    return urgentQuotes;
  } catch (error) {
    console.error('Error obteniendo cotizaciones urgentes:', error);
    return [];
  }
}

/**
 * NUEVA: Obtiene datos de tendencia comparando con el mes anterior DEL USUARIO.
 * @param {Firestore} db - La instancia de la base de datos de Firestore.
 * @param {string} userId - El ID del usuario autenticado (user.uid).
 */
export async function getTrendData(db, userId) {
  if (!userId) {
    console.error("Error: userId es requerido para obtener datos de tendencia.");
    return {
      montoAnterior: 0,
      tasaAnterior: 0,
      cotizacionesAnterior: 0,
      aprobadasAnterior: 0,
      enviadasAnterior: 0
    };
  }

  try {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const quotesRef = collection(db, "usuarios", userId, "cotizaciones");

    // Obtener todas las cotizaciones
    const allQuotesSnapshot = await getDocs(quotesRef);

    let montoAnterior = 0;
    let aprobadasAnterior = 0;
    let totalAnterior = 0;
    let enviadasAnterior = 0;

    allQuotesSnapshot.forEach(doc => {
      const data = doc.data();

      // Convertir fechaCreacion a Date
      let fechaCreacionDate;
      if (data.fechaCreacion?.toDate) {
        fechaCreacionDate = data.fechaCreacion.toDate();
      } else if (data.fechaCreacion instanceof Date) {
        fechaCreacionDate = data.fechaCreacion;
      } else {
        return; // Skip si no tiene fecha válida
      }

      // Verificar si es del mes anterior
      if (fechaCreacionDate >= firstDayLastMonth && fechaCreacionDate <= lastDayLastMonth) {
        totalAnterior++;

        // Contar enviadas (todo menos borrador)
        if (['Enviada', 'Ganada', 'Perdida'].includes(data.estado)) {
          enviadasAnterior++;
        }

        if (data.estado === 'Ganada') {
          montoAnterior += data.total || 0;
          aprobadasAnterior++;
        }
      }
    });

    // Calcular tasa del mes anterior
    const tasaAnterior = enviadasAnterior > 0
      ? (aprobadasAnterior / enviadasAnterior) * 100
      : 0;

    return {
      montoAnterior,
      tasaAnterior,
      cotizacionesAnterior: totalAnterior,
      aprobadasAnterior,
      enviadasAnterior
    };
  } catch (error) {
    console.error('Error obteniendo datos de tendencia:', error);
    return {
      montoAnterior: 0,
      tasaAnterior: 0,
      cotizacionesAnterior: 0,
      aprobadasAnterior: 0,
      enviadasAnterior: 0
    };
  }
}