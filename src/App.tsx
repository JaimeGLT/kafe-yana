import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import LoginPage from './pages/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Contexts
import { AuthProvider, UIProvider, SettingsProvider, NotificationsProvider, PuntoVentaProvider } from './contexts';
import { ToastProvider } from './components/ui';
import { PageLoader } from './components/ui/PageLoader';
 
// Pages — lazy loaded
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const ProductsPage         = lazy(() => import('./pages/inventory/ProductsPage'));
const CategoriesPage       = lazy(() => import('./pages/inventory/CategoriesPage'));
const AdjustmentsPage      = lazy(() => import('./pages/inventory/AdjustmentsPage'));
const KardexPage           = lazy(() => import('./pages/inventory/KardexPage'));
const ElaboradosPage       = lazy(() => import('./pages/inventory/ElaboradosPage'));
const CombosPage           = lazy(() => import('./pages/inventory/CombosPage'));
const VariacionesPage      = lazy(() => import('./pages/inventory/VariacionesPage'));
const SalesListPage        = lazy(() => import('./pages/sales/SalesListPage').then(m => ({ default: m.SalesListPage })));
const POSPage              = lazy(() => import('./pages/sales/POSPage').then(m => ({ default: m.POSPage })));
const CustomersPage        = lazy(() => import('./pages/sales/CustomersPage').then(m => ({ default: m.CustomersPage })));

