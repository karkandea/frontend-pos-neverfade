import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import SharedPosActivityGuard from "./components/shared/SharedPosActivityGuard";
import AbsensiPage from "./pages/AbsensiPage";
import AttendanceManagementPage from "./pages/AttendanceManagementPage";
import DashboardPage from "./pages/DashboardPage";
import InventarisPage from "./pages/InventarisPage";
import KasirPage from "./pages/KasirPage";
import KaryawanPage from "./pages/KaryawanPage";
import LaporanPage from "./pages/LaporanPage";
import FinancePage from "./pages/FinancePage";
import LoginPage from "./pages/LoginPage";
import PelangganPage from "./pages/PelangganPage";
import PengaturanPage from "./pages/PengaturanPage";
import PenggunaPage from "./pages/PenggunaPage";
import ProductPage from "./pages/ProductPage";
import QaQrisScannerPage from "./pages/QaQrisScannerPage";
import SharedPosPage from "./pages/SharedPosPage";
import TransaksiPage from "./pages/TransaksiPage";
import PlatformLoginPage from "./pages/platform/PlatformLoginPage";
import PlatformTenantCreatePage from "./pages/platform/PlatformTenantCreatePage";
import PlatformTenantDetailPage from "./pages/platform/PlatformTenantDetailPage";
import PlatformTenantListPage from "./pages/platform/PlatformTenantListPage";
import PlatformWithdrawalPage from "./pages/platform/PlatformWithdrawalPage";
import { useAuthStore } from "./stores/auth";
import { usePlatformAuthStore } from "./stores/platformAuth";
import { useTenantContextStore } from "./stores/tenantContext";
import type { TenantCapability } from "./types/platform";

function LoadingPage() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
      }}
    >
      Memuat...
    </div>
  );
}

