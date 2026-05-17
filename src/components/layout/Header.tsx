import React, { useState, useEffect } from 'react';
import { Bell, LogOut, ChevronDown, Menu, AlertTriangle, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHeaderNotifications } from '../../hooks/useHeaderNotifications';
import type { CriticalStockItem } from '../../types';

interface NotificationItem extends CriticalStockItem {
  severity: 'critical' | 'low';
  unidadCompra?: string;
  stockEnUnidadCompra?: number;
  factorConversion?: number;
}

export const Header: React.FC = () => {
  const { toggleMobileSidebar } = useUI();
  const { currentBranch } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { products, insumos, isLoading } = useHeaderNotifications();
  const isAdmin = user?.rol?.toLowerCase() === 'admin';

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  const displayUser = user;

  const userMenuItems = [
    { id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: 'Cerrar Sesión', icon: <LogOut className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (isLoading) return;

    const insumosCriticos: NotificationItem[] = (insumos as any[])
      .filter((n: any) => n.stock_actual <= n.stock_min * n.factor_conversion)
      .map((n: any) => {
        const stockEnUnidad = n.stock_actual / n.factor_conversion;
        const minEnUnidad = n.stock_min;
        return {
          id: `insumo-${n.id}`,
          name: n.nombre,
          tipo: 'insumo' as const,
          categoryName: n.categoria || 'Sin categoría',
          stock: stockEnUnidad,
          minStock: minEnUnidad,
          unidad: n.unidad_compra,
          unidadCompra: n.unidad_compra,
          stockEnUnidadCompra: stockEnUnidad,
          factorConversion: n.factor_conversion,
          ratio: minEnUnidad > 0 ? stockEnUnidad / minEnUnidad : 1,
          severity: 'critical' as const,
        };
      });

    const compradosCriticos: NotificationItem[] = products
      .filter((n: any) => n.tipo === 'comprado' && n.stock <= n.minStock)
      .map((n: any) => ({
        id: `comprado-${n.id}`,
        name: n.name,
        tipo: 'comprado' as const,
        categoryName: n.categoryName || 'Sin categoría',
        stock: n.stock,
        minStock: n.minStock,
        unidad: undefined,
        ratio: n.minStock > 0 ? n.stock / n.minStock : 1,
        severity: n.stock === 0 ? 'critical' as const : 'low' as const,
      }));

    const all = [...insumosCriticos, ...compradosCriticos].sort((a, b) => a.ratio - b.ratio);
    setNotifications(all.slice(0, 10));
  }, [products, insumos, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserMenu = (id: string) => {
    if (id === 'logout') {
      logout().then(() => navigate('/login', { replace: true }));
    } else if (id === 'settings') {
      navigate('/settings');
    }
  };

  const criticalCount = notifications.filter(n => n.severity === 'critical').length;
  const lowCount = notifications.filter(n => n.severity === 'low').length;

  const getStockIcon = (severity: 'critical' | 'low') => {
    return severity === 'critical' ? (
      <AlertCircle className="h-4 w-4 text-red-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-amber-500" />
    );
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-coffee-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1 flex items-center">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-coffee-50 transition-colors mr-2"
          >
            <Menu className="h-5 w-5 text-coffee-600" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-4">
          {currentBranch && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
              <span className="text-sm text-coffee-600">Sucursal:</span>
              <span className="text-sm font-medium text-coffee-900">{currentBranch.name}</span>
              <ChevronDown className="h-4 w-4 text-coffee-500" />
            </div>
          )}

          {/* Notifications — solo admin */}
          {isAdmin && <div ref={notificationRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-coffee-50 transition-colors"
            >
              <Bell className="h-5 w-5 text-coffee-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-lg border border-coffee-200 shadow-lg z-30 max-h-96 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-coffee-100 flex items-center justify-between">
                  <span className="font-semibold text-coffee-800">Notificaciones de Stock</span>
                  <button
                    onClick={() => navigate('/reports/inventory')}
                    className="text-xs text-cafe-500 hover:text-cafe-700"
                  >
                    Ver todo
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-coffee-400 text-sm">
                      No hay alertas de stock
                    </div>
                  ) : (
                    <div className="divide-y divide-coffee-50">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 hover:bg-coffee-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/reports/inventory');
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {getStockIcon(item.severity)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-coffee-900 truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-coffee-500">
                                {item.tipo === 'insumo' ? 'Insumo' : 'Producto'} • {item.categoryName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-red-600">
                                  Stock: {item.stock.toFixed(1)} {item.unidad || ''}
                                </span>
                                <span className="text-xs text-coffee-400">
                                  Mín: {item.minStock.toFixed(1)} {item.unidad || ''}
                                </span>
                              </div>
                            </div>
                            {item.severity === 'critical' && (
                              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                CRÍTICO
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {criticalCount > 0 && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                    <div className="flex items-center gap-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{criticalCount} crítico{criticalCount !== 1 ? 's' : ''}, {lowCount} bajo{lowCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* User Menu */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coffee-50 transition-colors">
                <div className="w-8 h-8 bg-cream rounded-full flex items-center justify-center">
                  <span className="text-coffee-700 font-medium text-sm">
                    {displayUser?.nombre?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-coffee-900">
                    {displayUser?.nombre}
                  </p>
                  <p className="text-xs text-coffee-500">{displayUser?.rol}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-coffee-500" />
              </button>
            }
            items={userMenuItems}
            onSelect={handleUserMenu}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute z-20 mt-1 min-w-48 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  onSelect(item.id);
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-coffee-50 ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-coffee-500">{item.icon}</span>}
                <span className="text-coffee-700">{item.label}</span>
              </div>
              {item.description && (
                <p className="text-xs text-coffee-500 mt-0.5">{item.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};