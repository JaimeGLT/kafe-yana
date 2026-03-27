import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Package } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Select, Badge } from '../../components/ui';
import { api } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../utils';
import type { Product, KardexMovement } from '../../types';

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

const KardexPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [kardexMovements, setKardexMovements] = useState<Record<string, KardexMovement[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, movementsData] = await Promise.all([
          api.get<Product[]>('/Inventory/products'),
          api.get<Record<string, KardexMovement[]>>('/Inventory/kardex'),
        ]);
        setProducts(productsData);
        setKardexMovements(movementsData);
      } catch (error) {
        console.error('Error loading kardex data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeProducts = useMemo(
    () => products.filter((p: Product) => p.isActive),
    [products]
  );

  const productOptions = useMemo(() => {
    return [
      { value: '', label: 'Seleccionar un producto...' },
      ...activeProducts.map((p: Product) => ({
        value: p.id,
        label: `${p.code} — ${p.name}`,
      })),
    ];
  }, [activeProducts]);

  const selectedProduct = useMemo(
    () => products.find((p: Product) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const movements = useMemo(() => {
    if (!selectedProductId) return [];
    const raw = kardexMovements[selectedProductId] || [];
    return [...raw].sort(
      (a: KardexMovement, b: KardexMovement) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [kardexMovements, selectedProductId]);

  const totalValue = selectedProduct
    ? selectedProduct.stock * selectedProduct.costPrice
    : 0;

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-600"></div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Kardex de Inventario"
          subtitle="Historial de movimientos de stock por producto"
        />

        {/* Product selector */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="max-w-lg">
            <Select
              label="Seleccionar Producto"
              options={productOptions}
              value={selectedProductId}
              onChange={setSelectedProductId}
              placeholder="Seleccionar un producto..."
            />
          </div>
        </div>

        {/* Product info card */}
        {selectedProduct && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
            <div className="flex items-start gap-4">
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-16 h-16 rounded-xl object-cover border border-coffee-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
                  <Package className="h-8 w-8 text-coffee-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-display font-semibold text-coffee-900">
                    {selectedProduct.name}
                  </h3>
                  <span className="font-mono text-xs text-coffee-500 bg-coffee-50 px-2 py-0.5 rounded">
                    {selectedProduct.code}
                  </span>
                </div>
                {selectedProduct.categoryName && (
                  <p className="text-sm text-coffee-500 mt-0.5">{selectedProduct.categoryName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-coffee-100">
              <div>
                <p className="text-xs text-coffee-500 mb-1">Stock Actual</p>
                <p
                  className={`text-xl font-display font-bold ${
                    selectedProduct.stock <= 0
                      ? 'text-red-600'
                      : selectedProduct.stock <= selectedProduct.minStock
                      ? 'text-yellow-600'
                      : 'text-coffee-900'
                  }`}
                >
                  {selectedProduct.stock}
                </p>
                <p className="text-xs text-coffee-400">{selectedProduct.unit}</p>
              </div>
              <div>
                <p className="text-xs text-coffee-500 mb-1">Stock Mínimo</p>
                <p className="text-xl font-display font-bold text-coffee-700">
                  {selectedProduct.minStock}
                </p>
                <p className="text-xs text-coffee-400">{selectedProduct.unit}</p>
              </div>
              <div>
                <p className="text-xs text-coffee-500 mb-1">Costo Unitario</p>
                <p className="text-xl font-display font-bold text-coffee-700">
                  {formatCurrency(selectedProduct.costPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-coffee-500 mb-1">Valor Total</p>
                <p className="text-xl font-display font-bold text-green-700">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Movements table */}
        {selectedProductId && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-coffee-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-coffee-500" />
              <h3 className="text-base font-display font-semibold text-coffee-900">
                Movimientos de Stock
              </h3>
              {movements.length > 0 && (
                <span className="ml-auto text-sm text-coffee-500">
                  {movements.length} movimiento(s)
                </span>
              )}
            </div>

            {movements.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
                <BookOpen className="h-10 w-10 mb-3 text-coffee-300" />
                <p className="font-medium">No hay movimientos registrados</p>
                <p className="text-sm mt-1">
                  Los movimientos aparecerán aquí una vez se realicen ventas, compras o ajustes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-coffee-200">
                  <thead className="bg-coffee-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Referencia
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Costo Unit.
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">
                        Stock Resultante
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-coffee-100">
                    {movements.map((movement: KardexMovement) => {
                      const isPositive = movement.quantity > 0;
                      const badgeVariant =
                        (MOVEMENT_COLORS[movement.type] as 'success' | 'danger' | 'warning' | 'info' | 'default') || 'default';

                      return (
                        <tr key={movement.id} className="hover:bg-coffee-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                            {formatDateTime(movement.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={badgeVariant} size="sm">
                              {MOVEMENT_LABELS[movement.type] || movement.type}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-coffee-700">
                              {movement.reference}
                            </span>
                            {movement.notes && (
                              <p className="text-xs text-coffee-400 mt-0.5 truncate max-w-xs">
                                {movement.notes}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span
                              className={`text-sm font-semibold ${
                                isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {movement.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-sm text-coffee-700">
                            {formatCurrency(movement.unitCost)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium text-coffee-800">
                            {formatCurrency(movement.totalCost)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="text-sm font-semibold text-coffee-900">
                              {movement.stockAfter}
                            </span>
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

        {/* Empty state when no product selected */}
        {!selectedProductId && (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <BookOpen className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">Selecciona un producto</p>
            <p className="text-sm mt-1">
              Elige un producto del selector de arriba para ver su historial de movimientos.
            </p>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
};

export default KardexPage;