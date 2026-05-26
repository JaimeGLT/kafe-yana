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
  reglaBaseActiva: boolean;
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
  const [isSavingReglaBase, setIsSavingReglaBase] = useState(false);
  const [isSavingAceleradores, setIsSavingAceleradores] = useState(false);

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
          reglaBaseActiva: regla.Activo,
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

  const saveReglaBase = useCallback(async () => {
    if (!config || !savedConfig) return;
    if (config.bsPerPoint === savedConfig.bsPerPoint && config.reglaBaseActiva === savedConfig.reglaBaseActiva) return;

    setIsSavingReglaBase(true);
    try {
      await api.put('/Puntos/config/reglabase', { cantidad: config.bsPerPoint, activo: config.reglaBaseActiva });
      setSavedConfig((prev) => prev ? { ...prev, bsPerPoint: config.bsPerPoint, reglaBaseActiva: config.reglaBaseActiva } : prev);
      toast.success('Regla base guardada');
    } catch {
      toast.error('Error al guardar la regla base');
    } finally {
      setIsSavingReglaBase(false);
    }
  }, [config, savedConfig]);

  const saveAceleradores = useCallback(async () => {
    if (!config || !savedConfig) return;

    setIsSavingAceleradores(true);
    try {
      const calls: Promise<unknown>[] = [];

      for (const acc of config.accelerators) {
        const saved = savedConfig.accelerators.find((a) => a.apiId === acc.apiId);
        const changed =
          !saved ||
          saved.value !== acc.value ||
          saved.isActive !== acc.isActive ||
          saved.startTime !== acc.startTime ||
          saved.endTime !== acc.endTime;

        if (!changed) continue;

        const body: Record<string, unknown> = {
          cantidad: acc.value,
          activo: acc.isActive,
        };

        if (acc.startTime !== undefined || acc.endTime !== undefined) {
          body.horaInicio = acc.startTime ?? null;
          body.horaFin = acc.endTime ?? null;
        }

        calls.push(api.put(`/Puntos/config/aceleradores/${acc.apiId}`, body));
      }

      await Promise.all(calls);
      setSavedConfig((prev) => prev ? { ...prev, accelerators: config.accelerators } : prev);
      toast.success('Aceleradores guardados');
    } catch {
      toast.error('Error al guardar los aceleradores');
    } finally {
      setIsSavingAceleradores(false);
    }
  }, [config, savedConfig]);

  const isDirtyReglaBase =
    config !== null &&
    (config.bsPerPoint !== savedConfig?.bsPerPoint || config.reglaBaseActiva !== savedConfig?.reglaBaseActiva);
  const isDirtyAceleradores =
    config !== null &&
    JSON.stringify(config.accelerators) !== JSON.stringify(savedConfig?.accelerators);

  return {
    config,
    setConfig,
    savedConfig,
    isLoading,
    isSavingReglaBase,
    isSavingAceleradores,
    isDirtyReglaBase,
    isDirtyAceleradores,
    saveReglaBase,
    saveAceleradores,
  };
}
