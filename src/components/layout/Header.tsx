import React from 'react';
import { LogOut, ChevronDown, Menu, Settings, Store, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePuntoVenta } from '../../contexts/PuntoVentaContext';
import { NotificationBell } from './NotificationBell';

/**
 * Selector de Punto de Venta en el header.
 *
 * Permite al cajero cambiar entre PVs activos desde la UI sin tocar la BD.
 * La selección se persiste en localStorage y se envía en cada cobro.
 *
 * Estados visuales:
 *   - 0 PVs activos → "Sin PV activo" en gris, deshabilitado.
 *   - 1 PV activo   → badge con el nombre (no es interactivo, pero da claridad).
 *   - >1 PVs        → dropdown con check al lado del actual.
 */
const PuntoVentaSelector: React.FC = () => {
  const { puntoVentaActual, puntosVentaDisponibles, cargando, error, seleccionar } = usePuntoVenta();

  const deshabilitado = puntosVentaDisponibles.length === 0;
  const cargandoOCero = cargando || deshabilitado;

  const label =
    cargando
      ? 'Cargando PV…'
      : deshabilitado
        ? 'Sin PV activo'
        : (puntoVentaActual?.nombre ?? 'Seleccionar PV');

  const detalle =
    !cargandoOCero && puntoVentaActual
      ? `Suc ${puntoVentaActual.codigoSucursal} · PV ${puntoVentaActual.codigoPuntoVenta}`
      : undefined;

  const sinDropdown = puntosVentaDisponibles.length <= 1;

  // Sin dropdown → badge simple sin <details>.
  if (sinDropdown) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
          error
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-coffee-200 bg-coffee-50 text-coffee-700'
        }`}
        title={error || detalle || label}
      >
        {error ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Store className="h-4 w-4" />
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-tight">{label}</p>
          {detalle && (
            <p className="text-xs text-coffee-500 leading-tight">{detalle}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <details className="group">
        <summary className="flex items-center gap-2 px-3 py-2 rounded-lg border border-coffee-200 bg-coffee-50 hover:bg-coffee-100 transition-colors cursor-pointer list-none">
          <Store className="h-4 w-4 text-coffee-700" />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-coffee-900 leading-tight">{label}</p>
            {detalle && (
              <p className="text-xs text-coffee-500 leading-tight">{detalle}</p>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-coffee-500" />
        </summary>
        <div className="absolute right-0 mt-1 min-w-56 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 z-30">
          <p className="px-4 py-1.5 text-xs uppercase tracking-wide text-coffee-500">
            Cambiar de punto de venta
          </p>
          {puntosVentaDisponibles.map((pv) => {
            const esActual =
              pv.codigoSucursal === puntoVentaActual?.codigoSucursal &&
              pv.codigoPuntoVenta === puntoVentaActual?.codigoPuntoVenta;
            return (
              <button
                key={`${pv.codigoSucursal}-${pv.codigoPuntoVenta}`}
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open');
                  seleccionar(pv);
                }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-coffee-50 flex items-center justify-between gap-2 text-coffee-700"
              >
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-coffee-500" />
                  <span>
                    <span className="block leading-tight">{pv.nombre}</span>
                    <span className="block text-xs text-coffee-500 leading-tight">
                      Suc {pv.codigoSucursal} · PV {pv.codigoPuntoVenta}
                    </span>
                  </span>
                </span>
                {esActual && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
};

export const Header: React.FC = () => {
  const { toggleMobileSidebar } = useUI();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayUser = user;

  const userMenuItems = [
    { id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: 'Cerrar Sesión', icon: <LogOut className="h-4 w-4" /> },
  ];

  const handleUserMenu = (id: string) => {
    if (id === 'logout') {
      logout()
        .then(() => navigate('/login', { replace: true }));
    } else if (id === 'settings') {
      navigate('/settings');
    }
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
          {user?.rol?.toLowerCase() === 'admin' && <NotificationBell />}

          {/* Selector de Punto de Venta */}
          <PuntoVentaSelector />

          {/* User Menu */}
          <div className="relative">
            <details className="group">
              <summary className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coffee-50 transition-colors cursor-pointer list-none">
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
              </summary>
              <div className="absolute right-0 mt-1 min-w-48 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 z-30">
                {userMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.currentTarget.closest('details')?.removeAttribute('open');
                      handleUserMenu(item.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-coffee-50 flex items-center gap-2 text-coffee-700"
                  >
                    <span className="text-coffee-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
};