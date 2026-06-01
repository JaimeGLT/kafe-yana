import { useState, useCallback, useEffect, useRef } from 'react';
import { useMesas, type MesaBackend, type RondaCreatedResponse, type RondaCreatedOpcion, type DtoRondaEditar } from './useMesas';
import { getConnection, startConnection } from '../lib/signalr';
import { toast } from '../components/ui/Toast';
import { useVenta, type ParaLlevarPedido } from './useVenta';
import type { CartItem, RondaRecord } from './usePOSCart';
import type { ProductTipo } from '../types';

function formatearCambios(opciones: RondaCreatedOpcion[] | undefined): string {
  if (!opciones?.length) return '';
  return opciones.map(opcion => {
    const cambios = opcion.cambios
      ?.map(c => {
        if (c.tipo === 'Reemplazo') return `${c.sale} -> ${c.entra} (${c.cantidad} ${c.unidad})`;
        if (c.tipo === 'Modificacion') return `${c.entra ?? c.sale} (${c.cantidad} ${c.unidad})`;
        return null;
      })
      .filter(Boolean)
      .join(', ');
    return cambios ? `${opcion.nombre}: ${cambios}` : opcion.nombre;
  }).join(' | ');
}

function buildComandaFromResponse(data: RondaCreatedResponse): Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string; precio: number }> {
  const detalles = data.ronda.detalles ?? [];
  return detalles.flatMap((detalle: any) => {
    const itemsCombo: any[] = detalle.ItemsCombo ?? detalle.items_combo ?? [];
    const precioCombo = Number(detalle.Precio ?? detalle.precio ?? 0);
    if (itemsCombo.length > 0) {
      return itemsCombo.map((sub: any, idx: number) => ({
        cantidad: (sub.Cantidad ?? sub.cantidad ?? 1) * (detalle.Cantidad ?? detalle.cantidad ?? 1),
        nombre: sub.Nombre ?? sub.nombre ?? '',
        nota: `(combo: ${(detalle.Nombre ?? detalle.nombre ?? '').split('(')[0].trim()})`,
        ubicacion: (sub.Ubicacion ?? sub.ubicacion ?? '').toLowerCase(),
        precio: idx === 0 ? precioCombo : 0,
      }));
    }
    return [{
      cantidad: detalle.Cantidad ?? detalle.cantidad ?? 1,
      nombre: (detalle.Nombre ?? detalle.nombre ?? '').split('(')[0].trim(),
      nota: formatearCambios(detalle.Opciones ?? detalle.opciones),
      ubicacion: (detalle.Ubicacion ?? detalle.ubicacion ?? '').toLowerCase(),
      precio: Number(detalle.Precio ?? detalle.precio ?? 0),
    }];
  });
}

export const PARA_LLEVAR_ID = 'para-llevar';

type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago';

interface DetalleRonda {
  id: number;
  id_Producto: number;
  id_Ronda: number;
  nombre_Producto: string;
  precio: number;
  cantidad: number;
  itemsCombo?: Array<{ nombre: string; cantidad: number; ubicacion?: string }>;
  producto?: { tipo?: string; detalles?: Array<{ producto: { nombre: string; tipo: string }; cantidad: number }> };
  opciones?: Array<{
    id_Opcion: number;
    opcion: {
      nombre: string;
      ajustePrecio: number;
      tipoOpcion?: string;
      variacion?: { id: number; nombre: string };
      ajustes?: Array<{
        tipoAjuste: string;
        cantidad: number;
        insumoBase?: { nombre: string } | null;
        insumoNuevo?: { nombre: string } | null;
      }>;
    };
  }>;
}

interface LocalMesa {
  id: string;
  number: number;
  name: string;
  status: MesaStatus;
  openedAt?: number;
  order: CartItem[];
  customerId?: string;
  cliente?: { id: number; nombre: string; puntos: number; celular: string; estado: boolean };
  tipo?: 'mesa' | 'para_llevar';
  currentRound: number;
  roundsSent: RondaRecord[];
  pedidoId?: number;
}

