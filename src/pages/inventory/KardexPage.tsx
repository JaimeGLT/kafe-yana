import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BookOpen, Package, FlaskConical, Layers, Cookie } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { SearchableSelect, Badge } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { gql } from '../../lib/graphql';
import {
  GET_KARDEX_ITEMS,
  GET_PRODUCTO_MOVIMIENTOS,
  GET_INSUMO_MOVIMIENTOS,
} from '../../lib/queries/kardex.queries';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDateTime } from '../../utils';
import type {
  KardexSelectorItem,
  KardexItemsResponse,
  KardexCompradoNode,
  KardexElaboradoNode,
  KardexComboNode,
  KardexInsumoNode,
  MovimientoProductoNode,
  MovimientoProductoResponse,
  InsumoMovimientoNode,
  InsumoMovimientosResponse,
} from '../../types/graphql';

type ItemTipo = 'comprado' | 'elaborado' | 'combo' | 'insumo';

interface UnifiedMovement {
  id: string;
  date: Date;
  type: 'adjustment' | 'sale' | 'recipe';
  reference: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  stockAfter: number;
  notes?: string;
}

const TIPO_MOVEMENT_MAP: Record<string, UnifiedMovement['type']> = {
  Compra: 'adjustment',
  Venta: 'sale',
  Ajuste: 'adjustment',
  Transferencia: 'adjustment',
  Inicial: 'adjustment',
  Receta: 'recipe',
  compra: 'adjustment',
  venta: 'sale',
  ajuste: 'adjustment',
  transferencia: 'adjustment',
  inicial: 'adjustment',
  recipe: 'recipe',
};

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
  initial: 'Stock inicial',
  recipe: 'Receta',
};

const MOVEMENT_COLORS: Record<string, string> = {
  purchase: 'success',
  sale: 'danger',
  adjustment: 'warning',
  transfer: 'info',
  initial: 'default',
  recipe: 'info',
};

const TipoIcon: React.FC<{ tipo: ItemTipo; className?: string }> = ({ tipo, className }) => {
  if (tipo === 'elaborado') return <FlaskConical className={clsx('text-amber-500', className)} />;
  if (tipo === 'combo') return <Layers className={clsx('text-blue-500', className)} />;
  if (tipo === 'insumo') return <Cookie className={clsx('text-orange-500', className)} />;
  return <Package className={clsx('text-coffee-400', className)} />;
};

const TIPO_PREFIX: Record<ItemTipo, string> = {
  comprado: '[C]',
  elaborado: '[E]',
  combo: '[K]',
  insumo: '[I]',
};

