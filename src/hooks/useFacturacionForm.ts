import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_CLIENTE_BY_DNI, GET_CLIENTES_SEARCH } from '../lib/queries/clientes.queries';
import { toast } from '../components/ui/Toast';
import { esConsumidorFinal } from '../utils/consumidorFinal';
import { TIPO_DOC_NIT, DEFAULT_CF_NUMERO_DOC, DEFAULT_CF_COMPLEMENTO, DEFAULT_SIN_NOMBRE } from '../constants/facturacion';
import type { Customer } from '../types';
import type { ModoFacturacion } from '../components/pos/ModoFacturacionCards';
import type { DtoFacturarSubVenta } from './useSubVenta';

const TIPO_DOC_CEX = 2;
const TIPO_DOC_PAS = 3;

/**
 * Estado + lógica de facturación (cliente, modo, datos fiscales, búsqueda por
 * DNI/nombre, alta de cliente nuevo) generalizada a partir de la que usa
 * `POSPage` para el cobro total (`construirBodyCobro`), para reusarla tal
 * cual en el modal de "facturar sub-venta" — misma UX, estado independiente
 * (no comparte variables con el flujo de cobro total, así no lo puede romper).
 */
export function useFacturacionForm(customers: Customer[]) {
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);

  const [codigoTipoDocumento, setCodigoTipoDocumento] = useState<number>(TIPO_DOC_NIT);
  const [numeroDocumento, setNumeroDocumentoState] = useState<string>(DEFAULT_CF_NUMERO_DOC);
  const [complemento, setComplemento] = useState<string>(DEFAULT_CF_COMPLEMENTO);
  const [facturacionNombre, setFacturacionNombreState] = useState<string>('');
  const [esSinNombre, setEsSinNombreState] = useState<boolean>(false);
  const [paisOrigenCodigo, setPaisOrigenCodigo] = useState<number | null>(null);

  const [docSearchResults, setDocSearchResults] = useState<Customer[]>([]);
  const [docSearchActive, setDocSearchActive] = useState(false);
  const [docSearchLoading, setDocSearchLoading] = useState(false);
  const [nombreSearchResults, setNombreSearchResults] = useState<Customer[]>([]);
  const [nombreSearchActive, setNombreSearchActive] = useState(false);
  const [nombreSearchLoading, setNombreSearchLoading] = useState(false);

  const allCustomers = localCustomers.length > 0 ? [...localCustomers, ...customers] : customers;

  const setNumeroDocumento = useCallback((v: string) => setNumeroDocumentoState(v), []);
  const setFacturacionNombre = useCallback((v: string) => setFacturacionNombreState(v), []);
  const setEsSinNombre = useCallback((v: boolean) => setEsSinNombreState(v), []);

  const modo: ModoFacturacion = esSinNombre ? 'sin_nombre' : 'con_datos';
  const onModoChange = useCallback((m: ModoFacturacion) => setEsSinNombreState(m === 'sin_nombre'), []);

  const clienteEfectivo = clienteId
    ? allCustomers.find(c => String(c.id) === clienteId) ?? null
    : null;
  const clienteEsConsumidorFinal = esConsumidorFinal(clienteEfectivo) || clienteEfectivo === null;
  const clienteAsignadoDelDropdown = !!clienteId && !clienteEsConsumidorFinal;

  const clearSearchResults = useCallback(() => {
    setDocSearchResults([]);
    setDocSearchActive(false);
    setNombreSearchResults([]);
    setNombreSearchActive(false);
  }, []);

  // Búsqueda por DNI con debounce (mín. 1 dígito numérico).
  useEffect(() => {
    const trimmed = numeroDocumento.trim();
    setNombreSearchActive(false);
    setNombreSearchResults([]);
    if (!trimmed) {
      setDocSearchResults([]);
      setDocSearchActive(false);
      setDocSearchLoading(false);
      return;
    }
    const asInt = parseInt(trimmed, 10);
    if (!Number.isFinite(asInt) || asInt <= 0) {
      setDocSearchResults([]);
      setDocSearchActive(false);
      return;
    }
    setDocSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await gql<{ clientes: { items: Customer[] } }>(GET_CLIENTE_BY_DNI, { dni: asInt });
        setDocSearchResults(data.clientes?.items ?? []);
        setDocSearchActive(true);
      } catch {
        setDocSearchResults([]);
      } finally {
        setDocSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [numeroDocumento]);

  // Búsqueda por nombre con debounce (mín. 2 caracteres).
  useEffect(() => {
    const trimmed = facturacionNombre.trim();
    setDocSearchActive(false);
    setDocSearchResults([]);
    if (trimmed.length < 2) {
      setNombreSearchResults([]);
      setNombreSearchActive(false);
      setNombreSearchLoading(false);
      return;
    }
    setNombreSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await gql<{ clientes: { items: Customer[] } }>(GET_CLIENTES_SEARCH, { q: trimmed });
        setNombreSearchResults(data.clientes?.items ?? []);
        setNombreSearchActive(true);
      } catch {
        setNombreSearchResults([]);
      } finally {
        setNombreSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [facturacionNombre]);

  const assignCustomerFromSearch = useCallback((c: Customer) => {
    setClienteId(String(c.id));
    if (c.dni != null) setNumeroDocumentoState(String(c.dni));
    if (c.nombre) setFacturacionNombreState(c.nombre);
    setPaisOrigenCodigo(c.paisOrigen?.codigo ?? null);
    setDocSearchResults([]);
    setDocSearchActive(false);
    setNombreSearchResults([]);
    setNombreSearchActive(false);
  }, []);

  const toggleNewCustomerForm = useCallback(() => {
    setShowNewCustomerForm(v => !v);
  }, []);

  const createCustomer = useCallback(async (nombre: string, celular: string, onCreated: (id: string) => void) => {
    if (!nombre || !celular) return;
    setIsCreatingCustomer(true);
    try {
      const res = await api.post<{ message: string; Id: number }>('/Cliente', {
        Dni: null,
        Nombre: nombre,
        Celular: celular,
        Correo: null,
        Fecha_nacimiento: null,
        Direccion: null,
        Estado: true,
      });
      const id = String(res.Id);
      const newCustomer: Customer = { id, nombre, celular, puntos: 0, estado: true };
      setLocalCustomers(prev => [newCustomer, ...prev]);
      onCreated(id);
      toast.success('Cliente registrado', `${nombre} añadido correctamente.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el cliente.';
      toast.error('Error', message);
    } finally {
      setIsCreatingCustomer(false);
    }
  }, []);

  /**
   * Construye los datos fiscales con la misma prioridad que
   * `construirBodyCobro` (POSPage.tsx) usa para el cobro total — sin la rama
   * "no facturar" (no aplica: facturar una sub-venta siempre emite factura).
   */
  const buildDatosFiscales = useCallback((): DtoFacturarSubVenta => {
    const docTrim = numeroDocumento.trim();
    const nombreTrim = facturacionNombre.trim();
    const compTrim = complemento.trim();
    const tieneDatosTipeados =
      (docTrim !== '' && docTrim !== DEFAULT_CF_NUMERO_DOC) || nombreTrim !== '' || compTrim !== '';

    if (esSinNombre) {
      return {
        id_Cliente: null,
        codigoTipoDocumento: TIPO_DOC_NIT,
        nombre: DEFAULT_SIN_NOMBRE,
        dni: 99001,
        complemento: '',
        codigoPaisOrigen: null,
      };
    }

    if (tieneDatosTipeados) {
      const dniSanitizado = docTrim.replace(/\D/g, '');
      const dniNum = dniSanitizado ? parseInt(dniSanitizado, 10) : null;
      const esExtranjero = codigoTipoDocumento === TIPO_DOC_CEX || codigoTipoDocumento === TIPO_DOC_PAS;
      return {
        id_Cliente: null,
        codigoTipoDocumento,
        nombre: nombreTrim || null,
        dni: dniNum !== null && Number.isFinite(dniNum) && dniNum > 0 ? dniNum : null,
        complemento: compTrim || null,
        codigoPaisOrigen: esExtranjero ? paisOrigenCodigo : null,
      };
    }

    if (clienteEsConsumidorFinal) {
      return {
        id_Cliente: null,
        codigoTipoDocumento: TIPO_DOC_NIT,
        nombre: null,
        dni: 0,
        complemento: null,
        codigoPaisOrigen: null,
      };
    }

    return {
      id_Cliente: clienteId ? parseInt(clienteId, 10) : null,
      codigoTipoDocumento: null,
      nombre: null,
      dni: null,
      complemento: null,
      codigoPaisOrigen: null,
    };
  }, [esSinNombre, numeroDocumento, facturacionNombre, complemento, codigoTipoDocumento, paisOrigenCodigo, clienteEsConsumidorFinal, clienteId]);

  /** Misma validación que gatea el botón "Cobrar" en PagoPanel, sin la parte de pagos. */
  const isValid =
    esSinNombre ||
    (numeroDocumento.trim() !== '' &&
      facturacionNombre.trim() !== '' &&
      (clienteAsignadoDelDropdown ||
        !(codigoTipoDocumento === TIPO_DOC_CEX || codigoTipoDocumento === TIPO_DOC_PAS) ||
        paisOrigenCodigo != null));

  return {
    customers: allCustomers,
    clienteId,
    setClienteId,
    showNewCustomerForm,
    toggleNewCustomerForm,
    newCustomerName,
    setNewCustomerName,
    newCustomerPhone,
    setNewCustomerPhone,
    isCreatingCustomer,
    createCustomer,

    modo,
    onModoChange,
    codigoTipoDocumento,
    setCodigoTipoDocumento,
    numeroDocumento,
    setNumeroDocumento,
    complemento,
    setComplemento,
    facturacionNombre,
    setFacturacionNombre,
    esSinNombre,
    setEsSinNombre,
    paisOrigenCodigo,
    setPaisOrigenCodigo,

    docSearchResults,
    docSearchLoading,
    docSearchActive,
    nombreSearchResults,
    nombreSearchLoading,
    nombreSearchActive,
    assignCustomerFromSearch,
    clearSearchResults,

    clienteEsConsumidorFinal,
    clienteAsignadoDelDropdown,

    buildDatosFiscales,
    isValid,
  };
}
