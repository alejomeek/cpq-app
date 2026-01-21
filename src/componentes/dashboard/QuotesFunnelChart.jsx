import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from 'recharts';
import { useTheme } from '@/ui/theme-provider';

// Configuración de colores y iconos por estado
const stateConfig = {
  'Borrador': {
    color: 'hsl(var(--chart-3))', // Azul claro
    icon: '📝',
    gradient: ['hsl(var(--chart-3))', 'hsl(217 91% 70%)']
  },
  'Enviada': {
    color: 'hsl(var(--chart-2))', // Cian
    icon: '📨',
    gradient: ['hsl(var(--chart-2))', 'hsl(199 89% 60%)']
  },
  'Ganada': {
    color: 'hsl(142 76% 36%)', // Verde
    icon: '✅',
    gradient: ['hsl(142 76% 36%)', 'hsl(142 76% 50%)']
  },
  'Perdida': {
    color: 'hsl(var(--destructive))', // Rojo
    icon: '❌',
    gradient: ['hsl(var(--destructive))', 'hsl(0 84% 65%)']
  }
};

// Tooltip personalizado mejorado
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const config = stateConfig[data.name] || {};

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{config.icon}</span>
        <span className="font-semibold text-popover-foreground">{data.name}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cantidad:</span>
          <span className="font-bold text-popover-foreground">{data.value}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Porcentaje:</span>
          <span className="font-bold" style={{ color: config.color }}>
            {data.percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Label personalizado que muestra valor y porcentaje
const CustomLabel = (props) => {
  const { x, y, width, height, value, name, percentage } = props;

  if (!name || value === undefined) return null;

  const config = stateConfig[name] || {};

  return (
    <g>
      {/* Valor numérico */}
      <text
        x={x + width + 12}
        y={y + height / 2}
        fill="hsl(var(--foreground))"
        fontSize={15}
        fontWeight="700"
        dominantBaseline="middle"
      >
        {value}
      </text>
      {/* Porcentaje */}
      <text
        x={x + width + 42}
        y={y + height / 2}
        fill="hsl(var(--muted-foreground))"
        fontSize={13}
        fontWeight="500"
        dominantBaseline="middle"
      >
        ({percentage}%)
      </text>
    </g>
  );
};

// Label del eje Y con icono y nombre
const CustomYAxisTick = ({ x, y, payload }) => {
  const config = stateConfig[payload.value] || {};

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        fill="hsl(var(--foreground))"
        fontSize={13}
        fontWeight="500"
      >
        {config.icon} {payload.value}
      </text>
    </g>
  );
};

export const QuotesFunnelChart = ({ data }) => {
  const { theme } = useTheme();

  // Procesar y ordenar datos
  const chartData = useMemo(() => {
    // Calcular total
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Agregar porcentaje y ordenar de mayor a menor
    return data
      .map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
        fill: stateConfig[item.name]?.color || 'hsl(var(--muted))'
      }))
      .sort((a, b) => b.value - a.value); // Ordenar descendente
  }, [data]);

  const tickColor = theme === 'dark'
    ? 'hsl(var(--muted-foreground))'
    : 'hsl(var(--foreground))';

  // Calcular el valor máximo y generar ticks apropiados
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;

  // Redondear hacia arriba para tener un máximo "bonito"
  const maxAxisValue = Math.ceil(maxValue * 1.1); // 10% más que el máximo para dar espacio

  // Generar ticks - dependiendo del rango
  let xAxisTicks;
  if (maxAxisValue <= 10) {
    // Si es 10 o menos, mostrar cada número
    xAxisTicks = Array.from({ length: maxAxisValue + 1 }, (_, i) => i);
  } else if (maxAxisValue <= 20) {
    // Si es entre 11-20, mostrar de 2 en 2
    xAxisTicks = Array.from({ length: Math.floor(maxAxisValue / 2) + 1 }, (_, i) => i * 2);
  } else {
    // Si es más de 20, mostrar de 5 en 5
    xAxisTicks = Array.from({ length: Math.floor(maxAxisValue / 5) + 1 }, (_, i) => i * 5);
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 100, left: 10, bottom: 10 }}
      >
        <defs>
          {/* Definir gradientes para cada estado */}
          {Object.entries(stateConfig).map(([key, config]) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={config.gradient[0]} stopOpacity={0.8} />
              <stop offset="100%" stopColor={config.gradient[1]} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          horizontal={false}
          strokeOpacity={0.3}
        />

        <XAxis
          type="number"
          stroke={tickColor}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ fill: tickColor }}
          domain={[0, maxAxisValue]}
          ticks={xAxisTicks}
        />

        <YAxis
          type="category"
          dataKey="name"
          stroke={tickColor}
          fontSize={13}
          tickLine={false}
          axisLine={false}
          tickMargin={5}
          width={160}
          tick={<CustomYAxisTick />}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />

        <Bar
          dataKey="value"
          radius={[0, 8, 8, 0]}
          maxBarSize={45}
          label={<CustomLabel />}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`url(#gradient-${entry.name})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};