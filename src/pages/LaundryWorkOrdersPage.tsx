import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { startLaundryCheckout } from "../lib/laundryCheckout";
import { buildLaundryWhatsAppUrl } from "../lib/laundryWhatsapp";
import { useTenantContextStore } from "../stores/tenantContext";
import type {
  LaundryStatus,
  LaundryWorkOrder,
} from "../types/laundry";
import type { Product } from "../types/product";

type Customer = {
  id: string;
  nama: string;
  hp: string;
};

type DraftItem = {
  productId: string;
  quantity: number;
};

const statusTabs: Array<{
  value: "" | LaundryStatus;
  label: string;
}> = [
  { value: "", label: "Semua" },
  { value: "received", label: "Baru Masuk" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "ready", label: "Siap Diambil" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const statusLabels: Record<LaundryStatus, string> = {
  received: "Baru Masuk",
  in_progress: "Dikerjakan",
  ready: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Terjadi kesalahan.";
  }

  const candidate = error as {
    message?: string;
    response?: { data?: { message?: string } };
  };

  return (
    candidate.response?.data?.message ??
    candidate.message ??
    "Terjadi kesalahan."
  );
}

function toLocalInputValue(date: Date) {
  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000
  );

  return local.toISOString().slice(0, 16);
}

export default function LaundryWorkOrdersPage() {
  const navigate = useNavigate();
  const tenantName =
    useTenantContextStore(
      (state) => state.context?.namaToko
    ) ?? "NeverFade POS";

  const [orders, setOrders] =
    useState<LaundryWorkOrder[]>([]);
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [products, setProducts] =
    useState<Product[]>([]);
  const [status, setStatus] =
    useState<"" | LaundryStatus>("");
  const [loading, setLoading] =
    useState(true);
  const [loadedAt, setLoadedAt] =
    useState(() => Date.now());
  const [error, setError] =
    useState("");
  const [busyId, setBusyId] =
    useState("");
  const [createOpen, setCreateOpen] =
    useState(false);
  const [createError, setCreateError] =
    useState("");
  const [customerId, setCustomerId] =
    useState("");
  const [promisedAt, setPromisedAt] =
    useState(() =>
      toLocalInputValue(
        new Date(
          Date.now() +
            24 * 60 * 60 * 1000
        )
      )
    );
  const [notes, setNotes] =
    useState("");
  const [draftItems, setDraftItems] =
    useState<DraftItem[]>([]);
  const [
    draftProductId,
    setDraftProductId,
  ] = useState("");
  const [
    draftQuantity,
    setDraftQuantity,
  ] = useState(1);

  const filteredOrders = useMemo(
    () =>
      status
        ? orders.filter(
            (order) =>
              order.status === status
          )
        : orders,
    [orders, status]
  );

  const selectedProduct =
    products.find(
      (product) =>
        product.id === draftProductId
    );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        orderResponse,
        customerResponse,
        productResponse,
      ] = await Promise.all([
        api.get<LaundryWorkOrder[]>(
          "/api/laundry/work-orders"
        ),
        api.get<Customer[]>(
          "/api/customers"
        ),
        api.get<Product[]>(
          "/api/products"
        ),
      ]);

      setOrders(orderResponse.data);
      setCustomers(
        customerResponse.data
      );
      setProducts(
        productResponse.data
      );
      setLoadedAt(Date.now());
    } catch (loadError) {
      setError(
        getErrorMessage(loadError)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial API hydration is intentionally run once per mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  function openCreate() {
    setCustomerId("");
    setPromisedAt(
      toLocalInputValue(
        new Date(
          Date.now() +
            24 * 60 * 60 * 1000
        )
      )
    );
    setNotes("");
    setDraftItems([]);
    setDraftProductId("");
    setDraftQuantity(1);
    setCreateError("");
    setCreateOpen(true);
  }

  function addDraftItem() {
    if (!selectedProduct) {
      setCreateError(
        "Pilih produk atau layanan terlebih dahulu."
      );
      return;
    }

    if (
      !Number.isFinite(
        draftQuantity
      ) ||
      draftQuantity <= 0
    ) {
      setCreateError(
        "Jumlah harus lebih dari 0."
      );
      return;
    }

    if (
      selectedProduct.type ===
        "goods" &&
      !Number.isInteger(
        draftQuantity
      )
    ) {
      setCreateError(
        "Jumlah barang harus bilangan bulat."
      );
      return;
    }

    if (
      selectedProduct.tracksStock &&
      draftQuantity >
        selectedProduct.stok
    ) {
      setCreateError(
        "Stok " +
          selectedProduct.nama +
          " hanya " +
          selectedProduct.stok +
          "."
      );
      return;
    }

    const precision =
      selectedProduct
        .quantityPrecision ?? 0;

    const normalized =
      Number(
        draftQuantity.toFixed(
          precision
        )
      );

    setDraftItems((current) => {
      const existing =
        current.find(
          (item) =>
            item.productId ===
            selectedProduct.id
        );

      if (existing) {
        return current.map(
          (item) =>
            item.productId ===
            selectedProduct.id
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    normalized,
                }
              : item
        );
      }

      return [
        ...current,
        {
          productId:
            selectedProduct.id,
          quantity: normalized,
        },
      ];
    });

    setDraftQuantity(1);
    setCreateError("");
  }

  async function createOrder() {
    if (!customerId) {
      setCreateError(
        "Pelanggan wajib dipilih."
      );
      return;
    }

    if (
      draftItems.length === 0
    ) {
      setCreateError(
        "Tambahkan minimal satu produk atau layanan."
      );
      return;
    }

    const eta =
      new Date(promisedAt);

    if (
      !promisedAt ||
      Number.isNaN(
        eta.getTime()
      )
    ) {
      setCreateError(
        "Estimasi selesai wajib diisi."
      );
      return;
    }

    setBusyId("create");
    setCreateError("");

    try {
      await api.post(
        "/api/laundry/work-orders",
        {
          customerId,
          promisedAt:
            eta.toISOString(),
          notes,
          items: draftItems,
        }
      );

      setCreateOpen(false);
      await load();
    } catch (
      createRequestError
    ) {
      setCreateError(
        getErrorMessage(
          createRequestError
        )
      );
    } finally {
      setBusyId("");
    }
  }

  async function updateStatus(
    order: LaundryWorkOrder,
    nextStatus: LaundryStatus,
    reason = ""
  ) {
    setBusyId(order.id);

    try {
      await api.post(
        "/api/laundry/work-orders/" +
          order.id +
          "/status",
        {
          status: nextStatus,
          reason,
        }
      );

      await load();
    } catch (statusError) {
      window.alert(
        getErrorMessage(
          statusError
        )
      );
    } finally {
      setBusyId("");
    }
  }

  function cancelOrder(
    order: LaundryWorkOrder
  ) {
    const reason =
      window.prompt(
        "Alasan pembatalan pesanan:"
      );

    if (reason === null) return;

    if (
      reason.trim().length < 3
    ) {
      window.alert(
        "Alasan pembatalan minimal 3 karakter."
      );
      return;
    }

    void updateStatus(
      order,
      "cancelled",
      reason.trim()
    );
  }

  function payOrder(
    order: LaundryWorkOrder
  ) {
    startLaundryCheckout(order);
    navigate("/kasir");
  }

  function openWhatsApp(
    order: LaundryWorkOrder
  ) {
    const url =
      buildLaundryWhatsAppUrl(
        order,
        tenantName
      );

    if (!url) {
      window.alert(
        "Nomor WhatsApp pelanggan belum valid. Perbaiki nomor pelanggan terlebih dahulu."
      );
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <AppShell>
      <section className="content-section active laundry-page">
        <div className="section-header">
          <div>
            <h2>
              Pesanan Laundry
            </h2>
            <p>
              Kelola pekerjaan, ETA, pembayaran, dan pengambilan.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openCreate}
          >
            Pesanan Baru
          </button>
        </div>

        <div
          className="laundry-status-tabs"
          aria-label="Filter status pesanan laundry"
        >
          {statusTabs.map(
            (tab) => (
              <button
                key={
                  tab.value || "all"
                }
                type="button"
                className={
                  status ===
                  tab.value
                    ? "filter-chip active"
                    : "filter-chip"
                }
                aria-pressed={
                  status ===
                  tab.value
                }
                onClick={() =>
                  setStatus(
                    tab.value
                  )
                }
              >
                {tab.label}
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="table-card">
            <p>
              Memuat pesanan laundry...
            </p>
          </div>
        ) : error ? (
          <div
            className="table-card"
            role="alert"
          >
            <p>{error}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                void load()
              }
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredOrders.length ===
          0 ? (
          <div className="table-card table-empty">
            <p>
              Belum ada pesanan pada status ini.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={openCreate}
            >
              Buat Pesanan
            </button>
          </div>
        ) : (
          <div className="laundry-order-grid">
            {filteredOrders.map(
              (order) => {
                const overdue =
                  ![
                    "completed",
                    "cancelled",
                  ].includes(
                    order.status
                  ) &&
                  new Date(
                    order.promisedAt
                  ).getTime() <
                    loadedAt;

                return (
                  <article
                    key={order.id}
                    className={
                      overdue
                        ? "laundry-order-card overdue"
                        : "laundry-order-card"
                    }
                  >
                    <div className="laundry-order-card-head">
                      <div>
                        <strong>
                          {
                            order.orderNumber
                          }
                        </strong>
                        <span>
                          {
                            order.customerName
                          }
                        </span>
                      </div>

                      <span
                        className={
                          "laundry-status " +
                          order.status
                        }
                      >
                        {
                          statusLabels[
                            order.status
                          ]
                        }
                      </span>
                    </div>

                    <div className="laundry-order-meta">
                      <span>
                        ETA{" "}
                        {new Date(
                          order.promisedAt
                        ).toLocaleString(
                          "id-ID",
                          {
                            timeZone:
                              "Asia/Jakarta",
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          }
                        )}
                      </span>

                      {overdue ? (
                        <strong className="laundry-overdue">
                          Lewat ETA
                        </strong>
                      ) : null}
                    </div>

                    <div className="laundry-item-summary">
                      {order.items.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                          >
                            <span>
                              {
                                item.nama
                              }{" "}
                              ·{" "}
                              {
                                item.quantity
                              }
                              {item.unit
                                ? " " +
                                  item.unit
                                : ""}
                            </span>
                            <strong>
                              {rupiah(
                                item.subtotal
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>

                    <div className="laundry-order-total">
                      <span>
                        Total
                      </span>
                      <strong>
                        {rupiah(
                          order.total
                        )}
                      </strong>
                    </div>

                    <div className="laundry-payment-state">
                      Pembayaran:{" "}
                      <strong>
                        {order.paymentStatus ===
                        "paid"
                          ? "Lunas"
                          : "Belum dibayar"}
                      </strong>
                    </div>

                    {order.notes ? (
                      <p className="laundry-notes">
                        {order.notes}
                      </p>
                    ) : null}

                    <div className="laundry-order-actions">
                      {order.status ===
                      "received" ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={
                            busyId ===
                            order.id
                          }
                          onClick={() =>
                            void updateStatus(
                              order,
                              "in_progress"
                            )
                          }
                        >
                          Mulai Kerjakan
                        </button>
                      ) : null}

                      {order.status ===
                      "in_progress" ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={
                            busyId ===
                            order.id
                          }
                          onClick={() =>
                            void updateStatus(
                              order,
                              "ready"
                            )
                          }
                        >
                          Tandai Siap
                        </button>
                      ) : null}

                      {order.status ===
                      "ready" ? (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              openWhatsApp(
                                order
                              )
                            }
                          >
                            WhatsApp Pelanggan
                          </button>

                          {order.paymentStatus ===
                          "unpaid" ? (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() =>
                                payOrder(
                                  order
                                )
                              }
                            >
                              Bayar di Kasir
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={
                                busyId ===
                                order.id
                              }
                              onClick={() =>
                                void updateStatus(
                                  order,
                                  "completed"
                                )
                              }
                            >
                              Pesanan Diambil
                            </button>
                          )}
                        </>
                      ) : null}

                      {(order.status ===
                        "received" ||
                        order.status ===
                          "in_progress") &&
                      order.paymentStatus ===
                        "unpaid" ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={
                            busyId ===
                            order.id
                          }
                          onClick={() =>
                            cancelOrder(
                              order
                            )
                          }
                        >
                          Batalkan
                        </button>
                      ) : null}
                    </div>

                    <details className="laundry-history">
                      <summary>
                        Riwayat status
                      </summary>
                      <ol>
                        {order.statusHistory.map(
                          (
                            history
                          ) => (
                            <li
                              key={
                                history.id
                              }
                            >
                              <strong>
                                {
                                  statusLabels[
                                    history
                                      .toStatus
                                  ]
                                }
                              </strong>
                              <span>
                                {new Date(
                                  history.at
                                ).toLocaleString(
                                  "id-ID",
                                  {
                                    timeZone:
                                      "Asia/Jakarta",
                                  }
                                )}
                                {" · "}
                                {
                                  history.actorName
                                }
                              </span>
                              {history.reason ? (
                                <small>
                                  {
                                    history.reason
                                  }
                                </small>
                              ) : null}
                            </li>
                          )
                        )}
                      </ol>
                    </details>
                  </article>
                );
              }
            )}
          </div>
        )}

        <div
          className={
            createOpen
              ? "modal-overlay open"
              : "modal-overlay"
          }
        >
          <div
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-label="Buat pesanan laundry"
          >
            <div className="modal-header">
              <h3>
                Pesanan Laundry Baru
              </h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Tutup"
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="laundry-customer">
                    Pelanggan
                  </label>
                  <select
                    id="laundry-customer"
                    value={customerId}
                    onChange={(
                      event
                    ) =>
                      setCustomerId(
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Pilih pelanggan
                    </option>
                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer.id
                          }
                          value={
                            customer.id
                          }
                        >
                          {
                            customer.nama
                          }{" "}
                          ·{" "}
                          {
                            customer.hp
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="laundry-eta">
                    Estimasi selesai
                  </label>
                  <input
                    id="laundry-eta"
                    type="datetime-local"
                    value={
                      promisedAt
                    }
                    onChange={(
                      event
                    ) =>
                      setPromisedAt(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="laundry-product">
                    Produk / layanan
                  </label>
                  <select
                    id="laundry-product"
                    value={
                      draftProductId
                    }
                    onChange={(
                      event
                    ) => {
                      setDraftProductId(
                        event.target
                          .value
                      );
                      setDraftQuantity(
                        1
                      );
                    }}
                  >
                    <option value="">
                      Pilih item
                    </option>
                    {products.map(
                      (product) => (
                        <option
                          key={
                            product.id
                          }
                          value={
                            product.id
                          }
                        >
                          {
                            product.nama
                          }{" "}
                          ·{" "}
                          {product.type ===
                          "service"
                            ? "Jasa / " +
                              (product.satuan ||
                                "unit")
                            : "Barang · stok " +
                              product.stok}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="laundry-quantity">
                    Jumlah
                    {selectedProduct
                      ?.satuan
                      ? " (" +
                        selectedProduct.satuan +
                        ")"
                      : ""}
                  </label>
                  <input
                    id="laundry-quantity"
                    type="number"
                    min={
                      selectedProduct?.type ===
                      "service"
                        ? Math.pow(
                            10,
                            -(
                              selectedProduct.quantityPrecision ??
                              0
                            )
                          )
                        : 1
                    }
                    step={
                      selectedProduct?.type ===
                      "service"
                        ? Math.pow(
                            10,
                            -(
                              selectedProduct.quantityPrecision ??
                              0
                            )
                          )
                        : 1
                    }
                    value={
                      draftQuantity
                    }
                    onChange={(
                      event
                    ) =>
                      setDraftQuantity(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                  />
                </div>

                <div className="form-group span-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      addDraftItem
                    }
                  >
                    Tambah Item
                  </button>
                </div>

                <div className="form-group span-2">
                  <div className="laundry-draft-items">
                    {draftItems.length ===
                    0 ? (
                      <p>
                        Belum ada item.
                      </p>
                    ) : (
                      draftItems.map(
                        (item) => {
                          const product =
                            products.find(
                              (
                                entry
                              ) =>
                                entry.id ===
                                item.productId
                            );

                          return (
                            <div
                              key={
                                item.productId
                              }
                            >
                              <span>
                                {product?.nama ??
                                  "Item"}{" "}
                                ·{" "}
                                {
                                  item.quantity
                                }
                                {product
                                  ?.satuan
                                  ? " " +
                                    product.satuan
                                  : ""}
                              </span>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  setDraftItems(
                                    (
                                      current
                                    ) =>
                                      current.filter(
                                        (
                                          entry
                                        ) =>
                                          entry.productId !==
                                          item.productId
                                      )
                                  )
                                }
                              >
                                Hapus
                              </button>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </div>

                <div className="form-group span-2">
                  <label htmlFor="laundry-notes">
                    Catatan
                  </label>
                  <textarea
                    id="laundry-notes"
                    value={notes}
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event.target
                          .value
                      )
                    }
                    maxLength={
                      1000
                    }
                    placeholder="Contoh: pisahkan pakaian putih."
                  />
                </div>
              </div>

              {createError ? (
                <p
                  className="financial-validation-error"
                  role="alert"
                >
                  {createError}
                </p>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  busyId ===
                  "create"
                }
                onClick={() =>
                  void createOrder()
                }
              >
                {busyId ===
                "create"
                  ? "Menyimpan..."
                  : "Simpan Pesanan"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
