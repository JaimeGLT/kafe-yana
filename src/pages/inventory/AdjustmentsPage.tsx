import React, { useState, useCallback, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Package, FlaskConical, ChefHat, ClipboardList } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge } from '../../components/ui';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { gql } from '../../lib/graphql';
import { GET_AJUSTES, GET_COMPRADOS_AJUSTES, GET_INSUMOS_AJUSTES, GET_ELABORADOS_AJUSTES } from '../../lib/queries/ajustes.queries';
import { formatCurrency } from '../../utils';
import type {
  AjusteNode,
  AjustesResponse,
  CompradoNode,
  InsumoNode,
  ElaboradoAjusteNode,
  CompradosResponse,
  InsumosResponse,
  ElaboradosAjusteResponse,
} from '../../types/graphql';

const TIPO_ICON: Record<string, React.ReactNode> = {
  Comprado: <Package className="h-4 w-4" />,
  Insumo: <FlaskConical className="h-4 w-4" />,
  Elaborado: <ChefHat className="h-4 w-4" />,
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AdjustmentsPage: React.FC = () => {
  const [ajustes, setAjustes] = useState<AjusteNode[]>([]);
  const [comprados, setComprados] = useState<CompradoNode[]>([]);
  const [insumos, setInsumos] = useState<InsumoNode[]>([]);
  const [elaborados, setElaborados] = useState<ElaboradoAjusteNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ajustesData, compradosData, insumosData, elaboradosData] = await Promise.all([
        gql<AjustesResponse>(GET_AJUSTES),
        gql<CompradosResponse>(GET_COMPRADOS_AJUSTES),
        gql<InsumosResponse>(GET_INSUMOS_AJUSTES),
        gql<ElaboradosAjusteResponse>(GET_ELABORADOS_AJUSTES),
      ]);

      setAjustes(ajustesData.ajustes?.nodes ?? []);
      setComprados(compradosData.comprados?.nodes ?? []);
      setInsumos(insumosData.insumos?.nodes ?? []);
      setElaborados(
        (elaboradosData.elaborados?.nodes ?? [])
          .filter((e) => e.receta !== null)
          .map((e) => ({
            ...e,
            tipoPreparacion: e.producible ? ('en_lote' as const) : ('al_momento' as const),
          })),
      );
    } catch (error) {
      console.error('Error loading adjustment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
              <div className="animate-spin h-8 w-8 border-2 border-coffee-300 border-t-coffee-600 rounded-full mb-3" />
              <p className="text-sm">Cargando ajustes...</p>
            </div>
          ) : ajustes.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
              <ClipboardList className="h-12 w-12 mb-3 text-coffee-300" />
              <p className="text-lg font-medium">No hay ajustes registrados</p>
              <p className="text-sm mt-1 text-center max-w-xs">
                Registra la primera entrada o salida de inventario.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsModalOpen(true)}
              >
                Nuevo Ajuste
              </Button>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-coffee-50 border-b border-coffee-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Producto / Insumo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Ajuste
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Stock anterior
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Stock nuevo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Pérdida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {ajustes.map((ajuste) => {
                  const esEntrada = ajuste.ajuste >= 0;
                  return (
                    <tr key={ajuste.id} className="hover:bg-coffee-50/50 transition-colors">
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-coffee-900">{formatFecha(ajuste.fecha)}</p>
                        <p className="text-xs text-coffee-400">{formatHora(ajuste.fecha)}</p>
                      </td>

                      {/* Nombre */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-coffee-900">{ajuste.nombre}</p>
                        {ajuste.nota && (
                          <p className="text-xs text-coffee-400 truncate max-w-[180px]">{ajuste.nota}</p>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-coffee-100 text-coffee-700 text-xs font-medium">
                          {TIPO_ICON[ajuste.tipo] ?? <Package className="h-4 w-4" />}
                          {ajuste.tipo}
                        </span>
                      </td>

                      {/* Dirección + cantidad */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            esEntrada ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {esEntrada ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {esEntrada ? '+' : ''}
                          {ajuste.ajuste}
                        </span>
                      </td>

                      {/* Stock anterior */}
                      <td className="px-4 py-3 text-right text-coffee-600 tabular-nums">
                        {ajuste.stockAnterior}
                      </td>

                      {/* Stock nuevo */}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <span className={ajuste.stockNuevo <= 0 ? 'text-red-600' : 'text-coffee-900'}>
                          {ajuste.stockNuevo}
                        </span>
                      </td>

                      {/* Pérdida */}
                      <td className="px-4 py-3 text-right tabular-nums">
                        {ajuste.perdida > 0 ? (
                          <span className="font-semibold text-red-600">
                            {formatCurrency(ajuste.perdida)}
                          </span>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>

                      {/* Motivo */}
                      <td className="px-4 py-3">
                        {ajuste.motivo ? (
                          <Badge variant="default">{ajuste.motivo}</Badge>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3 text-coffee-600 text-xs whitespace-nowrap">
                        {ajuste.usuario}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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
