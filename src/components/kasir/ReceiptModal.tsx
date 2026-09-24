import {
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../../lib/api";
import { useDialogFocus } from "./useDialogFocus";

type ReceiptItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
};

type ReceiptData = {
  transactionId: string;
  customerId?: string | null;
  transactionDate: string;
  noTrx: string;
  kasir?: string;
  total: number;
  subtotal: number;
  discAmt: number;
  taxAmt: number;
  dibayar: number;
  kembalian: number;
  metodePembayaran: string;
  items: ReceiptItem[];
};

type Props = {
  open: boolean;
  receipt: ReceiptData | null;
  header: string;
  footer: string;
  onClose: () => void;
};

type Customer = {
  hp?: string;
};

type SendReceiptResponse = {
  phoneMasked: string;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Gagal mengirim struk. Coba lagi.";
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

  const message =
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Gagal mengirim struk. Coba lagi.";

  if (message === "WhatsApp outlet belum dikonfigurasi.") {
    return "Nomor WhatsApp outlet belum dikonfigurasi. Minta owner/admin menghubungkan nomor toko di Pengaturan → WhatsApp pada outlet yang sama.";
  }
  if (message === "WhatsApp outlet belum terhubung.") {
    return "Nomor WhatsApp outlet terputus. Minta owner/admin menghubungkannya kembali di Pengaturan → WhatsApp.";
  }
  return message;
}

export default function ReceiptModal({
  open,
  receipt,
  header,
  footer,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);

  useDialogFocus(open, dialogRef, onClose);

  useEffect(() => {
    if (!open || !receipt) {
      const timer = window.setTimeout(() => {
        setWhatsAppOpen(false);
        setPhone("");
        setSendMessage("");
        setSendError("");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const customerId = receipt.customerId;
    let cancelled = false;

    async function loadSuggestedPhone() {
      try {
        if (!customerId) return;

        const customer = await api.get<Customer>(
          `/api/customers/${customerId}`
        );

        if (!cancelled && customer.data.hp) {
          setPhone(customer.data.hp);
        }
      } catch {
        // Phone suggestion is optional. Manual entry remains available.
      }
    }

    void loadSuggestedPhone();

    return () => {
      cancelled = true;
    };
  }, [open, receipt]);

  if (!open || !receipt) return null;

  const transactionId = receipt.transactionId;

  async function sendWhatsAppReceipt() {
    if (!phone.trim()) {
      setSendError("Nomor WhatsApp wajib diisi.");
      return;
    }

    setSending(true);
    setSendError("");
    setSendMessage("");

    try {
      const response = await api.post<SendReceiptResponse>(
        `/api/transactions/${transactionId}/receipt/whatsapp`,
        { phone: phone.trim() }
      );

      setSendMessage(
        `Struk berhasil dikirim ke ${response.data.phoneMasked}.`
      );
    } catch (error) {
      setSendError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay open">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal modal-struk"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
      >
        <div className="modal-header">
          <h3 id="receipt-title">Preview Struk</h3>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup struk"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="struk-container" data-paper-width={paperWidth} style={{ maxWidth: paperWidth === 58 ? 219 : 302 }}>
            <div style={{ textAlign: "center" }}>
              <strong>{header}</strong>

              <div style={{ marginTop: 6 }}>
                {receipt.noTrx}
              </div>

              <div>
                {new Date(receipt.transactionDate).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}
              </div>
              {receipt.kasir ? <div>Kasir: {receipt.kasir}</div> : null}
            </div>

            <hr />

            {receipt.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div>{item.nama}</div>

                  <small>
                    {item.qty} × {rupiah(item.hargaJual)}
                  </small>
                </div>

                <div>{rupiah(item.subtotal)}</div>
              </div>
            ))}

            <hr />

            <div className="summary-row">
              <span>Subtotal</span>
              <span>{rupiah(receipt.subtotal)}</span>
            </div>

            <div className="summary-row">
              <span>Diskon</span>
              <span>- {rupiah(receipt.discAmt)}</span>
            </div>

            <div className="summary-row">
              <span>Pajak</span>
              <span>{rupiah(receipt.taxAmt)}</span>
            </div>

            <div className="summary-row total-row">
              <strong>Total</strong>
              <strong>{rupiah(receipt.total)}</strong>
            </div>

            <div className="summary-row">
              <span>Pembayaran</span>
              <span>{receipt.metodePembayaran}</span>
            </div>

            <div className="summary-row">
              <span>Dibayar</span>
              <span>{rupiah(receipt.dibayar)}</span>
            </div>

            <div className="summary-row">
              <span>Kembalian</span>
              <span>{rupiah(receipt.kembalian)}</span>
            </div>

            <hr />

            <div
              style={{
                textAlign: "center",
                whiteSpace: "pre-wrap",
              }}
            >
              {footer}
            </div>
          </div>

          {whatsAppOpen && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 10,
              }}
            >
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label htmlFor="receipt-whatsapp-phone">
                  Nomor WhatsApp customer
                </label>
                <input
                  id="receipt-whatsapp-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setSendError("");
                    setSendMessage("");
                  }}
                  disabled={sending}
                />
              </div>

              <small>
                Struk akan dikirim sebagai pesan WhatsApp dari nomor toko yang terhubung.
              </small>

              {sendError && (
                <p style={{ margin: "10px 0 0", color: "#b91c1c" }}>
                  {sendError}
                </p>
              )}

              {sendMessage && (
                <p style={{ margin: "10px 0 0" }}>
                  {sendMessage}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={sending}
                  onClick={() => setWhatsAppOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={sending}
                  onClick={() => void sendWhatsAppReceipt()}
                >
                  {sending ? "Mengirim..." : sendMessage ? "Kirim Ulang" : "Kirim"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Tutup
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setWhatsAppOpen((current) => !current);
              setSendError("");
            }}
          >
            Kirim WhatsApp
          </button>

          <label className="receipt-paper-control" htmlFor="receipt-paper-width">
            Ukuran
            <select id="receipt-paper-width" aria-label="Ukuran kertas struk" value={paperWidth} onChange={(event) => setPaperWidth(Number(event.target.value) as 58 | 80)}>
              <option value={58}>58 mm</option>
              <option value={80}>80 mm</option>
            </select>
          </label>

          <button
            type="button"
            className="btn-primary"
            onClick={() => window.print()}
          >
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
