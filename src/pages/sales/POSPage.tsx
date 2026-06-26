import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, Printer,
  X, Star, Search,
  UtensilsCrossed, ChevronLeft, ChevronRight, PenLine, History, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { api, ApiError } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { getConnection } from '../../lib/signalr';
import { GET_POS_DATA } from '../../lib/queries/products.queries';
import { GET_CLIENTE_BY_DNI, GET_CLIENTES_SEARCH } from '../../lib/queries/clientes.queries';
import { GET_ELABORADO_INGREDIENTES } from '../../lib/queries/elaborados.queries';
import { usePOSMesas } from '../../hooks/usePOSMesas';
import { useVenta } from '../../hooks/useVenta';
import type { RespuestaCobro } from '../../hooks/useVenta';
import { usePOSCart } from '../../hooks/usePOSCart';
import { usePOSLoyalty } from '../../hooks/usePOSLoyalty';
import { useDragScroll } from '../../hooks/useDragScroll';
import { formatCurrency } from '../../utils';
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
import type { CartItem } from '../../hooks/usePOSCart';
import type { DtoRondaDetalleEditar } from '../../hooks/useMesas';
import type { Product, Category, Customer, PaymentMethodType, VariacionAtributo } from '../../types';
import type { MilestoneReward, PointsCalculation } from '../../types/loyalty';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import { ElaboradoDetailModal } from '../../components/modals/ElaboradoDetailModal';
import { ProdCard } from '../../components/modals/ProdCard';
import { TIPO_DOC_NIT, DEFAULT_CF_NUMERO_DOC, DEFAULT_CF_COMPLEMENTO, DEFAULT_SIN_NOMBRE } from '../../constants/facturacion';
import { findConsumidorFinal, esConsumidorFinal } from '../../utils/consumidorFinal';
import { useFacturacion } from '../../hooks/useFacturacion';
import { usePuntoVenta } from '../../contexts';
import type { PuntoVentaSeleccionado } from '../../contexts';

const ReviewPanel = lazy(() => import('../../components/pos/ReviewPanel').then(m => ({ default: m.ReviewPanel })));
const PagoPanel = lazy(() => import('../../components/pos/PagoPanel').then(m => ({ default: m.PagoPanel })));
const SuccessPanel = lazy(() => import('../../components/pos/SuccessPanel').then(m => ({ default: m.SuccessPanel })));
const DividirCuentaPanel = lazy(() => import('../../components/pos/DividirCuentaPanel').then(m => ({ default: m.DividirCuentaPanel })));

type ModalView = 'none' | 'nueva_mesa' | 'iniciar' | 'iniciar_para_llevar' | 'detalle' | 'review' | 'pago' | 'dividir' | 'success';
type DetalleView = 'none' | 'pedido' | 'historial';



const mesaOrderTotal = (order: any[]) =>
  order.reduce((s, i) => s + i.precioFinal * i.quantity, 0);


type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago';

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

