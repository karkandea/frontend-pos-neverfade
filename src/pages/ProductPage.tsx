import { useEffect, useState } from "react";

import api from "../lib/api";
import AppShell from "../components/layout/AppShell";

type Product = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaJual: number;
  stok: number;
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/products");
        setProducts(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ??
          e?.message ??
          "Gagal memuat produk."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AppShell>
      <section
        id="sec-produk"
        className="content-section active"
      >
        <div className="page-header">
          <div>
            <h1>Produk</h1>
            <p>Daftar produk dari backend.</p>
          </div>
        </div>

        {loading && <p>Memuat produk...</p>}

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.kode}</td>
                  <td>{p.nama}</td>
                  <td>{p.kategori}</td>
                  <td>{p.hargaJual.toLocaleString("id-ID")}</td>
                  <td>{p.stok}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
