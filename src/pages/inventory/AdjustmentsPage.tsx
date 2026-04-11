import React, { useState, useCallback, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Package, FlaskConical, ChefHat, ClipboardList } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge } from '../../components/ui';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { gql } from '../../lib/graphql';
import { GET_COMPRADOS_AJUSTES, GET_INSUMOS_AJUSTES, GET_ELABORADOS_AJUSTES } from '../../lib/queries/ajustes.queries';
import { formatCurrency } from '../../utils';
import type { CompradoNode, InsumoNode, ElaboradoAjusteNode, CompradosResponse, InsumosResponse, ElaboradosAjusteResponse } from '../../types/graphql';

// — Tipos mock (se reemplazarán por los del backend) —
interface AjusteRecord {
  id: number;
  tipo_producto: 'comprado' | 'insumo' | 'elaborado';
  nombre: string;
  direccion: 'entrada' | 'salida';
  cantidad_ajuste: number;
  unidad: string;
  stock_anterior: number;
  stock_nuevo: number;
  perdida_estimada: number;
  motivo: string;
  notas: string;
  usuario: string;
  fecha: Date;
}

const MOCK_AJUSTES: AjusteRecord[] = [
  {
    id: 1,
    tipo_producto: 'insumo',
    nombre: 'Leche entera',
    direccion: 'salida',
    cantidad_ajuste: 2000,
    unidad: 'ml',
    stock_anterior: 8500,
    stock_nuevo: 6500,
    perdida_estimada: 12.4,
    motivo: 'Derrame',
    notas: 'Se cayó el envase durante la limpieza.',
    usuario: 'María G.',
    fecha: new Date('2026-04-11T10:23:00'),
  },
  {
    id: 2,
    tipo_producto: 'comprado',
    nombre: 'Café en grano Arábica',
    direccion: 'entrada',
    cantidad_ajuste: 5,
    unidad: 'kg',
    stock_anterior: 3,
    stock_nuevo: 8,
    perdida_estimada: 0,
    motivo: 'Reposición',
    notas: '',
    usuario: 'Carlos T.',
    fecha: new Date('2026-04-11T08:05:00'),
  },
];

const TIPO_ICON: Record<AjusteRecord['tipo_producto'], React.ReactNode> = {
  comprado: <Package className="h-4 w-4" />,
  insumo: <FlaskConical className="h-4 w-4" />,
  elaborado: <ChefHat className="h-4 w-4" />,
};

const TIPO_LABEL: Record<AjusteRecord['tipo_producto'], string> = {
  comprado: 'Comprado',
  insumo: 'Insumo',
  elaborado: 'Elaborado',
};

function formatHora(date: Date): string {
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AdjustmentsPage: React.FC = () => {
  const [comprados, setComprados] = useState<CompradoNode[]>([]);
  const [insumos, setInsumos] = useState<InsumoNode[]>([]);
  const [elaborados, setElaborados] = useState<ElaboradoAjusteNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [compradosData, insumosData, elaboradosData] = await Promise.all([
        gql<CompradosResponse>(GET_COMPRADOS_AJUSTES),
        gql<InsumosResponse>(GET_INSUMOS_AJUSTES),
        gql<ElaboradosAjusteResponse>(GET_ELABORADOS_AJUSTES),
      ]);
      setComprados(compradosData.comprados?.nodes ?? []);
      setInsumos(insumosData.insumos?.nodes ?? []);
      setElaborados(
        (elaboradosData.elaborados?.nodes ?? []).filter((e) => e.receta !== null)
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
              <p className="text-sm">Cargando inventario...</p>
            </div>
          ) : MOCK_AJUSTES.length === 0 ? (
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
                {MOCK_AJUSTES.map((ajuste) => (
                  <tr key={ajuste.id} className="hover:bg-coffee-50/50 transition-colors">
                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-coffee-900">{formatFecha(ajuste.fecha)}</p>
                      <p className="text-xs text-coffee-400">{formatHora(ajuste.fecha)}</p>
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-coffee-900">{ajuste.nombre}</p>
                      {ajuste.notas && (
                        <p className="text-xs text-coffee-400 truncate max-w-[180px]">{ajuste.notas}</p>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-coffee-100 text-coffee-700 text-xs font-medium">
                        {TIPO_ICON[ajuste.tipo_producto]}
                        {TIPO_LABEL[ajuste.tipo_producto]}
                      </span>
                    </td>

                    {/* Dirección + cantidad */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ajuste.direccion === 'entrada'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {ajuste.direccion === 'entrada' ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {ajuste.direccion === 'entrada' ? '+' : '-'}
                        {ajuste.cantidad_ajuste} {ajuste.unidad}
                      </span>
                    </td>

                    {/* Stock anterior */}
                    <td className="px-4 py-3 text-right text-coffee-600 tabular-nums">
                      {ajuste.stock_anterior} {ajuste.unidad}
                    </td>

                    {/* Stock nuevo */}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      <span className={ajuste.stock_nuevo <= 0 ? 'text-red-600' : 'text-coffee-900'}>
                        {ajuste.stock_nuevo} {ajuste.unidad}
                      </span>
                    </td>

                    {/* Pérdida */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {ajuste.perdida_estimada > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(ajuste.perdida_estimada)}
                        </span>
                      ) : (
                        <span className="text-coffee-300">—</span>
                      )}
                    </td>

                    {/* Motivo */}
                    <td className="px-4 py-3">
                      <Badge variant="default">{ajuste.motivo}</Badge>
                    </td>

                    {/* Usuario */}
                    <td className="px-4 py-3 text-coffee-600 text-xs whitespace-nowrap">
                      {ajuste.usuario}
                    </td>
                  </tr>
                ))}
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
