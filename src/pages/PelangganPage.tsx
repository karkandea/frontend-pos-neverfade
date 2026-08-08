import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Customer = {
  id: string;
  nama: string;
  hp: string;
  email: string;
  alamat: string;
  poin: number;
  totalTransaksi: number;
};

type Form = {
  nama: string;
  hp: string;
  email: string;
  alamat: string;
  poin: number;
};

const emptyForm: Form = {
  nama: "",
  hp: "",
  email: "",
  alamat: "",
  poin: 0,
};

export default function PelangganPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<Form>(emptyForm);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      try {
        const { data } =
          await api.get<Customer[]>(
            "/api/customers",
            {
              params: {
                search:
                  search || undefined,
              },
            }
          );

        if (!active) {
          return;
        }

        setCustomers(data);
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
  }, [search]);

  async function load() {
    setLoading(true);

    try {
      const { data } =
        await api.get<Customer[]>(
          "/api/customers",
          {
            params: {
              search:
                search || undefined,
            },
          }
        );

      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingId(c.id);

    setForm({
      nama: c.nama,
      hp: c.hp ?? "",
      email: c.email ?? "",
      alamat: c.alamat ?? "",
      poin: c.poin,
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Hapus pelanggan ini?"
      )
    )
      return;

    await api.delete(
      `/api/customers/${id}`
    );

    await load();
  }

  function onChange(
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "poin"
          ? Number(e.target.value)
          : e.target.value,
    });
  }

  async function save() {
    const payload = {
      ...form,
      poin: Number(form.poin),
    };

    if (editingId) {
      await api.put(
        `/api/customers/${editingId}`,
        payload
      );
    } else {
      await api.post(
        "/api/customers",
        payload
      );
    }

    closeModal();
    await load();
  }

  return (
    <AppShell>
      <section className="content-section active">
        <div className="section-header">
          <div>
            <h2>Pelanggan</h2>
            <p>
              Kelola data pelanggan
            </p>
          </div>

          <div className="section-actions">
            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

            <button
              className="btn-primary"
              onClick={openCreate}
            >
              Tambah
            </button>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>HP</th>
                  <th>Email</th>
                  <th>Alamat</th>
                  <th>Poin</th>
                  <th>Total</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center"
                    >
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nama}</td>
                      <td>{c.hp}</td>
                      <td>
                        {c.email || "-"}
                      </td>
                      <td>
                        {c.alamat || "-"}
                      </td>
                      <td>{c.poin}</td>
                      <td>
                        {
                          c.totalTransaksi
                        }
                      </td>

                      <td
                        style={{
                          display:
                            "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            openEdit(c)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() =>
                            remove(c.id)
                          }
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div
          className={
            "modal-overlay" +
            (open ? " open" : "")
          }
        >
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>
                {editingId
                  ? "Edit Pelanggan"
                  : "Tambah Pelanggan"}
              </h3>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid-2">
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
                  <label>No. HP</label>

                  <input
                    name="hp"
                    value={form.hp}
                    onChange={onChange}
                    type="text"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>

                  <input
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    type="email"
                  />
                </div>

                <div className="form-group">
                  <label>Poin</label>

                  <input
                    name="poin"
                    type="number"
                    value={form.poin}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group span-2">
                  <label>Alamat</label>

                  <textarea
                    name="alamat"
                    value={form.alamat}
                    onChange={onChange}
                  />
                </div>
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
