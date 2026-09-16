import axios from "axios";
import {
  useEffect,
  useState,
} from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { SkeletonTable } from "../components/common/Skeleton";
import "./ProductPage.css";

type Product = {
  id: string;
  kode: string;
  barcode?: string;
  nama: string;
  kategori: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  supplier?: string;
  satuan?: string;
  deskripsi?: string;
};

type Form = {
  kode: string;
  barcode: string;
  nama: string;
  kategori: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  supplier: string;
  satuan: string;
  deskripsi: string;
};

const emptyForm: Form = {
  kode: "",
  barcode: "",
  nama: "",
  kategori: "",
  hargaModal: 0,
  hargaJual: 0,
  stok: 0,
  supplier: "",
  satuan: "",
  deskripsi: "",
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function stockLabel(product: Product) {
  return `${product.stok} ${product.satuan || "unit"}`;
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  function rememberCategories(data: Product[]) {
    setCategoryOptions((current) => {
      const next = new Set(current);
      data.forEach((product) => {
        const value = product.kategori?.trim();
        if (value) next.add(value);
      });
      return Array.from(next).sort((a, b) => a.localeCompare(b, "id"));
    });
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      try {
        const { data } =
          await api.get<Product[]>(
            "/api/products",
            {
              params: {
                search:
                  search || undefined,
                kategori:
                  kategori || undefined,
              },
            }
          );

        if (!active) {
          return;
        }

        setProducts(data);
        rememberCategories(data);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, [search, kategori]);

  async function load() {
    setLoading(true);

    try {
      const { data } =
        await api.get<Product[]>(
          "/api/products",
          {
            params: {
              search:
                search || undefined,
              kategori:
                kategori || undefined,
            },
          }
        );

      setProducts(data);
      rememberCategories(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      kode: product.kode,
      barcode: product.barcode ?? "",
      nama: product.nama,
      kategori: product.kategori,
      hargaModal: product.hargaModal,
      hargaJual: product.hargaJual,
      stok: product.stok,
      supplier: product.supplier ?? "",
      satuan: product.satuan ?? "",
      deskripsi: product.deskripsi ?? "",
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus produk ini?")) {
      return;
    }

    try {
      await api.delete(
        `/api/products/${id}`
      );

      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError<{
          message?: string;
        }>(error)
          ? error.response?.data
              ?.message
          : undefined;

      alert(
        message ??
          "Terjadi kesalahan saat menghapus produk."
      );
    }
  }

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function save() {
    const payload = {
      ...form,
      hargaModal: Number(form.hargaModal),
      hargaJual: Number(form.hargaJual),
      stok: Number(form.stok),
    };

    if (editingId) {
      await api.put(`/api/products/${editingId}`, payload);
    } else {
      await api.post("/api/products", payload);
    }

    setOpen(false);
    setEditingId(null);
    await load();
  }

  return (
    <AppShell>
      <section className="content-section active product-page">
        <div className="product-page-header">
          <div className="product-page-heading">
            <h2>Produk</h2>
            <p>Kelola katalog dan stok produk</p>
          </div>

          <div className="product-toolbar" aria-label="Filter produk">
            <label className="product-search">
              <span className="sr-only">Cari produk</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
              <input
                type="search"
                placeholder="Cari nama, kode, atau barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <select
              className="product-category-filter"
              aria-label="Filter kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <button className="btn-primary product-add-button" onClick={openCreate}>
              <span aria-hidden="true">+</span>
              Tambah Produk
            </button>
          </div>
        </div>

        <div className="product-result-meta" aria-live="polite">
          <span>
            {loading
              ? "Memuat produk..."
              : `${products.length} produk${kategori ? ` · ${kategori}` : ""}`}
          </span>
          {(search || kategori) && !loading && (
            <button
              type="button"
              className="product-clear-filter"
              onClick={() => { setSearch(""); setKategori(""); }}
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="product-desktop-list table-card">
          {loading ? (
            <SkeletonTable rows={8} />
          ) : products.length === 0 ? (
            <div className="product-empty-state">
              <strong>Produk tidak ditemukan</strong>
              <span>Coba ubah kata kunci atau filter kategori.</span>
            </div>
          ) : (
            <table className="data-table product-table">
              <thead>
                <tr>
                  <th>Kode / Barcode</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-code-cell">
                        <span>{p.kode}</span>
                        {p.barcode && <small>{p.barcode}</small>}
                      </div>
                    </td>
                    <td><div className="product-name-cell"><strong>{p.nama}</strong></div></td>
                    <td>{p.kategori || "-"}</td>
                    <td className="product-money-cell">{rupiah(p.hargaModal)}</td>
                    <td className="product-money-cell product-sale-price">{rupiah(p.hargaJual)}</td>
                    <td>
                      <span className={"product-stock-value" + (p.stok <= 5 ? " low" : "")}>
                        {stockLabel(p)}
                      </span>
                    </td>
                    <td className="product-actions-cell">
                      <button className="product-edit-button" onClick={() => openEdit(p)}>Edit</button>
                      <details className="product-action-menu">
                        <summary aria-label={`Aksi lainnya untuk ${p.nama}`}><span aria-hidden="true">•••</span></summary>
                        <div className="product-action-popover">
                          <button type="button" onClick={() => openEdit(p)}>Edit produk</button>
                          <button type="button" className="danger" onClick={() => void remove(p.id)}>Hapus produk</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="product-mobile-list">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div className="product-mobile-card product-mobile-skeleton" key={index}>
                <span /><span /><span />
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="product-empty-state product-empty-mobile">
              <strong>Produk tidak ditemukan</strong>
              <span>Coba ubah kata kunci atau filter kategori.</span>
            </div>
          ) : (
            products.map((p) => (
              <article className="product-mobile-card" key={p.id}>
                <div className="product-mobile-card-top">
                  <div className="product-mobile-title">
                    <strong>{p.nama}</strong>
                    <div className="product-mobile-meta">
                      <span>{p.kode}</span>
                      {p.kategori && (<><span aria-hidden="true">•</span><span>{p.kategori}</span></>)}
                    </div>
                  </div>
                  <details className="product-action-menu product-mobile-menu">
                    <summary aria-label={`Aksi untuk ${p.nama}`}><span aria-hidden="true">•••</span></summary>
                    <div className="product-action-popover">
                      <button type="button" onClick={() => openEdit(p)}>Edit produk</button>
                      <button type="button" className="danger" onClick={() => void remove(p.id)}>Hapus produk</button>
                    </div>
                  </details>
                </div>

                <div className="product-mobile-values">
                  <div><span>Harga jual</span><strong>{rupiah(p.hargaJual)}</strong></div>
                  <div><span>Stok</span><strong className={p.stok <= 5 ? "low" : ""}>{stockLabel(p)}</strong></div>
                </div>

                <div className="product-mobile-footer">
                  <div>{p.barcode ? <span>Barcode {p.barcode}</span> : <span>Tanpa barcode</span>}</div>
                  <button type="button" onClick={() => openEdit(p)}>Edit</button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* MODAL — VANILLA STYLE (FIX .open pattern) */}
        <div className={"modal-overlay" + (open ? " open" : "")}>
          <div className="modal modal-wide">
            {/* HEADER */}
            <div className="modal-header">
              <h3>{editingId ? "Edit Produk" : "Tambah Produk"}</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Kode</label>
                  <input
                    name="kode"
                    value={form.kode}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group">
                  <label>Nama</label>
                  <input
                    name="nama"
                    value={form.nama}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group">
                  <label>Kategori</label>
                  <input
                    name="kategori"
                    value={form.kategori}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group">
                  <label>Harga Modal</label>
                  <input
                    name="hargaModal"
                    type="number"
                    value={form.hargaModal}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Harga Jual</label>
                  <input
                    name="hargaJual"
                    type="number"
                    value={form.hargaJual}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Stok</label>
                  <input
                    name="stok"
                    type="number"
                    value={form.stok}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Satuan</label>
                  <input
                    name="satuan"
                    value={form.satuan}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group span-2">
                  <label>Deskripsi</label>
                  <textarea
                    name="deskripsi"
                    value={form.deskripsi}
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Batal
              </button>
              <button className="btn-primary" onClick={save}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}