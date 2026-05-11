export interface OrdenCompraNode {
  id: number;
  codigo: string;
  fecha: string;
  id_Proveedor: number;
  nombre_Proveedor: string;
  nota: string;
  recibido: boolean;
  estado: string;
  total: number;
  proveedor: {
    id: number;
    razon_Social: string;
    dni: string;
    telefono: string;
    celular: string;
    email: string;
    direccion: string;
  };
  insumos: OrdenCompraItem[];
  productos: OrdenCompraProducto[];
}

export interface OrdenCompraItem {
  id: number;
  id_Insumo: number | null;
  id_Orden: number;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface OrdenCompraProducto {
  id: number;
  id_Producto?: number;
  id_Orden: number;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface PurchasesReportStats {
  totalValue: number;
  totalOrders: number;
  pendingCount: number;
  uniqueSuppliers: number;
}

export interface PurchasesMonthlyData {
  mes: string;
  total: number;
}

export interface PurchasesSupplierData {
  name: string;
  total: number;
  count: number;
}

export interface UsePurchasesReportPageReturn {
  stats: PurchasesReportStats;
  monthlyData: PurchasesMonthlyData[];
  topSuppliers: PurchasesSupplierData[];
  filteredOrders: OrdenCompraNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ESTADO_MAP: Record<string, string> = {
  recibido: 'Recibido',
  pendiente: 'Pendiente',
  cancelado: 'Cancelado',
  parcial: 'Parcial',
  aprobado: 'Aprobado',
};

export function normalizeEstadoOrden(estado: string): string {
  return ESTADO_MAP[estado.toLowerCase().trim()] ?? estado;
}

export const ESTADO_VARIANTS: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  Recibido: 'success',
  Pendiente: 'warning',
  Cancelado: 'danger',
  Parcial: 'warning',
  Aprobado: 'info',
};
