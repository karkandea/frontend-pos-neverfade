import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

type UserRole = "owner" | "admin" | "kasir";

type ManagedUser = {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
};

type UserForm = {
  nama: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
};

const emptyForm: UserForm = {
  nama: "",
  username: "",
  password: "",
  role: "kasir",
  active: true,
};

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Terjadi kesalahan.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        title?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Terjadi kesalahan."
  );
}

export default function PenggunaPage() {
  const currentUser = useAuthStore(
    (state) => state.user
  );

  const [users, setUsers] =
    useState<ManagedUser[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<UserForm>(emptyForm);

  const [saving, setSaving] =
    useState(false);

  const filteredUsers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [
        user.nama,
        user.username,
        user.role,
        user.active
          ? "aktif"
          : "nonaktif",
      ].some((value) =>
        value
          .toLowerCase()
          .includes(query)
      )
    );
  }, [users, search]);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.get<ManagedUser[]>(
          "/api/users"
        );

      setUsers(response.data);
    } catch (error) {
      setLoadError(
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingId(user.id);

    setForm({
      nama: user.nama,
      username: user.username,
      password: "",
      role: user.role,
      active: user.active,
    });

    setOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function onChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "active"
          ? value === "true"
          : value,
    }));
  }

  async function save() {
    const nama = form.nama.trim();
    const username =
      form.username.trim();

    if (!nama) {
      window.alert(
        "Nama pengguna wajib diisi."
      );
      return;
    }

    if (!username) {
      window.alert(
        "Username wajib diisi."
      );
      return;
    }

    if (
      !editingId &&
      !form.password.trim()
    ) {
      window.alert(
        "Password wajib diisi."
      );
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const payload: {
          nama: string;
          username: string;
          role: UserRole;
          active: boolean;
          password?: string;
        } = {
          nama,
          username,
          role: form.role,
          active: form.active,
        };

        if (form.password.trim()) {
          payload.password =
            form.password;
        }

        await api.put(
          `/api/users/${editingId}`,
          payload
        );
      } else {
        await api.post(
          "/api/users",
          {
            nama,
            username,
            password: form.password,
            role: form.role,
          }
        );
      }

      closeModal();
      await loadUsers();
    } catch (error) {
      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(
    user: ManagedUser
  ) {
    if (
      user.id === currentUser?.id
    ) {
      window.alert(
        "Akun yang sedang digunakan tidak dapat dihapus."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus pengguna ${user.nama}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/api/users/${user.id}`
      );

      await loadUsers();
    } catch (error) {
      window.alert(
        getErrorMessage(error)
      );
    }
  }

  return (
    <AppShell>
      <section className="content-section active">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Pengguna
            </h2>

            <p className="section-sub">
              Kelola akun dan hak akses
            </p>
          </div>

          <div className="section-actions">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Cari pengguna..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={openCreate}
            >
              Tambah Pengguna
            </button>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <p>Memuat pengguna...</p>
          ) : loadError ? (
            <div className="table-empty">
              <p>{loadError}</p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  void loadUsers()
                }
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center"
                      >
                        Belum ada pengguna.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(
                      (user) => (
                        <tr key={user.id}>
                          <td>
                            {user.nama}
                          </td>

                          <td>
                            {user.username}
                          </td>

                          <td>
                            {user.role}
                          </td>

                          <td>
                            <span className="status-badge">
                              {user.active
                                ? "Aktif"
                                : "Nonaktif"}
                            </span>
                          </td>

                          <td>
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: 8,
                              }}
                            >
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  openEdit(
                                    user
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn-danger"
                                disabled={
                                  user.id ===
                                  currentUser?.id
                                }
                                onClick={() =>
                                  void removeUser(
                                    user
                                  )
                                }
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
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
                {editingId
                  ? "Edit Pengguna"
                  : "Tambah Pengguna"}
              </h3>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group span-2">
                  <label>
                    Nama Lengkap *
                  </label>

                  <input
                    name="nama"
                    value={form.nama}
                    placeholder="Nama pengguna"
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Username *
                  </label>

                  <input
                    name="username"
                    value={
                      form.username
                    }
                    placeholder="username"
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    {editingId
                      ? "Password Baru"
                      : "Password *"}
                  </label>

                  <input
                    name="password"
                    type="password"
                    value={
                      form.password
                    }
                    placeholder={
                      editingId
                        ? "Kosongkan jika tetap"
                        : "Masukkan password"
                    }
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Role *</label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={onChange}
                  >
                    <option value="owner">
                      Owner
                    </option>

                    <option value="admin">
                      Admin
                    </option>

                    <option value="kasir">
                      Kasir
                    </option>
                  </select>
                </div>

                {editingId && (
                  <div className="form-group">
                    <label>Status</label>

                    <select
                      name="active"
                      value={String(
                        form.active
                      )}
                      onChange={onChange}
                    >
                      <option value="true">
                        Aktif
                      </option>

                      <option value="false">
                        Nonaktif
                      </option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={closeModal}
              >
                Batal
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() =>
                  void save()
                }
              >
                {saving
                  ? "Menyimpan..."
                  : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
