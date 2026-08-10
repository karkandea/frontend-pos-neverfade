import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import PlatformShell from "../../components/platform/PlatformShell";
import platformApi from "../../lib/platformApi";
import { getPlatformErrorMessage } from "../../lib/platformError";
import type {
  CreatePlatformTenantRequest,
  PlatformTenant,
} from "../../types/platform";

const initialForm: CreatePlatformTenantRequest = {
  namaToko: "",
  owner: {
    nama: "",
    username: "",
    password: "",
  },
};

export default function PlatformTenantCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateOwner(
    field: keyof CreatePlatformTenantRequest["owner"],
    value: string
  ) {
    setForm((current) => ({
      ...current,
      owner: { ...current.owner, [field]: value },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const { data } = await platformApi.post<PlatformTenant>(
        "/api/platform/tenants",
        form
      );
      navigate(`/platform/tenants/${data.id}`, {
        replace: true,
        state: { created: true },
      });
    } catch (requestError: unknown) {
      setError(getPlatformErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PlatformShell>
      <div className="platform-breadcrumb">
        <Link to="/platform/tenants">Tenant</Link>
        <span aria-hidden="true">/</span>
        <span>Buat Tenant</span>
      </div>

      <div className="platform-page-heading platform-page-heading-compact">
        <div>
          <span className="platform-eyebrow">Provisioning</span>
          <h1>Buat Tenant</h1>
          <p>Tenant akan langsung aktif untuk operasional POS tunai.</p>
        </div>
      </div>

      <form className="platform-create-form" onSubmit={handleSubmit}>
        <section className="platform-form-section">
          <div className="platform-form-section-heading">
            <span>01</span>
            <div>
              <h2>Informasi Bisnis</h2>
              <p>Identitas toko yang tampil pada control plane.</p>
            </div>
          </div>
          <label className="platform-field" htmlFor="tenant-name">
            <span>Nama Toko</span>
            <input
              id="tenant-name"
              name="namaToko"
              type="text"
              required
              maxLength={200}
              autoFocus
              value={form.namaToko}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  namaToko: event.target.value,
                }))
              }
            />
            <small>Slug dan Tenant ID dibuat otomatis oleh server.</small>
          </label>
        </section>

        <section className="platform-form-section">
          <div className="platform-form-section-heading">
            <span>02</span>
            <div>
              <h2>Initial Owner</h2>
              <p>Owner pertama dibuat langsung di dalam tenant ini.</p>
            </div>
          </div>
          <div className="platform-form-grid">
            <label className="platform-field" htmlFor="owner-name">
              <span>Nama Owner</span>
              <input
                id="owner-name"
                name="ownerName"
                type="text"
                required
                maxLength={200}
                value={form.owner.nama}
                onChange={(event) => updateOwner("nama", event.target.value)}
              />
            </label>
            <label className="platform-field" htmlFor="owner-username">
              <span>Username</span>
              <input
                id="owner-username"
                name="ownerUsername"
                type="text"
                required
                maxLength={100}
                autoComplete="off"
                value={form.owner.username}
                onChange={(event) => updateOwner("username", event.target.value)}
              />
            </label>
            <label
              className="platform-field platform-field-full"
              htmlFor="owner-password"
            >
              <span>Password Awal</span>
              <div className="platform-password-input">
                <input
                  id="owner-password"
                  name="ownerPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={100}
                  autoComplete="new-password"
                  value={form.owner.password}
                  onChange={(event) => updateOwner("password", event.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
              <small>Minimal 8 karakter. Password tidak akan ditampilkan kembali.</small>
            </label>
          </div>
        </section>

        <div className="platform-form-actions">
          <div className="platform-form-error" role="alert" aria-live="polite">
            {error}
          </div>
          <div>
            <Link
              to="/platform/tenants"
              className="platform-button platform-button-secondary"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="platform-button platform-button-primary"
              disabled={submitting}
            >
              {submitting ? "Membuat Tenant..." : "Buat Tenant"}
            </button>
          </div>
        </div>
      </form>
    </PlatformShell>
  );
}
