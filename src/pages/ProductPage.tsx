import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Product = {
  id: string;
  kode: string;
  barcode?: string;
  nama: string;
  kategori: string;
  hargaModal?: number;
  hargaJual: number;
  stok: number;
  supplier?: string;
  satuan?: string;
  deskripsi?: string;
  createdAt?: string;
};

type ProductForm = {
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

const emptyForm: ProductForm = {
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

const LOW_STOCK = 5;

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  const skeletonRows = Array.from({ length: 5 });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
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

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(t);
  }, [searchInput]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.kategori)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const s = search.toLowerCase();

    return products.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(s) ||
        p.kode.toLowerCase().includes(s);

      const matchCat = filterCat ? p.kategori === filterCat : true;

      return matchSearch && matchCat;
    });
  }, [products, search, filterCat]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      kode: p.kode || "",
      barcode: p.barcode || "",
      nama: p.nama || "",
      kategori: p.kategori || "",
      hargaModal: p.hargaModal || 0,
      hargaJual: p.hargaJual,
      stok: p.stok,
      supplier: p.supplier || "",
      satuan: p.satuan || "",
      deskripsi: p.deskripsi || "",
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "hargaModal" ||
        name === "hargaJual" ||
        name === "stok"
          ? Number(value)
          : value,
    }));
  }

  async function save() {
    try {
      setSaving(true);

      if (editId) {
        await api.put(`/api/products/${editId}`, form);
        showToast("Produk diupdate");
      } else {
        await api.post("/api/products", form);
        showToast("Produk ditambahkan");
      }

      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus produk?")) return;

    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      await api.delete(`/api/products/${id}`);
      showToast("Produk dihapus");
    } catch (e) {
      await load();
    }
  }

  return (
    <AppShell>
      <section className="content-section active">

        <div className="section-header">
          <div>
            <h2 className="section-title">Produk</h2>
            <p className="section-sub">Kelola katalog produk</p>
          </div>

          <div className="section-actions">
            <div className="search-bar">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari produk..."
              />
            </div>

            <select
              className="select-sm"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button className="btn-primary" onClick={openCreate}>
              Tambah
            </button>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="table-scroll">
              <table className="data-table">
                <tbody>
                  {skeletonRows.map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>Loading...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="table-empty">{error}</div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Kategori</th>
                      <th>Modal</th>
                      <th>Jual</th>
                      <th>Stok</th>
                      <th>Supplier</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr
                        key={p.id}
                        className={p.stok <= LOW_STOCK ? "low-stock" : ""}
                      >
                        <td>{p.kode}</td>
                        <td>{p.nama}</td>
                        <td>{p.kategori}</td>
                        <td>
                          Rp {(p.hargaModal ?? 0).toLocaleString("id-ID")}
                        </td>
                        <td>
                          Rp {p.hargaJual.toLocaleString("id-ID")}
                        </td>
                        <td>{p.stok}</td>
                        <td>{p.supplier ?? "-"}</td>
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn-danger"
                            onClick={() => remove(p.id)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length === 0 && (
                <div className="table-empty">
                  Belum ada produk.
                </div>
              )}
            </>
          )}
        </div>

        {toast && <div className="toast">{toast}</div>}

        {open && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>{editId ? "Edit Produk" : "Tambah Produk"}</h3>

              <input name="kode" value={form.kode} onChange={onChange} />
              <input name="barcode" value={form.barcode} onChange={onChange} />
              <input name="nama" value={form.nama} onChange={onChange} />
              <input name="kategori" value={form.kategori} onChange={onChange} />

              <input name="hargaModal" type="number" value={form.hargaModal} onChange={onChange} />
              <input name="hargaJual" type="number" value={form.hargaJual} onChange={onChange} />
              <input name="stok" type="number" value={form.stok} onChange={onChange} />

              <input name="supplier" value={form.supplier} onChange={onChange} />
              <input name="satuan" value={form.satuan} onChange={onChange} />

              <textarea name="deskripsi" value={form.deskripsi} onChange={onChange} />

              <div className="modal-actions">
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>

                <button className="btn-secondary" onClick={closeModal}>
                  Batal
                </button>
              </div>

            </div>
          </div>
        )}

      </section>
    </AppShell>
  );
}