interface PagosObject {
  efectivo: number;
  tarjeta: number;
  qr: number;
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
  pedidoId: number;
  pagos: PagosObject;
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
  const pvFields = params.puntoVenta
    ? {
        codigoSucursal: params.puntoVenta.codigoSucursal,
        codigoPuntoVenta: params.puntoVenta.codigoPuntoVenta,
      }
    : {
        codigoSucursal: null,
        codigoPuntoVenta: null,
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
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: null,
      pagos: params.pagos,
      aplicarDescuentos: params.aplicarDescuento,
      factura: true,
      codigoTipoDocumento: params.codigoTipoDocumento,
      nombre: nombreTrim || null,
      dni: dniNum !== null && Number.isFinite(dniNum) && dniNum > 0 ? dniNum : null,
      complemento: compTrim || null,
      ...pvFields,
    };
  }

  // 4) CF puro sin datos tipeados — defaults CF.
  if (esCF) {
    return {
      id_Pedido: params.pedidoId,
      id_Cliente: null,
      pagos: params.pagos,
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
        elaborados: { nodes: Array<{
          id_Producto: number; unidad_medida: string;
          producible: boolean; stock_actual: number; ubicacion: string;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
          receta: { id: number; cantidadProducible: number };
          variaciones: Array<{ id: number; nombre: string; requerido: boolean;
            opciones: Array<{ id: number; nombre: string; ajustePrecio: number; id_variacion: number;
              ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: number; nombre: string } | null; insumoNuevo: { id: number; nombre: string } | null }> }> }>;
        }> };
        comprados: { nodes: Array<{
          costo_compra: number; stock_actual: number; disponible: boolean; ubicacion: string;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
        }> };
        combos: { nodes: Array<{
          cantidadProducible: number;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string };
          detalles: Array<{ producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string }; cantidad: number; opcional: boolean }>;
        }> };
        categorias: { nodes: Array<{ id: number; nombre: string; descripcion: string; color: string; estado: boolean }> };
        clientes: { nodes: Array<{ dni: string; nombre: string; celular: string; correo: string; fecha_nacimiento: string; direccion: string; puntos: number; estado: boolean; id: string }> };
        productosCanjeables: { nodes: Array<{ id: number; id_Producto: number; puntos: number; disponible: string; activo: boolean }> };
      }>(GET_POS_DATA);

      const catMap = new Map<string, Category>();
      data.categorias.nodes.forEach(n => {
        catMap.set(String(n.id), {
          id: String(n.id), name: n.nombre, description: n.descripcion,
          color: n.color || '#92400e', sortOrder: 0, isActive: n.estado,
          createdAt: new Date(), updatedAt: new Date(),
        });
      });

      const elaboradoProducts: Product[] = [];
      const mappedAtributos: VariacionAtributo[] = [];

      for (const n of data.elaborados.nodes) {
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
          salePrice: n.producto.precio, stock: n.stock_actual ?? 999,
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

      const compradoProducts: Product[] = data.comprados.nodes
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
      for (const n of data.combos.nodes) {
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
      const loadedCustomers = data.clientes.nodes as Customer[];
      setCustomers(loadedCustomers);
      // Autoselect del cliente "Consumidor Final" (si existe en la BD).
      setReviewClienteId(prev => {
        if (prev) return prev;
        const cf = findConsumidorFinal(loadedCustomers);
        return cf ? String(cf.id) : null;
      });
      setProductsLoaded(true);
      enviarCatalogo(data.comprados.nodes, data.elaborados.nodes, data.combos.nodes);
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
        const found = data.comprados.nodes.find((n: any) => String(n.producto.id) === p.id);
        return found ? { ...p, stock: found.stock_actual } : p;
      }
      if (p.tipo === 'elaborado') {
        const found = data.elaborados.nodes.find((n: any) => String(n.id_Producto) === p.id);
        return found ? { ...p, stock: found.stock_actual, cantidadProducible: found.receta?.cantidadProducible } : p;
      }
      return p;
    }));
    setElaboradoExtras({});
  } catch {
    // silencioso
  }
}, []);

  useEffect(() => {
    const conn = getConnection();
    const handler = (data: {
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
    };
    conn.on('StockActualizado', handler);
    return () => { conn.off('StockActualizado', handler); };
  }, []);

  const getAtributosByProductId = useCallback((productId: string): VariacionAtributo[] => {
    return atributos.filter((a: VariacionAtributo) => a.productId === productId);
  }, [atributos]);

  const [modalView, setModalView] = useState<ModalView>('none');
  const [detalleView, setDetalleView] = useState<DetalleView>('none');
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
    if (!elaboradoDetailProduct) return 999;
    const p = elaboradoDetailProduct;
    const reserved = tempCart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
    if (p.producible === true) return Math.max(0, p.stock - reserved);
    if (!p.tieneReceta) return 9999;
    return Math.max(0, (p.cantidadProducible ?? 999) - reserved);
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
        if (!p.tieneReceta) return { label: 'Disponible', ok: true };
        const available = (p.cantidadProducible ?? 0) - reserved;
        return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Disponible: ${available}`, ok: true };
      }
      const available = p.stock - reserved;
      return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${available}`, ok: true };
    }
    const available = p.stock - reserved;
    return available <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${available}`, ok: true };
  }, [getTempQty]);

  const mesaSubtotal = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
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

  const mesaTotal = mesaSubtotal;
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
        const data = await gql<{ clientes: { nodes: Customer[] } }>(GET_CLIENTE_BY_DNI, { dni: asInt });
        setDocSearchResults(data.clientes?.nodes ?? []);
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
        const data = await gql<{ clientes: { nodes: Customer[] } }>(GET_CLIENTES_SEARCH, { q: trimmed });
        setNombreSearchResults(data.clientes?.nodes ?? []);
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
            const node = data.elaborados.nodes[0];
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

            const insumosStock = (data.insumos?.nodes ?? [])
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

  const handlePrintResumen = () => {
    if (!activeMesa || activeMesa.order.length === 0) return;
    const itemsCrudos = activeMesa.order.map(i => ({
      nombre: i.product.name + (i.opciones?.length ? ` (${i.opciones.map((o: any) => formatOpcionLabel(o)).join(', ')})` : ''),
      cantidad: i.quantity,
      precioFinal: i.precioFinal,
      ubicacion: i.product.destino === 'cocina' ? 'cocina'
               : i.product.destino === 'barra'  ? 'barra'
               : 'principal',
    }));
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
        const efectivoTotal = aplicarDescuento && descuentoPreview?.DescuentoRecomendado
          ? descuentoPreview.DescuentoRecomendado.TotalConDescuento
          : mesaTotal;
        const pagos: PagosObject = { efectivo: 0, tarjeta: 0, qr: 0, total: efectivoTotal };
        if (paymentMethod === 'cash') pagos.efectivo = efectivoTotal;
        else if (paymentMethod === 'transfer') pagos.qr = efectivoTotal;

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
          pedidoId,
          pagos,
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
      const msg = err instanceof ApiError ? err.message : 'No se pudo registrar la venta.';
      toast.error('Error al cobrar', msg);
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
        pedidoId: pedidoId ?? 0,
        pagos,
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
      const msg = err instanceof ApiError ? err.message : 'No se pudo registrar la venta.';
      toast.error('Error al cobrar', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    if (activeMesaId) handleCerrarMesa(activeMesaId, true);
    setLastSaleResult(null);
    closeAll();
  };

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
            <div className="hidden md:flex items-center gap-3 text-xs text-coffee-400 mr-2">
              {(['libre', 'ocupada', 'esperando_pago'] as MesaStatus[]).map(s => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={clsx('h-2 w-2 rounded-full', STATUS_CFG[s].dot.replace(' animate-pulse', ''))} />
                  {STATUS_CFG[s].label}
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
            {mesas.filter(m => m.tipo !== 'para_llevar').map(mesa => (
              <MesaCard
                key={mesa.id}
                mesa={mesa as any}
                statusCfg={STATUS_CFG}
                formatCurrency={formatCurrency}
                mesaOrderTotal={mesaOrderTotal}
                onOpen={openModal}
                onEdit={(mesa, e) => { openEditMesa(mesa, e); setModalView('nueva_mesa'); }}
                onDelete={(mesaId, _e) => { const m = mesas.find(x => x.id === mesaId); setMesaToDeleteName(m?.name ?? ''); setConfirmDeleteMesaId(mesaId); }}
                isDeletingMesa={isDeletingMesa}
              />
            ))}
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
                {detalleView === 'historial' ? (
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setDetalleView('none')}
                      className="px-3 py-1 rounded-lg text-sm font-semibold text-coffee-300 hover:bg-white/10 transition-colors"
                    >
                      Productos
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg text-sm font-semibold bg-white/20 text-cream cursor-default"
                    >
                      Historial
                    </button>
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
                      onClick={() => setDetalleView(v => v === 'historial' ? 'none' : 'historial')}
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
                                        onClick={() => setConfirmDeleteRondaId({ rondaId: ronda.rondaId!, rondaNumber: ronda.number })}
                                        className="h-6 w-6 rounded-md flex items-center justify-center text-coffee-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="divide-y divide-coffee-50">
                                {rondaItems.map(item => (
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

                                        {/* Componentes — combos */}
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
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                                        </div>
                                        <span className="text-xs text-coffee-400 font-semibold">×{item.quantity}</span>
                                      </div>
                                    </div>
                                    {item.notes && (
                                      <div className="flex items-center gap-2 pl-1">
                                        <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                                        <span className="text-[11px] text-coffee-500 italic">"{item.notes}"</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between border-t border-coffee-100">
                          <span className="text-xs font-medium text-coffee-500">Total acumulado</span>
                          <span className="text-lg font-display font-black text-coffee-900">{formatCurrency(mesaSubtotal)}</span>
                        </div>
                        <button
                          onClick={handlePrintResumen}
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

        {modalView === 'review' && activeMesa && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <ReviewPanel
                mesaName={activeMesa.name}
                order={activeMesa.order as any}
                mesaTotal={mesaTotal}
                formatCurrency={formatCurrency}
                onBack={() => setModalView('detalle')}
                onConfirm={() => setModalView('pago')}
                onDividir={() => setModalView('dividir')}
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
                onCodigoTipoDocumentoChange={setCodigoTipoDocumento}
                numeroDocumento={numeroDocumento}
                onNumeroDocumentoChange={handleNumeroDocumentoChange}
                complemento={complemento}
                onComplementoChange={handleComplementoChange}
                facturacionNombre={facturacionNombre}
                onFacturacionNombreChange={handleFacturacionNombreChange}
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
                onCodigoTipoDocumentoChange={setCodigoTipoDocumento}
                onNumeroDocumentoChange={handleNumeroDocumentoChange}
                onComplementoChange={handleComplementoChange}
                clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
                esSinNombre={esSinNombre}
                onEsSinNombreChange={handleEsSinNombreChange}
                noFacturar={noFacturar}
                onNoFacturarChange={handleNoFacturarChange}
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
                onOpenFacturaModal={() => {
                  if (!lastSaleResult?.ventaId) return;
                  setPrintFacturaData({
                    ventaId: lastSaleResult.ventaId,
                    numeroFactura: lastSaleResult.numeroFactura,
                    codigoRecepcion: lastSaleResult.codigoRecepcion,
                    cuf: lastSaleResult.cuf,
                    nitCliente: lastSaleResult.nitCliente,
                    razonSocialCliente: lastSaleResult.razonSocialCliente,
                    fechaEmision: lastSaleResult.fechaEmision,
                    total: lastSaleResult.total,
                    items: lastSaleResult.items,
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
              const ok = await editarRondaOrden(activeMesa.id, editingRonda.rondaId, pedidoId, detalles);
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
