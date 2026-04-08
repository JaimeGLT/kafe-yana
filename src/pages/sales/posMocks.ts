/**
 * MOCK DATA — Punto de Venta
 * Simula el comportamiento real del backend:
 *   - Productos comprados (con stock limitado)
 *   - Productos elaborados (con receta, stock "ilimitado" = 999)
 *   - Productos combo
 *   - Variaciones de atributos (Tamaño, Leche, Sabor)
 *   - Clientes y perfiles de fidelización
 */

import type { Product, Category, Customer } from '../../types';
import type { VariacionAtributo } from '../../types/variations';
import type { LoyaltyProfile, MilestoneReward, Reward } from '../../types/loyalty';
import type { Sale, SaleInput } from '../../types/sales';

const now = new Date();

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORÍAS
═══════════════════════════════════════════════════════════════════════════*/
export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-hot',    name: 'Bebidas Calientes', color: '#92400e', sortOrder: 1, isActive: true, createdAt: now, updatedAt: now },
  { id: 'cat-cold',   name: 'Bebidas Frías',     color: '#1d4ed8', sortOrder: 2, isActive: true, createdAt: now, updatedAt: now },
  { id: 'cat-snacks', name: 'Snacks & Pastelería', color: '#b45309', sortOrder: 3, isActive: true, createdAt: now, updatedAt: now },
  { id: 'cat-combos', name: 'Combos',            color: '#15803d', sortOrder: 4, isActive: true, createdAt: now, updatedAt: now },
  { id: 'cat-otros',  name: 'Otros',             color: '#64748b', sortOrder: 5, isActive: true, createdAt: now, updatedAt: now },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTOS
═══════════════════════════════════════════════════════════════════════════*/

// Helper para crear un producto base
const mkProduct = (
  id: string,
  code: string,
  name: string,
  tipo: 'comprado' | 'elaborado' | 'combo',
  categoryId: string,
  costPrice: number,
  salePrice: number,
  stock: number,
  hasVariations = false,
): Product => ({
  id,
  code,
  name,
  tipo,
  categoryId,
  costPrice,
  salePrice,
  stock,
  minStock: tipo === 'comprado' ? 5 : 0,
  maxStock: 999,
  unit: tipo === 'comprado' ? 'und' : 'porción',
  variations: [],
  isActive: true,
  hasVariations,
  createdAt: now,
  updatedAt: now,
});

