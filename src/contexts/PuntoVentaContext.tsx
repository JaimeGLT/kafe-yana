import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';

export interface PuntoVentaSeleccionado {
  CodigoSucursal: number;
  CodigoPuntoVenta: number;
  Nombre: string;
  Activo: boolean;
}

/** Shape que devuelve GET /api/PuntoVentaSiat/todos. El backend serializa en
 * PascalCase porque Program.cs setea `JsonSerializerOptions.PropertyNamingPolicy = null`
 * para los controllers REST. (El resto de la app consume vía GraphQL, que sí usa
 * camelCase por default.) */
interface PuntoVentaSiatTodos {
  CodigoSucursal: number;
  CodigoPuntoVenta: number;
  Nombre: string;
  Activo: boolean;
}

interface PuntoVentaContextValue {
  /** PV actualmente seleccionado (null si no hay ninguno activo o no terminó de cargar). */
  puntoVentaActual: PuntoVentaSeleccionado | null;
  /** Lista completa de PVs (activos e inactivos) devueltos por el backend. */
  puntosVentaDisponibles: PuntoVentaSeleccionado[];
  /** true mientras se hace el fetch inicial. */
  cargando: boolean;
  /** Mensaje de error si el fetch falló (string vacío si no). */
  error: string;
  /** Cambia el PV activo y lo persiste en localStorage (uso local; para activar en BD usar `activar`). */
  seleccionar: (pv: PuntoVentaSeleccionado) => void;
  /** Vuelve a fetchear la lista completa de PVs del backend. */
  refrescar: () => Promise<void>;
  /** Activa el PV indicado en BD (single-active) y refresca la lista. */
  activar: (codigoSucursal: number, codigoPuntoVenta: number) => Promise<void>;
  /** true mientras una operación de `activar` está en curso. */
  activando: boolean;
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
      typeof parsed?.CodigoSucursal === 'number' &&
      typeof parsed?.CodigoPuntoVenta === 'number' &&
      typeof parsed?.Nombre === 'string' &&
      typeof parsed?.Activo === 'boolean'
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
 * - Al montar: GET /api/PuntoVentaSiat/todos para obtener TODOS los PVs
 *   (activos e inactivos). El dropdown del header muestra el catálogo
 *   completo y permite activar otro.
 * - Auto-selección (single-active):
 *     • Si hay 1 activo en la lista → ese.
 *     • Si hay >1 activos (estado inválido) → el primero de la lista.
 *     • Si hay 0 activos → null.
 *     • Si la lista es no vacía pero todos están inactivos → null también.
 * - Cada activación pasa por `POST /api/PuntoVentaSiat/{suc}/{pv}/activar`,
 *   que desactiva los demás y activa el seleccionado en una transacción
 *   atómica del backend.
 * - El PV activo se persiste en localStorage (clave `kafeyana.pv.activo`).
 *
 * El frontend debe leer `puntoVentaActual` y enviar `codigoSucursal/codigoPuntoVenta`
 * en los cobros (POST /api/Venta/cobrar, POST /api/Mesa/cobrar/{id}, etc).
 * Ver [[kafeyana-multipv-resolver]] para la justificación.
 */
export const PuntoVentaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [puntosVentaDisponibles, setPuntosVentaDisponibles] = useState<PuntoVentaSeleccionado[]>([]);
  const [puntoVentaActual, setPuntoVentaActual] = useState<PuntoVentaSeleccionado | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [activando, setActivando] = useState<boolean>(false);
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
      const disponibles = await api.get<PuntoVentaSiatTodos[]>('/PuntoVentaSiat/todos');
      const normalizados: PuntoVentaSeleccionado[] = (disponibles ?? []).map((p) => ({
        CodigoSucursal: p.CodigoSucursal,
        CodigoPuntoVenta: p.CodigoPuntoVenta,
        Nombre: p.Nombre,
        Activo: p.Activo,
      }));
      setPuntosVentaDisponibles(normalizados);

      // Auto-selección (single-active):
      //  - Si hay exactamente 1 PV activo → ese.
      //  - Si hay >1 activos (estado inválido, debería ser imposible) → el primero.
      //  - Si hay 0 activos → null.
      // Si además hay un PV persistido en localStorage y matchea con uno activo
      // de la lista, se prefiere el persistido (mantiene la selección del cajero
      // entre recargas).
      const activos = normalizados.filter((p) => p.Activo);
      const persistido = leerPersistente();
      let seleccionado: PuntoVentaSeleccionado | null = null;

      if (activos.length === 1) {
        seleccionado = activos[0];
      } else if (activos.length > 1) {
        seleccionado =
          persistido &&
          activos.some(
            (p) =>
              p.CodigoSucursal === persistido.CodigoSucursal &&
              p.CodigoPuntoVenta === persistido.CodigoPuntoVenta,
          )
            ? persistido
            : activos[0];
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

  /**
   * Activa el PV indicado en BD (single-active toggle). El backend desactiva
   * todos los demás y activa el seleccionado en una transacción atómica.
   * Después re-fetchea la lista para reflejar el nuevo estado y auto-selecciona
   * el recién activado.
   */
  const activar = useCallback(
    async (codigoSucursal: number, codigoPuntoVenta: number) => {
      setActivando(true);
      try {
        await api.post(`/PuntoVentaSiat/${codigoSucursal}/${codigoPuntoVenta}/activar`);
        await cargar(); // re-fetch + re-auto-select
      } catch (err) {
        const mensaje =
          err instanceof ApiError
            ? err.message
            : 'No se pudo activar el punto de venta.';
        setError(mensaje);
        throw err;
      } finally {
        setActivando(false);
      }
    },
    [cargar],
  );

  const value = useMemo<PuntoVentaContextValue>(
    () => ({
      puntoVentaActual,
      puntosVentaDisponibles,
      cargando,
      error,
      seleccionar,
      refrescar,
      activar,
      activando,
    }),
    [puntoVentaActual, puntosVentaDisponibles, cargando, error, seleccionar, refrescar, activar, activando],
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
