import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui';
import { formatCurrency } from '../../utils';

/**
 * Subset del DTO `NotaAjuste` del backend que la UI necesita para mostrar el
 * modal. No se importa el DTO completo porque el modal sólo usa estos campos.
 */
export interface NotaAjusteParaEliminar {
  id: number;
  numeroNotaCreditoDebito: number | null;
  /** Nombre del estado SIAT: 'Validada' | 'Observada' | 'Pendiente' | 'Anulada'. */
  estadoSiat: string | null;
  montoTotalDevuelto: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nota: NotaAjusteParaEliminar | null;
  /** Devuelve true si la eliminación fue exitosa. El padre decide si refresca la lista. */
  onConfirm: (notaId: number) => Promise<boolean>;
}

/**
 * Modal para eliminar (DELETE real) una nota de crédito/débito que el SIAT
 * nunca validó (Pendiente/Observada). No toca al SIAT — solo la borra de
 * esta base para que deje de bloquear la anulación de la factura que la
 * originó. El backend rechaza esta acción si la nota ya está Validada o
 * Anulada (para esas existe el flujo correcto de anulación en el SIAT).
 */
export const EliminarNotaAjusteModal: React.FC<Props> = ({ isOpen, onClose, nota, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!nota) return null;

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const ok = await onConfirm(nota.id);
      if (ok) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la nota.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar nota" size="sm" bottomSheet>
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            Esta nota nunca fue validada por el SIAT (no es un documento fiscal real).
            Eliminarla la borra permanentemente de este sistema y no se puede deshacer.
          </p>
        </div>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isLoading}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Eliminar nota
          </Button>
        </div>
      </div>
    </Modal>
  );
};
