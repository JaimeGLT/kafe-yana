export interface CajaMovimientoNode {
  id: number;
  id_CajaHistorial: number;
  codigo: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  monto: number;
}

export interface CajaHistorialNode {
  id: number;
  codigo: string;
  abiertaPor: string;
  cerradaPor: string | null;
  apertura: string;
  cierre: string | null;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalQr: number;
  diferencia: number;
  estado: string;
  nota: string;
  movimientos?: CajaMovimientoNode[];
}

export interface CashReportStats {
  totalIngresos: number;
  totalEgresos: number;
  totalVentas: number;
  balanceNeto: number;
  sesionesCount: number;
}

export interface CashDailyData {
  fecha: string;
  ingresos: number;
  egresos: number;
  ventas: number;
}

export interface CashCategoryData {
  category: string;
  tipo: string;
  total: number;
  count: number;
}

export interface UseCashReportPageReturn {
  stats: CashReportStats;
  dailyData: CashDailyData[];
  categoryData: CashCategoryData[];
  filteredSessions: CajaHistorialNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
