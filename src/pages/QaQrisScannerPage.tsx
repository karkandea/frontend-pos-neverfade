import { useCallback, useEffect, useRef, useState } from "react";

import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import type {
  PaymentCapabilities,
  PaymentStatus,
} from "../types/payment";
import "./QaQrisScannerPage.css";

const SCANNER_SCRIPT_ID = "neverfade-html5-qrcode";
const SCANNER_SCRIPT_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
const SCANNER_SCRIPT_INTEGRITY =
  "sha512-r6rDA7W6ZeQhvl8S7yRVQUKVHdexq+GAlNkNNqVC7YyIV+NwqCTJe2hDWCiffTyRNOeGEzRRJ9ifvRm/HCzGYg==";
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 45000;

type Html5QrcodeScannerInstance = {
  render: (
    onSuccess: (decodedText: string) => void,
    onError: (errorMessage: string) => void
  ) => void;
  clear: () => Promise<void>;
};

type Html5QrcodeScannerConstructor = new (
  elementId: string,
  config: {
    fps?: number;
    qrbox?: { width: number; height: number };
    rememberLastUsedCamera?: boolean;
  },
  verbose?: boolean
) => Html5QrcodeScannerInstance;

declare global {
  interface Window {
    Html5QrcodeScanner?: Html5QrcodeScannerConstructor;
  }
}

type ScannerState =
  | "checking"
  | "ready"
  | "scanning"
  | "processing"
  | "paid"
  | "failed"
  | "unavailable";

function loadScannerScript() {
  if (window.Html5QrcodeScanner) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      SCANNER_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Scanner QR tidak dapat dimuat.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCANNER_SCRIPT_ID;
    script.src = SCANNER_SCRIPT_URL;
    script.integrity = SCANNER_SCRIPT_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Scanner QR tidak dapat dimuat.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function pollUntilFinal(paymentId: string, signal: AbortSignal) {
  const startedAt = Date.now();

  while (!signal.aborted && Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, POLL_INTERVAL_MS);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });

    const response = await api.get<PaymentStatus>(
      `/api/payments/${paymentId}`,
      { signal }
    );

    if (
      response.data.status === "paid" ||
      response.data.status === "failed" ||
      response.data.status === "expired"
    ) {
      return response.data;
    }
  }

  return null;
}

