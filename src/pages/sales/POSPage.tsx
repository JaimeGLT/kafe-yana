import React from 'react';
import { clsx } from 'clsx';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Coffee,
  CheckCircle,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Button, Badge, Select, Modal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useSalesStore, useInventoryStore } from '../../stores';
import { formatCurrency, getPaymentMethodLabel } from '../../utils';
import type { Product, SaleInput, PaymentMethodType } from '../../types';

interface CartItem {
  product: Product;
  quantity: number;
}

const TAX_RATE = 0.18;

const paymentMethods: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
  { type: 'card', label: 'Tarjeta', icon: <CreditCard className="h-4 w-4" /> },
  { type: 'transfer', label: 'Yape / Plin', icon: <Smartphone className="h-4 w-4" /> },
  { type: 'credit', label: 'Crédito', icon: <UserCheck className="h-4 w-4" /> },
];

export const POSPage: React.FC = () => {
  const { products, categories } = useInventoryStore();
  const { customers, addSale } = useSalesStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>('cash');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [successModal, setSuccessModal] = React.useState<{ open: boolean; sale?: ReturnType<typeof addSale> }>({ open: false });
  const [addedProductId, setAddedProductId] = React.useState<string | null>(null);

  const activeCategories = React.useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const cartSubtotal = React.useMemo(
    () => cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0),
    [cart]
  );
  const cartTax = cartSubtotal * TAX_RATE;
  const cartTotal = cartSubtotal + cartTax;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Flash animation
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 400);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setPaymentMethod('cash');
  };

  const getStockColor = (product: Product) => {
    if (product.isService) return 'success';
    if (product.stock <= 0) return 'danger';
    if (product.stock <= product.minStock) return 'warning';
    return 'success';
  };

  const getStockLabel = (product: Product) => {
    if (product.isService) return 'Servicio';
    if (product.stock <= 0) return 'Agotado';
    if (product.stock <= product.minStock) return `${product.stock} (bajo)`;
    return `${product.stock} en stock`;
  };

  const handleProcessSale = () => {
    if (cart.length === 0) {
      toast.warning('Carrito vacío', 'Agrega productos al carrito para continuar.');
      return;
    }

    setIsProcessing(true);
    try {
      const saleInput: SaleInput = {
        customerId: selectedCustomerId || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: 0,
        })),
        taxPercentage: 18,
        paymentMethods: [{ type: paymentMethod, amount: cartTotal }],
      };

      const newSale = addSale(saleInput);
      setSuccessModal({ open: true, sale: newSale });
    } catch {
      toast.error('Error al procesar', 'No se pudo registrar la venta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModal({ open: false });
    clearCart();
  };

  const customerOptions = [
    { value: '', label: 'Cliente General' },
    ...customers
      .filter((c) => c.isActive)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <MainLayout>
      {/* Full height POS layout — remove default p-6 padding effect via negative margin trick */}
      <div className="-m-6 h-[calc(100vh-4rem)] flex overflow-hidden bg-cafe-primary">
        {/* ── LEFT PANEL: Product Browser ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Search */}
          <div className="px-5 pt-4 pb-3 bg-white border-b border-coffee-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-coffee-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 focus:border-transparent bg-coffee-50 placeholder-coffee-400"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="px-5 py-3 bg-white border-b border-coffee-100 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={clsx(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                selectedCategory === 'all'
                  ? 'bg-coffee-500 text-white shadow-sm'
                  : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'
              )}
            >
              Todos
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={clsx(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  selectedCategory === cat.id
                    ? 'bg-coffee-500 text-white shadow-sm'
                    : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-coffee-400 gap-3">
                <Coffee className="h-16 w-16 opacity-30" />
                <p className="text-lg font-medium">Sin productos</p>
                <p className="text-sm">Intenta con otra búsqueda o categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isAdded = addedProductId === product.id;
                  const outOfStock = !product.isService && product.stock <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      disabled={outOfStock}
                      className={clsx(
                        'relative bg-white rounded-2xl border p-4 text-left',
                        'transition-all duration-200 group',
                        outOfStock
                          ? 'border-coffee-100 opacity-50 cursor-not-allowed'
                          : 'border-coffee-100 hover:border-coffee-300 hover:shadow-md cursor-pointer',
                        isAdded && 'scale-95 border-coffee-400 shadow-lg bg-coffee-50'
                      )}
                      style={{
                        transform: isAdded ? 'scale(0.97)' : undefined,
                      }}
                    >
                      {/* Product image placeholder */}
                      <div className="h-20 rounded-xl bg-coffee-100 flex items-center justify-center mb-3 overflow-hidden group-hover:bg-coffee-200 transition-colors">
                        <Coffee className="h-8 w-8 text-coffee-400" />
                      </div>

                      <h3 className="font-display font-semibold text-coffee-900 text-sm leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </h3>

                      <p className="text-coffee-900 font-semibold text-base mb-2">
                        {formatCurrency(product.salePrice)}
                      </p>

                      <Badge variant={getStockColor(product)} size="sm">
                        {getStockLabel(product)}
                      </Badge>

                      {/* Add indicator */}
                      {isAdded && (
                        <div className="absolute top-2 right-2 h-6 w-6 bg-coffee-500 rounded-full flex items-center justify-center">
                          <Plus className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Cart ─────────────────────────────────── */}
        <div className="w-80 xl:w-96 bg-white border-l border-coffee-200 flex flex-col shadow-xl">
          {/* Cart Header */}
          <div className="px-5 py-4 border-b border-coffee-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-coffee-600" />
              <h2 className="font-display font-bold text-coffee-900 text-lg">Orden</h2>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-coffee-500 text-white text-xs font-bold">
                  {cartCount}
                </span>
              )}
            </div>
          </div>

          {/* Customer Selector */}
          <div className="px-5 py-3 border-b border-coffee-100">
            <Select
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={customerOptions}
              placeholder="Cliente General"
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-coffee-300 gap-3 py-12">
                <Coffee className="h-16 w-16 opacity-40" />
                <p className="text-base font-medium text-coffee-400">Añade productos al carrito</p>
                <p className="text-sm text-coffee-300">Selecciona del panel izquierdo</p>
              </div>
            ) : (
              <div className="divide-y divide-coffee-50">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-coffee-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-coffee-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-coffee-500">
                        {formatCurrency(item.product.salePrice)} c/u
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="h-7 w-7 rounded-lg bg-coffee-100 flex items-center justify-center hover:bg-coffee-200 transition-colors"
                      >
                        <Minus className="h-3 w-3 text-coffee-600" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-coffee-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="h-7 w-7 rounded-lg bg-coffee-100 flex items-center justify-center hover:bg-coffee-200 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-coffee-600" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <p className="text-sm font-semibold text-coffee-900 w-16 text-right flex-shrink-0">
                      {formatCurrency(item.product.salePrice * item.quantity)}
                    </p>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 text-coffee-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="px-5 py-3 border-t border-coffee-100">
            <p className="text-xs font-semibold text-coffee-500 uppercase tracking-wider mb-2">
              Método de Pago
            </p>
            <div className="grid grid-cols-4 gap-1">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.type}
                  onClick={() => setPaymentMethod(pm.type)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all duration-200',
                    paymentMethod === pm.type
                      ? 'bg-coffee-500 text-white shadow-sm'
                      : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'
                  )}
                >
                  {pm.icon}
                  <span className="leading-tight text-center">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-t border-coffee-200 bg-coffee-50 space-y-2">
            <div className="flex justify-between text-sm text-coffee-600">
              <span>Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-coffee-600">
              <span>IGV (18%)</span>
              <span>{formatCurrency(cartTax)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-coffee-200 pt-2">
              <span className="text-base font-bold text-coffee-900">Total</span>
              <span className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 space-y-2">
            <Button
              size="lg"
              className="w-full text-base font-bold bg-coffee-500 hover:bg-coffee-600 text-white"
              onClick={handleProcessSale}
              isLoading={isProcessing}
              disabled={cart.length === 0}
            >
              Procesar Venta {cart.length > 0 && formatCurrency(cartTotal)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-coffee-500"
              onClick={clearCart}
              disabled={cart.length === 0 || isProcessing}
            >
              Limpiar carrito
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModal.open}
        onClose={handleCloseSuccess}
        title="¡Venta Procesada!"
        size="md"
      >
        <div className="space-y-5">
          {/* Success icon */}
          <div className="flex flex-col items-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle className="h-9 w-9 text-green-500" />
            </div>
            <p className="text-lg font-display font-bold text-coffee-900">Venta Exitosa</p>
            {successModal.sale && (
              <p className="text-sm text-coffee-500 mt-1">Código: {successModal.sale.code}</p>
            )}
          </div>

          {/* Receipt summary */}
          {successModal.sale && (
            <div className="bg-coffee-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-coffee-700">
                <span>Cliente:</span>
                <span className="font-medium">{successModal.sale.customerName || 'Cliente General'}</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Productos:</span>
                <span className="font-medium">{successModal.sale.items.length} item(s)</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Método de pago:</span>
                <span className="font-medium">
                  {successModal.sale.paymentMethods.map((pm) => getPaymentMethodLabel(pm.type)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2 text-base">
                <span>Total cobrado:</span>
                <span>{formatCurrency(successModal.sale.total)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => toast.info('Imprimiendo', 'Enviando a la impresora...')}
            >
              Imprimir recibo
            </Button>
            <Button className="flex-1" onClick={handleCloseSuccess}>
              Nueva venta
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};
