import React from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '../../utils';

interface Activity {
  id: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'alert' | 'success';
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

interface RecentActivityProps {
  activities: Activity[];
  title?: string;
  maxItems?: number;
  className?: string;
  onViewSaleDetail?: (saleId: string) => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  title = 'Actividad Reciente',
  maxItems = 10,
  className,
  onViewSaleDetail,
}) => {
  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      sale: <ShoppingCart className="h-4 w-4" />,
      purchase: <Package className="h-4 w-4" />,
      adjustment: <TrendingUp className="h-4 w-4" />,
      alert: <AlertTriangle className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      sale: 'bg-green-100 text-green-600',
      purchase: 'bg-blue-100 text-blue-600',
      adjustment: 'bg-yellow-100 text-yellow-600',
      alert: 'bg-red-100 text-red-600',
      success: 'bg-green-100 text-green-600',
    };
    return colors[type];
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    return format(date, 'dd MMM', { locale: es });
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-coffee-900">{title}</h3>
        <Clock className="h-5 w-5 text-coffee-400" />
      </div>
      <div className="divide-y divide-coffee-100">
        {displayActivities.length === 0 ? (
          <div className="px-6 py-8 text-center text-coffee-500">
            No hay actividad reciente
          </div>
        ) : (
          displayActivities.map((activity) => (
            <div
              key={activity.id}
              className={clsx(
                'px-6 py-4 transition-colors',
                activity.type === 'sale' && onViewSaleDetail ? 'hover:bg-coffee-50 cursor-pointer' : ''
              )}
              onClick={() => {
                if (activity.type === 'sale' && onViewSaleDetail) {
                  onViewSaleDetail(activity.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    getActivityColor(activity.type)
                  )}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-900">
                    {activity.title}
                  </p>
                  <p className="text-sm text-coffee-500">{activity.description}</p>
                  {activity.amount && (
                    <p className="mt-1 text-sm font-semibold text-coffee-700">
                      {formatCurrency(activity.amount)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activity.type === 'sale' && onViewSaleDetail && (
                    <Eye className="h-4 w-4 text-coffee-400" />
                  )}
                  <span className="flex-shrink-0 text-xs text-coffee-400">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Low Stock Alert
interface LowStockAlertProps {
  products: Array<{
    id: string;
    name: string;
    stock: number;
    minStock: number;
  }>;
  className?: string;
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({
  products,
  className,
}) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-coffee-900">
          Productos con Bajo Stock
        </h3>
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      </div>
      <div className="divide-y divide-coffee-100">
        {products.length === 0 ? (
          <div className="px-6 py-8 text-center text-coffee-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No hay productos con bajo stock</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="px-6 py-3 hover:bg-coffee-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-coffee-900">{product.name}</p>
                  <p className="text-xs text-coffee-500">
                    Mínimo: {product.minStock} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className={clsx(
                    'text-sm font-semibold',
                    product.stock === 0 ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    {product.stock} unidades
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};