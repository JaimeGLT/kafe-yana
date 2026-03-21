import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Supplier,
  SupplierInput,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderInput,
  AccountsPayable,
  PayablePaymentInput,
  PurchasesStats,
} from '../types';

interface PurchasesState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  accountsPayable: AccountsPayable[];
  stats: PurchasesStats;

  // Supplier actions
  addSupplier: (input: SupplierInput) => Supplier;
  updateSupplier: (id: string, input: Partial<SupplierInput>) => void;
  deleteSupplier: (id: string) => void;
  getSupplier: (id: string) => Supplier | undefined;

  // Purchase Order actions
  addPurchaseOrder: (input: PurchaseOrderInput) => PurchaseOrder;
  updatePurchaseOrder: (id: string, input: Partial<PurchaseOrderInput>) => void;
  approvePurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (id: string, receivedItems: { productId: string; quantity: number }[]) => void;
  cancelPurchaseOrder: (id: string) => void;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;

  // Accounts Payable actions
  addPayablePayment: (input: PayablePaymentInput) => void;

  // Stats
  calculateStats: () => void;
}

const generateCode = (prefix: string, num: number): string => {
  return `${prefix}${String(num).padStart(8, '0')}`;
};

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  suppliers: [],
  purchaseOrders: [],
  accountsPayable: [],
  stats: {
    totalPurchasesMonth: 0,
    pendingOrders: 0,
    pendingPayments: 0,
    totalSuppliers: 0,
  },

  // Supplier actions
  addSupplier: (input) => {
    const state = get();
    const newSupplier: Supplier = {
      id: uuidv4(),
      code: generateCode('PROV', state.suppliers.length + 1),
      name: input.name,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      ruc: input.ruc,
      website: input.website,
      notes: input.notes,
      paymentTerms: input.paymentTerms,
      creditLimit: input.creditLimit,
      currentDebt: 0,
      totalPurchases: 0,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      suppliers: [...state.suppliers, newSupplier],
    }));

    get().calculateStats();
    return newSupplier;
  },

  updateSupplier: (id, input) => {
    set((state) => ({
      suppliers: state.suppliers.map((supplier) =>
        supplier.id === id
          ? { ...supplier, ...input, updatedAt: new Date() }
          : supplier
      ),
    }));
  },

  deleteSupplier: (id) => {
    set((state) => ({
      suppliers: state.suppliers.filter((supplier) => supplier.id !== id),
    }));
    get().calculateStats();
  },

  getSupplier: (id) => {
    return get().suppliers.find((supplier) => supplier.id === id);
  },

  // Purchase Order actions
  addPurchaseOrder: (input) => {
    const state = get();
    const orderCode = generateCode('OC', state.purchaseOrders.length + 1);
    const now = new Date();

    const items: PurchaseOrderItem[] = input.items.map(item => ({
      id: uuidv4(),
      productId: item.productId,
      productName: '',
      productCode: '',
      quantity: item.quantity,
      unit: 'unidad',
      unitCost: item.unitCost,
      subtotal: item.quantity * item.unitCost,
      receivedQuantity: 0,
      pendingQuantity: item.quantity,
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * (input.taxPercentage || 18) / 100;
    const total = subtotal + tax;

    const newOrder: PurchaseOrder = {
      id: uuidv4(),
      code: orderCode,
      date: now,
      expectedDate: input.expectedDate,
      supplierId: input.supplierId,
      supplierName: state.suppliers.find(s => s.id === input.supplierId)?.name,
      items,
      subtotal,
      tax,
      taxPercentage: input.taxPercentage || 18,
      total,
      status: 'draft',
      notes: input.notes,
      userId: 'current-user',
      userName: 'Usuario Actual',
      branchId: 'main-branch',
      branchName: 'Sucursal Principal',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      purchaseOrders: [...state.purchaseOrders, newOrder],
    }));

    get().calculateStats();
    return newOrder;
  },

  updatePurchaseOrder: (id, input) => {
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((order) =>
        order.id === id
          ? { ...order, ...input, updatedAt: new Date() } as typeof order
          : order
      ),
    }));
  },

  approvePurchaseOrder: (id) => {
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((order) =>
        order.id === id
          ? {
              ...order,
              status: 'approved' as const,
              approvedBy: 'current-user',
              approvedByName: 'Usuario Actual',
              approvedAt: new Date(),
              updatedAt: new Date(),
            }
          : order
      ),
    }));
    get().calculateStats();
  },

  receivePurchaseOrder: (id, receivedItems) => {
    const state = get();
    const order = state.purchaseOrders.find(o => o.id === id);
    if (!order) return;

    // Update received quantities
    const updatedItems = order.items.map(item => {
      const received = receivedItems.find(r => r.productId === item.productId);
      if (received) {
        const newReceivedQty = item.receivedQuantity + received.quantity;
        return {
          ...item,
          receivedQuantity: newReceivedQty,
          pendingQuantity: item.quantity - newReceivedQty,
        };
      }
      return item;
    });

    const allReceived = updatedItems.every(item => item.pendingQuantity <= 0);
    const someReceived = updatedItems.some(item => item.receivedQuantity > 0);

    // Update order status
    const newStatus: PurchaseOrder['status'] = allReceived ? 'received' : someReceived ? 'partial' : order.status;

    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((o) =>
        o.id === id
          ? {
              ...o,
              items: updatedItems,
              status: newStatus,
              receivedAt: allReceived ? new Date() : undefined,
              updatedAt: new Date(),
            }
          : o
      ),
    }));

    // Create accounts payable if order is approved and being received
    if (order.status === 'approved' || (order.status === 'partial' && newStatus !== 'partial')) {
      const payable: AccountsPayable = {
        id: uuidv4(),
        code: generateCode('CPP', state.accountsPayable.length + 1),
        purchaseOrderId: order.id,
        purchaseOrderCode: order.code,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        amount: order.total,
        paidAmount: 0,
        pendingAmount: order.total,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'pending',
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((state) => ({
        accountsPayable: [...state.accountsPayable, payable],
      }));
    }

    get().calculateStats();
  },

  cancelPurchaseOrder: (id) => {
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((order) =>
        order.id === id
          ? { ...order, status: 'cancelled' as const, updatedAt: new Date() }
          : order
      ),
    }));
    get().calculateStats();
  },

  getPurchaseOrder: (id) => {
    return get().purchaseOrders.find((order) => order.id === id);
  },

  // Accounts Payable actions
  addPayablePayment: (input) => {
    const state = get();
    const payable = state.accountsPayable.find(p => p.id === input.payableId);
    if (!payable) return;

    const payment = {
      id: uuidv4(),
      date: new Date(),
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
    };

    const newPaidAmount = payable.paidAmount + input.amount;
    const newPendingAmount = payable.amount - newPaidAmount;
    const newStatus = newPendingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    set((state) => ({
      accountsPayable: state.accountsPayable.map((p) =>
        p.id === input.payableId
          ? {
              ...p,
              paidAmount: newPaidAmount,
              pendingAmount: newPendingAmount,
              status: newStatus,
              payments: [...p.payments, payment],
              updatedAt: new Date(),
            }
          : p
      ),
    }));

    // Update supplier debt
    set((state) => ({
      suppliers: state.suppliers.map((s) =>
        s.id === payable.supplierId
          ? { ...s, currentDebt: Math.max(0, s.currentDebt - input.amount) }
          : s
      ),
    }));

    get().calculateStats();
  },

  // Stats
  calculateStats: () => {
    const state = get();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthOrders = state.purchaseOrders.filter(o =>
      new Date(o.date) >= startOfMonth
    );

    const totalPurchasesMonth = monthOrders
      .filter(o => o.status !== 'cancelled' && o.status !== 'draft')
      .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = state.purchaseOrders.filter(o =>
      o.status === 'pending' || o.status === 'approved' || o.status === 'partial'
    ).length;

    const pendingPayments = state.accountsPayable
      .filter(p => p.status === 'pending' || p.status === 'partial')
      .reduce((sum, p) => sum + p.pendingAmount, 0);

    const totalSuppliers = state.suppliers.filter(s => s.isActive).length;

    set({
      stats: {
        totalPurchasesMonth,
        pendingOrders,
        pendingPayments,
        totalSuppliers,
      },
    });
  },
}));