export const MOCK_PRODUCTS: Product[] = [
  /* ── Elaborados — Bebidas Calientes ── */
  mkProduct('prod-americano',    'BE-001', 'Café Americano',       'elaborado', 'cat-hot',    2.50,  7.00, 999),
  mkProduct('prod-latte',        'BE-002', 'Café Latte',           'elaborado', 'cat-hot',    3.00,  9.00, 999, true),
  mkProduct('prod-cappuccino',   'BE-003', 'Cappuccino',           'elaborado', 'cat-hot',    3.00,  9.00, 999, true),
  mkProduct('prod-mocha',        'BE-004', 'Café Mocha',           'elaborado', 'cat-hot',    3.50, 11.00, 999),
  mkProduct('prod-macchiato',    'BE-005', 'Macchiato',            'elaborado', 'cat-hot',    2.80,  8.00, 999),
  mkProduct('prod-choc-caliente','BE-006', 'Chocolate Caliente',   'elaborado', 'cat-hot',    3.00,  8.00, 999),

  /* ── Elaborados — Bebidas Frías ── */
  mkProduct('prod-coldbrew',     'BE-007', 'Cold Brew',            'elaborado', 'cat-cold',   3.50, 11.00, 999),
  mkProduct('prod-frappe',       'BE-008', 'Frappe de Café',       'elaborado', 'cat-cold',   4.00, 12.00, 999, true),
  mkProduct('prod-limonada-frz', 'BE-009', 'Limonada Frozen',      'elaborado', 'cat-cold',   2.50,  9.00, 999),
  mkProduct('prod-smoothie',     'BE-010', 'Smoothie de Fresa',    'elaborado', 'cat-cold',   3.00, 11.00, 999),
  mkProduct('prod-limonada',     'BE-011', 'Limonada Natural',     'elaborado', 'cat-cold',   1.80,  7.00, 999),

  /* ── Elaborados — Snacks ── */
  mkProduct('prod-sandwich',     'BE-012', 'Sándwich de Pollo',    'elaborado', 'cat-snacks', 5.00, 14.00, 999),
  mkProduct('prod-tostada',      'BE-013', 'Tostada con Mantequilla','elaborado','cat-snacks',1.50,  6.00, 999),
  mkProduct('prod-cheesecake',   'BE-014', 'Cheesecake de Maracuyá','elaborado','cat-snacks', 4.50, 12.00,  10),
  mkProduct('prod-brownie',      'BE-015', 'Brownie de Chocolate', 'elaborado', 'cat-snacks', 2.50,  8.00,  15),

  /* ── Comprados (stock real) ── */
  mkProduct('prod-agua',         'CP-001', 'Agua San Luis 500ml',  'comprado',  'cat-otros',  1.20,  3.50,  48),
  mkProduct('prod-inca',         'CP-002', 'Inca Kola 500ml',      'comprado',  'cat-cold',   2.50,  5.00,  24),
  mkProduct('prod-coca',         'CP-003', 'Coca Cola 500ml',      'comprado',  'cat-cold',   2.50,  5.00,  18),
  mkProduct('prod-alfajor',      'CP-004', 'Alfajor Triple',       'comprado',  'cat-snacks', 1.80,  4.50,  30),
  mkProduct('prod-chocotejas',   'CP-005', 'Chocotejas x6',        'comprado',  'cat-snacks', 9.00, 18.00,  12),

  /* ── Combos ── */
  mkProduct('prod-combo-desayuno','CB-001','Combo Desayuno',       'combo',     'cat-combos', 4.00, 13.00, 999),
  mkProduct('prod-combo-tarde',  'CB-002', 'Combo Tarde',          'combo',     'cat-combos', 5.50, 16.00, 999),
  mkProduct('prod-combo-especial','CB-003','Combo Especial',       'combo',     'cat-combos', 8.00, 21.00, 999),
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMBO DETAILS
═══════════════════════════════════════════════════════════════════════════*/
export interface ComboDetailItem {
  name: string;
  quantity: number;
  emoji: string;
}

export const MOCK_COMBO_DETAILS: Record<string, ComboDetailItem[]> = {
  'prod-combo-desayuno': [
    { name: 'Café Americano',  quantity: 1, emoji: '☕' },
    { name: 'Pan de Yema',     quantity: 2, emoji: '🥐' },
    { name: 'Jugo Natural',    quantity: 1, emoji: '🥤' },
  ],
  'prod-combo-tarde': [
    { name: 'Café Latte',      quantity: 1, emoji: '☕' },
    { name: 'Alfajor Triple',  quantity: 2, emoji: '🍪' },
  ],
  'prod-combo-especial': [
    { name: 'Café Capuchino',  quantity: 1, emoji: '☕' },
    { name: 'Brownie',         quantity: 1, emoji: '🎂' },
    { name: 'Jugo Natural',    quantity: 1, emoji: '🥤' },
    { name: 'Chocotejas x6',   quantity: 1, emoji: '🍫' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   VARIACIONES
═══════════════════════════════════════════════════════════════════════════*/
export const MOCK_ATRIBUTOS: VariacionAtributo[] = [
  /* ── Café Latte: Tamaño ── */
  {
    id: 'attr-latte-tamano',
    productId: 'prod-latte',
    nombre: 'Tamaño',
    esRequerido: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    opciones: [
      { id: 'op-latte-regular', atributoId: 'attr-latte-tamano', nombre: 'Regular',    precioAjuste: 0,    isActive: true },
      { id: 'op-latte-grande',  atributoId: 'attr-latte-tamano', nombre: 'Grande',     precioAjuste: 3.00, isActive: true },
    ],
  },
  /* ── Café Latte: Leche ── */
  {
    id: 'attr-latte-leche',
    productId: 'prod-latte',
    nombre: 'Tipo de leche',
    esRequerido: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    opciones: [
      { id: 'op-latte-normal',  atributoId: 'attr-latte-leche', nombre: 'Normal',       precioAjuste: 0,    isActive: true },
      { id: 'op-latte-sinlac',  atributoId: 'attr-latte-leche', nombre: 'Sin lactosa',  precioAjuste: 2.00, isActive: true },
      { id: 'op-latte-oat',     atributoId: 'attr-latte-leche', nombre: 'Oat Milk',     precioAjuste: 3.00, isActive: true },
    ],
  },

  /* ── Cappuccino: Tamaño ── */
  {
    id: 'attr-capp-tamano',
    productId: 'prod-cappuccino',
    nombre: 'Tamaño',
    esRequerido: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    opciones: [
      { id: 'op-capp-regular', atributoId: 'attr-capp-tamano', nombre: 'Regular', precioAjuste: 0,    isActive: true },
      { id: 'op-capp-grande',  atributoId: 'attr-capp-tamano', nombre: 'Grande',  precioAjuste: 3.00, isActive: true },
    ],
  },

  /* ── Frappe: Sabor ── */
  {
    id: 'attr-frappe-sabor',
    productId: 'prod-frappe',
    nombre: 'Sabor',
    esRequerido: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    opciones: [
      { id: 'op-frappe-cafe',     atributoId: 'attr-frappe-sabor', nombre: 'Café',      precioAjuste: 0,    isActive: true },
      { id: 'op-frappe-vainilla', atributoId: 'attr-frappe-sabor', nombre: 'Vainilla',  precioAjuste: 0,    isActive: true },
      { id: 'op-frappe-caramelo', atributoId: 'attr-frappe-sabor', nombre: 'Caramelo',  precioAjuste: 1.00, isActive: true },
      { id: 'op-frappe-moka',     atributoId: 'attr-frappe-sabor', nombre: 'Moka',      precioAjuste: 1.00, isActive: true },
    ],
  },
  /* ── Frappe: Tamaño ── */
  {
    id: 'attr-frappe-tamano',
    productId: 'prod-frappe',
    nombre: 'Tamaño',
    esRequerido: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    opciones: [
      { id: 'op-frappe-regular', atributoId: 'attr-frappe-tamano', nombre: 'Regular', precioAjuste: 0,    isActive: true },
      { id: 'op-frappe-grande',  atributoId: 'attr-frappe-tamano', nombre: 'Grande',  precioAjuste: 3.00, isActive: true },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENTES
═══════════════════════════════════════════════════════════════════════════*/
export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1', code: 'C-001', name: 'María García',
    phone: '987 654 321', ruc: '12345678', totalPurchases: 15, isActive: true,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'cust-2', code: 'C-002', name: 'Carlos López',
    phone: '976 543 210', ruc: '87654321', totalPurchases: 5, isActive: true,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'cust-3', code: 'C-003', name: 'Ana Torres',
    phone: '965 432 109', ruc: '11223344', totalPurchases: 32, isActive: true,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'cust-4', code: 'C-004', name: 'Pedro Quispe',
    phone: '954 321 098', ruc: '44332211', totalPurchases: 68, isActive: true,
    createdAt: now, updatedAt: now,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FIDELIZACIÓN
═══════════════════════════════════════════════════════════════════════════*/
export const MOCK_LOYALTY_PROFILES: LoyaltyProfile[] = [
  {
    id: 'lp-1', customerId: 'cust-1', points: 250, lifetimePoints: 850,
    purchaseCount: 15, level: 'plata', referralCode: 'MARIA250', referralCount: 2,
    consecutiveDays: 3, uniqueProductsBought: ['prod-latte', 'prod-cappuccino'],
    completedMissions: [], createdAt: now, updatedAt: now,
  },
  {
    id: 'lp-2', customerId: 'cust-2', points: 85, lifetimePoints: 210,
    purchaseCount: 5, level: 'bronce', referralCode: 'CARLOS85', referralCount: 0,
    consecutiveDays: 1, uniqueProductsBought: ['prod-americano'],
    completedMissions: [], createdAt: now, updatedAt: now,
  },
  {
    id: 'lp-3', customerId: 'cust-3', points: 520, lifetimePoints: 2100,
    purchaseCount: 32, level: 'oro', referralCode: 'ANA520', referralCount: 5,
    consecutiveDays: 7, uniqueProductsBought: ['prod-frappe', 'prod-cheesecake', 'prod-latte'],
    completedMissions: ['mission-1'], createdAt: now, updatedAt: now,
  },
  {
    id: 'lp-4', customerId: 'cust-4', points: 1250, lifetimePoints: 5400,
    purchaseCount: 68, level: 'platino', referralCode: 'PEDRO1250', referralCount: 12,
    consecutiveDays: 15, uniqueProductsBought: ['prod-latte', 'prod-frappe', 'prod-combo-desayuno'],
    completedMissions: ['mission-1', 'mission-2'], createdAt: now, updatedAt: now,
  },
];

export const MOCK_MILESTONES: MilestoneReward[] = [
  { purchaseNumber: 5,  reward: 'Café Americano gratis',   icon: '☕', description: 'Por tu 5ta compra' },
  { purchaseNumber: 10, reward: 'Combo Desayuno gratis',   icon: '🎁', description: 'Por tu 10ma compra' },
  { purchaseNumber: 25, reward: '20% de descuento',        icon: '⭐', description: 'Por tu 25ava compra' },
];

export const MOCK_REWARDS: Reward[] = [
  { id: 'rw-1', name: 'Café Americano gratis', description: 'Un americano de cualquier tamaño',  pointsCost: 80,  category: 'diario',       icon: '☕', isActive: true, productId: 'prod-americano'      },
  { id: 'rw-2', name: 'Cappuccino gratis',     description: 'Un cappuccino caliente',             pointsCost: 120, category: 'diario',       icon: '☕', isActive: true, productId: 'prod-cappuccino'     },
  { id: 'rw-3', name: 'Cheesecake gratis',     description: 'Cheesecake de maracuyá del día',    pointsCost: 150, category: 'diario',       icon: '🍰', isActive: true, productId: 'prod-cheesecake'     },
  { id: 'rw-4', name: 'Combo Desayuno gratis', description: 'Bebida + pan + jugo',                pointsCost: 280, category: 'premio_mayor', icon: '🎁', isActive: true, productId: 'prod-combo-desayuno', highlight: true },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK addSale — simula la creación de una venta en backend
═══════════════════════════════════════════════════════════════════════════*/
let _saleCounter = 1;

export const mockAddSale = (input: SaleInput): Promise<Sale> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const subtotal = input.items.reduce((s) => s, 0); // simplificado
      const discount = input.discount ?? 0;
      const tax = (subtotal - discount) * ((input.taxPercentage ?? 18) / 100);
      const total = input.paymentMethods.reduce((s, pm) => s + pm.amount, 0);
      const sale: Sale = {
        id:        `sale-mock-${Date.now()}`,
        code:      `V-${String(_saleCounter++).padStart(4, '0')}`,
        date:      new Date(),
        customerId: input.customerId,
        items:     [],
        subtotal,
        discount,
        tax,
        taxPercentage: input.taxPercentage ?? 18,
        total,
        paymentMethods: input.paymentMethods.map((pm, i) => ({
          id:     `pm-${i}`,
          type:   pm.type,
          name:   pm.type,
          amount: pm.amount,
        })),
        status:      'completed',
        cashierId:   'cashier-mock',
        branchId:    'branch-mock',
        createdAt:   new Date(),
        updatedAt:   new Date(),
      };
      resolve(sale);
    }, 300); // simula latencia
  });
};

/* mock generateInvoice — solo devuelve un objeto vacío */
export const mockGenerateInvoice = (_saleId: string, _billing: unknown): Promise<unknown> =>
  new Promise(resolve => setTimeout(() => resolve({ id: `inv-${Date.now()}` }), 200));
