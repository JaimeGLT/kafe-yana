import React from 'react';
import { clsx } from 'clsx';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Coffee,
  CheckCircle, Printer, CreditCard, Banknote, Smartphone,
  UserCheck, AlertTriangle, FlaskConical, BookOpen, Layers,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Button, Badge, Select, Modal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useSalesStore, useInventoryStore } from '../../stores';
import { useVariacionesStore } from '../../stores/variacionesStore';
import { formatCurrency, getPaymentMethodLabel } from '../../utils';
import type { Product, SaleInput, PaymentMethodType, OpcionSeleccionada } from '../../types';
import { useStockManager } from '../../hooks/useStockManager';
import type { StockIssue } from '../../hooks/useStockManager';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';

interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal: number;
  /** Unique key per cart entry (product+options combination) */
  cartKey: string;
}

const TAX_RATE = 0.18;

const paymentMethods: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
  { type: 'card', label: 'Tarjeta', icon: <CreditCard className="h-4 w-4" /> },
  { type: 'transfer', label: 'Yape / Plin', icon: <Smartphone className="h-4 w-4" /> },
  { type: 'credit', label: 'Crédito', icon: <UserCheck className="h-4 w-4" /> },
];

/** Build a stable cart key from product + selected option IDs */
const buildCartKey = (productId: string, opciones?: OpcionSeleccionada[]): string => {
  if (!opciones || opciones.length === 0) return productId;
  const opcionPart = opciones
    .slice()
    .sort((a, b) => a.atributoId.localeCompare(b.atributoId))
    .map((o) => `${o.atributoId}:${o.opcionId}`)
    .join('|');
  return `${productId}__${opcionPart}`;
};

