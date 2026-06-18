import React from 'react';
import { Loader2, ShieldCheck, ShieldX, User, X as XIcon, FileText } from 'lucide-react';
import { TIPOS_DOCUMENTO } from '../../types/sales';
import type { Customer } from '../../types';
import { useNitVerification } from '../../hooks/useNitVerification';
import { TIPO_DOC_NIT, NIT_MAX_LENGTH } from '../../constants/facturacion';

interface DatosFiscalesFormProps {
  codigoTipoDocumento: number;
  numeroDocumento: string;
  complemento: string;
  facturacionNombre: string;
  onCodigoTipoDocumentoChange: (v: number) => void;
  onNumeroDocumentoChange: (v: string) => void;
  onComplementoChange: (v: string) => void;
  onFacturacionNombreChange: (v: string) => void;

  /** Resultado de búsqueda en backend al tipear N° de documento o nombre. */
  docSearchResults: Customer[];
  docSearchLoading: boolean;
  docSearchActive: boolean;
  nombreSearchResults: Customer[];
  nombreSearchLoading: boolean;
  nombreSearchActive: boolean;
  onAssignCustomerFromSearch: (c: Customer) => void;
  onClearSearchResults: () => void;

  /** Si el cliente seleccionado es CF o no hay cliente (omite verificación NIT). */
  clienteEsConsumidorFinal: boolean;
  /** Si el cliente fue asignado del dropdown (omite verificación NIT — ya está registrado). */
  clienteAsignadoDelDropdown?: boolean;
  /** Datos del cliente asignado del dropdown (para el banner "Usar estos datos"). */
  clienteAsignadoNombre?: string;
  clienteAsignadoDni?: string;
  /** Handlers del banner del cliente del dropdown. */
  onUsarDatosCliente?: () => void;
  onDismissClienteBanner?: () => void;
  /** Si el banner del cliente del dropdown fue descartado. */
  clienteBannerDismissed?: boolean;
}

