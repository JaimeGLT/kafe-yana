import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: 'coffee' | 'green' | 'blue' | 'yellow' | 'red';
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'coffee',
  onClick,
  className,
}) => {
  const colors = {
    coffee: {
      bg: 'bg-coffee-50',
      icon: 'bg-coffee-100 text-coffee-600',
      border: 'border-coffee-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      border: 'border-green-200',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      border: 'border-blue-200',
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'bg-yellow-100 text-yellow-600',
      border: 'border-yellow-200',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      border: 'border-red-200',
    },
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border shadow-sm overflow-hidden',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-coffee-600">{title}</p>
            <h3 className="mt-2 text-3xl font-display font-bold text-coffee-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-coffee-500">{subtitle}</p>
            )}
            {trend && (
              <div className="mt-3 flex items-center gap-1">
                {trend.positive !== false ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={clsx(
                    'text-sm font-medium',
                    trend.positive !== false ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-sm text-coffee-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={clsx('p-3 rounded-lg', colors[color].icon)}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

// KPI Grid
interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  children,
  columns = 4,
  className,
}) => {
  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={clsx('grid gap-6', columnClasses[columns], className)}>
      {children}
    </div>
  );
};