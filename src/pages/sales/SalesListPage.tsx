import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Modal, Input, Select, Badge } from '../../components/ui';
import { SalesTable } from '../../components/tables/SalesTable';
import { SaleForm } from '../../components/forms/SaleForm';
import { BillingModal } from '../../components/modals/BillingModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import type { Sale, Customer } from '../../types';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}

export const SalesListPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<SaleStats>({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [billingSaleId, setBillingSaleId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [salesData, customersData, statsData] = await Promise.all([
          api.get<Sale[]>('/ventas'),
          api.get<Customer[]>('/clientes'),
          api.get<SaleStats>('/ventas/stats'),
        ]);
        setSales(salesData);
        setCustomers(customersData);
        setStats(statsData);
      } catch {
        toast.error('Error', 'No se pudieron cargar los datos.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const addSale = useCallback(async (data: Parameters<typeof createSale>[0]) => {
    const newSale = await api.post<Sale>('/ventas', data);
    setSales(prev => [newSale, ...prev]);
    return newSale;
  }, []);

  const generateInvoiceForSale = useCallback(async (saleId: string, billing: { nit: string; name: string }) => {
    const invoice = await api.post(`/ventas/${saleId}/factura`, billing);
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, invoiceId: invoice.id } : s));
    return invoice;
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !sale.code.toLowerCase().includes(q) &&
          !(sale.customerName || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (dateFrom) {
        if (new Date(sale.date) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(sale.date) > to) return false;
      }
      if (statusFilter && sale.status !== statusFilter) return false;
      return true;
    });
  }, [sales, search, dateFrom, dateTo, statusFilter]);

  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales.filter((s) => s.status === 'completed' && new Date(s.date) >= today);
  }, [sales]);

  const handleNewSale = async (data: Parameters<typeof addSale>[0]) => {
    setIsLoading(true);
    try {
      const newSale = await addSale(data);
      toast.success('Venta registrada', 'La venta se registró exitosamente.');
      setIsNewSaleOpen(false);
      setBillingSaleId(newSale.id);
    } catch {
      toast.error('Error', 'No se pudo registrar la venta.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'completed', label: 'Completada' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'refunded', label: 'Reembolsada' },
  ];

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Historial de Ventas"
          subtitle="Gestiona y consulta todas las ventas realizadas"
          actions={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsNewSaleOpen(true)}
            >
              Nueva Venta
            </Button>
          }
        />

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-coffee-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalSalesToday)}
              </p>
              <p className="text-xs text-coffee-400">{todaySales.length} transacciones</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas del Mes</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalSalesMonth)}
              </p>
              <p className="text-xs text-coffee-400">Ticket promedio: {formatCurrency(stats.averageTicket)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy (conteo)</p>
              <p className="text-2xl font-display font-bold text-coffee-900">{todaySales.length}</p>
              <p className="text-xs text-coffee-400">Transacciones completadas</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <SalesTable
            sales={filteredSales}
            onView={(sale) => setSelectedSale(sale)}
          />
        </PageSection>

        {/* New Sale Modal */}
        <Modal
          isOpen={isNewSaleOpen}
          onClose={() => setIsNewSaleOpen(false)}
          title="Nueva Venta"
          size="full"
        >
          <SaleForm
            customers={customers}
            onSubmit={handleNewSale}
            onCancel={() => setIsNewSaleOpen(false)}
            isLoading={isLoading}
          />
        </Modal>

        {/* Billing Modal */}
        <BillingModal
          isOpen={!!billingSaleId}
          saleCode={sales.find((s) => s.id === billingSaleId)?.code}
          onDone={async (billing) => {
            if (billingSaleId) {
              try {
                await generateInvoiceForSale(billingSaleId, billing);
                toast.success('Factura emitida', `Factura a "${billing.name}" (NIT: ${billing.nit}) generada.`);
              } catch {
                toast.error('Error', 'No se pudo generar la factura.');
              }
            }
            setBillingSaleId(null);
          }}
        />

        {/* Sale Detail Modal */}
        {selectedSale && (
          <Modal
            isOpen={!!selectedSale}
            onClose={() => setSelectedSale(null)}
            title={`Detalle de Venta — ${selectedSale.code}`}
            size="lg"
          >
            <div className="space-y-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500">Fecha</p>
                  <p className="font-medium text-coffee-900">{formatDateTime(selectedSale.date)}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Cliente</p>
                  <p className="font-medium text-coffee-900">{selectedSale.customerName || 'Cliente General'}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Cajero</p>
                  <p className="font-medium text-coffee-900">{selectedSale.cashierName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Estado</p>
                  <Badge
                    variant={
                      selectedSale.status === 'completed'
                        ? 'success'
                        : selectedSale.status === 'cancelled'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {selectedSale.status === 'completed'
                      ? 'Completada'
                      : selectedSale.status === 'cancelled'
                      ? 'Cancelada'
                      : selectedSale.status === 'refunded'
                      ? 'Reembolsada'
                      : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-coffee-700 mb-3">Productos</h4>
                <div className="rounded-lg border border-coffee-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-coffee-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-coffee-600 uppercase">Producto</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Precio</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {selectedSale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-coffee-900">{item.productName || 'Producto'}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-right font-medium text-coffee-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-coffee-500">Subtotal:</span>
                    <span className="text-coffee-900">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-coffee-500">IGV (18%):</span>
                    <span className="text-coffee-900">{formatCurrency(selectedSale.tax)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-coffee-200 pt-2">
                    <span className="text-coffee-900">Total:</span>
                    <span className="text-coffee-900">{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-sm font-semibold text-coffee-700 mb-2">Métodos de Pago</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSale.paymentMethods.map((pm) => (
                    <Badge key={pm.id} variant="info">
                      {getPaymentMethodLabel(pm.type)}: {formatCurrency(pm.amount)}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedSale.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-coffee-700 mb-1">Notas</h4>
                  <p className="text-sm text-coffee-600">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </PageContainer>
    </MainLayout>
  );
};
