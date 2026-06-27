import React, { useState } from 'react';
import { LogOut, ChevronDown, Menu, Settings, Store, Check, AlertCircle, Loader2, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePuntoVenta } from '../../contexts/PuntoVentaContext';
import { NotificationBell } from './NotificationBell';
import { toast } from '../ui/Toast';

/**
 * Selector de Punto de Venta en el header.
 *
 * Lista TODOS los PVs registrados (activos e inactivos) y permite al cajero
 * activar uno con un click. La activación se persiste en BD vía
 * `POST /api/PuntoVentaSiat/{suc}/{pv}/activar` (transacción atómica: desactiva
 * los demás, activa el seleccionado) y se re-fetchea la lista.
 *
 * Estados visuales:
 *   - 0 PVs registrados → "Sin PV registrado" en rojo.
 *   - 1+ PVs (al menos 1 activo) → dropdown con todos los PVs; el activo
 *     resaltado con check verde, los inactivos en gris con ícono Power.
 *   - Mientras `activar` corre → ícono Loader2 girando, dropdown deshabilitado.
 */
const PuntoVentaSelector: React.FC = () => {
  const { puntoVentaActual, puntosVentaDisponibles, cargando, activando, error, activar } = usePuntoVenta();
  const [abierto, setAbierto] = useState(false);

  const totalPvs = puntosVentaDisponibles.length;
  const sinPvs = !cargando && totalPvs === 0;

  const label = cargando
    ? 'Cargando PV…'
    : sinPvs
      ? 'Sin PV registrado'
      : (puntoVentaActual?.Nombre ?? 'Sin PV activo');

  const detalle = !cargando && !sinPvs && puntoVentaActual
    ? `Suc ${puntoVentaActual.CodigoSucursal} · PV ${puntoVentaActual.CodigoPuntoVenta}`
    : undefined;

  // Caso 0 PVs registrados: badge plano sin dropdown.
  if (sinPvs) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
          error
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-coffee-200 bg-coffee-50 text-coffee-700'
        }`}
        title={error || 'No hay PuntosVentaSiat registrados en la BD. Agregar al menos uno.'}
      >
        {error ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Store className="h-4 w-4" />
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-tight">{label}</p>
        </div>
      </div>
    );
  }

  const handleClickItem = async (pv: typeof puntosVentaDisponibles[number]) => {
    // Cerrar el dropdown antes de la acción async.
    setAbierto(false);

    if (pv.Activo) {
      // Ya es el activo actual: no-op silencioso.
      return;
    }

    try {
      await activar(pv.CodigoSucursal, pv.CodigoPuntoVenta);
      toast.success('Punto de venta cambiado', `Ahora activo: ${pv.Nombre}.`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo cambiar el PV.';
      toast.error('Error al cambiar PV', mensaje);
    }
  };

  return (
    <div className="relative">
      <details
        className="group"
        open={abierto}
        onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}
      >
        <summary
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-coffee-200 transition-colors cursor-pointer list-none ${
            activando
              ? 'bg-coffee-100 opacity-70 cursor-wait'
              : 'bg-coffee-50 hover:bg-coffee-100'
          }`}
          title={error || detalle || label}
        >
          {activando ? (
            <Loader2 className="h-4 w-4 text-coffee-700 animate-spin" />
          ) : (
            <Store className="h-4 w-4 text-coffee-700" />
          )}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-coffee-900 leading-tight">{label}</p>
            {detalle && (
              <p className="text-xs text-coffee-500 leading-tight">{detalle}</p>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-coffee-500" />
        </summary>
        <div className="absolute right-0 mt-1 min-w-64 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 z-30">
          <p className="px-4 py-1.5 text-xs uppercase tracking-wide text-coffee-500">
            Cambiar de punto de venta
          </p>
          {error && (
            <p className="px-4 py-1.5 text-xs text-red-600 border-b border-coffee-100">
              {error}
            </p>
          )}
          {puntosVentaDisponibles.map((pv) => {
            const esActual = pv.Activo;
            return (
              <button
                key={`${pv.CodigoSucursal}-${pv.CodigoPuntoVenta}`}
                disabled={activando}
                onClick={(e) => {
                  e.preventDefault();
                  void handleClickItem(pv);
                }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  esActual
                    ? 'text-coffee-700 bg-coffee-50 hover:bg-coffee-100'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                title={
                  esActual
                    ? 'Este es el punto de venta activo'
                    : `Activar ${pv.Nombre} (desactivará el actual)`
                }
              >
                <span className="flex items-center gap-2">
                  {esActual ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Power className="h-4 w-4 text-gray-400" />
                  )}
                  <span>
                    <span
                      className={`block leading-tight ${esActual ? 'font-medium' : ''}`}
                    >
                      {pv.Nombre}
                      {esActual && (
                        <span className="ml-2 text-xs text-emerald-600 font-normal">
                          Actual
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-coffee-500 leading-tight">
                      Suc {pv.CodigoSucursal} · PV {pv.CodigoPuntoVenta}
                    </span>
                  </span>
                </span>
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
