import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/button';

const InsightsPanelPro = ({ db }) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  // Clave para localStorage (específica por usuario)
  const CACHE_KEY = `insights_cache_${user?.uid}`;
  const CACHE_TIMESTAMP_KEY = `insights_timestamp_${user?.uid}`;
  const CACHE_QUOTE_COUNT_KEY = `insights_quote_count_${user?.uid}`;

  // Verificar si el caché es válido
  const isCacheValid = async () => {
    try {
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cachedQuoteCount = localStorage.getItem(CACHE_QUOTE_COUNT_KEY);

      if (!cachedTimestamp || !cachedQuoteCount) {
        return false;
      }

      // 1. Verificar si han pasado más de 24 horas
      const now = Date.now();
      const cacheAge = now - parseInt(cachedTimestamp);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (cacheAge > TWENTY_FOUR_HOURS) {
        console.log('⏰ Caché expirado (más de 24 horas)');
        return false;
      }

      // 2. Verificar si hay nuevas cotizaciones
      const quotesRef = collection(db, "usuarios", user.uid, "cotizaciones");
      const quotesSnapshot = await getDocs(quotesRef);
      const currentQuoteCount = quotesSnapshot.size;
      const cachedCount = parseInt(cachedQuoteCount);

      console.log(`🔍 Verificando cotizaciones: Caché=${cachedCount}, Actual=${currentQuoteCount}`);

      if (currentQuoteCount !== cachedCount) {
        console.log(`📝 Nuevas cotizaciones detectadas (${cachedCount} → ${currentQuoteCount})`);
        return false;
      }

      console.log('✅ Caché válido');
      return true;
    } catch (error) {
      console.error('Error verificando caché:', error);
      return false;
    }
  };

  // Cargar insights desde caché
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const insights = JSON.parse(cached);
        const age = Date.now() - parseInt(timestamp);
        const hoursAgo = Math.floor(age / (1000 * 60 * 60));
        const minutesAgo = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));

        setInsights(insights);
        setCacheInfo({
          fromCache: true,
          timestamp: parseInt(timestamp),
          age: hoursAgo > 0 ? `${hoursAgo}h` : `${minutesAgo}m`
        });

        console.log(`💾 Insights cargados desde caché (${hoursAgo > 0 ? hoursAgo + 'h' : minutesAgo + 'm'} atrás)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cargando caché:', error);
      return false;
    }
  };

  // Guardar insights en caché
  const saveToCache = (insightsData, quoteCount) => {
    try {
      const now = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(insightsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      localStorage.setItem(CACHE_QUOTE_COUNT_KEY, quoteCount.toString());

      setCacheInfo({
        fromCache: false,
        timestamp: now,
        age: 'recién generado'
      });

      console.log(`💾 Insights guardados en caché con ${quoteCount} cotizaciones`);
    } catch (error) {
      console.error('Error guardando caché:', error);
    }
  };

  // Limpiar caché
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_QUOTE_COUNT_KEY);
      setCacheInfo(null);
      console.log('🗑️ Caché limpiado');
    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  };

  // Función para obtener TODOS los datos completos
  const fetchCompleteData = async () => {
    if (!user || !user.uid) return null;

    try {
      // 1. Obtener TODAS las cotizaciones con detalles completos
      const quotesRef = collection(db, "usuarios", user.uid, "cotizaciones");
      const quotesQuery = query(quotesRef, orderBy("fechaCreacion", "desc"));
      const quotesSnapshot = await getDocs(quotesQuery);

      const todasLasCotizaciones = quotesSnapshot.docs.map(doc => {
        const data = doc.data();

        // Convertir fechas de Firestore a formato legible
        let fechaCreacion = null;
        let vencimiento = null;

        if (data.fechaCreacion?.toDate) {
          fechaCreacion = data.fechaCreacion.toDate();
        } else if (data.fechaCreacion instanceof Date) {
          fechaCreacion = data.fechaCreacion;
        }

        if (data.vencimiento?.toDate) {
          vencimiento = data.vencimiento.toDate();
        } else if (data.vencimiento instanceof Date) {
          vencimiento = data.vencimiento;
        }

        return {
          id: doc.id,
          numero: data.numero,
          cliente: data.cliente?.nombre || data.cliente || 'Cliente desconocido',
          estado: data.estado || 'Borrador',
          total: data.total || 0,
          subtotal: data.subtotal || 0,
          impuestos: data.impuestos || 0,
          fechaCreacion: fechaCreacion ? fechaCreacion.toISOString() : null,
          vencimiento: vencimiento ? vencimiento.toISOString() : null,
          items: data.items || [],
          itemsCount: data.items?.length || 0
        };
      });

      // 2. Obtener TODOS los clientes
      const clientesRef = collection(db, "usuarios", user.uid, "clientes");
      const clientesSnapshot = await getDocs(clientesRef);
      const clientes = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 3. Obtener TODOS los productos
      const productosRef = collection(db, "usuarios", user.uid, "productos");
      const productosSnapshot = await getDocs(productosRef);
      const productos = productosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular métricas
      const cotizaciones = todasLasCotizaciones;
      const totalCotizaciones = cotizaciones.length;
      const ganadas = cotizaciones.filter(q => q.estado === 'Ganada').length;
      const perdidas = cotizaciones.filter(q => q.estado === 'Perdida').length;
      const enviadas = cotizaciones.filter(q => q.estado === 'Enviada').length;
      const borradores = cotizaciones.filter(q => q.estado === 'Borrador').length;

      const totalVentas = cotizaciones
        .filter(q => q.estado === 'Ganada')
        .reduce((sum, q) => sum + q.total, 0);

      const tasaConversion = totalCotizaciones > 0
        ? (ganadas / totalCotizaciones * 100).toFixed(1)
        : 0;

      const ticketPromedio = ganadas > 0
        ? totalVentas / ganadas
        : 0;

      // Análisis de productos
      const productosMap = new Map();

      cotizaciones.forEach(cotizacion => {
        cotizacion.items?.forEach(prod => {
          if (!productosMap.has(prod.nombre)) {
            productosMap.set(prod.nombre, {
              nombre: prod.nombre,
              vecesCotizado: 0,
              cantidadTotal: 0,
              montoTotal: 0,
              vecesAprobado: 0
            });
          }

          const producto = productosMap.get(prod.nombre);
          producto.vecesCotizado++;
          producto.cantidadTotal += prod.cantidad || 0;
          producto.montoTotal += prod.subtotal || 0;

          if (cotizacion.estado === 'Ganada') {
            producto.vecesAprobado++;
          }
        });
      });

      const productosArray = Array.from(productosMap.values()).map(p => ({
        ...p,
        tasaConversion: p.vecesCotizado > 0
          ? (p.vecesAprobado / p.vecesCotizado * 100).toFixed(1)
          : 0
      }));

      // Tendencias temporales
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const cotizacionesEsteMes = cotizaciones.filter(q => {
        if (!q.fechaCreacion) return false;
        const fecha = new Date(q.fechaCreacion);
        return fecha >= firstDayThisMonth;
      });

      const cotizacionesMesAnterior = cotizaciones.filter(q => {
        if (!q.fechaCreacion) return false;
        const fecha = new Date(q.fechaCreacion);
        return fecha >= firstDayLastMonth && fecha <= lastDayLastMonth;
      });

      // Tendencias por día de la semana
      const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const cotizacionesPorDia = {};
      const aprobadasPorDia = {};

      diasSemana.forEach(dia => {
        cotizacionesPorDia[dia] = 0;
        aprobadasPorDia[dia] = 0;
      });

      cotizaciones.forEach(q => {
        if (q.fechaCreacion) {
          const fecha = new Date(q.fechaCreacion);
          const dia = diasSemana[fecha.getDay()];
          cotizacionesPorDia[dia]++;
          if (q.estado === 'Ganada') {
            aprobadasPorDia[dia]++;
          }
        }
      });

      // Cotizaciones urgentes (solo enviadas)
      const urgentes = cotizaciones.filter(q => {
        if (q.estado !== 'Enviada') return false;
        if (!q.vencimiento) return false;

        const venc = new Date(q.vencimiento);
        const diasHastaVencimiento = Math.floor((venc - now) / (1000 * 60 * 60 * 24));
        return diasHastaVencimiento <= 3 && diasHastaVencimiento >= 0;
      });

      // Borradores antiguos
      const DIAS_BORRADOR_ANTIGUO = 7;
      const borradoresAntiguos = cotizaciones.filter(q => {
        if (q.estado !== 'Borrador') return false;
        if (!q.fechaCreacion) return false;

        const fecha = new Date(q.fechaCreacion);
        const diasDesdeCreacion = Math.floor((now - fecha) / (1000 * 60 * 60 * 24));
        return diasDesdeCreacion > DIAS_BORRADOR_ANTIGUO;
      });

      return {
        cotizaciones: {
          todas: todasLasCotizaciones,
          totalCotizaciones,
          ganadas,
          perdidas,
          enviadas,
          borradores,
          totalVentas,
          tasaConversion: parseFloat(tasaConversion),
          ticketPromedio,
          esteMes: cotizacionesEsteMes.length,
          mesAnterior: cotizacionesMesAnterior.length,
          porDiaSemana: Object.entries(cotizacionesPorDia).map(([dia, total]) => ({
            dia,
            total,
            aprobadas: aprobadasPorDia[dia],
            tasaConversion: total > 0 ? (aprobadasPorDia[dia] / total * 100).toFixed(1) : 0
          }))
        },
        clientes: {
          total: clientes.length,
          lista: clientes.map(c => ({
            nombre: c.nombre,
            email: c.email,
            tipo: c.tipo
          }))
        },
        productos: {
          total: productos.length,
          analisis: productosArray
        },
        alertas: {
          urgentes: urgentes.length,
          urgentesDetalle: urgentes.map(q => ({
            numero: q.numero,
            cliente: q.cliente,
            monto: q.total,
            vencimiento: q.vencimiento
          })),
          borradoresAntiguos: borradoresAntiguos.length,
          borradoresMontoEstimado: borradoresAntiguos.reduce((sum, q) => sum + q.total, 0)
        }
      };
    } catch (error) {
      console.error('Error obteniendo datos completos:', error);
      return null;
    }
  };

  const generateInsights = async (forceRegenerate = false) => {
    if (!user || !user.uid) return;

    // Si no es regeneración forzada, intentar usar caché
    if (!forceRegenerate) {
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const loaded = loadFromCache();
        if (loaded) return;
      }
    } else {
      clearCache();
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener datos completos
      const completeData = await fetchCompleteData();

      if (!completeData) {
        throw new Error('No se pudieron obtener los datos');
      }

      console.log('🤖 Generando insights con IA (modo seguro)...');

      // 2. Obtener token de autenticación de Firebase
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const idToken = await currentUser.getIdToken();

      // 3. Llamar a Vercel Serverless Function (SEGURO)
      const response = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ completeData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar insights');
      }

      const { insights: generatedInsights, metadata } = await response.json();

      console.log('✅ Insights generados exitosamente');
      console.log(`📊 Tokens usados: ${metadata.tokensUsed}`);
      console.log(`💰 Costo: $${metadata.cost}`);
      console.log(`⏱️ Duración: ${metadata.duration}`);

      // 4. Guardar en caché
      const quoteCount = completeData.cotizaciones.totalCotizaciones;
      saveToCache(generatedInsights, quoteCount);

      setInsights(generatedInsights);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'Error al generar insights');
      setLoading(false);
    }
  };

  // Cargar insights al montar
  useEffect(() => {
    if (user?.uid) {
      const attemptLoad = async () => {
        const cacheValid = await isCacheValid();
        if (cacheValid) {
          loadFromCache();
        }
      };
      attemptLoad();
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Insights con IA</h2>
        </div>
        <div className="flex gap-2">
          {cacheInfo && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              {cacheInfo.fromCache ? '💾' : '✨'} {cacheInfo.age}
            </span>
          )}
          <Button
            onClick={() => generateInsights(false)}
            disabled={loading}
            variant="default"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Insights
              </>
            )}
          </Button>
          {insights && (
            <Button
              onClick={() => generateInsights(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      )}

      {/* Insights */}
      {!loading && insights && (
        <div className="space-y-6">
          {/* Resumen Ejecutivo */}
          {insights.resumenEjecutivo && (
            <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Resumen Ejecutivo</h3>
                  <p className="text-foreground/90 leading-relaxed">{insights.resumenEjecutivo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Insights Descriptivos */}
          {insights.insightsDescriptivos && insights.insightsDescriptivos.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análisis Descriptivo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.insightsDescriptivos.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* Insights Predictivos */}
          {insights.insightsPredictivos && insights.insightsPredictivos.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Predicciones y Tendencias
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.insightsPredictivos.map((insight, index) => (
                  <InsightCard key={index} insight={insight} isPredictive />
                ))}
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {insights.recomendaciones && insights.recomendaciones.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recomendaciones
              </h3>
              <div className="space-y-3">
                {insights.recomendaciones.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !insights && !error && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Genera Insights con IA</h3>
          <p className="text-muted-foreground">
            Analiza tus datos de negocio y obtén recomendaciones personalizadas
          </p>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar un insight individual
const InsightCard = ({ insight, isPredictive = false }) => {
  const getIcon = () => {
    if (insight.tipo === 'oportunidad') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (insight.tipo === 'advertencia') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <Lightbulb className="h-5 w-5 text-blue-500" />;
  };

  const getBorderColor = () => {
    if (insight.tipo === 'oportunidad') return 'border-green-500';
    if (insight.tipo === 'advertencia') return 'border-yellow-500';
    return 'border-blue-500';
  };

  return (
    <div className={`bg-card border-l-4 ${getBorderColor()} p-4 rounded-lg`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold mb-2">{insight.titulo}</h4>
          <p className="text-sm text-muted-foreground mb-2">{insight.descripcion}</p>
          <div className="flex gap-2 text-xs">
            {insight.impacto && (
              <span className="px-2 py-1 bg-muted rounded">
                Impacto: {insight.impacto}
              </span>
            )}
            {insight.confianza && (
              <span className="px-2 py-1 bg-muted rounded">
                Confianza: {insight.confianza}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar una recomendación
const RecommendationCard = ({ recommendation }) => {
  const getPriorityColor = () => {
    if (recommendation.prioridad === 'alta') return 'bg-red-500/10 border-red-500';
    if (recommendation.prioridad === 'media') return 'bg-yellow-500/10 border-yellow-500';
    return 'bg-blue-500/10 border-blue-500';
  };

  return (
    <div className={`border-l-4 ${getPriorityColor()} p-4 rounded-lg`}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">{recommendation.titulo}</h4>
            <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
              {recommendation.prioridad}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{recommendation.descripcion}</p>
          {recommendation.impactoEstimado && (
            <p className="text-xs text-muted-foreground italic">
              💡 {recommendation.impactoEstimado}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsPanelPro;