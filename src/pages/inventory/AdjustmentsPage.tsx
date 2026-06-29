import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Package, FlaskConical,
  ChefHat, ClipboardList, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge, SkeletonStatCard, SkeletonAjusteRow } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { gql } from '../../lib/graphql';
import { GET_ADJUSTMENTS_DATA } from '../../lib/queries/ajustes.queries';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency } from '../../utils';
import type {
  AdjustmentsDataResponse,
  AjusteNode,
  CompradoNode,
  InsumoNode,
  ElaboradoAjusteNode,
} from '../../types/graphql';

const TIPO_ICON: Record<string, React.ReactNode> = {
  Comprado: <Package className="h-3.5 w-3.5" />,
  Insumo: <FlaskConical className="h-3.5 w-3.5" />,
  Elaborado: <ChefHat className="h-3.5 w-3.5" />,
};

const TIPO_COLOR: Record<string, string> = {
  Comprado: 'bg-blue-50 text-blue-700',
  Insumo: 'bg-violet-50 text-violet-700',
  Elaborado: 'bg-amber-50 text-amber-700',
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'green' | 'red' | 'default';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = 'default' }) => {
  const accentClass = {
    green: 'text-emerald-600',
    red: 'text-red-500',
    default: 'text-coffee-800',
  }[accent];

  const iconBg = {
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    default: 'bg-coffee-50 text-coffee-500',
  }[accent];

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-coffee-400 font-medium mb-0.5">{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${accentClass}`}>{value}</p>
      </div>
    </div>
  );
};