interface UsePOSMesasReturn {
  mesas: LocalMesa[];
  activeMesa: LocalMesa | null;
  activeMesaId: string | null;
  setActiveMesaId: (id: string | null) => void;
  loadingMesas: boolean;
  openParaLlevar: (clienteId?: number | null) => Promise<string | null>;
  openNuevaMesa: () => void;
  openEditMesa: (mesa: LocalMesa, e: React.MouseEvent) => void;
  handleSaveMesa: () => Promise<void>;
  handleDeleteMesa: (mesaId: string, e: React.MouseEvent) => void;
  handleIniciarMesa: (mesa: LocalMesa, customerId?: string) => Promise<void>;
  handleCerrarMesa: (mesaId: string, autoReleased?: boolean) => Promise<void>;
  sendToKitchen: (
    mesaId: string,
    tempCart: CartItem[],
    printComanda: (mesaName: string, roundNumber: number, items: CartItem[], rondaDesc: string, comandaItems: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string }>) => void
  ) => Promise<boolean>;
  editarRondaOrden: (mesaId: string, rondaId: number, pedidoId: number, detalles: DtoRondaEditar['detalles']) => Promise<boolean>;
  eliminarRondaOrden: (mesaId: string, rondaId: number, pedidoId: number) => Promise<boolean>;
  updateMesa: (id: string, patch: Partial<LocalMesa>) => void;
  updateMesaOrder: (mesaId: string, order: CartItem[]) => void;
  isSendingToKitchen: boolean;
  isEditandoRonda: boolean;
  isEliminandoRonda: boolean;
  isClosingMesa: string | null;
  isSavingMesa: boolean;
  isStartingMesa: boolean;
  isDeletingMesa: string | null;
  nuevaMesaName: string;
  setNuevaMesaName: (name: string) => void;
  editMesaId: string | null;
  setEditMesaId: (id: string | null) => void;
  paraLlevarCount: number;
  loadingParaLlevar: boolean;
}

const processDetalle = (detalle: DetalleRonda, roundNum: number, rondaId: number) => {
  const comboComponentes = detalle.itemsCombo?.length
    ? detalle.itemsCombo.map((ic: { nombre: string; cantidad: number; ubicacion?: string }) => ({
        nombre: ic.nombre,
        cantidad: ic.cantidad,
        tipo: '',
        ubicacion: ic.ubicacion ?? '',
      }))
    : detalle.producto?.detalles?.map((d: { producto: { nombre: string; tipo: string }; cantidad: number }) => ({
        nombre: d.producto.nombre,
        cantidad: d.cantidad,
        tipo: d.producto.tipo,
        ubicacion: '',
      })) ?? [];

  const opcionesSeleccionadas = detalle.opciones?.map((opt) => {
    const ajuste = opt.opcion.ajustes?.[0];
    return {
      atributoId: String(opt.opcion.variacion?.id ?? ''),
      atributoNombre: opt.opcion.variacion?.nombre ?? '',
      opcionId: String(opt.id_Opcion),
      opcionNombre: opt.opcion.nombre,
      precioAjuste: opt.opcion.ajustePrecio,
      tipoOpcion: opt.opcion.tipoOpcion,
      tipoAjuste: ajuste?.tipoAjuste,
      insumoBaseNombre: ajuste?.insumoBase?.nombre,
      insumoNuevoNombre: ajuste?.insumoNuevo?.nombre,
      ajusteCantidad: ajuste?.cantidad,
      opcionRaw: opt.opcion,
    };
  }) ?? [];

  return {
    product: {
      id: String(detalle.id_Producto),
      name: detalle.nombre_Producto,
      salePrice: detalle.precio,
      tipo: (() => {
        const t = (detalle.producto?.tipo ?? 'comprado').toLowerCase();
        if (t === 'combos') return 'combo';
        if (t === 'elaborado') return 'elaborado';
        return 'comprado';
      })() as ProductTipo,
      comboComponentes,
      code: String(detalle.id_Producto),
      categoryId: '', unit: 'unidad', costPrice: 0,
      stock: 0, minStock: 0, maxStock: 0,
      variations: [], isActive: true, hasVariations: false,
      description: '', createdAt: new Date(), updatedAt: new Date(),
    },
    quantity: detalle.cantidad,
    opciones: opcionesSeleccionadas,
    precioFinal: detalle.precio,
    cartKey: `hist_${detalle.id}_${rondaId}`,
    roundNumber: roundNum,
    consumoInsumos: [],
  };
};

