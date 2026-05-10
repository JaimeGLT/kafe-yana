// Mocks kept for pages not yet connected to backend
// TODO: Remove mocks as each page is connected to the backend

import { subDays, setHours, setMinutes } from 'date-fns';
import type { Sale, Product, InventoryStats } from '../types';
import type { CashMovement, CashRegister } from '../types';
import type { PurchaseOrder, Supplier } from '../types';
import type { Insumo } from '../types/recipes';

const today = new Date(2026, 3, 17);

function d(daysAgo: number, hour: number, min: number): Date {
  return setMinutes(setHours(subDays(today, daysAgo), hour), min);
}

function sale(
  id: string,
  daysAgo: number,
  hour: number,
  min: number,
  items: { id: string; name: string; price: number; qty: number }[],
  payType: 'cash' | 'qr' | 'card',
  customerId?: string,
  customerName?: string,
): Sale {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    id,
    code: `V-${id}`,
    date: d(daysAgo, hour, min),
    customerId,
    customerName,
    items: items.map((i, idx) => ({
      id: `${id}-item-${idx}`,
      productId: i.id,
      productName: i.name,
      productCode: i.id,
      quantity: i.qty,
      unit: 'unidad',
      unitPrice: i.price,
      discount: 0,
      subtotal: i.price * i.qty,
      tax: 0,
      total: i.price * i.qty,
    })),
    subtotal,
    discount: 0,
    tax: 0,
    taxPercentage: 0,
    total: subtotal,
    paymentMethods: [{ id: `pm-${id}`, type: payType, name: payType, amount: subtotal }],
    status: 'completed',
    cashierId: 'cashier-1',
    cashierName: 'Jaime G.',
    branchId: 'branch-1',
    branchName: 'Kafe Yana',
    createdAt: d(daysAgo, hour, min),
    updatedAt: d(daysAgo, hour, min),
  };
}

const CAP  = { id: 'prod-1', name: 'Capuccino caliente', price: 25 };
const AME  = { id: 'prod-2', name: 'Café americano',     price: 15 };
const LAT  = { id: 'prod-3', name: 'Latte',              price: 28 };
const NEG  = { id: 'prod-4', name: 'Café negro',         price: 12 };
const TER  = { id: 'prod-5', name: 'Té de hierbas',      price: 10 };
const MEN  = { id: 'prod-6', name: 'Menú del día',       price: 35 };
const SAN  = { id: 'prod-7', name: 'Sandwich mixto',     price: 22 };
const TOR  = { id: 'prod-8', name: 'Torta del día',      price: 18 };
const FAN  = { id: 'prod-9', name: 'Fanta 1L',           price: 15 };
const AGU  = { id: 'prod-10', name: 'Agua mineral',      price: 8 };

const C1 = { id: 'cust-1', name: 'María Quispe' };
const C2 = { id: 'cust-2', name: 'Carlos Mamani' };
const C3 = { id: 'cust-3', name: 'Lucía Flores' };
const C4 = { id: 'cust-4', name: 'Roberto Condori' };
const C5 = { id: 'cust-5', name: 'Ana Gutierrez' };

