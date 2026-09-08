import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import { startRestaurantCheckout } from "../lib/restaurantCheckout";
import { useAuthStore } from "../stores/auth";
import type {
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantProduct,
  RestaurantTable,
} from "../types/restaurant";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const kitchenLabel = {
  draft: "Draft",
  queued: "Antre",
  preparing: "Dimasak",
  ready: "Siap",
  served: "Disajikan",
  cancelled: "Dibatalkan",
};

export default function RestaurantTablesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [order, setOrder] = useState<RestaurantOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableCode, setTableCode] = useState("");
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("4");
  const [tableSortOrder, setTableSortOrder] = useState("0");
  const [tableActive, setTableActive] = useState(true);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.nama, product.kode, product.kategori]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [products, search]);

  const activeItems = useMemo(
    () =>
      order?.items.filter(
        (item) => item.kitchenStatus !== "cancelled"
      ) ?? [],
    [order]
  );

  const hasDraft = activeItems.some(
    (item) => item.kitchenStatus === "draft"
  );

  const loadBase = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const [tableResponse, productResponse] = await Promise.all([
        api.get<RestaurantTable[]>("/api/restaurant/tables", { signal }),
        api.get<RestaurantProduct[]>("/api/products", { signal }),
      ]);

      setTables(tableResponse.data);
      setProducts(productResponse.data);

      setSelectedTableId((current) => {
        if (
          current &&
          tableResponse.data.some((table) => table.id === current)
        ) {
          return current;
        }

        return (
          tableResponse.data.find((table) => table.status === "occupied")?.id ??
          tableResponse.data[0]?.id ??
          ""
        );
      });
    } catch (requestError: unknown) {
      if (!signal?.aborted) {
        setError(getApiError(requestError).message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const loadOrder = useCallback(async (orderId: string | null) => {
    if (!orderId) {
      setOrder(null);
      setDraftNotes({});
      return;
    }

    setOrderLoading(true);
    setActionError("");

    try {
      const { data } = await api.get<RestaurantOrder>(
        `/api/restaurant/orders/${orderId}`
      );

      setOrder(data);
      setDraftNotes(
        Object.fromEntries(
          data.items.map((item) => [item.id, item.note])
        )
      );
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBase(controller.signal);
    return () => controller.abort();
  }, [loadBase]);

  useEffect(() => {
    void loadOrder(selectedTable?.openOrderId ?? null);
  }, [selectedTable?.openOrderId, loadOrder]);

  async function refreshAfterOrder(nextOrder?: RestaurantOrder | null) {
    if (nextOrder !== undefined) {
      setOrder(nextOrder);
      if (nextOrder) {
        setDraftNotes(
          Object.fromEntries(
            nextOrder.items.map((item) => [item.id, item.note])
          )
        );
      }
    }

    const { data } = await api.get<RestaurantTable[]>(
      "/api/restaurant/tables"
    );
    setTables(data);
  }

  async function openOrder() {
    if (!selectedTable || actionBusy) return;

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await api.post<RestaurantOrder>(
        "/api/restaurant/orders",
        { tableId: selectedTable.id }
      );

      await refreshAfterOrder(data);
      setSuccess(`Pesanan ${data.orderNumber} dibuka.`);
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function addProduct(product: RestaurantProduct) {
    if (!order || actionBusy) return;

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await api.post<RestaurantOrder>(
        `/api/restaurant/orders/${order.id}/items`,
        {
          productId: product.id,
          qty: 1,
          note: noteDraft.trim(),
        }
      );

      setNoteDraft("");
      await refreshAfterOrder(data);
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function updateDraftItem(
    item: RestaurantOrderItem,
    qty: number,
    note = draftNotes[item.id] ?? item.note
  ) {
    if (!order || actionBusy || item.kitchenStatus !== "draft") return;

    if (qty <= 0) {
      await removeDraftItem(item);
      return;
    }

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await api.put<RestaurantOrder>(
        `/api/restaurant/orders/${order.id}/items/${item.id}`,
        { qty, note: note.trim() }
      );

      await refreshAfterOrder(data);
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function removeDraftItem(item: RestaurantOrderItem) {
    if (!order || actionBusy || item.kitchenStatus !== "draft") return;

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await api.delete<RestaurantOrder>(
        `/api/restaurant/orders/${order.id}/items/${item.id}`
      );

      await refreshAfterOrder(data);
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function sendToKitchen() {
    if (!order || actionBusy || !hasDraft) return;

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await api.post<RestaurantOrder>(
        `/api/restaurant/orders/${order.id}/send-to-kitchen`
      );

      await refreshAfterOrder(data);
      setSuccess("Item draft sudah dikirim ke dapur.");
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function cancelOrder() {
    if (!order || !isAdmin || actionBusy) return;

    const reason = window.prompt(
      `Alasan membatalkan ${order.orderNumber}?`
    )?.trim();

    if (!reason) return;

    if (
      !window.confirm(
        `Batalkan pesanan ${order.orderNumber} di ${order.tableName}?`
      )
    ) {
      return;
    }

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      await api.post(
        `/api/restaurant/orders/${order.id}/cancel`,
        { reason }
      );

      setOrder(null);
      await refreshAfterOrder(null);
      setSuccess("Pesanan dibatalkan dan meja kembali tersedia.");
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  function payAtCashier() {
    if (!order || activeItems.length === 0) return;

    if (hasDraft) {
      setActionError(
        "Masih ada item draft. Kirim ke dapur dulu sebelum pembayaran."
      );
      return;
    }

    startRestaurantCheckout(
      order.id,
      order.orderNumber,
      order.tableName
    );

    navigate(`/kasir?restaurantOrder=${order.id}`);
  }

  function resetTableForm() {
    setEditingTableId(null);
    setTableCode("");
    setTableName("");
    setTableCapacity("4");
    setTableSortOrder("0");
    setTableActive(true);
    setShowTableForm(false);
  }

  function editTable(table: RestaurantTable) {
    setEditingTableId(table.id);
    setTableCode(table.code);
    setTableName(table.name);
    setTableCapacity(String(table.capacity));
    setTableSortOrder(String(table.sortOrder));
    setTableActive(table.active);
    setShowTableForm(true);
  }

  async function saveTable(event: FormEvent) {
    event.preventDefault();

    const capacity = Number(tableCapacity);
    const sortOrder = Number(tableSortOrder);

    if (!tableCode.trim() || !tableName.trim()) {
      setActionError("Kode dan nama meja wajib diisi.");
      return;
    }

    setActionBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const payload = {
        code: tableCode.trim(),
        name: tableName.trim(),
        capacity,
        sortOrder,
        active: tableActive,
      };

      if (editingTableId) {
        await api.put(
          `/api/restaurant/tables/${editingTableId}`,
          payload
        );
        setSuccess("Data meja diperbarui.");
      } else {
        await api.post("/api/restaurant/tables", payload);
        setSuccess("Meja baru ditambahkan.");
      }

      resetTableForm();
      await loadBase();
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="restaurant-page">
        <div className="content-header restaurant-heading">
          <div>
            <h1>Meja & Pesanan</h1>
            <p>Buka pesanan meja, kirim item ke dapur, lalu bayar lewat Kasir.</p>
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (showTableForm) {
                  resetTableForm();
                } else {
                  setShowTableForm(true);
                }
              }}
            >
              {showTableForm ? "Tutup Form" : "Kelola Meja"}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="finance-state finance-error" role="alert">
            <strong>Data restoran belum dapat dimuat</strong>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void loadBase()}
            >
              Coba Lagi
            </button>
          </div>
        ) : null}

        {actionError ? (
          <div className="finance-inline-error" role="alert">
            {actionError}
          </div>
        ) : null}

        {success ? (
          <div className="finance-success" role="status">
            {success}
          </div>
        ) : null}

        {showTableForm && isAdmin ? (
          <section className="finance-panel restaurant-table-form-panel">
            <h2>{editingTableId ? "Ubah Meja" : "Tambah Meja"}</h2>
            <form
              className="restaurant-table-form"
              onSubmit={saveTable}
            >
              <label>
                Kode meja
                <input
                  value={tableCode}
                  onChange={(event) => setTableCode(event.target.value)}
                  placeholder="A1"
                />
              </label>

              <label>
                Nama meja
                <input
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  placeholder="Meja A1"
                />
              </label>

              <label>
                Kapasitas
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={tableCapacity}
                  onChange={(event) => setTableCapacity(event.target.value)}
                />
              </label>

              <label>
                Urutan
                <input
                  type="number"
                  min={0}
                  value={tableSortOrder}
                  onChange={(event) => setTableSortOrder(event.target.value)}
                />
              </label>

              <label className="restaurant-checkbox-label">
                <input
                  type="checkbox"
                  checked={tableActive}
                  onChange={(event) => setTableActive(event.target.checked)}
                />
                Meja aktif
              </label>

              <div className="restaurant-table-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetTableForm}
                  disabled={actionBusy}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionBusy}
                >
                  {actionBusy ? "Menyimpan..." : "Simpan Meja"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {loading ? (
          <div className="finance-state" role="status">
            Memuat meja...
          </div>
        ) : !error ? (
          <div className="restaurant-layout">
            <aside className="finance-panel restaurant-table-panel">
              <div className="finance-panel-heading">
                <div>
                  <h2>Daftar Meja</h2>
                  <p>{tables.length} meja terdaftar</p>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="finance-empty">
                  <strong>Belum ada meja</strong>
                  <p>Owner/admin dapat menambahkan meja terlebih dahulu.</p>
                </div>
              ) : (
                <div className="restaurant-table-grid">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      className={
                        selectedTableId === table.id
                          ? "restaurant-table-card selected"
                          : "restaurant-table-card"
                      }
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      <span className="restaurant-table-card-top">
                        <strong>{table.code}</strong>
                        <span
                          className={
                            table.status === "occupied"
                              ? "restaurant-table-status occupied"
                              : "restaurant-table-status available"
                          }
                        >
                          {table.status === "occupied" ? "Terisi" : "Kosong"}
                        </span>
                      </span>

                      <span>{table.name}</span>
                      <small>Kapasitas {table.capacity}</small>

                      {table.status === "occupied" ? (
                        <>
                          <small>{table.openOrderNumber}</small>
                          <strong>{currency.format(table.openOrderSubtotal)}</strong>
                          {table.kitchenPendingItems > 0 ? (
                            <small>
                              {table.kitchenPendingItems} item aktif di dapur
                            </small>
                          ) : null}
                        </>
                      ) : null}

                      {isAdmin ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="restaurant-table-edit"
                          onClick={(event) => {
                            event.stopPropagation();
                            editTable(table);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.stopPropagation();
                              editTable(table);
                            }
                          }}
                        >
                          Ubah
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <main className="finance-panel restaurant-order-panel">
              {!selectedTable ? (
                <div className="finance-empty">
                  <strong>Pilih meja</strong>
                  <p>Pilih meja untuk melihat atau membuka pesanan.</p>
                </div>
              ) : orderLoading ? (
                <div className="finance-state" role="status">
                  Memuat pesanan...
                </div>
              ) : !order ? (
                <div className="restaurant-open-order-state">
                  <span
                    className={
                      selectedTable.active
                        ? "restaurant-table-status available"
                        : "restaurant-table-status inactive"
                    }
                  >
                    {selectedTable.active ? "Meja tersedia" : "Meja nonaktif"}
                  </span>
                  <h2>{selectedTable.name}</h2>
                  <p>
                    Kapasitas {selectedTable.capacity}. Belum ada pesanan aktif.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedTable.active || actionBusy}
                    onClick={() => void openOrder()}
                  >
                    {actionBusy ? "Membuka..." : "Buka Pesanan"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="restaurant-order-header">
                    <div>
                      <span className="platform-eyebrow">
                        {order.orderNumber}
                      </span>
                      <h2>{order.tableName}</h2>
                      <p>
                        {activeItems.length} baris item ·{" "}
                        {currency.format(order.subtotal)}
                      </p>
                    </div>

                    <div className="restaurant-order-actions">
                      {isAdmin ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={actionBusy}
                          onClick={() => void cancelOrder()}
                        >
                          Batalkan Pesanan
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={
                          actionBusy ||
                          activeItems.length === 0 ||
                          hasDraft
                        }
                        onClick={payAtCashier}
                      >
                        Bayar di Kasir
                      </button>
                    </div>
                  </div>

                  <section className="restaurant-order-items">
                    <div className="finance-panel-heading">
                      <div>
                        <h3>Item Pesanan</h3>
                        <p>
                          Draft masih dapat diubah. Item yang sudah dikirim
                          dikontrol dari Dapur.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!hasDraft || actionBusy}
                        onClick={() => void sendToKitchen()}
                      >
                        Kirim Draft ke Dapur
                      </button>
                    </div>

                    {activeItems.length === 0 ? (
                      <div className="finance-empty">
                        <strong>Pesanan masih kosong</strong>
                        <p>Tambahkan produk dari daftar di bawah.</p>
                      </div>
                    ) : (
                      <div className="restaurant-order-item-list">
                        {activeItems.map((item) => (
                          <div
                            key={item.id}
                            className="restaurant-order-item"
                          >
                            <div className="restaurant-order-item-main">
                              <strong>{item.nama}</strong>
                              <small>
                                {currency.format(item.hargaJual)} × {item.qty}
                              </small>

                              {item.kitchenStatus === "draft" ? (
                                <div className="restaurant-draft-note">
                                  <input
                                    aria-label={`Catatan ${item.nama}`}
                                    value={draftNotes[item.id] ?? item.note}
                                    onChange={(event) =>
                                      setDraftNotes((current) => ({
                                        ...current,
                                        [item.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="Catatan dapur"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={actionBusy}
                                    onClick={() =>
                                      void updateDraftItem(item, item.qty)
                                    }
                                  >
                                    Simpan
                                  </button>
                                </div>
                              ) : item.note ? (
                                <small>Catatan: {item.note}</small>
                              ) : null}
                            </div>

                            <div className="restaurant-order-item-end">
                              <span
                                className={`restaurant-kitchen-status ${item.kitchenStatus}`}
                              >
                                {kitchenLabel[item.kitchenStatus]}
                              </span>

                              <strong>{currency.format(item.subtotal)}</strong>

                              {item.kitchenStatus === "draft" ? (
                                <div className="restaurant-qty-actions">
                                  <button
                                    type="button"
                                    aria-label={`Kurangi ${item.nama}`}
                                    disabled={actionBusy}
                                    onClick={() =>
                                      void updateDraftItem(item, item.qty - 1)
                                    }
                                  >
                                    −
                                  </button>
                                  <span>{item.qty}</span>
                                  <button
                                    type="button"
                                    aria-label={`Tambah ${item.nama}`}
                                    disabled={actionBusy}
                                    onClick={() =>
                                      void updateDraftItem(item, item.qty + 1)
                                    }
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    className="restaurant-remove-item"
                                    disabled={actionBusy}
                                    onClick={() => void removeDraftItem(item)}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="restaurant-product-picker">
                    <div className="finance-panel-heading">
                      <div>
                        <h3>Tambah Item</h3>
                        <p>Harga dan stok mengikuti katalog POS saat ini.</p>
                      </div>
                    </div>

                    <div className="restaurant-product-controls">
                      <input
                        aria-label="Cari menu"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari menu..."
                      />
                      <input
                        aria-label="Catatan item berikutnya"
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Catatan item berikutnya (opsional)"
                      />
                    </div>

                    <div className="restaurant-product-grid">
                      {visibleProducts.map((product) => (
                        <article
                          key={product.id}
                          className="restaurant-product-card"
                        >
                          <div>
                            <strong>{product.nama}</strong>
                            <small>{product.kategori}</small>
                          </div>
                          <div>
                            <strong>{currency.format(product.hargaJual)}</strong>
                            <small>
                              {product.stok > 0
                                ? `Stok ${product.stok}`
                                : "Habis"}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={product.stok <= 0 || actionBusy}
                            onClick={() => void addProduct(product)}
                          >
                            Tambah
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </main>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
