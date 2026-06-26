import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';

export interface PuntoVentaSeleccionado {
  codigoSucursal: number;
  codigoPuntoVenta: number;
  nombre: string;
}

/** Shape que devuelve GET /api/PuntoVentaSiat/activos. */
interface PuntoVentaSiatActivo {
  codigoSucursal: number;
  codigoPuntoVenta: number;
  nombre: string;
}

interface PuntoVentaContextValue {
  /** PV actualmente seleccionado (null si no hay ninguno activo o no terminó de cargar). */
  puntoVentaActual: PuntoVentaSeleccionado | null;
  /** Lista de PVs activos devueltos por el backend. */
  puntosVentaDisponibles: PuntoVentaSeleccionado[];
  /** true mientras se hace el fetch inicial. */
  cargando: boolean;
  /** Mensaje de error si el fetch falló (string vacío si no). */
  error: string;
  /** Cambia el PV activo y lo persiste en localStorage. */
  seleccionar: (pv: PuntoVentaSeleccionado) => void;
  /** Vuelve a fetchear la lista de PVs activos del backend. */
  refrescar: () => Promise<void>;
}

const PuntoVentaContext = createContext<PuntoVentaContextValue | null>(null);

const LS_KEY = 'kafeyana.pv.activo';
const LS_KEY_LEGACY = 'kafeyana.puntoVenta.seleccionado';

function leerPersistente(): PuntoVentaSeleccionado | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PuntoVentaSeleccionado;
    if (
      typeof parsed?.codigoSucursal === 'number' &&
      typeof parsed?.codigoPuntoVenta === 'number' &&
      typeof parsed?.nombre === 'string'
    ) {
      return parsed;
    }
  } catch {
    // localStorage corrupto o no disponible — ignorar.
  }
  return null;
}

function guardarPersistente(pv: PuntoVentaSeleccionado | null): void {
  try {
    if (pv) {
      window.localStorage.setItem(LS_KEY, JSON.stringify(pv));
    } else {
      window.localStorage.removeItem(LS_KEY);
    }
  } catch {
    // Silenciar errores de cuota o storage deshabilitado.
  }
}

/**
 * Provider que mantiene el PuntoVenta activo del cajero.
 *
 * - Al montar: GET /api/PuntoVentaSiat/activos para obtener la lista.
 * - Auto-selección: si hay 1 → ese. Si hay >1 → lee `localStorage['kafeyana.pv.activo']`;
 *   si no, el primero por orden. Si hay 0 → null.
 * - Cada selección se persiste en localStorage (clave `kafeyana.pv.activo`).
 *
 * El frontend debe leer `puntoVentaActual` y enviar `codigoSucursal/codigoPuntoVenta`
 * en los cobros (POST /api/Venta/cobrar, POST /api/Mesa/cobrar/{id}, etc).
 * Ver [[kafeyana-multipv-resolver]] para la justificación.
 */
export const PuntoVentaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [puntosVentaDisponibles, setPuntosVentaDisponibles] = useState<PuntoVentaSeleccionado[]>([]);
  const [puntoVentaActual, setPuntoVentaActual] = useState<PuntoVentaSeleccionado | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Limpieza one-shot del localStorage legacy (versión anterior del selector).
  useEffect(() => {
    try {
      window.localStorage.removeItem(LS_KEY_LEGACY);
    } catch {
      // Silenciar.
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const disponibles = await api.get<PuntoVentaSiatActivo[]>('/PuntoVentaSiat/activos');
      const normalizados: PuntoVentaSeleccionado[] = (disponibles ?? []).map((p) => ({
        codigoSucursal: p.codigoSucursal,
        codigoPuntoVenta: p.codigoPuntoVenta,
        nombre: p.nombre,
      }));
      setPuntosVentaDisponibles(normalizados);

      // Auto-selección:
      //  - 1 PV → ese.
      //  - >1 PVs → lee de localStorage; si no, el primero.
      //  - 0 PVs → null.
      const persistido = leerPersistente();
      let seleccionado: PuntoVentaSeleccionado | null = null;

      if (normalizados.length === 1) {
        seleccionado = normalizados[0];
      } else if (normalizados.length > 1) {
        seleccionado =
          persistido &&
          normalizados.some(
            (p) =>
              p.codigoSucursal === persistido.codigoSucursal &&
              p.codigoPuntoVenta === persistido.codigoPuntoVenta,
          )
            ? persistido
            : normalizados[0];
      }

      setPuntoVentaActual(seleccionado);
      guardarPersistente(seleccionado);
    } catch (err) {
      const mensaje =
        err instanceof ApiError ? err.message : 'No se pudo cargar la lista de PuntosVenta.';
      setError(mensaje);
      setPuntoVentaActual(null);
      setPuntosVentaDisponibles([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const seleccionar = useCallback((pv: PuntoVentaSeleccionado) => {
    setPuntoVentaActual(pv);
    guardarPersistente(pv);
  }, []);

  const refrescar = useCallback(async () => {
    await cargar();
  }, [cargar]);

  const value = useMemo<PuntoVentaContextValue>(
    () => ({
      puntoVentaActual,
      puntosVentaDisponibles,
      cargando,
      error,
      seleccionar,
      refrescar,
    }),
    [puntoVentaActual, puntosVentaDisponibles, cargando, error, seleccionar, refrescar],
  );

  return <PuntoVentaContext.Provider value={value}>{children}</PuntoVentaContext.Provider>;
};

/**
 * Hook para acceder al PV activo. Lanza error si se usa fuera del provider
 * (no debería pasar en la app real — el provider se monta en App.tsx).
 */
export function usePuntoVenta(): PuntoVentaContextValue {
  const ctx = useContext(PuntoVentaContext);
  if (!ctx) {
    throw new Error('usePuntoVenta debe usarse dentro de <PuntoVentaProvider>.');
  }
  return ctx;
}