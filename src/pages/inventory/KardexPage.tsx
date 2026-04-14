import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Package, FlaskConical, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Select, Badge } from '../../components/ui';
import { gql } from '../../lib/graphql';
import { GET_KARDEX_PRODUCTS_QUERY, GET_KARDEX_MOVEMENTS_QUERY } from '../../lib/queries/products.queries';
import { formatCurrency, formatDateTime } from '../../utils';
import type { KardexMovement } from '../../types';

// ── Tipos locales ─────────────────────────────────────────────────────────────

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

interface RawMovement {
  id: number;
  fecha: string;
  tipo: string;
  referencia: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  stockResultante: number;
  notas?: string;
}

interface KardexProductsResponse {
  productos: {
    nodes: {
      id: number;
      nombre: string;
      tipo: string;
      categoriaNombre: string;
      precioVenta: number;
      costo: number;
      stock: number;
    }[];
  };
  elaborados: {
    id: number;
    nombre: string;
    precio: number;
    cantidadProducible: number;
    unidad_medida: string;
  }[];
  combos: {
    id: number;
    nombre: string;
    precio: number;
    cantidadProducible: number;
  }[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPO_MOVEMENT_MAP: Record<string, KardexMovement['type']> = {
  Compra: 'purchase',
  Venta: 'sale',
  Ajuste: 'adjustment',
  Transferencia: 'transfer',
  Inicial: 'initial',
  purchase: 'purchase',
  sale: 'sale',
  adjustment: 'adjustment',
  transfer: 'transfer',
  initial: 'initial',
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

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapMovement(raw: RawMovement): KardexMovement {
  return {
    id: String(raw.id),
    date: new Date(raw.fecha),
    type: TIPO_MOVEMENT_MAP[raw.tipo] ?? 'adjustment',
    reference: raw.referencia ?? '',
    quantity: raw.cantidad,
    unitCost: raw.costoUnitario,
    totalCost: raw.costoTotal,
    stockAfter: raw.stockResultante,
    notes: raw.notas,
  };
}

// ── Íconos por tipo ───────────────────────────────────────────────────────────

const TipoIcon: React.FC<{ tipo: ProductTipo; className?: string }> = ({ tipo, className }) => {
  if (tipo === 'elaborado') return <FlaskConical className={clsx('text-amber-500', className)} />;
  if (tipo === 'combo') return <Layers className={clsx('text-blue-500', className)} />;
  return <Package className={clsx('text-coffee-400', className)} />;
};

// ── Página ────────────────────────────────────────────────────────────────────

const KardexPage: React.FC = () => {
  const [allProducts, setAllProducts] = useState<KardexProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // ── Carga inicial de productos ─────────────────────────────────────────────

  // TODO: reemplazar el mock por la llamada real cuando el backend responda bien:
  //
  //   gql<KardexProductsResponse>(GET_KARDEX_PRODUCTS_QUERY).then((data) => {
  //     const comprados = (data.productos?.nodes ?? []).filter(...).map(...)
  //     const elaborados = data.elaborados.map(...)
  //     const combos = data.combos.map(...)
  //     setAllProducts([...comprados, ...elaborados, ...combos])
  //   })
  //
  useEffect(() => {
    const MOCK_PRODUCTS: KardexProduct[] = [
      { id: '1', name: 'Café en grano 1kg',    tipo: 'comprado',  categoryName: 'Café',    salePrice: 85,  costPrice: 55,  stock: 40,  unit: 'kg'     },
      { id: '2', name: 'Leche entera 1L',       tipo: 'comprado',  categoryName: 'Lácteos', salePrice: 12,  costPrice: 8,   stock: 120, unit: 'litro'  },
      { id: '3', name: 'Azúcar 1kg',            tipo: 'comprado',  categoryName: 'Insumos', salePrice: 10,  costPrice: 6,   stock: 80,  unit: 'kg'     },
      { id: '4', name: 'Cappuccino 12oz',        tipo: 'elaborado', categoryName: '',        salePrice: 45,  costPrice: 0,   stock: 35,  unit: 'taza'   },
      { id: '5', name: 'Latte con vainilla',     tipo: 'elaborado', categoryName: '',        salePrice: 52,  costPrice: 0,   stock: 28,  unit: 'taza'   },
      { id: '6', name: 'Combo desayuno clásico', tipo: 'combo',     categoryName: '',        salePrice: 95,  costPrice: 0,   stock: 15,  unit: 'combo'  },
    ];

    setTimeout(() => {
      setAllProducts(MOCK_PRODUCTS);
      setIsLoadingProducts(false);
    }, 300);
  }, []);

  // ── Carga de movimientos al seleccionar producto ───────────────────────────
  //
  // TODO: reemplazar el mock por la llamada real cuando el backend lo implemente:
  //
  //   gql<{ kardexMovimientos: RawMovement[] }>(
  //     GET_KARDEX_MOVEMENTS_QUERY,
  //     { productoId: Number(selectedProductId) }
  //   ).then(({ kardexMovimientos }) => { ... })
  //
  useEffect(() => {
    if (!selectedProductId) {
      setMovements([]);
      return;
    }
    setIsLoadingMovements(true);

    // — MOCK — simula la respuesta que devolverá el backend —
    const MOCK_MOVEMENTS: RawMovement[] = [
      {
        id: 1,
        fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tipo: 'Compra',
        referencia: 'OC-2024-001',
        cantidad: 50,
        costoUnitario: 12.5,
        costoTotal: 625,
        stockResultante: 50,
        notas: 'Compra inicial de stock',
      },
      {
        id: 2,
        fecha: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        tipo: 'Venta',
        referencia: 'VTA-00123',
        cantidad: -3,
        costoUnitario: 12.5,
        costoTotal: -37.5,
        stockResultante: 47,
      },
      {
        id: 3,
        fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        tipo: 'Venta',
        referencia: 'VTA-00124',
        cantidad: -5,
        costoUnitario: 12.5,
        costoTotal: -62.5,
        stockResultante: 42,
      },
      {
        id: 4,
        fecha: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        tipo: 'Ajuste',
        referencia: 'AJU-00045',
        cantidad: -2,
        costoUnitario: 12.5,
        costoTotal: -25,
        stockResultante: 40,
        notas: 'Producto dañado',
      },
    ];

    setTimeout(() => {
      const sorted = MOCK_MOVEMENTS
        .map(mapMovement)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMovements(sorted);
      setIsLoadingMovements(false);
    }, 400); // simula latencia de red
  }, [selectedProductId]);

  // ── Derivados ─────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Kardex"
          subtitle="Historial de movimientos de stock por producto"
        />

        {/* Selector de producto */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="max-w-lg">
            {isLoadingProducts ? (
              <div className="h-10 bg-coffee-100 rounded-lg animate-pulse" />
            ) : (
              <Select
                options={productOptions}
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder="Seleccionar un producto…"
              />
            )}
          </div>
        </div>

        {/* Info del producto seleccionado */}
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
              <div>
                <p className="text-xs text-coffee-500 mb-1">Precio venta</p>
                <p className="text-xl font-bold text-coffee-900">
                  {formatCurrency(selectedProduct.salePrice)}
                </p>
              </div>
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

        {/* Tabla de movimientos */}
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
                            {formatCurrency(m.unitCost)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-coffee-800">
                            {formatCurrency(m.totalCost)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap font-semibold text-coffee-900">
                            {m.stockAfter}
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

        {/* Estado vacío — sin producto seleccionado */}
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
