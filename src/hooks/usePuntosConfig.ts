import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/ui/Toast';

// ─── API shapes ───────────────────────────────────────────────────────────────

interface ReglaBaseApi {
  Id: number;
  Cantidad: number;
  Activo: boolean;
}

interface AceleradorApi {
  Id: number;
  Tipo: string;
  TipoAplicacion: 'Suma' | 'Multiplicador';
  Cantidad: number;
  UmbralMonto: number | null;
  HoraInicio: string | null;
  HoraFin: string | null;
  Activo: boolean;
}

// ─── Frontend types ───────────────────────────────────────────────────────────

export type AcceleratorType = 'bonus' | 'multiplier';

export interface Accelerator {
  apiId: number;
  id: string;
  name: string;
  description: string;
  type: AcceleratorType;
  value: number;
  isActive: boolean;
  startTime?: string;
  endTime?: string;
}

export interface PointsConfig {
  bsPerPoint: number;
  accelerators: Accelerator[];
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

const TIPO_MAP: Record<string, { id: string; name: string; description: string }> = {
  Combo: {
    id: 'combo',
    name: 'Compra con combo',
    description: 'Al comprar café + comida juntos',
  },
  CompraAlta: {
    id: 'over100',
    name: 'Compra mayor a Bs. 100',
    description: 'Cuando el total supera ese monto',
  },
  CompraMediana: {
    id: 'over70',
    name: 'Compra mayor a Bs. 70',
    description: 'Cuando el total supera ese monto',
  },
  Cumpleanos: {
    id: 'birthday',
    name: 'Cumpleaños',
    description: 'El día del cumpleaños del cliente',
  },
  HoraValle: {
    id: 'horas_valle',
    name: 'Horas valle',
    description: 'Compras realizadas en el horario de baja afluencia',
  },
};

function mapAcelerador(a: AceleradorApi): Accelerator {
  const meta = TIPO_MAP[a.Tipo] ?? { id: a.Tipo.toLowerCase(), name: a.Tipo, description: '' };
  return {
    apiId: a.Id,
    id: meta.id,
    name: meta.name,
    description: meta.description,
    type: a.TipoAplicacion === 'Multiplicador' ? 'multiplier' : 'bonus',
    value: a.Cantidad,
    isActive: a.Activo,
    startTime: a.HoraInicio?.slice(0, 5) ?? undefined,
    endTime: a.HoraFin?.slice(0, 5) ?? undefined,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePuntosConfig() {
  const [savedConfig, setSavedConfig] = useState<PointsConfig | null>(null);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      setIsLoading(true);
      try {
        const [regla, aceleradores] = await Promise.all([
          api.get<ReglaBaseApi>('/Puntos/config/reglabase'),
          api.get<AceleradorApi[]>('/Puntos/config/aceleradores'),
        ]);

        if (cancelled) return;

        const initial: PointsConfig = {
          bsPerPoint: regla.Cantidad,
          accelerators: aceleradores.map(mapAcelerador),
        };

        setSavedConfig(initial);
        setConfig(initial);
      } catch {
        toast.error('Error al cargar la configuración de puntos');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchConfig();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async () => {
    if (!config || !savedConfig) return;

    setIsSaving(true);
    try {
      const calls: Promise<unknown>[] = [];

      if (config.bsPerPoint !== savedConfig.bsPerPoint) {
        calls.push(
          api.put('/Puntos/config/reglabase', { cantidad: config.bsPerPoint, activo: true })
        );
      }

      for (const acc of config.accelerators) {
        calls.push(
          api.put(`/Puntos/config/aceleradores/${acc.apiId}`, {
            cantidad: acc.value,
            activo: acc.isActive,
            horaInicio: acc.startTime ?? null,
            horaFin: acc.endTime ?? null,
          })
        );
      }

      await Promise.all(calls);
      setSavedConfig(config);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  }, [config, savedConfig]);

  const isDirty = config !== null && JSON.stringify(config) !== JSON.stringify(savedConfig);

  return { config, setConfig, savedConfig, isLoading, isSaving, isDirty, save };
}
