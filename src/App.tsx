import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import InventarisPage from "./pages/InventarisPage";
import KasirPage from "./pages/KasirPage";
import KaryawanPage from "./pages/KaryawanPage";
import LoginPage from "./pages/LoginPage";
import PelangganPage from "./pages/PelangganPage";
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
  const { token, loading, restore } = useAuthStore();

  useEffect(() => {
    restore();
  }, [restore]);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate replace to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={token ? <DashboardPage /> : <Navigate replace to="/login" />} />
      <Route path="/produk" element={token ? <ProductPage /> : <Navigate replace to="/login" />} />
      <Route path="/kasir" element={token ? <KasirPage /> : <Navigate replace to="/login" />} />
      <Route path="/inventaris" element={token ? <InventarisPage /> : <Navigate replace to="/login" />} />
      <Route path="/pelanggan" element={token ? <PelangganPage /> : <Navigate replace to="/login" />} />
      <Route path="/transaksi" element={token ? <TransaksiPage /> : <Navigate replace to="/login" />} />
      <Route path="/karyawan" element={token ? <KaryawanPage /> : <Navigate replace to="/login" />} />

      <Route
        path="*"
        element={<Navigate replace to={token ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}
