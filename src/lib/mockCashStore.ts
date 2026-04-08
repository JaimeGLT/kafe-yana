/**
 * Estado mock en memoria para el módulo de caja.
 * Compartido entre CashRegisterPage y posMocks (ventas).
 * Se reinicia al refrescar la página — temporal hasta conectar BE.
 */
import type { CashRegister, CashMovement } from '../types';

let _register: CashRegister | null = null;
let _idCounter = 1;
let _movCounter = 1;

export const MOCK_CASH_CATEGORIES = [
  { id: 'cat-1', name: 'Otros ingresos',      type: 'income'  as const, isActive: true },
  { id: 'cat-2', name: 'Gastos operativos',   type: 'expense' as const, isActive: true },
  { id: 'cat-3', name: 'Proveedores',         type: 'expense' as const, isActive: true },
  { id: 'cat-4', name: 'Personal',            type: 'expense' as const, isActive: true },
  { id: 'cat-5', name: 'Mantenimiento',       type: 'expense' as const, isActive: true },
];

export const cashStore = {
  getRegister: (): CashRegister | null => _register,

  openRegister: (openingBalance: number): CashRegister => {
    const code = `CAJA-${String(_idCounter).padStart(3, '0')}`;
    _register = {
      id: `caja-mock-${_idCounter++}`,
      code,
      openedAt: new Date(),
      openingBalance,
      expectedBalance: openingBalance,
      actualBalance: 0,
      difference: 0,
      status: 'open',
      totalSales: 0,
      totalIncome: 0,
      totalExpense: 0,
      movements: [],
      sales: [],
      userId: 'user-mock',
      branchId: 'branch-mock',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return _register;
  },

  closeRegister: () => {
    _register = null;
  },

  addMovement: (mov: Omit<CashMovement, 'id' | 'userId'>): void => {
    if (!_register) return;
    const movement: CashMovement = { ...mov, id: `mov-${_movCounter++}`, userId: 'user-mock' };
    _register.movements.push(movement);
    if (mov.type === 'income') {
      _register.totalIncome += mov.amount;
    } else {
      _register.totalExpense += mov.amount;
    }
    _register.expectedBalance = _register.openingBalance + _register.totalSales + _register.totalIncome - _register.totalExpense;
    _register.updatedAt = new Date();
  },

  /** Llamado desde posMocks cuando se completa una venta */
  recordSale: (sale: { code: string; total: number; customerName?: string; date: Date }): void => {
    if (!_register) return;
    const concept = `Venta ${sale.code}${sale.customerName ? ` · ${sale.customerName}` : ''}`;
    const movement: CashMovement = {
      id: `mov-${_movCounter++}`,
      type: 'income',
      category: 'Venta',
      concept,
      amount: sale.total,
      date: sale.date,
      reference: sale.code,
      userId: 'user-mock',
    };
    _register.movements.push(movement);
    _register.totalSales += sale.total;
    _register.expectedBalance = _register.openingBalance + _register.totalSales + _register.totalIncome - _register.totalExpense;
    _register.updatedAt = new Date();
  },
};
