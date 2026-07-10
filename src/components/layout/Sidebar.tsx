import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Home,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Coffee,
  FlaskConical,
  Star,
} from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavItem[];
  groupLabel?: string;
  allowedRoles?: string[];
}

const ADMIN = 'admin';
const CAJERO = 'cajero';
const MESERO = 'mesero';

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    path: '/',
    allowedRoles: [ADMIN],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: <Package className="h-5 w-5" />,
    path: '/inventory',
    allowedRoles: [ADMIN, CAJERO],
    children: [
      { id: 'products', label: 'Comprados', icon: null, path: '/inventory/products', groupLabel: 'Productos', allowedRoles: [ADMIN, CAJERO] },
      { id: 'elaborados', label: 'Elaborados', icon: null, path: '/inventory/elaborados', allowedRoles: [ADMIN, CAJERO] },
      { id: 'combos', label: 'Combos', icon: null, path: '/inventory/combos', allowedRoles: [ADMIN, CAJERO] },
      { id: 'categories', label: 'Categorías', icon: null, path: '/inventory/categories', groupLabel: 'Gestión', allowedRoles: [ADMIN, CAJERO] },
      { id: 'variations', label: 'Variaciones', icon: null, path: '/inventory/variations', allowedRoles: [ADMIN, CAJERO] },
      { id: 'adjustments', label: 'Ajustes', icon: null, path: '/inventory/adjustments', allowedRoles: [ADMIN, CAJERO] },
      { id: 'kardex', label: 'Kardex', icon: null, path: '/inventory/kardex', allowedRoles: [ADMIN, CAJERO] },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    icon: <ShoppingCart className="h-5 w-5" />,
    path: '/sales',
    allowedRoles: [ADMIN, MESERO, CAJERO],
    children: [
      { id: 'pos', label: 'Punto de Venta', icon: null, path: '/sales/pos', allowedRoles: [ADMIN, MESERO, CAJERO] },
      { id: 'sales-list', label: 'Ventas', icon: null, path: '/sales', allowedRoles: [ADMIN, CAJERO] },
      { id: 'customers', label: 'Clientes', icon: null, path: '/sales/customers', allowedRoles: [ADMIN, CAJERO] },
    ],
  },
  {
    id: 'fidelizacion',
    label: 'Fidelización',
    icon: <Star className="h-5 w-5" />,
    path: '/fidelizacion',
    allowedRoles: [ADMIN, CAJERO],
    children: [
      { id: 'fidelizacion-inicio',         label: 'Clientes',                   icon: null, path: '/fidelizacion',                          allowedRoles: [ADMIN, CAJERO] },
      { id: 'fidelizacion-config',         label: 'Configuración de puntos',    icon: null, path: '/fidelizacion/config',                   groupLabel: 'Configuración', allowedRoles: [ADMIN] },
      { id: 'fidelizacion-productos',      label: 'Productos canjeables',        icon: null, path: '/fidelizacion/productos',               allowedRoles: [ADMIN] },
      { id: 'fidelizacion-promos-perm',    label: 'Promociones permanentes',     icon: null, path: '/fidelizacion/promociones-permanentes',  groupLabel: 'Promociones', allowedRoles: [ADMIN] },
      { id: 'fidelizacion-promos-temp',    label: 'Promociones de temporada',    icon: null, path: '/fidelizacion/promociones-temporada',    allowedRoles: [ADMIN] },
      { id: 'fidelizacion-hitos',          label: 'Hitos por compra',            icon: null, path: '/fidelizacion/hitos',                   allowedRoles: [ADMIN] },
      { id: 'fidelizacion-sorteos',        label: 'Sorteos',                     icon: null, path: '/fidelizacion/sorteos',                 allowedRoles: [ADMIN] },
      { id: 'fidelizacion-referidos',      label: 'Referidos',                   icon: null, path: '/fidelizacion/referidos',               allowedRoles: [ADMIN] },
      { id: 'fidelizacion-notifs',         label: 'Notificaciones',              icon: null, path: '/fidelizacion/notificaciones',           allowedRoles: [ADMIN] },
    ],
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: <Truck className="h-5 w-5" />,
    path: '/purchases',
    allowedRoles: [ADMIN],
    children: [
      { id: 'orders', label: 'Órdenes de Compra', icon: null, path: '/purchases/orders' },
      { id: 'suppliers', label: 'Proveedores', icon: null, path: '/purchases/suppliers' },
    ],
  },
  {
    id: 'cash',
    label: 'Caja',
    icon: <Wallet className="h-5 w-5" />,
    path: '/cash',
    allowedRoles: [ADMIN, CAJERO],
    children: [
      { id: 'register', label: 'Caja', icon: null, path: '/cash/register' },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    allowedRoles: [ADMIN],
    children: [
      { id: 'inventory-reports', label: 'Inventario', icon: null, path: '/reports/inventory' },
      { id: 'sales-reports', label: 'Ventas', icon: null, path: '/reports/sales' },
      { id: 'purchase-reports', label: 'Compras', icon: null, path: '/reports/purchases' },
      { id: 'cash-reports', label: 'Caja', icon: null, path: '/reports/cash' },
      { id: 'daily-reports', label: 'Reporte Diario (Caja)', icon: null, path: '/reports/daily', allowedRoles: [ADMIN, CAJERO] },
      { id: 'monthly-reports', label: 'Reporte Mensual (Productos)', icon: null, path: '/reports/monthly', allowedRoles: [ADMIN, CAJERO] },
    ],
  },
  {
    id: 'recipes',
    label: 'Recetas y Costos',
    icon: <FlaskConical className="h-5 w-5" />,
    path: '/recipes',
    allowedRoles: [ADMIN, CAJERO],
    children: [
      { id: 'insumos', label: 'Insumos', icon: null, path: '/recipes/insumos' },
      { id: 'recetas', label: 'Recetas', icon: null, path: '/recipes/recetas' },
    ],
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings',
    allowedRoles: [ADMIN, CAJERO, MESERO],
  },
];

