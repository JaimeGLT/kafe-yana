import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { clsx } from 'clsx';

interface RevenueChartProps {
  data: Array<{
    day: string;
    revenue: number;
    expenses: number;
  }>;
  title?: string;
  className?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Ingresos del Mes',
  className,
}) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-coffee-100">
        <h3 className="text-lg font-display font-semibold text-coffee-900">{title}</h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
            <XAxis
              dataKey="day"
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
                if (name === 'revenue') return [`Bs ${Number(value).toLocaleString()}`, 'Ingresos'];
                return [`Bs ${Number(value).toLocaleString()}`, 'Gastos'];
              }}
            />
            <Bar dataKey="revenue" fill="#8B4513" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#D4A574" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};