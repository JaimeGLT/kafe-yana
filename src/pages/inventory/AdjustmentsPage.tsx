import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Eye, ClipboardList } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge, Modal } from '../../components/ui';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { useInventoryStore } from '../../stores';
import type { StockAdjustment } from '../../types';
import { formatDateTime } from '../../utils';

const AdjustmentsPage: React.FC = () => {
  const { stockAdjustments, products } = useInventoryStore();

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [viewingAdjustment, setViewingAdjustment] = useState<StockAdjustment | null>(null);

  const sortedAdjustments = useMemo(() => {
    return [...stockAdjustments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [stockAdjustments]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Ajustes de Stock"
          subtitle={`${stockAdjustments.length} ajuste(s) registrado(s)`}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsAdjustmentModalOpen(true)}
            >
              Nuevo Ajuste
            </Button>
          }
        />

        {/* Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {sortedAdjustments.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
              <ClipboardList className="h-12 w-12 mb-3 text-coffee-300" />
              <p className="text-lg font-medium">No hay ajustes registrados</p>
              <p className="text-sm mt-1">Crea el primer ajuste de stock para comenzar.</p>
              <Button
                variant="primary"
                className="mt-4"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsAdjustmentModalOpen(true)}
              >
                Nuevo Ajuste
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-coffee-200">
                <thead className="bg-coffee-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Ítems
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-coffee-100">
                  {sortedAdjustments.map((adjustment) => (
                    <tr
                      key={adjustment.id}
                      className="hover:bg-coffee-50 transition-colors cursor-pointer"
                      onClick={() => setViewingAdjustment(adjustment)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-coffee-600">
                          {adjustment.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-coffee-700">
                          {formatDateTime(adjustment.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {adjustment.type === 'positive' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Salida
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-coffee-700">{adjustment.reason}</span>
                        {adjustment.notes && (
                          <p className="text-xs text-coffee-400 mt-0.5 truncate max-w-xs">
                            {adjustment.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="default" size="sm">
                          {adjustment.items.length}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-coffee-600">
                          {adjustment.userName || adjustment.userId}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingAdjustment(adjustment);
                          }}
                          className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => {}}
        products={products}
      />

      {/* Detail View Modal */}
      {viewingAdjustment && (
        <Modal
          isOpen={!!viewingAdjustment}
          onClose={() => setViewingAdjustment(null)}
          title={`Detalle de Ajuste — ${viewingAdjustment.code}`}
          size="lg"
        >
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-coffee-100">
            <div>
              <p className="text-xs text-coffee-500 mb-0.5">Fecha</p>
              <p className="text-sm font-medium text-coffee-800">
                {formatDateTime(viewingAdjustment.date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-coffee-500 mb-0.5">Tipo</p>
              {viewingAdjustment.type === 'positive' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Entrada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Salida
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-coffee-500 mb-0.5">Motivo</p>
              <p className="text-sm font-medium text-coffee-800">{viewingAdjustment.reason}</p>
            </div>
            <div>
              <p className="text-xs text-coffee-500 mb-0.5">Usuario</p>
              <p className="text-sm font-medium text-coffee-800">
                {viewingAdjustment.userName || viewingAdjustment.userId}
              </p>
            </div>
            {viewingAdjustment.notes && (
              <div className="col-span-2">
                <p className="text-xs text-coffee-500 mb-0.5">Observaciones</p>
                <p className="text-sm text-coffee-700">{viewingAdjustment.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <h4 className="text-sm font-semibold text-coffee-800 mb-3">
            Productos ajustados ({viewingAdjustment.items.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200 text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-coffee-600 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">
                    Stock Anterior
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">
                    Ajuste
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">
                    Stock Nuevo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {viewingAdjustment.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-coffee-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-coffee-900">{item.productName}</p>
                      {item.reason && (
                        <p className="text-xs text-coffee-500">{item.reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-coffee-600">
                      {item.previousStock}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          item.adjustment > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
                        }
                      >
                        {item.adjustment > 0 ? '+' : ''}
                        {item.adjustment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-coffee-900">
                      {item.newStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setViewingAdjustment(null)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
};

export default AdjustmentsPage;
