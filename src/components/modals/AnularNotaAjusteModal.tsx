import React, { useState, useEffect } from 'react';
import { Ban, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { formatCurrency } from '../../utils';
import { useMotivosAnulacion } from '../../hooks/useMotivosAnulacion';

/**
 * Subset del DTO `NotaAjuste` del backend que la UI necesita para mostrar el
 * modal y armar el body. No se importa el DTO completo porque el modal sólo
 * usa estos campos.
 */
export interface NotaAjusteParaAnular {
  id: number;
  numeroNotaCreditoDebito: number | null;
  /** Nombre del estado SIAT: 'Validada' | 'Observada' | 'Pendiente' | 'Anulada'. */
  estadoSiat: string | null;
  montoTotalDevuelto: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nota: NotaAjusteParaAnular | null;
  /** Devuelve la respuesta del backend (o `null` si falló). El padre decide si refresca la lista. */
  onConfirm: (notaId: number, codigoMotivo: number, nota?: string) => Promise<boolean>;
}

/**
 * Modal para anular en el SIAT una nota de crédito/débito previamente validada
 * (EstadoSiat = 908). Espejo de `AnularFacturaModal`. El catálogo de motivos
 * se carga en vivo desde el backend (`GET /api/catalogos/motivos-anulacion`)
 * vía el hook `useMotivosAnulacion` — ya no usa la constante hardcodeada.
 */
export const AnularNotaAjusteModal: React.FC<Props> = ({ isOpen, onClose, nota, onConfirm }) => {
  const {
    items: motivos,
    loading: motivosLoading,
    error: motivosError,
    sincronizado: motivosSincronizado,
    isEmpty: motivosEmpty,
    refetch: refetchMotivos,
  } = useMotivosAnulacion(isOpen);

  const [codigoMotivo, setCodigoMotivo] = useState<string>('');
  const [justificacion, setJustificacion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir y preseleccionar el primer motivo del catálogo sincronizado.
  useEffect(() => {
    if (isOpen) {
      setCodigoMotivo(motivos.length > 0 ? String(motivos[0].codigo) : '');
      setJustificacion('');
      setError(null);
    }
  }, [isOpen, motivos]);

  if (!nota) return null;

  // Motivos no utilizables: todavía cargando, error de fetch, catálogo vacío o
  // server reporta que NO se sincronizó contra el SIAT (sigue con fallback hardcoded).
  const motivosBloqueados =
    motivosLoading || !!motivosError || motivosEmpty || !motivosSincronizado;

  const motivoOptions = (() => {
    if (motivosLoading) {
      return [{ value: '', label: 'Cargando motivos...', disabled: true }];
    }
    if (motivosError) {
      return [{ value: '', label: 'Error al cargar motivos', disabled: true }];
    }
    if (!motivosSincronizado) {
      return [{ value: '', label: 'Catálogo no sincronizado con SIAT', disabled: true }];
    }
    if (motivosEmpty) {
      return [{ value: '', label: 'No hay motivos disponibles', disabled: true }];
    }
    return [
      { value: '', label: 'Seleccionar motivo...', disabled: true },
      ...motivos.map((m) => ({
        value: String(m.codigo),
        label: `${m.codigo} — ${m.descripcion}`,
      })),
    ];
  })();

  const handleConfirm = async () => {
    const parsed = parseInt(codigoMotivo, 10);
    if (!parsed || !motivos.some((m) => m.codigo === parsed)) {
      setError('Selecciona un motivo de anulación válido.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const ok = await onConfirm(nota.id, parsed, justificacion.trim() || undefined);
      if (ok) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la nota de ajuste.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Anular nota C/D en SIAT" size="sm" bottomSheet>
      <div className="space-y-4">
        {/* Aviso de acción destructiva */}
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            Esta acción anulará la nota de crédito/débito en el SIAT y no se puede deshacer.
            Verificá el motivo antes de continuar.
          </p>
        </div>

        {/* Resumen de la nota */}
        <div className="bg-coffee-50 rounded-lg px-4 py-3 text-sm text-coffee-700 space-y-1">
          <div className="flex justify-between">
            <span>Nota N°:</span>
            <span className="font-mono font-semibold text-coffee-900">
              {nota.numeroNotaCreditoDebito ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Monto devuelto:</span>
            <span className="font-semibold text-coffee-900">
              {formatCurrency(nota.montoTotalDevuelto)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estado SIAT:</span>
            <span className="font-semibold text-coffee-900">{nota.estadoSiat ?? '—'}</span>
          </div>
        </div>

        {/* Aviso cuando el catálogo no se pudo cargar o no está sincronizado */}
        {(motivosError || !motivosSincronizado || motivosEmpty) && !motivosLoading && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed flex-1">
              {motivosError ? (
                <>
                  No se pudo cargar el catálogo de motivos.{' '}
                  <button
                    type="button"
                    onClick={() => void refetchMotivos()}
                    className="underline font-medium hover:text-amber-900"
                  >
                    Reintentar
                  </button>
                </>
              ) : !motivosSincronizado ? (
                <>
                  El catálogo de motivos no se ha sincronizado con el SIAT todavía.
                  Contactá al administrador para ejecutar la sincronización.
                </>
              ) : (
                <>El catálogo de motivos está vacío. Contactá al administrador.</>
              )}
            </div>
          </div>
        )}

        {/* Selector de motivo */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Motivo de anulación
          </label>
          <Select
            value={codigoMotivo}
            onChange={setCodigoMotivo}
            options={motivoOptions}
            disabled={motivosBloqueados}
          />
        </div>

        {/* Justificación libre (opcional) */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Nota o justificación <span className="text-coffee-400 text-xs font-normal">(opcional)</span>
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Detalle o justificación adicional para la anulación..."
            className="w-full px-3 py-2 rounded-lg border border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={motivosBloqueados}
            leftIcon={<Ban className="h-4 w-4" />}
          >
            Anular nota
          </Button>
        </div>
      </div>
    </Modal>
  );
};
