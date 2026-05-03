import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BookOpen, Package, FlaskConical, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { SearchableSelect, Badge } from '../../components/ui';
import { gql } from '../../lib/graphql';
import { GET_KARDEX_PRODUCTS, GET_KARDEX_MOVEMENTS } from '../../lib/queries/ajustes.queries';
import { formatCurrency, formatDateTime } from '../../utils';
import type { KardexProductsResponse, KardexMovementsResponse } from '../../types/graphql';

type ProductTipo = 'comprado' | 'elaborado' | 'combo';

interface KardexProduct {
  id: string;
  name: string;
  tipo: ProductTipo;
  categoryName: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  unit: string;
}

interface UnifiedMovement {
  id: string;
  date: Date;
  type: 'adjustment' | 'sale';
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
  purchase: 'adjustment',
  sale: 'sale',
  adjustment: 'adjustment',
  transfer: 'adjustment',
  initial: 'adjustment',
};

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
  initial: 'Stock inicial',
};

const MOVEMENT_COLORS: Record<string, string> = {
  purchase: 'success',
  sale: 'danger',
  adjustment: 'warning',
  transfer: 'info',
  initial: 'default',
};

const TipoIcon: React.FC<{ tipo: ProductTipo; className?: string }> = ({ tipo, className }) => {
  if (tipo === 'elaborado') return <FlaskConical className={clsx('text-amber-500', className)} />;
  if (tipo === 'combo') return <Layers className={clsx('text-blue-500', className)} />;
  return <Package className={clsx('text-coffee-400', className)} />;
};

const KardexPage: React.FC = () => {
  const [allProducts, setAllProducts] = useState<KardexProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [movements, setMovements] = useState<UnifiedMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await gql<KardexProductsResponse>(GET_KARDEX_PRODUCTS);

      const mapped: KardexProduct[] = [
        ...data.comprados.nodes.map((c) => ({
          id: String(c.producto.id),
          name: c.producto.nombre,
          tipo: 'comprado' as const,
          categoryName: '',
          salePrice: 0,
          costPrice: 0,
          stock: c.stock_actual,
          unit: 'unidad',
        })),
        ...data.elaborados.nodes.map((e) => ({
          id: String(e.id_Producto),
          name: e.producto.nombre,
          tipo: 'elaborado' as const,
          categoryName: '',
          salePrice: 0,
          costPrice: 0,
          stock: e.stock_actual,
          unit: 'unidad',
        })),
      ];

      setAllProducts(mapped);
    } catch (error) {
      console.error('Error loading kardex products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadMovements = useCallback(async (productoId: string) => {
    setIsLoadingMovements(true);
    try {
      const data = await gql<KardexMovementsResponse>(GET_KARDEX_MOVEMENTS, {
        productoId: Number(productoId),
      });

      const unified: UnifiedMovement[] = [];

      for (const ajuste of data.ajustes.nodes) {
        unified.push({
          id: String(ajuste.id),
          date: new Date(ajuste.fecha),
          type: TIPO_MOVEMENT_MAP[ajuste.tipo] ?? 'adjustment',
          reference: ajuste.nombre,
          quantity: ajuste.ajuste,
          unitCost: 0,
          totalCost: ajuste.perdida,
          stockAfter: ajuste.stockNuevo,
          notes: ajuste.nota,
        });
      }

      for (const venta of data.ventas.nodes) {
        for (const detalle of venta.detalles) {
          unified.push({
            id: `${venta.id}-${detalle.nombre}`,
            date: new Date(venta.fecha),
            type: 'sale',
            reference: venta.codigo,
            quantity: -detalle.cantidad,
            unitCost: 0,
            totalCost: detalle.total,
            stockAfter: 0,
            notes: undefined,
          });
        }
      }

      unified.sort((a, b) => b.date.getTime() - a.date.getTime());

      setMovements(unified);
    } catch (error) {
      console.error('Error loading kardex movements:', error);
      setMovements([]);
    } finally {
      setIsLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setMovements([]);
      return;
    }
    loadMovements(selectedProductId);
  }, [selectedProductId, loadMovements]);

  const TIPO_PREFIX: Record<ProductTipo, string> = {
    comprado: '[C]',
    elaborado: '[E]',
    combo: '[K]',
  };

  const productOptions = useMemo(() => [
    { value: '', label: 'Seleccionar un producto…' },
    ...allProducts.map((p) => ({
      value: p.id,
      label: `${TIPO_PREFIX[p.tipo]} ${p.name}`,
    })),
  ], [allProducts]);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) ?? null,
    [allProducts, selectedProductId]
  );

  const totalValue = selectedProduct
    ? selectedProduct.stock * selectedProduct.costPrice
    : 0;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Kardex"
          subtitle="Historial de movimientos de stock por producto"
        />

        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="max-w-lg">
            {isLoadingProducts ? (
              <div className="h-10 bg-coffee-100 rounded-lg animate-pulse" />
            ) : (
              <SearchableSelect
                options={productOptions}
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder="Seleccionar un producto…"
              />
            )}
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-coffee-50 flex items-center justify-center flex-shrink-0">
                <TipoIcon tipo={selectedProduct.tipo} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-coffee-900 truncate">{selectedProduct.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-coffee-400 capitalize">{selectedProduct.tipo}</span>
                  {selectedProduct.categoryName && (
                    <span className="text-xs text-coffee-400">· {selectedProduct.categoryName}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-coffee-100">
              <div>
                <p className="text-xs text-coffee-500 mb-1">Stock actual</p>
                <p className={clsx(
                  'text-xl font-bold',
                  selectedProduct.stock <= 0 ? 'text-red-600' : 'text-coffee-900',
                )}>
                  {selectedProduct.stock}
                </p>
                <p className="text-xs text-coffee-400">{selectedProduct.unit}</p>
              </div>
              {selectedProduct.salePrice > 0 && (
                <div>
                  <p className="text-xs text-coffee-500 mb-1">Precio venta</p>
                  <p className="text-xl font-bold text-coffee-900">
                    {formatCurrency(selectedProduct.salePrice)}
                  </p>
                </div>
              )}
              {selectedProduct.costPrice > 0 && (
                <div>
                  <p className="text-xs text-coffee-500 mb-1">Costo unitario</p>
                  <p className="text-xl font-bold text-coffee-700">
                    {formatCurrency(selectedProduct.costPrice)}
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

        {selectedProductId && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-coffee-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-coffee-500" />
              <h3 className="text-base font-semibold text-coffee-900">Movimientos de stock</h3>
              {!isLoadingMovements && movements.length > 0 && (
                <span className="ml-auto text-sm text-coffee-400">
                  {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
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
                <p className="font-medium">Sin movimientos registrados</p>
                <p className="text-sm mt-1 text-coffee-400">
                  Los movimientos aparecerán aquí al realizar ventas, compras o ajustes.
                </p>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {!selectedProductId && !isLoadingProducts && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <BookOpen className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">Selecciona un producto</p>
            <p className="text-sm mt-1 text-coffee-400">
              Elige un producto del selector para ver su historial de movimientos.
            </p>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
};

export default KardexPage;
