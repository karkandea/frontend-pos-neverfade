import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";

type Envelope<T> = {
  data: T;
  meta: { correlationId: string; asOf: string };
};

type OpsHealth = {
  stalledPayments: number;
  unprocessedWebhooks: number;
  stalledJobs: number;
  needsAttention: boolean;
  outboxMetricsAvailable: boolean;
  workerDispatchAvailable: boolean;
};

type OpsAlert = {
  id: string;
  sourceKind: string;
  sourceId: string;
  correlationId: string;
  state: string;
  createdAt: string;
};

const sourceLabels: Record<string, string> = {
  payment_stalled: "Pembayaran tertahan",
  webhook_unprocessed: "Webhook belum diproses",
  job_stalled: "Pekerjaan tertahan",
};

export default function OwnerOpsAttention() {
  const [health, setHealth] = useState<OpsHealth | null>(null);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [signal, history] = await Promise.all([
        api.get<Envelope<OpsHealth>>("/api/v2/ops/health"),
        api.get<Envelope<OpsAlert[]>>("/api/v2/ops/alerts", {
          params: { limit: 5 },
        }),
      ]);
      setHealth(signal.data.data);
      setAlerts(history.data.data);
      setLastCheckedAt(signal.data.meta.asOf);
    } catch {
      setHealth(null);
      setAlerts([]);
      setLastCheckedAt(null);
      setError("Sinyal operasional belum dapat dimuat. Ini bukan berarti sistem aman.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial fetch out of the effect's synchronous render phase.
    const frame = window.requestAnimationFrame(() => void load());
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(poll);
    };
  }, [load]);

  return (
    <section className="card-panel" aria-label="Pemantauan operasional owner">
      <div className="card-header">
        <div>
          <h3>Pemantauan operasional</h3>
          <p>Data per tenant, hanya untuk owner</p>
        </div>
        <button type="button" className="btn-secondary"
          onClick={() => void load()} disabled={busy}>
          {busy ? "Memuat..." : "Perbarui"}
        </button>
      </div>

      {error ? (
        <p role="alert">{error}</p>
      ) : busy && !health ? (
        <p role="status">Memuat sinyal operasional...</p>
      ) : health ? (
        <div>
          {lastCheckedAt ? (
            <p className="section-sub">
              Terakhir diperiksa: {new Date(lastCheckedAt).toLocaleString("id-ID")}
            </p>
          ) : null}
          <p role="status">
            {health.needsAttention
              ? "Ada anomali yang perlu diperiksa."
              : "Belum terdeteksi anomali dari sumber yang dipantau."}
          </p>
          <div className="stats-grid" aria-label="Jumlah sinyal operasional">
            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">Pembayaran tertahan</div>
                <div className="stat-value">{health.stalledPayments}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">Webhook belum diproses</div>
                <div className="stat-value">{health.unprocessedWebhooks}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">Pekerjaan tertahan</div>
                <div className="stat-value">{health.stalledJobs}</div>
              </div>
            </div>
          </div>
          <h4>Alert tersimpan</h4>
          {alerts.length === 0 ? (
            <p>Belum ada alert tersimpan.</p>
          ) : (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <strong>{sourceLabels[alert.sourceKind] ?? "Sinyal operasional"}</strong>
                  {" — "}{alert.state}
                  <div>
                    <small>{new Date(alert.createdAt).toLocaleString("id-ID")}</small>
                    {" · "}
                    <code>{alert.correlationId}</code>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(!health.outboxMetricsAvailable || !health.workerDispatchAvailable) && (
            <p role="note">
              Metrik outbox dan pengiriman worker belum tersedia.
              Kartu ini hanya untuk pemeriksaan; tidak mengirim ulang pembayaran atau webhook.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
