import React, { useEffect, useState } from 'react';
import { FileText, UserX } from 'lucide-react';
import { Modal, Button } from '../ui';
import { formatCurrency } from '../../utils';
import { useFacturacionForm } from '../../hooks/useFacturacionForm';
import { ModoFacturacionCards, ModoFacturacionBanner } from '../pos/ModoFacturacionCards';
import { DatosFiscalesForm } from '../pos/DatosFiscalesForm';
import type { Sale } from '../../types';
import type { DtoDatosFiscalesReenvio } from '../../hooks/useFacturacion';
import {
  TIPO_DOC_NIT,
  DEFAULT_CF_NUMERO_DOC,
  DEFAULT_CF_COMPLEMENTO,
  DEFAULT_SIN_NOMBRE,
} from '../../constants/facturacion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  /** Devuelve `true` si el envío al SIAT fue exitoso. El padre decide si refresca la lista. */
  onConfirm: (ventaId: number, datosFiscales: DtoDatosFiscalesReenvio) => Promise<boolean>;
}

/**
 * Facturar por primera vez una venta cobrada sin factura (`estadoSiat === null`).
 * Misma UX de con-nombre/sin-nombre que el cobro en mesas — reusa
 * `useFacturacionForm` con `customers=[]` (sin dropdown de cliente existente,
 * fuera de alcance acá) para no duplicar la lógica de armado del payload.
 */
export const FacturarSinFacturarModal: React.FC<Props> = ({ isOpen, onClose, sale, onConfirm }) => {
  const form = useFacturacionForm([]);
  const [isLoading, setIsLoading] = useState(false);

  // Corrección de factura Observada/rechazada (sale.facturado === true): precargar
  // los datos fiscales ya guardados en la venta para que el cajero solo edite el
  // campo que estaba mal, en vez de re-tipear todo desde cero. El caso "Facturar
  // por primera vez" (facturado === false) sigue arrancando en blanco.
  useEffect(() => {
    if (!isOpen || !sale?.facturado) return;

    const esSinNombre = (sale.customerName ?? '').trim().toUpperCase() === DEFAULT_SIN_NOMBRE;
    form.setEsSinNombre(esSinNombre);
    if (!esSinNombre) {
      form.setNumeroDocumento(sale.nitCliente ?? DEFAULT_CF_NUMERO_DOC);
      form.setFacturacionNombre(sale.customerName ?? '');
      form.setComplemento(sale.complemento ?? DEFAULT_CF_COMPLEMENTO);
      form.setCodigoTipoDocumento(sale.codigoTipoDocumentoIdentidad ?? TIPO_DOC_NIT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.ventaId, sale?.facturado]);

  if (!sale) return null;

  const handleConfirm = async () => {
    if (!sale.ventaId) return;
    setIsLoading(true);
    try {
      const ok = await onConfirm(sale.ventaId, form.buildDatosFiscales());
      if (ok) onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Facturar venta" size="md" bottomSheet>
      <div className="space-y-4">
        <div className="bg-coffee-50 rounded-lg px-4 py-3 text-sm text-coffee-700 space-y-1">
          <div className="flex justify-between">
            <span>Venta:</span>
            <span className="font-mono font-semibold text-coffee-900">{sale.code}</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-semibold text-coffee-900">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        <ModoFacturacionCards
          selected={form.modo}
          onChange={form.onModoChange}
          modes={['con_datos', 'sin_nombre']}
        />

        {form.esSinNombre ? (
          <ModoFacturacionBanner
            icon={<UserX className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />}
            label="Factura Sin Nombre"
          />
        ) : (
          <ModoFacturacionBanner
            icon={<FileText className="h-3.5 w-3.5 text-coffee-700 flex-shrink-0" />}
            label="Datos fiscales"
            badge={
              <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Requerido
              </span>
            }
          >
            <DatosFiscalesForm
              codigoTipoDocumento={form.codigoTipoDocumento}
              numeroDocumento={form.numeroDocumento}
              complemento={form.complemento}
              facturacionNombre={form.facturacionNombre}
              onCodigoTipoDocumentoChange={form.setCodigoTipoDocumento}
              onNumeroDocumentoChange={form.setNumeroDocumento}
              onComplementoChange={form.setComplemento}
              onFacturacionNombreChange={form.setFacturacionNombre}
              paisOrigenCodigo={form.paisOrigenCodigo}
              onPaisOrigenCodigoChange={form.setPaisOrigenCodigo}
              docSearchResults={form.docSearchResults}
              docSearchLoading={form.docSearchLoading}
              docSearchActive={form.docSearchActive}
              nombreSearchResults={form.nombreSearchResults}
              nombreSearchLoading={form.nombreSearchLoading}
              nombreSearchActive={form.nombreSearchActive}
              onAssignCustomerFromSearch={form.assignCustomerFromSearch}
              onClearSearchResults={form.clearSearchResults}
              clienteEsConsumidorFinal={form.clienteEsConsumidorFinal}
              clienteAsignadoDelDropdown={form.clienteAsignadoDelDropdown}
            />
          </ModoFacturacionBanner>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} isLoading={isLoading} disabled={!form.isValid}>
            Facturar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