const mapParaLlevarToLocalMesa = (pl: ParaLlevarPedido): LocalMesa => {
  const isOccupied = pl.pedido !== null;
  const status: MesaStatus = isOccupied ? 'ocupada' : 'libre';

  const order: CartItem[] = [];
  let roundsSent: RondaRecord[] = [];
  let currentRound = 1;
  let customerId: string | undefined;
  let cliente: LocalMesa['cliente'];

  if (pl.pedido) {
    customerId = pl.pedido.id_Cliente ? String(pl.pedido.id_Cliente) : undefined;
    if (pl.pedido.cliente) {
      cliente = {
        id: pl.pedido.cliente.id,
        nombre: pl.pedido.cliente.nombre,
        puntos: pl.pedido.cliente.puntos,
        celular: pl.pedido.cliente.celular,
        estado: Boolean(pl.pedido.cliente.estado),
      };
    }

    if (pl.pedido.rondas) {
      roundsSent = pl.pedido.rondas.map((ronda, idx) => ({
        number: idx + 1,
        sentAt: Date.now(),
        subTotal: ronda.subTotal,
        rondaId: ronda.id,
      }));

      pl.pedido.rondas.forEach((ronda, idx) => {
        const roundNum = idx + 1;
        ronda.detalle.forEach((detalle) => {
          const processed = processDetalle(detalle as DetalleRonda, roundNum, ronda.id);
          order.push(processed as CartItem);
        });
      });

      currentRound = pl.pedido.rondas.length + 1;
    }
  }

  return {
    id: `pl_${pl.id}`,
    number: 0,
    name: `Para llevar #${pl.id}`,
    status,
    openedAt: isOccupied ? Date.now() : undefined,
    order,
    customerId,
    cliente,
    tipo: 'para_llevar',
    currentRound,
    roundsSent,
    pedidoId: pl.id_Pedido,
  };
};

