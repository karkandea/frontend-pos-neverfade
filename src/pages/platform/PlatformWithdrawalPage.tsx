import { useCallback, useEffect, useState } from "react";

import PlatformShell from "../../components/platform/PlatformShell";
import { getApiError } from "../../lib/apiError";
import platformApi from "../../lib/platformApi";
import type { PlatformWithdrawal, WithdrawalStatus } from "../../types/finance";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const statusLabel = { requested: "Menunggu", paid: "Dibayar", rejected: "Ditolak" };

export default function PlatformWithdrawalPage() {
  const [withdrawals, setWithdrawals] = useState<PlatformWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWithdrawals = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await platformApi.get<PlatformWithdrawal[]>(
        "/api/platform/withdrawals",
        { signal }
      );
      setWithdrawals(data);
    } catch (requestError: unknown) {
      if (!signal?.aborted) setError(getApiError(requestError).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    platformApi.get<PlatformWithdrawal[]>("/api/platform/withdrawals", {
      signal: controller.signal,
    }).then(({ data }) => setWithdrawals(data)).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(getApiError(requestError).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  async function changeStatus(item: PlatformWithdrawal, target: "mark-paid" | "reject") {
    const action = target === "mark-paid" ? "menandai pencairan sebagai dibayar" : "menolak pencairan";
    if (!window.confirm(`Yakin ingin ${action} untuk ${item.tenantName}?`)) return;

    setActionId(item.id);
    setActionError("");
    setSuccess("");
    try {
      const { data } = await platformApi.post<PlatformWithdrawal>(
        `/api/platform/withdrawals/${item.id}/${target}`
      );
      setWithdrawals((current) => current.map((entry) => entry.id === data.id ? data : entry));
      setSuccess(target === "mark-paid" ? "Pencairan ditandai sudah dibayar." : "Permintaan pencairan ditolak.");
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionId("");
    }
  }

  function statusBadge(status: WithdrawalStatus) {
    return <span className={`finance-status finance-status-${status}`}>{statusLabel[status]}</span>;
  }

  return (
    <PlatformShell>
      <div className="platform-page-heading">
        <div><span className="platform-eyebrow">Finance Operations</span><h1>Pencairan</h1><p>Proses permintaan pencairan tenant secara manual.</p></div>
      </div>

      {success ? <div className="platform-success-banner" role="status">{success}</div> : null}
      {actionError ? <div className="platform-error-banner" role="alert">{actionError}</div> : null}

      <section className="platform-panel" aria-busy={loading}>
        {loading ? (
          <div className="platform-loading" role="status">Memuat pencairan...</div>
        ) : error ? (
          <div className="platform-error-state" role="alert"><strong>Pencairan belum dapat dimuat</strong><p>{error}</p><button type="button" className="platform-button platform-button-secondary" onClick={() => void loadWithdrawals()}>Coba Lagi</button></div>
        ) : withdrawals.length === 0 ? (
          <div className="platform-empty-state"><strong>Belum ada permintaan pencairan</strong><p>Permintaan tenant akan muncul dalam antrean ini.</p></div>
        ) : (
          <div className="platform-table-wrap"><table className="platform-table"><thead><tr><th>Tenant</th><th>Diminta oleh</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{withdrawals.map((item) => <tr key={item.id}><td><strong>{item.tenantName}</strong><small>{item.tenantId}</small></td><td><span>{item.requestedByName}</span><small>{item.requestedByUsername}</small></td><td><strong>{currency.format(item.amount)}</strong></td><td>{dateTime.format(new Date(item.requestedAt))}</td><td>{statusBadge(item.status)}</td><td>{item.status === "requested" ? <div className="platform-table-actions"><button type="button" className="platform-button platform-button-primary" disabled={actionId === item.id} onClick={() => void changeStatus(item, "mark-paid")}>Tandai Dibayar</button><button type="button" className="platform-button platform-button-danger" disabled={actionId === item.id} onClick={() => void changeStatus(item, "reject")}>Tolak</button></div> : <span>Sudah diproses</span>}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </PlatformShell>
  );
}
