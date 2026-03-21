import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/inventory/ProductsPage';
import CategoriesPage from './pages/inventory/CategoriesPage';
import AdjustmentsPage from './pages/inventory/AdjustmentsPage';
import KardexPage from './pages/inventory/KardexPage';
import { SalesListPage } from './pages/sales/SalesListPage';
import { POSPage } from './pages/sales/POSPage';
import { CustomersPage } from './pages/sales/CustomersPage';
import { QuotesPage } from './pages/sales/QuotesPage';
import { PurchaseOrdersPage } from './pages/purchases/PurchaseOrdersPage';
import { SuppliersPage } from './pages/purchases/SuppliersPage';
import { PayablesPage } from './pages/purchases/PayablesPage';
import { CashRegisterPage } from './pages/cash/CashRegisterPage';
import { MovementsPage } from './pages/cash/MovementsPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import PurchasesReportPage from './pages/reports/PurchasesReportPage';
import CashReportPage from './pages/reports/CashReportPage';
import SettingsPage from './pages/settings/SettingsPage';
import InsumosPage from './pages/recipes/InsumosPage';
import RecetasPage from './pages/recipes/RecetasPage';

// Stores
import { useInventoryStore, useSalesStore, usePurchasesStore, useCashStore } from './stores';

// Utils
import { initializeMockData } from './utils';

function App() {
  const inventoryStore = useInventoryStore();

  useEffect(() => {
    if (inventoryStore.products.length === 0) {
      initializeMockData({
        inventory: useInventoryStore.getState(),
        sales: useSalesStore.getState(),
        purchases: usePurchasesStore.getState(),
        cash: useCashStore.getState(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<ProductsPage />} />
        <Route path="/inventory/services" element={<ProductsPage servicesOnly />} />
        <Route path="/inventory/categories" element={<CategoriesPage />} />
        <Route path="/inventory/adjustments" element={<AdjustmentsPage />} />
        <Route path="/inventory/kardex" element={<KardexPage />} />

        {/* Sales */}
        <Route path="/sales/pos" element={<POSPage />} />
        <Route path="/sales" element={<SalesListPage />} />
        <Route path="/sales/customers" element={<CustomersPage />} />
        <Route path="/sales/quotes" element={<QuotesPage />} />

        {/* Purchases */}
        <Route path="/purchases/orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchases/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases/payables" element={<PayablesPage />} />

        {/* Cash */}
        <Route path="/cash/register" element={<CashRegisterPage />} />
        <Route path="/cash/movements" element={<MovementsPage />} />

        {/* Reports */}
        <Route path="/reports/sales" element={<SalesReportPage />} />
        <Route path="/reports/inventory" element={<InventoryReportPage />} />
        <Route path="/reports/purchases" element={<PurchasesReportPage />} />
        <Route path="/reports/cash" element={<CashReportPage />} />

        {/* Recipes */}
        <Route path="/recipes/insumos" element={<InsumosPage />} />
        <Route path="/recipes/recetas" element={<RecetasPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/*" element={<SettingsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
