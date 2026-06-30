import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Product = {
  id: string;
  kode: string;
  nama: string;
  hargaJual: number;
  hargaModal?: number;
  stok: number;
};

type CartItem = {
  product: Product;
  qty: number;
};

type TransactionEvent = {
  type: "CHECKOUT_CREATED";
  timestamp: string;
  payload: any;
};

type Transaction = {
  id: number;
  tenantId: string;
  user: string;
  role: string;
  total: number;
  cash: number;
  change: number;
  profit: number;
  createdAt: string;
  events: TransactionEvent[];
  idempotencyKey: string;
  version: "v1";
};

export default function TransactionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [cash, setCash] = useState<number>(0);
  const [paidTx, setPaidTx] = useState<Transaction | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const tenantId = "tenant-001";
  const userName = "kasir-1";
  const role = "kasir";

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProducts();
    loadTransactions();
  }, []);

  async function loadProducts() {
    try {
      const { data } = await api.get(`/api/products?tenant=${tenantId}`);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const { data } = await api.get(`/api/transactions?tenant=${tenantId}`);
      setTransactions(data);
    } catch {}
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.kode.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  function addToCart(p: Product) {
    if (isProcessing) return;

    setCart((prev) => {
      const found = prev.find((c) => c.product.id === p.id);

      if (found) {
        if (found.qty + 1 > p.stok) return prev;

        return prev.map((c) =>
          c.product.id === p.id
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }

      if (p.stok <= 0) return prev;

      return [...prev, { product: p, qty: 1 }];
    });
  }

  const total = useMemo(() => {
    return cart.reduce(
      (sum, c) => sum + c.product.hargaJual * c.qty,
      0
    );
  }, [cart]);

  const change = cash - total;

  function generateIdempotencyKey() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const profit = useMemo(() => {
    return cart.reduce((sum, c) => {
      const modal = c.product.hargaModal ?? 0;
      return sum + (c.product.hargaJual - modal) * c.qty;
    }, 0);
  }, [cart]);

  function buildEvents(payload: any): TransactionEvent[] {
    return [
      {
        type: "CHECKOUT_CREATED",
        timestamp: new Date().toISOString(),
        payload,
      },
    ];
  }

  async function checkout() {
    if (isProcessing) return;
    if (cash < total) return;

    setIsProcessing(true);

    const idempotencyKey = generateIdempotencyKey();

    const basePayload = {
      tenantId,
      user: userName,
      role,
      total,
      cash,
      change,
      profit,
      version: "v1",
      idempotencyKey,
      items: cart.map((c) => ({
        productId: c.product.id,
        qty: c.qty,
        price: c.product.hargaJual,
        cost: c.product.hargaModal ?? 0,
      })),
      createdAt: new Date().toISOString(),
    };

    const payload = {
      ...basePayload,
      events: buildEvents(basePayload),
    };

    try {
      const { data } = await api.post("/api/transactions", payload);

      setProducts((prev) =>
        prev.map((p) => {
          const bought = cart.find((c) => c.product.id === p.id);
          if (!bought) return p;

          return {
            ...p,
            stok: Math.max(0, p.stok - bought.qty),
          };
        })
      );

      const tx: Transaction = {
        ...data,
        events: payload.events,
      };

      setPaidTx(tx);
      setTransactions((prev) => [tx, ...prev]);

      setCart([]);
      setCash(0);
      setSearch("");

      setTimeout(() => setPaidTx(null), 2500);
    } catch (e) {
      await loadProducts();
    } finally {
      setIsProcessing(false);
    }
  }

  const shiftTotal = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.total, 0);
  }, [transactions]);

  const shiftProfit = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.profit, 0);
  }, [transactions]);

  return (
    <AppShell>
      <div style={{ display: "flex", gap: 20 }}>

        {/* LEFT */}
        <div style={{ flex: 2 }}>
          <h2>PRODUCTION LEDGER POS</h2>

          <div>
            tenant: {tenantId} | user: {userName} | role: {role}
          </div>

          <input
            ref={inputRef}
            placeholder="scan / search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isProcessing}
          />

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 10,
                    border: "1px solid #ddd",
                  }}
                >
                  <div>
                    <b>{p.nama}</b>
                    <div>Rp {p.hargaJual}</div>
                    <small>Stock: {p.stok}</small>
                  </div>

                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stok <= 0 || isProcessing}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, borderLeft: "1px solid #ddd", paddingLeft: 20 }}>
          <h3>Cart</h3>

          {cart.map((c) => (
            <div key={c.product.id}>
              {c.product.nama} x {c.qty}
            </div>
          ))}

          <hr />

          <h3>Total: Rp {total}</h3>
          <h4>Profit: Rp {profit}</h4>

          <input
            type="number"
            placeholder="cash"
            value={cash}
            onChange={(e) => setCash(Number(e.target.value))}
            disabled={isProcessing}
          />

          <div>change: {change >= 0 ? change : 0}</div>

          <button
            onClick={checkout}
            disabled={!cart.length || cash < total || isProcessing}
          >
            {isProcessing ? "processing..." : "checkout"}
          </button>

          {paidTx && (
            <div style={{ marginTop: 10, border: "1px dashed #000", padding: 10 }}>
              <pre style={{ fontSize: 11 }}>
{`===== LEDGER RECEIPT =====
TX ID : ${paidTx.id}
TENANT: ${paidTx.tenantId}
USER  : ${paidTx.user}
ROLE  : ${paidTx.role}
TOTAL : ${paidTx.total}
PROFIT: ${paidTx.profit}
EVENTS: ${paidTx.events.length}
==========================`}
              </pre>
            </div>
          )}
        </div>

      </div>

      <hr />

      <div>
        <h3>SHIFT LEDGER SUMMARY</h3>
        <p>Transactions: {transactions.length}</p>
        <p>Total Sales: Rp {shiftTotal}</p>
        <p>Total Profit: Rp {shiftProfit}</p>
      </div>

    </AppShell>
  );
}
