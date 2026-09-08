import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { ToastProvider } from "../components/ui/ToastContext";
import { AppLayout } from "../components/layout/AppLayout";
import { SkeletonRows } from "../components/Skeleton";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Lazy-loaded routes for code splitting & bundle optimization
const LoginPage = lazy(() => import("../pages/login/LoginPage"));
const OverviewPage = lazy(() => import("../pages/overview/OverviewPage"));
const InvoicesPage = lazy(() => import("../pages/invoices/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("../pages/invoices/InvoiceDetailPage"));
const SuppliersPage = lazy(() => import("../pages/suppliers/SuppliersPage"));
const InboxPage = lazy(() => import("../pages/inbox/InboxPage"));
const ExceptionsPage = lazy(() => import("../pages/exceptions/ExceptionsPage"));
const ApprovalsPage = lazy(() => import("../pages/approvals/ApprovalsPage"));
const PaymentsPage = lazy(() => import("../pages/payments/PaymentsPage"));
const PurchaseOrdersPage = lazy(() => import("../pages/purchase-orders/PurchaseOrdersPage"));
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const ArchivePage = lazy(() => import("../pages/archive/ArchivePage"));
const NotificationsPage = lazy(() => import("../pages/notifications/NotificationsPage"));
const ProfilePage = lazy(() => import("../pages/profile/ProfilePage"));
const VendorInvoiceTrackPage = lazy(() => import("../pages/public/VendorInvoiceTrackPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

// Eagerly prefetch primary demo routes when browser is idle to ensure 0ms tab switching
function useRoutePrefetch() {
  useEffect(() => {
    const prefetch = () => {
      import("../pages/overview/OverviewPage");
      import("../pages/invoices/InvoicesPage");
      import("../pages/exceptions/ExceptionsPage");
      import("../pages/payments/PaymentsPage");
      import("../pages/suppliers/SuppliersPage");
      import("../pages/purchase-orders/PurchaseOrdersPage");
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 400);
    }
  }, []);
}

function PageFallback() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SkeletonRows count={6} />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  useRoutePrefetch();

  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/login" replace />;

  return <AppLayout />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/track/:token" element={<VendorInvoiceTrackPage />} />
                <Route path="/invoices/track/:token" element={<VendorInvoiceTrackPage />} />

                <Route element={<ProtectedRoutes />}>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
                  <Route path="/exceptions" element={<ExceptionsPage />} />
                  <Route path="/approvals" element={<ApprovalsPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/archive" element={<ArchivePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
