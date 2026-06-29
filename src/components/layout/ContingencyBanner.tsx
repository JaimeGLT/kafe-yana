import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * FIX #5 — banner persistente de contingencia SIAT.
 *
 * Polling cada 15s al endpoint backend `GET /api/contingencia/estado`
 * (ContingenciaEstadoController.cs). Muestra al operador el estado real de la
 * contingencia — antes el cajero solo veía un toast efímero "SIAT no responde"
 * y concluía erróneamente que el sistema "siempre falla". Ahora ve:
 *   - Si hay contingencia activa
 *   - Cuántas ventas siguen pendientes de envío al SIN
 *   - El último código de estado de paquete observado (901/904/908)
 *
 * Solo renderiza si `contingenciaActiva === true` o si hay ventas pendientes
 * con tipoEmision=2 (huérfanas FIX #4). Si todo está OK, no muestra nada
 * (cero ruido en operación normal).
 *
 * Ver [[kafeyana-contingencia-siat]].
 */
interface EstadoContingencia {
  contingenciaActiva: boolean;
  ventasPendientes: number;
  ultimoEstadoPaquete: '901' | '904' | '908' | 'NONE';
}

const POLL_INTERVAL_MS = 15_000;

export const ContingencyBanner: React.FC = () => {
  const [estado, setEstado] = useState<EstadoContingencia | null>(null);
  const [ultimoFetchOk, setUltimoFetchOk] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;

    const fetchEstado = async () => {
      try {
        const data = await api.get<EstadoContingencia>('/contingencia/estado');
        if (!cancelado) {
          setEstado(data);
          setUltimoFetchOk(true);
        }
      } catch {
        // Fallo de polling: silencioso. El banner no debe tirar la app.
        if (!cancelado) setUltimoFetchOk(false);
      }
    };

    fetchEstado();
    const id = window.setInterval(fetchEstado, POLL_INTERVAL_MS);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, []);

  // Sin contingencia → no mostrar.
  if (!estado) return null;
  if (!estado.contingenciaActiva && estado.ventasPendientes === 0) return null;

  const color = PickColor(estado);
  const icono = PickIcon(estado);
  const detalle = BuildDetalle(estado);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${color} px-4 py-2 flex items-center gap-3 text-sm border-b`}
    >
      {icono}
      <div className="flex-1">
        <span className="font-semibold">Contingencia SIAT activa.</span>{' '}
        <span>{detalle}</span>
        {!ultimoFetchOk && (
          <span className="ml-2 text-xs opacity-75">(última consulta falló)</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-xs underline opacity-80 hover:opacity-100"
        title="Recargar la página para reintentar la operación"
      >
        Recargar
      </button>
    </div>
  );
};

function PickColor(estado: EstadoContingencia): string {
  if (estado.ultimoEstadoPaquete === '904') {
    return 'bg-orange-50 border-orange-300 text-orange-900';
  }
  if (estado.ultimoEstadoPaquete === '908' && estado.ventasPendientes === 0) {
    return 'bg-green-50 border-green-300 text-green-900';
  }
  // 901 (pendiente) o contingencia activa con ventas pendientes → amarillo.
  return 'bg-yellow-50 border-yellow-300 text-yellow-900';
}

function PickIcon(estado: EstadoContingencia) {
  if (estado.ultimoEstadoPaquete === '908') {
    return <CheckCircle2 className="h-4 w-4 shrink-0" />;
  }
  if (estado.ultimoEstadoPaquete === '904') {
    return <XCircle className="h-4 w-4 shrink-0" />;
  }
  if (estado.ultimoEstadoPaquete === '901') {
    return <Clock className="h-4 w-4 shrink-0" />;
  }
  return <AlertTriangle className="h-4 w-4 shrink-0" />;
}

function BuildDetalle(estado: EstadoContingencia): string {
  const partes: string[] = [];
  partes.push(`${estado.ventasPendientes} venta${estado.ventasPendientes === 1 ? '' : 's'} pendiente${estado.ventasPendientes === 1 ? '' : 's'} de envío al SIN`);

  if (estado.ultimoEstadoPaquete !== 'NONE') {
    partes.push(`último paquete en estado ${estado.ultimoEstadoPaquete}`);
  }

  if (estado.ultimoEstadoPaquete === '901') {
    partes.push('(el SIN está procesando el paquete; esto puede tardar segundos o minutos)');
  } else if (estado.ultimoEstadoPaquete === '904') {
    partes.push('(paquete observado por el SIN — revisá la lista de ventas para el detalle)');
  } else if (estado.ultimoEstadoPaquete === '908') {
    partes.push('(paquete validado — todo OK)');
  }

  return partes.join(' · ');
}

// Re-exporta el ícono RefreshCw por si se quiere agregar botón "Reenviar paquete" en el futuro.
export { RefreshCw };
