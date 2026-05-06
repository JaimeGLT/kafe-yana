import { useState, useCallback, useEffect } from 'react';
import { useMesas, type MesaBackend } from './useMesas';
import type { CartItem, RondaRecord } from './usePOSCart';

export const PARA_LLEVAR_ID = 'para-llevar';

type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago';

interface LocalMesa {
  id: string;
  number: number;
  name: string;
  status: MesaStatus;
  openedAt?: number;
  order: CartItem[];
  customerId?: string;
  tipo?: 'mesa' | 'para_llevar';
  currentRound: number;
  roundsSent: RondaRecord[];
  pedidoId?: number;
}

const PARA_LLEVAR_MESA: LocalMesa = {
  id: PARA_LLEVAR_ID,
  number: 0,
  name: 'Para llevar',
  status: 'libre',
  tipo: 'para_llevar',
  order: [],
  currentRound: 1,
  roundsSent: [],
};

interface UsePOSMesasReturn {
  mesas: LocalMesa[];
  activeMesa: LocalMesa | null;
  activeMesaId: string | null;
  setActiveMesaId: (id: string | null) => void;
  loadingMesas: boolean;
  openParaLlevar: () => void;
  openNuevaMesa: () => void;
  openEditMesa: (mesa: LocalMesa, e: React.MouseEvent) => void;
  handleSaveMesa: () => Promise<void>;
  handleDeleteMesa: (mesaId: string, e: React.MouseEvent) => void;
  handleIniciarMesa: (mesa: LocalMesa, customerId?: string) => Promise<void>;
  handleCerrarMesa: (mesaId: string) => Promise<void>;
  sendToKitchen: (
    mesaId: string,
    tempCart: CartItem[],
    printComanda: (mesaName: string, roundNumber: number, items: CartItem[]) => void
  ) => Promise<boolean>;
  updateMesa: (id: string, patch: Partial<LocalMesa>) => void;
  updateMesaOrder: (mesaId: string, order: CartItem[]) => void;
  isSendingToKitchen: boolean;
  isClosingMesa: string | null;
  isSavingMesa: boolean;
  isStartingMesa: boolean;
  isDeletingMesa: string | null;
  nuevaMesaName: string;
  setNuevaMesaName: (name: string) => void;
  editMesaId: string | null;
  setEditMesaId: (id: string | null) => void;
}

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
  } = useMesas();

  const [mesas, setMesas] = useState<LocalMesa[]>([PARA_LLEVAR_MESA]);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);
  const [nuevaMesaName, setNuevaMesaName] = useState('');
  const [editMesaId, setEditMesaId] = useState<string | null>(null);
  const [isStartingMesa, setIsStartingMesa] = useState(false);
  const [isSavingMesa, setIsSavingMesa] = useState(false);
  const [isClosingMesa, setIsClosingMesa] = useState<string | null>(null);
  const [isDeletingMesa, setIsDeletingMesa] = useState<string | null>(null);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);

  const mapBackendMesaToLocal = useCallback((bm: MesaBackend): LocalMesa => {
    const isOccupied = bm.pedido !== null;
    const status: MesaStatus = isOccupied ? 'ocupada' : 'libre';

    let order: CartItem[] = [];
    let roundsSent: RondaRecord[] = [];
    let currentRound = 1;
    let customerId: string | undefined;

    if (bm.pedido) {
      customerId = bm.pedido.id_Cliente ? String(bm.pedido.id_Cliente) : undefined;

      if (bm.pedido.rondas) {
        roundsSent = bm.pedido.rondas.map((ronda, idx) => ({
          number: idx + 1,
          sentAt: Date.now(),
          subTotal: ronda.subTotal,
        }));

        bm.pedido.rondas.forEach((ronda, idx) => {
          const roundNum = idx + 1;
          ronda.detalle.forEach((detalle) => {
            const opcionesSeleccionadas = detalle.opciones?.map(opt => {
              const ajuste = opt.opcion.ajustes?.[0];
              return {
                atributoId: String(opt.opcion.variacion.id),
                atributoNombre: opt.opcion.variacion.nombre,
                opcionId: String(opt.id_Opcion),
                opcionNombre: opt.opcion.nombre,
                precioAjuste: opt.opcion.ajustePrecio,
                tipoOpcion: opt.tipoOpcion,
                valorAnterior: opt.valorAnterior,
                costoExtra: opt.costoExtra,
                tipoAjuste: ajuste?.tipoAjuste,
                insumoBaseNombre: ajuste?.insumoBase?.nombre,
                insumoNuevoNombre: ajuste?.insumoNuevo?.nombre,
                ajusteCantidad: ajuste?.cantidad,
                opcionRaw: opt.opcion,
              };
            }) ?? [];

            order.push({
              product: {
                id: String(detalle.id),
                name: detalle.nombre_Producto,
                salePrice: detalle.precio,
                tipo: 'comprado' as const,
                code: String(detalle.id),
                categoryId: '',
                unit: 'unidad',
                costPrice: 0,
                stock: 0,
                minStock: 0,
                maxStock: 0,
                variations: [],
                isActive: true,
                hasVariations: false,
                description: '',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              quantity: detalle.cantidad,
              opciones: opcionesSeleccionadas,
              precioFinal: detalle.precio,
              cartKey: `${detalle.id}_${ronda.id}`,
              roundNumber: roundNum,
            });
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
      tipo: 'mesa',
      currentRound,
      roundsSent,
      pedidoId: bm.pedido?.id,
    };
  }, []);

  useEffect(() => {
    if (!loadingMesas && backendMesas.length > 0) {
      setMesas(prev => {
        const paraLlevar = prev.find(m => m.id === PARA_LLEVAR_ID);
        const backendMapped = backendMesas.map(mapBackendMesaToLocal);
        return paraLlevar ? [...backendMapped, paraLlevar] : backendMapped;
      });
    }
  }, [backendMesas, loadingMesas, mapBackendMesaToLocal]);

  const updateMesa = useCallback((id: string, patch: Partial<LocalMesa>) => {
    setMesas(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const updateMesaOrder = useCallback((mesaId: string, order: CartItem[]) => {
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, order } : m));
  }, []);

  const activeMesa = activeMesaId ? mesas.find(m => m.id === activeMesaId) ?? null : null;

  const openParaLlevar = useCallback(() => {
    setMesas(prev => prev.map(m => {
      if (m.id !== PARA_LLEVAR_ID) return m;
      if (m.status === 'libre') {
        return { ...m, status: 'ocupada' as MesaStatus, openedAt: Date.now(), order: [], customerId: undefined };
      }
      return m;
    }));
    setActiveMesaId(PARA_LLEVAR_ID);
  }, []);

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
    if (editMesaId) {
      const success = await apiUpdateMesa(editMesaId, trimmed);
      if (success) {
        updateMesa(editMesaId, { name: trimmed });
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
      }
    }
    setIsSavingMesa(false);
    setNuevaMesaName('');
    setEditMesaId(null);
    setActiveMesaId(null);
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

  const handleCerrarMesa = useCallback(async (mesaId: string) => {
    setIsClosingMesa(mesaId);
    if (mesaId !== PARA_LLEVAR_ID) {
      await apiLiberarMesa(mesaId);
    }
    updateMesa(mesaId, { status: 'libre', openedAt: undefined, order: [], customerId: undefined, currentRound: 1, roundsSent: [] });
    setIsClosingMesa(null);
    setActiveMesaId(null);
  }, [apiLiberarMesa, updateMesa]);

  const sendToKitchen = useCallback(async (
    mesaId: string,
    tempCart: CartItem[],
    printComanda: (mesaName: string, roundNumber: number, items: CartItem[]) => void,
  ): Promise<boolean> => {
    if (!tempCart.length) return false;
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return false;
    const round = mesa.currentRound;

    setIsSendingToKitchen(true);
    let success = true;

    if (mesaId === PARA_LLEVAR_ID) {
      // Para llevar: sin backend, se manejan rondas locales
      const itemsWithRound = tempCart.map(i => ({ ...i, roundNumber: round }));
      const rondaSubTotal = itemsWithRound.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

      setMesas(prev => prev.map(m => {
        if (m.id !== mesaId) return m;
        const merged = [...m.order];
        for (const newItem of itemsWithRound) {
          const ex = merged.find(i => i.cartKey === newItem.cartKey && i.roundNumber === round);
          if (ex) ex.quantity += newItem.quantity;
          else merged.push({ ...newItem });
        }
        return { ...m, order: merged, currentRound: m.currentRound + 1, roundsSent: [...m.roundsSent, { number: round, sentAt: Date.now(), subTotal: rondaSubTotal }] };
      }));

      printComanda(mesa.name, round, itemsWithRound);
    } else {
      // Mesa con backend
      const detalles = tempCart.map(i => ({
        id_Producto: parseInt(i.product.id, 10),
        cantidad: i.quantity,
        ids_Opcion: i.opciones?.map(o => Number(o.opcionId)).filter(id => !isNaN(id)) ?? [],
      }));

      success = await apiCrearRonda(mesaId, detalles);

      if (success) {
        const itemsWithRound = tempCart.map(i => ({ ...i, roundNumber: round }));
        const rondaSubTotal = itemsWithRound.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

        setMesas(prev => prev.map(m => {
          if (m.id !== mesaId) return m;
          const merged = [...m.order];
          for (const newItem of itemsWithRound) {
            const ex = merged.find(i => i.cartKey === newItem.cartKey && i.roundNumber === round);
            if (ex) ex.quantity += newItem.quantity;
            else merged.push({ ...newItem });
          }
          return { ...m, order: merged, currentRound: m.currentRound + 1, roundsSent: [...m.roundsSent, { number: round, sentAt: Date.now(), subTotal: rondaSubTotal }] };
        }));

        printComanda(mesa.name, round, itemsWithRound);
      }
    }

    setIsSendingToKitchen(false);
    return success;
  }, [mesas, apiCrearRonda]);

  return {
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
    updateMesa,
    updateMesaOrder,
    isSendingToKitchen,
    isClosingMesa,
    isSavingMesa,
    isStartingMesa,
    isDeletingMesa,
    nuevaMesaName,
    setNuevaMesaName,
    editMesaId,
    setEditMesaId,
  };
}
