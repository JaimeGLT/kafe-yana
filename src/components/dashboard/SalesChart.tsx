import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { clsx } from 'clsx';

interface SalesChartProps {
  data: Array<{
    hour: string;
    sales: number;
    orders: number;
  }>;
  title?: string;
  className?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  title = 'Ventas por Hora',
  className,
}) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-coffee-100">
        <h3 className="text-lg font-display font-semibold text-coffee-900">{title}</h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B4513" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B4513" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
            <XAxis
              dataKey="hour"
              stroke="#8B4513"
              tick={{ fill: '#8B4513', fontSize: 12 }}
            />
            <YAxis
              stroke="#8B4513"
              tick={{ fill: '#8B4513', fontSize: 12 }}
              tickFormatter={(value) => `Bs ${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFBF5',
                border: '1px solid #E8D5C4',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                if (name === 'sales') return [`Bs ${Number(value).toLocaleString()}`, 'Ventas'];
                return [value, 'Órdenes'];
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#8B4513"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};