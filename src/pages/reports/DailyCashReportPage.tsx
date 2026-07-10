import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Wallet, TrendingUp, TrendingDown, Scale, BookOpen,
  Calendar, FileText, Eye, AlertCircle,
} from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input, Badge, Skeleton, SkeletonKpiCard, Modal } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency, formatFechaHoraBolivia } from '../../utils';
import { useDailyCashReport, type CajaDelDia } from '../../hooks/useDailyCashReport';
import { toast } from '../../components/ui';

const DailyCashReportPage: React.FC = () => {
  const today = new Date();
  const [fecha, setFecha] = useState<string>(format(today, 'yyyy-MM-dd'));
  const [selectedCaja, setSelectedCaja] = useState<CajaDelDia | null>(null);
  const { data, isLoading, error, downloadPdf } = useDailyCashReport(fecha);

  const handleExportPdf = async () => {
    try {
      await downloadPdf();
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo descargar el PDF');
    }
  };

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
              <Skeleton className="h-9 w-40 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
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
  const cajas = data?.cajas ?? [];
  const fechaLabel = data?.fecha
    ? format(parseISO(data.fecha), "EEEE, d 'de' MMMM yyyy", { locale: es })
    : '';

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte Diario de Caja"
          subtitle={`Sesiones iniciadas en ${fechaLabel}`}
          breadcrumbs={[
            { label: 'Reportes', path: '/reports' },
            { label: 'Diario' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-coffee-500" />
                <Input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-44"
                  max={format(today, 'yyyy-MM-dd')}
                />
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
            title="Cajas iniciadas"
            value={resumen?.cajasIniciadas ?? 0}
            subtitle={`${resumen?.cajasCerradas ?? 0} cerradas, ${resumen?.hayCajaAbierta ? '1 abierta' : '0 abiertas'}`}
            icon={<BookOpen className="h-6 w-6" />}
            color="blue"
          />
          <KPICard
            title="Ventas del día"
            value={formatCurrency(resumen?.totalVentas ?? 0)}
            subtitle={`Efectivo ${formatCurrency(resumen?.totalEfectivo ?? 0)}`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Ingresos"
            value={formatCurrency(resumen?.totalIngresos ?? 0)}
            subtitle="Entradas manuales"
            icon={<Wallet className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Egresos"
            value={formatCurrency(resumen?.totalEgresos ?? 0)}
            subtitle={`Balance neto ${formatCurrency(resumen?.balanceNeto ?? 0)}`}
            icon={parseFloat(String(resumen?.balanceNeto ?? 0)) >= 0
              ? <Scale className="h-6 w-6" />
              : <TrendingDown className="h-6 w-6" />}
            color={parseFloat(String(resumen?.balanceNeto ?? 0)) >= 0 ? 'green' : 'red'}
          />
        </KPIGrid>

        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-coffee-50 p-3">
              <span className="text-coffee-500">Saldo inicial total</span>
              <p className="font-semibold text-coffee-900 mt-1">
                {formatCurrency(resumen.saldoInicialTotal)}
              </p>
            </div>
            <div className="rounded-lg bg-coffee-50 p-3">
              <span className="text-coffee-500">Efectivo</span>
              <p className="font-semibold text-coffee-900 mt-1">
                {formatCurrency(resumen.totalEfectivo)}
              </p>
            </div>
            <div className="rounded-lg bg-coffee-50 p-3">
              <span className="text-coffee-500">Tarjeta</span>
              <p className="font-semibold text-coffee-900 mt-1">
                {formatCurrency(resumen.totalTarjeta)}
              </p>
            </div>
            <div className="rounded-lg bg-coffee-50 p-3">
              <span className="text-coffee-500">QR</span>
              <p className="font-semibold text-coffee-900 mt-1">
                {formatCurrency(resumen.totalQr)}
              </p>
            </div>
          </div>
        )}

        <PageSection
          title={`Sesiones del día (${cajas.length})`}
          description="Cajas iniciadas en la fecha seleccionada, incluyendo la activa si su apertura cae en este día."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Apertura</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Cierre</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">S. Inicial</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ventas</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ingresos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Egresos</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {cajas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-coffee-400">
                      No hay sesiones iniciadas en esta fecha
                    </td>
                  </tr>
                ) : (
                  cajas.map(c => (
                    <tr key={c.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-coffee-700">{c.codigo}</td>
                      <td className="py-3 px-4 text-coffee-700">
                        {formatFechaHoraBolivia(c.apertura)}
                        <div className="text-xs text-coffee-400">{c.abiertaPor}</div>
                      </td>
                      <td className="py-3 px-4 text-coffee-700">
                        {c.cierre ? (
                          <>
                            {formatFechaHoraBolivia(c.cierre)}
                            <div className="text-xs text-coffee-400">{c.cerradaPor ?? '—'}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-700">
                        {formatCurrency(c.saldoInicial)}
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-900 font-semibold">
                        {formatCurrency(c.totalVentas)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-700">
                        {formatCurrency(c.totalIngresos)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-700">
                        {formatCurrency(c.totalEgresos)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.abiertaActualmente ? (
                          <Badge variant="danger" size="sm">ABIERTA</Badge>
                        ) : (
                          <Badge variant="success" size="sm">{c.estado || 'CERRADA'}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedCaja(c)}
                          className="text-coffee-400 hover:text-coffee-700 transition-colors"
                          title="Ver movimientos"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>
      </PageContainer>

      {/* Modal movimientos */}
      <Modal
        isOpen={!!selectedCaja}
        onClose={() => setSelectedCaja(null)}
        title={selectedCaja ? `Movimientos — ${selectedCaja.codigo}` : ''}
        size="lg"
      >
        {selectedCaja && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Ventas', value: formatCurrency(selectedCaja.totalVentas), color: 'text-blue-600' },
                { label: 'Ingresos', value: formatCurrency(selectedCaja.totalIngresos), color: 'text-green-600' },
                { label: 'Egresos', value: formatCurrency(selectedCaja.totalEgresos), color: 'text-red-600' },
                {
                  label: 'Diferencia',
                  value: `${selectedCaja.diferencia >= 0 ? '+' : ''}${formatCurrency(selectedCaja.diferencia)}`,
                  color: selectedCaja.diferencia === 0 ? 'text-green-600' : selectedCaja.diferencia > 0 ? 'text-blue-600' : 'text-red-600',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-coffee-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-coffee-500 mb-0.5">{label}</p>
                  <p className={`text-sm font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {selectedCaja.movimientos.length === 0 ? (
              <p className="text-sm text-coffee-400 text-center py-6">
                Sin movimientos en esta sesión
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-100 text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-coffee-500">Hora</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-coffee-500">Tipo</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-coffee-500">Categoría</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-coffee-500">Descripción</th>
                    <th className="pb-2 text-right text-xs font-medium text-coffee-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCaja.movimientos.map(m => {
                    const esIngreso = m.monto >= 0;
                    return (
                      <tr key={m.id} className="border-b border-coffee-50 last:border-0">
                        <td className="py-2.5 pr-4 text-coffee-600">
                          {formatFechaHoraBolivia(m.fecha)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={esIngreso ? 'success' : 'danger'} size="sm">
                            {m.tipo}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-coffee-700">{m.categoria}</td>
                        <td className="py-2.5 pr-4 text-coffee-900">{m.descripcion}</td>
                        <td className={`py-2.5 text-right font-semibold ${esIngreso ? 'text-green-600' : 'text-red-600'}`}>
                          {esIngreso ? '+' : '-'}{formatCurrency(Math.abs(m.monto))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};

export default DailyCashReportPage;
