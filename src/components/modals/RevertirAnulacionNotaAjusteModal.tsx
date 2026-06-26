import React, { useEffect, useState } from 'react';
import { Undo2, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui';
import { formatCurrency } from '../../utils';
import type { NotaAjusteParaAnular } from './AnularNotaAjusteModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nota: NotaAjusteParaAnular | null;
  /** Devuelve `true` si el backend aceptó la reversión. El padre decide si refresca la lista. */
  onConfirm: (notaId: number) => Promise<boolean>;
}

/**
 * Confirmación para revertir en el SIAT la anulación de una nota C/D.
 * Espejo de `RevertirAnulacionFacturaModal`. El endpoint POST
 * /api/NotaAjuste/revertir-anulacion/{id} no recibe body. El SIAT
 * permite revertir solo una vez por nota.
 */
export const RevertirAnulacionNotaAjusteModal: React.FC<Props> = ({ isOpen, onClose, nota, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!nota) return null;

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const ok = await onConfirm(nota.id);
      if (ok) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revertir la anulación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revertir anulación en SIAT" size="sm" bottomSheet>
      <div className="space-y-4">
        {/* Aviso de acción irreversible en el SIAT */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Esta operación deshará la anulación en el SIAT y la nota volverá a estado
            <span className="font-semibold"> Validada (908)</span>. Solo se permite
            <span className="font-semibold"> una vez</span> por nota — no se puede volver a anular ni a revertir después.
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
            <span>Estado SIAT actual:</span>
            <span className="font-semibold text-coffee-900">{nota.estadoSiat ?? '—'}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            leftIcon={<Undo2 className="h-4 w-4" />}
          >
            Revertir anulación
          </Button>
        </div>
      </div>
    </Modal>
  );
};
