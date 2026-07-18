import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AbsensiPage from "./pages/AbsensiPage";
import DashboardPage from "./pages/DashboardPage";
import InventarisPage from "./pages/InventarisPage";
import KasirPage from "./pages/KasirPage";
import KaryawanPage from "./pages/KaryawanPage";
import LaporanPage from "./pages/LaporanPage";
import LoginPage from "./pages/LoginPage";
import PelangganPage from "./pages/PelangganPage";
import PengaturanPage from "./pages/PengaturanPage";
import PenggunaPage from "./pages/PenggunaPage";
import ProductPage from "./pages/ProductPage";
import TransaksiPage from "./pages/TransaksiPage";
import { useAuthStore } from "./stores/auth";

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
  const {
    token,
    user,
    loading,
    restore,
  } = useAuthStore();

  useEffect(() => {
    void restore();
  }, [restore]);

  if (loading) {
    return <LoadingPage />;
  }

  const isAdmin =
    user?.role === "owner" ||
    user?.role === "admin";

  function protectedPage(
    page: ReactNode,
    adminOnly = false
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

    return page;
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
              token
                ? "/dashboard"
                : "/login"
            }
          />
        }
      />
    </Routes>
  );
}
