import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign,
  Plus, Minus, Lock, Unlock, Clock, Search, User,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge, Modal } from '../../components/ui';
import { CashMovementModal } from '../../components/modals';
import { useCaja } from '../../hooks/useCaja';
import { formatCurrency, formatDateTime } from '../../utils';
import type { CashMovementInput } from '../../types';

interface CloseRegisterFormState {
  actualBalance: string;
  notes: string;
}

export const CashRegisterPage: React.FC = () => {
  const {
    caja,
    movimientos,
    ultimaSesion,
    loading,
    syncCaja,
    abrirCaja,
    cerrarCaja,
    agregarMovimiento,
  } = useCaja();

  const [search, setSearch] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingError, setOpeningError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income');

  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closeForm, setCloseForm] = useState<CloseRegisterFormState>({ actualBalance: '', notes: '' });
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    syncCaja();
  }, [syncCaja]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      setOpeningError('Ingresa un saldo inicial válido');
      return;
    }
    setIsOpening(true);
    const success = await abrirCaja(balance);
    if (success) {
      setOpeningBalance('');
      setOpeningError('');
    }
    setIsOpening(false);
  };

  const handleSaveMovement = async (input: CashMovementInput) => {
    const success = await agregarMovimiento({
      cantidad: input.amount,
      categoria: input.category,
      concepto: input.concept,
      referencia: input.reference,
      nota: input.notes,
      entrada: input.type === 'income',
    });
    if (success) {
      setIsMovementOpen(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caja) return;
    const balance = parseFloat(closeForm.actualBalance);
    if (isNaN(balance) || balance < 0) return;
    setIsClosing(true);
    const success = await cerrarCaja(balance, closeForm.notes);
    if (success) {
      setIsCloseOpen(false);
    }
    setIsClosing(false);
  };

  const openMovementModal = (type: 'income' | 'expense') => {
    setMovementType(type);
    setIsMovementOpen(true);
  };

  const actualBalance = parseFloat(closeForm.actualBalance);
  const difference = !isNaN(actualBalance) && caja ? actualBalance - caja.saldoEsperado : null;

  const filteredMovements = movimientos
    ? [...movimientos]
        .reverse()
        .filter((m) => {
          const q = search.toLowerCase();
          return (
            !q ||
            m.descripcion.toLowerCase().includes(q) ||
            m.categoria.toLowerCase().includes(q) ||
            (m.referencia || '').toLowerCase().includes(q)
          );
        })
    : [];

  if (loading && !caja && !ultimaSesion) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Caja" subtitle="Control de apertura y cierre de caja" />
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  /* ── Sin caja (nunca hubo sesión) ── */
  if (!caja && !ultimaSesion) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Caja" subtitle="Control de apertura y cierre de caja" />
          <div className="flex items-center justify-center py-20">
            <div className="bg-white rounded-2xl border border-coffee-100 shadow-lg p-8 max-w-sm w-full text-center">
              <div className="h-20 w-20 rounded-full bg-coffee-100 flex items-center justify-center mx-auto mb-5">
                <Wallet className="h-10 w-10 text-coffee-500" />
              </div>
              <h2 className="font-display font-bold text-coffee-900 text-2xl mb-2">Caja Cerrada</h2>
              <p className="text-coffee-500 text-sm mb-6">
                No hay una caja abierta. Ingresa el saldo inicial para comenzar.
              </p>
              <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 font-medium text-sm">S/</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => { setOpeningBalance(e.target.value); setOpeningError(''); }}
                      className="w-full pl-9 pr-4 py-3 border border-coffee-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-400 text-center"
                      placeholder="0.00"
                    />
                  </div>
                  {openingError && <p className="text-xs text-red-500 mt-1">{openingError}</p>}
                </div>
                <Button type="submit" size="lg" className="w-full" isLoading={isOpening} leftIcon={<Unlock className="h-5 w-5" />}>
                  Abrir Caja
                </Button>
              </form>
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  /* ── Caja cerrada (backend retorna null o abierta=false) ── */
  if (!caja || !caja.abierta) {
    const sesion = ultimaSesion;
    const diff = sesion?.diferencia ?? null;
    // El "Saldo Esperado" representa lo que el cajero debe tener FÍSICAMENTE en la caja.
    // Por eso se usa `totalEfectivo` y NO `totalVentas` (que incluye QR + Tarjeta, dinero
    // que no entra a la caja registradora sino que va al banco).
    const saldoEsperado = caja?.saldoEsperado ??
      (sesion ? sesion.saldoInicial + (sesion.totalEfectivo ?? 0) + sesion.totalIngresos - sesion.totalEgresos : 0);

    const diffColor = diff === null ? '' : diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600';
    const diffLabel = diff === null ? '—' : diff === 0 ? 'Sin diferencia' : diff > 0 ? 'Sobrante' : 'Faltante';

    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md">
              {/* Iniciar caja — arriba y prominente */}
              <div className="bg-white rounded-2xl border border-coffee-100 shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-5">
                  <h1 className="text-xl font-display font-bold text-coffee-900">{caja?.nombre ?? 'Caja'}</h1>
                  <Badge variant="danger" dot>Cerrada</Badge>
                </div>
                <form onSubmit={handleOpenRegister} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 mb-1">Saldo Inicial</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 font-medium text-sm">S/</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingBalance}
                        onChange={(e) => { setOpeningBalance(e.target.value); setOpeningError(''); }}
                        className="w-full pl-9 pr-4 py-3 border border-coffee-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        placeholder="0.00"
                      />
                    </div>
                    {openingError && <p className="text-xs text-red-500 mt-1">{openingError}</p>}
                  </div>
                  <Button type="submit" size="lg" className="w-full" isLoading={isOpening} leftIcon={<Unlock className="h-5 w-5" />}>
                    Iniciar Caja
                  </Button>
                </form>
              </div>

              {/* Datos del último cierre */}
              {sesion && (
                <div className="bg-white rounded-xl border border-coffee-100 shadow-sm divide-y divide-coffee-100">
                  {[
                    { label: 'Código',        value: sesion.codigo,                                    mono: true  },
                    { label: 'Abierta por',   value: sesion.abiertaPor                                             },
                    { label: 'Apertura',      value: formatDateTime(new Date(sesion.apertura))                     },
                    { label: 'Cerrada por',   value: sesion.cerradaPor ?? '—'                                      },
                    { label: 'Cierre',        value: sesion.cierre ? formatDateTime(new Date(sesion.cierre)) : '—' },
                    { label: 'Saldo inicial', value: formatCurrency(sesion.saldoInicial)                           },
                    { label: 'Total ventas',  value: formatCurrency(sesion.totalVentas),  color: 'text-blue-600'   },
                    { label: 'Ingresos',      value: formatCurrency(sesion.totalIngresos),color: 'text-green-600'  },
                    { label: 'Egresos',       value: formatCurrency(sesion.totalEgresos), color: 'text-red-600'    },
                    { label: 'Saldo esperado',value: formatCurrency(saldoEsperado),       bold: true               },
                    { label: 'Efectivo',      value: formatCurrency(sesion.totalEfectivo ?? 0)                     },
                    { label: 'Tarjeta',       value: formatCurrency(sesion.totalTarjeta ?? 0)                      },
                    { label: 'QR',            value: formatCurrency(sesion.totalQr ?? 0)                           },
                    ...(diff !== null ? [{
                      label: 'Diferencia',
                      value: `${diff >= 0 ? '+' : ''}${formatCurrency(diff)} (${diffLabel})`,
                      color: diffColor,
                      bold: true,
                    }] : []),
                    ...(sesion.nota ? [{ label: 'Nota', value: sesion.nota }] : []),
                  ].map(({ label, value, mono, color, bold }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-coffee-500">{label}</span>
                      <span className={clsx('text-sm', bold && 'font-bold', mono && 'font-mono', color ?? 'text-coffee-900')}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  /* ── Caja abierta ── */
  return (
    <MainLayout>
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold text-coffee-900">{caja.nombre}</h1>
              <Badge variant="success" dot>Abierta</Badge>
            </div>
            <p className="text-sm text-coffee-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Abierta el {caja.fechaApertura ? formatDateTime(new Date(caja.fechaApertura)) : '-'}
            </p>
            {caja.abiertaPor && (
              <p className="text-sm text-coffee-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Abierta por {caja.abiertaPor}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-green-400 text-green-700 hover:bg-green-50" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openMovementModal('income')}>
              Agregar Ingreso
            </Button>
            <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50" leftIcon={<Minus className="h-4 w-4" />} onClick={() => openMovementModal('expense')}>
              Agregar Egreso
            </Button>
            <Button variant="danger" leftIcon={<Lock className="h-4 w-4" />} onClick={() => { setCloseForm({ actualBalance: String(caja.saldoEsperado.toFixed(2)), notes: '' }); setIsCloseOpen(true); }}>
              Cerrar Caja
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Saldo Inicial',  value: formatCurrency(caja.saldoInicial),     icon: <Wallet className="h-5 w-5 text-coffee-500" />,  bg: 'bg-coffee-100', highlight: false },
            { label: 'Total Ventas',   value: formatCurrency(caja.totalVentas),      icon: <DollarSign className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-100',   highlight: false },
            { label: 'Ingresos',       value: formatCurrency(caja.totalIngresos),    icon: <TrendingUp className="h-5 w-5 text-green-500" />,bg: 'bg-green-100',  highlight: false },
            { label: 'Egresos',        value: formatCurrency(caja.totalEgresos),     icon: <TrendingDown className="h-5 w-5 text-red-500" />,bg: 'bg-red-100',    highlight: false },
            { label: 'Saldo Esperado', value: formatCurrency(caja.saldoEsperado),    icon: <Wallet className="h-5 w-5 text-coffee-700" />,  bg: 'bg-coffee-200', highlight: true  },
          ].map((kpi) => (
            <div key={kpi.label} className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm p-4', kpi.highlight && 'ring-2 ring-coffee-300')}>
              <div className={clsx('h-9 w-9 rounded-lg flex items-center justify-center mb-3', kpi.bg)}>{kpi.icon}</div>
              <p className="text-xs text-coffee-500 mb-0.5">{kpi.label}</p>
              <p className="text-lg font-display font-bold text-coffee-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Desglose de pagos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Efectivo',  value: formatCurrency(caja.totalEfectivo), color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100' },
            { label: 'Tarjeta',   value: formatCurrency(caja.totalTarjeta),  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100'  },
            { label: 'QR',        value: formatCurrency(caja.totalQr),       color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100'},
          ].map((item) => (
            <div key={item.label} className={clsx('rounded-xl border shadow-sm p-4', item.bg, item.border)}>
              <p className={clsx('text-xs font-medium mb-0.5', item.color)}>{item.label}</p>
              <p className={clsx('text-lg font-display font-bold', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Movimientos */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-coffee-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="font-display font-semibold text-coffee-900 flex-shrink-0">Movimientos</h2>
            <div className="relative w-full sm:max-w-xs sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
              <input
                type="text"
                placeholder="Buscar por concepto, categoría o referencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          {/* Cards — móvil */}
          <div className="md:hidden divide-y divide-coffee-100">
            {filteredMovements.length === 0 ? (
              <p className="px-4 py-10 text-center text-coffee-400 text-sm">
                {search ? 'Sin resultados para esa búsqueda' : 'No hay movimientos en esta caja'}
              </p>
            ) : (
              filteredMovements.map((mov) => (
                <div key={mov.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={mov.tipo === 'ingreso' ? 'success' : 'danger'} size="sm">
                        {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                      <span className="text-xs text-coffee-500 truncate">{mov.categoria}</span>
                    </div>
                    <p className="text-sm text-coffee-900 truncate">{mov.descripcion}</p>
                    <p className="text-xs text-coffee-400 mt-0.5">{formatDateTime(new Date(mov.fecha))}</p>
                    {mov.referencia && <p className="text-xs text-coffee-400">{mov.referencia}</p>}
                  </div>
                  <span className={clsx('font-semibold text-sm whitespace-nowrap', mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600')}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Tabla — md+ */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Referencia', 'Monto'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-coffee-400">
                      {search ? 'Sin resultados para esa búsqueda' : 'No hay movimientos en esta caja'}
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-coffee-700">{formatDateTime(new Date(mov.fecha))}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Badge variant={mov.tipo === 'ingreso' ? 'success' : 'danger'} size="sm">
                          {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-coffee-700">{mov.categoria}</td>
                      <td className="px-6 py-3 text-sm text-coffee-900">{mov.descripcion}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-coffee-500">
                        {mov.referencia || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={clsx('font-semibold', mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600')}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* fin tabla md+ */}
        </div>

        <CashMovementModal
          isOpen={isMovementOpen}
          onClose={() => setIsMovementOpen(false)}
          type={movementType}
          categories={[]} 
          onSave={handleSaveMovement}
          onSuccess={() => setIsMovementOpen(false)}
        />

        {/* Modal cierre */}
        <Modal isOpen={isCloseOpen} onClose={() => setIsCloseOpen(false)} title="Cerrar Caja" size="md">
          <form onSubmit={handleCloseRegister} className="space-y-5">
            <div className="bg-coffee-50 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between text-coffee-700">
                <span>Saldo Inicial:</span>
                <span className="font-medium">{formatCurrency(caja.saldoInicial)}</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Ventas:</span>
                <span className="font-medium text-blue-600">+{formatCurrency(caja.totalVentas)}</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Ingresos:</span>
                <span className="font-medium text-green-600">+{formatCurrency(caja.totalIngresos)}</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Egresos:</span>
                <span className="font-medium text-red-600">-{formatCurrency(caja.totalEgresos)}</span>
              </div>
              <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2">
                <span>Saldo Esperado:</span>
                <span>{formatCurrency(caja.saldoEsperado)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                Saldo Real en Caja <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 text-sm font-medium">S/</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closeForm.actualBalance}
                  onChange={(e) => setCloseForm((p) => ({ ...p, actualBalance: e.target.value }))}
                  className="w-full pl-9 pr-4 py-3 border border-coffee-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            {difference !== null && (
              <div className={clsx('rounded-xl p-3 text-sm font-semibold flex justify-between',
                difference === 0 ? 'bg-green-50 text-green-700' : difference > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700',
              )}>
                <span>Diferencia:</span>
                <span>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                  {difference === 0 && ' — Sin diferencia'}
                  {difference > 0 && ' (Sobrante)'}
                  {difference < 0 && ' (Faltante)'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Notas de Cierre</label>
              <textarea
                value={closeForm.notes}
                onChange={(e) => setCloseForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                rows={3}
                placeholder="Observaciones del cierre..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCloseOpen(false)} disabled={isClosing}>Cancelar</Button>
              <Button type="submit" variant="danger" isLoading={isClosing} leftIcon={<Lock className="h-4 w-4" />}>Cerrar Caja</Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </MainLayout>
  );
};