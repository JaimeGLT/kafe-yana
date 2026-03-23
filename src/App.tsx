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
import { FidelizacionPage } from './pages/sales/FidelizacionPage';
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
import ElaboradosPage from './pages/inventory/ElaboradosPage';
import CombosPage from './pages/inventory/CombosPage';
import VariacionesPage from './pages/inventory/VariacionesPage';

// Auth
import LoginPage from './pages/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

// Stores
import { useInventoryStore, useSalesStore, usePurchasesStore, useCashStore } from './stores';

// Utils
import { initializeMockData } from './utils';

function App() {
  const inventoryStore = useInventoryStore();
  const { checkSession } = useAuthStore();

  useEffect(() => {
    // Verifica sesión activa con el backend al arrancar la app
    checkSession();
  }, [checkSession]);

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
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Todas las rutas protegidas requieren sesión activa */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/inventory/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/inventory/adjustments" element={<ProtectedRoute><AdjustmentsPage /></ProtectedRoute>} />
        <Route path="/inventory/kardex" element={<ProtectedRoute><KardexPage /></ProtectedRoute>} />
        <Route path="/inventory/elaborados" element={<ProtectedRoute><ElaboradosPage /></ProtectedRoute>} />
        <Route path="/inventory/combos" element={<ProtectedRoute><CombosPage /></ProtectedRoute>} />
        <Route path="/inventory/variations" element={<ProtectedRoute><VariacionesPage /></ProtectedRoute>} />

        {/* Sales */}
        <Route path="/sales/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesListPage /></ProtectedRoute>} />
        <Route path="/sales/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/sales/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
        <Route path="/sales/fidelizacion" element={<ProtectedRoute><FidelizacionPage /></ProtectedRoute>} />

        {/* Purchases */}
        <Route path="/purchases/orders" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/purchases/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchases/payables" element={<ProtectedRoute><PayablesPage /></ProtectedRoute>} />

        {/* Cash */}
        <Route path="/cash/register" element={<ProtectedRoute><CashRegisterPage /></ProtectedRoute>} />
        <Route path="/cash/movements" element={<ProtectedRoute><MovementsPage /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports/sales" element={<ProtectedRoute><SalesReportPage /></ProtectedRoute>} />
        <Route path="/reports/inventory" element={<ProtectedRoute><InventoryReportPage /></ProtectedRoute>} />
        <Route path="/reports/purchases" element={<ProtectedRoute><PurchasesReportPage /></ProtectedRoute>} />
        <Route path="/reports/cash" element={<ProtectedRoute><CashReportPage /></ProtectedRoute>} />

        {/* Recipes */}
        <Route path="/recipes/insumos" element={<ProtectedRoute><InsumosPage /></ProtectedRoute>} />
        <Route path="/recipes/recetas" element={<ProtectedRoute><RecetasPage /></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
