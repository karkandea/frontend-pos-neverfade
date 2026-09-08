import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import type {
  KitchenQueueOrder,
  KitchenStatus,
  RestaurantOrderItem,
} from "../types/restaurant";

const statusLabel: Record<KitchenStatus, string> = {
  draft: "Draft",
  queued: "Antre",
  preparing: "Dimasak",
  ready: "Siap",
  served: "Disajikan",
  cancelled: "Dibatalkan",
};

const nextAction: Partial<
  Record<
    KitchenStatus,
    {
      status: KitchenStatus;
      label: string;
    }
  >
> = {
  queued: {
    status: "preparing",
    label: "Mulai Masak",
  },
  preparing: {
    status: "ready",
    label: "Tandai Siap",
  },
  ready: {
    status: "served",
    label: "Sudah Disajikan",
  },
};

const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export default function KitchenQueuePage() {
  const [orders, setOrders] = useState<KitchenQueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyItemId, setBusyItemId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "queued" | "preparing" | "ready"
  >("all");

  const loadQueue = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data } = await api.get<KitchenQueueOrder[]>(
        "/api/restaurant/kitchen"
      );
      setOrders(data);
    } catch (requestError: unknown) {
      setError(getApiError(requestError).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();

    const interval = window.setInterval(() => {
      void loadQueue(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadQueue]);

  const counts = useMemo(() => {
    const items = orders.flatMap((order) => order.items);

    return {
      all: items.length,
      queued: items.filter((item) => item.kitchenStatus === "queued").length,
      preparing: items.filter(
        (item) => item.kitchenStatus === "preparing"
      ).length,
      ready: items.filter((item) => item.kitchenStatus === "ready").length,
    };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders
      .map((order) => ({
        ...order,
        items: order.items.filter(
          (item) => item.kitchenStatus === filter
        ),
      }))
      .filter((order) => order.items.length > 0);
  }, [orders, filter]);

  async function advance(item: RestaurantOrderItem) {
    const action = nextAction[item.kitchenStatus];

    if (!action || busyItemId) return;

    setBusyItemId(item.id);
    setError("");

    try {
      await api.post(
        `/api/restaurant/kitchen/items/${item.id}/status`,
        { status: action.status }
      );

      await loadQueue(true);
    } catch (requestError: unknown) {
      setError(getApiError(requestError).message);
    } finally {
      setBusyItemId("");
    }
  }

  return (
    <AppShell>
      <section className="kitchen-page">
        <div className="content-header restaurant-heading">
          <div>
            <h1>Dapur</h1>
            <p>Antrean aktif dari pesanan meja, diperbarui otomatis.</p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={refreshing}
            onClick={() => void loadQueue(true)}
          >
            {refreshing ? "Memperbarui..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="finance-inline-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="kitchen-filter-bar" aria-label="Filter status dapur">
          {(
            [
              ["all", "Semua"],
              ["queued", "Antre"],
              ["preparing", "Dimasak"],
              ["ready", "Siap"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                filter === key
                  ? "restaurant-filter-chip active"
                  : "restaurant-filter-chip"
              }
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
              <span>{counts[key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="finance-state" role="status">
            Memuat antrean dapur...
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="finance-panel finance-empty kitchen-empty">
            <strong>Tidak ada item di antrean ini</strong>
            <p>Item akan muncul setelah kasir mengirim pesanan ke dapur.</p>
          </div>
        ) : (
          <div className="kitchen-order-grid">
            {visibleOrders.map((order) => (
              <article
                key={order.orderId}
                className="finance-panel kitchen-order-card"
              >
                <div className="kitchen-order-header">
                  <div>
                    <span className="platform-eyebrow">
                      {order.orderNumber}
                    </span>
                    <h2>{order.tableName}</h2>
                    <p>
                      Dibuka {timeFormat.format(new Date(order.openedAt))}
                    </p>
                  </div>
                  <span className="kitchen-order-count">
                    {order.items.length} item
                  </span>
                </div>

                <div className="kitchen-item-list">
                  {order.items.map((item) => {
                    const action = nextAction[item.kitchenStatus];

                    return (
                      <div
                        key={item.id}
                        className={`kitchen-item kitchen-item-${item.kitchenStatus}`}
                      >
                        <div className="kitchen-item-copy">
                          <div>
                            <strong>
                              {item.qty}× {item.nama}
                            </strong>
                            <span
                              className={`restaurant-kitchen-status ${item.kitchenStatus}`}
                            >
                              {statusLabel[item.kitchenStatus]}
                            </span>
                          </div>

                          {item.note ? (
                            <p>Catatan: {item.note}</p>
                          ) : (
                            <p className="kitchen-no-note">
                              Tanpa catatan
                            </p>
                          )}

                          {item.queuedAt ? (
                            <small>
                              Masuk{" "}
                              {timeFormat.format(new Date(item.queuedAt))}
                            </small>
                          ) : null}
                        </div>

                        {action ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyItemId === item.id}
                            onClick={() => void advance(item)}
                          >
                            {busyItemId === item.id
                              ? "Memproses..."
                              : action.label}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
