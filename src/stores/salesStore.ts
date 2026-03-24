import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Sale,
  SaleInput,
  Customer,
  CustomerInput,
  Quote,
  QuoteInput,
  Invoice,
  AccountsReceivable,
  ReceivablePaymentInput,
  PaymentMethod,
  SaleItem,
  SalesStats,
} from '../types';

export interface InvoiceItemInput {
  productId: string;
  productName: string;
  productCode: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface InvoiceCreateInput {
  customerId?: string;
  customerName?: string;
  nit?: string;
  items: InvoiceItemInput[];
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  dueDate?: Date;
  notes?: string;
}

interface SalesState {
  sales: Sale[];
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  accountsReceivable: AccountsReceivable[];
  stats: SalesStats;

  // Sale actions
  addSale: (input: SaleInput) => Sale;
  cancelSale: (id: string) => void;
  getSale: (id: string) => Sale | undefined;

  // Customer actions
  addCustomer: (input: CustomerInput) => Customer;
  updateCustomer: (id: string, input: Partial<CustomerInput>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  // Quote actions
  addQuote: (input: QuoteInput) => Quote;
  updateQuote: (id: string, input: Partial<QuoteInput>) => void;
  convertQuoteToSale: (id: string) => Sale | null;
  deleteQuote: (id: string) => void;

  // Invoice actions
  generateInvoice: (saleId: string) => Invoice;
  generateInvoiceForSale: (saleId: string, billing: { nit: string; name: string }) => Invoice;
  createInvoiceFromItems: (input: InvoiceCreateInput) => Invoice;
  markInvoicePaid: (id: string) => void;
  cancelInvoice: (id: string) => void;
  deleteInvoice: (id: string) => void;

  // Accounts Receivable actions
  addReceivablePayment: (input: ReceivablePaymentInput) => void;

  // Stats
  calculateStats: () => void;
}

const generateCode = (prefix: string, num: number): string => {
  return `${prefix}${String(num).padStart(8, '0')}`;
};

const calculateItemTotals = (item: SaleItem): SaleItem => {
  const subtotal = item.quantity * item.unitPrice;
  const discount = item.discount || 0;
  const taxRate = 0.18; // 18% tax
  const taxableAmount = subtotal - discount;
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  return {
    ...item,
    subtotal,
    tax,
    total,
  };
};

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  customers: [],
  quotes: [],
  invoices: [],
  accountsReceivable: [],
  stats: {
    totalSalesToday: 0,
    totalSalesMonth: 0,
    totalProductsSold: 0,
    averageTicket: 0,
    pendingQuotes: 0,
    pendingReceivables: 0,
  },

  // Sale actions
  addSale: (input) => {
    const state = get();
    const saleCode = generateCode('SALE', state.sales.length + 1);
    const now = new Date();

    // Calculate items with totals
    const items: SaleItem[] = input.items.map(item => {
      // For now, we'll need to get product info from inventory store
      // This will be properly connected via hooks
      const saleItem: SaleItem = {
        id: uuidv4(),
        productId: item.productId,
        productName: '',
        productCode: '',
        variationId: item.variationId,
        variationName: undefined,
        quantity: item.quantity,
        unit: 'unidad',
        unitPrice: 0,
        discount: item.discount || 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: item.notes,
      };
      return calculateItemTotals(saleItem);
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = input.discount || 0;
    const tax = items.reduce((sum, item) => sum + item.tax, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0) - discount;

    const paymentMethods: PaymentMethod[] = input.paymentMethods.map(pm => ({
      id: uuidv4(),
      type: pm.type,
      name: pm.type === 'cash' ? 'Efectivo' : pm.type === 'card' ? 'Tarjeta' : pm.type === 'transfer' ? 'Transferencia' : 'Crédito',
      amount: pm.amount,
      reference: pm.reference,
    }));

    const newSale: Sale = {
      id: uuidv4(),
      code: saleCode,
      date: now,
      customerId: input.customerId,
      customerName: input.customerId ? state.customers.find(c => c.id === input.customerId)?.name : undefined,
      items,
      subtotal,
      discount,
      tax,
      taxPercentage: input.taxPercentage || 18,
      total,
      paymentMethods,
      status: 'completed',
      notes: input.notes,
      cashierId: 'current-user',
      cashierName: 'Usuario Actual',
      branchId: 'main-branch',
      branchName: 'Sucursal Principal',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      sales: [...state.sales, newSale],
    }));

    // If credit payment, create accounts receivable
    if (input.paymentMethods.some(pm => pm.type === 'credit')) {
      const creditPayment = input.paymentMethods.find(pm => pm.type === 'credit');
      if (creditPayment) {
        const receivable: AccountsReceivable = {
          id: uuidv4(),
          code: generateCode('REC', state.accountsReceivable.length + 1),
          saleId: newSale.id,
          saleCode: newSale.code,
          customerId: input.customerId || '',
          customerName: newSale.customerName,
          amount: creditPayment.amount,
          paidAmount: 0,
          pendingAmount: creditPayment.amount,
          date: now,
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'pending',
          payments: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          accountsReceivable: [...state.accountsReceivable, receivable],
        }));
      }
    }

