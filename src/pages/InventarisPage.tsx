import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Product = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  stok: number;
};

type Settings = {
  minStok: number;
};

type StockHistory = {
  id: string;
  produkNama: string;
  tipe: string;
  jumlah: number;
  stokAkhir: number;
  tanggal: string;
  keterangan: string;
};

type Form = {
  produkId: string;
  tipe: "masuk" | "keluar" | "penyesuaian";
  jumlah: number;
  stokFinal: number;
  keterangan: string;
};

const emptyForm: Form = {
  produkId: "",
  tipe: "masuk",
  jumlah: 0,
  stokFinal: 0,
  keterangan: "",
};

export default function InventarisPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [history, setHistory] =
    useState<StockHistory[]>([]);

  const [settings, setSettings] =
    useState<Settings>({
      minStok: 5,
    });

  const [loading, setLoading] =
    useState(true);

  const [open, setOpen] =
    useState(false);

  const [form, setForm] =
    useState<Form>(emptyForm);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const [productsRes, historyRes, settingsRes] =
        await Promise.all([
          api.get("/api/products"),
          api.get("/api/stock-history"),
          api.get("/api/settings"),
        ]);

      setProducts(productsRes.data);
      setHistory(historyRes.data);
      setSettings(settingsRes.data);
    } finally {
      setLoading(false);
    }
  }

  function openModal(
    tipe: Form["tipe"]
  ) {
    setForm({
      ...emptyForm,
      tipe,
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function onChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "jumlah" ||
        e.target.name === "stokFinal"
          ? Number(e.target.value)
          : e.target.value,
    });
  }

  async function save() {
    const payload = {
      produkId: form.produkId,
      tipe: form.tipe,
      jumlah: Number(form.jumlah),
      stokFinal:
        form.tipe === "penyesuaian"
          ? Number(form.stokFinal)
          : undefined,
      keterangan: form.keterangan,
    };

    await api.post(
      "/api/stock-history",
      payload
    );

    closeModal();
    await load();
  }

  return (
    <AppShell>
      <section className="content-section active">

        <div className="section-header">

          <div>
            <h2>Inventaris</h2>

            <p>
              Kelola stok dan
              pergerakan barang
            </p>
          </div>

          <div className="section-actions">

            <button
              className="btn-secondary"
              onClick={() =>
                openModal("masuk")
              }
            >
              Masuk
            </button>

            <button
              className="btn-secondary"
              onClick={() =>
                openModal("keluar")
              }
            >
              Keluar
            </button>

            <button
              className="btn-secondary"
              onClick={() =>
                openModal(
                  "penyesuaian"
                )
              }
            >
              Sesuaikan
            </button>

          </div>
        </div>

        <div className="table-card">

          <div className="card-header">
            <h3>Status Stok</h3>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center"
                    >
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nama}</td>
                      <td>{p.kategori}</td>
                      <td>{p.stok}</td>

                      <td>
                        {p.stok <= settings.minStok ? (
                          <span
                            className="status-badge"
                            style={{
                              color: "#dc2626",
                            }}
                          >
                            Stok Menipis
                          </span>
                        ) : (
                          <span
                            className="status-badge"
                          >
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-card mt-4">

          <div className="card-header">
            <h3>
              Riwayat Pergerakan
              Stok
            </h3>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Tipe</th>
                <th>Jumlah</th>
                <th>Stok Akhir</th>
                <th>Keterangan</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center"
                  >
                    Belum ada riwayat.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.tanggal}</td>
                    <td>{h.produkNama}</td>
                    <td>{h.tipe}</td>
                    <td>{h.jumlah}</td>
                    <td>{h.stokAkhir}</td>
                    <td>
                      {h.keterangan ||
                        "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className={
            "modal-overlay" +
            (open ? " open" : "")
          }
        >
          <div className="modal">
            <div className="modal-header">
              <h3>
                Adjustment Stok
              </h3>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">

              <div className="form-group">
                <label>Produk</label>

                <select
                  name="produkId"
                  value={form.produkId}
                  onChange={onChange}
                >
                  <option value="">
                    Pilih Produk
                  </option>

                  {products.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipe</label>

                <input
                  value={form.tipe}
                  disabled
                />
              </div>

              {form.tipe ===
              "penyesuaian" ? (
                <div className="form-group">
                  <label>
                    Stok Final
                  </label>

                  <input
                    type="number"
                    name="stokFinal"
                    value={
                      form.stokFinal
                    }
                    onChange={onChange}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>
                    Jumlah
                  </label>

                  <input
                    type="number"
                    name="jumlah"
                    value={form.jumlah}
                    onChange={onChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label>
                  Keterangan
                </label>

                <textarea
                  name="keterangan"
                  value={
                    form.keterangan
                  }
                  onChange={onChange}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeModal}
              >
                Batal
              </button>

              <button
                className="btn-primary"
                onClick={save}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>

      </section>
    </AppShell>
  );
}
