import { useState, type CSSProperties } from "react";
import axios from "axios";
import {
  activateSharedPosUser,
  clearSharedDevice,
  clearSharedSession,
  getSharedDeviceToken,
  punchSharedAttendance,
  unlockSharedPos,
} from "../lib/sharedPos";
import type { SharedPosUnlockResponse } from "../types/attendance";

const statusLabels: Record<string, string> = {
  scheduled: "Terjadwal",
  present: "Hadir",
  late: "Terlambat",
  absent: "Tidak hadir",
  off: "Libur",
  working: "Sedang bekerja",
  missing_checkout: "Belum check out",
};

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.code;
    if (code === "SHARED_DEVICE_TEMPORARILY_LOCKED") {
      return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
    }

    if (code === "SHARED_SESSION_INVALID") {
      return "Sesi sudah terkunci. Masukkan PIN lagi.";
    }
  }

  return "Perangkat atau PIN tidak valid.";
}

export default function SharedPosPage() {
  const hasDevice = Boolean(getSharedDeviceToken());
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState<SharedPosUnlockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function pushDigit(digit: string) {
    if (loading || unlocked || pin.length >= 6) {
      return;
    }

    setPin((current) => current + digit);
    setError("");
  }

  async function submitPin() {
    if (loading || pin.length < 4 || pin.length > 6) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await unlockSharedPos(pin);
      setUnlocked(data);
      setPin("");
    } catch (requestError) {
      clearSharedSession();
      setPin("");
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function punch(kind: "checkin" | "checkout") {
    if (!unlocked || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await punchSharedAttendance(kind);
      setSuccess(
        kind === "checkin"
          ? `Check in tercatat ${result.recordedAt}.`
          : `Check out tercatat ${result.recordedAt}.`
      );
      setUnlocked(null);
    } catch (requestError) {
      clearSharedSession();
      setUnlocked(null);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function openPos() {
    if (!unlocked?.posToken) {
      return;
    }

    activateSharedPosUser(unlocked.posToken, unlocked.sessionToken);
    window.location.replace("/kasir");
  }

  function leaveDeviceMode() {
    if (!window.confirm("Hapus aktivasi Shared POS dari perangkat ini? Owner/admin harus setup ulang.")) {
      return;
    }

    clearSharedDevice();
    window.location.replace("/login");
  }

  if (!hasDevice) {
    return (
      <main style={styles.screen}>
        <section style={styles.card}>
          <div style={styles.brand}>NeverFade POS</div>
          <h1 style={styles.title}>Perangkat belum diaktifkan</h1>
          <p style={styles.muted}>
            Masuk sebagai owner atau admin, buka Absensi, lalu aktifkan Shared POS di perangkat ini.
          </p>
          <button className="btn-primary" type="button" onClick={() => window.location.replace("/login")}>
            Masuk untuk setup
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.screen}>
      <section style={styles.card} aria-labelledby="shared-pos-title">
        <div style={styles.brand}>NeverFade POS</div>
        <h1 id="shared-pos-title" style={styles.title}>
          {unlocked ? `Halo, ${unlocked.employee.nama}` : "Masukkan PIN karyawan"}
        </h1>
        <p style={styles.muted}>
          {unlocked
            ? `${unlocked.employee.jabatan} · ${statusLabels[unlocked.attendance.status] ?? unlocked.attendance.status}`
            : "Gunakan PIN pribadi 4–6 digit. Jangan bagikan PIN ke karyawan lain."}
        </p>

        {error ? <p role="alert" style={styles.error}>{error}</p> : null}
        {success ? <p role="status" style={styles.success}>{success}</p> : null}

        {!unlocked ? (
          <>
            <div aria-label={`${pin.length} digit PIN terisi`} style={styles.pinDots}>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} style={{ ...styles.pinDot, opacity: index < pin.length ? 1 : 0.2 }} />
              ))}
            </div>

            <div style={styles.keypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  style={styles.key}
                  disabled={loading}
                  onClick={() => pushDigit(digit)}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                style={styles.keySecondary}
                disabled={loading || pin.length === 0}
                onClick={() => setPin((current) => current.slice(0, -1))}
              >
                Hapus
              </button>
              <button type="button" style={styles.key} disabled={loading} onClick={() => pushDigit("0")}>
                0
              </button>
              <button
                type="button"
                style={styles.keyPrimary}
                disabled={loading || pin.length < 4}
                onClick={() => void submitPin()}
              >
                {loading ? "..." : "Masuk"}
              </button>
            </div>
          </>
        ) : (
          <div style={styles.unlockedBody}>
            <div style={styles.attendanceBox}>
              <div>
                <span style={styles.label}>Jadwal</span>
                <strong>
                  {unlocked.attendance.scheduleStart && unlocked.attendance.scheduleEnd
                    ? `${unlocked.attendance.scheduleStart}–${unlocked.attendance.scheduleEnd}`
                    : "Tidak ada jadwal"}
                </strong>
              </div>
              <div>
                <span style={styles.label}>Check in</span>
                <strong>{unlocked.attendance.checkIn ?? "-"}</strong>
              </div>
              <div>
                <span style={styles.label}>Check out</span>
                <strong>{unlocked.attendance.checkOut ?? "-"}</strong>
              </div>
            </div>

            {unlocked.attendance.nextAction === "checkin" ? (
              <button className="btn-primary" type="button" disabled={loading} onClick={() => void punch("checkin")}>
                {loading ? "Mencatat..." : "Check In"}
              </button>
            ) : null}

            {unlocked.attendance.nextAction === "checkout" ? (
              <button className="btn-primary" type="button" disabled={loading} onClick={() => void punch("checkout")}>
                {loading ? "Mencatat..." : "Check Out"}
              </button>
            ) : null}

            {unlocked.employee.canAccessPos && unlocked.posToken ? (
              <button className="btn-secondary" type="button" disabled={loading} onClick={openPos}>
                Buka Kasir
              </button>
            ) : (
              <p style={styles.muted}>Akun ini hanya memiliki akses absensi.</p>
            )}

            <button
              type="button"
              style={styles.textButton}
              onClick={() => {
                clearSharedSession();
                setUnlocked(null);
                setError("");
              }}
            >
              Kunci kembali
            </button>
          </div>
        )}

        {!unlocked ? (
          <button type="button" style={styles.deviceReset} onClick={leaveDeviceMode}>
            Hapus setup perangkat
          </button>
        ) : null}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  screen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "var(--bg, #f5f7f9)",
  },
  card: {
    width: "min(100%, 440px)",
    borderRadius: 24,
    padding: "28px clamp(20px, 5vw, 36px)",
    background: "white",
    boxShadow: "0 24px 70px rgba(16, 24, 40, 0.12)",
    textAlign: "center",
  },
  brand: { fontWeight: 800, letterSpacing: "0.04em", marginBottom: 22 },
  title: { margin: "0 0 8px", fontSize: "clamp(24px, 5vw, 32px)" },
  muted: { color: "#667085", lineHeight: 1.55, margin: "0 0 20px" },
  error: { color: "#b42318", background: "#fef3f2", borderRadius: 12, padding: 12 },
  success: { color: "#067647", background: "#ecfdf3", borderRadius: 12, padding: 12 },
  pinDots: { display: "flex", justifyContent: "center", gap: 12, margin: "28px 0" },
  pinDot: { width: 14, height: 14, borderRadius: 99, background: "#101828" },
  keypad: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  key: {
    minHeight: 62,
    borderRadius: 16,
    border: "1px solid #d0d5dd",
    background: "white",
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
  },
  keySecondary: {
    minHeight: 62,
    borderRadius: 16,
    border: "1px solid #d0d5dd",
    background: "#f9fafb",
    fontWeight: 700,
    cursor: "pointer",
  },
  keyPrimary: {
    minHeight: 62,
    borderRadius: 16,
    border: 0,
    background: "#101828",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  unlockedBody: { display: "grid", gap: 12, marginTop: 24 },
  attendanceBox: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    background: "#f9fafb",
    textAlign: "left",
  },
  label: { display: "block", fontSize: 12, color: "#667085", marginBottom: 4 },
  textButton: { border: 0, background: "transparent", color: "#475467", padding: 10, cursor: "pointer" },
  deviceReset: { border: 0, background: "transparent", color: "#98a2b3", marginTop: 24, cursor: "pointer" },
};
