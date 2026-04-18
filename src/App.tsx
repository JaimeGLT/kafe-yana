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
import { ConfiguracionPuntosPage } from './pages/sales/ConfiguracionPuntosPage';
import { ProductosCanjeablesPage } from './pages/sales/ProductosCanjeablesPage';
import { NotificacionesPage } from './pages/sales/NotificacionesPage';
import { FidelizacionProximamentePage } from './pages/sales/FidelizacionProximamentePage';
import { PurchaseOrdersPage } from './pages/purchases/PurchaseOrdersPage';
import { SuppliersPage } from './pages/purchases/SuppliersPage';
import { CashRegisterPage } from './pages/cash/CashRegisterPage';
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

// Contexts
import { AuthProvider, UIProvider, SettingsProvider } from './contexts';
import { ToastProvider } from './components/ui';

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
                <Route path="/sales/fidelizacion" element={<ProtectedRoute><FidelizacionPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/config" element={<ProtectedRoute><ConfiguracionPuntosPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/productos" element={<ProtectedRoute><ProductosCanjeablesPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/notificaciones" element={<ProtectedRoute><NotificacionesPage /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/promociones-permanentes" element={<ProtectedRoute><FidelizacionProximamentePage title="Promociones permanentes" subtitle="Reglas de puntos activas todo el año" /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/promociones-temporada" element={<ProtectedRoute><FidelizacionProximamentePage title="Promociones de temporada" subtitle="Campañas especiales por fechas o meses" /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/hitos" element={<ProtectedRoute><FidelizacionProximamentePage title="Hitos por compra" subtitle="Recompensas automáticas al alcanzar cierto número de compras" /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/sorteos" element={<ProtectedRoute><FidelizacionProximamentePage title="Sorteos" subtitle="Crea sorteos entre clientes con puntos acumulados" /></ProtectedRoute>} />
                <Route path="/sales/fidelizacion/referidos" element={<ProtectedRoute><FidelizacionProximamentePage title="Referidos" subtitle="Premia a clientes que traen nuevos clientes al programa" /></ProtectedRoute>} />

                {/* Purchases */}
                <Route path="/purchases/orders" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
                <Route path="/purchases/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />

                {/* Cash */}
                <Route path="/cash/register" element={<ProtectedRoute><CashRegisterPage /></ProtectedRoute>} />

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
          </ToastProvider>
        </UIProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;