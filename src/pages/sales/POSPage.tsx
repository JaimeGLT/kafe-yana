import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, Printer,
  X, Star, Search, Check,
  UtensilsCrossed, ChevronLeft, ChevronRight, PenLine, History, ShoppingBag, Coins, RotateCcw,
  FileText, ScrollText,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { interpretarErrorCobro } from '../../lib/errores';
import { gql } from '../../lib/graphql';
import { useSignalRSubscription } from '../../hooks/useSignalRSubscription';
import { GET_POS_DATA } from '../../lib/queries/products.queries';
import { GET_CLIENTE_BY_DNI, GET_CLIENTES_SEARCH } from '../../lib/queries/clientes.queries';
import { GET_ELABORADO_INGREDIENTES } from '../../lib/queries/elaborados.queries';
import { usePOSMesas, extraerDetalleIdDeCartKey } from '../../hooks/usePOSMesas';
import { useSubVenta } from '../../hooks/useSubVenta';
import { FacturarSubVentaModal } from '../../components/pos/FacturarSubVentaModal';
import { PrintOptionsMenu } from '../../components/pos/PrintOptionsMenu';
import { useVenta } from '../../hooks/useVenta';
import type { RespuestaCobro } from '../../hooks/useVenta';
import { usePOSCart } from '../../hooks/usePOSCart';
import { usePOSLoyalty } from '../../hooks/usePOSLoyalty';
import { useDragScroll } from '../../hooks/useDragScroll';
import { formatCurrency, formatStockQty } from '../../utils';
import { roundMoney, formatHoraBolivia } from '../../utils/formatters';
import { consolidarItemsPorNombre } from '../../utils/consolidarItems';
import { formatOpcionLabel } from '../../utils/opcionUtils';
import { enviarCatalogo } from '../../utils/comandas';
import { PrintComandaModal } from '../../components/pos/PrintComandaModal';
import type { PrintComandaData } from '../../components/pos/PrintComandaModal';
import { PrintReciboModal } from '../../components/pos/PrintReciboModal';
import type { PrintReciboData } from '../../components/pos/PrintReciboModal';
import { PreCuentaModal } from '../../components/pos/PreCuentaModal';
import type { PreCuentaData } from '../../components/pos/PreCuentaModal';
import { PrintFacturaModal } from '../../components/pos/PrintFacturaModal';
import type { PrintFacturaData } from '../../components/pos/PrintFacturaModal';
import { SkeletonMesaGrid, SkeletonCategoryTabs, SkeletonProductScroll, Overlay, ConfirmModal } from '../../components/ui';
import { MesaCard } from '../../components/pos/MesaCard';
import { NuevaMesaModal } from '../../components/pos/NuevaMesaModal';
import { IniciarMesaModal } from '../../components/pos/IniciarMesaModal';
import { ComboDetailPanel } from '../../components/pos/ComboDetailPanel';
import { EditarRondaModal } from '../../components/pos/EditarRondaModal';
import { PagoParcialPanel, type PagoParcialItem, type PagoParcialDividirModo } from '../../components/pos/PagoParcialPanel';
import type { CartItem } from '../../hooks/usePOSCart';
import type { DtoRondaDetalleEditar } from '../../hooks/useMesas';
import type { Product, Category, Customer, PaymentMethod, PaymentMethodType, VariacionAtributo, ItemCubiertoInput, SubVentaPendiente } from '../../types';
import type { MilestoneReward, PointsCalculation } from '../../types/loyalty';
import { mapPaymentMethodToSinCode, consolidarPagoParaFactura, sinCodeToPaymentType } from '../../lib/mappers/metodosPago';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import { ElaboradoDetailModal } from '../../components/modals/ElaboradoDetailModal';
import { ProdCard } from '../../components/modals/ProdCard';
import { TIPO_DOC_NIT, DEFAULT_CF_NUMERO_DOC, DEFAULT_CF_COMPLEMENTO, DEFAULT_SIN_NOMBRE } from '../../constants/facturacion';
import { findConsumidorFinal, esConsumidorFinal } from '../../utils/consumidorFinal';
import { useFacturacion } from '../../hooks/useFacturacion';
import { fetchVentaById } from '../../hooks/useVentaDetalles';
import { usePuntoVenta } from '../../contexts';
import type { PuntoVentaSeleccionado } from '../../contexts';

const ReviewPanel = lazy(() => import('../../components/pos/ReviewPanel').then(m => ({ default: m.ReviewPanel })));
const PagoPanel = lazy(() => import('../../components/pos/PagoPanel').then(m => ({ default: m.PagoPanel })));
const SuccessPanel = lazy(() => import('../../components/pos/SuccessPanel').then(m => ({ default: m.SuccessPanel })));
const DividirCuentaPanel = lazy(() => import('../../components/pos/DividirCuentaPanel').then(m => ({ default: m.DividirCuentaPanel })));
const SubVentasPendientesPanel = lazy(() => import('../../components/pos/SubVentasPendientesPanel').then(m => ({ default: m.SubVentasPendientesPanel })));

type ModalView = 'none' | 'nueva_mesa' | 'iniciar' | 'iniciar_para_llevar' | 'detalle' | 'review' | 'pago' | 'dividir' | 'success' | 'pago_parcial' | 'pago_parcial_dividir' | 'subventas_pendientes';
type DetalleView = 'none' | 'pedido' | 'historial' | 'parciales';



const mesaOrderTotal = (order: any[]) =>
  roundMoney(order.reduce((s, i) => s + i.precioFinal * i.quantity, 0));


type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago' | 'parcial_pagado';

interface DtoDescuentoDisponible {
  IdPromocion: number;
  Nombre: string;
  TipoCondicion: string;
  ValorCondicion: number;
  PorcentajeDescuento: number;
  MontoDescuento: number;
  TotalConDescuento: number;
}

interface DtoDescuentosPedidoRespuesta {
  Id_Pedido: number;
  Id_Cliente: number;
  SubtotalPedido: number;
  HayDescuentoDisponible: boolean;
  DescuentosDisponibles: DtoDescuentoDisponible[];
  DescuentoRecomendado: DtoDescuentoDisponible | null;
}

interface SaleResult {
  code: string;
  total: number;
  items: Array<{ cantidad: number; nombre: string; precio: number; total: number }>;
  points: PointsCalculation | null;
  newBalance: number;
  puntosPorVenta: number;
  puntosPromocion: number;
  nombrePromocion: string | null;
  aplicoDescuento: boolean;
  montoDescuento: number;
  nombrePromoDescuento: string | null;
  // SIAT
  ventaId: number | null;
  /** El backend serializa el enum como número (no usa JsonStringEnumConverter). */
  estadoSiat: string | number | null;
  siatAceptada: boolean;
  errorSiat: string | null;
  codigoRecepcion: string | null;
  numeroFactura: number | null;
  /** CUF / hash SIAT de la factura. */
  cuf: string | null;
  /** NIT del cliente (cadena, viene de la respuesta del backend si fue tipeado). */
  nitCliente: string | null;
  /** Razón social del cliente (cliente del dropdown o nombre tipeado). */
  razonSocialCliente: string | null;
  /** Fecha/hora de la venta (string ISO). */
  fechaEmision: string | null;
}

/**
 * Shape del body `DtoPagos` que va al backend.
 *
 * Desde el Sync 11 (`sincronizarParametricaTipoMetodoPago`), KafeYana
 * abandonó la estructura fija `{efectivo, tarjeta, qr, total}` a favor de
 * una lista de líneas `{codigo, monto}` validadas contra el catálogo
 * SIAT sincronizado (`CatMetodosPago` + `MetodoPagoSiatCatalogo`).
 *
 * Cada `CodigoMetodoPago` debe existir en el catálogo vigente y estar
 * `Activo=true`. El backend setea `Venta.CodigoMetodoPago` (campo XML
 * al SIAT) con la línea de mayor monto y persiste el resto en
 * `VentaPagos` para auditoría.
 *
 * Override por división de cuenta: si el caller envía `pagosFactura` con
 * exactamente 1 línea, el backend la usa como `Venta.CodigoMetodoPago`
 * (campo XML al SIAT), ignorando el mayor monto de `pagos`. Esto permite
 * que tras un cobro mixto (ej: 60 QR + 40 efectivo) la factura SIAT
 * registre 100 Bs QR mientras `VentaPagos` y los acumuladores de caja
 * conservan el split original. Ver `consolidarPagoParaFactura`.
 */
interface PagosObject {
  lineas: Array<{ codigo: number; monto: number }>;
  total: number;
}

/**
 * Construye el body del POST a `/Mesa/cobrar/{id}` o `/Venta/cobrar`
 * siguiendo el DTO `DtoVentaPedido` del backend.
 *
 * Cascada de prioridad (la primera condición que se cumple gana):
 *  1) `noFacturar`            → factura:false, no se emite SIAT.
 *  2) `esSinNombre`           → hardcode CF con valor fiscal (dni=99001 legacy).
 *  3) Datos tipeados a mano   → cliente nominal sin id, se envían los campos.
 *  4) CF puro (sin nada)      → defaults CF (5/NULL/0/NULL).
 *  5) Cliente del dropdown    → el backend resuelve del id_Cliente.
 */
/**
 * Construye el body JSON del cobro a partir de los inputs del modal.
 *
 * Incluye codigoSucursal/codigoPuntoVenta cuando el cajero eligió un PV
 * desde el selector del header (ver PuntoVentaContext). El backend valida
 * que el (suc, pv) exista y esté activo en PuntosVentaSiat; si no, lanza
 * VentaException (HTTP 409).
 *
 * Si el selector no tiene PV activo (puntoVenta=null) o el cajero todavía
 * no eligió, NO se envían los campos y el backend cae al fallback
 * ResolverPuntoVentaActivo() (que solo funciona si hay EXACTAMENTE 1
 * PV activo; si hay >1 o 0, lanza VentaException claro).
 */
function construirBodyCobro(params: {
  reviewClienteId: string | null;
  customers: Customer[];
  noFacturar: boolean;
  esSinNombre: boolean;
  codigoTipoDocumento: number;
  numeroDocumento: string;
  facturacionNombre: string;
  complemento: string;
  /**
   * Código SIN del país de origen del documento (1..211). Sólo viaja al
   * backend en la rama "Datos tipeados a mano" cuando esExtranjero
   * (CEX=2 o PAS=3). En las otras ramas es null (CF / S/N / cliente del
   * dropdown con país persistido en BD).
   */
  paisOrigenCodigo: number | null;
  pedidoId: number;
  pagos: PagosObject;
  /**
   * Bloque de pagos consolidado a 1 línea predominante con el monto
   * total. Se usa sólo cuando `factura=true` y hubo división de cuenta
   * (varios métodos en `pagos.lineas`). El backend lo aplica como
   * `Venta.CodigoMetodoPago` para el SIAT, sin tocar `VentaPagos` ni caja.
   * Si es undefined, el backend cae al comportamiento legacy (mayor monto
   * de `pagos`).
   */
  pagosFactura?: PagosObject;
  aplicarDescuento: boolean;
  puntoVenta: PuntoVentaSeleccionado | null;
}): Record<string, unknown> {
  const clienteEfectivo = params.reviewClienteId
    ? params.customers.find(c => String(c.id) === params.reviewClienteId) ?? null
    : null;
  const esCF = esConsumidorFinal(clienteEfectivo) || clienteEfectivo === null;

  const docTrim = params.numeroDocumento.trim();
  const nombreTrim = params.facturacionNombre.trim();
  const compTrim = params.complemento.trim();
  const tieneDatosTipeados =
    (docTrim !== '' && docTrim !== DEFAULT_CF_NUMERO_DOC)
    || nombreTrim !== ''
    || compTrim !== '';

  // Campos PV: si el cajero eligió uno en el header, se envía; si no, null.
  // Las claves del body son PascalCase para consistencia con el shape que el
  // backend serializa. ASP.NET Core deserializa case-insensitive, así que el
  // cobro funciona idéntico independientemente de camelCase o PascalCase.
  const pvFields = params.puntoVenta
    ? {
        CodigoSucursal: params.puntoVenta.CodigoSucursal,
        CodigoPuntoVenta: params.puntoVenta.CodigoPuntoVenta,
      }
    : {
        CodigoSucursal: null,
        CodigoPuntoVenta: null,
      };

  // 1) "No facturar" — no se emite factura SIAT, pero el backend igualmente
  // requiere `id_Cliente` (se envía el del cliente seleccionado del dropdown
  // o null si no hay ninguno / es CF virtual).
  if (params.noFacturar) {
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: params.reviewClienteId ? parseInt(params.reviewClienteId, 10) : null,
      pagos: params.pagos,
      aplicarDescuentos: params.aplicarDescuento,
      factura: false,
      codigoTipoDocumento: null,
      nombre: null,
      dni: null,
      complemento: null,
      ...pvFields,
    };
  }

  // 2) S/N — hardcode CF con valor fiscal (legacy: dni=99001).
  if (params.esSinNombre) {
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: null,
      pagos: params.pagos,
      pagosFactura: params.pagosFactura ?? null,
      aplicarDescuentos: params.aplicarDescuento,
      factura: true,
      codigoTipoDocumento: TIPO_DOC_NIT,
      nombre: DEFAULT_SIN_NOMBRE,
      dni: 99001,
      complemento: '',
      ...pvFields,
    };
  }

  // 3) Datos tipeados a mano — cliente nominal sin id, se envían al backend.
  if (tieneDatosTipeados) {
    const dniSanitizado = docTrim.replace(/\D/g, '');
    const dniNum = dniSanitizado ? parseInt(dniSanitizado, 10) : null;
    const esExtranjero =
      params.codigoTipoDocumento === 2 || params.codigoTipoDocumento === 3;
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: null,
      pagos: params.pagos,
      pagosFactura: params.pagosFactura ?? null,
      aplicarDescuentos: params.aplicarDescuento,
      factura: true,
      codigoTipoDocumento: params.codigoTipoDocumento,
      nombre: nombreTrim || null,
      dni: dniNum !== null && Number.isFinite(dniNum) && dniNum > 0 ? dniNum : null,
      complemento: compTrim || null,
      // País sólo si es extranjero — el backend valida que venga y bloquea
      // la factura si falta. Si es CI/NIT/OD queda null (Bolivia implícito).
      codigoPaisOrigen: esExtranjero ? params.paisOrigenCodigo : null,
      ...pvFields,
    };
  }

  // 4) CF puro sin datos tipeados — defaults CF.
  if (esCF) {
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: null,
      pagos: params.pagos,
      pagosFactura: params.pagosFactura ?? null,
      aplicarDescuentos: params.aplicarDescuento,
      factura: true,
      codigoTipoDocumento: TIPO_DOC_NIT,
      nombre: null,
      dni: 0,
      complemento: null,
      ...pvFields,
    };
  }

  // 5) Cliente real seleccionado del dropdown — el backend resuelve del id.
  return {
    id_Pedido: params.pedidoId,
    id_Cliente: parseInt(params.reviewClienteId!, 10),
    pagos: params.pagos,
    pagosFactura: params.pagosFactura ?? null,
    aplicarDescuentos: params.aplicarDescuento,
    factura: true,
    codigoTipoDocumento: null,
    nombre: null,
    dni: null,
    complemento: null,
    ...pvFields,
  };
}

const STATUS_CFG: Record<MesaStatus, { label: string; dot: string; card: string; badge: string; icon: string; iconBg: string }> = {
  libre:          { label: 'Libre',          dot: 'bg-emerald-400',              card: 'bg-coffee-700/35 border-coffee-500/30 hover:bg-coffee-700/50 hover:border-coffee-400/50', badge: 'bg-emerald-500/20 text-emerald-300',  icon: 'text-coffee-300', iconBg: 'bg-coffee-800/70' },
  ocupada:        { label: 'Ocupada',        dot: 'bg-red-400 animate-pulse',    card: 'bg-red-900/45    border-red-500/55    hover:bg-red-900/60    hover:border-red-400/75',     badge: 'bg-red-500/20     text-red-300',         icon: 'text-red-300',    iconBg: 'bg-red-900/50'    },
  esperando_pago: { label: 'Esperando pago', dot: 'bg-amber-400 animate-pulse',  card: 'bg-amber-900/35  border-amber-500/50  hover:bg-amber-900/50  hover:border-amber-400/70',  badge: 'bg-amber-500/20   text-amber-300',       icon: 'text-amber-300',  iconBg: 'bg-amber-900/50'  },
  parcial_pagado: { label: 'Pago parcial',   dot: 'bg-orange-400 animate-pulse', card: 'bg-orange-900/40 border-orange-500/55 hover:bg-orange-900/55 hover:border-orange-400/75', badge: 'bg-orange-500/20  text-orange-300',      icon: 'text-orange-300', iconBg: 'bg-orange-900/50' },
};

