import React from 'react';
import { clsx } from 'clsx';
import { X, Receipt, FileText, UserX } from 'lucide-react';
import type { Customer, SubVentaPendiente } from '../../types';
import type { PuntoVentaSeleccionado } from '../../contexts/PuntoVentaContext';
import { useFacturacionForm } from '../../hooks/useFacturacionForm';
import { useSubVenta } from '../../hooks/useSubVenta';
import { ModoFacturacionCards, ModoFacturacionBanner } from './ModoFacturacionCards';
import { ClienteFacturacionSection } from './ClienteFacturacionSection';
import { DatosFiscalesForm } from './DatosFiscalesForm';
import { formatFechaHoraBolivia } from '../../utils/formatters';

interface FacturarSubVentaModalProps {
  subVenta: SubVentaPendiente;
  customers: Customer[];
  puntoVentaActual: PuntoVentaSeleccionado | null;
  formatCurrency: (n: number) => string;
  onBack: () => void;
  /** Se invoca tras facturar con éxito, para que el padre refresque su listado. */
  onFacturada: () => void;
}

/**
 * Facturar una sub-venta ya cobrada ("facturar después"), con la misma UX que
 * el cobro total: selector de modo (con datos / sin nombre), cliente existente
 * + búsqueda por DNI/nombre + alta de cliente nuevo, datos fiscales completos
 * (con verificación de NIT y país de origen para extranjeros).
 */
export const FacturarSubVentaModal: React.FC<FacturarSubVentaModalProps> = ({
  subVenta,
  customers,
  puntoVentaActual,
  formatCurrency,
  onBack,
  onFacturada,
}) => {
  const form = useFacturacionForm(customers);
  const { facturar } = useSubVenta();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const datos = form.buildDatosFiscales();
      const ok = await facturar(subVenta.id, {
        ...datos,
        codigoSucursal: puntoVentaActual?.CodigoSucursal ?? null,
        codigoPuntoVenta: puntoVentaActual?.CodigoPuntoVenta ?? null,
      });
      if (ok) onFacturada();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white w-full sm:max-w-md md:max-w-3xl xl:max-w-4xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      {/* Header */}
      <div className="bg-coffee-800 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-cream" />
          </div>
          <p className="text-cream font-semibold text-sm">Facturar cobro parcial</p>
        </div>
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Monto (ancla visual superior) */}
      <div className="px-4 md:px-5 pt-3 md:pt-4 pb-2.5 md:pb-3 flex-shrink-0 border-b border-coffee-100">
        <p className="text-[10px] text-coffee-400 uppercase tracking-widest font-semibold mb-0.5 text-center">
          Monto a facturar
        </p>
        <p className="text-4xl md:text-5xl font-display font-black text-coffee-900 text-center leading-none">
          {formatCurrency(subVenta.monto)}
        </p>
        <p className="text-[11px] text-coffee-400 text-center mt-1">
          {formatFechaHoraBolivia(subVenta.fecha)} · {subVenta.cajero} · {subVenta.cantidadLineas} líneas
        </p>
      </div>

      {/* Cuerpo */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 md:p-5 space-y-4">
          <section>
            <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
              Cliente
            </p>
            <ClienteFacturacionSection
              customers={form.customers}
              reviewClienteId={form.clienteId}
              onReviewClienteChange={form.setClienteId}
              reviewShowNewCustomerForm={form.showNewCustomerForm}
              onToggleReviewNewCustomerForm={form.toggleNewCustomerForm}
              reviewNewCustomerName={form.newCustomerName}
              reviewNewCustomerPhone={form.newCustomerPhone}
              onReviewNewCustomerNameChange={form.setNewCustomerName}
              onReviewNewCustomerPhoneChange={form.setNewCustomerPhone}
              onCreateCustomer={form.createCustomer}
              isCreatingCustomer={form.isCreatingCustomer}
            />
          </section>

          <section>
            <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
              Datos de facturación
            </p>
            <div className="space-y-3">
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
            </div>
          </section>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2.5 px-4 md:px-5 py-3 md:py-3.5 border-t border-coffee-100 bg-coffee-50/40 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={isProcessing || !form.isValid}
          className={clsx(
            'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
            isProcessing || !form.isValid
              ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
              : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
          )}
          title={!form.isValid ? 'Completa nombre, documento y país si aplica' : undefined}
        >
          {isProcessing ? 'Procesando...' : (
            <>
              <span>Facturar</span>
              <span className="opacity-70">·</span>
              <span>{formatCurrency(subVenta.monto)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
