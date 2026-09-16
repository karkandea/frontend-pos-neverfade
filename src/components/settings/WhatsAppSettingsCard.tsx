import {
  useCallback,
  useEffect,
  useState,
} from "react";
import api from "../../lib/api";
import {
  resolveActiveOutlet,
  type Outlet,
} from "../../lib/outlet";

type WhatsAppStatus = {
  configured: boolean;
  status: string;
  phoneNumber?: string | null;
  pushName?: string | null;
  outletId?: string | null;
  senderId?: string | null;
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
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.get<Outlet[]>("/api/outlets");
        const active = response.data.filter((outlet) => outlet.active);
        setOutlets(active);
        const selected = resolveActiveOutlet(active);
        setSelectedOutletId(selected?.id ?? "");
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        setLoading(false);
      }
    })();
  }, []);

  const loadStatus = useCallback(async () => {
    if (!selectedOutletId) return;

    try {
      const response = await api.get<WhatsAppStatus>(
        "/api/whatsapp/status",
        { params: { outletId: selectedOutletId } }
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
  }, [selectedOutletId]);

  const loadQr = useCallback(async () => {
    if (!selectedOutletId) return;

    try {
      const response = await api.get<QrPayload>(
        "/api/whatsapp/qr",
        { params: { outletId: selectedOutletId } }
      );
      setQr(response.data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [selectedOutletId]);

  useEffect(() => {
    if (!selectedOutletId) return;
    setLoading(true);
    setStatus(null);
    setQr(null);
    void loadStatus();
  }, [loadStatus, selectedOutletId]);

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
    if (!selectedOutletId) return;

    setBusy(true);
    setError("");

    try {
      const response = await api.post<WhatsAppStatus>(
        "/api/whatsapp/connect",
        null,
        { params: { outletId: selectedOutletId } }
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
    if (!selectedOutletId) return;

    const outlet = outlets.find((item) => item.id === selectedOutletId);
    const confirmed = window.confirm(
      `Putuskan WhatsApp ${outlet?.name ?? "outlet ini"} dari NeverFade? Struk WhatsApp outlet ini tidak bisa dikirim sampai nomor dihubungkan lagi.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      await api.post(
        "/api/whatsapp/logout",
        null,
        { params: { outletId: selectedOutletId } }
      );
      setQr(null);
      await loadStatus();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.status === "WORKING";
  const selectedOutlet = outlets.find(
    (outlet) => outlet.id === selectedOutletId
  );

  return (
    <div className="card-panel">
      <div className="card-header">
        <h3>WhatsApp Struk per Outlet</h3>
      </div>

      <div className="settings-form">
        <p style={{ marginTop: 0 }}>
          Setiap outlet dapat memakai nomor WhatsApp pengirim struk yang berbeda.
        </p>

        <div className="form-group">
          <label>Outlet</label>
          <select
            value={selectedOutletId}
            onChange={(event) => setSelectedOutletId(event.target.value)}
            disabled={busy || outlets.length === 0}
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}{outlet.isDefault ? " · Default" : ""}
              </option>
            ))}
          </select>
        </div>

        {outlets.length === 0 ? (
          <p>Buat outlet terlebih dahulu sebelum menghubungkan WhatsApp.</p>
        ) : loading ? (
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
                <strong>WhatsApp {selectedOutlet?.name} Terhubung</strong>
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
              <strong>{selectedOutlet?.name}: belum terhubung</strong>
              <div>
                QR hanya perlu dipindai saat setup nomor outlet, bukan setiap transaksi.
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
                  alt={`QR WhatsApp ${selectedOutlet?.name ?? "outlet"}`}
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
