import axios from "axios";
import {
  useEffect,
  useState,
} from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { SkeletonTable } from "../components/common/Skeleton";
import type { Product } from "../types/product";

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
  type: "goods" | "service";
  tracksStock: boolean;
  quantityPrecision: number;
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
  type: "goods",
  tracksStock: true,
  quantityPrecision: 0,
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  

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
      type: product.type ?? "goods",
      tracksStock: product.tracksStock ?? true,
      quantityPrecision: product.quantityPrecision ?? 0,
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

  function changeType(
    type: "goods" | "service"
  ) {
    setForm((current) =>
      type === "service"
        ? {
            ...current,
            type,
            tracksStock: false,
            stok: 0,
            quantityPrecision:
              current.quantityPrecision > 0
                ? current.quantityPrecision
                : 2,
          }
        : {
            ...current,
            type,
            tracksStock: true,
            quantityPrecision: 0,
          }
    );
  }

  async function save() {
    const payload = {
      ...form,
      hargaModal: Number(form.hargaModal),
      hargaJual: Number(form.hargaJual),
      stok:
        form.type === "service" || !form.tracksStock
          ? 0
          : Number(form.stok),
      tracksStock:
        form.type === "service"
          ? false
          : form.tracksStock,
      quantityPrecision:
        form.type === "goods"
          ? 0
          : Number(form.quantityPrecision),
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
      <section className="content-section active">
        {/* HEADER */}
        <div className="section-header">
          <div>
            <h2>Produk</h2>
            <p>Kelola produk</p>
          </div>

          <div className="section-actions">
  <input
    type="text"
    placeholder="Cari produk..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={kategori}
    onChange={(e) => setKategori(e.target.value)}
  >
    <option value="">Semua Kategori</option>
    <option value="Makanan">Makanan</option>
    <option value="Minuman">Minuman</option>
    <option value="Snack">Snack</option>
  </select>

  <button className="btn-primary" onClick={openCreate}>
    Tambah
  </button>
</div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          {loading ? (
            <SkeletonTable rows={8} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Barcode</th>
                  <th>Nama</th>
                  <th>Tipe</th>
                  <th>Kategori</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
                  <th>Satuan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.kode}</td>
                    <td>{p.barcode ?? "-"}</td>
                    <td>{p.nama}</td>
                    <td>
                      {p.type === "service" ? "Jasa" : "Barang"}
                    </td>
                    <td>{p.kategori}</td>
                    <td>{p.hargaModal}</td>
                    <td>{p.hargaJual}</td>
                    <td>{p.tracksStock ? p.stok : "-"}</td>
                    <td>{p.satuan ?? "-"}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-secondary"
                        onClick={() => remove(p.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <label>Tipe</label>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      changeType(
                        event.target.value as "goods" | "service"
                      )
                    }
                  >
                    <option value="goods">Barang</option>
                    <option value="service">Jasa / layanan</option>
                  </select>
                </div>

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

                {form.type === "goods" ? (
                  <>
                    <div className="form-group">
                      <label>Lacak stok</label>
                      <label className="product-stock-toggle">
                        <input
                          type="checkbox"
                          checked={form.tracksStock}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              tracksStock: event.target.checked,
                              stok: event.target.checked ? current.stok : 0,
                            }))
                          }
                        />
                        Stok berkurang saat transaksi
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Stok</label>
                      <input
                        name="stok"
                        type="number"
                        min={0}
                        step={1}
                        disabled={!form.tracksStock}
                        value={form.stok}
                        onChange={onChange}
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Presisi jumlah</label>
                    <select
                      value={form.quantityPrecision}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          quantityPrecision: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Bulat</option>
                      <option value={1}>1 desimal</option>
                      <option value={2}>2 desimal</option>
                      <option value={3}>3 desimal</option>
                    </select>
                  </div>
                )}

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