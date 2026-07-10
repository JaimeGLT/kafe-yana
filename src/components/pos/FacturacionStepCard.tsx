import React from 'react';
import { FileText, Ban, UserX } from 'lucide-react';
import type { Customer } from '../../types';
import { ModoFacturacionCards, ModoFacturacionBanner, type ModoFacturacion } from './ModoFacturacionCards';
import { ClienteFacturacionSection } from './ClienteFacturacionSection';
import { DatosFiscalesForm } from './DatosFiscalesForm';

interface FacturacionStepCardProps {
  clientes: Customer[];
  selectedClienteId: string;
  onClienteChange: (id: string) => void;

  noFacturar: boolean;
  onNoFacturarChange: (v: boolean) => void;
  esSinNombre: boolean;
  onEsSinNombreChange: (v: boolean) => void;
  codigoTipoDocumento: number;
  onCodigoTipoDocumentoChange: (v: number) => void;
  numeroDocumento: string;
  onNumeroDocumentoChange: (v: string) => void;
  complemento: string;
  onComplementoChange: (v: string) => void;
  facturacionNombre: string;
  onFacturacionNombreChange: (v: string) => void;
  paisOrigenCodigo: number | null;
  onPaisOrigenCodigoChange: (v: number | null) => void;
  clienteEsConsumidorFinal: boolean;
  clienteAsignadoDelDropdown: boolean;

  docSearchResults: Customer[];
  docSearchLoading: boolean;
  docSearchActive: boolean;
  nombreSearchResults: Customer[];
  nombreSearchLoading: boolean;
  nombreSearchActive: boolean;
  onAssignCustomerFromSearch: (c: Customer) => void;
  onClearSearchResults: () => void;

  reviewShowNewCustomerForm: boolean;
  onToggleReviewNewCustomerForm: () => void;
  reviewNewCustomerName: string;
  onReviewNewCustomerNameChange: (v: string) => void;
  reviewNewCustomerPhone: string;
  onReviewNewCustomerPhoneChange: (v: string) => void;
  isCreatingCustomer: boolean;
  onCreateCustomerReview: (nombre: string, celular: string, onCreated: (id: string) => void) => void;
}

/**
 * Bloque de "Cliente" + "Datos de facturación" (con/sin nombre/no facturar)
 * reusado por `DividirCuentaPanel` y `PagoParcialPanel` en su step de
 * facturación — mismo look & comportamiento que el cobro final (`PagoPanel`).
 */
export const FacturacionStepCard: React.FC<FacturacionStepCardProps> = ({
  clientes, selectedClienteId, onClienteChange,
  noFacturar, onNoFacturarChange, esSinNombre, onEsSinNombreChange,
  codigoTipoDocumento, onCodigoTipoDocumentoChange,
  numeroDocumento, onNumeroDocumentoChange,
  complemento, onComplementoChange,
  facturacionNombre, onFacturacionNombreChange,
  paisOrigenCodigo, onPaisOrigenCodigoChange,
  clienteEsConsumidorFinal, clienteAsignadoDelDropdown,
  docSearchResults, docSearchLoading, docSearchActive,
  nombreSearchResults, nombreSearchLoading, nombreSearchActive,
  onAssignCustomerFromSearch, onClearSearchResults,
  reviewShowNewCustomerForm, onToggleReviewNewCustomerForm,
  reviewNewCustomerName, onReviewNewCustomerNameChange,
  reviewNewCustomerPhone, onReviewNewCustomerPhoneChange,
  isCreatingCustomer, onCreateCustomerReview,
}) => {
  const selectedMode: ModoFacturacion = noFacturar
    ? 'no_facturar'
    : esSinNombre
      ? 'sin_nombre'
      : 'con_datos';

  const handleModeChange = (modo: ModoFacturacion) => {
    if (modo === 'no_facturar') {
      onNoFacturarChange(true);
      onEsSinNombreChange(false);
    } else if (modo === 'sin_nombre') {
      onNoFacturarChange(false);
      onEsSinNombreChange(true);
    } else {
      onNoFacturarChange(false);
      onEsSinNombreChange(false);
    }
  };

  return (
    <>
      {/* Sección: Cliente */}
      <section>
        <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
          Cliente
        </p>
        <ClienteFacturacionSection
          customers={clientes}
          reviewClienteId={selectedClienteId || null}
          onReviewClienteChange={(id) => onClienteChange(id ?? '')}
          reviewShowNewCustomerForm={reviewShowNewCustomerForm}
          onToggleReviewNewCustomerForm={onToggleReviewNewCustomerForm}
          reviewNewCustomerName={reviewNewCustomerName}
          reviewNewCustomerPhone={reviewNewCustomerPhone}
          onReviewNewCustomerNameChange={onReviewNewCustomerNameChange}
          onReviewNewCustomerPhoneChange={onReviewNewCustomerPhoneChange}
          onCreateCustomer={onCreateCustomerReview}
          isCreatingCustomer={isCreatingCustomer}
        />
      </section>

      {/* Sección: Datos de facturación */}
      <section>
        <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
          Datos de facturación
        </p>
        <div className="space-y-3">
          <ModoFacturacionCards selected={selectedMode} onChange={handleModeChange} />

          {esSinNombre ? (
            <ModoFacturacionBanner
              icon={<UserX className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />}
              label="Factura Sin Nombre"
            />
          ) : noFacturar ? (
            <ModoFacturacionBanner
              icon={<Ban className="h-3.5 w-3.5 text-coffee-600 flex-shrink-0" />}
              label="Venta sin factura"
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
                codigoTipoDocumento={codigoTipoDocumento}
                numeroDocumento={numeroDocumento}
                complemento={complemento}
                facturacionNombre={facturacionNombre}
                onCodigoTipoDocumentoChange={onCodigoTipoDocumentoChange}
                onNumeroDocumentoChange={onNumeroDocumentoChange}
                onComplementoChange={onComplementoChange}
                onFacturacionNombreChange={onFacturacionNombreChange}
                paisOrigenCodigo={paisOrigenCodigo}
                onPaisOrigenCodigoChange={onPaisOrigenCodigoChange}
                docSearchResults={docSearchResults}
                docSearchLoading={docSearchLoading}
                docSearchActive={docSearchActive}
                nombreSearchResults={nombreSearchResults}
                nombreSearchLoading={nombreSearchLoading}
                nombreSearchActive={nombreSearchActive}
                onAssignCustomerFromSearch={onAssignCustomerFromSearch}
                onClearSearchResults={onClearSearchResults}
                clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
              />
            </ModoFacturacionBanner>
          )}
        </div>
      </section>
    </>
  );
};

export function esFacturacionValida(params: {
  noFacturar: boolean;
  esSinNombre: boolean;
  numeroDocumento: string;
  facturacionNombre: string;
}): boolean {
  return (
    params.noFacturar
    || params.esSinNombre
    || (params.numeroDocumento.trim() !== '' && params.facturacionNombre.trim() !== '')
  );
}