const FidelizacionPage            = lazy(() => import('./pages/fidelizacion/FidelizacionPage').then(m => ({ default: m.FidelizacionPage })));
const PromocionesPermanentesPage  = lazy(() => import('./pages/fidelizacion/PromocionesPermanentesPage').then(m => ({ default: m.PromocionesPermanentesPage })));
const PromocionesTemporadaPage    = lazy(() => import('./pages/fidelizacion/PromocionesTemporadaPage').then(m => ({ default: m.PromocionesTemporadaPage })));
const HitosPage                   = lazy(() => import('./pages/fidelizacion/HitosPage').then(m => ({ default: m.HitosPage })));
const SorteosPage                 = lazy(() => import('./pages/fidelizacion/SorteosPage').then(m => ({ default: m.SorteosPage })));
const ReferidosPage               = lazy(() => import('./pages/fidelizacion/ReferidosPage').then(m => ({ default: m.ReferidosPage })));
const ConfiguracionPuntosPage     = lazy(() => import('./pages/fidelizacion/ConfiguracionPuntosPage').then(m => ({ default: m.ConfiguracionPuntosPage })));
const ProductosCanjeablesPage     = lazy(() => import('./pages/fidelizacion/ProductosCanjeablesPage').then(m => ({ default: m.ProductosCanjeablesPage })));
const NotificacionesPage          = lazy(() => import('./pages/fidelizacion/NotificacionesPage').then(m => ({ default: m.NotificacionesPage })));
const PurchaseOrdersPage   = lazy(() => import('./pages/purchases/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const SuppliersPage        = lazy(() => import('./pages/purchases/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const CashRegisterPage     = lazy(() => import('./pages/cash/CashRegisterPage').then(m => ({ default: m.CashRegisterPage })));
const SalesReportPage      = lazy(() => import('./pages/reports/SalesReportPage'));
const InventoryReportPage  = lazy(() => import('./pages/reports/InventoryReportPage'));
const PurchasesReportPage  = lazy(() => import('./pages/reports/PurchasesReportPage'));
const CashReportPage       = lazy(() => import('./pages/reports/CashReportPage'));
const DailyCashReportPage       = lazy(() => import('./pages/reports/DailyCashReportPage'));
const MonthlyProductsReportPage = lazy(() => import('./pages/reports/MonthlyProductsReportPage'));
const SettingsIndexPage    = lazy(() => import('./pages/settings/SettingsIndexPage').then(m => ({ default: m.SettingsIndexPage })));
const SettingsUsersPage    = lazy(() => import('./pages/settings/SettingsUsersPage').then(m => ({ default: m.SettingsUsersPage })));
const InsumosPage          = lazy(() => import('./pages/recipes/InsumosPage'));
const RecetasPage          = lazy(() => import('./pages/recipes/RecetasPage'));

const ADMIN = 'admin';
const CAJERO = 'cajero';
const MESERO = 'mesero';
const ALL = [ADMIN, CAJERO, MESERO];
const ADMIN_CAJERO = [ADMIN, CAJERO];

function App() {
  return (
    <AuthProvider>
      <PuntoVentaProvider>
        <SettingsProvider>
          <UIProvider>
            <ToastProvider>
              <NotificationsProvider>
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Ruta pública */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* Dashboard — solo admin */}
                      <Route path="/" element={<ProtectedRoute allowedRoles={[ADMIN]}><DashboardPage /></ProtectedRoute>} />

                      {/* Inventory — admin + cajero */}
                      <Route path="/inventory/products"    element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><ProductsPage /></ProtectedRoute>} />
                      <Route path="/inventory/categories"  element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CategoriesPage /></ProtectedRoute>} />
                      <Route path="/inventory/adjustments" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><AdjustmentsPage /></ProtectedRoute>} />
                      <Route path="/inventory/kardex"      element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><KardexPage /></ProtectedRoute>} />
                      <Route path="/inventory/elaborados"  element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><ElaboradosPage /></ProtectedRoute>} />
                      <Route path="/inventory/combos"      element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CombosPage /></ProtectedRoute>} />
                      <Route path="/inventory/variations"  element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><VariacionesPage /></ProtectedRoute>} />

                      {/* Sales */}
                      <Route path="/sales/pos"       element={<ProtectedRoute allowedRoles={ALL}><POSPage /></ProtectedRoute>} />
                      <Route path="/sales"           element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><SalesListPage /></ProtectedRoute>} />
                      <Route path="/sales/customers" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CustomersPage /></ProtectedRoute>} />

                      {/* Fidelización — admin + cajero */}
                      <Route path="/fidelizacion"                         element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><FidelizacionPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/config"                  element={<ProtectedRoute allowedRoles={[ADMIN]}><ConfiguracionPuntosPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/productos"               element={<ProtectedRoute allowedRoles={[ADMIN]}><ProductosCanjeablesPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/notificaciones"          element={<ProtectedRoute allowedRoles={[ADMIN]}><NotificacionesPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/promociones-permanentes" element={<ProtectedRoute allowedRoles={[ADMIN]}><PromocionesPermanentesPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/promociones-temporada"   element={<ProtectedRoute allowedRoles={[ADMIN]}><PromocionesTemporadaPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/hitos"                   element={<ProtectedRoute allowedRoles={[ADMIN]}><HitosPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/sorteos"                 element={<ProtectedRoute allowedRoles={[ADMIN]}><SorteosPage /></ProtectedRoute>} />
                      <Route path="/fidelizacion/referidos"               element={<ProtectedRoute allowedRoles={[ADMIN]}><ReferidosPage /></ProtectedRoute>} />

                      {/* Purchases — solo admin */}
                      <Route path="/purchases/orders"    element={<ProtectedRoute allowedRoles={[ADMIN]}><PurchaseOrdersPage /></ProtectedRoute>} />
                      <Route path="/purchases/suppliers" element={<ProtectedRoute allowedRoles={[ADMIN]}><SuppliersPage /></ProtectedRoute>} />

                      {/* Cash — admin + cajero */}
                      <Route path="/cash/register" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><CashRegisterPage /></ProtectedRoute>} />

                      {/* Reports — solo admin */}
                      <Route path="/reports/sales"     element={<ProtectedRoute allowedRoles={[ADMIN]}><SalesReportPage /></ProtectedRoute>} />
                      <Route path="/reports/inventory" element={<ProtectedRoute allowedRoles={[ADMIN]}><InventoryReportPage /></ProtectedRoute>} />
                      <Route path="/reports/purchases" element={<ProtectedRoute allowedRoles={[ADMIN]}><PurchasesReportPage /></ProtectedRoute>} />
                      <Route path="/reports/cash"      element={<ProtectedRoute allowedRoles={[ADMIN]}><CashReportPage /></ProtectedRoute>} />
                      <Route path="/reports/daily"     element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><DailyCashReportPage /></ProtectedRoute>} />
                      <Route path="/reports/monthly"   element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><MonthlyProductsReportPage /></ProtectedRoute>} />

                      {/* Recipes — admin + cajero */}
                      <Route path="/recipes/insumos" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><InsumosPage /></ProtectedRoute>} />
                      <Route path="/recipes/recetas" element={<ProtectedRoute allowedRoles={ADMIN_CAJERO}><RecetasPage /></ProtectedRoute>} />

                      {/* Settings */}
                      <Route path="/settings"         element={<SettingsIndexPage />} />
                      <Route path="/settings/profile" element={<ProtectedRoute allowedRoles={ALL}><SettingsIndexPage /></ProtectedRoute>} />
                      <Route path="/settings/users"   element={<ProtectedRoute allowedRoles={[ADMIN]}><SettingsUsersPage /></ProtectedRoute>} />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </NotificationsProvider>
            </ToastProvider>
          </UIProvider>
        </SettingsProvider>
      </PuntoVentaProvider>
    </AuthProvider>
  );
}

export default App;
