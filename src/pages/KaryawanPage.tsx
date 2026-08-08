import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Employee = {
  id: string;
  nama: string;
  jabatan: string;
  telepon: string;
  email: string;
  gaji: number;
  tanggalMasuk: string;
  status: string;
  catatan: string;
};

type Form = {
  nama: string;
  jabatan: string;
  telepon: string;
  email: string;
  gaji: number;
  tanggalMasuk: string;
  status: string;
  catatan: string;
};

const emptyForm: Form = {
  nama: "",
  jabatan: "",
  telepon: "",
  email: "",
  gaji: 0,
  tanggalMasuk: "",
  status: "Aktif",
  catatan: "",
};

export default function KaryawanPage() {
  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [open, setOpen] =
    useState(false);

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
          await api.get<Employee[]>(
            "/api/karyawan",
            {
              params: {
                search:
                  search || undefined,
                status:
                  status || undefined,
              },
            }
          );

        if (!active) {
          return;
        }

        setEmployees(data);
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
  }, [search, status]);

  async function load() {
    setLoading(true);

    try {
      const { data } =
        await api.get<Employee[]>(
          "/api/karyawan",
          {
            params: {
              search:
                search || undefined,
              status:
                status || undefined,
            },
          }
        );

      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(e: Employee) {
    setEditingId(e.id);

    setForm({
      nama: e.nama,
      jabatan: e.jabatan,
      telepon: e.telepon ?? "",
      email: e.email ?? "",
      gaji: e.gaji,
      tanggalMasuk:
        e.tanggalMasuk ?? "",
      status: e.status,
      catatan:
        e.catatan ?? "",
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Hapus karyawan ini?"
      )
    )
      return;

    await api.delete(
      `/api/karyawan/${id}`
    );

    await load();
  }

  function onChange(
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "gaji"
          ? Number(
              e.target.value
            )
          : e.target.value,
    });
  }

  async function save() {
    const payload = {
      ...form,
      gaji: Number(form.gaji),
    };

    if (editingId) {
      await api.put(
        `/api/karyawan/${editingId}`,
        payload
      );
    } else {
      await api.post(
        "/api/karyawan",
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
            <h2>Karyawan</h2>
            <p>
              Kelola data
              karyawan
            </p>
          </div>

          <div className="section-actions">

            <input
              type="text"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >
              <option value="">
                Semua Status
              </option>

              <option value="Aktif">
                Aktif
              </option>

              <option value="Nonaktif">
                Nonaktif
              </option>
            </select>

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
                  <th>Jabatan</th>
                  <th>Telepon</th>
                  <th>Status</th>
                  <th>Tanggal Masuk</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center"
                    >
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id}>
                      <td>{e.nama}</td>
                      <td>{e.jabatan}</td>
                      <td>{e.telepon || "-"}</td>
                      <td>{e.status}</td>
                      <td>
                        {e.tanggalMasuk || "-"}
                      </td>

                      <td
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            openEdit(e)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() =>
                            remove(e.id)
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
                  ? "Edit Karyawan"
                  : "Tambah Karyawan"}
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
                  />
                </div>

                <div className="form-group">
                  <label>Jabatan</label>

                  <input
                    name="jabatan"
                    value={form.jabatan}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Telepon</label>

                  <input
                    name="telepon"
                    value={form.telepon}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Gaji</label>

                  <input
                    name="gaji"
                    type="number"
                    value={form.gaji}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Tanggal Masuk</label>

                  <input
                    name="tanggalMasuk"
                    type="date"
                    value={form.tanggalMasuk}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                  >
                    <option value="Aktif">
                      Aktif
                    </option>

                    <option value="Nonaktif">
                      Nonaktif
                    </option>
                  </select>
                </div>

                <div className="form-group span-2">
                  <label>Catatan</label>

                  <textarea
                    name="catatan"
                    value={form.catatan}
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
