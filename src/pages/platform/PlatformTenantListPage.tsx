import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PlatformShell from "../../components/platform/PlatformShell";
import TenantStatusBadge from "../../components/platform/TenantStatusBadge";
import { businessModeOptions } from "../../lib/businessModes";
import platformApi from "../../lib/platformApi";
import { getPlatformErrorMessage } from "../../lib/platformError";
import type { PlatformTenant } from "../../types/platform";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

function businessLabel(tenant: PlatformTenant) {
  return businessModeOptions.find((option) => option.key === tenant.businessType)?.label
    ?? tenant.businessType;
}

export default function PlatformTenantListPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTenants = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await platformApi.get<PlatformTenant[]>(
        "/api/platform/tenants",
        { signal }
      );
      setTenants(data);
    } catch (requestError: unknown) {
      if (signal?.aborted) return;
      setError(getPlatformErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    platformApi
      .get<PlatformTenant[]>("/api/platform/tenants", {
        signal: controller.signal,
      })
      .then(({ data }) => setTenants(data))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getPlatformErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <PlatformShell>
      <div className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">Tenant Management</span>
          <h1>Tenant</h1>
          <p>Provisioning dan lifecycle bisnis yang memakai Neverfade POS.</p>
        </div>
        <Link
          to="/platform/tenants/new"
          className="platform-button platform-button-primary"
        >
          Buat Tenant
        </Link>
      </div>

      <section className="platform-panel" aria-busy={loading}>
        {loading ? (
          <div className="platform-loading" role="status">Memuat tenant...</div>
        ) : error ? (
          <div className="platform-error-state" role="alert">
            <strong>Tenant belum dapat dimuat</strong>
            <p>{error}</p>
            <button
              type="button"
              className="platform-button platform-button-secondary"
              onClick={() => void loadTenants()}
            >
              Coba Lagi
            </button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="platform-empty-state">
            <strong>Belum ada tenant</strong>
            <p>Buat tenant pertama untuk memulai onboarding bisnis.</p>
            <Link to="/platform/tenants/new">Buat Tenant</Link>
          </div>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Tipe Bisnis</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <strong>{tenant.namaToko}</strong>
                      <small>{tenant.slug}</small>
                    </td>
                    <td>
                      <span>{businessLabel(tenant)}</span>
                      <small>{tenant.capabilities.length} fitur aktif</small>
                    </td>
                    <td>
                      <span>{tenant.owner?.nama ?? "Owner belum tersedia"}</span>
                      <small>{tenant.owner?.username ?? "—"}</small>
                    </td>
                    <td><TenantStatusBadge status={tenant.status} /></td>
                    <td>{dateFormatter.format(new Date(tenant.createdAt))}</td>
                    <td>
                      <Link
                        className="platform-detail-link"
                        to={`/platform/tenants/${tenant.id}`}
                        aria-label={`Lihat detail ${tenant.namaToko}`}
                      >
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PlatformShell>
  );
}