    get().calculateStats();
    return newSale;
  },

  cancelSale: (id) => {
    set((state) => ({
      sales: state.sales.map((sale) =>
        sale.id === id
          ? { ...sale, status: 'cancelled' as const, updatedAt: new Date() }
          : sale
      ),
    }));
    get().calculateStats();
  },

  getSale: (id) => {
    return get().sales.find((sale) => sale.id === id);
  },

  // Customer actions
  addCustomer: (input) => {
    const state = get();
    const newCustomer: Customer = {
      id: uuidv4(),
      code: generateCode('CLI', state.customers.length + 1),
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      ruc: input.ruc,
      notes: input.notes,
      creditLimit: input.creditLimit,
      currentCredit: 0,
      totalPurchases: 0,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      customers: [...state.customers, newCustomer],
    }));

    return newCustomer;
  },

  updateCustomer: (id, input) => {
    set((state) => ({
      customers: state.customers.map((customer) =>
        customer.id === id
          ? { ...customer, ...input, updatedAt: new Date() }
          : customer
      ),
    }));
  },

  deleteCustomer: (id) => {
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== id),
    }));
  },

  getCustomer: (id) => {
    return get().customers.find((customer) => customer.id === id);
  },

  // Quote actions
  addQuote: (input) => {
    const state = get();
    const quoteCode = generateCode('COT', state.quotes.length + 1);
    const now = new Date();

    const items: SaleItem[] = input.items.map(item => ({
      id: uuidv4(),
      productId: item.productId,
      productName: '',
      productCode: '',
      variationId: item.variationId,
      quantity: item.quantity,
      unit: 'unidad',
      unitPrice: 0,
      discount: item.discount || 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = input.discount || 0;
    const tax = subtotal * 0.18;
    const total = subtotal + tax - discount;

    const newQuote: Quote = {
      id: uuidv4(),
      code: quoteCode,
      date: now,
      validUntil: input.validUntil,
      customerId: input.customerId,
      customerName: input.customerId ? state.customers.find(c => c.id === input.customerId)?.name : undefined,
      items,
      subtotal,
      discount,
      tax,
      total,
      notes: input.notes,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      quotes: [...state.quotes, newQuote],
    }));

    get().calculateStats();
    return newQuote;
  },

  updateQuote: (id, input) => {
    set((state) => ({
      quotes: state.quotes.map((quote) =>
        quote.id === id
          ? { ...quote, ...input, updatedAt: new Date() } as typeof quote
          : quote
      ),
    }));
  },

  convertQuoteToSale: (id) => {
    const quote = get().quotes.find(q => q.id === id);
    if (!quote) return null;

    // Mark quote as converted
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === id
          ? { ...q, status: 'approved' as const, updatedAt: new Date() }
          : q
      ),
    }));

    // Create sale from quote
    const saleInput: SaleInput = {
      customerId: quote.customerId,
      items: quote.items.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        discount: item.discount,
      })),
      discount: quote.discount,
      paymentMethods: [{ type: 'cash', amount: quote.total }],
      notes: `Convertido desde cotización ${quote.code}`,
    };

    return get().addSale(saleInput);
  },

  deleteQuote: (id) => {
    set((state) => ({
      quotes: state.quotes.filter((quote) => quote.id !== id),
    }));
    get().calculateStats();
  },

  // Invoice actions
  generateInvoice: (saleId) => {
    const state = get();
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');

    const invoice: Invoice = {
      id: uuidv4(),
      code: generateCode('FACT', state.invoices.length + 1),
      saleId: sale.id,
      saleCode: sale.code,
      date: new Date(),
      customerId: sale.customerId,
      customerName: sale.customerName,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      invoices: [...state.invoices, invoice],
    }));

    return invoice;
  },

  generateInvoiceForSale: (saleId, billing) => {
    const state = get();
    const sale = state.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Venta no encontrada');

    const now = new Date();
    const isPaid = sale.paymentMethods.every((pm) => pm.type !== 'credit');

    const invoice: Invoice = {
      id: uuidv4(),
      code: generateCode('FACT', state.invoices.length + 1),
      saleId: sale.id,
      saleCode: sale.code,
      date: now,
      customerName: billing.name,
      nit: billing.nit,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      status: isPaid ? 'paid' : 'pending',
      paymentDate: isPaid ? now : undefined,
      notes: sale.notes,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({ invoices: [...s.invoices, invoice] }));
    return invoice;
  },

  createInvoiceFromItems: (input) => {
    const state = get();
    const now = new Date();

    // Build SaleItems with full data
    const items: SaleItem[] = input.items.map((item) => {
      const taxRate = 0.18;
      const subtotal = item.quantity * item.unitPrice;
      const discountAmt = item.discount || 0;
      const taxable = subtotal - discountAmt;
      const tax = taxable * taxRate;
      const total = taxable + tax;
      return {
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        variationId: item.variationId,
        variationName: item.variationName,
        quantity: item.quantity,
        unit: 'unidad',
        unitPrice: item.unitPrice,
        discount: discountAmt,
        subtotal,
        tax,
        total,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
    const tax = items.reduce((s, i) => s + i.tax, 0);
    const total = subtotal - totalDiscount + tax;

    const isPaid = input.paymentMethod !== 'credit';

    // Create Sale
    const newSale: Sale = {
      id: uuidv4(),
      code: generateCode('SALE', state.sales.length + 1),
      date: now,
      customerId: input.customerId,
      customerName: input.customerName,
      items,
      subtotal,
      discount: totalDiscount,
      tax,
      taxPercentage: 18,
      total,
      paymentMethods: [{
        id: uuidv4(),
        type: input.paymentMethod,
        name: input.paymentMethod === 'cash' ? 'Efectivo'
          : input.paymentMethod === 'card' ? 'Tarjeta'
          : input.paymentMethod === 'transfer' ? 'Transferencia'
          : 'Crédito',
        amount: total,
      }],
      status: 'completed',
      notes: input.notes,
      cashierId: 'current-user',
      cashierName: 'Usuario Actual',
      branchId: 'main-branch',
      branchName: 'Sucursal Principal',
      createdAt: now,
      updatedAt: now,
    };

    // Create Invoice
    const invoice: Invoice = {
      id: uuidv4(),
      code: generateCode('FACT', state.invoices.length + 1),
      saleId: newSale.id,
      saleCode: newSale.code,
      date: now,
      dueDate: input.dueDate,
      customerId: input.customerId,
      customerName: input.customerName,
      nit: input.nit,
      items,
      subtotal,
      tax,
      total,
      status: isPaid ? 'paid' : 'pending',
      paymentDate: isPaid ? now : undefined,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({
      sales: [...s.sales, newSale],
      invoices: [...s.invoices, invoice],
    }));

    get().calculateStats();
    return invoice;
  },

  markInvoicePaid: (id) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, status: 'paid' as const, paymentDate: new Date(), updatedAt: new Date() }
          : inv
      ),
    }));
  },

  cancelInvoice: (id) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, status: 'cancelled' as const, updatedAt: new Date() }
          : inv
      ),
    }));
  },

  deleteInvoice: (id) => {
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id),
    }));
  },

  // Accounts Receivable actions
  addReceivablePayment: (input) => {
    const state = get();
    const receivable = state.accountsReceivable.find(r => r.id === input.receivableId);
    if (!receivable) return;

    const payment = {
      id: uuidv4(),
      date: new Date(),
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
    };

    const newPaidAmount = receivable.paidAmount + input.amount;
    const newPendingAmount = receivable.amount - newPaidAmount;
    const newStatus = newPendingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    set((state) => ({
      accountsReceivable: state.accountsReceivable.map((r) =>
        r.id === input.receivableId
          ? {
              ...r,
              paidAmount: newPaidAmount,
              pendingAmount: newPendingAmount,
              status: newStatus,
              payments: [...r.payments, payment],
              updatedAt: new Date(),
            }
          : r
      ),
    }));

    get().calculateStats();
  },

  // Stats
  calculateStats: () => {
    const state = get();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todaySales = state.sales.filter(s =>
      s.status === 'completed' && new Date(s.date) >= today
    );
    const monthSales = state.sales.filter(s =>
      s.status === 'completed' && new Date(s.date) >= startOfMonth
    );

    const totalSalesToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalSalesMonth = monthSales.reduce((sum, s) => sum + s.total, 0);
    const totalProductsSold = monthSales.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const averageTicket = monthSales.length > 0 ? totalSalesMonth / monthSales.length : 0;
    const pendingQuotes = state.quotes.filter(q => q.status === 'pending').length;
    const pendingReceivables = state.accountsReceivable
      .filter(r => r.status === 'pending' || r.status === 'partial')
      .reduce((sum, r) => sum + r.pendingAmount, 0);

    set({
      stats: {
        totalSalesToday,
        totalSalesMonth,
        totalProductsSold,
        averageTicket,
        pendingQuotes,
        pendingReceivables,
      },
    });
  },
}));