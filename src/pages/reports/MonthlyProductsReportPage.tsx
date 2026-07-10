import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, RotateCw, Package, Calendar, FileText,
  TrendingUp, AlertCircle,
} from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Skeleton, SkeletonKpiCard } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency } from '../../utils';
import { useMonthlyProductsReport } from '../../hooks/useMonthlyProductsReport';
import { toast } from '../../components/ui';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const tooltipStyle = {
  contentStyle: {
    background: '#FFFBF5',
    border: '1px solid #E8D5C4',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const MonthlyProductsReportPage: React.FC = () => {
  const today = new Date();
  const [mes, setMes] = useState<number>(today.getMonth() + 1);
  const [anio, setAnio] = useState<number>(today.getFullYear());

  const { data, isLoading, error, downloadPdf } = useMonthlyProductsReport(mes, anio);

  const handleExportPdf = async () => {
    try {
      await downloadPdf();
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo descargar el PDF');
    }
  };

  const chartCategoria = useMemo(
    () => data?.porCategoria.map(c => ({
      categoria: c.categoria.length > 14 ? c.categoria.slice(0, 14) + '…' : c.categoria,
      unidades: c.unidadesVendidas,
      ingresos: c.ingresos,
    })) ?? [],
    [data],
  );

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6 mb-6">
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64 gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  const resumen = data?.resumen;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte Mensual de Productos"
          subtitle={`${MONTH_NAMES[mes - 1]} ${anio} — Ventas válidas y observadas`}
          breadcrumbs={[
            { label: 'Reportes', path: '/reports' },
            { label: 'Mensual' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-coffee-500" />
                <select
                  value={mes}
                  onChange={e => setMes(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-coffee-900 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-300"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={anio}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-coffee-200 bg-white text-coffee-900 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-300"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={handleExportPdf}
                disabled={isLoading}
              >
                Exportar PDF
              </Button>
            </div>
          }
        />

        <KPIGrid columns={4}>
          <KPICard
            title="Total facturado"
            value={formatCurrency(resumen?.totalFacturado ?? 0)}
            subtitle="Suma del mes"
            icon={<DollarSign className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Facturas emitidas"
            value={resumen?.numeroFacturas ?? 0}
            subtitle="Válidas + observadas"
            icon={<ShoppingCart className="h-6 w-6" />}
            color="blue"
          />
          <KPICard
            title="Unidades vendidas"
            value={resumen?.unidadesVendidas ?? 0}
            subtitle={`${resumen?.productosDistintos ?? 0} productos distintos`}
            icon={<Package className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Categorías activas"
            value={resumen?.categoriasActivas ?? 0}
            subtitle="Con ventas en el mes"
            icon={<TrendingUp className="h-6 w-6" />}
            color="yellow"
          />
        </KPIGrid>

        <PageSection
          title="Top 10 — Más unidades vendidas"
          description="Productos con mayor rotación en cantidad durante el mes"
        >
          {data && data.topUnidades.length > 0 ? (
            <TablaTop items={data.topUnidades} mostrarRotacion={false} />
          ) : (
            <EmptyMessage texto="Sin ventas en el período seleccionado" />
          )}
        </PageSection>

        <PageSection
          title="Top 10 — Mayor ingreso generado"
          description="Productos que más dinero aportaron al negocio en el mes"
        >
          {data && data.topIngresos.length > 0 ? (
            <TablaTop items={data.topIngresos} mostrarRotacion={false} />
          ) : (
            <EmptyMessage texto="Sin ventas en el período seleccionado" />
          )}
        </PageSection>

        <PageSection
          title="Top 10 — Mayor rotación"
          description="Unidades vendidas / stock promedio — los productos que más rápido rotan"
        >
          {data && data.topRotacion.length > 0 ? (
            <TablaTop items={data.topRotacion} mostrarRotacion />
          ) : (
            <EmptyMessage texto="Sin datos de stock para calcular rotación" />
          )}
        </PageSection>

        <PageSection
          title="Ventas por categoría"
          description="Distribución de unidades e ingresos por categoría en el mes"
        >
          {chartCategoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartCategoria} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `${v}`} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="unidades" name="Unidades" fill="#8B4513" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="ingresos" name="Ingresos (Bs)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyMessage texto="Sin ventas para graficar" />
          )}
        </PageSection>
      </PageContainer>
    </MainLayout>
  );
};

interface TablaTopProps {
  items: Array<{
    idProducto: number;
    nombre: string;
    categoria: string;
    unidadesVendidas: number;
    ingresos: number;
    stockFinMes: number;
    stockPromedio: number;
    rotacion: number;
  }>;
  mostrarRotacion: boolean;
}

const TablaTop: React.FC<TablaTopProps> = ({ items, mostrarRotacion }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-coffee-100">
          <th className="text-left py-3 px-4 font-semibold text-coffee-700 w-12">#</th>
          <th className="text-left py-3 px-4 font-semibold text-coffee-700">Producto</th>
          <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
          <th className="text-right py-3 px-4 font-semibold text-coffee-700">Unidades</th>
          <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ingresos</th>
          {mostrarRotacion && (
            <>
              <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stk. prom.</th>
              <th className="text-right py-3 px-4 font-semibold text-coffee-700">
                <span className="inline-flex items-center gap-1">
                  <RotateCw className="h-4 w-4" /> Rotación
                </span>
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((p, idx) => (
          <tr key={`${p.idProducto}-${idx}`} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
            <td className="py-3 px-4 text-coffee-500 font-medium">{idx + 1}</td>
            <td className="py-3 px-4 font-medium text-coffee-900">{p.nombre}</td>
            <td className="py-3 px-4 text-coffee-700">{p.categoria}</td>
            <td className="py-3 px-4 text-right text-coffee-700">{p.unidadesVendidas}</td>
            <td className="py-3 px-4 text-right font-semibold text-coffee-800">
              {formatCurrency(p.ingresos)}
            </td>
            {mostrarRotacion && (
              <>
                <td className="py-3 px-4 text-right text-coffee-700">{Number(p.stockPromedio).toFixed(1)}</td>
                <td className="py-3 px-4 text-right font-semibold text-coffee-800">
                  {Number(p.rotacion).toFixed(2)}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EmptyMessage: React.FC<{ texto: string }> = ({ texto }) => (
  <div className="flex items-center justify-center h-32 text-coffee-400">
    {texto}
  </div>
);

export default MonthlyProductsReportPage;
