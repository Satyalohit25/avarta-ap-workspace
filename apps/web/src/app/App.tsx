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
const InvoiceDetailPage = lazy(
  () => import("../pages/invoices/InvoiceDetailPage"),
);
const SuppliersPage = lazy(() => import("../pages/suppliers/SuppliersPage"));
const InboxPage = lazy(() => import("../pages/inbox/InboxPage"));
const ExceptionsPage = lazy(() => import("../pages/exceptions/ExceptionsPage"));
const ApprovalsPage = lazy(() => import("../pages/approvals/ApprovalsPage"));
const PaymentsPage = lazy(() => import("../pages/payments/PaymentsPage"));
const PurchaseOrdersPage = lazy(
  () => import("../pages/purchase-orders/PurchaseOrdersPage"),
);
const ItemsPage = lazy(() => import("../pages/items/ItemsPage"));
const BankAccountsPage = lazy(
  () => import("../pages/bank-accounts/BankAccountsPage"),
);
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const ArchivePage = lazy(() => import("../pages/archive/ArchivePage"));
const NotificationsPage = lazy(
  () => import("../pages/notifications/NotificationsPage"),
);
const ProfilePage = lazy(() => import("../pages/profile/ProfilePage"));
const VendorInvoiceTrackPage = lazy(
  () => import("../pages/public/VendorInvoiceTrackPage"),
);
const PrivacyPolicyPage = lazy(
  () => import("../pages/public/PrivacyPolicyPage"),
);
const TermsOfServicePage = lazy(
  () => import("../pages/public/TermsOfServicePage"),
);
const DpaPage = lazy(() => import("../pages/public/DpaPage"));
const SubprocessorsPage = lazy(
  () => import("../pages/public/SubprocessorsPage"),
);
const SignUpPage = lazy(() => import("../pages/public/SignUpPage"));
const ForgotPasswordPage = lazy(
  () => import("../pages/public/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("../pages/public/ResetPasswordPage"),
);
const AcceptInvitePage = lazy(() => import("../pages/public/AcceptInvitePage"));
const RefundPolicyPage = lazy(() => import("../pages/public/RefundPolicyPage"));
const ForbiddenPage = lazy(() => import("../pages/ForbiddenPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
import { CookieConsentBanner } from "../components/ui/CookieConsentBanner";
import { NetworkStatusAlert } from "../components/ui/NetworkStatusAlert";

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
      (
        window as unknown as { requestIdleCallback: (cb: () => void) => void }
      ).requestIdleCallback(prefetch);
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
            <NetworkStatusAlert />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/dpa" element={<DpaPage />} />
                <Route path="/subprocessors" element={<SubprocessorsPage />} />
                <Route path="/refund" element={<RefundPolicyPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/invite/accept" element={<AcceptInvitePage />} />
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route
                  path="/track/:token"
                  element={<VendorInvoiceTrackPage />}
                />
                <Route
                  path="/invoices/track/:token"
                  element={<VendorInvoiceTrackPage />}
                />

                <Route element={<ProtectedRoutes />}>
                  <Route
                    path="/"
                    element={<Navigate to="/overview" replace />}
                  />
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route
                    path="/invoices/:invoiceId"
                    element={<InvoiceDetailPage />}
                  />
                  <Route path="/exceptions" element={<ExceptionsPage />} />
                  <Route path="/approvals" element={<ApprovalsPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route
                    path="/purchase-orders"
                    element={<PurchaseOrdersPage />}
                  />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/bank-accounts" element={<BankAccountsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/archive" element={<ArchivePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route path="/forbidden" element={<ForbiddenPage />} />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <CookieConsentBanner />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