const KardexPage: React.FC = () => {
  const [allItems, setAllItems] = useState<KardexSelectorItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [movements, setMovements] = useState<UnifiedMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Paginación skip/take sincronizada a URL (compartida por ambos
  //    endpoints: producto/insumo). El reset al cambiar de item lo
  //    hace el handler de `selectedItemId` abajo. ────────────────────────
  const { page, pageSize, setPage, setPageSize, resetPage } = usePagination({ pageSize: 20 });
  const skip = (page - 1) * pageSize;

  const loadAllItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const data = await gql<KardexItemsResponse>(GET_KARDEX_ITEMS);

      const mapped: KardexSelectorItem[] = [
        ...data.comprados.items.map((c: KardexCompradoNode) => ({
          id: `comprado-${c.producto.id}`,
          name: c.producto.nombre,
          tipo: 'comprado' as const,
          stock: c.stock_actual,
          unit: 'unidad',
        })),
        ...data.elaborados.items.map((e: KardexElaboradoNode) => ({
          id: `elaborado-${e.id_Producto}`,
          name: e.producto.nombre,
          tipo: 'elaborado' as const,
          stock: e.stock_actual,
          unit: 'unidad',
        })),
        ...data.combos.items.map((c: KardexComboNode) => ({
          id: `combo-${c.producto.id}`,
          name: c.producto.nombre,
          tipo: 'combo' as const,
          stock: c.cantidadProducible,
          unit: 'unidad',
        })),
        ...data.insumos.items.map((i: KardexInsumoNode) => ({
          id: `insumo-${i.id}`,
          name: i.nombre,
          tipo: 'insumo' as const,
          stock: i.stock_actual,
          unit: i.unidad_min_uso,
        })),
      ];

      setAllItems(mapped);
    } catch (error) {
      console.error('Error loading kardex items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadAllItems();
  }, [loadAllItems]);

  const parseItemId = (fullId: string): { tipo: ItemTipo; id: number } | null => {
    const [tipo, idStr] = fullId.split('-');
    const id = Number(idStr);
    if (isNaN(id)) return null;
    if (tipo === 'elaborado' || tipo === 'comprado' || tipo === 'combo' || tipo === 'insumo') {
      return { tipo, id };
    }
    return null;
  };

  const loadMovements = useCallback(async (fullItemId: string) => {
    const parsed = parseItemId(fullItemId);
    if (!parsed) return;

    setIsLoadingMovements(true);
    try {
      const variables = { id: parsed.id, skip, take: pageSize };

      let items: UnifiedMovement[] = [];
      let total = 0;

      if (parsed.tipo === 'insumo') {
        const data = await gql<InsumoMovimientosResponse>(GET_INSUMO_MOVIMIENTOS, variables);
        total = data.insumoMovimientos.totalCount;
        items = data.insumoMovimientos.items.map((m: InsumoMovimientoNode) => ({
          id: String(m.id),
          date: new Date(m.fecha),
          type: TIPO_MOVEMENT_MAP[m.tipo] ?? 'adjustment',
          reference: m.referencia,
          quantity: m.cantidad,
          unitCost: m.costo_Unitario,
          totalCost: m.total,
          stockAfter: m.stock_resultante,
        }));
      } else {
        const data = await gql<MovimientoProductoResponse>(GET_PRODUCTO_MOVIMIENTOS, variables);
        total = data.movimientoProducto.totalCount;
        items = data.movimientoProducto.items.map((m: MovimientoProductoNode) => ({
          id: String(m.id),
          date: new Date(m.fecha),
          type: TIPO_MOVEMENT_MAP[m.tipo] ?? 'adjustment',
          reference: m.referencia,
          quantity: m.cantidad,
          unitCost: m.costo_Unitario,
          totalCost: m.total,
          stockAfter: m.stock_resultante,
        }));
      }

      items.sort((a, b) => b.date.getTime() - a.date.getTime());
      setMovements(items);
      setTotalCount(total);
    } catch (error) {
      console.error('Error loading kardex movements:', error);
      setMovements([]);
      setTotalCount(0);
    } finally {
      setIsLoadingMovements(false);
    }
  }, [skip, pageSize]);

  // Cambio de item seleccionado: reset a página 1.
  const handleSelectedItemChange = useCallback((value: string) => {
    setSelectedItemId(value);
    resetPage();
  }, [resetPage]);

  useEffect(() => {
    if (!selectedItemId) {
      setMovements([]);
      setTotalCount(0);
      return;
    }
    loadMovements(selectedItemId);
  }, [selectedItemId, loadMovements]);

  const itemOptions = useMemo(() => [
    { value: '', label: 'Seleccionar un producto o insumo…' },
    ...allItems.map((item) => ({
      value: item.id,
      label: `${TIPO_PREFIX[item.tipo]} ${item.name}`,
    })),
  ], [allItems]);

  const selectedItem = useMemo(
    () => allItems.find((i) => i.id === selectedItemId) ?? null,
    [allItems, selectedItemId]
  );

  const totalValue = selectedItem
    ? selectedItem.stock * (selectedItem.costo ?? 0)
    : 0;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Kardex"
          subtitle="Historial de movimientos de stock por producto o insumo"
        />

        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="max-w-lg">
            {isLoadingItems ? (
              <div className="h-10 bg-coffee-100 rounded-lg animate-pulse" />
            ) : (
              <SearchableSelect
                options={itemOptions}
                value={selectedItemId}
                onChange={handleSelectedItemChange}
                placeholder="Seleccionar un producto o insumo…"
              />
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-coffee-50 flex items-center justify-center flex-shrink-0">
                <TipoIcon tipo={selectedItem.tipo} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-coffee-900 truncate">{selectedItem.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-coffee-400 capitalize">{selectedItem.tipo}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-coffee-100">
              <div>
                <p className="text-xs text-coffee-500 mb-1">Stock actual</p>
                <p className={clsx(
                  'text-xl font-bold',
                  selectedItem.stock <= 0 ? 'text-red-600' : 'text-coffee-900',
                )}>
                  {selectedItem.stock}
                </p>
                <p className="text-xs text-coffee-400">{selectedItem.unit}</p>
              </div>
              {selectedItem.costo && selectedItem.costo > 0 && (
                <div>
                  <p className="text-xs text-coffee-500 mb-1">Costo unitario</p>
                  <p className="text-xl font-bold text-coffee-700">
                    {formatCurrency(selectedItem.costo)}
                  </p>
                </div>
              )}
              {totalValue > 0 && (
                <div>
                  <p className="text-xs text-coffee-500 mb-1">Valor en stock</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedItemId && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-coffee-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-coffee-500" />
              <h3 className="text-base font-semibold text-coffee-900">Movimientos de stock</h3>
              {!isLoadingMovements && movements.length > 0 && (
                <span className="ml-auto text-sm text-coffee-400">
                  {movements.length} de {totalCount}
                </span>
              )}
            </div>

            {isLoadingMovements ? (
              <div className="divide-y divide-coffee-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                    <div className="h-3 w-28 bg-coffee-100 rounded" />
                    <div className="h-5 w-16 bg-coffee-100 rounded-full" />
                    <div className="h-3 w-24 bg-coffee-100 rounded" />
                    <div className="h-3 w-10 bg-coffee-100 rounded ml-auto" />
                  </div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
                <BookOpen className="h-10 w-10 mb-3 text-coffee-300" />
                <p className="font-medium text-center">Sin movimientos registrados</p>
                <p className="text-sm mt-1 text-coffee-400 text-center">
                  Los movimientos aparecerán aquí al realizar ventas, compras o ajustes.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-coffee-100 text-sm">
                    <thead className="bg-coffee-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Referencia</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Cantidad</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Costo unit.</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Stock resultante</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-coffee-50">
                      {movements.map((m) => {
                        const isPositive = m.quantity > 0;
                        const badgeVariant = (MOVEMENT_COLORS[m.type] ?? 'default') as 'success' | 'danger' | 'warning' | 'info' | 'default';
                        return (
                          <tr key={m.id} className="hover:bg-coffee-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-coffee-600">
                              {formatDateTime(m.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={badgeVariant} size="sm">
                                {MOVEMENT_LABELS[m.type] ?? m.type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-coffee-700">{m.reference}</span>
                              {m.notes && (
                                <p className="text-xs text-coffee-400 mt-0.5 truncate max-w-xs">{m.notes}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <span className={clsx('font-semibold', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                                {isPositive ? '+' : ''}{m.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap text-coffee-700">
                              {m.unitCost > 0 ? formatCurrency(m.unitCost) : '—'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-coffee-800">
                              {formatCurrency(m.totalCost)}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-semibold text-coffee-900">
                              {m.stockAfter > 0 ? m.stockAfter : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  totalCount={totalCount}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoadingMovements}
                />
              </>
            )}
          </div>
        )}

        {!selectedItemId && !isLoadingItems && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <BookOpen className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium text-center">Selecciona un producto o insumo</p>
            <p className="text-sm mt-1 text-coffee-400 text-center">
              Elige un elemento del selector para ver su historial de movimientos.
            </p>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
};

export default KardexPage;