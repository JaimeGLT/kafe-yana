import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { clsx } from 'clsx';

interface TopProductsChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  title?: string;
  className?: string;
}

const COLORS = ['#8B4513', '#D4A574', '#C4883A', '#D4B483', '#6B3E0F'];

export const TopProductsChart: React.FC<TopProductsChartProps> = ({
  data,
  title = 'Productos Más Vendidos',
  className,
}) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-coffee-100">
        <h3 className="text-lg font-display font-semibold text-coffee-900">{title}</h3>
      </div>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Chart */}
          <div className="w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFBF5',
                    border: '1px solid #E8D5C4',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value} ventas`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-full sm:w-1/2 flex flex-col justify-center gap-2">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-coffee-700">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-coffee-900">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};