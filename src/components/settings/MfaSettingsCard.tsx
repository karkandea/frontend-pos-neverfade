import { useEffect, useState } from "react";
import QRCode from "qrcode";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/auth";

type MfaStatus = { enabled: boolean; pending: boolean; configured: boolean };
type Enrollment = { manualKey: string; otpAuthUri: string; expiresAtUtc: string };

export default function MfaSettingsCard() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [qr, setQr] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let mounted = true;
    void api.get<MfaStatus>("/api/auth/mfa/status")
      .then(({ data }) => { if (mounted) setStatus(data); })
      .catch(() => { if (mounted) setError("Status autentikator belum dapat dimuat."); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!enrollment) return;
    let active = true;
    void QRCode.toDataURL(enrollment.otpAuthUri, { width: 192, margin: 1 })
      .then((value) => { if (active) setQr(value); })
      .catch(() => setQr(""));
    return () => { active = false; };
  }, [enrollment]);

  async function enroll() {
    if (!password) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post<Enrollment>("/api/auth/mfa/enroll", { password });
      setEnrollment(data);
      setPassword("");
      setCode("");
    } catch {
      setError("Gagal memulai aktivasi. Periksa password dan koneksi.");
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!/^[0-9]{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post<{ recoveryCodes: string[] }>(
        "/api/auth/mfa/confirm", { totpCode: code });
      setRecovery(data.recoveryCodes);
      setEnrollment(null);
      setQr("");
      setCode("");
      setStatus({ enabled: true, pending: false, configured: true });
    } catch { setError("Kode belum sesuai atau kedaluwarsa. Coba kode terbaru."); }
    finally { setBusy(false); }
  }

  function finish() {
    setRecovery([]);
    logout();
  }

  return (
    <div className="card-panel">
      <div className="settings-form">
        <h3>Autentikator dua langkah</h3>
        {error && <p role="alert">{error}</p>}
        {!status && <p>Memuat status keamanan…</p>}
        {status && !status.configured && (
          <p>Autentikator belum tersedia pada lingkungan ini.</p>
        )}
        {status?.enabled && recovery.length === 0 && (
          <p>Autentikasi dua langkah aktif pada akun ini.</p>
        )}
        {recovery.length > 0 && (
          <div>
            <p><strong>Simpan delapan kode pemulihan ini.</strong> Kode hanya
              ditampilkan sekarang dan berlaku sekali pakai.</p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{recovery.join("\n")}</pre>
            <button type="button" className="btn-secondary"
              onClick={() => void navigator.clipboard.writeText(recovery.join("\n"))}>
              Salin kode pemulihan
            </button>
            <button type="button" className="btn-primary" onClick={finish}>
              Sudah disimpan — keluar dan login ulang
            </button>
          </div>
        )}
        {status && status.configured && !status.enabled && recovery.length === 0 &&
         !enrollment && (
          <div className="form-group">
            <p>Aktifkan verifikasi 6 digit untuk login berikutnya.</p>
            <label htmlFor="mfa-current-password">Password saat ini</label>
            <input id="mfa-current-password" type="password" value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn-secondary"
              disabled={busy || !password} onClick={() => void enroll()}>
              Mulai aktivasi
            </button>
          </div>
        )}
        {enrollment && (
          <div>
            <p>Scan QR dengan aplikasi autentikator atau masukkan kunci manual.
              Selesaikan dalam 10 menit.</p>
            {qr && <img src={qr} alt="QR pengaturan autentikator Neverfade"
              width={192} height={192} />}
            <p>Kunci manual: <code style={{ overflowWrap: "anywhere" }}>
              {enrollment.manualKey}</code></p>
            <div className="form-group">
              <label htmlFor="mfa-confirm-code">Kode verifikasi 6 digit</label>
              <input id="mfa-confirm-code" type="text" value={code}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                onChange={(e) => setCode(e.target.value.trim())} />
              <button type="button" className="btn-primary"
                disabled={busy || !/^[0-9]{6}$/.test(code)}
                onClick={() => void confirm()}>Aktifkan autentikator</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
