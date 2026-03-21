import React from 'react';
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
} from 'lucide-react';
import { useUIStore } from '../../stores';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    path: '/',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: <Package className="h-5 w-5" />,
    path: '/inventory',
    children: [
      { id: 'products', label: 'Productos', icon: null, path: '/inventory/products' },
      { id: 'elaborados', label: 'Elaborados', icon: null, path: '/inventory/elaborados' },
      { id: 'combos', label: 'Combos', icon: null, path: '/inventory/combos' },
      { id: 'categories', label: 'Categorías', icon: null, path: '/inventory/categories' },
      { id: 'variations', label: 'Variaciones', icon: null, path: '/inventory/variations' },
      { id: 'adjustments', label: 'Ajustes', icon: null, path: '/inventory/adjustments' },
      { id: 'kardex', label: 'Kardex', icon: null, path: '/inventory/kardex' },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    icon: <ShoppingCart className="h-5 w-5" />,
    path: '/sales',
    children: [
      { id: 'pos', label: 'Punto de Venta', icon: null, path: '/sales/pos' },
      { id: 'quotes', label: 'Cotizaciones', icon: null, path: '/sales/quotes' },
      { id: 'invoices', label: 'Facturas', icon: null, path: '/sales/invoices' },
      { id: 'customers', label: 'Clientes', icon: null, path: '/sales/customers' },
    ],
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: <Truck className="h-5 w-5" />,
    path: '/purchases',
    children: [
      { id: 'orders', label: 'Órdenes de Compra', icon: null, path: '/purchases/orders' },
      { id: 'suppliers', label: 'Proveedores', icon: null, path: '/purchases/suppliers' },
      { id: 'payables', label: 'Cuentas por Pagar', icon: null, path: '/purchases/payables' },
    ],
  },
  {
    id: 'cash',
    label: 'Caja',
    icon: <Wallet className="h-5 w-5" />,
    path: '/cash',
    children: [
      { id: 'register', label: 'Caja', icon: null, path: '/cash/register' },
      { id: 'movements', label: 'Movimientos', icon: null, path: '/cash/movements' },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    children: [
      { id: 'inventory-reports', label: 'Inventario', icon: null, path: '/reports/inventory' },
      { id: 'sales-reports', label: 'Ventas', icon: null, path: '/reports/sales' },
      { id: 'purchase-reports', label: 'Compras', icon: null, path: '/reports/purchases' },
      { id: 'cash-reports', label: 'Caja', icon: null, path: '/reports/cash' },
    ],
  },
  {
    id: 'recipes',
    label: 'Recetas y Costos',
    icon: <FlaskConical className="h-5 w-5" />,
    path: '/recipes',
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
    children: [
      { id: 'users', label: 'Usuarios', icon: null, path: '/settings/users' },
      { id: 'roles', label: 'Roles', icon: null, path: '/settings/roles' },
      { id: 'branches', label: 'Sucursales', icon: null, path: '/settings/branches' },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

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
      if (sidebarCollapsed) {
        navigate(item.children[0].path);
      } else {
        toggleExpand(item.id);
      }
    } else {
      navigate(item.path);
    }
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-cafe-sidebar text-white transition-all duration-300',
        'flex flex-col z-30',
        sidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-coffee-700">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-cream rounded-lg flex items-center justify-center">
            <Coffee className="h-6 w-6 text-coffee-700" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-display text-xl font-bold">Kafe-Yana</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-coffee-700 transition-colors"
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
          {navItems.map((item) => (
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
                {!sidebarCollapsed && (
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
              {!sidebarCollapsed && item.children && expandedItems.includes(item.id) && (
                <ul className="mt-1 ml-10 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => navigate(child.path)}
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
      {!sidebarCollapsed && (
        <div className="px-4 py-4 border-t border-coffee-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center">
              <span className="text-coffee-700 font-medium">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Administrador</p>
              <p className="text-xs text-coffee-400 truncate">admin@kafe-yana.com</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};