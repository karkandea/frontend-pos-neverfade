import {
  useCallback,
  useEffect,
  useState,
} from "react";
import api from "../../lib/api";

type WhatsAppStatus = {
  configured: boolean;
  status: string;
  phoneNumber?: string | null;
  pushName?: string | null;
};

type QrPayload = {
  mimeType: string;
  data: string;
};

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Terjadi kesalahan pada WhatsApp.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        title?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Terjadi kesalahan pada WhatsApp."
  );
}

function maskPhone(phone?: string | null) {
  if (!phone) return "Nomor terhubung";
  if (phone.length <= 8) return `+${phone}`;
  return `+${phone.slice(0, 4)}••••${phone.slice(-4)}`;
}

export default function WhatsAppSettingsCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get<WhatsAppStatus>(
        "/api/whatsapp/status"
      );
      setStatus(response.data);
      setError("");

      if (response.data.status === "WORKING") {
        setQr(null);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQr = useCallback(async () => {
    try {
      const response = await api.get<QrPayload>(
        "/api/whatsapp/qr"
      );
      setQr(response.data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!qr || status?.status === "WORKING") return;

    const statusTimer = window.setInterval(() => {
      void loadStatus();
    }, 3000);

    const qrTimer = window.setInterval(() => {
      void loadQr();
    }, 15000);

    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(qrTimer);
    };
  }, [loadQr, loadStatus, qr, status?.status]);

  async function connect() {
    setBusy(true);
    setError("");

    try {
      const response = await api.post<WhatsAppStatus>(
        "/api/whatsapp/connect"
      );
      setStatus(response.data);

      if (response.data.status !== "WORKING") {
        await loadQr();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    const confirmed = window.confirm(
      "Putuskan nomor WhatsApp dari NeverFade? Struk WhatsApp tidak bisa dikirim sampai nomor dihubungkan lagi."
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      await api.post("/api/whatsapp/logout");
      setQr(null);
      await loadStatus();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.status === "WORKING";

  return (
    <div className="card-panel">
      <div className="card-header">
        <h3>WhatsApp Struk</h3>
      </div>

      <div className="settings-form">
        <p style={{ marginTop: 0 }}>
          Hubungkan satu nomor WhatsApp toko untuk mengirim struk digital langsung dari kasir.
        </p>

        {loading ? (
          <p>Memeriksa koneksi WhatsApp...</p>
        ) : connected ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(22, 163, 74, 0.08)",
              }}
            >
              <span aria-hidden="true">🟢</span>
              <div>
                <strong>WhatsApp Terhubung</strong>
                <div>
                  {maskPhone(status?.phoneNumber)}
                  {status?.pushName ? ` · ${status.pushName}` : ""}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void disconnect()}
            >
              {busy ? "Memproses..." : "Ganti / Putuskan Nomor"}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(148, 163, 184, 0.12)",
              }}
            >
              <strong>Belum terhubung</strong>
              <div>
                QR hanya perlu dipindai saat setup nomor, bukan setiap transaksi.
              </div>
            </div>

            {!qr ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void connect()}
              >
                {busy ? "Menyiapkan..." : "Hubungkan WhatsApp"}
              </button>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p>
                  Buka WhatsApp di HP → Perangkat tertaut → Tautkan perangkat, lalu scan QR ini.
                </p>

                <img
                  src={`data:${qr.mimeType};base64,${qr.data}`}
                  alt="QR untuk menghubungkan WhatsApp"
                  width={240}
                  height={240}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    background: "white",
                    padding: 8,
                    borderRadius: 8,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => void loadQr()}
                  >
                    Refresh QR
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => void loadStatus()}
                  >
                    Cek Koneksi
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