const AdjustmentsPage: React.FC = () => {
  const { page, pageSize, setPage, setPageSize } = usePagination({ pageSize: 200 });

  const [totalCount, setTotalCount] = useState(0);

  const [ajustes, setAjustes] = useState<AjusteNode[]>([]);
  const [comprados, setComprados] = useState<CompradoNode[]>([]);
  const [insumos, setInsumos] = useState<InsumoNode[]>([]);
  const [elaborados, setElaborados] = useState<ElaboradoAjusteNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gql<AdjustmentsDataResponse>(GET_ADJUSTMENTS_DATA, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      setAjustes(data.ajustes?.items ?? []);
      setTotalCount(data.ajustes?.totalCount ?? 0);
      setComprados(data.comprados?.items ?? []);
      setInsumos(data.insumos?.items ?? []);
      setElaborados(
        (data.elaborados?.items ?? [])
          .map((e) => ({
            ...e,
            tipoPreparacion: e.producible ? ('en_lote' as const) : ('al_momento' as const),
          }))
      );
    } catch (error) {
      console.error('Error loading adjustment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, page]);

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const stats = useMemo(() => {
    const entradas = ajustes.filter((a) => a.ajuste > 0).length;
    const salidas = ajustes.filter((a) => a.ajuste < 0).length;
    const perdidaTotal = ajustes.reduce((s, a) => s + (a.perdida ?? 0), 0);
    return { entradas, salidas, perdidaTotal };
  }, [ajustes]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Ajustes de Stock"
          subtitle="Registra entradas, mermas y bajas de inventario"
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
            >
              Nuevo Ajuste
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                label="Total registros"
                value={totalCount}
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <StatCard
                label="Entradas"
                value={stats.entradas}
                icon={<TrendingUp className="h-5 w-5" />}
                accent="green"
              />
              <StatCard
                label="Salidas"
                value={stats.salidas}
                icon={<TrendingDown className="h-5 w-5" />}
                accent="red"
              />
              <StatCard
                label="Pérdida total"
                value={formatCurrency(stats.perdidaTotal)}
                icon={<AlertTriangle className="h-5 w-5" />}
                accent={stats.perdidaTotal > 0 ? 'red' : 'default'}
              />
            </>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {!isLoading && ajustes.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-coffee-500">
              <div className="h-16 w-16 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-coffee-300" />
              </div>
              <p className="text-base font-semibold text-coffee-700">Sin ajustes registrados</p>
              <p className="text-sm mt-1 text-coffee-400 text-center max-w-xs">
                Registra la primera entrada o salida de inventario.
              </p>
              <Button
                variant="primary"
                className="mt-5"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsModalOpen(true)}
              >
                Nuevo Ajuste
              </Button>
            </div>
          ) : (
            <>
              {/* ── Mobile: cards ─────────────────────────────────────────── */}
              <div className="sm:hidden divide-y divide-coffee-50">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-lg bg-coffee-100 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-36 bg-coffee-200 rounded" />
                          <div className="h-3 w-24 bg-coffee-100 rounded" />
                        </div>
                        <div className="h-6 w-14 bg-coffee-100 rounded-full" />
                      </div>
                    ))
                  : ajustes.map((ajuste) => {
                      const esEntrada = ajuste.ajuste >= 0;
                      return (
                        <div key={ajuste.id} className="px-4 py-3 flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center text-xs ${TIPO_COLOR[ajuste.tipo] ?? 'bg-coffee-100 text-coffee-600'}`}>
                            {TIPO_ICON[ajuste.tipo] ?? <Package className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-coffee-900 text-sm truncate">{ajuste.nombre}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-coffee-400">{formatFecha(ajuste.fecha)} · {formatHora(ajuste.fecha)}</span>
                              {ajuste.motivo && (
                                <span className="text-xs bg-coffee-100 text-coffee-600 px-1.5 py-0.5 rounded-full">{ajuste.motivo}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-coffee-400 tabular-nums">
                                {ajuste.stockAnterior} <ArrowRight className="h-3 w-3 inline text-coffee-300" /> <span className={ajuste.stockNuevo <= 0 ? 'text-red-600 font-semibold' : 'text-coffee-700 font-semibold'}>{ajuste.stockNuevo}</span>
                              </span>
                              {ajuste.perdida > 0 && (
                                <span className="text-xs font-semibold text-red-500">{formatCurrency(ajuste.perdida)}</span>
                              )}
                            </div>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${esEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {esEntrada ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {esEntrada ? '+' : ''}{ajuste.ajuste}
                          </span>
                        </div>
                      );
                    })}
              </div>

              {/* ── Desktop: tabla ────────────────────────────────────────── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-coffee-100 bg-coffee-50/60">
                      <th className="pl-5 pr-4 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-coffee-500 uppercase tracking-wide">Movimiento</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-coffee-500 uppercase tracking-wide">Stock</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Pérdida</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Motivo</th>
                      <th className="pr-5 pl-4 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-50">
                    {isLoading
                      ? Array.from({ length: 6 }).map((_, i) => <SkeletonAjusteRow key={i} />)
                      : ajustes.map((ajuste) => {
                          const esEntrada = ajuste.ajuste >= 0;
                          return (
                            <tr key={ajuste.id} className="hover:bg-coffee-50/40 transition-colors group">
                              <td className="pl-5 pr-4 py-4 whitespace-nowrap">
                                <p className="font-semibold text-coffee-800">{formatFecha(ajuste.fecha)}</p>
                                <p className="text-xs text-coffee-400 mt-0.5">{formatHora(ajuste.fecha)}</p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-medium text-coffee-900 leading-tight">{ajuste.nombre}</p>
                                {ajuste.nota && (
                                  <p className="text-xs text-coffee-400 mt-0.5 truncate max-w-[200px]">{ajuste.nota}</p>
                                )}
                                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[ajuste.tipo] ?? 'bg-coffee-100 text-coffee-600'}`}>
                                  {TIPO_ICON[ajuste.tipo] ?? <Package className="h-3.5 w-3.5" />}
                                  {ajuste.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${esEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                  {esEntrada ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                  {esEntrada ? '+' : ''}{ajuste.ajuste}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                                  <span className="text-coffee-400">{ajuste.stockAnterior}</span>
                                  <ArrowRight className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                                  <span className={`font-semibold ${ajuste.stockNuevo <= 0 ? 'text-red-600' : 'text-coffee-900'}`}>{ajuste.stockNuevo}</span>
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right tabular-nums">
                                {ajuste.perdida > 0
                                  ? <span className="font-semibold text-red-500">{formatCurrency(ajuste.perdida)}</span>
                                  : <span className="text-coffee-200">—</span>}
                              </td>
                              <td className="px-4 py-4">
                                {ajuste.motivo ? <Badge variant="default">{ajuste.motivo}</Badge> : <span className="text-coffee-200">—</span>}
                              </td>
                              <td className="pr-5 pl-4 py-4 text-xs text-coffee-400 whitespace-nowrap">{ajuste.usuario}</td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <Pagination
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
        />
      </PageContainer>

      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        comprados={comprados}
        insumos={insumos}
        elaborados={elaborados}
      />
    </MainLayout>
  );
};

export default AdjustmentsPage;
