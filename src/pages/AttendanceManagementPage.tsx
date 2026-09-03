import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import {
  getSharedDeviceToken,
  saveSharedDeviceToken,
} from "../lib/sharedPos";
import { useAuthStore } from "../stores/auth";
import type {
  AttendanceDashboard,
  AttendancePolicy,
  EmployeeSharedAccess,
  EmployeeSummary,
  RegisteredSharedPosDevice,
  ScheduleException,
  SharedPosDevice,
  WeeklyScheduleDay,
} from "../types/attendance";

type PosUser = {
  id: string;
  nama: string;
  username: string;
  role: "owner" | "admin" | "kasir";
  active: boolean;
};

type ScheduleDraft = {
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
};

const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const statusLabels: Record<string, string> = {
  scheduled: "Terjadwal",
  present: "Hadir",
  late: "Terlambat",
  absent: "Tidak hadir",
  off: "Libur",
  working: "Sedang bekerja",
  missing_checkout: "Belum check out",
};

function todayWib() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeInput(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

function timePayload(value: string) {
  return value ? `${value}:00` : null;
}

function blankSchedule(): ScheduleDraft[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: false,
    startTime: "09:00",
    endTime: "17:00",
  }));
}

export default function AttendanceManagementPage() {
  const [date, setDate] = useState(todayWib());
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [users, setUsers] = useState<PosUser[]>([]);
  const [devices, setDevices] = useState<SharedPosDevice[]>([]);
  const [policy, setPolicy] = useState<AttendancePolicy>({
    graceMinutes: 10,
    absenceThresholdMinutes: 120,
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [access, setAccess] = useState<EmployeeSharedAccess | null>(null);
  const [pin, setPin] = useState("");
  const [linkedUserId, setLinkedUserId] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(blankSchedule());
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [exceptionType, setExceptionType] = useState<ScheduleException["type"]>("off");
  const [exceptionDate, setExceptionDate] = useState(todayWib());
  const [exceptionStart, setExceptionStart] = useState("09:00");
  const [exceptionEnd, setExceptionEnd] = useState("17:00");
  const [exceptionNote, setExceptionNote] = useState("");
  const [correctionIn, setCorrectionIn] = useState("");
  const [correctionOut, setCorrectionOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [deviceName, setDeviceName] = useState("Kasir Utama");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const loadCore = useCallback(async () => {
    const [dashboardResponse, employeeResponse, userResponse, deviceResponse, policyResponse] =
      await Promise.all([
        api.get<AttendanceDashboard>("/api/attendance/dashboard", { params: { date } }),
        api.get<EmployeeSummary[]>("/api/karyawan"),
        api.get<PosUser[]>("/api/users"),
        api.get<SharedPosDevice[]>("/api/shared-pos/devices"),
        api.get<AttendancePolicy>("/api/attendance/policy"),
      ]);

    setDashboard(dashboardResponse.data);
    setEmployees(employeeResponse.data);
    setUsers(userResponse.data);
    setDevices(deviceResponse.data);
    setPolicy(policyResponse.data);
    setSelectedEmployeeId((current) =>
      current && employeeResponse.data.some((employee) => employee.id === current)
        ? current
        : employeeResponse.data.find((employee) => employee.status.toLowerCase() === "aktif")?.id ??
          employeeResponse.data[0]?.id ??
          ""
    );
  }, [date]);

  const loadEmployeeDetails = useCallback(async (employeeId: string) => {
    const [accessResponse, scheduleResponse, exceptionResponse] = await Promise.all([
      api.get<EmployeeSharedAccess>(`/api/karyawan/${employeeId}/shared-access`),
      api.get<WeeklyScheduleDay[]>(`/api/attendance/employees/${employeeId}/schedule`),
      api.get<ScheduleException[]>("/api/attendance/exceptions", {
        params: { karyawanId: employeeId },
      }),
    ]);

    setAccess(accessResponse.data);
    setLinkedUserId(accessResponse.data.userId ?? "");
    setSchedule(
      scheduleResponse.data.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isWorkingDay: day.isWorkingDay,
        startTime: timeInput(day.startTime) || "09:00",
        endTime: timeInput(day.endTime) || "17:00",
      }))
    );
    setExceptions(exceptionResponse.data);
  }, []);

  useEffect(() => {
    let active = true;
    void loadCore()
      .then(() => {
        if (active) setError("");
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError).message || "Data absensi gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadCore]);

  useEffect(() => {
    let active = true;
    if (!selectedEmployeeId) return;

    void loadEmployeeDetails(selectedEmployeeId).catch((requestError) => {
      if (active) setError(getApiError(requestError).message || "Detail karyawan gagal dimuat.");
    });

    return () => {
      active = false;
    };
  }, [selectedEmployeeId, loadEmployeeDetails]);

  function announce(message: string) {
    setError("");
    setSuccess(message);
  }

  function fail(requestError: unknown, fallback: string) {
    setSuccess("");
    setError(getApiError(requestError).message || fallback);
  }

  async function savePolicy() {
    setSaving("policy");
    try {
      const { data } = await api.put<AttendancePolicy>("/api/attendance/policy", policy);
      setPolicy(data);
      announce("Aturan absensi diperbarui.");
    } catch (requestError) {
      fail(requestError, "Aturan absensi gagal disimpan.");
    } finally {
      setSaving("");
    }
  }

  async function saveAccess() {
    if (!selectedEmployeeId) return;
    setSaving("access");
    try {
      const { data } = await api.put<EmployeeSharedAccess>(
        `/api/karyawan/${selectedEmployeeId}/shared-access`,
        {
          userId: linkedUserId || null,
          clearUserLink: !linkedUserId && Boolean(access?.userId),
          pin: pin || null,
          clearPin: false,
        }
      );
      setAccess(data);
      setPin("");
      announce("Akses Shared POS karyawan diperbarui.");
    } catch (requestError) {
      fail(requestError, "Akses Shared POS gagal disimpan.");
    } finally {
      setSaving("");
    }
  }

  async function clearPin() {
    if (!selectedEmployeeId || !access?.hasPin) return;
    if (!window.confirm("Hapus PIN Shared POS karyawan ini?")) return;

    setSaving("access");
    try {
      const { data } = await api.put<EmployeeSharedAccess>(
        `/api/karyawan/${selectedEmployeeId}/shared-access`,
        { clearPin: true, clearUserLink: false }
      );
      setAccess(data);
      setPin("");
      announce("PIN karyawan dihapus.");
    } catch (requestError) {
      fail(requestError, "PIN gagal dihapus.");
    } finally {
      setSaving("");
    }
  }

  async function saveSchedule() {
    if (!selectedEmployeeId) return;
    setSaving("schedule");
    try {
      await api.put(`/api/attendance/employees/${selectedEmployeeId}/schedule`, {
        days: schedule.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isWorkingDay: day.isWorkingDay,
          startTime: day.isWorkingDay ? timePayload(day.startTime) : null,
          endTime: day.isWorkingDay ? timePayload(day.endTime) : null,
        })),
      });
      announce("Jadwal mingguan diperbarui.");
      await loadCore();
    } catch (requestError) {
      fail(requestError, "Jadwal gagal disimpan.");
    } finally {
      setSaving("");
    }
  }

  async function saveException() {
    if (!selectedEmployeeId) return;
    setSaving("exception");
    try {
      await api.put("/api/attendance/exceptions", {
        karyawanId: selectedEmployeeId,
        date: exceptionDate,
        type: exceptionType,
        startTime: exceptionType === "changed_shift" ? timePayload(exceptionStart) : null,
        endTime: exceptionType === "changed_shift" ? timePayload(exceptionEnd) : null,
        note: exceptionNote.trim() || null,
      });
      setExceptionNote("");
      announce("Pengecualian jadwal disimpan.");
      await loadEmployeeDetails(selectedEmployeeId);
      await loadCore();
    } catch (requestError) {
      fail(requestError, "Pengecualian jadwal gagal disimpan.");
    } finally {
      setSaving("");
    }
  }

  async function deleteException(id: string) {
    if (!window.confirm("Hapus pengecualian jadwal ini?")) return;
    setSaving("exception");
    try {
      await api.delete(`/api/attendance/exceptions/${id}`);
      announce("Pengecualian jadwal dihapus.");
      await loadEmployeeDetails(selectedEmployeeId);
      await loadCore();
    } catch (requestError) {
      fail(requestError, "Pengecualian jadwal gagal dihapus.");
    } finally {
      setSaving("");
    }
  }

  async function saveCorrection() {
    if (!selectedEmployeeId || !correctionReason.trim()) return;
    setSaving("correction");
    try {
      await api.post("/api/attendance/corrections", {
        karyawanId: selectedEmployeeId,
        date,
        checkIn: timePayload(correctionIn),
        checkOut: timePayload(correctionOut),
        reason: correctionReason.trim(),
      });
      setCorrectionReason("");
      announce("Koreksi absensi disimpan beserta audit trail.");
      await loadCore();
    } catch (requestError) {
      fail(requestError, "Koreksi absensi gagal disimpan.");
    } finally {
      setSaving("");
    }
  }

  async function activateThisDevice() {
    if (!deviceName.trim()) return;
    setSaving("device");
    try {
      const { data } = await api.post<RegisteredSharedPosDevice>(
        "/api/shared-pos/devices",
        { name: deviceName.trim() }
      );
      saveSharedDeviceToken(data.deviceToken);
      useAuthStore.getState().logout();
      window.location.replace("/shared-pos");
    } catch (requestError) {
      fail(requestError, "Perangkat gagal diaktifkan sebagai Shared POS.");
      setSaving("");
    }
  }

  async function deactivateDevice(deviceId: string) {
    if (!window.confirm("Nonaktifkan perangkat Shared POS ini? Semua sesi aktif ikut terkunci.")) return;
    setSaving(`device-${deviceId}`);
    try {
      await api.post(`/api/shared-pos/devices/${deviceId}/deactivate`);
      announce("Perangkat dinonaktifkan.");
      await loadCore();
    } catch (requestError) {
      fail(requestError, "Perangkat gagal dinonaktifkan.");
    } finally {
      setSaving("");
    }
  }

  return (
    <AppShell>
      <section className="content-section active">
        <div className="section-header">
          <div>
            <h2>Kelola Absensi</h2>
            <p>Jadwal, Shared POS, status kehadiran, dan koreksi</p>
          </div>
          <div className="section-actions">
            <input
              aria-label="Tanggal dashboard absensi"
              type="date"
              value={date}
              onChange={(event) => {
                setLoading(true);
                setDate(event.target.value);
              }}
            />
            <button className="btn-secondary" type="button" onClick={() => window.location.assign("/absensi")}>Riwayat Lama</button>
          </div>
        </div>

        {error ? <p role="alert" style={styles.error}>{error}</p> : null}
        {success ? <p role="status" style={styles.success}>{success}</p> : null}

        {loading || !dashboard ? (
          <p>Memuat dashboard absensi...</p>
        ) : (
          <>
            <div style={styles.summaryGrid}>
              {[
                ["Terjadwal", dashboard.summary.scheduled],
                ["Hadir", dashboard.summary.present],
                ["Terlambat", dashboard.summary.late],
                ["Tidak hadir", dashboard.summary.absent],
                ["Sedang bekerja", dashboard.summary.working],
                ["Belum checkout", dashboard.summary.missingCheckout],
              ].map(([label, value]) => (
                <div key={String(label)} style={styles.summaryCard}>
                  <span style={styles.muted}>{label}</span>
                  <strong style={styles.summaryValue}>{value}</strong>
                </div>
              ))}
            </div>

            <div className="table-card" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Status</th>
                    <th>Jadwal</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.employees.length === 0 ? (
                    <tr><td colSpan={5} className="text-center">Tidak ada karyawan aktif.</td></tr>
                  ) : dashboard.employees.map((row) => (
                    <tr key={row.karyawanId}>
                      <td><strong>{row.karyawanNama}</strong><br /><small>{row.jabatan}</small></td>
                      <td>{statusLabels[row.status] ?? row.status}{row.outsideSchedule ? " · di luar jadwal" : ""}</td>
                      <td>{row.scheduleStart && row.scheduleEnd ? `${row.scheduleStart}–${row.scheduleEnd}` : row.exceptionType ? statusLabels.off : "-"}</td>
                      <td>{row.checkIn ?? "-"}</td>
                      <td>{row.checkOut ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={styles.twoColumn}>
          <section style={styles.panel}>
            <h3>Aturan Absensi</h3>
            <label style={styles.field}>Grace keterlambatan (menit)
              <input type="number" min={0} max={180} value={policy.graceMinutes} onChange={(event) => setPolicy((current) => ({ ...current, graceMinutes: Number(event.target.value) }))} />
            </label>
            <label style={styles.field}>Batas dianggap tidak hadir (menit setelah jam mulai)
              <input type="number" min={1} max={720} value={policy.absenceThresholdMinutes} onChange={(event) => setPolicy((current) => ({ ...current, absenceThresholdMinutes: Number(event.target.value) }))} />
            </label>
            <button className="btn-primary" type="button" disabled={saving === "policy"} onClick={() => void savePolicy()}>
              {saving === "policy" ? "Menyimpan..." : "Simpan Aturan"}
            </button>
          </section>

          <section style={styles.panel}>
            <h3>Shared POS Perangkat Ini</h3>
            {getSharedDeviceToken() ? (
              <>
                <p style={styles.muted}>Perangkat ini sudah memiliki aktivasi lokal Shared POS.</p>
                <button className="btn-primary" type="button" onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.replace("/shared-pos");
                }}>Masuk Mode Shared POS</button>
              </>
            ) : (
              <>
                <label style={styles.field}>Nama perangkat
                  <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="Contoh: Kasir Depan" />
                </label>
                <button className="btn-primary" type="button" disabled={saving === "device"} onClick={() => void activateThisDevice()}>
                  {saving === "device" ? "Mengaktifkan..." : "Aktifkan Shared POS di Perangkat Ini"}
                </button>
              </>
            )}
          </section>
        </div>

        <section style={styles.panel}>
          <h3>Perangkat Terdaftar</h3>
          {devices.length === 0 ? <p style={styles.muted}>Belum ada perangkat.</p> : (
            <div style={styles.deviceList}>
              {devices.map((device) => (
                <div key={device.id} style={styles.deviceRow}>
                  <div><strong>{device.name}</strong><br /><small>{device.active ? "Aktif" : "Nonaktif"}{device.lastUsedAt ? ` · terakhir dipakai ${new Date(device.lastUsedAt).toLocaleString("id-ID")}` : ""}</small></div>
                  {device.active ? <button className="btn-secondary" type="button" disabled={saving === `device-${device.id}`} onClick={() => void deactivateDevice(device.id)}>Nonaktifkan</button> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div><h3 style={{ marginBottom: 4 }}>Akses & Jadwal Karyawan</h3><p style={styles.muted}>PIN tidak pernah ditampilkan kembali setelah disimpan.</p></div>
            <select aria-label="Pilih karyawan untuk dikelola" value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nama} · {employee.jabatan}</option>)}
            </select>
          </div>

          {selectedEmployee ? (
            <>
              <div style={styles.twoColumn}>
                <div>
                  <h4>Akses Shared POS</h4>
                  <label style={styles.field}>Link ke user POS (opsional)
                    <select value={linkedUserId} onChange={(event) => setLinkedUserId(event.target.value)}>
                      <option value="">Attendance only</option>
                      {users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}
                    </select>
                  </label>
                  <label style={styles.field}>{access?.hasPin ? "Ganti PIN" : "Buat PIN"}
                    <input inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4–6 digit" />
                  </label>
                  <div style={styles.buttonRow}>
                    <button className="btn-primary" type="button" disabled={saving === "access" || (pin.length > 0 && pin.length < 4)} onClick={() => void saveAccess()}>{saving === "access" ? "Menyimpan..." : "Simpan Akses"}</button>
                    {access?.hasPin ? <button className="btn-secondary" type="button" disabled={saving === "access"} onClick={() => void clearPin()}>Hapus PIN</button> : null}
                  </div>
                </div>

                <div>
                  <h4>Koreksi {date}</h4>
                  <div style={styles.timeRow}>
                    <label style={styles.field}>Check In<input type="time" value={correctionIn} onChange={(event) => setCorrectionIn(event.target.value)} /></label>
                    <label style={styles.field}>Check Out<input type="time" value={correctionOut} onChange={(event) => setCorrectionOut(event.target.value)} /></label>
                  </div>
                  <label style={styles.field}>Alasan koreksi<textarea rows={3} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Wajib diisi untuk audit trail" /></label>
                  <button className="btn-primary" type="button" disabled={saving === "correction" || correctionReason.trim().length < 3} onClick={() => void saveCorrection()}>{saving === "correction" ? "Menyimpan..." : "Simpan Koreksi"}</button>
                </div>
              </div>

              <h4 style={{ marginTop: 24 }}>Jadwal Mingguan</h4>
              <div style={styles.scheduleGrid}>
                {schedule.map((day, index) => (
                  <div key={day.dayOfWeek} style={styles.scheduleRow}>
                    <label style={styles.checkLabel}><input type="checkbox" checked={day.isWorkingDay} onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isWorkingDay: event.target.checked } : item))} /> {dayLabels[day.dayOfWeek]}</label>
                    <input aria-label={`Jam mulai ${dayLabels[day.dayOfWeek]}`} type="time" disabled={!day.isWorkingDay} value={day.startTime} onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} />
                    <input aria-label={`Jam selesai ${dayLabels[day.dayOfWeek]}`} type="time" disabled={!day.isWorkingDay} value={day.endTime} onChange={(event) => setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} />
                  </div>
                ))}
              </div>
              <button className="btn-primary" type="button" disabled={saving === "schedule"} onClick={() => void saveSchedule()}>{saving === "schedule" ? "Menyimpan..." : "Simpan Jadwal Mingguan"}</button>

              <h4 style={{ marginTop: 28 }}>Pengecualian Tanggal</h4>
              <div style={styles.exceptionForm}>
                <input aria-label="Tanggal pengecualian" type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} />
                <select aria-label="Jenis pengecualian" value={exceptionType} onChange={(event) => setExceptionType(event.target.value as ScheduleException["type"])}>
                  <option value="off">Libur</option><option value="leave">Cuti/Izin</option><option value="holiday">Hari Libur</option><option value="changed_shift">Ganti Shift</option>
                </select>
                {exceptionType === "changed_shift" ? <><input aria-label="Jam mulai shift pengganti" type="time" value={exceptionStart} onChange={(event) => setExceptionStart(event.target.value)} /><input aria-label="Jam selesai shift pengganti" type="time" value={exceptionEnd} onChange={(event) => setExceptionEnd(event.target.value)} /></> : null}
                <input aria-label="Catatan pengecualian" value={exceptionNote} onChange={(event) => setExceptionNote(event.target.value)} placeholder="Catatan opsional" />
                <button className="btn-secondary" type="button" disabled={saving === "exception"} onClick={() => void saveException()}>Simpan Exception</button>
              </div>
              {exceptions.length > 0 ? <div style={styles.deviceList}>{exceptions.map((item) => <div key={item.id} style={styles.deviceRow}><span><strong>{item.date}</strong> · {item.type}{item.note ? ` · ${item.note}` : ""}</span><button className="btn-secondary" type="button" onClick={() => void deleteException(item.id)}>Hapus</button></div>)}</div> : null}
            </>
          ) : <p style={styles.muted}>Belum ada karyawan.</p>}
        </section>
      </section>
    </AppShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  error: { color: "#b42318", background: "#fef3f2", padding: 12, borderRadius: 10 },
  success: { color: "#067647", background: "#ecfdf3", padding: 12, borderRadius: 10 },
  muted: { color: "#667085", margin: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 },
  summaryCard: { background: "white", border: "1px solid #eaecf0", borderRadius: 14, padding: 16, display: "grid", gap: 6 },
  summaryValue: { fontSize: 28 },
  twoColumn: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 18 },
  panel: { background: "white", border: "1px solid #eaecf0", borderRadius: 16, padding: 18, marginTop: 18 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap" },
  field: { display: "grid", gap: 6, marginBottom: 12, fontWeight: 600 },
  deviceList: { display: "grid", gap: 8, marginTop: 12 },
  deviceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid #eaecf0", borderRadius: 12, padding: 12 },
  buttonRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  timeRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  scheduleGrid: { display: "grid", gap: 8, marginBottom: 12 },
  scheduleRow: { display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 130px 130px", gap: 8, alignItems: "center" },
  checkLabel: { display: "flex", gap: 8, alignItems: "center", fontWeight: 600 },
  exceptionForm: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" },
};
