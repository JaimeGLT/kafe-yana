import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Layers, ChevronDown, ChevronRight, FlaskConical, Coffee, Package, Info } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { VariacionModal } from '../../components/modals/VariacionModal';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils';
import type { Product, VariacionAtributo, Insumo } from '../../types';

// KPI card
interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, color }) => (
  <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4')}>
    <div className={clsx('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-display font-bold text-coffee-900">{value}</p>
      <p className="text-sm text-coffee-500">{label}</p>
    </div>
  </div>
);

// Product tipo badge
const TipoBadge: React.FC<{ tipo: Product['tipo'] }> = ({ tipo }) => {
  const map: Record<Product['tipo'], { label: string; className: string }> = {
    elaborado: { label: 'Elaborado', className: 'bg-amber-100 text-amber-700' },
    comprado: { label: 'Comprado', className: 'bg-blue-100 text-blue-700' },
    combo: { label: 'Combo', className: 'bg-purple-100 text-purple-700' },
  };
  const info = map[tipo] ?? { label: tipo, className: 'bg-coffee-100 text-coffee-600' };
  return (
    <span className={clsx('text-xs font-medium rounded-full px-2 py-0.5', info.className)}>
      {info.label}
    </span>
  );
};

// Per-product row
interface ProductRowProps {
  product: Product;
  atributos: VariacionAtributo[];
  insumos: Insumo[];
  onAddAtributo: (productId: string, data: { nombre: string; esRequerido: boolean }) => Promise<VariacionAtributo>;
  onUpdateAtributo: (atributoId: string, data: { nombre: string; esRequerido: boolean }) => Promise<void>;
  onDeleteAtributo: (atributoId: string) => Promise<void>;
  onAddOpcion: (atributoId: string, data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number }) => Promise<void>;
  onUpdateOpcion: (atributoId: string, opcionId: string, data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number }) => Promise<void>;
  onDeleteOpcion: (atributoId: string, opcionId: string) => Promise<void>;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  atributos,
  insumos,
  onAddAtributo,
  onUpdateAtributo,
  onDeleteAtributo,
  onAddOpcion,
  onUpdateOpcion,
  onDeleteOpcion,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const productAtributos = atributos.filter((a: VariacionAtributo) => a.productId === product.id && a.isActive);
  const totalOpciones = productAtributos.reduce((s: number, a: VariacionAtributo) => s + a.opciones.filter((o) => o.isActive).length, 0);

  return (
    <>
      <div className="border border-coffee-100 rounded-xl overflow-hidden">
        {/* Header row */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-coffee-50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <button className="text-coffee-400 flex-shrink-0">
            {expanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
            }
          </button>

          <div className={clsx(
            'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
            product.tipo === 'elaborado' ? 'bg-amber-100' : 'bg-coffee-100'
          )}>
            {product.tipo === 'elaborado'
              ? <FlaskConical className="h-4 w-4 text-amber-500" />
              : <Coffee className="h-4 w-4 text-coffee-500" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-coffee-900 text-sm">{product.name}</span>
              <TipoBadge tipo={product.tipo} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-coffee-500">{formatCurrency(product.salePrice)}</span>
              <span className="text-xs text-coffee-400">
                {productAtributos.length} atributo(s) · {totalOpciones} opción(es)
              </span>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
            leftIcon={<Layers className="h-3.5 w-3.5" />}
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
          >
            Gestionar
          </Button>
        </div>

        {/* Expanded: atributo list */}
        {expanded && productAtributos.length > 0 && (
          <div className="border-t border-coffee-100 px-4 py-3 bg-coffee-50 space-y-2">
            {productAtributos.map((atributo: VariacionAtributo) => (
              <div key={atributo.id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-coffee-700">{atributo.nombre}</span>
                  {atributo.esRequerido && (
                    <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                      Requerido
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {atributo.opciones.filter((o) => o.isActive).map((opcion) => (
                    <span
                      key={opcion.id}
                      className="text-xs bg-white border border-coffee-200 rounded-full px-2.5 py-1 text-coffee-700"
                    >
                      {opcion.nombre}
                      {opcion.precioAjuste !== 0 && (
                        <span className={clsx(
                          'ml-1 font-medium',
                          opcion.precioAjuste > 0 ? 'text-green-600' : 'text-red-500'
                        )}>
                          {opcion.precioAjuste > 0 ? '+' : ''}{opcion.precioAjuste}
                        </span>
                      )}
                    </span>
                  ))}
                  {atributo.opciones.filter((o) => o.isActive).length === 0 && (
                    <span className="text-xs text-coffee-400 italic">Sin opciones</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {expanded && productAtributos.length === 0 && (
          <div className="border-t border-coffee-100 px-4 py-3 bg-coffee-50 text-center">
            <p className="text-xs text-coffee-400">Sin atributos. Haz clic en "Gestionar" para añadir variaciones.</p>
          </div>
        )}
      </div>

      <VariacionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={product.id}
        productName={product.name}
        insumos={insumos}
        atributos={productAtributos}
        onAddAtributo={onAddAtributo}
        onUpdateAtributo={onUpdateAtributo}
        onDeleteAtributo={onDeleteAtributo}
        onAddOpcion={onAddOpcion}
        onUpdateOpcion={onUpdateOpcion}
        onDeleteOpcion={onDeleteOpcion}
      />
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const VariacionesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [atributos, setAtributos] = useState<VariacionAtributo[]>([]);
  const [insumos, _setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    interface ElaboradoNode {
      id: number;
      nombre: string;
      descripcion: string;
      precio: number;
      categoria_Id: number;
      unidad_medida: string;
    }
    interface ElaboradosResponse { elaborados: ElaboradoNode[] }

    const fetchData = async () => {
      try {
        const elaboradosData = await gql<ElaboradosResponse>(`
          query {
            elaborados {
              id nombre descripcion precio categoria_Id unidad_medida
            }
          }
        `);
        const mapped: Product[] = elaboradosData.elaborados.map((node) => ({
          id: String(node.id),
          code: String(node.id),
          name: node.nombre,
          description: node.descripcion,
          tipo: 'elaborado' as const,
          categoryId: String(node.categoria_Id),
          categoryName: '',
          unit: node.unidad_medida,
          costPrice: 0,
          salePrice: node.precio,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          variations: [],
          hasVariations: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setProducts(mapped);
      } catch (error) {
        console.error('Error loading variaciones data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAddAtributo = useCallback(async (
    productId: string,
    data: { nombre: string; esRequerido: boolean }
  ): Promise<VariacionAtributo> => {
    try {
      const res = await api.post<{ id: number }>('/Variacion/Variacion', {
        nombre: data.nombre,
        requerido: data.esRequerido,
        id_Producto: Number(productId),
      });
      const nuevo: VariacionAtributo = {
        id: String(res.id),
        productId,
        nombre: data.nombre,
        esRequerido: data.esRequerido,
        opciones: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAtributos((prev) => [...prev, nuevo]);
      toast.success('Grupo creado', `"${data.nombre}" fue creado.`);
      return nuevo;
    } catch {
      toast.error('Error', 'No se pudo crear el grupo de variación.');
      throw new Error('Failed to create atributo');
    }
  }, []);

  const handleUpdateAtributo = useCallback(async (
    atributoId: string,
    data: { nombre: string; esRequerido: boolean }
  ): Promise<void> => {
    setAtributos((prev) =>
      prev.map((a) => a.id === atributoId ? { ...a, ...data, updatedAt: new Date() } : a)
    );
  }, []);

  const handleDeleteAtributo = useCallback(async (atributoId: string): Promise<void> => {
    setAtributos((prev) =>
      prev.map((a) => a.id === atributoId ? { ...a, isActive: false } : a)
    );
  }, []);

  const handleAddOpcion = useCallback(async (
    atributoId: string,
    data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number; ajustesCantidad?: { insumoId: string; cantidad: number }[] }
  ): Promise<void> => {
    // Build ajustes array for the backend
    let ajustes: { id_Insumo: number; id_InsumoNuevo: number | null; cantidad: number }[] = [];
    if (data.insumoReemplazadoId) {
      ajustes = [{
        id_Insumo: Number(data.insumoReemplazadoId),
        id_InsumoNuevo: data.insumoExtraId ? Number(data.insumoExtraId) : null,
        cantidad: data.cantidadExtra ?? 1,
      }];
    } else if (data.ajustesCantidad?.length) {
      ajustes = data.ajustesCantidad.map((a) => ({
        id_Insumo: Number(a.insumoId),
        id_InsumoNuevo: null,
        cantidad: a.cantidad,
      }));
    }

    try {
      const res = await api.post<{ id: number }>('/Variacion/Opcion', {
        nombre: data.nombre,
        ajustePrecio: data.precioAjuste,
        id_variacion: Number(atributoId),
        ajustes,
      });
      const nuevaOpcion = {
        id: String(res.id),
        atributoId,
        nombre: data.nombre,
        precioAjuste: data.precioAjuste,
        insumoReemplazadoId: data.insumoReemplazadoId,
        insumoExtraId: data.insumoExtraId,
        cantidadExtra: data.cantidadExtra,
        ajustesCantidad: data.ajustesCantidad,
        isActive: true,
      };
      setAtributos((prev) =>
        prev.map((a) =>
          a.id === atributoId ? { ...a, opciones: [...a.opciones, nuevaOpcion] } : a
        )
      );
    } catch {
      toast.error('Error', 'No se pudo crear la opción.');
      throw new Error('Failed to create opcion');
    }
  }, []);

  const handleUpdateOpcion = useCallback(async (
    atributoId: string,
    opcionId: string,
    data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number }
  ): Promise<void> => {
    setAtributos((prev) =>
      prev.map((a) =>
        a.id === atributoId
          ? { ...a, opciones: a.opciones.map((o) => o.id === opcionId ? { ...o, ...data } : o) }
          : a
      )
    );
  }, []);

  const handleDeleteOpcion = useCallback(async (atributoId: string, opcionId: string): Promise<void> => {
    setAtributos((prev) =>
      prev.map((a) =>
        a.id === atributoId
          ? { ...a, opciones: a.opciones.map((o) => o.id === opcionId ? { ...o, isActive: false } : o) }
          : a
      )
    );
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────────

  const activeProducts = useMemo(
    () => products.filter((p: Product) => p.isActive && p.tipo === 'elaborado'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return activeProducts;
    const q = search.toLowerCase();
    return activeProducts.filter(
      (p: Product) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [activeProducts, search]);

  const productsWithVariations = useMemo(() => {
    const ids = new Set(atributos.filter((a: VariacionAtributo) => a.isActive).map((a: VariacionAtributo) => a.productId));
    return ids.size;
  }, [atributos]);

  const totalAtributos = useMemo(
    () => atributos.filter((a: VariacionAtributo) => a.isActive).length,
    [atributos]
  );

  const totalOpciones = useMemo(
    () =>
      atributos
        .filter((a: VariacionAtributo) => a.isActive)
        .reduce((s: number, a: VariacionAtributo) => s + a.opciones.filter((o) => o.isActive).length, 0),
    [atributos]
  );

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-7 w-64 bg-coffee-100 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-coffee-100 rounded animate-pulse" />
          </div>

          {/* Info banner skeleton */}
          <div className="h-12 w-full bg-amber-50 border border-amber-100 rounded-xl animate-pulse" />

          {/* KPI cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-coffee-100 animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-16 bg-coffee-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-coffee-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Product list skeleton */}
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm">
            <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-coffee-100 rounded animate-pulse" />
                <div className="h-3 w-64 bg-coffee-100 rounded animate-pulse" />
              </div>
              <div className="h-9 w-48 bg-coffee-100 rounded-lg animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border border-coffee-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-coffee-100 rounded animate-pulse" />
                    <div className="h-3 w-56 bg-coffee-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-coffee-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Variaciones de Productos"
          subtitle="Gestiona atributos como tamaño, temperatura y tipo de leche para personalizar productos en el POS."
          breadcrumbs={[
            { label: 'Inventario' },
            { label: 'Variaciones' },
          ]}
        />

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Las variaciones solo están habilitadas para productos elaborados.</span>{' '}
            Si necesitas variaciones para un producto comprado, conviértelo a elaborado primero o usa el módulo de Combos para agrupar presentaciones.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Productos con variaciones"
            value={productsWithVariations}
            icon={<Package className="h-6 w-6 text-amber-600" />}
            color="bg-amber-50"
          />
          <KpiCard
            label="Total atributos"
            value={totalAtributos}
            icon={<Layers className="h-6 w-6 text-coffee-600" />}
            color="bg-coffee-100"
          />
          <KpiCard
            label="Total opciones"
            value={totalOpciones}
            icon={<Coffee className="h-6 w-6 text-coffee-500" />}
            color="bg-coffee-100"
          />
        </div>

        {/* Product list */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm">
          <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-coffee-900">
                Productos elaborados
              </h2>
              <p className="text-sm text-coffee-500 mt-0.5">
                Haz clic en "Gestionar" para añadir o editar variaciones de un producto elaborado.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-coffee-50">
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="p-4 space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-coffee-400">
                <Coffee className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron productos.</p>
              </div>
            ) : (
              filteredProducts.map((product: Product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  atributos={atributos}
                  insumos={insumos}
                  onAddAtributo={handleAddAtributo}
                  onUpdateAtributo={handleUpdateAtributo}
                  onDeleteAtributo={handleDeleteAtributo}
                  onAddOpcion={handleAddOpcion}
                  onUpdateOpcion={handleUpdateOpcion}
                  onDeleteOpcion={handleDeleteOpcion}
                />
              ))
            )}
          </div>
        </div>
      </PageContainer>
    </MainLayout>
  );
};

export default VariacionesPage;
