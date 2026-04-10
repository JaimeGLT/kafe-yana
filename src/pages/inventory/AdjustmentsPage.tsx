import React, { useState, useCallback, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button } from '../../components/ui';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { gql } from '../../lib/graphql';
import { GET_COMPRADOS_AJUSTES, GET_INSUMOS_AJUSTES, GET_ELABORADOS_AJUSTES } from '../../lib/queries/ajustes.queries';
import type { CompradoNode, InsumoNode, ElaboradoAjusteNode, CompradosResponse, InsumosResponse, ElaboradosAjusteResponse } from '../../types/graphql';

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
        (elaboradosData.elaborados ?? []).filter((e) => e.receta !== null)
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
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-coffee-500">
              <ClipboardList className="h-12 w-12 mb-3 text-coffee-300" />
              <p className="text-lg font-medium">No hay ajustes registrados</p>
              <p className="text-sm mt-1 text-center max-w-xs">
                El historial de ajustes estará disponible cuando el backend exponga el endpoint.
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