export function usePOSMesas(): UsePOSMesasReturn {
  const {
    mesas: backendMesas,
    loading: loadingMesas,
    createMesa: apiCreateMesa,
    updateMesa: apiUpdateMesa,
    deleteMesa: apiDeleteMesa,
    ocuparMesa: apiOcuparMesa,
    liberarMesa: apiLiberarMesa,
    crearRonda: apiCrearRonda,
    editarRonda: apiEditarRonda,
    eliminarRonda: apiEliminarRonda,
    refreshMesas,
  } = useMesas();

  const {
    syncParaLlevar,
    createPedidoParaLlevar,
    crearRondaParaLlevar,
    editarRondaParaLlevar: apiEditarRondaPL,
    eliminarRondaParaLlevar: apiEliminarRondaPL,
    liberarPedido,
  } = useVenta();

  const [mesas, setMesas] = useState<LocalMesa[]>([]);
  const [paraLlevarOrders, setParaLlevarOrders] = useState<LocalMesa[]>([]);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);
  const [nuevaMesaName, setNuevaMesaName] = useState('');
  const [editMesaId, setEditMesaId] = useState<string | null>(null);
  const [isStartingMesa, setIsStartingMesa] = useState(false);
  const [isSavingMesa, setIsSavingMesa] = useState(false);
  const [isClosingMesa, setIsClosingMesa] = useState<string | null>(null);
  const [isDeletingMesa, setIsDeletingMesa] = useState<string | null>(null);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [isEditandoRonda, setIsEditandoRonda] = useState(false);
  const [isEliminandoRonda, setIsEliminandoRonda] = useState(false);
  const [loadingParaLlevar, setLoadingParaLlevar] = useState(false);

  const mapBackendMesaToLocal = useCallback((bm: MesaBackend): LocalMesa => {
    const isOccupied = bm.pedido !== null;
    const status: MesaStatus = isOccupied ? 'ocupada' : 'libre';

    const order: CartItem[] = [];
    let roundsSent: RondaRecord[] = [];
    let currentRound = 1;
    let customerId: string | undefined;
    let cliente: LocalMesa['cliente'];

    if (bm.pedido) {
      customerId = bm.pedido.id_Cliente ? String(bm.pedido.id_Cliente) : undefined;
      if (bm.pedido.cliente) {
        cliente = {
          id: bm.pedido.cliente.id,
          nombre: bm.pedido.cliente.nombre,
          puntos: bm.pedido.cliente.puntos,
          celular: bm.pedido.cliente.celular,
          estado: Boolean(bm.pedido.cliente.estado),
        };
      }

      if (bm.pedido.rondas) {
        roundsSent = bm.pedido.rondas.map((ronda, idx) => ({
          number: idx + 1,
          sentAt: Date.now(),
          subTotal: ronda.subTotal,
          rondaId: ronda.id,
        }));

        bm.pedido.rondas.forEach((ronda, idx) => {
          const roundNum = idx + 1;
          ronda.detalle.forEach((detalle) => {
            const processed = processDetalle(detalle as unknown as DetalleRonda, roundNum, ronda.id);
            order.push(processed as CartItem);
          });
        });

        currentRound = bm.pedido.rondas.length + 1;
      }
    }

    return {
      id: String(bm.id),
      number: parseInt(String(bm.id), 10),
      name: bm.nombre,
      status,
      openedAt: isOccupied ? Date.now() : undefined,
      order,
      customerId,
      cliente,
      tipo: 'mesa',
      currentRound,
      roundsSent,
      pedidoId: bm.pedido?.id,
    };
  }, []);

  const syncParaLlevarOrders = useCallback(async () => {
    setLoadingParaLlevar(true);
    try {
      const orders = await syncParaLlevar();
      const mapped = orders
        .filter(pl => pl.disponible || pl.pedido !== null)
        .map(mapParaLlevarToLocalMesa);
      setParaLlevarOrders(mapped);
    } finally {
      setLoadingParaLlevar(false);
    }
  }, [syncParaLlevar]);

  useEffect(() => {
    if (!loadingMesas && backendMesas.length > 0) {
      setMesas(backendMesas.map(mapBackendMesaToLocal));
    }
  }, [backendMesas, loadingMesas, mapBackendMesaToLocal]);

  useEffect(() => {
    syncParaLlevarOrders();
  }, [syncParaLlevarOrders]);

  const refreshMesasRef = useRef(refreshMesas);
  refreshMesasRef.current = refreshMesas;
  const syncParaLlevarOrdersRef = useRef(syncParaLlevarOrders);
  syncParaLlevarOrdersRef.current = syncParaLlevarOrders;

  useEffect(() => {
    const conn = getConnection();

    const onMesaActualizada = () => { refreshMesasRef.current(true); };
    const onNuevaRonda = () => { refreshMesasRef.current(true); };
    const onVentaProcesada = () => { refreshMesasRef.current(true); };
    const onPedidoParaLlevarActualizado = () => { syncParaLlevarOrdersRef.current(); };

    conn.on('MesaActualizada', onMesaActualizada);
    conn.on('NuevaRonda', onNuevaRonda);
    conn.on('VentaProcesada', onVentaProcesada);
    conn.on('PedidoParaLlevarActualizado', onPedidoParaLlevarActualizado);

    conn.onreconnected(async () => {
      await conn.invoke('UnirseAGrupo', 'salon');
      refreshMesasRef.current(true);
    });

    startConnection()
      .then(() => conn.invoke('UnirseAGrupo', 'salon'))
      .catch(console.error);

    return () => {
      conn.off('MesaActualizada', onMesaActualizada);
      conn.off('NuevaRonda', onNuevaRonda);
      conn.off('VentaProcesada', onVentaProcesada);
      conn.off('PedidoParaLlevarActualizado', onPedidoParaLlevarActualizado);
      conn.invoke('AbandonarGrupo', 'salon').catch(() => {});
    };
  }, []);

  const updateMesa = useCallback((id: string, patch: Partial<LocalMesa>) => {
    setMesas(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    setParaLlevarOrders(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const updateMesaOrder = useCallback((mesaId: string, order: CartItem[]) => {
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, order } : m));
    setParaLlevarOrders(prev => prev.map(m => m.id === mesaId ? { ...m, order } : m));
  }, []);

  const activeMesa = activeMesaId
    ? [...mesas, ...paraLlevarOrders].find(m => m.id === activeMesaId) ?? null
    : null;

  const paraLlevarCount = paraLlevarOrders.filter(pl => pl.status !== 'libre').length;

  const openParaLlevar = useCallback(async (clienteId?: number | null): Promise<string | null> => {
    const freshData = await syncParaLlevar();
    const freshMapped = freshData
      .filter(pl => pl.disponible || pl.pedido !== null)
      .map(mapParaLlevarToLocalMesa);
    setParaLlevarOrders(freshMapped);

    const activeOrder = freshMapped.find(m => m.status === 'ocupada');
    if (activeOrder) {
      setActiveMesaId(activeOrder.id);
      return activeOrder.id;
    }

    const newPedidoId = await createPedidoParaLlevar(clienteId ?? null);
    if (!newPedidoId) return null;

    const newId = `pl_${newPedidoId}`;
    const newOrder: LocalMesa = {
      id: newId,
      pedidoId: newPedidoId,
      number: 0,
      name: `Para llevar #${newPedidoId}`,
      status: 'ocupada',
      openedAt: Date.now(),
      order: [],
      tipo: 'para_llevar',
      currentRound: 1,
      roundsSent: [],
      customerId: clienteId != null ? String(clienteId) : undefined,
    };
    setParaLlevarOrders(prev => [...prev, newOrder]);
    setActiveMesaId(newId);

    syncParaLlevar().then(freshData => {
      const mapped = freshData
        .filter(pl => pl.disponible || pl.pedido !== null)
        .map(mapParaLlevarToLocalMesa);
      setParaLlevarOrders(prev => {
        const backendIds = new Set(mapped.map(m => m.id));
        const localOnly = prev.filter(m => !backendIds.has(m.id));
        return [...mapped, ...localOnly];
      });
    });

    return newId;
  }, [syncParaLlevar, createPedidoParaLlevar, mapParaLlevarToLocalMesa]);

  const openNuevaMesa = useCallback(() => {
    setEditMesaId(null);
    setNuevaMesaName('');
    setActiveMesaId(null);
  }, []);

  const openEditMesa = useCallback((mesa: LocalMesa, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMesaId(mesa.id);
    setNuevaMesaName(mesa.name);
    setActiveMesaId(mesa.id);
  }, []);

  const handleSaveMesa = useCallback(async () => {
    const trimmed = nuevaMesaName.trim();
    if (!trimmed) return;
    setIsSavingMesa(true);
    try {
      if (editMesaId) {
        const success = await apiUpdateMesa(editMesaId, trimmed);
        if (success) {
          updateMesa(editMesaId, { name: trimmed });
          setNuevaMesaName('');
          setEditMesaId(null);
          setActiveMesaId(null);
        }
      } else {
        const newId = await apiCreateMesa(trimmed);
        if (newId) {
          const maxNum = mesas.reduce((m, t) => Math.max(m, t.number), 0);
          const newMesa: LocalMesa = {
            id: newId, number: maxNum + 1, name: trimmed, tipo: 'mesa',
            status: 'libre', order: [], currentRound: 1, roundsSent: [],
          };
          setMesas(prev => [...prev, newMesa]);
          setNuevaMesaName('');
          setEditMesaId(null);
          setActiveMesaId(null);
        }
      }
    } finally {
      setIsSavingMesa(false);
    }
  }, [nuevaMesaName, editMesaId, mesas, apiCreateMesa, apiUpdateMesa, updateMesa]);

  const handleDeleteMesa = useCallback(async (mesaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa || mesa.status !== 'libre') return;
    setIsDeletingMesa(mesaId);
    const success = await apiDeleteMesa(mesaId);
    setIsDeletingMesa(null);
    if (success) {
      setMesas(prev => prev.filter(m => m.id !== mesaId));
    }
  }, [mesas, apiDeleteMesa]);

  const handleIniciarMesa = useCallback(async (mesa: LocalMesa, customerId?: string) => {
    setIsStartingMesa(true);
    const mesaId = mesa.id;
    const clienteId = customerId ? parseInt(customerId, 10) : null;
    const result = await apiOcuparMesa(mesaId, clienteId);
    setIsStartingMesa(false);
    if (result) {
      updateMesa(mesaId, {
        status: 'ocupada',
        openedAt: Date.now(),
        customerId,
        order: [],
        currentRound: 1,
        roundsSent: [],
      });
      setActiveMesaId(null);
    }
  }, [apiOcuparMesa, updateMesa]);

  const handleCerrarMesa = useCallback(async (mesaId: string, autoReleased = false) => {
    setIsClosingMesa(mesaId);
    const isParaLlevar = mesaId.startsWith('pl_');
    if (isParaLlevar) {
      if (!autoReleased) {
        await liberarPedido();
      }
      const fresh = await syncParaLlevar();
      setParaLlevarOrders(
        fresh
          .filter(pl => pl.disponible || pl.pedido !== null)
          .map(mapParaLlevarToLocalMesa)
      );
    } else {
      if (!autoReleased) {
        await apiLiberarMesa(mesaId);
      }
      updateMesa(mesaId, { status: 'libre', openedAt: undefined, order: [], customerId: undefined, currentRound: 1, roundsSent: [] });
    }
    setIsClosingMesa(null);
    setActiveMesaId(null);
  }, [apiLiberarMesa, liberarPedido, syncParaLlevar, updateMesa]);

  const editarRondaOrden = useCallback(async (
    mesaId: string,
    rondaId: number,
    pedidoId: number,
    detalles: DtoRondaEditar['detalles'],
  ): Promise<boolean> => {
    setIsEditandoRonda(true);
    const data: DtoRondaEditar = { id_Pedido: pedidoId, detalles };
    let ok = false;
    if (mesaId.startsWith('pl_')) {
      ok = await apiEditarRondaPL(rondaId, data);
      if (ok) await syncParaLlevarOrders();
    } else {
      ok = await apiEditarRonda(mesaId, rondaId, data);
    }
    if (ok) toast.success('Ronda actualizada', 'Los cambios fueron guardados.');
    setIsEditandoRonda(false);
    return ok;
  }, [apiEditarRonda, apiEditarRondaPL, syncParaLlevarOrders]);

  const eliminarRondaOrden = useCallback(async (
    mesaId: string,
    rondaId: number,
    pedidoId: number,
  ): Promise<boolean> => {
    setIsEliminandoRonda(true);
    let ok = false;
    if (mesaId.startsWith('pl_')) {
      ok = await apiEliminarRondaPL(rondaId, pedidoId);
      if (ok) await syncParaLlevarOrders();
    } else {
      ok = await apiEliminarRonda(mesaId, rondaId, pedidoId);
    }
    if (ok) toast.success('Ronda eliminada', 'La ronda fue removida del pedido.');
    setIsEliminandoRonda(false);
    return ok;
  }, [apiEliminarRonda, apiEliminarRondaPL, syncParaLlevarOrders]);

  const sendToKitchen = useCallback(async (
    mesaId: string,
    tempCart: CartItem[],
    printComanda: (mesaName: string, roundNumber: number, items: CartItem[], rondaDesc: string, comandaItems: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string }>) => void,
  ): Promise<boolean> => {
    if (!tempCart.length) return false;
    const allMesas = [...mesas, ...paraLlevarOrders];
    const mesa = allMesas.find(m => m.id === mesaId);
    if (!mesa) return false;
    const round = mesa.currentRound;

    setIsSendingToKitchen(true);
    let success = false;

    try {
      const detalles = tempCart.map(i => ({
        id_Producto: parseInt(i.product.id, 10),
        cantidad: i.quantity,
        ids_Opcion: i.opciones?.map(o => Number(o.opcionId)).filter(id => !isNaN(id)) ?? [],
      }));

      let rondaResponse: RondaCreatedResponse | null = null;

      if (mesaId.startsWith('pl_')) {
        const pedidoId = (mesa as LocalMesa).pedidoId;
        if (!pedidoId) return false;
        rondaResponse = await crearRondaParaLlevar(pedidoId, detalles);
      } else {
        rondaResponse = await apiCrearRonda(mesaId, detalles);
      }

      console.log('rondaResponse:', JSON.stringify(rondaResponse, null, 2));

      success = rondaResponse !== null;

      if (success && rondaResponse) {
        const itemsWithRound = tempCart.map(i => ({ ...i, roundNumber: round }));
        const rondaSubTotal = itemsWithRound.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

        const updateFn = (prev: LocalMesa[]) => prev.map(m => {
          if (m.id !== mesaId) return m;
          const merged = [...m.order];
          for (const newItem of itemsWithRound) {
            const ex = merged.find(i => i.cartKey === newItem.cartKey && i.roundNumber === round);
            if (ex) ex.quantity += newItem.quantity;
            else merged.push({ ...newItem });
          }
          return { ...m, order: merged, currentRound: m.currentRound + 1, roundsSent: [...m.roundsSent, { number: round, sentAt: Date.now(), subTotal: rondaSubTotal }] };
        });

        setMesas(updateFn);
        setParaLlevarOrders(updateFn);

        // DESPUÉS — construye Y envía al servidor Python
        let comandaItems: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string }> = [];
        try { comandaItems = buildComandaFromResponse(rondaResponse); } catch { /* ignorar */ }

        printComanda(
          mesa.name,
          round,
          itemsWithRound,
          rondaResponse.ronda?.Ronda_Descripcion ?? `Ronda #${round}`,
          comandaItems,
        );
      }
    } catch {
      // error ya manejado en apiCrearRonda con toast
    } finally {
      setIsSendingToKitchen(false);
    }

    return success;
  }, [mesas, paraLlevarOrders, apiCrearRonda, crearRondaParaLlevar]);

  return {
    mesas: [...mesas, ...paraLlevarOrders],
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
    updateMesaOrder,
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
    setEditMesaId,
    paraLlevarCount,
    loadingParaLlevar,
  };
}