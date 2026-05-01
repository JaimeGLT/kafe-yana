import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Eye, ArrowRightCircle, Trash2, Clock } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Badge, ConfirmModal, Modal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { Quote, Sale } from '../../types';

const quoteStatusConfig: Record<
  Quote['status'],
  { variant: 'warning' | 'success' | 'danger' | 'default'; label: string }
> = {
  pending: { variant: 'warning', label: 'Pendiente' },
  approved: { variant: 'success', label: 'Aprobada' },
  rejected: { variant: 'danger', label: 'Rechazada' },
  expired: { variant: 'default', label: 'Expirada' },
};

export const QuotesPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const data = await api.get<Quote[]>('/quotes');
        setQuotes(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.';
        toast.error('Error', message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  const convertQuoteToSale = useCallback(async (quoteId: string) => {
    try {
      const sale = await api.post<Sale>('/quotes/' + quoteId + '/convert');
      return sale;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo convertir la cotización. Intente nuevamente.';
      toast.error('Error', message);
      return null;
    }
  }, []);

  const deleteQuote = useCallback(async (quoteId: string) => {
    try {
      await api.delete('/quotes/' + quoteId);
      setQuotes(prev => prev.filter((q: Quote) => q.id !== quoteId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la cotización. Intente nuevamente.';
      toast.error('Error', message);
    }
  }, []);

  const handleConvert = async () => {
    if (!convertingQuote) return;
    setIsConverting(true);
    try {
      const sale = await convertQuoteToSale(convertingQuote.id);
      if (sale) {
        toast.success('Cotización convertida', `Se creó la venta ${sale.code} exitosamente.`);
      } else {
        toast.error('Error', 'No se pudo convertir la cotización.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo convertir la cotización.';
      toast.error('Error', message);
    } finally {
      setIsConverting(false);
      setConvertingQuote(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuote) return;
    await deleteQuote(deletingQuote.id);
    toast.success('Cotización eliminada', 'La cotización fue eliminada correctamente.');
    setDeletingQuote(null);
  };

  const isExpired = (quote: Quote): boolean =>
    quote.status === 'pending' && new Date(quote.validUntil) < new Date();

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Cotizaciones"
          subtitle="Gestiona las cotizaciones realizadas a clientes"
        />

        <PageSection>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Código', 'Fecha', 'Válido Hasta', 'Cliente', 'Total', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-coffee-400">
                        <FileText className="h-12 w-12 opacity-30" />
                        <p className="text-base font-medium">No hay cotizaciones registradas</p>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-coffee-400">
                      Cargando...
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote: Quote) => {
                    const effectiveStatus = isExpired(quote) ? 'expired' : quote.status;
                    const statusCfg = quoteStatusConfig[effectiveStatus as Quote['status']] || quoteStatusConfig.pending;

                    return (
                      <tr key={quote.id} className="hover:bg-coffee-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-coffee-600">{quote.code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                          {formatDate(quote.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3.5 w-3.5 text-coffee-400" />
                            <span
                              className={
                                isExpired(quote)
                                  ? 'text-red-600 font-medium'
                                  : 'text-coffee-700'
                              }
                            >
                              {formatDate(quote.validUntil)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-coffee-900">
                          {quote.customerName || 'Cliente General'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-coffee-900">
                            {formatCurrency(quote.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingQuote(quote)}
                              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {quote.status === 'pending' && !isExpired(quote) && (
                              <button
                                onClick={() => setConvertingQuote(quote)}
                                className="p-1.5 rounded-lg hover:bg-green-100 text-green-500 hover:text-green-700"
                                title="Convertir a venta"
                              >
                                <ArrowRightCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingQuote(quote)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* View Detail Modal */}
        {viewingQuote && (
          <Modal
            isOpen={!!viewingQuote}
            onClose={() => setViewingQuote(null)}
            title={`Cotización — ${viewingQuote.code}`}
            size="lg"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500">Fecha</p>
                  <p className="font-medium text-coffee-900">{formatDate(viewingQuote.date)}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Válido Hasta</p>
                  <p
                    className={`font-medium ${
                      isExpired(viewingQuote) ? 'text-red-600' : 'text-coffee-900'
                    }`}
                  >
                    {formatDate(viewingQuote.validUntil)}
                  </p>
                </div>
                <div>
                  <p className="text-coffee-500">Cliente</p>
                  <p className="font-medium text-coffee-900">
                    {viewingQuote.customerName || 'Cliente General'}
                  </p>
                </div>
                <div>
                  <p className="text-coffee-500">Estado</p>
                  <Badge variant={quoteStatusConfig[viewingQuote.status].variant}>
                    {quoteStatusConfig[viewingQuote.status].label}
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
                      {viewingQuote.items.map((item: { id: string; productName?: string; quantity: number; unitPrice: number; total: number }) => (
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
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between text-coffee-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingQuote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-coffee-600">
                    <span>IGV:</span>
                    <span>{formatCurrency(viewingQuote.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(viewingQuote.total)}</span>
                  </div>
                </div>
              </div>

              {viewingQuote.notes && (
                <p className="text-sm text-coffee-600 bg-coffee-50 rounded-lg p-3">
                  {viewingQuote.notes}
                </p>
              )}

              {viewingQuote.status === 'pending' && !isExpired(viewingQuote) && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setViewingQuote(null);
                      setConvertingQuote(viewingQuote);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-coffee-500 text-white text-sm font-medium rounded-lg hover:bg-coffee-600 transition-colors"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    Convertir a Venta
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Convert Confirm */}
        <ConfirmModal
          isOpen={!!convertingQuote}
          onClose={() => setConvertingQuote(null)}
          onConfirm={handleConvert}
          title="Convertir a Venta"
          message={`¿Deseas convertir la cotización "${convertingQuote?.code}" en una venta? Se creará una venta con pago en efectivo por ${formatCurrency(convertingQuote?.total || 0)}.`}
          confirmText="Convertir"
          variant="info"
          isLoading={isConverting}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          isOpen={!!deletingQuote}
          onClose={() => setDeletingQuote(null)}
          onConfirm={handleDelete}
          title="Eliminar Cotización"
          message={`¿Estás seguro de que deseas eliminar la cotización "${deletingQuote?.code}"?`}
          confirmText="Eliminar"
          variant="danger"
        />
      </PageContainer>
    </MainLayout>
  );
};
