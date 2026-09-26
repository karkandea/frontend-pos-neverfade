import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import { OUTLET_CHANGED_EVENT } from "../lib/outlet";

type WorkItem = { nama: string; unit: string; quantity: number };
type WorkOrder = {
  id: string; orderNumber: string; customerName: string;
  status: "received" | "in_progress" | "ready" | "completed" | "cancelled";
  notes: string; receivedAt: string; promisedAt: string;
  updatedAt: string; items: WorkItem[];
};

const statusNames: Record<WorkOrder["status"], string> = {
  received: "Baru masuk", in_progress: "Dikerjakan", ready: "Siap diambil",
  completed: "Selesai", cancelled: "Dibatalkan",
};

function nextStatus(status: WorkOrder["status"]) {
  if (status === "received") return { status: "in_progress", label: "Mulai kerja" };
  if (status === "in_progress") return { status: "ready", label: "Tandai siap" };
  return null;
}

export default function LaundryOperatorQueuePage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get<WorkOrder[]>("/api/laundry/operator");
      setOrders(response.data);
      setError("");
    } catch (cause) {
      setError(getApiError(cause).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Async network loader is intentionally started once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = window.setInterval(() => { void load(true); }, 30_000);
    const onOutletChanged = () => { setOrders([]); void load(); };
    window.addEventListener(OUTLET_CHANGED_EVENT, onOutletChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(OUTLET_CHANGED_EVENT, onOutletChanged);
    };
  }, [load]);

  async function advance(order: WorkOrder) {
    const next = nextStatus(order.status);
    if (!next || busyId) return;
    setBusyId(order.id);
    try {
      await api.post(`/api/laundry/operator/${order.id}/status`, { status: next.status });
      await load(true);
    } catch (cause) {
      setError(getApiError(cause).message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell>
      <section className="content-section active" aria-label="Antrean operator laundry">
        <div className="section-header">
          <div>
            <h1 className="section-title">Antrean Laundry</h1>
            <p className="section-sub">Pekerjaan outlet tugasmu. Pembayaran dan harga dikelola kasir.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
        {error ? <p role="alert" className="financial-validation-error">{error}</p> : null}
        {loading && orders.length === 0 ? <p>Memuat antrean laundry...</p> : null}
        {!loading && orders.length === 0 && !error ? <div className="table-card"><p className="table-empty">Belum ada pekerjaan laundry.</p></div> : null}
        <div className="dashboard-bottom" style={{ display: "grid", gap: 16 }}>
          {orders.map((order) => {
            const next = nextStatus(order.status);
            return (
              <article key={order.id} className="table-card" style={{ padding: 18 }}>
                <div className="card-header">
                  <div>
                    <h2 style={{ fontSize: 18 }}>{order.orderNumber}</h2>
                    <p>{order.customerName} · {statusNames[order.status]}</p>
                  </div>
                  <span className="status-badge">{statusNames[order.status]}</span>
                </div>
                <p>Estimasi selesai: {new Date(order.promisedAt).toLocaleString("id-ID")}</p>
                {order.notes ? <p>Catatan: {order.notes}</p> : null}
                <ul>{order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`}>{item.nama} — {item.quantity} {item.unit}</li>
                ))}</ul>
                {next ? (
                  <button className="btn-primary" type="button" disabled={Boolean(busyId)} onClick={() => void advance(order)}>
                    {busyId === order.id ? "Menyimpan..." : next.label}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