export const POSPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [printComandaData, setPrintComandaData] = useState<PrintComandaData | null>(null);
  const [printReciboData, setPrintReciboData] = useState<PrintReciboData | null>(null);
  const [printPreCuentaData, setPrintPreCuentaData] = useState<PreCuentaData | null>(null);
  const [printFacturaData, setPrintFacturaData] = useState<PrintFacturaData | null>(null);
  const [atributos, setAtributos] = useState<VariacionAtributo[]>([]);
  const [comboDetails, setComboDetails] = useState<Record<string, { name: string; quantity: number; emoji: string }[]>>({});
  const [milestones, _setMilestones] = useState<MilestoneReward[]>([]);
  const [, setLoading] = useState(true);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [elaboradoExtras, setElaboradoExtras] = useState<Record<string, {
    insumosStock: Array<{ id: string; nombre: string; stock: number }>;
    opcionesStockInfo: Array<{ opcionId: string; tipoAjuste: string; cantidad: number; insumoRequeridoId: string | null; insumoReemplazoId: string | null }>;
    receta: { detalles: Array<{ insumo: { id: string; nombre: string }; cantidad: number }> } | null;
    variaciones: Array<{ opciones: Array<{ id: string; ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: string }; insumoNuevo: { id: string } | null }> }> }>;
    stockInsumos: Record<string, number>;
  }>>({});
  const [comboRecipes, setComboRecipes] = useState<Record<string, {
    components: Array<{
      productId: string;
      tipo: string;
      cantidad: number;
      recipe?: {
        producible: boolean;
        porciones: number;
        detalles: Array<{ insumoId: string; insumoNombre: string; cantidad: number; merma: number }>;
      };
    }>;
  }>>({});

  const {
    tempCart,
    varPickerProduct, setVarPickerProduct,
    varPickerDirect, setVarPickerDirect,
    comboDetailProduct, setComboDetailProduct,
    elaboradoDetailProduct, setElaboradoDetailProduct,
    elaboradoIngredientes, setElaboradoIngredientes,
    buildCartKey,
    addTempDirect,
    incTempQty, decTempQty, removeTempItem,
    getTempQty, updateTempItemNote, clearTempCart,
  } = usePOSCart();

  const {
    loyaltyProfiles: _lp,
    setLoyaltyProfiles: _setLoyaltyProfiles,
    getOrCreateProfile,
    calculatePointsForAmount,
  } = usePOSLoyalty();

  // SIAT — imprimir / reenviar factura.
  const { imprimirFactura, reenviarFactura } = useFacturacion();

  const {
    mesas,
    activeMesa,
    activeMesaId,
    setActiveMesaId,
    loadingMesas,
    openParaLlevar,
    openNuevaMesa,
    openEditMesa,
    handleSaveMesa,
    handleDeleteMesa,
    handleIniciarMesa,
    handleCerrarMesa,
    sendToKitchen,
    editarRondaOrden,
    eliminarRondaOrden,
    updateMesa,
    registrarAbonoMesa,
    registrarAbonoParaLlevar,
    revertirAbonoMesa,
    isSendingToKitchen,
    isEditandoRonda,
    isEliminandoRonda,
    isClosingMesa,
    isSavingMesa,
    isStartingMesa,
    isDeletingMesa,
    nuevaMesaName,
    setNuevaMesaName,
    editMesaId,
  } = usePOSMesas();

  // Historial de sub-ventas (cobros parciales) del pedido activo — fuente de
  // verdad en BD, para no depender de estado local de sesión (`aplicarAbono`
  // en memoria se pierde al refrescar la página o reabrir la mesa después).
  const { historial: historialSubVentas, listarPorPedido: listarHistorialSubVentas } = useSubVenta();
  useEffect(() => {
    if (activeMesa?.pedidoId) listarHistorialSubVentas(activeMesa.pedidoId);
  }, [activeMesa?.pedidoId, listarHistorialSubVentas]);

  const { cobrarParaLlevar } = useVenta();

  // Punto de Venta activo del cajero (selector del header). Si es null,
  // construirBodyCobro NO envía codigoSucursal/codigoPuntoVenta y el
  // backend cae al fallback ResolverPuntoVentaActivo().
  const { puntoVentaActual } = usePuntoVenta();

  useEffect(() => {
    api.get<{ Url: string }>('/Qr')
      .then(data => setQrImageUrl(data.Url || null))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    if (productsLoaded) return;
    try {
      const data = await gql<{
        elaborados: { items: Array<{
          id_Producto: number; unidad_medida: string;
          producible: boolean; stock_actual: number; ubicacion: string;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
          receta: { id: number; cantidadProducible: number };
          variaciones: Array<{ id: number; nombre: string; requerido: boolean;
            opciones: Array<{ id: number; nombre: string; ajustePrecio: number; id_variacion: number;
              ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: number; nombre: string } | null; insumoNuevo: { id: number; nombre: string } | null }> }> }>;
        }> };
        comprados: { items: Array<{
          costo_compra: number; stock_actual: number; disponible: boolean; ubicacion: string;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
        }> };
        combos: { items: Array<{
          cantidadProducible: number;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string };
          detalles: Array<{ producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string }; cantidad: number; opcional: boolean }>;
        }> };
        categorias: { items: Array<{ id: number; nombre: string; descripcion: string; color: string; estado: boolean }> };
        clientes: { items: Array<{ dni: string; nombre: string; celular: string; correo: string; fecha_nacimiento: string; direccion: string; puntos: number; estado: boolean; id: string }> };
        productosCanjeables: { items: Array<{ id: number; id_Producto: number; puntos: number; disponible: string; activo: boolean }> };
      }>(GET_POS_DATA);

      const catMap = new Map<string, Category>();
      data.categorias.items.forEach(n => {
        catMap.set(String(n.id), {
          id: String(n.id), name: n.nombre, description: n.descripcion,
          color: n.color || '#92400e', sortOrder: 0, isActive: n.estado,
          createdAt: new Date(), updatedAt: new Date(),
        });
      });

      const elaboradoProducts: Product[] = [];
      const mappedAtributos: VariacionAtributo[] = [];

      for (const n of data.elaborados.items) {
        const productId = String(n.id_Producto);
        const cat = n.producto.categoria;
        if (cat && !catMap.has(String(cat.id))) {
          catMap.set(String(cat.id), {
            id: String(cat.id), name: cat.nombre, description: cat.descripcion ?? '',
            color: cat.color || '#92400e', sortOrder: 0, isActive: true,
            createdAt: new Date(), updatedAt: new Date(),
          });
        }
        elaboradoProducts.push({
          id: productId, code: productId,
          name: n.producto.nombre, description: n.producto.descripcion ?? '',
          image: n.producto.urlImagen ?? undefined,
          tipo: 'elaborado', categoryId: cat ? String(cat.id) : '',
          unit: n.unidad_medida ?? 'unidad', costPrice: 0,
          salePrice: n.producto.precio, stock: n.stock_actual ?? Number.POSITIVE_INFINITY,
          minStock: 0, maxStock: 0, variations: [], isActive: true,
          hasVariations: n.variaciones.length > 0,
          producible: n.producible,
          cantidadProducible: n.receta?.cantidadProducible,
          tieneReceta: n.receta != null,
          destino: n.ubicacion === 'Cocina' ? 'cocina' : n.ubicacion === 'Barra' ? 'barra' : 'sin_destino',
          createdAt: new Date(), updatedAt: new Date(),
        });
        for (const v of n.variaciones) {
          mappedAtributos.push({
            id: String(v.id), productId,
            nombre: v.nombre, esRequerido: v.requerido, isActive: true,
            createdAt: new Date(), updatedAt: new Date(),
            opciones: v.opciones.map(o => {
              const ajuste = o.ajustes?.[0];
              return {
                id: String(o.id), atributoId: String(v.id),
                nombre: o.nombre, precioAjuste: o.ajustePrecio, isActive: true,
                tipoAjuste: ajuste?.tipoAjuste,
                ajusteCantidad: ajuste?.cantidad,
                insumoBaseNombre: ajuste?.insumoBase?.nombre,
                insumoNuevoNombre: ajuste?.insumoNuevo?.nombre,
              };
            }),
          });
        }
      }

      const compradoProducts: Product[] = data.comprados.items
        .filter(n => n.disponible)
        .map(n => {
          const cat = n.producto.categoria;
          if (cat && !catMap.has(String(cat.id))) {
            catMap.set(String(cat.id), {
              id: String(cat.id), name: cat.nombre, description: cat.descripcion ?? '',
              color: cat.color || '#64748b', sortOrder: 0, isActive: true,
              createdAt: new Date(), updatedAt: new Date(),
            });
          }
          return {
            id: String(n.producto.id), code: String(n.producto.id),
            name: n.producto.nombre, description: n.producto.descripcion ?? '',
            image: n.producto.urlImagen ?? undefined,
            tipo: 'comprado' as const,
            categoryId: cat ? String(cat.id) : '',
            unit: 'unidad', costPrice: n.costo_compra,
            salePrice: n.producto.precio, stock: n.stock_actual,
            minStock: 0, maxStock: 0, variations: [], isActive: true,
            hasVariations: false,
            destino: n.ubicacion === 'Cocina' ? 'cocina' : n.ubicacion === 'Barra' ? 'barra' : 'sin_destino',
            createdAt: new Date(), updatedAt: new Date(),
          };
        });

      const existingComboCat = [...catMap.values()].find(c =>
        c.name.toLowerCase().includes('combo')
      );
      const COMBO_CAT_ID = existingComboCat?.id ?? '__combos__';
      if (!existingComboCat) {
        catMap.set(COMBO_CAT_ID, {
          id: COMBO_CAT_ID, name: 'Combos', color: '#15803d',
          sortOrder: 99, isActive: true, createdAt: new Date(), updatedAt: new Date(),
        });
      }

      const comboProducts: Product[] = [];
      const newComboDetails: Record<string, { name: string; quantity: number; emoji: string }[]> = {};
      const newComboRecipes: Record<string, { components: Array<{ productId: string; tipo: string; cantidad: number; recipe?: { producible: boolean; porciones: number; detalles: Array<{ insumoId: string; insumoNombre: string; cantidad: number; merma: number }> } }> }> = {};
      for (const n of data.combos.items) {
        const id = String(n.producto.id);
        comboProducts.push({
          id, code: id,
          name: n.producto.nombre, description: n.producto.descripcion ?? '',
          image: n.producto.urlImagen ?? undefined,
          tipo: 'combo', categoryId: COMBO_CAT_ID,
          unit: 'unidad', costPrice: 0,
          salePrice: n.producto.precio, stock: n.cantidadProducible,
          minStock: 0, maxStock: 0, variations: [], isActive: true,
          hasVariations: false, createdAt: new Date(), updatedAt: new Date(),
          comboComponentes: n.detalles.map((d: any) => ({
            id: String(d.producto.id),
            nombre: d.producto.nombre,
            cantidad: d.cantidad,
            tipo: d.producto.tipo,
          })),
        });
        newComboDetails[id] = n.detalles.map((d: any) => ({
          name: d.producto.nombre, quantity: d.cantidad, emoji: '•',
        }));
        newComboRecipes[id] = {
          components: n.detalles.map((d: any) => ({
            productId: String(d.producto.id), tipo: d.producto.tipo, cantidad: d.cantidad,
          })),
        };
      }

      const cats = [...catMap.values()].filter(c => c.isActive);

      setCategories(cats);
      setProducts([...elaboradoProducts, ...compradoProducts, ...comboProducts]);
      setAtributos(mappedAtributos);
      setComboDetails(newComboDetails);
      setComboRecipes(newComboRecipes);
      const loadedCustomers = data.clientes.items as Customer[];
      setCustomers(loadedCustomers);
      // Autoselect del cliente "Consumidor Final" (si existe en la BD).
      setReviewClienteId(prev => {
        if (prev) return prev;
        const cf = findConsumidorFinal(loadedCustomers);
        return cf ? String(cf.id) : null;
      });
      setProductsLoaded(true);
      enviarCatalogo(data.comprados.items, data.elaborados.items, data.combos.items);
    } catch {
      toast.error('Error', 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, [productsLoaded]);

  const refreshStock = useCallback(async () => {
  try {
    const data = await gql<any>(GET_POS_DATA);
    setProducts(prev => prev.map(p => {
      if (p.tipo === 'comprado') {
        const found = data.comprados.items.find((n: any) => String(n.producto.id) === p.id);
        return found ? { ...p, stock: found.stock_actual } : p;
      }
      if (p.tipo === 'elaborado') {
        const found = data.elaborados.items.find((n: any) => String(n.id_Producto) === p.id);
        return found ? { ...p, stock: found.stock_actual, cantidadProducible: found.receta?.cantidadProducible } : p;
      }
      return p;
    }));
    setElaboradoExtras({});
  } catch {
    // silencioso
  }
}, []);

  const handleStockActualizado = useCallback((data: {
    comprados?: { id: number; stock: number }[];
    elaborados?: { id: number; stock: number; cantidadProducible: number | null }[];
    combos?: { id: number; cantidadProducible: number }[];
  }) => {
    setProducts(prev => prev.map(p => {
      if (p.tipo === 'comprado') {
        const u = data.comprados?.find(c => String(c.id) === p.id);
        return u ? { ...p, stock: u.stock } : p;
      }
      if (p.tipo === 'elaborado') {
        const u = data.elaborados?.find(e => String(e.id) === p.id);
        if (!u) return p;
        // cantidadProducible=null → Producible=true, usa stock físico
        // cantidadProducible=number → Producible=false, usa cantidadProducible
        return u.cantidadProducible !== null
          ? { ...p, stock: u.stock, cantidadProducible: u.cantidadProducible }
          : { ...p, stock: u.stock };
      }
      if (p.tipo === 'combo') {
        const u = data.combos?.find(c => String(c.id) === p.id);
        return u ? { ...p, stock: u.cantidadProducible } : p;
      }
      return p;
    }));
    setElaboradoExtras({});
  }, []);

  useSignalRSubscription(
    { StockActualizado: handleStockActualizado },
    { group: 'salon', onReconnect: refreshStock },
  );

  const getAtributosByProductId = useCallback((productId: string): VariacionAtributo[] => {
    return atributos.filter((a: VariacionAtributo) => a.productId === productId);
  }, [atributos]);

  const [modalView, setModalView] = useState<ModalView>('none');
  const [detalleView, setDetalleView] = useState<DetalleView>('none');
  const [facturandoSubVenta, setFacturandoSubVenta] = useState<SubVentaPendiente | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');

  const [iniciarClienteId, setIniciarClienteId] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [reviewClienteId, setReviewClienteId] = useState<string | null>(null);
  const [reviewShowNewCustomerForm, setReviewShowNewCustomerForm] = useState(false);
  const [reviewNewCustomerName, setReviewNewCustomerName] = useState('');
  const [reviewNewCustomerPhone, setReviewNewCustomerPhone] = useState('');
  // Búsqueda en backend desde Datos de facturación (PagoPanel).
  const [facturacionNombre, setFacturacionNombre] = useState('');
  const [docSearchResults, setDocSearchResults] = useState<Customer[]>([]);
  const [docSearchActive, setDocSearchActive] = useState(false);
  const [docSearchLoading, setDocSearchLoading] = useState(false);
  const [nombreSearchResults, setNombreSearchResults] = useState<Customer[]>([]);
  const [nombreSearchActive, setNombreSearchActive] = useState(false);
  const [nombreSearchLoading, setNombreSearchLoading] = useState(false);
  const [confirmDeleteMesaId, setConfirmDeleteMesaId] = useState<string | null>(null);
  const [mesaToDeleteName, setMesaToDeleteName] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [subModoDividirParcial, setSubModoDividirParcial] = useState<PagoParcialDividirModo>('partes_iguales');
  // Items que el cajero eligió en PagoParcialPanel para "Dividir entre
  // varios" dentro de un cobro parcial — NUNCA el pedido completo, para no
  // romper la semántica de subventa/pago parcial.
  const [itemsParaDividirParcial, setItemsParaDividirParcial] = useState<PagoParcialItem[]>([]);
  const [isOpeningParaLlevar, setIsOpeningParaLlevar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<SaleResult | null>(null);
  const [descuentoPreview, setDescuentoPreview] = useState<DtoDescuentosPedidoRespuesta | null>(null);
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [isLoadingDescuento, setIsLoadingDescuento] = useState(false);
  // Facturación SIAT — defaults: Consumidor Final (NIT 0).
  const [codigoTipoDocumento, setCodigoTipoDocumento] = useState<number>(TIPO_DOC_NIT);
  const [numeroDocumento, setNumeroDocumento] = useState<string>(DEFAULT_CF_NUMERO_DOC);
  const [complemento, setComplemento] = useState<string>(DEFAULT_CF_COMPLEMENTO);
  // S/N ("Sin Nombre"): toggle de UI. No es un código nuevo del SIN, sino una
  // forma de indicarle al cajero que la factura se emite sin documento de
  // identidad; internamente se envía NIT=5 con numeroDocumento='0' y se exige
  // un `facturacionNombre` (por defecto "S/N").
  const [esSinNombre, setEsSinNombre] = useState<boolean>(false);
  // "No facturar" — toggle excluyente con S/N. Si está activo, la venta se
  // registra internamente sin emitir factura al SIAT (factura=false en el body).
  const [noFacturar, setNoFacturar] = useState<boolean>(false);
  // País de origen del documento (código SIN 1..211). Sólo se exige cuando
  // el cajero elige tipo CEX (2) o PAS (3) Y no asignó un cliente del dropdown
  // (con cliente del dropdown, el país viene del cliente persistido en BD).
  // Se resetea a null cuando cambia el tipo de documento o se asigna un cliente.
  const [paisOrigenCodigo, setPaisOrigenCodigo] = useState<number | null>(null);
  const [editingRonda, setEditingRonda] = useState<{ rondaId: number; rondaNumber: number; items: CartItem[] } | null>(null);
  const [confirmDeleteRondaId, setConfirmDeleteRondaId] = useState<{ rondaId: number; rondaNumber: number } | null>(null);

  // El Punto de Venta SIAT activo lo resuelve el backend desde la tabla
  // PuntosVentaSiat (debe haber EXACTAMENTE UNO activo). El frontend ya
  // no envía codigoSucursal/codigoPuntoVenta en el body del cobro.

  const dragScrollDetalleCat = useDragScroll<HTMLDivElement>();
  const dragScrollDetalleProd = useDragScroll<HTMLDivElement>();

  const activeCategories = useMemo(() => categories.filter(c => c.isActive), [categories]);

  const categoriesWithProducts = useMemo(() => {
    const ids = new Set<string>();
    products.forEach(p => { if (p.isActive) ids.add(p.categoryId); });
    return activeCategories.filter(c => ids.has(c.id));
  }, [activeCategories, products]);

  const visibleCategories = useMemo(() => {
    if (!productSearch) return categoriesWithProducts;
    const q = productSearch.toLowerCase();
    const ids = new Set<string>();
    products.forEach(p => {
      if (p.isActive && p.name.toLowerCase().includes(q)) ids.add(p.categoryId);
    });
    return categoriesWithProducts.filter(c => ids.has(c.id));
  }, [categoriesWithProducts, products, productSearch]);

  const activeCatId = useMemo(() => {
    return visibleCategories.find(c => c.id === selectedCatId)?.id ?? visibleCategories[0]?.id ?? '';
  }, [visibleCategories, selectedCatId]);

  const pickerProducts = useMemo(() => {
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return products.filter(p => p.isActive && p.categoryId === activeCatId && p.name.toLowerCase().includes(q));
    }
    return products.filter(p => p.isActive && p.categoryId === activeCatId);
  }, [products, activeCatId, productSearch]);

  const consumedFromCart = useMemo(() => {
    const consumed: Record<string, number> = {};
    for (const item of tempCart) {
      for (const c of item.consumoInsumos) {
        consumed[c.insumoId] = (consumed[c.insumoId] ?? 0) + c.cantidad * item.quantity;
      }
    }
    return consumed;
  }, [tempCart]);

  const elaboradoEffectiveMax = useMemo(() => {
    if (!elaboradoDetailProduct) return Number.POSITIVE_INFINITY;
    const p = elaboradoDetailProduct;
    const reserved = tempCart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
    if (p.producible === true) return Math.max(0, p.stock - reserved);
    if (!p.tieneReceta) return Number.POSITIVE_INFINITY;
    return Math.max(0, (p.cantidadProducible ?? Number.POSITIVE_INFINITY) - reserved);
  }, [elaboradoDetailProduct, tempCart]);

  const calcularConsumoCombo = useCallback((comboId: string) => {
    const recipe = comboRecipes[comboId];
    if (!recipe) return [];
    const consumed: Record<string, { cantidad: number; nombre: string }> = {};
    for (const comp of recipe.components) {
      if (!comp.recipe || comp.recipe.producible) continue;
      const p = comp.recipe.porciones > 0 ? comp.recipe.porciones : 1;
      for (const det of comp.recipe.detalles) {
        const cantPorCombo = (det.cantidad / p) * (1 + det.merma / 100) * comp.cantidad;
        consumed[det.insumoId] = {
          cantidad: (consumed[det.insumoId]?.cantidad ?? 0) + cantPorCombo,
          nombre: det.insumoNombre,
        };
      }
    }
    return Object.entries(consumed).map(([insumoId, v]) => ({
      insumoId, nombre: v.nombre, cantidad: v.cantidad, tipo: 'base' as const,
    }));
  }, [comboRecipes]);

  const getEffectiveStock = useCallback((p: Product): { label: string; ok: boolean } => {
    const reserved = getTempQty(p.id);
    if (p.tipo === 'elaborado') {
      if (!p.producible) {
        if (!p.tieneReceta) return { label: '∞', ok: true };
        const available = (p.cantidadProducible ?? 0) - reserved;
        return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Disponible: ${formatStockQty(available)}`, ok: true };
      }
      const available = p.stock - reserved;
      return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${formatStockQty(available)}`, ok: true };
    }
    const available = p.stock - reserved;
    return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${formatStockQty(available)}`, ok: true };
  }, [getTempQty]);

  const mesaSubtotal = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
  // Si la mesa tiene pagos parciales, lo que se cobra en el cierre es el saldo,
  // no el subtotal. `mesaTotal` se usa en PagoPanel/handleConfirmSale como monto
  // a cobrar. Usamos `activeMesa.saldo` (autoritativo del backend) para evitar
  // drift por redondeos entre el frontend y el servidor.
  const mesaTotal = useMemo(() => {
    if (!activeMesa) return 0;
    const hasPagos = Object.values(activeMesa.itemsPagados).some(v => v > 0);
    return hasPagos ? activeMesa.saldo : mesaSubtotal;
  }, [activeMesa, mesaSubtotal]);
  const loyaltyProfile = activeMesa?.customerId ? getOrCreateProfile(activeMesa.customerId) : null;

  // CF = cliente seleccionado es "Consumidor Final" o no hay cliente.
  const clienteEfectivoParaPago = reviewClienteId
    ? customers.find((c) => String(c.id) === reviewClienteId) ?? null
    : null;
  const clienteEsConsumidorFinal = esConsumidorFinal(clienteEfectivoParaPago) || clienteEfectivoParaPago === null;
  // Cliente real del dropdown (no CF, no "sin cliente") → omite verificación NIT.
  const clienteAsignadoDelDropdown = !!reviewClienteId && !clienteEsConsumidorFinal;

  // ── Handlers de facturación con exclusión mutua entre toggles ────────
  // S/N y "No facturar" son excluyentes: activar uno desactiva el otro.
  // Tipear cualquier dato manual también desactiva "No facturar".
  const handleEsSinNombreChange = useCallback((v: boolean) => {
    setEsSinNombre(v);
    if (v) setNoFacturar(false);
  }, []);

  const handleNoFacturarChange = useCallback((v: boolean) => {
    setNoFacturar(v);
    if (v) setEsSinNombre(false);
  }, []);

  const handleNumeroDocumentoChange = useCallback((v: string) => {
    setNumeroDocumento(v);
    if (noFacturar && v.trim() !== '') setNoFacturar(false);
  }, [noFacturar]);

  const handleComplementoChange = useCallback((v: string) => {
    setComplemento(v);
    if (noFacturar && v.trim() !== '') setNoFacturar(false);
  }, [noFacturar]);

  const handleFacturacionNombreChange = useCallback((v: string) => {
    setFacturacionNombre(v);
    if (noFacturar && v.trim() !== '') setNoFacturar(false);
  }, [noFacturar]);

  // Cambio de tipo de documento: si deja de ser CEX/PAS, limpiar el país.
  // (Si pasa a CEX/PAS, se mantiene el país previo si estaba seteado, así el
  // cajero puede alternar entre tipos sin re-tipear.)
  const handleCodigoTipoDocumentoChange = useCallback((v: number) => {
    setCodigoTipoDocumento(v);
    if (v !== 2 && v !== 3) setPaisOrigenCodigo(null);
  }, []);

  // Eliminado: `mesaTotal` ahora se computa arriba como saldo o subtotal.
  const cashNum = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashNum - mesaTotal);
  const hasCombo = !!activeMesa?.order.some(i => i.product.tipo === 'combo' || i.product.name.toLowerCase().includes('combo'));
  const pointsPreview = activeMesa?.customerId
    ? calculatePointsForAmount(activeMesa.customerId, mesaTotal, hasCombo)
    : null;

  const handleIniciarParaLlevar = async (clienteIdOverride?: string) => {
    const id = clienteIdOverride ?? iniciarClienteId;
    const clienteId = id ? parseInt(id, 10) : null;
    setIsOpeningParaLlevar(true);
    const mesaId = await openParaLlevar(clienteId);
    setIsOpeningParaLlevar(false);
    if (!mesaId) {
      toast.error('Error', 'No se pudo iniciar el pedido para llevar.');
      return;
    }
    if (id) {
      const cliente = customers.find(c => c.id === id);
      if (cliente) {
        updateMesa(mesaId, {
          customerId: id,
          cliente: { id: parseInt(id, 10), nombre: cliente.nombre, puntos: cliente.puntos ?? 0, celular: cliente.celular ?? '', estado: true },
        });
      }
    }
    setIniciarClienteId('');
    setShowNewCustomerForm(false);
    setModalView('detalle');
    if (!productsLoaded) loadProducts();
  };

  const openModal = (mesaId: string, view: ModalView) => {
    setActiveMesaId(mesaId);
    setModalView(view);
    if (view === 'detalle') {
      const mesa = mesas.find(m => m.id === mesaId);
      setDetalleView(mesa && mesa.status !== 'libre' && mesa.order.length > 0 ? 'historial' : 'none');
    }
    if (!productsLoaded && view !== 'none') {
      loadProducts();
    }
  };

  const closeAll = () => {
    setActiveMesaId(null);
    setModalView('none');
    clearTempCart();
    setProductSearch('');
    setCashReceived('');
    setDetalleView('none');
    setIniciarClienteId('');
    setShowNewCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    // Restaurar defaults de Consumidor Final.
    setCodigoTipoDocumento(TIPO_DOC_NIT);
    setNumeroDocumento(DEFAULT_CF_NUMERO_DOC);
    setComplemento(DEFAULT_CF_COMPLEMENTO);
    setEsSinNombre(false);
    setNoFacturar(false);
    // Restaurar el cliente CF si existe (si no, null = "Sin cliente").
    const cf = findConsumidorFinal(customers);
    setReviewClienteId(cf ? String(cf.id) : null);
  };

  const handleCreateCustomer = async (onCreated: (id: string) => void) => {
    const name = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    if (!name || !phone) return;
    setIsCreatingCustomer(true);
    try {
      // El body va plano: el parámetro C# `datos` es solo el nombre de variable,
      // no parte del contrato JSON. System.Text.Json mapea contra las
      // propiedades de DtoClienteCU al nivel raíz.
      // Dni=null: el form del POS no pide C.L. (cliente anónimo).
      const res = await api.post<{ message: string; Id: number }>('/Cliente', {
        Dni: null,
        Nombre: name,
        Celular: phone,
        Correo: null,
        Fecha_nacimiento: null,
        Direccion: null,
        Estado: true,
      });
      const id = String(res.Id);
      const newCustomer: Customer = { id, nombre: name, celular: phone, puntos: 0, estado: true };
      setCustomers(prev => [newCustomer, ...prev]);
      onCreated(id);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('Cliente registrado', `${name} añadido correctamente.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el cliente.';
      toast.error('Error', message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Versión con callback para PagoPanel: crea el cliente, lo añade al catálogo
  // local y avisa al panel con el id creado.
  const handleCreateCustomerReview = async (name: string, phone: string, onCreated: (id: string) => void) => {
    if (!name || !phone) return;
    setIsCreatingCustomer(true);
    try {
      // El body va plano: el parámetro C# `datos` es solo el nombre de variable,
      // no parte del contrato JSON. System.Text.Json mapea contra las
      // propiedades de DtoClienteCU al nivel raíz.
      // Dni=null: el form del POS no pide C.L. (cliente anónimo).
      const res = await api.post<{ message: string; Id: number }>('/Cliente', {
        Dni: null,
        Nombre: name,
        Celular: phone,
        Correo: null,
        Fecha_nacimiento: null,
        Direccion: null,
        Estado: true,
      });
      const id = String(res.Id);
      const newCustomer: Customer = { id, nombre: name, celular: phone, puntos: 0, estado: true };
      setCustomers(prev => [newCustomer, ...prev]);
      onCreated(id);
      toast.success('Cliente registrado', `${name} añadido correctamente.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el cliente.';
      toast.error('Error', message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // ── Búsqueda de cliente desde Datos de facturación ───────────────────────
  // Si el operador tipea un N° de documento o un nombre, consultamos al
  // backend para sugerir el cliente. Al hacer "Usar", se asigna el id al
  // apartado "Cliente" y se completan los campos de facturación.

  const clearSearchResults = useCallback(() => {
    setDocSearchResults([]);
    setDocSearchActive(false);
    setNombreSearchResults([]);
    setNombreSearchActive(false);
  }, []);

  // Búsqueda por DNI con debounce. Solo dispara si el texto es numérico
  // y tiene al menos 3 dígitos para evitar ruido.
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

  // Búsqueda por nombre con debounce (mínimo 2 caracteres).
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

  const handleAssignCustomerFromSearch = useCallback((c: Customer) => {
    setReviewClienteId(String(c.id));
    if (c.dni != null) setNumeroDocumento(String(c.dni));
    if (c.nombre) setFacturacionNombre(c.nombre);
    // País: si el cliente persistido en BD tiene IdPaisOrigen, autocompletar
    // el dropdown de país (el cajero lo ve pero no puede cambiarlo para esta
    // venta — el backend siempre lee del cliente persistido en este path).
    // Si el cliente no tiene país persistido (Boliviano), dejar null.
    setPaisOrigenCodigo(c.paisOrigen?.codigo ?? null);
    setDocSearchResults([]);
    setDocSearchActive(false);
    setNombreSearchResults([]);
    setNombreSearchActive(false);
    toast.success('Cliente asignado', `${c.nombre} quedó vinculado al cobro.`);
  }, []);

  const addTempProduct = (product: Product) => {
    if (product.tipo === 'combo') {
      setComboDetailProduct(product);
    } else if (product.tipo === 'elaborado') {
      if (!product.hasVariations) {
        addTempDirect(product);
        return;
      }
      setElaboradoDetailProduct(product);
      if (!elaboradoIngredientes[product.id]) {
        gql<any>(GET_ELABORADO_INGREDIENTES, { id: parseInt(product.id, 10) })
          .then(data => {
            const node = data.elaborados.items[0];
            if (node?.receta?.detalles) {
              const ings = node.receta.detalles
                .filter((d: any) => d.insumo)
                .map((d: any) => ({ id: String(d.insumo.id), nombre: d.insumo.nombre, cantidad: d.cantidad, unidad: d.insumo.unidad_min_uso }));
              setElaboradoIngredientes(prev => ({ ...prev, [product.id]: ings }));
            } else {
              setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
            }

            const opcionesStockInfo: Array<{ opcionId: string; tipoAjuste: string; cantidad: number; insumoRequeridoId: string | null; insumoReemplazoId: string | null }> = [];
            const usedInsumoIds = new Set<string>();
            if (node?.receta?.detalles) {
              for (const det of node.receta.detalles) {
                if (det.insumo?.id) usedInsumoIds.add(String(det.insumo.id));
              }
            }
            if (node?.variaciones) {
              for (const attr of node.variaciones) {
                for (const opc of attr.opciones) {
                  for (const aj of opc.ajustes ?? []) {
                    opcionesStockInfo.push({
                      opcionId: String(opc.id),
                      tipoAjuste: aj.tipoAjuste,
                      cantidad: aj.cantidad,
                      insumoRequeridoId: aj.id_Insumo ? String(aj.id_Insumo) : null,
                      insumoReemplazoId: aj.id_InsumoNuevo ? String(aj.id_InsumoNuevo) : null,
                    });
                    if (aj.id_Insumo) usedInsumoIds.add(String(aj.id_Insumo));
                    if (aj.id_InsumoNuevo) usedInsumoIds.add(String(aj.id_InsumoNuevo));
                  }
                }
              }
            }

            const insumosStock = (data.insumos?.items ?? [])
              .filter((i: any) => usedInsumoIds.has(String(i.id)))
              .map((i: any) => ({ id: String(i.id), nombre: i.nombre, stock: i.stock_actual ?? 0 }));

            const receta = node?.receta ? {
              porciones: node.receta.porciones ?? 1,
              detalles: (node.receta.detalles ?? []).map((d: any) => ({
                insumo: { id: String(d.insumo?.id ?? d.id_insumo), nombre: d.insumo?.nombre ?? d.insumo?.id ?? '' },
                cantidad: d.cantidad,
                merma: d.merma ?? 0,
              })),
            } : null;

            const variaciones = (node?.variaciones ?? []).map((attr: any) => ({
              opciones: (attr.opciones ?? []).map((opc: any) => ({
                id: String(opc.id),
                ajustes: (opc.ajustes ?? []).map((aj: any) => ({
                  tipoAjuste: aj.tipoAjuste,
                  cantidad: aj.cantidad,
                  insumoBase: { id: aj.id_Insumo ? String(aj.id_Insumo) : '' },
                  insumoNuevo: aj.id_InsumoNuevo ? { id: String(aj.id_InsumoNuevo) } : null,
                })),
              })),
            }));

            const stockInsumos: Record<string, number> = {};
            for (const i of insumosStock) {
              stockInsumos[i.id] = i.stock;
            }

            setElaboradoExtras(prev => ({ ...prev, [product.id]: { insumosStock, opcionesStockInfo, receta, variaciones, stockInsumos } }));
          }).catch(() => {
            setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
            setElaboradoExtras(prev => ({ ...prev, [product.id]: { insumosStock: [], opcionesStockInfo: [], receta: null, variaciones: [], stockInsumos: {} } }));
          });
      }
    } else {
      addTempDirect(product);
    }
  };

  const handleSendToKitchen = async () => {
    if (!activeMesaId || tempCart.length === 0) return;
    const mesa = mesas.find(m => m.id === activeMesaId);
    if (!mesa) return;

    const itemCount = tempCart.reduce((s, i) => s + i.quantity, 0);
    const success = await sendToKitchen(
      activeMesaId,
      tempCart,
      (mesaName, roundNumber, _items, rondaDesc, comandaItems) => {
        setPrintComandaData({ mesaName, roundNumber, rondaDesc, items: comandaItems });
      },
    );
    if (!success) return;

    clearTempCart();
    setProductSearch('');
    setDetalleView('historial');
    refreshStock();
    toast.success('🖨️ Comanda enviada', `Ronda ${mesa.currentRound - 1} · ${itemCount} producto(s)`);
  };

  /**
   * Pre-cuenta contextual: imprime solo lo que el cajero está viendo.
   * 'pendiente' (pestaña Historial) → items aún no cobrados, restando lo
   * ya descontado por sub-ventas (`activeMesa.itemsPagados`, mismo cálculo
   * que `pendienteQty` usa para filtrar esa pestaña).
   * 'cobrado' (pestaña Cobrado) → items de las sub-ventas ya registradas
   * (`historialSubVentas`), sin tocar lo pendiente.
   */
  const handlePrintResumen = (fuente: 'pendiente' | 'cobrado') => {
    if (!activeMesa) return;

    const itemsCrudos = fuente === 'cobrado'
      ? historialSubVentas.flatMap(sv => sv.detalles.map(d => ({
          nombre: d.nombreProducto,
          cantidad: d.cantidad,
          precioFinal: d.precio,
        })))
      : activeMesa.order
          .map(i => {
            const productoId = parseInt(i.product.id, 10);
            const pagado = activeMesa.itemsPagados[productoId] ?? 0;
            return { i, cantidadPendiente: i.quantity - pagado };
          })
          .filter(({ cantidadPendiente }) => cantidadPendiente > 0)
          .map(({ i, cantidadPendiente }) => ({
            nombre: i.product.name + (i.opciones?.length ? ` (${i.opciones.map((o: any) => formatOpcionLabel(o)).join(', ')})` : ''),
            cantidad: cantidadPendiente,
            precioFinal: i.precioFinal,
            ubicacion: i.product.destino === 'cocina' ? 'cocina'
                     : i.product.destino === 'barra'  ? 'barra'
                     : 'principal',
          }));

    if (itemsCrudos.length === 0) {
      toast.info('Sin items', fuente === 'cobrado'
        ? 'Todavía no hay cobros parciales registrados.'
        : 'No hay items pendientes de cobro.');
      return;
    }

    setPrintPreCuentaData({
      mesaName: activeMesa.name,
      // Consolidar por nombre exacto: si el cliente pidió 2x Café en ronda 1
      // y 3x Café en ronda 2, aparece una sola línea con cantidad 5.
      items: consolidarItemsPorNombre(itemsCrudos),
    });
  };

  useEffect(() => {
    if (!reviewClienteId || modalView !== 'pago') {
      setDescuentoPreview(null);
      setAplicarDescuento(false);
      return;
    }
    const pedidoId = activeMesa ? (activeMesa as any).pedidoId : null;
    if (!pedidoId) return;
    let cancelled = false;
    setIsLoadingDescuento(true);
    api.get<DtoDescuentosPedidoRespuesta>(
      `/PromocionPermanente/descuentos-pedido?Id_Pedido=${pedidoId}&Id_Cliente=${reviewClienteId}`,
    ).then(data => {
      if (!cancelled) {
        setDescuentoPreview(data);
        setAplicarDescuento(false);
      }
    }).catch(() => {
      if (!cancelled) setDescuentoPreview(null);
    }).finally(() => {
      if (!cancelled) setIsLoadingDescuento(false);
    });
    return () => { cancelled = true; };
  }, [reviewClienteId, modalView, activeMesa]);

  const handleRequestPayment = () => {
    if (!activeMesa || activeMesa.order.length === 0) {
      toast.warning('Sin pedidos', 'Envía productos a cocina antes de cobrar.');
      return;
    }
    if (tempCart.length > 0) {
      toast.warning('Pedido pendiente', 'Envía los productos a cocina/barra antes de cobrar.');
      return;
    }
    updateMesa(activeMesa.id, { status: 'esperando_pago' });
    setReviewClienteId(activeMesa.customerId ?? null);
    setModalView('review');
  };

  const handleConfirmSale = async () => {
    if (!activeMesa) return;
    setIsProcessing(true);
    try {
      const isMesa = activeMesa.tipo === 'mesa';
      const isParaLlevar = activeMesa.tipo === 'para_llevar';
      const pedidoId = (activeMesa as any).pedidoId;

      if ((isMesa || isParaLlevar) && pedidoId) {
        // Si hay descuento + abonos: el descuento se aplica a TODA la orden,
        // pero los parciales ya fueron cobrados a precio lleno (el descuento
        // no existía cuando se cobraron). El cobro final es entonces el total
        // con descuento menos lo ya abonado, así `pagos.total` reconstruido
        // coincide con `TotalConDescuento` y el cliente paga exactamente el
        // monto descontado de la orden.
        const efectivoTotal = aplicarDescuento && descuentoPreview?.DescuentoRecomendado
          ? roundMoney(descuentoPreview.DescuentoRecomendado.TotalConDescuento - totalAbonadoActivo)
          : mesaTotal;

        // El cobro actual se serializa como una sola línea con el método elegido.
        const codigoSinActual = mapPaymentMethodToSinCode(paymentMethod);
        const pagosActuales: PagosObject = {
          lineas: [{ codigo: codigoSinActual, monto: efectivoTotal }],
          total: efectivoTotal,
        };

        // Cada cobro (parcial o el último tramo) es una sub-venta independiente
        // — el backend ya sabe cuánto queda pendiente (`saldo`,
        // `CantidadDescontada`) y valida `Pagos.Total == subVenta.Monto` (solo
        // este tramo). NO reconstruir el histórico de abonos previos acá:
        // ya se registraron en Caja cuando se cobraron (harían doble cuenta).
        const pagos: PagosObject = pagosActuales;

        // Predominio para factura SIAT: si hay varias líneas, consolidar a
        // 1 sola con el método predominante y el total. El backend usa esto
        // sólo para `Venta.CodigoMetodoPago` (campo XML al SIAT); `pagos`
        // sigue viajando completo para auditoría y acumuladores de caja.
        const pagosFactura = !noFacturar && pagos.lineas.length > 1
          ? consolidarPagoParaFactura(pagos)
          : undefined;

        // Body del cobro — ver `construirBodyCobro` para la cascada completa.
        const bodyCobro = construirBodyCobro({
          reviewClienteId,
          customers,
          noFacturar,
          esSinNombre,
          codigoTipoDocumento,
          numeroDocumento,
          facturacionNombre,
          complemento,
          paisOrigenCodigo,
          pedidoId,
          pagos,
          pagosFactura,
          aplicarDescuento,
          puntoVenta: puntoVentaActual,
        });

        let res: RespuestaCobro | null = null;
        if (isParaLlevar) {
          res = await cobrarParaLlevar(pedidoId, bodyCobro);
        } else {
          res = await api.post<RespuestaCobro>(`/Mesa/cobrar/${activeMesa.id}`, bodyCobro);
        }

        if (res !== null) {
          const snapshotItemsCrudos = activeMesa.order.map((i: any) => ({
            cantidad: i.quantity,
            nombre: i.product.name,
            precio: i.precioFinal ?? i.product.price ?? 0,
            total: (i.precioFinal ?? i.product.price ?? 0) * i.quantity,
          }));
          // Consolidar por nombre exacto: si el cliente pidió 2x Café en ronda 1
          // y 3x Café en ronda 2, la factura SIAT y el recibo muestran una sola
          // línea con cantidad 5.
          const snapshotItems = consolidarItemsPorNombre(snapshotItemsCrudos);
          setLastSaleResult({
            code: res.CodigoVenta ?? (isParaLlevar ? `PL-${pedidoId}` : `MESA-${activeMesa.id}`),
            total: res.TotalCobrado,
            items: snapshotItems,
            points: null,
            newBalance: 0,
            puntosPorVenta: res.PuntosPorVenta ?? 0,
            puntosPromocion: res.PuntosPromocionPermanente ?? 0,
            nombrePromocion: res.PromocionPermanente?.NombrePromocion ?? null,
            aplicoDescuento: res.AplicoDescuento ?? false,
            montoDescuento: res.MontoDescuento ?? 0,
            nombrePromoDescuento: res.PromocionDescuento?.NombrePromocion ?? null,
            ventaId: res.VentaId ?? null,
            estadoSiat: res.EstadoSiat ?? null,
            siatAceptada: res.SiatAceptada ?? false,
            errorSiat: res.ErrorSiat ?? null,
            codigoRecepcion: res.CodigoRecepcion ?? null,
            numeroFactura: res.NumeroFactura ?? null,
            cuf: res.CodigoHash ?? null,
            nitCliente: numeroDocumento.trim() !== '' && numeroDocumento.trim() !== DEFAULT_CF_NUMERO_DOC ? numeroDocumento.trim() : null,
            razonSocialCliente: facturacionNombre.trim() !== ''
              ? facturacionNombre.trim()
              : (clienteEfectivoParaPago?.nombre ?? null),
            fechaEmision: new Date().toISOString(),
          });
          setModalView('success');
        }
      } else {
        // Rama inalcanzable en producción: si la mesa/PL no tiene pedidoId,
        // es un estado inválido. Informamos al cajero en vez de continuar.
        toast.warning('Sin pedido', 'La mesa no tiene un pedido activo para cobrar.');
      }
    } catch (err) {
      const { title, message, nivel } = interpretarErrorCobro(err, 'No se pudo registrar la venta.');
      if (nivel === 'warning') toast.warning(title, message);
      else toast.error(title, message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSaleDividida = async (pagos: PagosObject) => {
    if (!activeMesa) return;
    setIsProcessing(true);
    try {
      const pedidoId = (activeMesa as any).pedidoId;
      const isParaLlevar = activeMesa.tipo === 'para_llevar';

      // `pagos` (el split de este cobro) se envía tal cual — cada cobro
      // (parcial o el último tramo) es una sub-venta independiente; el
      // backend ya sabe cuánto queda pendiente. No reconstruir el histórico
      // de abonos previos (ya se registraron en Caja al cobrarse).
      //
      // Predominio para factura SIAT: cuando se emite factura y la división
      // de cuenta produjo varias líneas en `pagos.lineas`, consolidar a 1
      // sola con el método predominante (mayor monto; empate → digital gana
      // sobre efectivo) y monto total. El backend usa este bloque sólo para
      // `Venta.CodigoMetodoPago` (campo XML al SIAT); `pagos` sigue
      // viajando completo para que `VentaPagos` y los acumuladores de caja
      // preserven el split original.
      const pagosFactura =
        !noFacturar && pagos.lineas.length > 1
          ? consolidarPagoParaFactura(pagos)
          : undefined;

      // Body del cobro (división de cuenta) — ver `construirBodyCobro`.
      // En división nunca se aplican descuentos, por lo que se pasa false.
      const bodyCobro = construirBodyCobro({
        reviewClienteId,
        customers,
        noFacturar,
        esSinNombre,
        codigoTipoDocumento,
        numeroDocumento,
        facturacionNombre,
        complemento,
        paisOrigenCodigo,
        pedidoId: pedidoId ?? 0,
        pagos,
        pagosFactura,
        aplicarDescuento: false,
        puntoVenta: puntoVentaActual,
      });

      let res: RespuestaCobro | null = null;
      if (isParaLlevar && pedidoId) {
        res = await cobrarParaLlevar(pedidoId, bodyCobro);
      } else if (pedidoId) {
        res = await api.post<RespuestaCobro>(`/Mesa/cobrar/${activeMesa.id}`, bodyCobro);
      }

      if (res !== null) {
        const snapshotItemsDivididaCrudos = activeMesa.order.map((i: any) => ({
          cantidad: i.quantity,
          nombre: i.product.name,
          precio: i.precioFinal ?? i.product.price ?? 0,
          total: (i.precioFinal ?? i.product.price ?? 0) * i.quantity,
        }));
        // Consolidar por nombre exacto para recibo/factura en división de cuenta.
        const snapshotItemsDividida = consolidarItemsPorNombre(snapshotItemsDivididaCrudos);
        setLastSaleResult({
          code: res.CodigoVenta ?? (isParaLlevar ? `PL-${pedidoId}` : `MESA-${activeMesa.id}`),
          total: res.TotalCobrado,
          items: snapshotItemsDividida,
          points: null, newBalance: 0,
          puntosPorVenta: res.PuntosPorVenta ?? 0,
          puntosPromocion: res.PuntosPromocionPermanente ?? 0,
          nombrePromocion: res.PromocionPermanente?.NombrePromocion ?? null,
          aplicoDescuento: res.AplicoDescuento ?? false,
          montoDescuento: res.MontoDescuento ?? 0,
          nombrePromoDescuento: res.PromocionDescuento?.NombrePromocion ?? null,
          ventaId: res.VentaId ?? null,
          estadoSiat: res.EstadoSiat ?? null,
          siatAceptada: res.SiatAceptada ?? false,
          errorSiat: res.ErrorSiat ?? null,
          codigoRecepcion: res.CodigoRecepcion ?? null,
          numeroFactura: res.NumeroFactura ?? null,
          cuf: res.CodigoHash ?? null,
          nitCliente: numeroDocumento.trim() !== '' && numeroDocumento.trim() !== DEFAULT_CF_NUMERO_DOC ? numeroDocumento.trim() : null,
          razonSocialCliente: facturacionNombre.trim() !== ''
            ? facturacionNombre.trim()
            : (clienteEfectivoParaPago?.nombre ?? null),
          fechaEmision: new Date().toISOString(),
        });
        setModalView('success');
      }
    } catch (err) {
      const { title, message, nivel } = interpretarErrorCobro(err, 'No se pudo registrar la venta.');
      if (nivel === 'warning') toast.warning(title, message);
      else toast.error(title, message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    if (activeMesaId) handleCerrarMesa(activeMesaId, true);
    setLastSaleResult(null);
    closeAll();
  };

  // ── Pago parcial ──────────────────────────────────────────────────────
  // Construye la lista de items (CartItem → PagoParcialItem) AGRUPADA POR
  // PRODUCTO: un producto puede estar repartido en varias rondas (con
  // precios distintos entre sí); acá se suma la cantidad total y la
  // cantidad ya descontada across todas esas rondas. El backend es quien
  // decide de qué ronda(s) descontar (FIFO) — el usuario nunca elige una
  // fila de ronda específica.
  const itemsParaPagoParcial: PagoParcialItem[] = useMemo(() => {
    if (!activeMesa) return [];
    const porProducto = new Map<number, PagoParcialItem>();
    for (const item of activeMesa.order) {
      const detalleId = extraerDetalleIdDeCartKey(item.cartKey);
      if (detalleId == null) continue;
      const productoId = parseInt(item.product.id, 10);
      if (isNaN(productoId)) continue;

      const existente = porProducto.get(productoId);
      if (existente) {
        existente.quantity += item.quantity;
      } else {
        porProducto.set(productoId, {
          cartKey: `prod_${productoId}`,
          productoId,
          product: {
            id: item.product.id,
            name: item.product.name,
            tipo: item.product.tipo,
            image: (item.product as any).image,
          },
          opciones: item.opciones,
          quantity: item.quantity,
          // Precio de referencia para mostrar en la UI — el monto real lo
          // calcula el backend por cada ronda de origen (puede diferir si
          // el producto tuvo precios distintos entre rondas).
          precioFinal: item.precioFinal,
          cantidadPagada: activeMesa.itemsPagados[productoId] ?? 0,
        });
      }
    }
    return Array.from(porProducto.values());
  }, [activeMesa]);

  const totalAbonadoActivo = useMemo(() => {
    if (!activeMesa) return 0;
    // mesaSubtotal − saldo: ambos ya vienen agregados correctamente por el
    // backend (CantidadDescontada por producto, sumada across rondas). Sumar
    // por fila de `order` sobre-contaría cuando un producto está repartido
    // en más de una ronda (cada fila multiplicaría por el total agregado).
    return Math.max(0, mesaSubtotal - activeMesa.saldo);
  }, [activeMesa, mesaSubtotal]);

  /**
   * Registra un pago parcial sobre la mesa/pedido activo.
   * Construye el body (mismo shape que `handleConfirmSale` pero con los
   * nuevos flags `itemsCubiertos` + `mantenerMesaAbierta`).
   */
  const handleConfirmAbono = useCallback(async (params: {
    itemsCubiertos: ItemCubiertoInput[];
    pagoCodigoSin: number;
    paymentMethod: PaymentMethodType;
    cashReceived: number;
  }): Promise<void> => {
    if (!activeMesa) return;
    const pedidoId = activeMesa.pedidoId;
    if (!pedidoId) {
      toast.error('Sin pedido', 'La mesa no tiene un pedido activo.');
      return;
    }
    const isParaLlevar = activeMesa.tipo === 'para_llevar';

    setIsProcessing(true);
    try {
      const pagos = {
        lineas: [{ codigo: params.pagoCodigoSin, monto: 0 }], // monto se recalcula
        total: 0,
      };
      // Calculamos el monto total de los items cubiertos (debe coincidir con
      // lo que ve el cajero en el panel).
      const montoCubierto = roundMoney(itemsParaPagoParcial.reduce((s, it) => {
        const itC = params.itemsCubiertos.find(ic => ic.producto_id === it.productoId);
        if (!itC) return s;
        return s + it.precioFinal * itC.cantidad;
      }, 0));
      pagos.lineas[0].monto = montoCubierto;
      pagos.total = montoCubierto;

      // Rastrear el método de pago de este parcial en el Abono local para
      // poder reconstruir el desglose acumulado al cerrar la venta.
      const pagosAbono: PaymentMethod[] = [{
        id: '',
        type: params.paymentMethod,
        name: '',
        amount: montoCubierto,
      }];

      // La decisión de facturar o no esta subventa ya se tomó en el step de
      // facturación de `PagoParcialPanel` (mismo patrón que el cobro final).
      const body = construirBodyCobro({
        reviewClienteId,
        customers,
        noFacturar,
        esSinNombre,
        codigoTipoDocumento,
        numeroDocumento,
        facturacionNombre,
        complemento,
        paisOrigenCodigo,
        pedidoId,
        pagos,
        aplicarDescuento: false,
        puntoVenta: puntoVentaActual,
      });

      const res = isParaLlevar
        ? await registrarAbonoParaLlevar(pedidoId, params.itemsCubiertos, body, pagosAbono)
        : await registrarAbonoMesa(activeMesa.id, params.itemsCubiertos, body, pagosAbono);

      if (res) {
        // El pedidoId no cambia con un cobro parcial (sigue el mismo hasta
        // que se cierra del todo), así que el useEffect keyed en pedidoId no
        // vuelve a disparar — hay que refrescar el historial explícitamente
        // para que la pestaña "Cobrado" muestre el cobro recién hecho.
        listarHistorialSubVentas(pedidoId);
        const nuevoSaldo = res.pedidoActualizado?.saldo ?? Math.max(0, mesaSubtotal - (totalAbonadoActivo + montoCubierto));
        if (nuevoSaldo <= 0.005) {
          // El saldo quedó en 0: el backend cerró la mesa y emitió la venta.
          // (Comportamiento esperado cuando el usuario seleccionó todos los
          // items pendientes.)
          const snapshotItemsCrudos = activeMesa.order.map((i: any) => ({
            cantidad: i.quantity,
            nombre: i.product.name,
            precio: i.precioFinal ?? i.product.price ?? 0,
            total: (i.precioFinal ?? i.product.price ?? 0) * i.quantity,
          }));
          setLastSaleResult({
            code: res.CodigoVenta ?? (isParaLlevar ? `PL-${pedidoId}` : `MESA-${activeMesa.id}`),
            total: res.TotalCobrado,
            items: consolidarItemsPorNombre(snapshotItemsCrudos),
            points: null, newBalance: 0,
            puntosPorVenta: res.PuntosPorVenta ?? 0,
            puntosPromocion: res.PuntosPromocionPermanente ?? 0,
            nombrePromocion: res.PromocionPermanente?.NombrePromocion ?? null,
            aplicoDescuento: res.AplicoDescuento ?? false,
            montoDescuento: res.MontoDescuento ?? 0,
            nombrePromoDescuento: res.PromocionDescuento?.NombrePromocion ?? null,
            ventaId: res.VentaId ?? null,
            estadoSiat: res.EstadoSiat ?? null,
            siatAceptada: res.SiatAceptada ?? false,
            errorSiat: res.ErrorSiat ?? null,
            codigoRecepcion: res.CodigoRecepcion ?? null,
            numeroFactura: res.NumeroFactura ?? null,
            cuf: res.CodigoHash ?? null,
            nitCliente: null,
            razonSocialCliente: activeMesa.cliente?.nombre ?? null,
            fechaEmision: new Date().toISOString(),
          });
          setModalView('success');
        } else {
          toast.success('Pago parcial registrado', `Saldo pendiente: ${formatCurrency(nuevoSaldo)}`);
          setPrintReciboData({
            mesaName: activeMesa.name,
            saleCode: `ABONO-${pedidoId}`,
            total: montoCubierto,
            metodoPago: params.paymentMethod,
            items: itemsParaPagoParcial
              .filter(it => params.itemsCubiertos.some(ic => ic.producto_id === it.productoId))
              .map(it => {
                const ic = params.itemsCubiertos.find(ic => ic.producto_id === it.productoId)!;
                return { nombre: it.product.name, cantidad: ic.cantidad, precio: it.precioFinal, total: it.precioFinal * ic.cantidad };
              }),
          });
          setModalView('detalle');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el pago parcial.';
      toast.error('Error', message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeMesa, itemsParaPagoParcial, totalAbonadoActivo, mesaSubtotal,
    puntoVentaActual, registrarAbonoMesa, registrarAbonoParaLlevar, listarHistorialSubVentas,
    reviewClienteId, customers, noFacturar, esSinNombre, codigoTipoDocumento,
    numeroDocumento, facturacionNombre, complemento, paisOrigenCodigo,
  ]);

  /**
   * El cajero eligió "Dividir entre varios" en el PagoParcialPanel.
   * Cerramos el PagoParcialPanel y abrimos el DividirCuentaPanel en modo
   * parcial con el sub-modo elegido y los items pendientes.
   */
  const handleAbrirDividir = useCallback((subModo: PagoParcialDividirModo, items: PagoParcialItem[]) => {
    setSubModoDividirParcial(subModo);
    setItemsParaDividirParcial(items);
    setModalView('pago_parcial_dividir');
  }, []);

  /**
   * Callback cuando el DividirCuentaPanel confirma el cobro parcial
   * dividido. Recibe los pagos agrupados por código SIN (varias líneas
   * si hubo métodos mixtos) y los `itemsCubiertos` (la selección
   * completa, sin dividir por cuenta).
   */
  const handleConfirmarPagoParcialDividido = useCallback(async (params: {
    pagos: { lineas: Array<{ codigo: number; monto: number }>; total: number };
    itemsCubiertos: ItemCubiertoInput[];
  }): Promise<void> => {
    if (!activeMesa) return;
    const pedidoId = activeMesa.pedidoId;
    if (!pedidoId) {
      toast.error('Sin pedido', 'La mesa no tiene un pedido activo.');
      return;
    }
    const isParaLlevar = activeMesa.tipo === 'para_llevar';

    setIsProcessing(true);
    try {
      // La decisión de facturar o no esta división ya se tomó en el step de
      // facturación de `DividirCuentaPanel` (mismo patrón que el cobro final).
      const pagosFactura = !noFacturar && params.pagos.lineas.length > 1
        ? consolidarPagoParaFactura(params.pagos)
        : undefined;

      const body = construirBodyCobro({
        reviewClienteId,
        customers,
        noFacturar,
        esSinNombre,
        codigoTipoDocumento,
        numeroDocumento,
        facturacionNombre,
        complemento,
        paisOrigenCodigo,
        pedidoId,
        pagos: params.pagos,
        pagosFactura,
        aplicarDescuento: false,
        puntoVenta: puntoVentaActual,
      });

      const res = isParaLlevar
        ? await registrarAbonoParaLlevar(pedidoId, params.itemsCubiertos, body)
        : await registrarAbonoMesa(activeMesa.id, params.itemsCubiertos, body);

      if (res) {
        listarHistorialSubVentas(pedidoId);
        const nuevoSaldo = res.pedidoActualizado?.saldo ?? Math.max(0, mesaSubtotal - (totalAbonadoActivo + params.pagos.total));
        if (nuevoSaldo <= 0.005) {
          const snapshotItemsCrudos = activeMesa.order.map((i: any) => ({
            cantidad: i.quantity,
            nombre: i.product.name,
            precio: i.precioFinal ?? i.product.price ?? 0,
            total: (i.precioFinal ?? i.product.price ?? 0) * i.quantity,
          }));
          setLastSaleResult({
            code: res.CodigoVenta ?? (isParaLlevar ? `PL-${pedidoId}` : `MESA-${activeMesa.id}`),
            total: res.TotalCobrado,
            items: consolidarItemsPorNombre(snapshotItemsCrudos),
            points: null, newBalance: 0,
            puntosPorVenta: res.PuntosPorVenta ?? 0,
            puntosPromocion: res.PuntosPromocionPermanente ?? 0,
            nombrePromocion: res.PromocionPermanente?.NombrePromocion ?? null,
            aplicoDescuento: res.AplicoDescuento ?? false,
            montoDescuento: res.MontoDescuento ?? 0,
            nombrePromoDescuento: res.PromocionDescuento?.NombrePromocion ?? null,
            ventaId: res.VentaId ?? null,
            estadoSiat: res.EstadoSiat ?? null,
            siatAceptada: res.SiatAceptada ?? false,
            errorSiat: res.ErrorSiat ?? null,
            codigoRecepcion: res.CodigoRecepcion ?? null,
            numeroFactura: res.NumeroFactura ?? null,
            cuf: res.CodigoHash ?? null,
            nitCliente: numeroDocumento.trim() !== '' && numeroDocumento.trim() !== DEFAULT_CF_NUMERO_DOC ? numeroDocumento.trim() : null,
            razonSocialCliente: facturacionNombre.trim() !== ''
              ? facturacionNombre.trim()
              : (clienteEfectivoParaPago?.nombre ?? null),
            fechaEmision: new Date().toISOString(),
          });
          setModalView('success');
        } else {
          toast.success('Pago parcial dividido registrado', `Saldo pendiente: ${formatCurrency(nuevoSaldo)}`);
          setPrintReciboData({
            mesaName: activeMesa.name,
            saleCode: `ABONO-${pedidoId}`,
            total: params.pagos.total,
            metodoPago: params.pagos.lineas.length === 1 ? sinCodeToPaymentType(params.pagos.lineas[0].codigo) : 'mixed',
            items: itemsParaDividirParcial
              .filter(it => params.itemsCubiertos.some(ic => ic.producto_id === it.productoId))
              .map(it => {
                const ic = params.itemsCubiertos.find(ic => ic.producto_id === it.productoId)!;
                return { nombre: it.product.name, cantidad: ic.cantidad, precio: it.precioFinal, total: it.precioFinal * ic.cantidad };
              }),
          });
          setModalView('detalle');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el pago parcial.';
      toast.error('Error', message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeMesa, totalAbonadoActivo, mesaSubtotal, puntoVentaActual,
    registrarAbonoMesa, registrarAbonoParaLlevar, listarHistorialSubVentas,
    reviewClienteId, customers, noFacturar, esSinNombre, codigoTipoDocumento,
    numeroDocumento, facturacionNombre, complemento, paisOrigenCodigo,
    clienteEfectivoParaPago, itemsParaDividirParcial,
  ]);

  const nextMilestone = useMemo(() => {
    if (!loyaltyProfile) return null;
    const count = loyaltyProfile.purchaseCount + 1;
    return milestones.find(m => m.purchaseNumber === count) ?? null;
  }, [loyaltyProfile, milestones]);

  useEffect(() => {
    if (activeCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCatId]);

  return (
    <MainLayout>
      <div className="-m-6 min-h-[calc(100dvh-4rem)] bg-[#160c02] overflow-y-auto">

        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-xl sm:text-2xl leading-tight">Punto de Venta</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-red-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'ocupada').length}</span>
                <span className="hidden sm:inline"> ocupadas</span>
                <span className="sm:hidden"> ocup.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-orange-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'parcial_pagado').length}</span>
                <span className="hidden sm:inline"> parcial</span>
                <span className="sm:hidden"> parc.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-amber-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'esperando_pago').length}</span>
                <span className="hidden sm:inline"> esperando</span>
                <span className="sm:hidden"> esp.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-emerald-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'libre').length}</span>
                <span className="hidden sm:inline"> libres</span>
                <span className="sm:hidden"> lib.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-400">{mesas.filter(m => m.tipo !== 'para_llevar').length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 mr-2">
              {(['libre', 'ocupada', 'parcial_pagado', 'esperando_pago'] as MesaStatus[]).map(s => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={clsx('h-2 w-2 rounded-full', STATUS_CFG[s].dot.replace(' animate-pulse', ''))} />
                </span>
              ))}
            </div>
            {(() => {
              const activeParaLlevar = mesas.find(m => m.tipo === 'para_llevar' && m.status !== 'libre');
              return (
                <button
                  disabled={isOpeningParaLlevar}
                  onClick={() => {
                    if (activeParaLlevar) {
                      setActiveMesaId(activeParaLlevar.id);
                      setModalView('detalle');
                      setDetalleView(activeParaLlevar.order.length > 0 ? 'historial' : 'none');
                      if (!productsLoaded) loadProducts();
                    } else {
                      setIniciarClienteId('');
                      setShowNewCustomerForm(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                      if (!productsLoaded) loadProducts();
                      setModalView('iniciar_para_llevar');
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-2 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60',
                    activeParaLlevar
                      ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50'
                      : 'bg-coffee-600 hover:bg-coffee-500',
                  )}
                >
                  {isOpeningParaLlevar
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
                    : <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                  }
                  <span className="hidden sm:inline">Para llevar</span>
                  {activeParaLlevar && !isOpeningParaLlevar && (
                    <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse flex-shrink-0" />
                  )}
                </button>
              );
            })()}
            <button
              onClick={() => { openNuevaMesa(); setModalView('nueva_mesa'); }}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Nueva Mesa</span>
            </button>
          </div>
        </div>

        {loadingMesas ? (
          <SkeletonMesaGrid count={6} />
        ) : mesas.filter(m => m.tipo !== 'para_llevar').length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 gap-5 select-none">
            <div className="h-20 w-20 rounded-3xl bg-coffee-800/60 flex items-center justify-center">
              <UtensilsCrossed className="h-10 w-10 text-coffee-500" />
            </div>
            <div className="text-center">
              <p className="text-coffee-200 font-semibold text-lg">No hay mesas</p>
              <p className="text-coffee-500 text-sm mt-1">Crea una mesa para empezar a tomar pedidos</p>
            </div>
            <button
              onClick={() => { openNuevaMesa(); setModalView('nueva_mesa'); }}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva Mesa
            </button>
          </div>
        ) : (
          <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {mesas.filter(m => m.tipo !== 'para_llevar').map(mesa => {
              const totalAbonado = mesa.abonos.reduce((s, a) => s + a.monto, 0);
              return (
                <MesaCard
                  key={mesa.id}
                  mesa={{ ...mesa, totalAbonado } as any}
                  statusCfg={STATUS_CFG}
                  formatCurrency={formatCurrency}
                  mesaOrderTotal={mesaOrderTotal}
                  onOpen={openModal}
                  onEdit={(mesa, e) => { openEditMesa(mesa as any, e); setModalView('nueva_mesa'); }}
                  onDelete={(mesaId, _e) => { const m = mesas.find(x => x.id === mesaId); setMesaToDeleteName(m?.name ?? ''); setConfirmDeleteMesaId(mesaId); }}
                  isDeletingMesa={isDeletingMesa}
                />
              );
            })}
          </div>
        )}

        {modalView === 'iniciar_para_llevar' && (
          <IniciarMesaModal
            tipo="para_llevar"
            mesa={{ id: 'para_llevar', name: 'Para llevar' }}
            iniciarClienteId={iniciarClienteId}
            showNewCustomerForm={showNewCustomerForm}
            isStartingMesa={isOpeningParaLlevar}
            customers={customers}
            getOrCreateProfile={getOrCreateProfile as any}
            onClienteChange={setIniciarClienteId}
            onToggleNewCustomerForm={() => { setShowNewCustomerForm(v => !v); setNewCustomerName(''); setNewCustomerPhone(''); }}
            onIniciar={handleIniciarParaLlevar}
            onClose={() => setModalView('none')}
            newCustomerName={newCustomerName}
            newCustomerPhone={newCustomerPhone}
            isCreatingCustomer={isCreatingCustomer}
            onNewCustomerNameChange={setNewCustomerName}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            onCreateCustomer={handleCreateCustomer}
          />
        )}

        {modalView === 'nueva_mesa' && (
          <NuevaMesaModal
            editMesaId={editMesaId}
            nuevaMesaName={nuevaMesaName}
            isSavingMesa={isSavingMesa}
            onNameChange={setNuevaMesaName}
            onSave={handleSaveMesa}
            onClose={() => { setModalView('none'); setActiveMesaId(null); }}
          />
        )}

        {modalView === 'iniciar' && activeMesa && (
          <IniciarMesaModal
            mesa={activeMesa}
            iniciarClienteId={iniciarClienteId}
            showNewCustomerForm={showNewCustomerForm}
            isStartingMesa={isStartingMesa}
            customers={customers}
            getOrCreateProfile={getOrCreateProfile as any}
            onClienteChange={setIniciarClienteId}
            onToggleNewCustomerForm={() => { setShowNewCustomerForm(v => !v); setNewCustomerName(''); setNewCustomerPhone(''); }}
            onIniciar={(overrideId) => { setModalView('none'); handleIniciarMesa(activeMesa, (overrideId ?? iniciarClienteId) || undefined); setIniciarClienteId(''); }}
            onClose={closeAll}
            newCustomerName={newCustomerName}
            newCustomerPhone={newCustomerPhone}
            isCreatingCustomer={isCreatingCustomer}
            onNewCustomerNameChange={setNewCustomerName}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            onCreateCustomer={handleCreateCustomer}
          />
        )}

        {modalView === 'detalle' && activeMesa && (
          <Overlay>
            <div className="bg-white w-full sm:max-w-xl md:max-w-4xl lg:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh]">

              <div className="bg-coffee-800 px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between flex-shrink-0">
                {(detalleView === 'historial' || detalleView === 'parciales') ? (
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setDetalleView('none')}
                      className="px-3 py-1 rounded-lg text-sm font-semibold text-coffee-300 hover:bg-white/10 transition-colors"
                    >
                      Productos
                    </button>
                    <button
                      onClick={() => setDetalleView('historial')}
                      className={clsx(
                        'px-3 py-1 rounded-lg text-sm font-semibold transition-colors',
                        detalleView === 'historial'
                          ? 'bg-white/20 text-cream cursor-default'
                          : 'text-coffee-300 hover:bg-white/10',
                      )}
                    >
                      Historial
                    </button>
                    {!!activeMesa.pedidoId && (
                      <button
                        onClick={() => setDetalleView('parciales')}
                        className={clsx(
                          'relative px-3 py-1 rounded-lg text-sm font-semibold transition-colors',
                          detalleView === 'parciales'
                            ? 'bg-white/20 text-cream cursor-default'
                            : 'text-coffee-300 hover:bg-white/10',
                        )}
                      >
                        Cobrado
                        {historialSubVentas.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                            {historialSubVentas.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ) : detalleView === 'pedido' ? (
                  <button
                    onClick={() => setDetalleView('none')}
                    className="flex items-center gap-2 text-cream hover:text-coffee-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="font-display font-bold text-lg">Ver pedido</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                      {activeMesa.tipo === 'para_llevar'
                        ? <ShoppingBag className="h-5 w-5 text-cream" />
                        : <UtensilsCrossed className="h-5 w-5 text-cream" />
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-coffee-400 uppercase tracking-widest">
                        {activeMesa.tipo === 'para_llevar' ? 'Mostrador' : STATUS_CFG[activeMesa.status as MesaStatus].label}
                      </p>
                      <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                      {(() => {
                        return activeMesa.cliente ? (
                          <p className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                            {activeMesa.cliente.nombre}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {detalleView === 'none' && (
                    <button
                      onClick={() => setDetalleView(v => (v === 'historial' || v === 'parciales') ? 'none' : 'historial')}
                      className="relative h-9 rounded-xl flex items-center justify-center gap-1.5 px-2.5 sm:px-4 transition-all text-sm font-semibold bg-white/10 text-coffee-300 hover:bg-white/20"
                    >
                      <History className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Historial</span>
                      {activeMesa.order.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          {activeMesa.order.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  )}
                  <button onClick={closeAll} className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {detalleView === 'none' && (
                <>
                  <div className="px-4 pt-2 pb-1 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 rounded-xl bg-coffee-50 border border-coffee-100 text-xs text-coffee-900 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300"
                      />
                      {productSearch && (
                        <button
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!productsLoaded ? (
                    <>
                      <SkeletonCategoryTabs />
                      <SkeletonProductScroll />
                    </>
                  ) : (
                    <>
                      <div className="relative flex-shrink-0">
                        <button
                          className="hidden sm:flex absolute left-0 top-0 bottom-0 z-10 items-center pl-1 pr-3 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-auto"
                          onClick={() => dragScrollDetalleCat.ref.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                        >
                          <ChevronLeft className="h-4 w-4 text-coffee-500" />
                        </button>
                        <div
                          ref={dragScrollDetalleCat.ref}
                          onMouseDown={dragScrollDetalleCat.onMouseDown}
                          onMouseMove={dragScrollDetalleCat.onMouseMove}
                          onMouseUp={dragScrollDetalleCat.onMouseUp}
                          onMouseLeave={dragScrollDetalleCat.onMouseLeave}
                          onDragStart={e => e.preventDefault()}
                          className="px-4 sm:px-8 pt-2 pb-1.5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {visibleCategories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCatId(cat.id)}
                              className={clsx(
                                'flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all',
                                activeCatId === cat.id
                                  ? 'bg-coffee-800 text-cream shadow-md'
                                  : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                              )}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                        <button
                          className="hidden sm:flex absolute right-0 top-0 bottom-0 z-10 items-center pr-1 pl-3 bg-gradient-to-l from-white via-white/70 to-transparent pointer-events-auto"
                          onClick={() => dragScrollDetalleCat.ref.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                        >
                          <ChevronRight className="h-4 w-4 text-coffee-500" />
                        </button>
                      </div>

                      <div className="relative flex-shrink-0">
                        <button
                          className="hidden sm:flex absolute left-0 top-0 bottom-0 z-10 items-center pl-1 pr-3 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-auto"
                          onClick={() => dragScrollDetalleProd.ref.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                        >
                          <ChevronLeft className="h-4 w-4 text-coffee-500" />
                        </button>
                        <div
                          ref={dragScrollDetalleProd.ref}
                          onMouseDown={dragScrollDetalleProd.onMouseDown}
                          onMouseMove={dragScrollDetalleProd.onMouseMove}
                          onMouseUp={dragScrollDetalleProd.onMouseUp}
                          onMouseLeave={dragScrollDetalleProd.onMouseLeave}
                          onDragStart={e => e.preventDefault()}
                          className="flex gap-2 overflow-x-auto px-4 sm:px-8 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none border-b border-coffee-100"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                        {pickerProducts.length === 0 ? (
                          <div className="flex items-center gap-2 text-coffee-300 h-24 w-full justify-center">
                            <Coffee className="h-5 w-5 opacity-40" />
                            <p className="text-xs">Sin productos en esta categoría</p>
                          </div>
                        ) : pickerProducts.map(product => {
                          const stock = getEffectiveStock(product);
                          const qty = getTempQty(product.id);
                          const attrCount = getAtributosByProductId(product.id).length;
                          return (
                            <ProdCard
                              key={product.id}
                              product={product}
                              qty={qty}
                              unavailable={!stock.ok}
                              attrCount={attrCount}
                              onAdd={() => addTempProduct(product)}
                              onInc={() => incTempQty(buildCartKey(product.id))}
                              onDec={() => decTempQty(buildCartKey(product.id))}
                              stockLabel={stock.label}
                            />
                          );
                        })}
                        </div>
                        <button
                          className="hidden sm:flex absolute right-0 top-0 bottom-0 z-10 items-center pr-1 pl-3 bg-gradient-to-l from-white via-white/70 to-transparent pointer-events-auto"
                          onClick={() => dragScrollDetalleProd.ref.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                        >
                          <ChevronRight className="h-4 w-4 text-coffee-500" />
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {detalleView === 'pedido' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {tempCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-coffee-300">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Aún no seleccionaste nada</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-coffee-50">
                        {tempCart.map((item, idx) => (
                          <div key={item.cartKey} className="px-5 py-3 space-y-1.5">
                            <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                              </div>
                              {item.opciones && item.opciones.length > 0 ? (
                                <div className="mt-0.5 space-y-0.5">
                                  {item.opciones.map((o, oi) => (
                                    <p key={oi} className="text-xs text-coffee-400">
                                      <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o)}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              {item.product.tipo === 'combo' && (
                                <div className="mt-0.5 space-y-0.5">
                                  {(() => {
                                    const componentes = item.product.comboComponentes?.length
                                      ? item.product.comboComponentes
                                      : item.product.tipo === 'combo'
                                        ? comboDetails[item.product.id]?.map(d => ({ nombre: d.name, cantidad: d.quantity }))
                                        : undefined;
                                    return componentes?.length ? (
                                      <div className="mt-0.5 space-y-0.5">
                                        {componentes.map((d, di) => (
                                          <p key={di} className="text-xs text-coffee-400">
                                            <span className="font-medium text-coffee-500">· </span>
                                            {d.cantidad}× {d.nombre}
                                            
                                          </p>
                                        ))}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                                <button onClick={() => removeTempItem(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => decTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
                                <button onClick={() => incTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            </div>
                            <div className="flex items-center gap-2 pl-7">
                              <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Nota (ej: sin azúcar, extra caliente...)"
                                value={item.notes ?? ''}
                                onChange={e => updateTempItemNote(item.cartKey, e.target.value)}
                                className="flex-1 text-[11px] text-coffee-700 placeholder:text-coffee-300 bg-transparent border-b border-coffee-100 focus:border-coffee-400 focus:outline-none py-0.5"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-coffee-500">Subtotal</span>
                        <span className="text-lg font-display font-black text-coffee-900">
                          {formatCurrency(tempCart.reduce((s, i) => s + i.precioFinal * i.quantity, 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {detalleView === 'historial' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeMesa.order.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-coffee-300">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Sin pedidos enviados aún</p>
                    </div>
                  ) : (() => {
                    const rounds = activeMesa.roundsSent.length > 0
                      ? activeMesa.roundsSent
                      : [{ number: 1, sentAt: activeMesa.openedAt ?? Date.now(), subTotal: 0 }];
                    return (
                      <>
                        {rounds.map(ronda => {
                          const rondaItems = activeMesa.order.filter(i => (i.roundNumber ?? 1) === ronda.number);
                          if (rondaItems.length === 0) return null;
                          const rondaTime = new Date(ronda.sentAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={ronda.number}>
                              <div className="flex items-center gap-2 px-5 py-2 bg-coffee-50 border-y border-coffee-100 sticky top-0 z-10">
                                <Printer className="h-3 w-3 text-coffee-400" />
                                <span className="text-[11px] font-bold text-coffee-600 uppercase tracking-wider">
                                  Ronda {ronda.number}
                                </span>
                                <span className="text-[11px] text-coffee-400">{rondaTime}</span>
                                <span className="text-[11px] font-semibold text-coffee-700">
                                  {formatCurrency(ronda.subTotal)}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                  {ronda.rondaId && (
                                    <>
                                      <button
                                        title="Editar ronda"
                                        onClick={() => setEditingRonda({ rondaId: ronda.rondaId!, rondaNumber: ronda.number, items: rondaItems })}
                                        className="h-6 w-6 rounded-md flex items-center justify-center text-coffee-400 hover:text-coffee-700 hover:bg-coffee-200 transition-colors"
                                      >
                                        <PenLine className="h-3 w-3" />
                                      </button>
<button
                                          title="Eliminar ronda"
                                          onClick={() => {
                                            setConfirmDeleteRondaId({ rondaId: ronda.rondaId!, rondaNumber: ronda.number });
                                          }}
                                          className="h-6 w-6 rounded-md flex items-center justify-center text-coffee-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {(() => {
                                const pendienteQty = (item: typeof rondaItems[0]) => {
                                  const productoId = parseInt(item.product.id, 10);
                                  const pagado = activeMesa.itemsPagados[productoId] ?? 0;
                                  return item.quantity - pagado;
                                };
                                const renderItem = (item: typeof rondaItems[0]) => {
                                  const cantidad = pendienteQty(item);
                                  return (
                                    <div key={item.cartKey} className="px-5 py-3 space-y-1.5">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                                          </div>
                                          {item.opciones && item.opciones.length > 0 && (
                                            <div className="mt-0.5 space-y-0.5">
                                              {item.opciones.map((o, oi) => (
                                                <p key={oi} className="text-xs text-coffee-400">
                                                  <span className="font-medium text-coffee-500">{o.atributoNombre}:</span>{' '}
                                                  {formatOpcionLabel(o)}
                                                </p>
                                              ))}
                                            </div>
                                          )}
                                          {(() => {
                                            const componentes = item.product.comboComponentes?.length
                                              ? item.product.comboComponentes
                                              : item.product.tipo === 'combo'
                                                ? comboDetails[item.product.id]?.map(d => ({ nombre: d.name, cantidad: d.quantity }))
                                                : undefined;
                                            return componentes?.length ? (
                                              <div className="mt-0.5 space-y-0.5">
                                                {componentes.map((d, di) => (
                                                  <p key={di} className="text-xs text-coffee-400">
                                                    <span className="font-medium text-coffee-500">· </span>
                                                    {d.cantidad}× {d.nombre}
                                                  </p>
                                                ))}
                                              </div>
                                            ) : null;
                                          })()}
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                          <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * cantidad)}</p>
                                          <span className="text-xs text-coffee-400 font-semibold">×{cantidad}</span>
                                        </div>
                                      </div>
                                      {item.notes && (
                                        <div className="flex items-center gap-2 pl-1">
                                          <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                                          <span className="text-[11px] text-coffee-500 italic">"{item.notes}"</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                };
                                const itemsPendientes = rondaItems.filter(i => pendienteQty(i) > 0);
                                if (itemsPendientes.length === 0) return null;
                                return (
                                  <div className="divide-y divide-coffee-50">
                                    {itemsPendientes.map(renderItem)}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                        <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between border-t border-coffee-100">
                          <span className="text-xs font-medium text-coffee-500">Total acumulado</span>
                          <span className="text-lg font-display font-black text-coffee-900">{formatCurrency(mesaSubtotal)}</span>
                        </div>
                        <button
                          onClick={() => handlePrintResumen('pendiente')}
                          className="mx-5 my-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-coffee-300 text-coffee-700 text-sm font-semibold hover:bg-coffee-50 transition-colors"
                          style={{ width: 'calc(100% - 2.5rem)' }}
                        >
                          <Printer className="h-4 w-4" />
                          Pre-cuenta
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {detalleView === 'parciales' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {historialSubVentas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-coffee-300">
                      <Coins className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Sin cobros parciales aún</p>
                    </div>
                  ) : (
                    <>
                      {historialSubVentas.map((sv, idx) => {
                        const fecha = formatHoraBolivia(sv.fecha);
                        return (
                          <div key={sv.id}>
                            <div className="flex items-center gap-2 px-5 py-2 bg-emerald-50 border-y border-emerald-100 sticky top-0 z-10">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                                Cobro {idx + 1}
                              </span>
                              <span className="text-[11px] text-coffee-400">{fecha}</span>
                              <span className="text-[11px] font-semibold text-emerald-700">{formatCurrency(sv.monto)}</span>
                              <span className={clsx(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                sv.facturada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                              )}>
                                {sv.facturada ? 'Facturada' : 'Sin factura'}
                              </span>
                              <div className="ml-auto flex items-center gap-1">
                                {!sv.facturada && (
                                  <button
                                    title="Facturar este cobro"
                                    onClick={() => setFacturandoSubVenta(sv)}
                                    className="h-5 w-5 rounded flex items-center justify-center transition-colors flex-shrink-0 text-coffee-500 hover:bg-coffee-200"
                                  >
                                    <FileText className="h-3 w-3" />
                                  </button>
                                )}
                                <PrintOptionsMenu
                                  options={[
                                    ...(sv.facturada && sv.idVenta ? [{
                                      label: 'Imprimir factura SIAT',
                                      icon: <ScrollText className="h-4 w-4 flex-shrink-0 text-emerald-600" />,
                                      onClick: async () => {
                                        const venta = await fetchVentaById(sv.idVenta!);
                                        if (!venta) {
                                          toast.error('Sin datos', 'No se pudo cargar la factura para reimprimir.');
                                          return;
                                        }
                                        setPrintFacturaData({
                                          ventaId: venta.ventaId!,
                                          numeroFactura: venta.numeroFactura ?? null,
                                          codigoRecepcion: venta.codigoRecepcion ?? null,
                                          cuf: venta.cuf ?? null,
                                          nitCliente: venta.nitCliente ?? null,
                                          razonSocialCliente: venta.customerName ?? null,
                                          fechaEmision: venta.date ? new Date(venta.date).toISOString() : null,
                                          total: venta.total,
                                          subtotal: venta.subtotal,
                                          descuentoAdicional: venta.discount,
                                          leyenda: venta.leyenda ?? null,
                                          items: venta.items.map(it => ({
                                            cantidad: it.quantity,
                                            nombre: it.productName ?? 'Producto',
                                            precio: it.unitPrice,
                                            total: it.total,
                                          })),
                                        });
                                      },
                                    }] : []),
                                    {
                                      label: 'Imprimir recibo',
                                      icon: <Printer className="h-4 w-4 flex-shrink-0 text-coffee-600" />,
                                      onClick: () => setPrintReciboData({
                                        mesaName: activeMesa.name,
                                        saleCode: `Cobro ${idx + 1}`,
                                        total: sv.monto,
                                        metodoPago: 'cash',
                                        items: sv.detalles.map(d => ({
                                          nombre: d.nombreProducto,
                                          cantidad: d.cantidad,
                                          precio: d.precio,
                                          total: d.precio * d.cantidad,
                                        })),
                                      }),
                                    },
                                  ]}
                                />
                                {!sv.esPagoFinal && !sv.facturada && (
                                  <button
                                    title="Revertir pago parcial"
                                    onClick={async () => {
                                      const ok = await revertirAbonoMesa(activeMesa.id, sv.id);
                                      if (ok) {
                                        toast.success('Pago revertido', `Se revirtió el abono de ${formatCurrency(sv.monto)}.`);
                                        listarHistorialSubVentas(activeMesa.pedidoId!);
                                      }
                                    }}
                                    className="h-5 w-5 rounded flex items-center justify-center text-orange-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="divide-y divide-coffee-50">
                              {sv.detalles.length === 0 ? (
                                <div className="px-5 py-3 text-xs text-coffee-400 text-center">Sin detalle de items</div>
                              ) : sv.detalles.map((d, di) => (
                                <div key={di} className="px-5 py-3 flex items-center gap-3 opacity-75">
                                  <div className="h-5 w-5 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-coffee-600 line-through line-clamp-1">
                                      {d.nombreProducto}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end flex-shrink-0">
                                    <p className="text-sm font-semibold text-emerald-600">
                                      {formatCurrency(d.precio * d.cantidad)}
                                    </p>
                                    <span className="text-xs text-coffee-400">×{d.cantidad}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between border-t border-coffee-100">
                        <span className="text-xs font-medium text-coffee-500">Total cobrado parcial</span>
                        <span className="text-lg font-display font-black text-emerald-700">{formatCurrency(totalAbonadoActivo)}</span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => handlePrintResumen('cobrado')}
                    className="mx-5 my-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-coffee-300 text-coffee-700 text-sm font-semibold hover:bg-coffee-50 transition-colors"
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  >
                    <Printer className="h-4 w-4" />
                    Pre-cuenta
                  </button>
                </div>
              )}

              {detalleView === 'none' && (
                <div className="px-4 py-2 border-t border-coffee-100 flex-shrink-0">
                  {activeMesa.customerId && (
                    <div className="flex items-center gap-1.5 text-xs text-coffee-600">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{activeMesa.cliente?.nombre ?? 'Cliente'}</span>
                      <span className="text-coffee-400">· {activeMesa.cliente?.puntos ?? 0} pts</span>
                    </div>
                  )}
                </div>
              )}

              {historialSubVentas.length > 0 && detalleView === 'none' && (
                <button
                  onClick={() => setDetalleView('parciales')}
                  className="border-t border-orange-100 flex-shrink-0 px-5 py-2 bg-orange-50 flex items-center justify-between w-full hover:bg-orange-100 transition-colors"
                >
                  <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                    Pagos parciales ({historialSubVentas.length}) · ver detalle
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-700">Abonado: {formatCurrency(totalAbonadoActivo)}</span>
                    <span className="text-coffee-300 text-xs">·</span>
                    <span className="text-xs font-bold text-amber-700">Saldo: {formatCurrency(activeMesa.saldo)}</span>
                  </div>
                </button>
              )}
              <div className="px-4 py-2 sm:py-3 border-t border-coffee-100 relative flex items-center flex-shrink-0">
                <button
                  onClick={() => setDetalleView(v => v === 'pedido' ? 'none' : 'pedido')}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex-shrink-0',
                    detalleView === 'pedido'
                      ? 'bg-coffee-800 text-cream'
                      : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                  )}
                >
                  <ShoppingBag className="h-5 w-5" />
                  Ver pedido
                  {tempCart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {tempCart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>

                {activeMesa.order.length === 0 && tempCart.length === 0 && (
                  <button
                    onClick={() => handleCerrarMesa(activeMesa.id)}
                    disabled={!!isClosingMesa}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-coffee-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                    {isClosingMesa ? 'Liberando...' : 'Liberar mesa'}
                  </button>
                )}

                <div className="flex-1 flex justify-end gap-2">
                  {tempCart.length > 0 && (
                    <button
                      onClick={handleSendToKitchen}
                      disabled={isSendingToKitchen}
                      className="relative flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-coffee-800 text-cream text-xs sm:text-sm font-bold hover:bg-coffee-700 active:scale-95 transition-all shadow-md disabled:opacity-60"
                    >
                      {isSendingToKitchen ? (
                        <div className="w-5 h-5 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                      ) : (
                        <Printer className="h-5 w-5" />
                      )}
                      {isSendingToKitchen ? 'Enviando...' : 'Enviar a cocina/barra'}
                      {!isSendingToKitchen && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-400 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          {tempCart.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  )}
                  {tempCart.length === 0 && (
                    <>
                      {(() => {
                        // Fuente de verdad: `saldo` ya viene agregado correctamente
                        // desde el backend (CantidadDescontada por producto, sumada
                        // across rondas) — evita el error de comparar por fila cuando
                        // un mismo producto está repartido en más de una ronda.
                        const hayPendiente = activeMesa.saldo > 0.005;
                        return hayPendiente ? (
                          <button
                            onClick={() => {
                              if (activeMesa.order.length === 0) return;
                              setModalView('pago_parcial');
                            }}
                            disabled={activeMesa.order.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all bg-orange-600 text-white hover:bg-orange-500 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Cobrar parte de los items sin cerrar la mesa"
                          >
                            <Coins className="h-4 w-4" />
                            <span className="hidden sm:inline">Cobro parcial</span>
                            <span className="sm:hidden">Parcial</span>
                          </button>
                        ) : null;
                      })()}
                      <button
                        onClick={handleRequestPayment}
                        disabled={activeMesa.order.length === 0}
                        className={clsx(
                          'flex items-center gap-1.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
                          activeMesa.order.length > 0
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-md'
                            : 'bg-coffee-100 text-coffee-400 cursor-not-allowed',
                        )}
                      >
                        Cobrar <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </Overlay>
        )}

        {modalView === 'pago_parcial' && activeMesa && (
          <Overlay>
            <PagoParcialPanel
              key={`pago-parcial-${activeMesa.id}-${activeMesa.abonos.length}`}
              mesaName={activeMesa.name}
              items={itemsParaPagoParcial}
              mesaTotal={mesaSubtotal}
              totalAbonado={totalAbonadoActivo}
              saldo={activeMesa.saldo}
              formatCurrency={formatCurrency}
              onBack={() => setModalView('detalle')}
              onConfirm={handleConfirmAbono}
              onAbrirDividir={handleAbrirDividir}
              isProcessing={isProcessing}
              clientes={customers}
              selectedClienteId={reviewClienteId ?? ''}
              onClienteChange={(id) => setReviewClienteId(id || null)}
              noFacturar={noFacturar}
              onNoFacturarChange={handleNoFacturarChange}
              esSinNombre={esSinNombre}
              onEsSinNombreChange={handleEsSinNombreChange}
              codigoTipoDocumento={codigoTipoDocumento}
              onCodigoTipoDocumentoChange={handleCodigoTipoDocumentoChange}
              numeroDocumento={numeroDocumento}
              onNumeroDocumentoChange={handleNumeroDocumentoChange}
              complemento={complemento}
              onComplementoChange={handleComplementoChange}
              facturacionNombre={facturacionNombre}
              onFacturacionNombreChange={handleFacturacionNombreChange}
              paisOrigenCodigo={paisOrigenCodigo}
              onPaisOrigenCodigoChange={setPaisOrigenCodigo}
              clienteEsConsumidorFinal={clienteEsConsumidorFinal}
              clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
              docSearchResults={docSearchResults}
              docSearchLoading={docSearchLoading}
              docSearchActive={docSearchActive}
              nombreSearchResults={nombreSearchResults}
              nombreSearchLoading={nombreSearchLoading}
              nombreSearchActive={nombreSearchActive}
              onAssignCustomerFromSearch={handleAssignCustomerFromSearch}
              onClearSearchResults={clearSearchResults}
              reviewShowNewCustomerForm={reviewShowNewCustomerForm}
              onToggleReviewNewCustomerForm={() => { setReviewShowNewCustomerForm(v => !v); setReviewNewCustomerName(''); setReviewNewCustomerPhone(''); }}
              reviewNewCustomerName={reviewNewCustomerName}
              onReviewNewCustomerNameChange={setReviewNewCustomerName}
              reviewNewCustomerPhone={reviewNewCustomerPhone}
              onReviewNewCustomerPhoneChange={setReviewNewCustomerPhone}
              isCreatingCustomer={isCreatingCustomer}
              onCreateCustomerReview={handleCreateCustomerReview}
            />
          </Overlay>
        )}

        {modalView === 'pago_parcial_dividir' && activeMesa && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <DividirCuentaPanel
                mesaName={activeMesa.name}
                order={itemsParaDividirParcial as any}
                mesaTotal={mesaSubtotal}
                formatCurrency={formatCurrency}
                onBack={() => setModalView('pago_parcial')}
                onAllPaid={() => {/* no-op en parcial: usamos onPartialAllPaid */}}
                itemsParciales={itemsParaDividirParcial}
                onPartialAllPaid={handleConfirmarPagoParcialDividido}
                initialMode={subModoDividirParcial}
                qrImageUrl={qrImageUrl}
                clientes={customers}
                selectedClienteId={reviewClienteId ?? ''}
                onClienteChange={(id) => setReviewClienteId(id || null)}
                noFacturar={noFacturar}
                onNoFacturarChange={handleNoFacturarChange}
                esSinNombre={esSinNombre}
                onEsSinNombreChange={handleEsSinNombreChange}
                codigoTipoDocumento={codigoTipoDocumento}
                onCodigoTipoDocumentoChange={handleCodigoTipoDocumentoChange}
                numeroDocumento={numeroDocumento}
                onNumeroDocumentoChange={handleNumeroDocumentoChange}
                complemento={complemento}
                onComplementoChange={handleComplementoChange}
                facturacionNombre={facturacionNombre}
                onFacturacionNombreChange={handleFacturacionNombreChange}
                paisOrigenCodigo={paisOrigenCodigo}
                onPaisOrigenCodigoChange={setPaisOrigenCodigo}
                clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
                docSearchResults={docSearchResults}
                docSearchLoading={docSearchLoading}
                docSearchActive={docSearchActive}
                nombreSearchResults={nombreSearchResults}
                nombreSearchLoading={nombreSearchLoading}
                nombreSearchActive={nombreSearchActive}
                onAssignCustomerFromSearch={handleAssignCustomerFromSearch}
                onClearSearchResults={clearSearchResults}
                reviewShowNewCustomerForm={reviewShowNewCustomerForm}
                onToggleReviewNewCustomerForm={() => { setReviewShowNewCustomerForm(v => !v); setReviewNewCustomerName(''); setReviewNewCustomerPhone(''); }}
                reviewNewCustomerName={reviewNewCustomerName}
                onReviewNewCustomerNameChange={setReviewNewCustomerName}
                reviewNewCustomerPhone={reviewNewCustomerPhone}
                onReviewNewCustomerPhoneChange={setReviewNewCustomerPhone}
                isCreatingCustomer={isCreatingCustomer}
                onCreateCustomerReview={handleCreateCustomerReview}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'subventas_pendientes' && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <SubVentasPendientesPanel
                formatCurrency={formatCurrency}
                onBack={() => setModalView('none')}
                customers={customers}
                puntoVentaActual={puntoVentaActual}
              />
            </Suspense>
          </Overlay>
        )}

        {facturandoSubVenta && (
          <Overlay onClose={() => setFacturandoSubVenta(null)}>
            <FacturarSubVentaModal
              subVenta={facturandoSubVenta}
              customers={customers}
              puntoVentaActual={puntoVentaActual}
              formatCurrency={formatCurrency}
              onBack={() => setFacturandoSubVenta(null)}
              onFacturada={() => {
                setFacturandoSubVenta(null);
                if (activeMesa?.pedidoId) listarHistorialSubVentas(activeMesa.pedidoId);
              }}
            />
          </Overlay>
        )}

        {modalView === 'review' && activeMesa && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <ReviewPanel
                mesaName={activeMesa.name}
                order={activeMesa.order.map(it => {
                  const productoId = parseInt(it.product.id, 10);
                  const cantidadPagada = activeMesa.itemsPagados[productoId] ?? 0;
                  return { ...it, cantidadPagada };
                }) as any}
                mesaTotal={mesaSubtotal}
                formatCurrency={formatCurrency}
                onBack={() => setModalView('detalle')}
                onConfirm={() => setModalView('pago')}
                onDividir={() => setModalView('dividir')}
                totalAbonado={totalAbonadoActivo}
                saldo={activeMesa.saldo}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'dividir' && activeMesa && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <DividirCuentaPanel
                mesaName={activeMesa.name}
                order={activeMesa.order as any}
                mesaTotal={mesaTotal}
                formatCurrency={formatCurrency}
                onBack={() => setModalView('review')}
                onAllPaid={handleConfirmSaleDividida}
                clientes={customers}
                selectedClienteId={reviewClienteId ?? ''}
                onClienteChange={(id) => setReviewClienteId(id || null)}
                qrImageUrl={qrImageUrl}
                // Facturación
                noFacturar={noFacturar}
                onNoFacturarChange={handleNoFacturarChange}
                esSinNombre={esSinNombre}
                onEsSinNombreChange={handleEsSinNombreChange}
                codigoTipoDocumento={codigoTipoDocumento}
                onCodigoTipoDocumentoChange={handleCodigoTipoDocumentoChange}
                numeroDocumento={numeroDocumento}
                onNumeroDocumentoChange={handleNumeroDocumentoChange}
                complemento={complemento}
                onComplementoChange={handleComplementoChange}
                facturacionNombre={facturacionNombre}
                onFacturacionNombreChange={handleFacturacionNombreChange}
                paisOrigenCodigo={paisOrigenCodigo}
                onPaisOrigenCodigoChange={setPaisOrigenCodigo}
                clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
                docSearchResults={docSearchResults}
                docSearchLoading={docSearchLoading}
                docSearchActive={docSearchActive}
                nombreSearchResults={nombreSearchResults}
                nombreSearchLoading={nombreSearchLoading}
                nombreSearchActive={nombreSearchActive}
                onAssignCustomerFromSearch={handleAssignCustomerFromSearch}
                onClearSearchResults={clearSearchResults}
                reviewShowNewCustomerForm={reviewShowNewCustomerForm}
                onToggleReviewNewCustomerForm={() => { setReviewShowNewCustomerForm(v => !v); setReviewNewCustomerName(''); setReviewNewCustomerPhone(''); }}
                reviewNewCustomerName={reviewNewCustomerName}
                onReviewNewCustomerNameChange={setReviewNewCustomerName}
                reviewNewCustomerPhone={reviewNewCustomerPhone}
                onReviewNewCustomerPhoneChange={setReviewNewCustomerPhone}
                isCreatingCustomer={isCreatingCustomer}
                onCreateCustomerReview={handleCreateCustomerReview}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'pago' && activeMesa && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <PagoPanel
                mesaName={activeMesa.name}
                mesaTotal={mesaTotal}
                paymentMethod={paymentMethod}
                cashReceived={cashReceived}
                isProcessing={isProcessing}
                cashNum={cashNum}
                change={change}
                pointsPreview={pointsPreview}
                formatCurrency={formatCurrency}
                onPaymentMethodChange={setPaymentMethod}
                onCashReceivedChange={setCashReceived}
                onBack={() => setModalView('review')}
                onConfirm={handleConfirmSale}
                reviewClienteId={reviewClienteId}
                onReviewClienteChange={setReviewClienteId}
                customers={customers}
                onCreateCustomer={handleCreateCustomerReview}
                isCreatingCustomer={isCreatingCustomer}
                reviewShowNewCustomerForm={reviewShowNewCustomerForm}
                onToggleReviewNewCustomerForm={() => { setReviewShowNewCustomerForm(v => !v); setReviewNewCustomerName(''); setReviewNewCustomerPhone(''); }}
                reviewNewCustomerName={reviewNewCustomerName}
                reviewNewCustomerPhone={reviewNewCustomerPhone}
                onReviewNewCustomerNameChange={setReviewNewCustomerName}
                onReviewNewCustomerPhoneChange={setReviewNewCustomerPhone}
                docSearchResults={docSearchResults}
                docSearchLoading={docSearchLoading}
                docSearchActive={docSearchActive}
                nombreSearchResults={nombreSearchResults}
                nombreSearchLoading={nombreSearchLoading}
                nombreSearchActive={nombreSearchActive}
                onAssignCustomerFromSearch={handleAssignCustomerFromSearch}
                onClearSearchResults={clearSearchResults}
                facturacionNombre={facturacionNombre}
                onFacturacionNombreChange={handleFacturacionNombreChange}
                qrImageUrl={qrImageUrl}
                discountPreview={descuentoPreview}
                aplicarDescuento={aplicarDescuento}
                onAplicarDescuentoChange={setAplicarDescuento}
                isLoadingDescuento={isLoadingDescuento}
                codigoTipoDocumento={codigoTipoDocumento}
                numeroDocumento={numeroDocumento}
                complemento={complemento}
                onCodigoTipoDocumentoChange={handleCodigoTipoDocumentoChange}
                onNumeroDocumentoChange={handleNumeroDocumentoChange}
                onComplementoChange={handleComplementoChange}
                clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
                esSinNombre={esSinNombre}
                onEsSinNombreChange={handleEsSinNombreChange}
                noFacturar={noFacturar}
                onNoFacturarChange={handleNoFacturarChange}
                paisOrigenCodigo={paisOrigenCodigo}
                onPaisOrigenCodigoChange={setPaisOrigenCodigo}
                totalOriginal={totalAbonadoActivo > 0 ? mesaSubtotal : undefined}
                totalAbonado={totalAbonadoActivo}
                etiquetaTotal={totalAbonadoActivo > 0 ? 'Saldo a cobrar' : undefined}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'success' && lastSaleResult && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <SuccessPanel
                saleCode={lastSaleResult.code}
                mesaName={activeMesa?.name ?? ''}
                newBalance={lastSaleResult.newBalance}
                onPrint={() => setPrintReciboData({
                  mesaName: activeMesa?.name ?? '',
                  saleCode: lastSaleResult.code,
                  total: lastSaleResult.total,
                  metodoPago: paymentMethod,
                  items: lastSaleResult.items,
                })}
                onClose={handleCloseSuccess}
                nextMilestone={nextMilestone}
                pointsResult={lastSaleResult.points}
                puntosPorVenta={lastSaleResult.puntosPorVenta}
                puntosPromocion={lastSaleResult.puntosPromocion}
                nombrePromocion={lastSaleResult.nombrePromocion}
                aplicoDescuento={lastSaleResult.aplicoDescuento}
                montoDescuento={lastSaleResult.montoDescuento}
                nombrePromoDescuento={lastSaleResult.nombrePromoDescuento}
                ventaId={lastSaleResult.ventaId}
                estadoSiat={lastSaleResult.estadoSiat}
                siatAceptada={lastSaleResult.siatAceptada}
                errorSiat={lastSaleResult.errorSiat}
                codigoRecepcion={lastSaleResult.codigoRecepcion}
                numeroFactura={lastSaleResult.numeroFactura}
                onOpenFacturaModal={async () => {
                  if (!lastSaleResult?.ventaId) return;
                  // Traemos una leyenda aleatoria del catálogo CatLeyendas
                  // (mismo origen que usa el backend al persistir Venta.Leyenda).
                  const { leyenda } = await api
                    .get<{ leyenda: string }>('/api/Facturacion/leyenda-aleatoria')
                    .catch(() => ({ leyenda: '' }));
                  setPrintFacturaData({
                    ventaId: lastSaleResult.ventaId,
                    numeroFactura: lastSaleResult.numeroFactura,
                    codigoRecepcion: lastSaleResult.codigoRecepcion,
                    cuf: lastSaleResult.cuf,
                    nitCliente: lastSaleResult.nitCliente,
                    razonSocialCliente: lastSaleResult.razonSocialCliente,
                    fechaEmision: lastSaleResult.fechaEmision,
                    total: lastSaleResult.total,
                    leyenda: leyenda || null,
                    items: lastSaleResult.items.map((it) => ({
                      cantidad: it.cantidad,
                      nombre: it.nombre,
                      precio: it.precio,
                      total: it.total,
                    })),
                  });
                }}
                onResendSiat={async (ventaId) => {
                  const r = await reenviarFactura(ventaId);
                  if (r?.Siat) {
                    setLastSaleResult((prev) => prev ? {
                      ...prev,
                      estadoSiat: r.Siat.EstadoSiat,
                      siatAceptada: r.Siat.Transaccion === true,
                      errorSiat: r.Siat.ErrorMensaje,
                      codigoRecepcion: r.Siat.CodigoRecepcion ?? prev.codigoRecepcion,
                    } : prev);
                  }
                }}
              />
            </Suspense>
          </Overlay>
        )}

        {comboDetailProduct && (
          <Overlay>
            <ComboDetailPanel
              product={comboDetailProduct as any}
              details={comboDetails[comboDetailProduct.id] ?? []}
              formatCurrency={formatCurrency}
              onAdd={() => {
                const reserved = getTempQty(comboDetailProduct.id);
                if (reserved >= comboDetailProduct.stock) {
                  toast.error('Stock insuficiente', `Solo hay ${comboDetailProduct.stock} unidad(es) de ${comboDetailProduct.name}.`);
                  return;
                }
                addTempDirect(comboDetailProduct, undefined, undefined, 1, calcularConsumoCombo(comboDetailProduct.id));
                setComboDetailProduct(null);
              }}
              onClose={() => setComboDetailProduct(null)}
            />
          </Overlay>
        )}

        {elaboradoDetailProduct && (
          <ElaboradoDetailModal
            isOpen
            onClose={() => setElaboradoDetailProduct(null)}
            product={elaboradoDetailProduct}
            atributos={getAtributosByProductId(elaboradoDetailProduct.id)}
            ingredientes={elaboradoIngredientes[elaboradoDetailProduct.id] ?? []}
            insumosStock={
              (elaboradoExtras[elaboradoDetailProduct.id]?.insumosStock ?? []).map(i => ({
                ...i,
                stock: Math.max(0, i.stock - (consumedFromCart[i.id] ?? 0)),
              }))
            }
            opcionesStockInfo={elaboradoExtras[elaboradoDetailProduct.id]?.opcionesStockInfo ?? []}
            receta={elaboradoExtras[elaboradoDetailProduct.id]?.receta ?? null}
            variaciones={elaboradoExtras[elaboradoDetailProduct.id]?.variaciones ?? []}
            effectiveMax={elaboradoEffectiveMax}
            onConfirm={(opciones, precioFinal, qty, consumoInsumos) => {
              if (qty > elaboradoEffectiveMax) {
                toast.error('Stock insuficiente', `Solo hay ${elaboradoEffectiveMax} unidad(es) disponibles de ${elaboradoDetailProduct.name}.`);
                return;
              }
              addTempDirect(elaboradoDetailProduct, opciones, precioFinal, qty, consumoInsumos);
              setElaboradoDetailProduct(null);
            }}
          />
        )}

        {varPickerProduct && (
          <VariacionPickerModal
            isOpen
            onClose={() => { setVarPickerProduct(null); setVarPickerDirect(false); }}
            product={varPickerProduct}
            atributos={getAtributosByProductId(varPickerProduct.id)}
            onConfirm={(opciones, precioFinal) => {
              if (varPickerDirect) {
                toast.success('Producto agregado', `${varPickerProduct.name} añadido al pedido.`);
                setVarPickerDirect(false);
              } else {
                addTempDirect(varPickerProduct, opciones, precioFinal);
              }
              setVarPickerProduct(null);
            }}
          />
        )}

        {confirmDeleteMesaId && (
          <ConfirmModal
            isOpen
            onClose={() => setConfirmDeleteMesaId(null)}
            onConfirm={() => { handleDeleteMesa(confirmDeleteMesaId, { stopPropagation: () => {} } as any); setConfirmDeleteMesaId(null); }}
            title="Eliminar mesa"
            message={`¿Eliminar la mesa "${mesaToDeleteName}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            variant="danger"
          />
        )}

        {confirmDeleteRondaId && activeMesa && (
          <ConfirmModal
            isOpen
            onClose={() => setConfirmDeleteRondaId(null)}
            onConfirm={async () => {
              const pedidoId = (activeMesa as any).pedidoId;
              if (!pedidoId) return;
              const ok = await eliminarRondaOrden(activeMesa.id, confirmDeleteRondaId.rondaId, pedidoId);
              if (ok) setConfirmDeleteRondaId(null);
            }}
            title={`Eliminar Ronda ${confirmDeleteRondaId.rondaNumber}`}
            message="¿Eliminar esta ronda? Se devolverá el stock y no se puede deshacer."
            confirmText={isEliminandoRonda ? 'Eliminando...' : 'Eliminar'}
            variant="danger"
          />
        )}

        {editingRonda && activeMesa && (
          <EditarRondaModal
            isOpen
            rondaNumber={editingRonda.rondaNumber}
            items={editingRonda.items}
            isSaving={isEditandoRonda}
            formatCurrency={formatCurrency}
            onClose={() => setEditingRonda(null)}
            onConfirm={async (detalles: DtoRondaDetalleEditar[]) => {
              const pedidoId = (activeMesa as any).pedidoId;
              if (!pedidoId) return;
              const ok = detalles.length === 0
                ? await eliminarRondaOrden(activeMesa.id, editingRonda.rondaId, pedidoId)
                : await editarRondaOrden(activeMesa.id, editingRonda.rondaId, pedidoId, detalles);
              if (ok) setEditingRonda(null);
            }}
          />
        )}
      </div>

      <PrintComandaModal
        data={printComandaData}
        onClose={() => setPrintComandaData(null)}
      />
      <PrintReciboModal
        data={printReciboData}
        onClose={() => setPrintReciboData(null)}
      />
      <PreCuentaModal
        data={printPreCuentaData}
        onClose={() => setPrintPreCuentaData(null)}
      />
      <PrintFacturaModal
        data={printFacturaData}
        onConfirm={async (destinos, ancho) => {
          if (!printFacturaData) return;
          await imprimirFactura(printFacturaData.ventaId, destinos, ancho);
        }}
        onClose={() => setPrintFacturaData(null)}
      />
    </MainLayout>
  );
};
