import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import PlatformShell from "../../components/platform/PlatformShell";
import TenantStatusBadge from "../../components/platform/TenantStatusBadge";
import platformApi from "../../lib/platformApi";
import { getPlatformErrorMessage } from "../../lib/platformError";
import type { PlatformTenant } from "../../types/platform";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

type LifecycleAction = "activate" | "suspend";

export default function PlatformTenantDetailPage() {
  const { tenantId } = useParams();
  const location = useLocation();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    location.state?.created ? "Tenant berhasil dibuat." : ""
  );
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTenant = useCallback(async (signal?: AbortSignal) => {
    if (!tenantId) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await platformApi.get<PlatformTenant>(
        `/api/platform/tenants/${tenantId}`,
        { signal }
      );
      setTenant(data);
    } catch (requestError: unknown) {
      if (!signal?.aborted) setError(getPlatformErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const controller = new AbortController();
    if (!tenantId) return () => controller.abort();

    platformApi
      .get<PlatformTenant>(`/api/platform/tenants/${tenantId}`, {
        signal: controller.signal,
      })
      .then(({ data }) => setTenant(data))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getPlatformErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tenantId]);

  async function submitLifecycle(event: FormEvent) {
    event.preventDefault();
    if (!tenant || !action) return;
    setSubmitting(true);
    setActionError("");
    setSuccess("");

    try {
      const endpoint = `/api/platform/tenants/${tenant.id}/${action}`;
      const body = action === "suspend"
        ? { reason: reason.trim() || null }
        : undefined;
      const { data } = await platformApi.post<PlatformTenant>(endpoint, body);
      setTenant(data);
      setSuccess(
        action === "suspend"
          ? "Tenant berhasil ditangguhkan."
          : "Tenant berhasil diaktifkan."
      );
      setAction(null);
      setReason("");
    } catch (requestError: unknown) {
      setActionError(getPlatformErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PlatformShell>
      <div className="platform-breadcrumb">
        <Link to="/platform/tenants">Tenant</Link>
        <span aria-hidden="true">/</span>
        <span>Detail</span>
      </div>

      {loading ? (
        <div className="platform-panel platform-loading" role="status">
          Memuat detail tenant...
        </div>
      ) : error || !tenant ? (
        <div className="platform-panel platform-error-state" role="alert">
          <strong>Detail tenant belum dapat dimuat</strong>
          <p>{error}</p>
          <button
            type="button"
            className="platform-button platform-button-secondary"
            onClick={() => void loadTenant()}
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          <div className="platform-page-heading">
            <div>
              <span className="platform-eyebrow">Tenant Detail</span>
              <h1>{tenant.namaToko}</h1>
              <p className="platform-mono">{tenant.id}</p>
            </div>
            <div className="platform-heading-actions">
              <TenantStatusBadge status={tenant.status} />
              {tenant.status === "active" ? (
                <button
                  type="button"
                  className="platform-button platform-button-danger"
                  onClick={() => {
                    setAction("suspend");
                    setActionError("");
                  }}
                >
                  Suspend Tenant
                </button>
              ) : (
                <button
                  type="button"
                  className="platform-button platform-button-primary"
                  onClick={() => {
                    setAction("activate");
                    setActionError("");
                  }}
                >
                  Aktifkan Tenant
                </button>
              )}
            </div>
          </div>

          <div className="platform-success" role="status" aria-live="polite">
            {success}
          </div>

          <div className="platform-detail-grid">
            <section className="platform-panel platform-detail-card">
              <span className="platform-card-label">Informasi Bisnis</span>
              <dl>
                <div><dt>Nama Toko</dt><dd>{tenant.namaToko}</dd></div>
                <div><dt>Slug</dt><dd className="platform-mono">{tenant.slug}</dd></div>
                <div><dt>Status</dt><dd><TenantStatusBadge status={tenant.status} /></dd></div>
                <div><dt>Dibuat</dt><dd>{dateTimeFormatter.format(new Date(tenant.createdAt))}</dd></div>
                <div><dt>Diperbarui</dt><dd>{dateTimeFormatter.format(new Date(tenant.updatedAt))}</dd></div>
              </dl>
            </section>

            <section className="platform-panel platform-detail-card">
              <span className="platform-card-label">Current Owner</span>
              {tenant.owner ? (
                <dl>
                  <div><dt>Nama</dt><dd>{tenant.owner.nama}</dd></div>
                  <div><dt>Username</dt><dd className="platform-mono">{tenant.owner.username}</dd></div>
                  <div><dt>Status User</dt><dd>{tenant.owner.active ? "Aktif" : "Tidak aktif"}</dd></div>
                </dl>
              ) : (
                <p>Owner tidak tersedia pada data tenant ini.</p>
              )}
            </section>
          </div>
        </>
      )}

      {action && tenant ? (
        <div className="platform-dialog-backdrop" role="presentation">
          <form
            className="platform-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lifecycle-dialog-title"
            onSubmit={submitLifecycle}
          >
            <span className={`platform-dialog-icon ${action}`} aria-hidden="true">
              {action === "suspend" ? (
                <strong>!</strong>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}
            </span>
            <h2 id="lifecycle-dialog-title">
              {action === "suspend" ? "Suspend tenant?" : "Aktifkan tenant?"}
            </h2>
            <p>
              {action === "suspend"
                ? `${tenant.namaToko} akan langsung kehilangan akses login dan seluruh API POS.`
                : `${tenant.namaToko} akan kembali dapat login dan menggunakan POS.`}
            </p>

            {action === "suspend" ? (
              <label className="platform-field" htmlFor="suspend-reason">
                <span>Alasan <small>(opsional)</small></span>
                <textarea
                  id="suspend-reason"
                  maxLength={500}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            ) : null}

            <div className="platform-form-error" role="alert">{actionError}</div>
            <div className="platform-dialog-actions">
              <button
                type="button"
                className="platform-button platform-button-secondary"
                disabled={submitting}
                onClick={() => {
                  setAction(null);
                  setActionError("");
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`platform-button ${
                  action === "suspend"
                    ? "platform-button-danger"
                    : "platform-button-primary"
                }`}
                disabled={submitting}
              >
                {submitting
                  ? "Memproses..."
                  : action === "suspend"
                    ? "Ya, Suspend"
                    : "Ya, Aktifkan"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </PlatformShell>
  );
}