export default function QaQrisScannerPage() {
  const [state, setState] = useState<ScannerState>("checking");
  const [message, setMessage] = useState("Memeriksa mode pembayaran…");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const scannerRef = useRef<Html5QrcodeScannerInstance | null>(null);
  const scanLockedRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);

  const clearScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.clear();
      } catch {
        // The scanner may already be stopped by the browser or navigation.
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setPayment(null);
    setMessage("Arahkan kamera ke QRIS Sandbox di layar kasir.");
    setState("ready");
    scanLockedRef.current = false;

    try {
      await loadScannerScript();
      if (!window.Html5QrcodeScanner) {
        throw new Error("Scanner QR tidak tersedia di browser ini.");
      }

      await clearScanner();

      const scanner = new window.Html5QrcodeScanner(
        "qa-qris-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scannerRef.current = scanner;
      setState("scanning");

      scanner.render(
        (decodedText) => {
          if (scanLockedRef.current) {
            return;
          }

          scanLockedRef.current = true;
          void (async () => {
            await clearScanner();
            setState("processing");
            setMessage("QRIS terbaca. Menunggu simulasi dan webhook Xendit…");

            try {
              const simulateResponse = await api.post<PaymentStatus>(
                "/api/payments/qa/simulate-scan",
                { qrString: decodedText }
              );

              setPayment(simulateResponse.data);

              if (simulateResponse.data.status === "paid") {
                setState("paid");
                setMessage("Pembayaran Sandbox sudah berhasil.");
                return;
              }

              const controller = new AbortController();
              pollAbortRef.current = controller;
              const finalStatus = await pollUntilFinal(
                simulateResponse.data.id,
                controller.signal
              );
              pollAbortRef.current = null;

              if (!finalStatus) {
                setState("failed");
                setMessage(
                  "Simulasi diterima, tetapi webhook belum final. Periksa kembali status pembayaran di POS sebelum mengulang scan."
                );
                return;
              }

              setPayment(finalStatus);
              if (finalStatus.status === "paid") {
                setState("paid");
                setMessage("Pembayaran Sandbox berhasil dikonfirmasi.");
              } else {
                setState("failed");
                setMessage(
                  finalStatus.status === "expired"
                    ? "QRIS sudah kedaluwarsa. Buat QRIS baru dari POS."
                    : "Pembayaran Sandbox berakhir gagal. Buat QRIS baru dari POS."
                );
              }
            } catch (error) {
              const apiError = getApiError(error);
              setState("failed");
              setMessage(apiError.message || "QRIS tidak dapat diproses.");
            }
          })();
        },
        () => {
          // Decode misses are normal while the camera is searching for a QR.
        }
      );
    } catch (error) {
      setState("failed");
      setMessage(getApiError(error).message);
    }
  }, [clearScanner]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await api.get<PaymentCapabilities>(
          "/api/payments/capabilities"
        );

        if (!active) return;

        if (!response.data.qrisEnabled || !response.data.isSandbox) {
          setState("unavailable");
          setMessage(
            "QA Scanner hanya tersedia saat tenant QRIS Sandbox aktif."
          );
          return;
        }

        await startScanner();
      } catch (error) {
        if (!active) return;
        setState("failed");
        setMessage(getApiError(error).message);
      }
    })();

    return () => {
      active = false;
      pollAbortRef.current?.abort();
      void clearScanner();
    };
  }, [clearScanner, startScanner]);

  const retry = () => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    void startScanner();
  };

  return (
    <main className="qa-qris-page">
      <section className="qa-qris-card" aria-labelledby="qa-qris-title">
        <header className="qa-qris-header">
          <span className="qa-qris-badge">QA SANDBOX</span>
          <h1 id="qa-qris-title">Scanner QRIS NeverFade</h1>
          <p>
            Scan QRIS yang tampil di POS. Xendit akan mensimulasikan pembayaran
            dan transaksi tetap diselesaikan melalui webhook normal.
          </p>
        </header>

        <div className="qa-qris-no-money" role="note">
          Tidak ada dana nyata yang dipindahkan.
        </div>

        {state !== "unavailable" && state !== "paid" ? (
          <div id="qa-qris-reader" className="qa-qris-reader" />
        ) : null}

        <div
          className={`qa-qris-status qa-qris-status--${state}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {state === "paid"
              ? "Pembayaran berhasil"
              : state === "processing"
                ? "Memproses pembayaran"
                : state === "scanning" || state === "ready"
                  ? "Siap scan"
                  : state === "unavailable"
                    ? "Scanner tidak tersedia"
                    : state === "failed"
                      ? "Perlu tindakan"
                      : "Menyiapkan scanner"}
          </strong>
          <span>{message}</span>
        </div>

        {payment ? (
          <dl className="qa-qris-payment-summary">
            <div>
              <dt>Nominal</dt>
              <dd>{formatRupiah(payment.amount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{payment.status.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Payment request</dt>
              <dd>{payment.providerPaymentRequestId}</dd>
            </div>
          </dl>
        ) : null}

        {state === "paid" || state === "failed" ? (
          <button
            type="button"
            className="qa-qris-action"
            onClick={retry}
          >
            Scan QR berikutnya
          </button>
        ) : null}

        <p className="qa-qris-footnote">
          Gunakan halaman ini hanya untuk QRIS Sandbox NeverFade. QRIS Live tidak
          dapat disimulasikan dari scanner QA.
        </p>
      </section>
    </main>
  );
}
