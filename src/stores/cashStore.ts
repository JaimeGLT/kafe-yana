import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CashRegister,
  CashRegisterInput,
  CashRegisterCloseInput,
  CashMovement,
  CashMovementInput,
  CashCategory,
  CashStats,
  CashSummary,
} from '../types';

interface CashState {
  cashRegisters: CashRegister[];
  movements: CashMovement[];
  categories: CashCategory[];
  currentRegister: CashRegister | null;
  stats: CashStats;

  // Cash Register actions
  openCashRegister: (input: CashRegisterInput) => CashRegister;
  closeCashRegister: (id: string, input: CashRegisterCloseInput) => void;
  getCurrentRegister: () => CashRegister | null;

  // Movement actions
  addMovement: (input: CashMovementInput) => void;

  // Category actions
  addCategory: (category: Omit<CashCategory, 'id'>) => CashCategory;
  updateCategory: (id: string, input: Partial<CashCategory>) => void;
  deleteCategory: (id: string) => void;

  // Stats
  calculateStats: () => void;
  getSummary: (registerId: string) => CashSummary | null;
}

const generateCode = (prefix: string, num: number): string => {
  return `${prefix}${String(num).padStart(6, '0')}`;
};

const defaultCategories: CashCategory[] = [
  { id: '1', name: 'Ventas', type: 'income', description: 'Ingresos por ventas', isActive: true },
  { id: '2', name: 'Otros Ingresos', type: 'income', description: 'Otros ingresos de efectivo', isActive: true },
  { id: '3', name: 'Compra de Inventario', type: 'expense', description: 'Pagos a proveedores', isActive: true },
  { id: '4', name: 'Gastos Operativos', type: 'expense', description: 'Gastos de operación', isActive: true },
  { id: '5', name: 'Pagos de Servicios', type: 'expense', description: 'Electricidad, agua, internet', isActive: true },
  { id: '6', name: 'Nómina', type: 'expense', description: 'Pagos de sueldos', isActive: true },
  { id: '7', name: 'Otros Gastos', type: 'expense', description: 'Otros gastos de efectivo', isActive: true },
];

export const useCashStore = create<CashState>((set, get) => ({
  cashRegisters: [],
  movements: [],
  categories: defaultCategories,
  currentRegister: null,
  stats: {
    cashInRegisters: 0,
    todaySales: 0,
    todayIncome: 0,
    todayExpense: 0,
    openRegisters: 0,
  },

  // Cash Register actions
  openCashRegister: (input) => {
    const state = get();

    // Check if there's already an open register
    const openRegister = state.cashRegisters.find(r => r.status === 'open');
    if (openRegister) {
      throw new Error('Ya existe una caja abierta');
    }

    const registerCode = generateCode('CAJA', state.cashRegisters.length + 1);
    const now = new Date();

    const newRegister: CashRegister = {
      id: uuidv4(),
      code: registerCode,
      openedAt: now,
      openingBalance: input.openingBalance,
      expectedBalance: input.openingBalance,
      status: 'open',
      movements: [],
      sales: [],
      totalSales: 0,
      totalIncome: 0,
      totalExpense: 0,
      userId: 'current-user',
      userName: 'Usuario Actual',
      branchId: 'main-branch',
      branchName: 'Sucursal Principal',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      cashRegisters: [...state.cashRegisters, newRegister],
      currentRegister: newRegister,
    }));

    get().calculateStats();
    return newRegister;
  },

  closeCashRegister: (id, input) => {
    const state = get();
    const register = state.cashRegisters.find(r => r.id === id);
    if (!register) return;

    const closedRegister: CashRegister = {
      ...register,
      closedAt: new Date(),
      actualBalance: input.actualBalance,
      difference: input.actualBalance - register.expectedBalance,
      status: 'closed',
      updatedAt: new Date(),
    };

    set((state) => ({
      cashRegisters: state.cashRegisters.map((r) =>
        r.id === id ? closedRegister : r
      ),
      currentRegister: null,
    }));

    get().calculateStats();
  },

  getCurrentRegister: () => {
    const state = get();
    if (state.currentRegister) return state.currentRegister;

    // Find open register
    const openRegister = state.cashRegisters.find(r => r.status === 'open');
    if (openRegister) {
      set({ currentRegister: openRegister });
      return openRegister;
    }

    return null;
  },

  // Movement actions
  addMovement: (input) => {
    const state = get();
    const register = state.currentRegister;

    if (!register || register.status !== 'open') {
      throw new Error('No hay una caja abierta');
    }

    const movement: CashMovement = {
      id: uuidv4(),
      type: input.type,
      category: input.category,
      concept: input.concept,
      amount: input.amount,
      date: input.date || new Date(),
      reference: input.reference,
      notes: input.notes,
      userId: 'current-user',
      userName: 'Usuario Actual',
    };

    const totalIncome = input.type === 'income'
      ? register.totalIncome + input.amount
      : register.totalIncome;
    const totalExpense = input.type === 'expense'
      ? register.totalExpense + input.amount
      : register.totalExpense;

    const updatedRegister: CashRegister = {
      ...register,
      movements: [...register.movements, movement],
      totalIncome,
      totalExpense,
      expectedBalance: register.openingBalance + totalIncome - totalExpense,
      updatedAt: new Date(),
    };

    set((state) => ({
      movements: [...state.movements, movement],
      cashRegisters: state.cashRegisters.map((r) =>
        r.id === register.id ? updatedRegister : r
      ),
      currentRegister: updatedRegister,
    }));

    get().calculateStats();
  },

  // Category actions
  addCategory: (category) => {
    const newCategory: CashCategory = {
      id: uuidv4(),
      ...category,
    };

    set((state) => ({
      categories: [...state.categories, newCategory],
    }));

    return newCategory;
  },

  updateCategory: (id, input) => {
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...input } : cat
      ),
    }));
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    }));
  },

  // Stats
  calculateStats: () => {
    const state = get();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const openRegisters = state.cashRegisters.filter(r => r.status === 'open');
    const cashInRegisters = openRegisters.reduce((sum, r) => sum + r.expectedBalance, 0);

    const todayMovements = state.movements.filter(m =>
      new Date(m.date) >= today
    );
    const todayIncome = todayMovements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);
    const todayExpense = todayMovements
      .filter(m => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);

    // Today's sales from registers
    const todaySales = openRegisters
      .filter(r => new Date(r.openedAt) >= today)
      .reduce((sum, r) => sum + r.totalSales, 0);

    set({
      stats: {
        cashInRegisters,
        todaySales,
        todayIncome,
        todayExpense,
        openRegisters: openRegisters.length,
      },
    });
  },

  getSummary: (registerId) => {
    const register = get().cashRegisters.find(r => r.id === registerId);
    if (!register) return null;

    return {
      openingBalance: register.openingBalance,
      totalSales: register.totalSales,
      totalIncome: register.totalIncome,
      totalExpense: register.totalExpense,
      expectedBalance: register.expectedBalance,
    };
  },
}));