import { useEffect, useState } from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Product = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaModal?: number;
  hargaJual: number;
  stok: number;
  supplier?: string;
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
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Produk
            </h2>

            <p className="section-sub">
              Kelola katalog produk
            </p>
          </div>

          <div className="section-actions">
            <div className="search-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                type="text"
                id="produk-search"
                placeholder="Cari produk..."
              />
            </div>

            <select
              className="select-sm"
              id="produk-filter-cat"
            >
              <option value="">
                Semua Kategori
              </option>
            </select>

            <button
              className="btn-primary"
              id="btn-add-produk"
            >
              Tambah
            </button>
          </div>
        </div>
        <div className="table-card">
          {loading ? (
            <div className="table-empty">
              <p>Memuat produk...</p>
            </div>
          ) : error ? (
            <div className="table-empty">
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama Produk</th>
                      <th>Kategori</th>
                      <th>Harga Modal</th>
                      <th>Harga Jual</th>
                      <th>Stok</th>
                      <th>Supplier</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody id="produk-tbody">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.kode}</td>
                        <td>{p.nama}</td>
                        <td>{p.kategori}</td>
                        <td>
                          Rp{" "}
                          {(p.hargaModal ?? 0).toLocaleString("id-ID")}
                        </td>
                        <td>
                          Rp{" "}
                          {p.hargaJual.toLocaleString("id-ID")}
                        </td>
                        <td>{p.stok}</td>
                        <td>{p.supplier ?? "-"}</td>
                        <td>
                          <button className="btn-secondary">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {products.length === 0 && (
                <div
                  id="produk-empty"
                  className="table-empty"
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>

                  <p>Belum ada produk.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
