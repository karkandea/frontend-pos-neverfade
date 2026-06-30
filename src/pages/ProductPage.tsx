import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

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

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/api/products");
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
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
    await api.post("/api/products", {
      ...form,
      hargaModal: Number(form.hargaModal),
      hargaJual: Number(form.hargaJual),
      stok: Number(form.stok),
    });

    setOpen(false);
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
            <button className="btn-primary" onClick={openCreate}>
              Tambah
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Barcode</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
                  <th>Satuan</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.kode}</td>
                    <td>{p.barcode ?? "-"}</td>
                    <td>{p.nama}</td>
                    <td>{p.kategori}</td>
                    <td>{p.hargaModal}</td>
                    <td>{p.hargaJual}</td>
                    <td>{p.stok}</td>
                    <td>{p.satuan ?? "-"}</td>
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
              <h3>Tambah Produk</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              <div className="form-grid-2">

                <div className="form-group">
                  <label>Kode</label>
                  <input name="kode" value={form.kode} onChange={onChange} type="text" />
                </div>

                <div className="form-group">
                  <label>Barcode</label>
                  <input name="barcode" value={form.barcode} onChange={onChange} type="text" />
                </div>

                <div className="form-group">
                  <label>Nama</label>
                  <input name="nama" value={form.nama} onChange={onChange} type="text" />
                </div>

                <div className="form-group">
                  <label>Kategori</label>
                  <input name="kategori" value={form.kategori} onChange={onChange} type="text" />
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
