import { useEffect, useMemo, useRef, useState } from "react";

import CartPanel from "../components/kasir/CartPanel";
import HostedPaymentModal from "../components/kasir/HostedPaymentModal";
import ProductGrid from "../components/kasir/ProductGrid";
import QrisPaymentModal from "../components/kasir/QrisPaymentModal";
import ReceiptModal from "../components/kasir/ReceiptModal";
import PaymentSuccessModal from "../components/kasir/PaymentSuccessModal";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import {
  clearRestaurantCheckout,
  getRestaurantCheckout,
  markRestaurantCheckoutTransaction,
  resetRestaurantCheckoutTransaction,
  type RestaurantCheckoutContext,
} from "../lib/restaurantCheckout";
import {
  clearLaundryCheckout,
  getLaundryCheckout,
  markLaundryCheckoutTransaction,
  resetLaundryCheckoutTransaction,
  type LaundryCheckoutContext,
} from "../lib/laundryCheckout";
import type { LaundryWorkOrder } from "../types/laundry";
import type { Product } from "../types/product";
import type { RestaurantOrder, RestaurantProduct } from "../types/restaurant";
import type {
  HostedPayment,
  PaymentCapabilities,
  PaymentStatus,
  QrisPayment,
} from "../types/payment";

type Customer = {
  id: string;
  nama: string;
};

type CartItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
  productType?: "goods" | "service";
  tracksStock?: boolean;
  quantityPrecision?: number;
  unit?: string;
  quantity?: number;
};

type Settings = {
  defaultTax: number;
  headerStruk: string;
  footerStruk: string;
};

type ReceiptData = {
  transactionId: string;
  transactionDate: string;
  noTrx: string;
  subtotal: number;
  discAmt: number;
  taxAmt: number;
  total: number;
  dibayar: number;
  kembalian: number;
  metodePembayaran: string;
  items: CartItem[];
};

type PaymentMethod = "tunai" | "qris" | "xendit";

type TransactionResponse = ReceiptData & {
  id: string;
  createdAt?: string;
};

