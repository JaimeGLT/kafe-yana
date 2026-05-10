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
import { FidelizacionPage } from './pages/sales/FidelizacionPage';
import { PromocionesPermanentesPage } from './pages/sales/PromocionesPermanentesPage';
import { PromocionesTemporadaPage } from './pages/sales/PromocionesTemporadaPage';
import { HitosPage } from './pages/sales/HitosPage';
import { SorteosPage } from './pages/sales/SorteosPage';
import { ReferidosPage } from './pages/sales/ReferidosPage';
import { ConfiguracionPuntosPage } from './pages/sales/ConfiguracionPuntosPage';
import { ProductosCanjeablesPage } from './pages/sales/ProductosCanjeablesPage';
import { NotificacionesPage } from './pages/sales/NotificacionesPage';
import { PurchaseOrdersPage } from './pages/purchases/PurchaseOrdersPage';
import { SuppliersPage } from './pages/purchases/SuppliersPage';
import { CashRegisterPage } from './pages/cash/CashRegisterPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import PurchasesReportPage from './pages/reports/PurchasesReportPage';
import CashReportPage from './pages/reports/CashReportPage';
// import SettingsPage from './pages/settings/SettingsPage';
import InsumosPage from './pages/recipes/InsumosPage';
import RecetasPage from './pages/recipes/RecetasPage';
import ElaboradosPage from './pages/inventory/ElaboradosPage';
import CombosPage from './pages/inventory/CombosPage';
import VariacionesPage from './pages/inventory/VariacionesPage';

// Auth
import LoginPage from './pages/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Contexts
import { AuthProvider, UIProvider, SettingsProvider } from './contexts';
import { ToastProvider } from './components/ui';

const ADMIN = 'admin';
const CAJERO = 'cajero';
const MESERO = 'mesero';
const ALL = [ADMIN, CAJERO, MESERO];
const ADMIN_CAJERO = [ADMIN, CAJERO];

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <UIProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Ruta pública */}
                <Route path="/login" element={<LoginPage />} />

                {/* Dashboard — solo admin */}
                <Route path="/" element={<ProtectedRoute allowedRoles={[ADMIN]}><DashboardPage /></ProtectedRoute>} />

                {/* Inventory — solo admin */}
                <Route path="/inventory/products"    element={<ProtectedRoute allowedRoles={[ADMIN]}><ProductsPage /></ProtectedRoute>} />
                <Route path="/inventory/categories"  element={<ProtectedRoute allowedRoles={[ADMIN]}><CategoriesPage /></ProtectedRoute>} />
                <Route path="/inventory/adjustments" element={<ProtectedRoute allowedRoles={[ADMIN]}><AdjustmentsPage /></ProtectedRoute>} />
                <Route path="/inventory/kardex"      element={<ProtectedRoute allowedRoles={[ADMIN]}><KardexPage /></ProtectedRoute>} />
                <Route path="/inventory/elaborados"  element={<ProtectedRoute allowedRoles={[ADMIN]}><ElaboradosPage /></ProtectedRoute>} />
                <Route path="/inventory/combos"      element={<ProtectedRoute allowedRoles={[ADMIN]}><CombosPage /></ProtectedRoute>} />
                <Route path="/inventory/variations"  element={<ProtectedRoute allowedRoles={[ADMIN]}><VariacionesPage /></ProtectedRoute>} />

                {/* Sales */}
                <Route path="/sales/pos"       element={<ProtectedRoute allowedRoles={ALL}><POSPage /></ProtectedRoute>} />
                <Route path="/sales"           element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><SalesListPage /></ProtectedRoute>} />
                <Route path="/sales/customers" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CustomersPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion"                          element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><FidelizacionPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/config"                   element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><ConfiguracionPuntosPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/productos"                element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><ProductosCanjeablesPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/notificaciones"           element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><NotificacionesPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/promociones-permanentes"  element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><PromocionesPermanentesPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/promociones-temporada"    element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><PromocionesTemporadaPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/hitos"                    element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><HitosPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/sorteos"                  element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><SorteosPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/referidos"                element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><ReferidosPage /></ProtectedRoute>} />

                {/* Purchases — solo admin */}
                <Route path="/purchases/orders"    element={<ProtectedRoute allowedRoles={[ADMIN]}><PurchaseOrdersPage /></ProtectedRoute>} />
                <Route path="/purchases/suppliers" element={<ProtectedRoute allowedRoles={[ADMIN]}><SuppliersPage /></ProtectedRoute>} />

                {/* Cash — admin + cajero */}
                <Route path="/cash/register" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CashRegisterPage /></ProtectedRoute>} />

                {/* Reports — solo admin */}
                <Route path="/reports/sales"      element={<ProtectedRoute allowedRoles={[ADMIN]}><SalesReportPage /></ProtectedRoute>} />
                <Route path="/reports/inventory"  element={<ProtectedRoute allowedRoles={[ADMIN]}><InventoryReportPage /></ProtectedRoute>} />
                <Route path="/reports/purchases"  element={<ProtectedRoute allowedRoles={[ADMIN]}><PurchasesReportPage /></ProtectedRoute>} />
                <Route path="/reports/cash"       element={<ProtectedRoute allowedRoles={[ADMIN]}><CashReportPage /></ProtectedRoute>} />

                {/* Recipes — solo admin */}
                <Route path="/recipes/insumos"  element={<ProtectedRoute allowedRoles={[ADMIN]}><InsumosPage /></ProtectedRoute>} />
                <Route path="/recipes/recetas"  element={<ProtectedRoute allowedRoles={[ADMIN]}><RecetasPage /></ProtectedRoute>} />

                {/* Settings — solo admin */}
                {/* <Route path="/settings"   element={<ProtectedRoute allowedRoles={[ADMIN]}><SettingsPage /></ProtectedRoute>} /> */}
                {/* <Route path="/settings/*" element={<ProtectedRoute allowedRoles={[ADMIN]}><SettingsPage /></ProtectedRoute>} /> */}

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </UIProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
