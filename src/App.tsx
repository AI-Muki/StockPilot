import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/hooks/use-theme';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppLayout } from '@/layouts/app-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { DashboardPage } from '@/pages/dashboard';
import { ProductsPage } from '@/pages/products/products';
import { ProductDetailPage } from '@/pages/products/product-detail';
import { CategoriesPage } from '@/pages/categories/categories';
import { WarehousesPage } from '@/pages/warehouses/warehouses';
import { WarehouseDetailPage } from '@/pages/warehouses/warehouse-detail';
import { ComingSoonPage } from '@/pages/coming-soon';
import { NotFoundState } from '@/components/states/states';
import {
  Boxes,
  ArrowLeftRight,
  SlidersHorizontal,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  BarChart3,
  FileText,
  Bot,
  UserCog,
  Bell,
  ScrollText,
  Settings,
} from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Products */}
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />

              {/* Categories */}
              <Route path="/categories" element={<CategoriesPage />} />

              {/* Warehouses */}
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />

              {/* Inventory (still coming soon) */}
              <Route path="/inventory" element={<ComingSoonPage title="Inventory" icon={Boxes} />} />
              <Route path="/stock-movements" element={<ComingSoonPage title="Stock Movements" icon={ArrowLeftRight} />} />
              <Route path="/transfers" element={<ComingSoonPage title="Transfers" icon={ArrowLeftRight} />} />
              <Route path="/adjustments" element={<ComingSoonPage title="Adjustments" icon={SlidersHorizontal} />} />

              {/* Orders */}
              <Route path="/purchase-orders" element={<ComingSoonPage title="Purchase Orders" icon={ShoppingCart} />} />
              <Route path="/sales-orders" element={<ComingSoonPage title="Sales Orders" icon={Truck} />} />

              {/* Contacts */}
              <Route path="/customers" element={<ComingSoonPage title="Customers" icon={Users} />} />
              <Route path="/suppliers" element={<ComingSoonPage title="Suppliers" icon={Building2} />} />

              {/* Analytics */}
              <Route path="/analytics" element={<ComingSoonPage title="Analytics" icon={BarChart3} />} />
              <Route path="/reports" element={<ComingSoonPage title="Reports" icon={FileText} />} />
              <Route path="/ai-assistant" element={<ComingSoonPage title="AI Assistant" icon={Bot} />} />

              {/* Administration */}
              <Route path="/users" element={<ComingSoonPage title="Users" icon={UserCog} />} />
              <Route path="/notifications" element={<ComingSoonPage title="Notifications" icon={Bell} />} />
              <Route path="/audit-logs" element={<ComingSoonPage title="Audit Logs" icon={ScrollText} />} />
              <Route path="/settings" element={<ComingSoonPage title="Settings" icon={Settings} />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundState />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
