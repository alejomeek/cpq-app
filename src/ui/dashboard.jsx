import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import {
  getDashboardStats,
  getRecentQuotes,
  getQuotesByStatus,
  getUrgentQuotes,
  getTrendData,
  getTopClientes,
  getTrendLast6Months,
  getMonthlyQuotesCount
} from '@/utils/dashboardUtils.js';
import StatCard from '@/componentes/dashboard/StatCard.jsx';
import { RecentQuotesTable } from '@/componentes/dashboard/RecentQuotesTable.jsx';
import { QuotesFunnelChart } from '@/componentes/dashboard/QuotesFunnelChart.jsx';
import InsightsPanelPro from '@/componentes/dashboard/InsightsPanelPro.jsx';
import { DollarSign, FileText, Percent, AlertCircle, TrendingUp, TrendingDown, Users, Award, Sparkles, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/ui/theme-provider';

const Dashboard = ({ db, navigate }) => {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('metricas'); // NUEVO: Estado para tabs
  const [stats, setStats] = useState(null);
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [urgentQuotes, setUrgentQuotes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [trendLast6Months, setTrendLast6Months] = useState([]);
  const [monthlyQuotes, setMonthlyQuotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [
          dashboardStats,
          recentQuotesData,
          quotesByStatusData,
          urgentQuotesData,
          trend,
          topClientesData,
          trend6MonthsData,
          monthlyQuotesData
        ] = await Promise.all([
          getDashboardStats(db, user.uid),
          getRecentQuotes(db, user.uid, 5),
          getQuotesByStatus(db, user.uid),
          getUrgentQuotes(db, user.uid),
          getTrendData(db, user.uid),
          getTopClientes(db, user.uid, 3),
          getTrendLast6Months(db, user.uid),
          getMonthlyQuotesCount(db, user.uid)
        ]);

        setStats(dashboardStats);
        setRecentQuotes(recentQuotesData);
        setUrgentQuotes(urgentQuotesData);
        setChartData(quotesByStatusData);
        setTrendData(trend);
        setTopClientes(topClientesData);
        setTrendLast6Months(trend6MonthsData);
        setMonthlyQuotes(monthlyQuotesData);
      } catch (err) {
        console.error("Error al cargar los datos del dashboard:", err);
        setError("Error al cargar los datos del dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [db, user]);

  const handleQuoteClick = (quoteId) => {
    navigate('quotes', quoteId);
  };

  const handleViewAllUrgent = () => {
    navigate('quotes', null, { filter: 'urgent' });
  };

  const handleViewAllQuotes = () => {
    navigate('quotes'); // Navegar a QuoteList (QuotesPage.jsx)
  };

  const handleViewInNegotiation = () => {
    navigate('quotes'); // Navegar a QuoteList (QuotesPage.jsx)
  };

  const handleViewBorradores = () => {
    navigate('quotes'); // Navegar a QuoteList (QuotesPage.jsx)
  };

  const handleClienteClick = (clienteId, clienteNombre) => {
    navigate('clients', null, { filterByName: clienteNombre }); // Pasar nombre para filtrar
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
      isNegative: change < 0
    };
  };

  // Calcular tendencia de cotizaciones mensuales
  const monthlyQuotesTrend = monthlyQuotes ? formatTrend(
    monthlyQuotes.cotizacionesEsteMes,
    monthlyQuotes.cotizacionesMesAnterior
  ) : null;

  const tickColor = theme === 'dark' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))';

  return (
    <div className="space-y-6">
      {/* Header con Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Dashboard</h1>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('metricas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'metricas'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <BarChart3 className="h-4 w-4" />
              Métricas
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'insights'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Sparkles className="h-4 w-4" />
              Insights con IA
            </button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Actualizado: {new Date().toLocaleString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'metricas' ? (
        <>
          {/* Métricas Principales - 3 Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Monto Aprobado */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Monto Aprobado</span>
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">
                {formatCurrency(stats?.totalAprobado)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total de ventas cerradas
              </p>
            </div>

            {/* Tasa de Conversión */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Percent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Tasa de Conversión</span>
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">
                {(stats?.tasaAprobacion || 0).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {stats?.cotizacionesAprobadas || 0} ganadas de {stats?.cotizacionesEnviadas || 0} enviadas
              </p>
            </div>

            {/* Cotizaciones Este Mes - NUEVA */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Creadas Este Mes</span>
                </div>
                {monthlyQuotesTrend && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${monthlyQuotesTrend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {monthlyQuotesTrend.isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {monthlyQuotesTrend.value}%
                  </div>
                )}
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">
                {monthlyQuotes?.cotizacionesEsteMes || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                vs mes anterior: {monthlyQuotes?.cotizacionesMesAnterior || 0}
              </p>
            </div>
          </div>

          {/* Alertas de Urgentes */}
          {urgentQuotes && urgentQuotes.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="ml-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-orange-900 dark:text-orange-100">
                      ⚠️ {urgentQuotes.length} cotización(es) requieren atención urgente
                    </span>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Vencen en las próximas 48 horas
                    </p>
                  </div>
                  <button
                    onClick={handleViewAllUrgent}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                  >
                    Ver detalles →
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Métricas Secundarias */}
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={handleViewAllQuotes}
              className="text-left hover:scale-105 transition-transform"
            >
              <StatCard
                title="Total Cotizaciones"
                value={stats?.cotizacionesCreadas || 0}
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                subtitle="Click para ver todas"
                className="cursor-pointer hover:border-primary/50"
              />
            </button>
            <button
              onClick={handleViewInNegotiation}
              className="text-left hover:scale-105 transition-transform"
            >
              <StatCard
                title="Enviadas"
                value={chartData.find(item => item.name === 'Enviada')?.value || 0}
                icon={<AlertCircle className="h-4 w-4 text-blue-600" />}
                subtitle="Click para revisar"
                className="cursor-pointer hover:border-blue-300"
              />
            </button>
            <button
              onClick={handleViewBorradores}
              className="text-left hover:scale-105 transition-transform"
            >
              <StatCard
                title="Borradores"
                value={chartData.find(item => item.name === 'Borrador')?.value || 0}
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                subtitle="Click para completar"
                className="cursor-pointer hover:border-amber-300"
              />
            </button>
          </div>

          {/* Top Clientes + Tendencia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-foreground text-lg">🏆 Top Clientes</h3>
              </div>
              {topClientes.length > 0 ? (
                <div className="space-y-3">
                  {topClientes.map((cliente, index) => (
                    <button
                      key={cliente.id}
                      onClick={() => handleClienteClick(cliente.id, cliente.nombre)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                          index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.cantidadCotizaciones} cotización{cliente.cantidadCotizaciones !== 1 ? 'es' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(cliente.montoTotal)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No hay datos de clientes para mostrar
                </div>
              )}
            </div>

            {/* Tendencia 6 meses */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-bold text-foreground text-lg mb-4">📈 Cotizaciones Creadas (6 meses)</h3>
              {trendLast6Months.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendLast6Months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="mes"
                      stroke={tickColor}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={tickColor}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="circle"
                    />
                    <Line
                      type="monotone"
                      dataKey="creadas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Cotizaciones Creadas"
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No hay datos de tendencia para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Gráficos y Tabla */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Estado */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-bold mb-4 text-foreground text-lg">📊 Distribución por Estado</h3>
              {chartData.length > 0 ? (
                <QuotesFunnelChart data={chartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos de cotizaciones para mostrar.
                </div>
              )}
            </div>

            {/* Cotizaciones Recientes */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground text-lg">📋 Actividad Reciente</h3>
                <button
                  onClick={() => navigate('quotes')}
                  className="text-sm text-primary hover:underline"
                >
                  Ver todas →
                </button>
              </div>
              <RecentQuotesTable quotes={recentQuotes} onRowClick={handleQuoteClick} />
            </div>
          </div>
        </>
      ) : (
        /* Tab de Insights con IA */
        <InsightsPanelPro db={db} />
      )}
    </div>
  );
};

export default Dashboard;