function filterNavItems(items: NavItem[], userRole: string): NavItem[] {
  return items
    .filter((item) => !item.allowedRoles || item.allowedRoles.includes(userRole))
    .map((item) => ({
      ...item,
      children: item.children
        ? item.children.filter((child) => !child.allowedRoles || child.allowedRoles.includes(userRole))
        : undefined,
    }));
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUI();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const activeParent = visibleNavItems.find(item =>
      item.children?.some(child => location.pathname === child.path)
    );
    if (activeParent) {
      setExpandedItems(prev =>
        prev.includes(activeParent.id) ? prev : [...prev, activeParent.id]
      );
    }
  }, [location.pathname]);

  const collapsed = isMobile ? false : sidebarCollapsed;

  const userRole = (user?.rol ?? ADMIN).toLowerCase();
  const visibleNavItems = filterNavItems(navItems, userRole);

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.children?.some((child) => location.pathname === child.path);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      if (collapsed) {
        navigate(item.children[0].path);
        closeMobileSidebar();
      } else {
        toggleExpand(item.id);
      }
    } else {
      navigate(item.path);
      closeMobileSidebar();
    }
  };

  const userDisplayName = user?.nombre || 'Usuario';
  const userInitials = userDisplayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';
  const userEmail = user?.email ?? '';

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-cafe-sidebar text-white transition-all duration-300',
        'flex flex-col z-40',
        'md:translate-x-0',
        sidebarCollapsed ? 'md:w-20' : 'md:w-64',
        'w-64',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-coffee-700">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-cream rounded-lg flex items-center justify-center">
            <Coffee className="h-6 w-6 text-coffee-700" />
          </div>
          {!collapsed && (
            <span className="font-display text-xl font-bold">Kafe-Yana</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="hidden md:block p-2 rounded-lg hover:bg-coffee-700 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'text-left',
                  isActive(item.path) || isParentActive(item)
                    ? 'bg-coffee-600 text-white'
                    : 'text-coffee-200 hover:bg-coffee-700 hover:text-white'
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.children && (
                      <ChevronRight
                        className={clsx(
                          'h-4 w-4 transition-transform',
                          expandedItems.includes(item.id) && 'rotate-90'
                        )}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Submenu */}
              {!collapsed && item.children && expandedItems.includes(item.id) && (
                <ul className="mt-1 ml-10 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      {child.groupLabel && (
                        <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-coffee-500">
                          {child.groupLabel}
                        </p>
                      )}
                      <button
                        onClick={() => { navigate(child.path); closeMobileSidebar(); }}
                        className={clsx(
                          'w-full px-3 py-2 text-sm rounded-lg transition-colors text-left',
                          isActive(child.path)
                            ? 'bg-coffee-600 text-white'
                            : 'text-coffee-300 hover:bg-coffee-700 hover:text-white'
                        )}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-coffee-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center">
              <span className="text-coffee-700 font-medium">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userDisplayName}</p>
              <p className="text-xs text-coffee-400 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
};