function TenantContextErrorPage({ retry }: { retry: () => void }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>Konteks bisnis belum dapat dimuat</h1>
        <p>Fitur tenant tidak akan dibuka sebelum capability dari server tersedia.</p>
        <button type="button" className="btn-primary" onClick={retry}>
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

const pageTitles: Record<string, string> = {
  "/login": "Masuk",
  "/dashboard": "Dashboard",
  "/produk": "Produk",
  "/kasir": "Kasir",
  "/inventaris": "Inventaris",
  "/pelanggan": "Pelanggan",
  "/transaksi": "Transaksi",
  "/laporan": "Laporan",
  "/keuangan": "Keuangan",
  "/karyawan": "Karyawan",
  "/absensi": "Absensi",
  "/absensi/kelola": "Kelola Absensi",
  "/shared-pos": "Shared POS",
  "/pengguna": "Pengguna",
  "/pengaturan": "Pengaturan",
  "/qa/qris-scanner": "QA QRIS Scanner",
  "/platform/login": "Platform Login",
  "/platform/tenants": "Tenant Platform",
  "/platform/tenants/new": "Buat Tenant",
  "/platform/withdrawals": "Pencairan Platform",
};

export default function App() {
  const location = useLocation();
  const isPlatformRoute = location.pathname.startsWith("/platform");
  const {
    token,
    user,
    loading,
    restore,
  } = useAuthStore();
  const platformToken = usePlatformAuthStore((state) => state.token);
  const platformLoading = usePlatformAuthStore((state) => state.loading);
  const restorePlatform = usePlatformAuthStore((state) => state.restore);
  const tenantContext = useTenantContextStore((state) => state.context);
  const tenantContextLoading = useTenantContextStore((state) => state.loading);
  const tenantContextError = useTenantContextStore((state) => state.error);
  const restoreTenantContext = useTenantContextStore((state) => state.restore);
  const clearTenantContext = useTenantContextStore((state) => state.clear);

  useEffect(() => {
    void restore();
    void restorePlatform();
  }, [restore, restorePlatform]);

  useEffect(() => {
    if (token && !isPlatformRoute) {
      void restoreTenantContext(token);
    } else if (!token) {
      clearTenantContext();
    }
  }, [token, isPlatformRoute, restoreTenantContext, clearTenantContext]);

  useEffect(() => {
    const exact = pageTitles[location.pathname];
    const section = exact ?? (
      location.pathname.startsWith("/platform/tenants/")
        ? "Detail Tenant"
        : "NeverFade POS"
    );
    document.title = `${section} · NeverFade POS`;
  }, [location.pathname]);

  if (
    loading ||
    platformLoading ||
    (!isPlatformRoute && token && tenantContextLoading)
  ) {
    return <LoadingPage />;
  }

  if (
    !isPlatformRoute &&
    token &&
    !tenantContext &&
    tenantContextError
  ) {
    return (
      <TenantContextErrorPage
        retry={() => void restoreTenantContext(token)}
      />
    );
  }

  const isAdmin =
    user?.role === "owner" ||
    user?.role === "admin";

  function protectedPage(
    page: ReactNode,
    adminOnly = false,
    ownerOnly = false,
    capability?: TenantCapability
  ) {
    if (!token) {
      return (
        <Navigate
          replace
          to="/login"
          state={{
            returnTo: `${location.pathname}${location.search}`,
          }}
        />
      );
    }

    if (adminOnly && !isAdmin) {
      return <Navigate replace to="/dashboard" />;
    }

    if (ownerOnly && user?.role !== "owner") {
      return <Navigate replace to="/dashboard" />;
    }

    if (
      capability &&
      !tenantContext?.capabilities.includes(capability)
    ) {
      return <Navigate replace to="/dashboard" />;
    }

    return page;
  }

  function platformProtectedPage(page: ReactNode) {
    return platformToken ? (
      page
    ) : (
      <Navigate replace to="/platform/login" />
    );
  }

  return (
    <>
      <SharedPosActivityGuard />
      <Routes>
        <Route path="/shared-pos" element={<SharedPosPage />} />

        <Route
          path="/login"
          element={
            token ? (
              <Navigate replace to="/dashboard" />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/platform/login"
          element={
            platformToken ? (
              <Navigate replace to="/platform/tenants" />
            ) : (
              <PlatformLoginPage />
            )
          }
        />

        <Route
          path="/platform/tenants"
          element={platformProtectedPage(<PlatformTenantListPage />)}
        />

        <Route
          path="/platform/tenants/new"
          element={platformProtectedPage(<PlatformTenantCreatePage />)}
        />

        <Route
          path="/platform/tenants/:tenantId"
          element={platformProtectedPage(<PlatformTenantDetailPage />)}
        />

        <Route
          path="/platform/withdrawals"
          element={platformProtectedPage(<PlatformWithdrawalPage />)}
        />

        <Route
          path="/dashboard"
          element={protectedPage(<DashboardPage />, false, false, "reports")}
        />

        <Route
          path="/produk"
          element={protectedPage(<ProductPage />, false, false, "core_pos")}
        />

        <Route
          path="/kasir"
          element={protectedPage(<KasirPage />, false, false, "core_pos")}
        />

        <Route
          path="/inventaris"
          element={protectedPage(<InventarisPage />, false, false, "inventory")}
        />

        <Route
          path="/pelanggan"
          element={protectedPage(<PelangganPage />, false, false, "customers")}
        />

        <Route
          path="/transaksi"
          element={protectedPage(<TransaksiPage />, false, false, "core_pos")}
        />

        <Route
          path="/laporan"
          element={protectedPage(<LaporanPage />, false, false, "reports")}
        />

        <Route
          path="/keuangan"
          element={protectedPage(<FinancePage />, false, true, "finance_withdrawal")}
        />

        <Route
          path="/karyawan"
          element={protectedPage(<KaryawanPage />, true, false, "attendance")}
        />

        <Route
          path="/absensi"
          element={protectedPage(<AbsensiPage />, true, false, "attendance")}
        />

        <Route
          path="/absensi/kelola"
          element={protectedPage(<AttendanceManagementPage />, true, false, "attendance")}
        />

        <Route
          path="/pengguna"
          element={protectedPage(<PenggunaPage />, true)}
        />

        <Route
          path="/pengaturan"
          element={protectedPage(<PengaturanPage />, true)}
        />

        <Route
          path="/qa/qris-scanner"
          element={protectedPage(<QaQrisScannerPage />, true)}
        />

        <Route
          path="*"
          element={
            <Navigate
              replace
              to={
                location.pathname.startsWith("/platform")
                  ? platformToken
                    ? "/platform/tenants"
                    : "/platform/login"
                  : token
                  ? "/dashboard"
                  : "/login"
              }
            />
          }
        />
      </Routes>
    </>
  );
}