export const DatosFiscalesForm: React.FC<DatosFiscalesFormProps> = ({
  codigoTipoDocumento,
  numeroDocumento,
  complemento,
  facturacionNombre,
  onCodigoTipoDocumentoChange,
  onNumeroDocumentoChange,
  onComplementoChange,
  onFacturacionNombreChange,
  docSearchResults,
  docSearchLoading,
  docSearchActive,
  nombreSearchResults,
  nombreSearchLoading,
  nombreSearchActive,
  onAssignCustomerFromSearch,
  onClearSearchResults,
  clienteEsConsumidorFinal,
  clienteAsignadoDelDropdown = false,
  clienteAsignadoNombre,
  clienteAsignadoDni,
  onUsarDatosCliente,
  onDismissClienteBanner,
  clienteBannerDismissed = false,
}) => {
  // Verificación NIT solo si es NIT real (no CF ni NIT='0' de S/N) Y el cliente
  // no fue asignado del dropdown (en ese caso ya está registrado, no necesita verificación).
  const mostrarVerificacionNit =
    codigoTipoDocumento === TIPO_DOC_NIT &&
    !clienteEsConsumidorFinal &&
    !clienteAsignadoDelDropdown &&
    numeroDocumento.trim() !== '0';
  const nitState = useNitVerification(mostrarVerificacionNit ? numeroDocumento : '');

  const searchResults = docSearchResults.length > 0 ? docSearchResults : nombreSearchResults;
  const searchLoading = docSearchLoading || nombreSearchLoading;
  const searchActive = docSearchActive || nombreSearchActive;
  // Si el formulario ya tiene los datos del cliente asignado del dropdown,
  // suprimimos los resultados de búsqueda (el "Usar" del banner ya los cargó).
  // Esto evita que el cajero vea otro "Usar" y piense que tiene que confirmar dos veces.
  // Normalizamos a string + trim porque el DNI puede llegar como number desde el backend.
  const formDni = numeroDocumento.trim();
  const formNombre = facturacionNombre.trim();
  const assignedDni = clienteAsignadoDni != null ? String(clienteAsignadoDni).trim() : '';
  const assignedNombre = (clienteAsignadoNombre ?? '').trim();
  const formMatchesAssignedClient =
    clienteAsignadoDelDropdown &&
    assignedDni !== '' &&
    assignedDni === formDni &&
    assignedNombre !== '' &&
    assignedNombre === formNombre;
  const showNoResults =
    !searchLoading &&
    searchActive &&
    searchResults.length === 0 &&
    !formMatchesAssignedClient &&
    (numeroDocumento.trim().length >= 2 || facturacionNombre.trim().length >= 2);

  return (
    <div className="space-y-2.5">
      {/* Fila 1: tipo doc + N° + complemento.
          Mobile: cada input en su propia fila (grid-cols-1).
          sm+: 3 columnas (grid-cols-12, col-span-4 / 5 / 3). */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <select
          value={codigoTipoDocumento}
          onChange={(e) => onCodigoTipoDocumentoChange(parseInt(e.target.value, 10))}
          className="sm:col-span-4 px-3 py-2.5 sm:py-2 rounded-lg border-2 border-coffee-200 text-sm text-coffee-900 focus:border-coffee-400 focus:outline-none appearance-none bg-white"
        >
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nombre}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          placeholder="N° documento"
          value={numeroDocumento}
          onChange={(e) => onNumeroDocumentoChange(e.target.value)}
          maxLength={NIT_MAX_LENGTH}
          className="sm:col-span-5 px-3 py-2.5 sm:py-2 rounded-lg border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Complemento"
          value={complemento}
          onChange={(e) => onComplementoChange(e.target.value)}
          maxLength={5}
          className="sm:col-span-3 px-3 py-2.5 sm:py-2 rounded-lg border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
        />
      </div>

      {/* Fila 2: nombre */}
      <input
        type="text"
        placeholder="Nombre o apellido del cliente"
        value={facturacionNombre}
        onChange={(e) => onFacturacionNombreChange(e.target.value)}
        maxLength={120}
        className="w-full px-3 py-2.5 sm:py-2 rounded-lg border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
      />

      {/* Banner del cliente asignado del dropdown — "Usar estos datos" o X para limpiar */}
      {clienteAsignadoDelDropdown && !clienteBannerDismissed && clienteAsignadoNombre && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 divide-y divide-emerald-100 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> ¿Facturar con datos del cliente?
            </p>
            <button
              onClick={onDismissClienteBanner}
              className="text-coffee-400 hover:text-coffee-700"
              title="Cerrar y limpiar campos"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={onUsarDatosCliente}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-emerald-100 transition-colors"
          >
            <User className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-coffee-900 truncate">{clienteAsignadoNombre}</p>
              <p className="text-[10px] text-coffee-500">
                {clienteAsignadoDni ? `C.I. ${clienteAsignadoDni}` : 'Sin C.I.'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700">Usar</span>
          </button>
        </div>
      )}

      {/* Verificación NIT (badge inline) */}
      {mostrarVerificacionNit && nitState.kind === 'loading' && (
        <div className="flex items-center gap-1.5 text-[11px] text-coffee-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Verificando NIT...
        </div>
      )}
      {mostrarVerificacionNit && nitState.kind === 'ok' && nitState.data.valido && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
          <ShieldCheck className="h-3 w-3" /> NIT válido en el SIN
        </div>
      )}
      {mostrarVerificacionNit && nitState.kind === 'ok' && !nitState.data.valido && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-red-600 font-semibold">
          <ShieldX className="h-3 w-3" /> NIT no encontrado en el SIN
        </div>
      )}
      {mostrarVerificacionNit && nitState.kind === 'error' && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-red-600 font-semibold">
          <ShieldX className="h-3 w-3" /> {nitState.message}
        </div>
      )}

      {/* Búsqueda en backend */}
      {searchLoading && !formMatchesAssignedClient && (
        <div className="flex items-center gap-1.5 text-[11px] text-coffee-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Buscando cliente...
        </div>
      )}
      {showNoResults && (
        <p className="text-[11px] text-coffee-500">
          {numeroDocumento.trim().length >= 2
            ? 'Ningún cliente registrado con ese N° de documento.'
            : 'Sin coincidencias por nombre.'}
        </p>
      )}
      {searchResults.length > 0 && !formMatchesAssignedClient && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 divide-y divide-emerald-100 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> Cliente encontrado · click para asignar
            </p>
            <button
              onClick={onClearSearchResults}
              className="text-coffee-400 hover:text-coffee-700"
              title="Cerrar"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
          {searchResults.map((c) => (
            <button
              key={c.id}
              onClick={() => onAssignCustomerFromSearch(c)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-emerald-100 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-coffee-900 truncate">{c.nombre}</p>
                <p className="text-[10px] text-coffee-500">
                  {c.dni != null ? `C.I. ${c.dni}` : 'Sin C.I.'}
                  {c.puntos != null ? ` · ${c.puntos} pts` : ''}
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700">Usar</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
