import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import KasirPage from "./pages/KasirPage";
import LoginPage from "./pages/LoginPage";
import ProductPage from "./pages/ProductPage";
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
      <Route
        path="/login"
        element={token ? <Navigate replace to="/dashboard" /> : <LoginPage />}
      />

      <Route
        path="/dashboard"
        element={token ? <DashboardPage /> : <Navigate replace to="/login" />}
      />

      <Route
        path="/produk"
        element={token ? <ProductPage /> : <Navigate replace to="/login" />}
      />

      <Route
        path="/kasir"
        element={token ? <KasirPage /> : <Navigate replace to="/login" />}
      />

      <Route
        path="*"
        element={<Navigate replace to={token ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}
