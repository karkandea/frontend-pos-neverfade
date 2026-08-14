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

import AbsensiPage from "./pages/AbsensiPage";
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
import TransaksiPage from "./pages/TransaksiPage";
import PlatformLoginPage from "./pages/platform/PlatformLoginPage";
import PlatformTenantCreatePage from "./pages/platform/PlatformTenantCreatePage";
import PlatformTenantDetailPage from "./pages/platform/PlatformTenantDetailPage";
import PlatformTenantListPage from "./pages/platform/PlatformTenantListPage";
import PlatformWithdrawalPage from "./pages/platform/PlatformWithdrawalPage";
import { useAuthStore } from "./stores/auth";
import { usePlatformAuthStore } from "./stores/platformAuth";

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

export default function App() {
  const location = useLocation();
  const {
    token,
    user,
    loading,
    restore,
  } = useAuthStore();
  const platformToken = usePlatformAuthStore((state) => state.token);
  const platformLoading = usePlatformAuthStore((state) => state.loading);
  const restorePlatform = usePlatformAuthStore((state) => state.restore);

  useEffect(() => {
    void restore();
    void restorePlatform();
  }, [restore, restorePlatform]);

  if (loading || platformLoading) {
    return <LoadingPage />;
  }

  const isAdmin =
    user?.role === "owner" ||
    user?.role === "admin";

  function protectedPage(
    page: ReactNode,
    adminOnly = false,
    ownerOnly = false
  ) {
    if (!token) {
      return (
        <Navigate
          replace
          to="/login"
        />
      );
    }

    if (adminOnly && !isAdmin) {
      return (
        <Navigate
          replace
          to="/dashboard"
        />
      );
    }

    if (ownerOnly && user?.role !== "owner") {
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
    <Routes>
      <Route
        path="/login"
        element={
          token ? (
            <Navigate
              replace
              to="/dashboard"
            />
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
        element={protectedPage(
          <DashboardPage />
        )}
      />

      <Route
        path="/produk"
        element={protectedPage(
          <ProductPage />
        )}
      />

      <Route
        path="/kasir"
        element={protectedPage(
          <KasirPage />
        )}
      />

      <Route
        path="/inventaris"
        element={protectedPage(
          <InventarisPage />
        )}
      />

      <Route
        path="/pelanggan"
        element={protectedPage(
          <PelangganPage />
        )}
      />

      <Route
        path="/transaksi"
        element={protectedPage(
          <TransaksiPage />
        )}
      />

      <Route
        path="/laporan"
        element={protectedPage(
          <LaporanPage />
        )}
      />

      <Route
        path="/keuangan"
        element={protectedPage(<FinancePage />, false, true)}
      />

      <Route
        path="/karyawan"
        element={protectedPage(
          <KaryawanPage />,
          true
        )}
      />

      <Route
        path="/absensi"
        element={protectedPage(
          <AbsensiPage />,
          true
        )}
      />

      <Route
        path="/pengguna"
        element={protectedPage(
          <PenggunaPage />,
          true
        )}
      />

      <Route
        path="/pengaturan"
        element={protectedPage(
          <PengaturanPage />,
          true
        )}
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
  );
}