export const POSPage: React.FC = () => {
  const { products, categories } = useInventoryStore();
  const { customers, addSale } = useSalesStore();
  const { getAtributosByProductId } = useVariacionesStore();
  const { getElaboradoAvailability, checkStock, deductStock } = useStockManager();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>('cash');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [addedProductId, setAddedProductId] = React.useState<string | null>(null);
  const [successModal, setSuccessModal] = React.useState<{ open: boolean; sale?: ReturnType<typeof addSale> }>({ open: false });
  const [stockWarningModal, setStockWarningModal] = React.useState<{
    open: boolean;
    issues: StockIssue[];
    onConfirm: () => void;
  }>({ open: false, issues: [], onConfirm: () => {} });

  // Variacion picker state
  const [varPickerProduct, setVarPickerProduct] = React.useState<Product | null>(null);

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
    () => cart.reduce((sum, item) => sum + item.precioFinal * item.quantity, 0),
    [cart]
  );
  const cartTax = cartSubtotal * TAX_RATE;
  const cartTotal = cartSubtotal + cartTax;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  /** Add item directly (no variations) */
  const addToCartDirect = (product: Product, opciones?: OpcionSeleccionada[], precioFinal?: number) => {
    const finalPrice = precioFinal ?? product.salePrice;
    const key = buildCartKey(product.id, opciones);

    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === key);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, opciones, precioFinal: finalPrice, cartKey: key }];
    });
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 400);
  };

  /** Called when user clicks a product card */
  const addToCart = (product: Product) => {
    const atributos = getAtributosByProductId(product.id);
    if (atributos.length > 0) {
      // Open variation picker
      setVarPickerProduct(product);
    } else {
      addToCartDirect(product);
    }
  };

  const handleVariacionConfirm = (opciones: OpcionSeleccionada[], precioFinal: number) => {
    if (!varPickerProduct) return;
    addToCartDirect(varPickerProduct, opciones, precioFinal);
    setVarPickerProduct(null);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setPaymentMethod('cash');
  };

  /** Computes display stock for any product type */
  const getEffectiveStock = (product: Product): { count: number; label: string; status: 'success' | 'warning' | 'danger' | 'info' } => {
    if (product.tipo === 'elaborado') {
      const avail = getElaboradoAvailability(product.id);
      if (avail === 0) return { count: 0, label: 'Sin insumos', status: 'danger' };
      if (avail <= 3) return { count: avail, label: `~${avail} posibles`, status: 'warning' };
      return { count: avail, label: `~${avail} posibles`, status: 'success' };
    }
    // comprado / combo
    if (product.stock <= 0) return { count: 0, label: 'Agotado', status: 'danger' };
    if (product.stock <= product.minStock) return { count: product.stock, label: `${product.stock} (bajo)`, status: 'warning' };
    return { count: product.stock, label: `${product.stock} en stock`, status: 'success' };
  };

  const isUnavailable = (product: Product): boolean => {
    const { count } = getEffectiveStock(product);
    return count === 0;
  };

  /** Process sale — check stock first, then confirm or warn */
  const processSale = () => {
    if (cart.length === 0) {
      toast.warning('Carrito vacío', 'Agrega productos al carrito para continuar.');
      return;
    }

    // Build a CartItem[] compatible with useStockManager
    const stockCart = cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      opciones: item.opciones,
      precioFinal: item.precioFinal,
    }));

    const { canProceed, issues } = checkStock(stockCart);

    if (!canProceed) {
      const blockers = issues.filter((i) => i.severity === 'error');
      toast.error(
        'No se puede procesar',
        blockers.map((i) => `${i.productName}: ${i.issue}`).join(' | ')
      );
      return;
    }

    if (issues.length > 0) {
      setStockWarningModal({
        open: true,
        issues,
        onConfirm: () => {
          setStockWarningModal((s) => ({ ...s, open: false }));
          doProcessSale();
        },
      });
      return;
    }

    doProcessSale();
  };

  const doProcessSale = () => {
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

      // Deduct stock for all items (passing opciones for variation logic)
      deductStock(cart.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        opciones: item.opciones,
        precioFinal: item.precioFinal,
      })));

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
    ...customers.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <MainLayout>
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
                  const { label: stockLabel, status: stockStatus } = getEffectiveStock(product);
                  const unavailable = isUnavailable(product);
                  const isAdded = addedProductId === product.id;
                  const isElaborado = product.tipo === 'elaborado';
                  const hasVariaciones = getAtributosByProductId(product.id).length > 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => !unavailable && addToCart(product)}
                      disabled={unavailable}
                      className={clsx(
                        'relative bg-white rounded-2xl border p-4 text-left',
                        'transition-all duration-200 group',
                        unavailable
                          ? 'border-coffee-100 opacity-50 cursor-not-allowed'
                          : 'border-coffee-100 hover:border-coffee-300 hover:shadow-md cursor-pointer',
                        isAdded && 'scale-95 border-coffee-400 shadow-lg bg-coffee-50'
                      )}
                    >
                      {/* Product image placeholder */}
                      <div className={clsx(
                        'h-20 rounded-xl flex items-center justify-center mb-3 overflow-hidden transition-colors',
                        isElaborado ? 'bg-amber-50 group-hover:bg-amber-100' :
                        'bg-coffee-100 group-hover:bg-coffee-200'
                      )}>
                        {isElaborado
                          ? <FlaskConical className="h-8 w-8 text-amber-400" />
                          : <Coffee className="h-8 w-8 text-coffee-400" />
                        }
                      </div>

                      <h3 className="font-display font-semibold text-coffee-900 text-sm leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </h3>

                      <p className="text-coffee-900 font-semibold text-base mb-2">
                        {formatCurrency(product.salePrice)}
                      </p>

                      <Badge variant={stockStatus} size="sm">
                        {stockLabel}
                      </Badge>

                      {/* Elaborado indicator */}
                      {isElaborado && (
                        <div className="absolute top-2 left-2">
                          <span className="text-xs bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5 font-medium">
                            Elaborado
                          </span>
                        </div>
                      )}

                      {/* Variaciones indicator */}
                      {hasVariaciones && (
                        <div className={clsx('absolute', isElaborado ? 'top-7 left-2' : 'top-2 left-2')}>
                          <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                            <Layers className="h-2.5 w-2.5" />
                            Var.
                          </span>
                        </div>
                      )}

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
                  <div key={item.cartKey} className="px-5 py-3 flex items-start gap-3 hover:bg-coffee-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-coffee-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      {/* Selected options */}
                      {item.opciones && item.opciones.length > 0 && (
                        <p className="text-xs text-coffee-500 mt-0.5 leading-tight">
                          {item.opciones.map((o) => o.opcionNombre).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-coffee-500">
                          {formatCurrency(item.precioFinal)} c/u
                        </p>
                        {item.product.tipo === 'elaborado' && (
                          <span className="text-xs bg-amber-100 text-amber-600 rounded px-1 font-medium">
                            <FlaskConical className="h-2.5 w-2.5 inline" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        onClick={() => updateQuantity(item.cartKey, -1)}
                        className="h-7 w-7 rounded-lg bg-coffee-100 flex items-center justify-center hover:bg-coffee-200 transition-colors"
                      >
                        <Minus className="h-3 w-3 text-coffee-600" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-coffee-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartKey, 1)}
                        className="h-7 w-7 rounded-lg bg-coffee-100 flex items-center justify-center hover:bg-coffee-200 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-coffee-600" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-coffee-900 w-16 text-right flex-shrink-0 mt-0.5">
                      {formatCurrency(item.precioFinal * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 text-coffee-400 hover:text-red-500 transition-colors mt-0.5"
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
              onClick={processSale}
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

      {/* Variacion Picker Modal */}
      {varPickerProduct && (
        <VariacionPickerModal
          isOpen={!!varPickerProduct}
          onClose={() => setVarPickerProduct(null)}
          product={varPickerProduct}
          atributos={getAtributosByProductId(varPickerProduct.id)}
          onConfirm={handleVariacionConfirm}
        />
      )}

      {/* Stock Warning Modal */}
      <Modal
        isOpen={stockWarningModal.open}
        onClose={() => setStockWarningModal((s) => ({ ...s, open: false }))}
        title="Advertencia de stock"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Hay problemas de stock en algunos productos. Puedes continuar de todas formas si el inventario está desactualizado.
            </p>
          </div>
          <ul className="space-y-2">
            {stockWarningModal.issues.map((issue, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-medium text-coffee-800 whitespace-nowrap">{issue.productName}:</span>
                <span className="text-coffee-600">{issue.issue}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setStockWarningModal((s) => ({ ...s, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={stockWarningModal.onConfirm}
            >
              Continuar de todas formas
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModal.open} onClose={handleCloseSuccess} title="¡Venta Procesada!" size="md">
        <div className="space-y-5">
          <div className="flex flex-col items-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle className="h-9 w-9 text-green-500" />
            </div>
            <p className="text-lg font-display font-bold text-coffee-900">Venta Exitosa</p>
            {successModal.sale && (
              <p className="text-sm text-coffee-500 mt-1">Código: {successModal.sale.code}</p>
            )}
            {cart.some((i) => i.product.tipo === 'elaborado') && (
              <div className="flex items-center gap-2 mt-3 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                <BookOpen className="h-3.5 w-3.5" />
                Ingredientes de los elaborados descontados del inventario
              </div>
            )}
          </div>

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
                <span>Método:</span>
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