const PAYMENT_POLL_INTERVAL_MS = 1000;
const ACTIVE_QRIS_KEY = "nfpos_active_qris";
const ACTIVE_HOSTED_KEY = "nfpos_active_xendit";

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function waitForPaymentStatus(
  paymentId: string,
  signal: AbortSignal,
  onRetry: (message: string) => void
) {
  while (!signal.aborted) {
    await wait(PAYMENT_POLL_INTERVAL_MS, signal);

    try {
      const response = await api.get<PaymentStatus>(
        `/api/payments/${paymentId}`,
        { signal }
      );
      const status = response.data.status;

      onRetry("");

      if (
        status === "paid" ||
        status === "failed" ||
        status === "expired"
      ) {
        return status;
      }

      if (status !== "pending" && status !== "creating") {
        throw new Error(`Status pembayaran tidak dikenali: ${status}`);
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      onRetry(
        "Status belum dapat diperbarui. Sistem akan mencoba lagi."
      );
    }
  }

  throw new DOMException("Aborted", "AbortError");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function paymentFromStatus(status: PaymentStatus): QrisPayment {
  return {
    id: status.id,
    transactionId: status.transactionId,
    providerPaymentRequestId: status.providerPaymentRequestId,
    providerReferenceId: status.providerReferenceId,
    amount: status.amount,
    currency: status.currency,
    status: status.status,
    qrString: status.qrString,
    expiresAt: status.expiresAt,
  };
}

function hostedPaymentFromStatus(status: PaymentStatus): HostedPayment {
  return {
    id: status.id,
    transactionId: status.transactionId,
    providerSessionId: status.providerSessionId ?? "",
    providerReferenceId: status.providerReferenceId,
    amount: status.amount,
    currency: status.currency,
    status: status.status,
    checkoutUrl: status.checkoutUrl ?? "",
    expiresAt: status.expiresAt,
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Transaksi gagal diproses.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.message ??
    "Transaksi gagal diproses."
  );
}

function normalizeTransactionItems(
  items: CartItem[]
) {
  return items.map((item) => {
    const quantity =
      item.quantity && item.quantity > 0
        ? item.quantity
        : item.qty;

    return {
      ...item,
      qty: quantity,
      quantity,
    };
  });
}

export default function TransactionPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");

  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("tunai");

  const [paymentCapabilities, setPaymentCapabilities] =
    useState<PaymentCapabilities>({
      qrisEnabled: false,
      hostedCheckoutEnabled: false,
      mode: "disabled",
      isSandbox: false,
    });

  const [paid, setPaid] = useState(0);

  const [settings, setSettings] = useState<Settings>({
    defaultTax: 0,
    headerStruk: "",
    footerStruk: "",
  });

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(null);

  const [receiptOpen, setReceiptOpen] =
    useState(false);
  const [cashSuccess, setCashSuccess] = useState<{
    transactionId: string;
    transactionNumber: string;
    amount: number;
    paid: number;
    change: number;
    method: string;
  } | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [restaurantCheckout, setRestaurantCheckout] =
    useState<RestaurantCheckoutContext | null>(
      () => getRestaurantCheckout()
    );
  const [restaurantLinkError, setRestaurantLinkError] =
    useState("");
  const [laundryCheckout, setLaundryCheckout] =
    useState<LaundryCheckoutContext | null>(
      () => getLaundryCheckout()
    );
  const [laundryLinkError, setLaundryLinkError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [qrisPayment, setQrisPayment] =
    useState<QrisPayment | null>(null);
  const [qrisStatus, setQrisStatus] =
    useState<string | null>(null);
  const [qrisStatusError, setQrisStatusError] =
    useState("");
  const [saleContextReady, setSaleContextReady] = useState(false);
  const [saleContextError, setSaleContextError] = useState("");
  const [qrisCancelling, setQrisCancelling] = useState(false);
  const [hostedPayment, setHostedPayment] =
    useState<HostedPayment | null>(null);
  const [hostedStatus, setHostedStatus] =
    useState<string | null>(null);
  const [hostedStatusError, setHostedStatusError] =
    useState("");
  const [hostedCancelling, setHostedCancelling] = useState(false);

  const submissionLock = useRef(false);
  const checkoutAbort = useRef<AbortController | null>(null);

  const categories = useMemo(
    () => [
      ...new Set(
        allProducts
          .map((product) => product.kategori)
          .filter(Boolean)
      ),
    ],
    [allProducts]
  );

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedCategory =
      kategori.trim().toLowerCase();

    return allProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.nama.toLowerCase().includes(query) ||
        product.kode.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query);

      const matchesCategory =
        !selectedCategory ||
        product.kategori.toLowerCase() ===
          selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allProducts, search, kategori]);

  useEffect(() => {
    void loadInitial();
    // Initial data and payment recovery are intentionally run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      checkoutAbort.current?.abort();
    },
    []
  );

  async function loadInitial() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        productResponse,
        customerResponse,
        settingsResponse,
        capabilitiesResponse,
      ] = await Promise.all([
        api.get<Product[]>("/api/products"),
        api.get<Customer[]>("/api/customers"),
        api.get<Settings>("/api/settings"),
        api.get<PaymentCapabilities>(
          "/api/payments/capabilities"
        ),
      ]);

      setAllProducts(productResponse.data);
      setCustomers(customerResponse.data);
      setSettings(settingsResponse.data);
      setPaymentCapabilities(capabilitiesResponse.data);
      setPaymentMethod((current) => {
        if (
          current === "qris" &&
          !capabilitiesResponse.data.qrisEnabled
        ) {
          return "tunai";
        }

        if (
          current === "xendit" &&
          !capabilitiesResponse.data.hostedCheckoutEnabled
        ) {
          return "tunai";
        }

        return current;
      });
      setTax(
        clampPercent(Number(
          settingsResponse.data.defaultTax ?? 0
        ))
      );

      await restoreRestaurantCheckout(productResponse.data);
      await restoreLaundryCheckout(productResponse.data);

      if (
        capabilitiesResponse.data.qrisEnabled ||
        capabilitiesResponse.data.hostedCheckoutEnabled
      ) {
        await restorePendingPayment();
      }
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function restoreRestaurantCheckout(
    currentProducts: RestaurantProduct[]
  ) {
    const context = getRestaurantCheckout();
    setRestaurantCheckout(context);
    setRestaurantLinkError("");

    if (!context) {
      return;
    }

    if (
      context.transactionId &&
      context.paymentMethod === "tunai"
    ) {
      await finalizeRestaurantOrder(
        context.transactionId,
        context
      );
      return;
    }

    if (
      context.transactionId &&
      (context.paymentMethod === "qris" ||
        context.paymentMethod === "xendit")
    ) {
      return;
    }

    try {
      const { data } = await api.get<RestaurantOrder>(
        `/api/restaurant/orders/${context.orderId}`
      );

      if (data.status !== "open") {
        clearRestaurantCheckout();
        setRestaurantCheckout(null);
        return;
      }

      const activeItems = data.items.filter(
        (item) => item.kitchenStatus !== "cancelled"
      );

      const nextCart: CartItem[] = activeItems.map((item) => {
        const product = currentProducts.find(
          (entry) => entry.id === item.productId
        );

        if (!product) {
          throw new Error(
            `${item.nama} sudah tidak tersedia di katalog POS.`
          );
        }

        return {
          id: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: item.qty,
          subtotal: product.hargaJual * item.qty,
        };
      });

      setCart(nextCart);
      setCustomerId("");
      setDiscount(0);
    } catch (error) {
      setRestaurantLinkError(
        `Pesanan meja belum dapat dimuat ke Kasir. ${getErrorMessage(error)}`
      );
    }
  }

  async function finalizeRestaurantOrder(
    transactionId: string,
    explicitContext?: RestaurantCheckoutContext | null
  ) {
    const context =
      explicitContext ??
      restaurantCheckout ??
      getRestaurantCheckout();

    if (!context) {
      return true;
    }

    try {
      await api.post(
        `/api/restaurant/orders/${context.orderId}/close`,
        { transactionId }
      );

      clearRestaurantCheckout();
      setRestaurantCheckout(null);
      setRestaurantLinkError("");
      return true;
    } catch (error) {
      setRestaurantLinkError(
        `Pembayaran sudah berhasil, tetapi ${context.tableName} belum berhasil ditutup. Jangan bayar ulang. ${getErrorMessage(error)}`
      );
      return false;
    }
  }

  function resetRestaurantPaymentLink() {
    const reset = resetRestaurantCheckoutTransaction();
    setRestaurantCheckout(reset);
    setRestaurantLinkError("");
  }

  async function restoreLaundryCheckout(
    currentProducts: Product[]
  ) {
    const context = getLaundryCheckout();
    setLaundryCheckout(context);
    setLaundryLinkError("");

    if (!context) {
      return;
    }

    if (
      context.transactionId &&
      context.paymentMethod === "tunai"
    ) {
      await finalizeLaundryOrder(
        context.transactionId,
        context
      );
      return;
    }

    if (
      context.transactionId &&
      (context.paymentMethod === "qris" ||
        context.paymentMethod === "xendit")
    ) {
      return;
    }

    try {
      const { data } = await api.get<LaundryWorkOrder>(
        "/api/laundry/work-orders/" + context.workOrderId
      );

      if (
        data.status === "cancelled" ||
        data.status === "completed" ||
        data.paymentStatus === "paid"
      ) {
        clearLaundryCheckout();
        setLaundryCheckout(null);
        return;
      }

      const nextCart: CartItem[] = data.items.map((item) => {
        const product = currentProducts.find(
          (entry) => entry.id === item.productId
        );

        if (!product) {
          throw new Error(
            item.nama + " sudah tidak tersedia di katalog POS."
          );
        }

        if (
          Math.round(product.hargaJual * 100) !==
          Math.round(item.unitPrice * 100)
        ) {
          throw new Error(
            "Harga " +
              item.nama +
              " berubah sejak work order dibuat. Batalkan dan buat ulang pesanan sebelum pembayaran."
          );
        }

        return {
          id: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: item.quantity,
          quantity: item.quantity,
          subtotal: product.hargaJual * item.quantity,
          productType: product.type,
          tracksStock: product.tracksStock,
          quantityPrecision: product.quantityPrecision,
          unit: product.satuan,
        };
      });

      setCart(nextCart);
      setCustomerId(data.customerId);
      setDiscount(0);
      setTax(0);
    } catch (error) {
      setLaundryLinkError(
        "Pesanan laundry belum dapat dimuat ke Kasir. " +
          getErrorMessage(error)
      );
    }
  }

  async function finalizeLaundryOrder(
    transactionId: string,
    explicitContext?: LaundryCheckoutContext | null
  ) {
    const context =
      explicitContext ??
      laundryCheckout ??
      getLaundryCheckout();

    if (!context) {
      return true;
    }

    try {
      await api.post(
        "/api/laundry/work-orders/" +
          context.workOrderId +
          "/complete-payment",
        { transactionId }
      );

      clearLaundryCheckout();
      setLaundryCheckout(null);
      setLaundryLinkError("");
      return true;
    } catch (error) {
      setLaundryLinkError(
        "Pembayaran sudah berhasil, tetapi pesanan " +
          context.orderNumber +
          " belum berhasil ditautkan. Jangan bayar ulang. " +
          getErrorMessage(error)
      );
      return false;
    }
  }

  function resetLaundryPaymentLink() {
    const reset = resetLaundryCheckoutTransaction();
    setLaundryCheckout(reset);
    setLaundryLinkError("");
  }

  async function reloadProducts() {
    const response =
      await api.get<Product[]>("/api/products");

    setAllProducts(response.data);
  }

  function persistPayment(payment: QrisPayment) {
    localStorage.setItem(ACTIVE_QRIS_KEY, JSON.stringify(payment));
    localStorage.removeItem(ACTIVE_HOSTED_KEY);
  }

  function removePersistedPayment() {
    localStorage.removeItem(ACTIVE_QRIS_KEY);
  }

  function persistHostedPayment(payment: HostedPayment) {
    localStorage.setItem(ACTIVE_HOSTED_KEY, JSON.stringify(payment));
    localStorage.removeItem(ACTIVE_QRIS_KEY);
  }

  function removePersistedHostedPayment() {
    localStorage.removeItem(ACTIVE_HOSTED_KEY);
  }

  async function restorePendingPayment() {
    try {
      const savedQris = localStorage.getItem(ACTIVE_QRIS_KEY);
      const savedHosted = localStorage.getItem(ACTIVE_HOSTED_KEY);
      let status: PaymentStatus | null = null;

      if (savedQris) {
        const parsed = JSON.parse(savedQris) as QrisPayment;
        const response = await api.get<PaymentStatus>(
          `/api/payments/${parsed.id}`
        );
        status = response.data;
      } else if (savedHosted) {
        const parsed = JSON.parse(savedHosted) as HostedPayment;
        const response = await api.get<PaymentStatus>(
          `/api/payments/${parsed.id}`
        );
        status = response.data;
      } else {
        const response = await api.get<PaymentStatus | "">(
          "/api/payments/current"
        );
        status = response.status === 204 || !response.data
          ? null
          : response.data as PaymentStatus;
      }

      if (!status) return;

      if (status.method === "xendit_hosted") {
        const payment = hostedPaymentFromStatus(status);
        persistHostedPayment(payment);
        setHostedPayment(payment);
        setHostedStatus(status.status);
        setHostedStatusError("");
        setQrisPayment(null);
        setQrisStatus(null);
        await restoreSaleContext(payment.transactionId, "xendit");

        if (status.status === "paid") {
          clearCart();
          await Promise.all([
            loadReceipt(payment.transactionId),
            reloadProducts(),
            finalizeRestaurantOrder(payment.transactionId),
            finalizeLaundryOrder(payment.transactionId),
          ]);
        } else if (
          status.status === "pending" ||
          status.status === "creating"
        ) {
          void monitorHostedPayment(payment);
        }
        return;
      }

      const payment = paymentFromStatus(status);
      persistPayment(payment);
      setQrisPayment(payment);
      setQrisStatus(status.status);
      setQrisStatusError("");
      setHostedPayment(null);
      setHostedStatus(null);
      await restoreSaleContext(payment.transactionId, "qris");

      if (status.status === "paid") {
        clearCart();
        await Promise.all([
          loadReceipt(payment.transactionId),
          reloadProducts(),
          finalizeRestaurantOrder(payment.transactionId),
          finalizeLaundryOrder(payment.transactionId),
        ]);
      } else if (
        status.status === "pending" ||
        status.status === "creating"
      ) {
        void monitorPayment(payment);
      }
    } catch (error) {
      const message =
        `Pembayaran sebelumnya belum dapat dipulihkan. ${getErrorMessage(error)}`;
      if (localStorage.getItem(ACTIVE_HOSTED_KEY)) {
        setHostedStatusError(message);
      } else {
        setQrisStatusError(message);
      }
    }
  }

  async function restoreSaleContext(
    transactionId: string,
    method: "qris" | "xendit" = "qris"
  ) {
    setSaleContextReady(false);
    setSaleContextError("");
    try {
      const { data } = await api.get<TransactionResponse & {
        customerId: string | null;
        disc: number;
        tax: number;
      }>(`/api/transactions/${transactionId}`);
      setCart(normalizeTransactionItems(data.items));
      setCustomerId(data.customerId ?? "");
      setDiscount(clampPercent(data.disc));
      setTax(clampPercent(data.tax));
      setPaymentMethod(method);
      setSaleContextReady(true);
      return true;
    } catch (error) {
      setSaleContextError(
        `Keranjang transaksi belum dapat dipulihkan. ${getErrorMessage(error)}`
      );
      return false;
    }
  }

  async function loadReceipt(transactionId: string) {
    setReceipt(null);
    setReceiptLoading(true);
    setReceiptError("");
    try {
      const { data } = await api.get<TransactionResponse>(
        `/api/transactions/${transactionId}`
      );
      setReceipt({
        transactionId: data.id,
        transactionDate: data.createdAt ?? new Date().toISOString(),
        noTrx: data.noTrx,
        subtotal: data.subtotal,
        discAmt: data.discAmt,
        taxAmt: data.taxAmt,
        total: data.total,
        dibayar: data.dibayar,
        kembalian: data.kembalian,
        metodePembayaran: data.metodePembayaran,
        items: normalizeTransactionItems(data.items),
      });
    } catch (error) {
      setReceiptError(
        `Pembayaran sudah berhasil, tetapi detail struk belum dapat dimuat. ${getErrorMessage(error)}`
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  async function applyFinalPaymentStatus(
    payment: QrisPayment,
    status: string
  ) {
    setQrisStatus((current) => current === "paid" ? current : status);
    persistPayment({ ...payment, status });

    if (status === "paid") {
      clearCart();
      await Promise.all([
        loadReceipt(payment.transactionId),
        reloadProducts(),
        finalizeRestaurantOrder(payment.transactionId),
        finalizeLaundryOrder(payment.transactionId),
      ]);
    } else if (
      status === "failed" ||
      status === "expired"
    ) {
      resetRestaurantPaymentLink();
      resetLaundryPaymentLink();
    }
  }

  async function applyFinalHostedStatus(
    payment: HostedPayment,
    status: string
  ) {
    setHostedStatus((current) => current === "paid" ? current : status);
    persistHostedPayment({ ...payment, status });

    if (status === "paid") {
      clearCart();
      await Promise.all([
        loadReceipt(payment.transactionId),
        reloadProducts(),
        finalizeRestaurantOrder(payment.transactionId),
        finalizeLaundryOrder(payment.transactionId),
      ]);
    } else if (
      status === "failed" ||
      status === "expired"
    ) {
      resetRestaurantPaymentLink();
      resetLaundryPaymentLink();
    }
  }

  async function cancelQrisPayment() {
    if (!qrisPayment || qrisCancelling) return;
    if (!window.confirm(
      `Batalkan QRIS ${qrisPayment.providerPaymentRequestId}? Kode ini tidak dapat dipakai lagi.`
    )) return;

    setQrisCancelling(true);
    setQrisStatusError("");
    try {
      checkoutAbort.current?.abort();
      const { data } = await api.post<PaymentStatus>(
        `/api/payments/${qrisPayment.id}/cancel`
      );
      const restored = paymentFromStatus(data);
      setQrisPayment(restored);
      setQrisStatus(data.status);
      persistPayment(restored);

      if (
        data.status !== "pending" &&
        data.status !== "creating"
      ) {
        resetRestaurantPaymentLink();
        resetLaundryPaymentLink();
      }

      await restoreSaleContext(restored.transactionId, "qris");
    } catch (error) {
      setQrisStatusError(
        `Pembatalan belum terkonfirmasi. Jangan buat pembayaran baru. ${getErrorMessage(error)}`
      );
      await refreshPaymentStatus();
    } finally {
      setQrisCancelling(false);
    }
  }

  async function cancelHostedPayment() {
    if (!hostedPayment || hostedCancelling) return;
    if (!window.confirm(
      `Batalkan Xendit Checkout ${hostedPayment.providerSessionId}? Link ini tidak dapat dipakai lagi.`
    )) return;

    setHostedCancelling(true);
    setHostedStatusError("");
    try {
      checkoutAbort.current?.abort();
      const { data } = await api.post<PaymentStatus>(
        `/api/payments/${hostedPayment.id}/cancel`
      );
      const restored = hostedPaymentFromStatus(data);
      setHostedPayment(restored);
      setHostedStatus(data.status);
      persistHostedPayment(restored);

      if (
        data.status !== "pending" &&
        data.status !== "creating"
      ) {
        resetRestaurantPaymentLink();
        resetLaundryPaymentLink();
      }

      await restoreSaleContext(restored.transactionId, "xendit");
    } catch (error) {
      setHostedStatusError(
        `Pembatalan belum terkonfirmasi. Jangan buat pembayaran baru. ${getErrorMessage(error)}`
      );
      await refreshHostedPaymentStatus();
    } finally {
      setHostedCancelling(false);
    }
  }

  async function monitorPayment(payment: QrisPayment) {
    checkoutAbort.current?.abort();
    const abortController = new AbortController();
    checkoutAbort.current = abortController;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const status = await waitForPaymentStatus(
        payment.id,
        abortController.signal,
        setQrisStatusError
      );
      await applyFinalPaymentStatus(payment, status);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setQrisStatusError(getErrorMessage(error));
      }
    } finally {
      if (checkoutAbort.current === abortController) {
        checkoutAbort.current = null;
        submissionLock.current = false;
        setSubmitting(false);
      }
    }
  }

  async function monitorHostedPayment(payment: HostedPayment) {
    checkoutAbort.current?.abort();
    const abortController = new AbortController();
    checkoutAbort.current = abortController;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const status = await waitForPaymentStatus(
        payment.id,
        abortController.signal,
        setHostedStatusError
      );
      await applyFinalHostedStatus(payment, status);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setHostedStatusError(getErrorMessage(error));
      }
    } finally {
      if (checkoutAbort.current === abortController) {
        checkoutAbort.current = null;
        submissionLock.current = false;
        setSubmitting(false);
      }
    }
  }

  async function refreshPaymentStatus() {
    if (!qrisPayment) return;
    setQrisStatusError("");
    try {
      const { data } = await api.get<PaymentStatus>(
        `/api/payments/${qrisPayment.id}`
      );
      const restored = paymentFromStatus(data);
      setQrisPayment(restored);
      if (data.status !== "paid") {
        await restoreSaleContext(restored.transactionId, "qris");
      }
      await applyFinalPaymentStatus(restored, data.status);
      if (data.status === "pending" || data.status === "creating") {
        void monitorPayment(restored);
      }
    } catch (error) {
      setQrisStatusError(getErrorMessage(error));
    }
  }

  async function refreshHostedPaymentStatus() {
    if (!hostedPayment) return;
    setHostedStatusError("");
    try {
      const { data } = await api.get<PaymentStatus>(
        `/api/payments/${hostedPayment.id}`
      );
      const restored = hostedPaymentFromStatus(data);
      setHostedPayment(restored);
      if (data.status !== "paid") {
        await restoreSaleContext(restored.transactionId, "xendit");
      }
      await applyFinalHostedStatus(restored, data.status);
      if (data.status === "pending" || data.status === "creating") {
        void monitorHostedPayment(restored);
      }
    } catch (error) {
      setHostedStatusError(getErrorMessage(error));
    }
  }

  function resumeHostedCheckout() {
    if (!hostedPayment?.checkoutUrl) {
      setHostedStatusError("Link Xendit Checkout belum tersedia.");
      return;
    }

    window.location.assign(hostedPayment.checkoutUrl);
  }

  function getProduct(productId: string) {
    return allProducts.find(
      (product) => product.id === productId
    );
  }

  function addToCart(product: Product) {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Item pesanan meja dikunci di Kasir. Ubah item dari halaman Meja."
          : "Item pesanan laundry dikunci di Kasir. Ubah dari halaman Laundry."
      );
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (
        existing &&
        product.tracksStock &&
        existing.qty >= product.stok
      ) {
        window.alert(
          `Stok ${product.nama} hanya ${product.stok}.`
        );

        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                quantity: item.qty + 1,
                subtotal:
                  (item.qty + 1) *
                  item.hargaJual,
              }
            : item
        );
      }

      if (
        product.tracksStock &&
        product.stok <= 0
      ) {
        window.alert(
          `Stok ${product.nama} habis.`
        );

        return current;
      }

      return [
        ...current,
        {
          id: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: 1,
          quantity: 1,
          subtotal: product.hargaJual,
          productType: product.type,
          tracksStock: product.tracksStock,
          quantityPrecision: product.quantityPrecision,
          unit: product.satuan,
        },
      ];
    });
  }

  function increase(productId: string) {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Qty pesanan meja dikunci di Kasir. Ubah dari halaman Meja."
          : "Jumlah pesanan laundry dikunci di Kasir. Ubah dari halaman Laundry."
      );
      return;
    }

    const product = getProduct(productId);

    setCart((current) =>
      current.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (!product) {
          return item;
        }

        if (
          product.tracksStock &&
          item.qty >= product.stok
        ) {
          window.alert(
            `Stok ${product.nama} hanya ${product.stok}.`
          );

          return item;
        }

        const qty = item.qty + 1;

        return {
          ...item,
          qty,
          quantity: qty,
          subtotal: qty * item.hargaJual,
        };
      })
    );
  }

  function setQuantity(productId: string, requested: number) {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Qty pesanan meja dikunci di Kasir. Ubah dari halaman Meja."
          : "Jumlah pesanan laundry dikunci di Kasir. Ubah dari halaman Laundry."
      );
      return;
    }

    const product = getProduct(productId);
    if (!product || !Number.isFinite(requested)) return;

    const precision = product.quantityPrecision ?? 0;
    const normalized = Number(
      requested.toFixed(precision)
    );

    if (normalized <= 0) {
      remove(productId);
      return;
    }

    if (
      product.type === "goods" &&
      !Number.isInteger(normalized)
    ) {
      window.alert(
        "Jumlah barang harus bilangan bulat."
      );
      return;
    }

    if (
      product.tracksStock &&
      normalized > product.stok
    ) {
      window.alert(
        `Stok ${product.nama} hanya ${product.stok}.`
      );
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.id === productId
          ? {
              ...item,
              qty: normalized,
              quantity: normalized,
              subtotal: normalized * item.hargaJual,
            }
          : item
      )
    );
  }

  function decrease(productId: string) {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Qty pesanan meja dikunci di Kasir. Ubah dari halaman Meja."
          : "Jumlah pesanan laundry dikunci di Kasir. Ubah dari halaman Laundry."
      );
      return;
    }

    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const qty = item.qty - 1;

          return {
            ...item,
            qty,
            quantity: qty,
            subtotal: qty * item.hargaJual,
          };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function remove(productId: string) {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Item pesanan meja dikunci di Kasir. Ubah dari halaman Meja."
          : "Item pesanan laundry dikunci di Kasir. Ubah dari halaman Laundry."
      );
      return;
    }

    setCart((current) =>
      current.filter(
        (item) => item.id !== productId
      )
    );
  }

  function clearCart() {
    setCart([]);
    setPaid(0);
    setCustomerId("");
    setDiscount(0);
    setTax(settings.defaultTax ?? 0);
    setPaymentMethod("tunai");
  }

  function requestClearCart() {
    if (restaurantCheckout || laundryCheckout) {
      window.alert(
        restaurantCheckout
          ? "Keranjang berasal dari pesanan meja dan tidak dapat dikosongkan dari Kasir."
          : "Keranjang berasal dari pesanan laundry dan tidak dapat dikosongkan dari Kasir."
      );
      return;
    }

    const unitCount = cart.reduce(
      (sum, item) => sum + item.qty,
      0
    );

    if (
      unitCount > 0 &&
      !window.confirm(
        `Kosongkan ${unitCount} item dari keranjang?`
      )
    ) {
      return;
    }

    clearCart();
  }

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
    [cart]
  );

  const cartQuantityById = useMemo(
    () =>
      new Map(
        cart.map((item) => [item.id, item.qty])
      ),
    [cart]
  );

  const discAmt = useMemo(
    () => subtotal * (discount / 100),
    [subtotal, discount]
  );

  const taxAmt = useMemo(
    () =>
      (subtotal - discAmt) * (tax / 100),
    [subtotal, discAmt, tax]
  );

  const total = useMemo(
    () => subtotal - discAmt + taxAmt,
    [subtotal, discAmt, taxAmt]
  );
  const totalsValid =
    Number.isFinite(discount) &&
    Number.isFinite(tax) &&
    discount >= 0 && discount <= 100 &&
    tax >= 0 && tax <= 100 &&
    Number.isFinite(total) && total >= 0;

  const change = useMemo(() => {
    if (paymentMethod !== "tunai") {
      return 0;
    }

    return Math.max(0, paid - total);
  }, [paymentMethod, paid, total]);

  function validateStock() {
    for (const item of cart) {
      const product = getProduct(item.id);

      if (!product) {
        return `${item.nama} tidak ditemukan. Muat ulang halaman.`;
      }

      if (
        product.tracksStock &&
        item.qty > product.stok
      ) {
        return `Stok ${item.nama} hanya ${product.stok}.`;
      }
    }

    return "";
  }

  async function checkout() {
    if (
      restaurantCheckout?.transactionId ||
      laundryCheckout?.transactionId
    ) {
      window.alert(
        restaurantCheckout?.transactionId
          ? "Pembayaran pesanan meja sebelumnya sudah dibuat. Sinkronkan penutupan meja sebelum membuat pembayaran baru."
          : "Pembayaran pesanan laundry sebelumnya sudah dibuat. Sinkronkan pesanan sebelum membuat pembayaran baru."
      );
      return;
    }

    if (
      submissionLock.current ||
      submitting ||
      cart.length === 0
    ) {
      return;
    }

    const stockError = validateStock();

    if (stockError) {
      window.alert(stockError);
      return;
    }

    if (!totalsValid) {
      window.alert("Diskon, pajak, atau total transaksi tidak valid.");
      return;
    }

    if (
      paymentMethod === "tunai" &&
      paid < total
    ) {
      window.alert("Uang diterima kurang.");
      return;
    }

    const paidAmount =
      paymentMethod === "tunai"
        ? paid
        : total;

    const changeAmount =
      paymentMethod === "tunai"
        ? change
        : 0;

    const receiptItems = cart.map(
      (item) => ({ ...item })
    );

    submissionLock.current = true;
    setSubmitting(true);
    setReceipt(null);
    setReceiptError("");

    try {
      const payload = {
        customerId: customerId || null,
        items: cart.map((item) => ({
          id: item.id,
          nama: item.nama,
          hargaJual: item.hargaJual,
          qty:
            item.productType === "service"
              ? 1
              : Math.trunc(item.qty),
          quantity: item.qty,
          subtotal: item.subtotal,
        })),
        subtotal,
        disc: discount,
        tax,
        discAmt,
        taxAmt,
        total,
        metodePembayaran: paymentMethod,
        dibayar: paidAmount,
        kembalian: changeAmount,
      };

      if (paymentMethod === "qris") {
        if (!paymentCapabilities.qrisEnabled) {
          throw new Error("Pembayaran QRIS sedang tidak tersedia.");
        }

        const paymentResponse = await api.post<QrisPayment>(
          "/api/payments/qris",
          {
            ...payload,
            metodePembayaran: "QRIS",
            dibayar: 0,
            kembalian: 0,
          }
        );
        const payment = paymentResponse.data;

        if (restaurantCheckout) {
          const linked = markRestaurantCheckoutTransaction(
            payment.transactionId,
            "qris"
          );
          setRestaurantCheckout(linked);
        }

        if (laundryCheckout) {
          const linked = markLaundryCheckoutTransaction(
            payment.transactionId,
            "qris"
          );
          setLaundryCheckout(linked);
        }

        persistPayment(payment);
        setQrisPayment(payment);
        setQrisStatus(payment.status);
        setQrisStatusError("");
        setSaleContextReady(true);
        setSaleContextError("");
        await monitorPayment(payment);
        return;
      }

      if (paymentMethod === "xendit") {
        if (!paymentCapabilities.hostedCheckoutEnabled) {
          throw new Error("Xendit Checkout sedang tidak tersedia.");
        }

        const paymentResponse = await api.post<HostedPayment>(
          "/api/payments/hosted",
          {
            ...payload,
            metodePembayaran: "XENDIT",
            dibayar: 0,
            kembalian: 0,
          }
        );
        const payment = paymentResponse.data;

        if (restaurantCheckout) {
          const linked = markRestaurantCheckoutTransaction(
            payment.transactionId,
            "xendit"
          );
          setRestaurantCheckout(linked);
        }

        if (laundryCheckout) {
          const linked = markLaundryCheckoutTransaction(
            payment.transactionId,
            "xendit"
          );
          setLaundryCheckout(linked);
        }

        persistHostedPayment(payment);
        setHostedPayment(payment);
        setHostedStatus(payment.status);
        setHostedStatusError("");
        setSaleContextReady(true);
        setSaleContextError("");

        if (!payment.checkoutUrl) {
          throw new Error("Link Xendit Checkout belum tersedia.");
        }

        window.location.assign(payment.checkoutUrl);
        return;
      }

      const response = await api.post<TransactionResponse>(
        "/api/transactions",
        payload
      );

      if (restaurantCheckout) {
        const linked = markRestaurantCheckoutTransaction(
          response.data.id,
          "tunai"
        );

        setRestaurantCheckout(linked);
        await finalizeRestaurantOrder(
          response.data.id,
          linked
        );
      }

      if (laundryCheckout) {
        const linked = markLaundryCheckoutTransaction(
          response.data.id,
          "tunai"
        );

        setLaundryCheckout(linked);
        await finalizeLaundryOrder(
          response.data.id,
          linked
        );
      }

      setReceipt({
        transactionId: response.data.id,
        transactionDate: response.data.createdAt ?? new Date().toISOString(),
        noTrx: response.data.noTrx,
        subtotal: response.data.subtotal,
        discAmt: response.data.discAmt,
        taxAmt: response.data.taxAmt,
        total: response.data.total,
        dibayar: response.data.dibayar,
        kembalian: response.data.kembalian,
        metodePembayaran: response.data.metodePembayaran,
        items: response.data.items
          ? normalizeTransactionItems(response.data.items)
          : receiptItems,
      });

      setCashSuccess({
        transactionId: response.data.id,
        transactionNumber: response.data.noTrx,
        amount: response.data.total,
        paid: response.data.dibayar,
        change: response.data.kembalian,
        method: response.data.metodePembayaran,
      });
      clearCart();

      await reloadProducts();
    } catch (error) {
      if (checkoutAbort.current?.signal.aborted) {
        return;
      }

      window.alert(getErrorMessage(error));

      try {
        await reloadProducts();
      } catch {
        // Error checkout utama sudah ditampilkan.
      }
    } finally {
      checkoutAbort.current = null;
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  function closeFailedQris() {
    removePersistedPayment();
    resetRestaurantPaymentLink();
    resetLaundryPaymentLink();
    setQrisPayment(null);
    setQrisStatus(null);
    setQrisStatusError("");
    setSaleContextReady(false);
    setSaleContextError("");
  }

  function closeFailedHosted() {
    removePersistedHostedPayment();
    resetRestaurantPaymentLink();
    resetLaundryPaymentLink();
    setHostedPayment(null);
    setHostedStatus(null);
    setHostedStatusError("");
    setSaleContextReady(false);
    setSaleContextError("");
  }

  function startNewTransaction() {
    removePersistedPayment();
    removePersistedHostedPayment();
    setQrisPayment(null);
    setQrisStatus(null);
    setQrisStatusError("");
    setHostedPayment(null);
    setHostedStatus(null);
    setHostedStatusError("");
    setSaleContextReady(false);
    setSaleContextError("");
    setReceipt(null);
    setReceiptError("");
    setCashSuccess(null);
    setReceiptOpen(false);
  }

  return (
    <AppShell>
      <section className="content-section active transaction-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Kasir
            </h2>

            <p className="section-sub">
              Point of Sale
            </p>
          </div>

        </div>


        {restaurantCheckout ? (
          <div className="restaurant-checkout-banner" role="status">
            <div>
              <strong>
                Pesanan meja · {restaurantCheckout.tableName}
              </strong>
              <span>
                {restaurantCheckout.orderNumber} · Item dan qty dikunci dari halaman Meja.
              </span>
            </div>
            {restaurantCheckout.transactionId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  void finalizeRestaurantOrder(
                    restaurantCheckout.transactionId!
                  )
                }
              >
                Sinkronkan Meja
              </button>
            ) : null}
          </div>
        ) : null}

        {restaurantLinkError ? (
          <div className="payment-recovery-banner" role="alert">
            <strong>Sinkronisasi pesanan meja perlu perhatian.</strong>
            <span>{restaurantLinkError}</span>
          </div>
        ) : null}

        {laundryCheckout ? (
          <div className="restaurant-checkout-banner" role="status">
            <div>
              <strong>
                Pesanan laundry · {laundryCheckout.orderNumber}
              </strong>
              <span>
                {laundryCheckout.customerName} · Item, jumlah, pelanggan, diskon, dan pajak dikunci dari halaman Laundry.
              </span>
            </div>
            {laundryCheckout.transactionId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  void finalizeLaundryOrder(
                    laundryCheckout.transactionId!
                  )
                }
              >
                Sinkronkan Laundry
              </button>
            ) : null}
          </div>
        ) : null}

        {laundryLinkError ? (
          <div className="payment-recovery-banner" role="alert">
            <strong>Sinkronisasi pesanan laundry perlu perhatian.</strong>
            <span>{laundryLinkError}</span>
          </div>
        ) : null}

        {(qrisStatusError && !qrisPayment) ||
        (hostedStatusError && !hostedPayment) ? (
          <div className="payment-recovery-banner" role="alert">
            <strong>Pembayaran sebelumnya belum dapat diperiksa.</strong>
            <span>{hostedStatusError || qrisStatusError}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void restorePendingPayment()}
            >
              Coba Lagi
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="table-card">
            <p>Memuat kasir...</p>
          </div>
        ) : loadError ? (
          <div className="table-card">
            <p>{loadError}</p>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadInitial()}
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="pos-layout">
            <ProductGrid
              products={products}
              categories={categories}
              search={search}
              selectedCategory={kategori}
              onSearchChange={setSearch}
              onCategoryChange={setKategori}
              onAdd={addToCart}
              onIncrease={increase}
              onDecrease={decrease}
              onQuantityChange={setQuantity}
              quantityById={cartQuantityById}
            />

            <CartPanel
              submitting={
                submitting ||
                qrisStatus === "pending" ||
                hostedStatus === "pending"
              }
              locked={Boolean(laundryCheckout)}
              items={cart}
              customers={customers}
              customerId={customerId}
              discount={discount}
              tax={tax}
              subtotal={subtotal}
              total={total}
              paymentMethod={paymentMethod}
              qrisEnabled={paymentCapabilities.qrisEnabled}
              hostedCheckoutEnabled={
                paymentCapabilities.hostedCheckoutEnabled
              }
              qrisSandbox={paymentCapabilities.isSandbox}
              paid={paid}
              change={change}
              totalsValid={totalsValid}
              onCustomerChange={setCustomerId}
              onDiscountChange={(value) => setDiscount(clampPercent(value))}
              onTaxChange={(value) => setTax(clampPercent(value))}
              onPaymentMethodChange={
                setPaymentMethod
              }
              onPaidChange={setPaid}
              onIncrease={increase}
              onDecrease={decrease}
              onRemove={remove}
              onClear={requestClearCart}
              onCheckout={() => void checkout()}
            />
          </div>
        )}

        <ReceiptModal
          open={receiptOpen}
          receipt={receipt}
          header={settings.headerStruk}
          footer={settings.footerStruk}
          onClose={() =>
            setReceiptOpen(false)
          }
        />

        <PaymentSuccessModal
          open={cashSuccess !== null}
          method={cashSuccess?.method ?? "tunai"}
          amount={cashSuccess?.amount ?? 0}
          paid={cashSuccess?.paid ?? 0}
          change={cashSuccess?.change ?? 0}
          transactionNumber={cashSuccess?.transactionNumber ?? ""}
          transactionId={cashSuccess?.transactionId ?? ""}
          onViewReceipt={() => {
            setCashSuccess(null);
            setReceiptOpen(true);
          }}
          onNewTransaction={startNewTransaction}
        />

        <QrisPaymentModal
          payment={qrisPayment}
          status={qrisStatus}
          statusError={qrisStatusError}
          saleContextReady={saleContextReady}
          saleContextError={saleContextError}
          sandbox={paymentCapabilities.isSandbox}
          onCloseFailed={closeFailedQris}
          onRetryStatus={() => void refreshPaymentStatus()}
          onRetrySaleContext={() => {
            if (qrisPayment) {
              void restoreSaleContext(qrisPayment.transactionId);
            }
          }}
          receiptLoading={receiptLoading}
          receiptError={receiptError}
          receiptReady={
            receipt?.transactionId === qrisPayment?.transactionId &&
            !receiptLoading && !receiptError
          }
          cancelling={qrisCancelling}
          onCancel={() => void cancelQrisPayment()}
          onRetryReceipt={() => {
            if (qrisPayment) {
              void loadReceipt(qrisPayment.transactionId);
            }
          }}
          onViewReceipt={() => {
            removePersistedPayment();
            setQrisPayment(null);
            setQrisStatus(null);
            setReceiptOpen(true);
          }}
          onNewTransaction={startNewTransaction}
        />

        <HostedPaymentModal
          payment={hostedPayment}
          status={hostedStatus}
          statusError={hostedStatusError}
          saleContextReady={saleContextReady}
          saleContextError={saleContextError}
          sandbox={paymentCapabilities.isSandbox}
          onResumeCheckout={resumeHostedCheckout}
          onRetryStatus={() => void refreshHostedPaymentStatus()}
          onCancel={() => void cancelHostedPayment()}
          onCloseFailed={closeFailedHosted}
          onRetrySaleContext={() => {
            if (hostedPayment) {
              void restoreSaleContext(
                hostedPayment.transactionId,
                "xendit"
              );
            }
          }}
          receiptLoading={receiptLoading}
          receiptError={receiptError}
          receiptReady={
            receipt?.transactionId === hostedPayment?.transactionId &&
            !receiptLoading && !receiptError
          }
          cancelling={hostedCancelling}
          onRetryReceipt={() => {
            if (hostedPayment) {
              void loadReceipt(hostedPayment.transactionId);
            }
          }}
          onViewReceipt={() => {
            removePersistedHostedPayment();
            setHostedPayment(null);
            setHostedStatus(null);
            setReceiptOpen(true);
          }}
          onNewTransaction={startNewTransaction}
        />
      </section>
    </AppShell>
  );
}