export const MOCK_SALES: Sale[] = [
  sale('001', 0, 8, 15,  [{ ...CAP, qty: 1 }, { ...TOR, qty: 1 }], 'cash', C1.id, C1.name),
  sale('002', 0, 8, 45,  [{ ...AME, qty: 2 }], 'qr'),
  sale('003', 0, 9, 10,  [{ ...LAT, qty: 1 }, { ...SAN, qty: 1 }], 'card', C2.id, C2.name),
  sale('004', 0, 9, 40,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'cash'),
  sale('005', 0, 10, 5,  [{ ...CAP, qty: 2 }, { ...TOR, qty: 2 }], 'qr', C3.id, C3.name),
  sale('006', 0, 10, 30, [{ ...NEG, qty: 1 }], 'cash'),
  sale('007', 0, 11, 0,  [{ ...MEN, qty: 2 }, { ...AME, qty: 2 }], 'qr'),
  sale('008', 0, 11, 45, [{ ...TER, qty: 1 }, { ...TOR, qty: 1 }], 'cash'),
  sale('009', 0, 12, 10, [{ ...MEN, qty: 1 }, { ...AGU, qty: 1 }], 'card', C4.id, C4.name),
  sale('010', 0, 12, 50, [{ ...CAP, qty: 1 }, { ...SAN, qty: 1 }], 'qr'),
  sale('011', 0, 13, 20, [{ ...LAT, qty: 1 }], 'cash'),
  sale('012', 0, 14, 0,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'qr'),
  sale('013', 0, 14, 40, [{ ...CAP, qty: 1 }, { ...TOR, qty: 1 }], 'cash', C5.id, C5.name),
  sale('014', 0, 15, 15, [{ ...AME, qty: 1 }, { ...AGU, qty: 2 }], 'cash'),
  sale('015', 0, 16, 0,  [{ ...CAP, qty: 2 }], 'qr'),
  sale('016', 1, 8, 20,  [{ ...CAP, qty: 1 }, { ...SAN, qty: 1 }], 'cash', C2.id, C2.name),
  sale('017', 1, 9, 5,   [{ ...AME, qty: 1 }], 'qr'),
  sale('018', 1, 9, 50,  [{ ...MEN, qty: 2 }], 'cash'),
  sale('019', 1, 10, 30, [{ ...LAT, qty: 1 }, { ...TOR, qty: 2 }], 'card'),
  sale('020', 1, 11, 10, [{ ...NEG, qty: 2 }, { ...AGU, qty: 2 }], 'qr', C1.id, C1.name),
  sale('021', 1, 12, 0,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'cash'),
  sale('022', 1, 12, 45, [{ ...CAP, qty: 1 }], 'qr'),
  sale('023', 1, 13, 30, [{ ...SAN, qty: 2 }, { ...AME, qty: 1 }], 'cash'),
  sale('024', 1, 14, 15, [{ ...TER, qty: 1 }, { ...TOR, qty: 1 }], 'card', C3.id, C3.name),
  sale('025', 1, 15, 0,  [{ ...CAP, qty: 2 }, { ...AGU, qty: 1 }], 'qr'),
  sale('026', 1, 15, 45, [{ ...MEN, qty: 1 }], 'cash'),
  sale('027', 1, 16, 30, [{ ...LAT, qty: 1 }], 'qr'),
  sale('028', 2, 8, 10,  [{ ...CAP, qty: 1 }], 'cash'),
  sale('029', 2, 9, 0,   [{ ...MEN, qty: 2 }, { ...FAN, qty: 2 }], 'qr', C4.id, C4.name),
  sale('030', 2, 9, 40,  [{ ...AME, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('031', 2, 10, 20, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'card'),
  sale('032', 2, 11, 5,  [{ ...NEG, qty: 1 }, { ...TER, qty: 1 }], 'cash'),
  sale('033', 2, 11, 50, [{ ...CAP, qty: 2 }], 'qr', C5.id, C5.name),
  sale('034', 2, 12, 30, [{ ...MEN, qty: 1 }, { ...AGU, qty: 1 }], 'cash'),
  sale('035', 2, 13, 10, [{ ...SAN, qty: 1 }, { ...AME, qty: 2 }], 'qr'),
  sale('036', 2, 14, 0,  [{ ...TOR, qty: 2 }, { ...FAN, qty: 1 }], 'cash'),
  sale('037', 2, 15, 30, [{ ...LAT, qty: 1 }], 'card'),
  sale('038', 2, 16, 10, [{ ...CAP, qty: 1 }, { ...NEG, qty: 1 }], 'qr'),
  sale('039', 3, 8, 30,  [{ ...CAP, qty: 1 }, { ...SAN, qty: 1 }], 'cash', C1.id, C1.name),
  sale('040', 3, 9, 15,  [{ ...AME, qty: 2 }], 'qr'),
  sale('041', 3, 10, 0,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'cash'),
  sale('042', 3, 10, 45, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'card', C2.id, C2.name),
  sale('043', 3, 11, 30, [{ ...NEG, qty: 1 }, { ...AGU, qty: 2 }], 'qr'),
  sale('044', 3, 12, 15, [{ ...CAP, qty: 2 }, { ...TOR, qty: 1 }], 'cash'),
  sale('045', 3, 13, 0,  [{ ...MEN, qty: 2 }], 'qr', C3.id, C3.name),
  sale('046', 3, 13, 45, [{ ...SAN, qty: 1 }], 'cash'),
  sale('047', 3, 14, 30, [{ ...TER, qty: 2 }, { ...FAN, qty: 1 }], 'qr'),
  sale('048', 3, 15, 15, [{ ...LAT, qty: 1 }], 'card'),
  sale('049', 3, 16, 0,  [{ ...CAP, qty: 1 }, { ...AME, qty: 1 }], 'cash'),
  sale('050', 4, 8, 5,   [{ ...NEG, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('051', 4, 8, 55,  [{ ...CAP, qty: 2 }], 'qr', C4.id, C4.name),
  sale('052', 4, 9, 40,  [{ ...MEN, qty: 1 }, { ...AGU, qty: 1 }], 'cash'),
  sale('053', 4, 10, 25, [{ ...LAT, qty: 1 }, { ...FAN, qty: 2 }], 'qr'),
  sale('054', 4, 11, 10, [{ ...AME, qty: 1 }, { ...TOR, qty: 2 }], 'card', C5.id, C5.name),
  sale('055', 4, 12, 0,  [{ ...MEN, qty: 1 }], 'cash'),
  sale('056', 4, 12, 50, [{ ...CAP, qty: 1 }, { ...SAN, qty: 1 }], 'qr'),
  sale('057', 4, 13, 35, [{ ...TER, qty: 1 }], 'cash'),
  sale('058', 4, 14, 20, [{ ...AME, qty: 2 }, { ...AGU, qty: 1 }], 'qr', C1.id, C1.name),
  sale('059', 4, 15, 5,  [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'cash'),
  sale('060', 4, 15, 50, [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'qr'),
  sale('061', 4, 16, 30, [{ ...CAP, qty: 1 }], 'card'),
  sale('062', 5, 8, 10,  [{ ...CAP, qty: 1 }, { ...TOR, qty: 1 }], 'cash', C2.id, C2.name),
  sale('063', 5, 9, 0,   [{ ...MEN, qty: 2 }, { ...AME, qty: 1 }], 'qr'),
  sale('064', 5, 9, 50,  [{ ...NEG, qty: 2 }], 'cash'),
  sale('065', 5, 10, 40, [{ ...LAT, qty: 1 }, { ...SAN, qty: 2 }], 'card'),
  sale('066', 5, 11, 25, [{ ...FAN, qty: 2 }, { ...TOR, qty: 1 }], 'qr', C3.id, C3.name),
  sale('067', 5, 12, 10, [{ ...MEN, qty: 1 }, { ...AGU, qty: 2 }], 'cash'),
  sale('068', 5, 13, 0,  [{ ...CAP, qty: 2 }], 'qr'),
  sale('069', 5, 13, 50, [{ ...SAN, qty: 1 }, { ...TER, qty: 1 }], 'cash'),
  sale('070', 5, 14, 35, [{ ...AME, qty: 1 }, { ...FAN, qty: 1 }], 'qr'),
  sale('071', 5, 15, 20, [{ ...LAT, qty: 1 }], 'cash', C4.id, C4.name),
  sale('072', 5, 16, 5,  [{ ...CAP, qty: 1 }, { ...AGU, qty: 1 }], 'qr'),
  sale('073', 6, 8, 20,  [{ ...AME, qty: 2 }, { ...TOR, qty: 1 }], 'cash'),
  sale('074', 6, 9, 10,  [{ ...CAP, qty: 1 }], 'qr', C5.id, C5.name),
  sale('075', 6, 10, 0,  [{ ...MEN, qty: 2 }, { ...FAN, qty: 1 }], 'cash'),
  sale('076', 6, 10, 50, [{ ...LAT, qty: 1 }, { ...SAN, qty: 1 }], 'card'),
  sale('077', 6, 11, 35, [{ ...NEG, qty: 1 }, { ...AGU, qty: 2 }], 'qr', C1.id, C1.name),
  sale('078', 6, 12, 20, [{ ...TOR, qty: 2 }], 'cash'),
  sale('079', 6, 13, 5,  [{ ...CAP, qty: 2 }, { ...FAN, qty: 1 }], 'qr'),
  sale('080', 6, 14, 0,  [{ ...MEN, qty: 1 }], 'cash'),
  sale('081', 6, 14, 45, [{ ...SAN, qty: 1 }, { ...TER, qty: 1 }], 'qr'),
  sale('082', 6, 15, 30, [{ ...AME, qty: 1 }, { ...LAT, qty: 1 }], 'cash', C2.id, C2.name),
  sale('083', 6, 16, 10, [{ ...CAP, qty: 1 }], 'qr'),
  sale('084', 7,  8, 30, [{ ...CAP, qty: 1 }, { ...MEN, qty: 1 }], 'cash'),
  sale('085', 7,  9, 20, [{ ...AME, qty: 2 }], 'qr', C3.id, C3.name),
  sale('086', 7, 10, 15, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'card'),
  sale('087', 7, 11,  0, [{ ...NEG, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('088', 7, 12, 30, [{ ...MEN, qty: 2 }, { ...FAN, qty: 1 }], 'qr'),
  sale('089', 7, 13, 15, [{ ...CAP, qty: 1 }], 'cash'),
  sale('090', 7, 14, 45, [{ ...TER, qty: 1 }, { ...AGU, qty: 1 }], 'qr'),
  sale('091', 7, 16,  0, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'card', C4.id, C4.name),
  sale('092', 8,  8, 10, [{ ...CAP, qty: 2 }], 'qr'),
  sale('093', 8,  9, 0,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'cash', C5.id, C5.name),
  sale('094', 8, 10, 30, [{ ...AME, qty: 1 }, { ...SAN, qty: 1 }], 'qr'),
  sale('095', 8, 11, 20, [{ ...LAT, qty: 1 }], 'cash'),
  sale('096', 8, 12, 10, [{ ...MEN, qty: 2 }], 'card'),
  sale('097', 8, 13,  0, [{ ...CAP, qty: 1 }, { ...AGU, qty: 2 }], 'qr', C1.id, C1.name),
  sale('098', 8, 14, 30, [{ ...TOR, qty: 2 }], 'cash'),
  sale('099', 8, 15, 15, [{ ...SAN, qty: 1 }, { ...NEG, qty: 1 }], 'qr'),
  sale('100', 8, 16,  0, [{ ...CAP, qty: 1 }, { ...FAN, qty: 1 }], 'cash'),
  sale('101', 9,  8, 25, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'qr'),
  sale('102', 9,  9, 15, [{ ...MEN, qty: 1 }], 'cash', C2.id, C2.name),
  sale('103', 9, 10, 10, [{ ...CAP, qty: 2 }, { ...SAN, qty: 1 }], 'qr'),
  sale('104', 9, 11, 30, [{ ...AME, qty: 1 }, { ...AGU, qty: 1 }], 'cash'),
  sale('105', 9, 12, 20, [{ ...MEN, qty: 2 }, { ...FAN, qty: 2 }], 'card'),
  sale('106', 9, 13, 10, [{ ...CAP, qty: 1 }], 'qr', C3.id, C3.name),
  sale('107', 9, 14, 45, [{ ...TER, qty: 1 }, { ...TOR, qty: 1 }], 'cash'),
  sale('108', 9, 16,  0, [{ ...LAT, qty: 1 }], 'qr'),
  sale('109', 10, 8, 0,  [{ ...CAP, qty: 1 }, { ...SAN, qty: 2 }], 'cash'),
  sale('110', 10, 9, 30, [{ ...MEN, qty: 1 }, { ...AME, qty: 1 }], 'qr', C4.id, C4.name),
  sale('111', 10, 10, 15, [{ ...NEG, qty: 2 }], 'cash'),
  sale('112', 10, 11, 45, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'card'),
  sale('113', 10, 12, 30, [{ ...MEN, qty: 2 }, { ...FAN, qty: 1 }], 'qr'),
  sale('114', 10, 13, 20, [{ ...CAP, qty: 1 }, { ...AGU, qty: 2 }], 'cash', C5.id, C5.name),
  sale('115', 10, 14, 10, [{ ...SAN, qty: 1 }], 'qr'),
  sale('116', 10, 16,  0, [{ ...AME, qty: 2 }], 'cash'),
  sale('117', 11, 8, 15, [{ ...CAP, qty: 1 }], 'cash', C1.id, C1.name),
  sale('118', 11, 9, 5,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 2 }], 'qr'),
  sale('119', 11, 10, 30, [{ ...LAT, qty: 2 }], 'card'),
  sale('120', 11, 11, 20, [{ ...AME, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('121', 11, 12, 10, [{ ...MEN, qty: 2 }, { ...TOR, qty: 1 }], 'qr', C2.id, C2.name),
  sale('122', 11, 13, 30, [{ ...CAP, qty: 1 }, { ...AGU, qty: 1 }], 'cash'),
  sale('123', 11, 14, 45, [{ ...NEG, qty: 1 }, { ...TER, qty: 1 }], 'qr'),
  sale('124', 11, 16,  0, [{ ...LAT, qty: 1 }], 'cash'),
  sale('125', 12, 8, 20, [{ ...MEN, qty: 1 }, { ...CAP, qty: 1 }], 'cash'),
  sale('126', 12, 9, 10, [{ ...AME, qty: 2 }], 'qr', C3.id, C3.name),
  sale('127', 12, 10, 0, [{ ...TOR, qty: 2 }, { ...FAN, qty: 1 }], 'cash'),
  sale('128', 12, 11, 30, [{ ...LAT, qty: 1 }, { ...SAN, qty: 1 }], 'card'),
  sale('129', 12, 12, 20, [{ ...MEN, qty: 1 }, { ...AGU, qty: 2 }], 'qr'),
  sale('130', 12, 13, 10, [{ ...CAP, qty: 2 }], 'cash', C4.id, C4.name),
  sale('131', 12, 14, 40, [{ ...NEG, qty: 1 }], 'qr'),
  sale('132', 12, 16,  0, [{ ...LAT, qty: 1 }, { ...TOR, qty: 1 }], 'cash'),
  sale('133', 13, 8, 30, [{ ...CAP, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('134', 13, 9, 20, [{ ...MEN, qty: 2 }], 'qr', C5.id, C5.name),
  sale('135', 13, 10, 10, [{ ...AME, qty: 1 }, { ...TER, qty: 1 }], 'cash'),
  sale('136', 13, 11, 30, [{ ...LAT, qty: 1 }, { ...FAN, qty: 2 }], 'card'),
  sale('137', 13, 12, 20, [{ ...CAP, qty: 2 }, { ...TOR, qty: 1 }], 'qr', C1.id, C1.name),
  sale('138', 13, 13, 10, [{ ...MEN, qty: 1 }], 'cash'),
  sale('139', 13, 14, 40, [{ ...SAN, qty: 2 }, { ...AGU, qty: 1 }], 'qr'),
  sale('140', 13, 16,  0, [{ ...CAP, qty: 1 }], 'cash'),
  sale('141', 14, 8, 0,  [{ ...LAT, qty: 1 }], 'qr', C2.id, C2.name),
  sale('142', 14, 9, 20, [{ ...MEN, qty: 1 }, { ...CAP, qty: 1 }], 'cash'),
  sale('143', 14, 10, 30, [{ ...AME, qty: 2 }], 'qr'),
  sale('144', 14, 11, 15, [{ ...TOR, qty: 1 }, { ...FAN, qty: 1 }], 'cash'),
  sale('145', 14, 12, 30, [{ ...MEN, qty: 2 }, { ...SAN, qty: 1 }], 'card'),
  sale('146', 14, 13, 20, [{ ...CAP, qty: 1 }, { ...AGU, qty: 2 }], 'qr', C3.id, C3.name),
  sale('147', 14, 14, 45, [{ ...NEG, qty: 2 }], 'cash'),
  sale('148', 14, 16,  0, [{ ...LAT, qty: 1 }, { ...TER, qty: 1 }], 'qr'),
  sale('149', 15, 8, 10, [{ ...CAP, qty: 2 }, { ...TOR, qty: 1 }], 'cash'),
  sale('150', 15, 9, 0,  [{ ...MEN, qty: 1 }, { ...FAN, qty: 2 }], 'qr', C4.id, C4.name),
  sale('151', 15, 10, 30, [{ ...AME, qty: 1 }, { ...SAN, qty: 1 }], 'cash'),
  sale('152', 15, 11, 20, [{ ...LAT, qty: 1 }], 'card'),
  sale('153', 15, 12, 10, [{ ...MEN, qty: 2 }], 'qr', C5.id, C5.name),
  sale('154', 15, 13, 30, [{ ...CAP, qty: 1 }, { ...AGU, qty: 1 }], 'cash'),
  sale('155', 15, 14, 20, [{ ...TOR, qty: 2 }], 'qr'),
  sale('156', 15, 16,  0, [{ ...SAN, qty: 1 }, { ...AME, qty: 1 }], 'cash'),
  sale('157', 16, 8, 20, [{ ...CAP, qty: 1 }], 'cash', C1.id, C1.name),
  sale('158', 16, 9, 10, [{ ...MEN, qty: 1 }, { ...FAN, qty: 1 }], 'qr'),
  sale('159', 16, 10, 0, [{ ...LAT, qty: 2 }, { ...TOR, qty: 1 }], 'card'),
  sale('160', 16, 11, 30, [{ ...AME, qty: 1 }, { ...SAN, qty: 2 }], 'cash'),
  sale('161', 16, 12, 20, [{ ...NEG, qty: 1 }, { ...AGU, qty: 2 }], 'qr', C2.id, C2.name),
  sale('162', 16, 13, 10, [{ ...MEN, qty: 1 }], 'cash'),
  sale('163', 16, 14, 45, [{ ...CAP, qty: 1 }, { ...TER, qty: 1 }], 'qr'),
  sale('164', 16, 16,  0, [{ ...TOR, qty: 1 }], 'cash'),
];

export const MOCK_CASH_MOVEMENTS: CashMovement[] = [
  { id: 'cm-1',  type: 'expense', category: 'Proveedores',       concept: 'Pago café en grano', amount: 450, date: d(2,  9, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-2',  type: 'expense', category: 'Proveedores',       concept: 'Leche y lácteos',    amount: 280, date: d(2, 10, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-3',  type: 'income',  category: 'Otros ingresos',    concept: 'Evento corporativo', amount: 600, date: d(3, 11, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-4',  type: 'expense', category: 'Personal',          concept: 'Anticipo nómina',    amount: 500, date: d(4, 12, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-5',  type: 'expense', category: 'Gastos operativos', concept: 'Limpieza mensual',   amount: 120, date: d(5, 14, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-6',  type: 'expense', category: 'Proveedores',       concept: 'Harinas y azúcar',   amount: 190, date: d(7,  9, 30), userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-7',  type: 'income',  category: 'Otros ingresos',    concept: 'Alquiler terraza',   amount: 300, date: d(8, 10, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-8',  type: 'expense', category: 'Mantenimiento',     concept: 'Reparación máquina', amount: 250, date: d(10, 11, 0), userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-9',  type: 'expense', category: 'Gastos operativos', concept: 'Materiales limpieza',amount: 85,  date: d(12, 9, 0),  userId: 'u1', userName: 'Jaime G.' },
  { id: 'cm-10', type: 'expense', category: 'Proveedores',       concept: 'Bebidas embotelladas',amount: 320, date: d(14, 10, 0), userId: 'u1', userName: 'Jaime G.' },
];

export const MOCK_CASH_REGISTERS: CashRegister[] = [
  {
    id: 'cr-1', code: 'CAJA-001',
    openedAt: d(16, 7, 45), closedAt: d(16, 18, 0),
    openingBalance: 200, expectedBalance: 1580, actualBalance: 1570, difference: -10,
    status: 'closed', movements: [], sales: [],
    totalSales: 1380, totalIncome: 0, totalExpense: 0,
    userId: 'u1', userName: 'Jaime G.', branchId: 'b1',
    createdAt: d(16, 7, 45), updatedAt: d(16, 18, 0),
  },
  {
    id: 'cr-2', code: 'CAJA-002',
    openedAt: d(15, 7, 50), closedAt: d(15, 17, 55),
    openingBalance: 200, expectedBalance: 1210, actualBalance: 1210, difference: 0,
    status: 'closed', movements: [], sales: [],
    totalSales: 1010, totalIncome: 0, totalExpense: 0,
    userId: 'u1', userName: 'Jaime G.', branchId: 'b1',
    createdAt: d(15, 7, 50), updatedAt: d(15, 17, 55),
  },
  {
    id: 'cr-3', code: 'CAJA-003',
    openedAt: d(0, 7, 55),
    openingBalance: 200, expectedBalance: 0, actualBalance: 0, difference: 0,
    status: 'open', movements: [], sales: [],
    totalSales: 0, totalIncome: 0, totalExpense: 0,
    userId: 'u1', userName: 'Jaime G.', branchId: 'b1',
    createdAt: d(0, 7, 55), updatedAt: d(0, 7, 55),
  },
];

function p(id: string, name: string, cat: string, tipo: 'comprado' | 'elaborado', cost: number, sale: number, stock: number, min: number): Product {
  return {
    id, code: id, name, categoryId: cat, categoryName: cat, tipo,
    unit: 'unidad', costPrice: cost, salePrice: sale,
    stock, minStock: min, maxStock: min * 4,
    variations: [], isActive: true, hasVariations: false,
    createdAt: d(30, 0, 0), updatedAt: d(0, 0, 0),
  };
}

export const MOCK_PRODUCTS: Product[] = [
  p('prod-1',  'Capuccino caliente', 'Cafés',     'elaborado', 8,  25, 0,  0),
  p('prod-2',  'Café americano',     'Cafés',     'elaborado', 4,  15, 0,  0),
  p('prod-3',  'Latte',              'Cafés',     'elaborado', 9,  28, 0,  0),
  p('prod-4',  'Café negro',         'Cafés',     'elaborado', 3,  12, 0,  0),
  p('prod-5',  'Té de hierbas',      'Infusiones','elaborado', 2,  10, 0,  0),
  p('prod-6',  'Menú del día',       'Comidas',   'elaborado', 18, 35, 0,  0),
  p('prod-7',  'Sandwich mixto',     'Comidas',   'elaborado', 10, 22, 0,  0),
  p('prod-8',  'Torta del día',      'Postres',   'elaborado', 7,  18, 0,  0),
  p('prod-9',  'Fanta 1L',           'Bebidas',   'comprado',  9,  15, 12, 5),
  p('prod-10', 'Agua mineral',       'Bebidas',   'comprado',  4,  8,  20, 8),
  p('prod-11', 'Café en grano 1kg',  'Insumos',   'comprado',  85, 0,  3,  5),
  p('prod-12', 'Leche entera 1L',    'Lácteos',   'comprado',  8,  0,  4,  10),
  p('prod-13', 'Azúcar 1kg',         'Insumos',   'comprado',  6,  0,  8,  5),
  p('prod-14', 'Harina 1kg',         'Insumos',   'comprado',  7,  0,  6,  4),
];

export const MOCK_INVENTORY_STATS: InventoryStats = {
  totalProducts: 14,
  activeProducts: 14,
  lowStockProducts: 3,
  outOfStockProducts: 0,
  totalValue: 680,
  categoriesCount: 6,
};

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', razon_Social: 'Distribuidora Café Norte', telefono: '71234567', isActive: true, createdAt: d(60,0,0), updatedAt: d(5,0,0) },
  { id: 'sup-2', code: 'SUP-002', razon_Social: 'Lácteos del Valle',        telefono: '72345678', isActive: true, createdAt: d(60,0,0), updatedAt: d(3,0,0) },
  { id: 'sup-3', code: 'SUP-003', razon_Social: 'Bebidas y Más S.R.L.',     telefono: '73456789', isActive: true, createdAt: d(60,0,0), updatedAt: d(7,0,0) },
  { id: 'sup-4', code: 'SUP-004', razon_Social: 'Insumos Pastelería Lima',  telefono: '74567890', isActive: true, createdAt: d(60,0,0), updatedAt: d(10,0,0) },
];

function po(
  id: string, daysAgo: number, supplierId: string, supplierName: string,
  items: { name: string; qty: number; cost: number }[],
  status: PurchaseOrder['status'],
): PurchaseOrder {
  const subtotal = items.reduce((s, i) => s + i.qty * i.cost, 0);
  return {
    id, code: `OC-${id}`, date: d(daysAgo, 10, 0),
    supplierId, supplierName,
    items: items.map((i, idx) => ({
      id: `${id}-item-${idx}`,
      productId: `prod-${idx + 9}`,
      productName: i.name,
      productCode: `SKU-${idx}`,
      quantity: i.qty, unit: 'unidad',
      unitCost: i.cost, subtotal: i.qty * i.cost,
      receivedQuantity: status === 'received' ? i.qty : 0,
      pendingQuantity: status === 'received' ? 0 : i.qty,
    })),
    subtotal, tax: 0, taxPercentage: 0, total: subtotal,
    status,
    userId: 'u1', userName: 'Jaime G.', branchId: 'b1',
    createdAt: d(daysAgo, 10, 0), updatedAt: d(daysAgo, 10, 0),
  };
}

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  po('001', 16, 'sup-1', 'Distribuidora Café Norte', [{ name: 'Café en grano 1kg', qty: 5, cost: 85 }], 'received'),
  po('002', 14, 'sup-2', 'Lácteos del Valle',        [{ name: 'Leche entera 1L', qty: 24, cost: 8 }, { name: 'Crema de leche', qty: 6, cost: 12 }], 'received'),
  po('003', 10, 'sup-3', 'Bebidas y Más S.R.L.',     [{ name: 'Fanta 1L', qty: 24, cost: 9 }, { name: 'Agua mineral 1L', qty: 24, cost: 4 }], 'received'),
  po('004', 7,  'sup-4', 'Insumos Pastelería Lima',  [{ name: 'Harina 1kg', qty: 10, cost: 7 }, { name: 'Azúcar 1kg', qty: 8, cost: 6 }], 'received'),
  po('005', 4,  'sup-1', 'Distribuidora Café Norte', [{ name: 'Café en grano 1kg', qty: 3, cost: 85 }], 'received'),
  po('006', 2,  'sup-2', 'Lácteos del Valle',        [{ name: 'Leche entera 1L', qty: 12, cost: 8 }], 'approved'),
  po('007', 1,  'sup-3', 'Bebidas y Más S.R.L.',     [{ name: 'Fanta 1L', qty: 12, cost: 9 }], 'pending'),
  po('008', 0,  'sup-4', 'Insumos Pastelería Lima',  [{ name: 'Azúcar 1kg', qty: 5, cost: 6 }], 'pending'),
];

function ins(
  id: string, name: string, cat: string,
  unMin: string, unCom: string, factor: number,
  costoCompra: number, stock: number, stockMin: number,
  proveedorId?: string,
): Insumo {
  return {
    id, code: id, name, categoriaInsumo: cat,
    unidadMinima: unMin, unidadCompra: unCom,
    factorConversion: factor,
    costoCompra, costoUnitario: costoCompra / factor,
    stock, stockMinimo: stockMin,
    proveedorId, isActive: true,
    createdAt: d(60, 0, 0), updatedAt: d(0, 0, 0),
  };
}

export const MOCK_INSUMOS: Insumo[] = [
  ins('ins-1',  'Café en grano',      'Cafés',      'g',     'kg',    1000, 85,   3000, 1000, 'sup-1'),
  ins('ins-2',  'Leche entera',       'Lácteos',    'ml',    'litro', 1000, 8,    8000, 3000, 'sup-2'),
  ins('ins-3',  'Crema de leche',     'Lácteos',    'ml',    'litro', 1000, 12,   2000, 1000, 'sup-2'),
  ins('ins-4',  'Azúcar blanca',      'Azúcares',   'g',     'kg',    1000, 6,    5000, 2000, 'sup-4'),
  ins('ins-5',  'Harina sin preparar','Harinas',    'g',     'kg',    1000, 7,    4000, 2000, 'sup-4'),
  ins('ins-6',  'Chocolate cobertura','Otros',      'g',     'kg',    1000, 22,   1500, 500,  'sup-4'),
  ins('ins-7',  'Fanta 1L',           'Bebidas',    'ml',    'unidad',1000, 9,    12000,5000, 'sup-3'),
  ins('ins-8',  'Agua mineral 1L',    'Bebidas',    'ml',    'unidad',1000, 4,    20000,8000, 'sup-3'),
  ins('ins-9',  'Vainilla líquida',   'Condimentos','ml',    'frasco',100,  12,   300,  100),
  ins('ins-10', 'Canela molida',      'Condimentos','g',     'sobre', 50,   3,    200,  50),
];