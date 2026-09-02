import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Attendance = {
  id: string;
  karyawanId: string;
  karyawanNama: string;
  jabatan: string;
  tanggal: string;
  checkIn: string | null;
  checkOut: string | null;
};

type Employee = {
  id: string;
  nama: string;
  jabatan: string;
  status: string;
};

type ActionKind = "checkin" | "checkout";

export default function AbsensiPage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedKaryawanId, setSelectedKaryawanId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionKind | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [attendanceResponse, employeeResponse] = await Promise.all([
        api.get<Attendance[]>("/api/absensi"),
        api.get<Employee[]>("/api/karyawan"),
      ]);

      setItems(attendanceResponse.data);
      setEmployees(employeeResponse.data);

      setSelectedKaryawanId((current) => {
        if (
          current &&
          employeeResponse.data.some((employee) => employee.id === current)
        ) {
          return current;
        }

        return (
          employeeResponse.data.find(
            (employee) => employee.status.toLowerCase() === "aktif"
          )?.id ?? employeeResponse.data[0]?.id ?? ""
        );
      });
    } catch {
      setError("Data absensi gagal dimuat. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      `${item.karyawanNama} ${item.jabatan}`.toLowerCase().includes(keyword)
    );
  }, [items, search]);

  async function recordAttendance(kind: ActionKind) {
    if (!selectedKaryawanId || actionLoading) {
      return;
    }

    setActionLoading(kind);
    setError("");
    setSuccess("");

    try {
      await api.post(`/api/absensi/${kind}`, {
        karyawanId: selectedKaryawanId,
      });

      setSuccess(
        kind === "checkin"
          ? "Check in berhasil dicatat."
          : "Check out berhasil dicatat."
      );
      await load();
    } catch {
      setError(
        kind === "checkin"
          ? "Check in gagal. Periksa status absensi karyawan lalu coba lagi."
          : "Check out gagal. Periksa status absensi karyawan lalu coba lagi."
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AppShell>
      <section className="content-section active">
        <div className="section-header">
          <div>
            <h2>Absensi</h2>
            <p>Kehadiran karyawan</p>
          </div>

          <div className="section-actions">
            <input
              type="search"
              aria-label="Cari karyawan di riwayat absensi"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Pilih karyawan untuk absensi"
              value={selectedKaryawanId}
              onChange={(event) => setSelectedKaryawanId(event.target.value)}
              disabled={loading || employees.length === 0 || actionLoading !== null}
            >
              {employees.length === 0 ? (
                <option value="">Tidak ada karyawan</option>
              ) : (
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.nama} · {employee.jabatan}
                  </option>
                ))
              )}
            </select>

            <button
              className="btn-secondary"
              type="button"
              disabled={!selectedKaryawanId || actionLoading !== null}
              onClick={() => void recordAttendance("checkin")}
            >
              {actionLoading === "checkin" ? "Mencatat..." : "Check In"}
            </button>

            <button
              className="btn-primary"
              type="button"
              disabled={!selectedKaryawanId || actionLoading !== null}
              onClick={() => void recordAttendance("checkout")}
            >
              {actionLoading === "checkout" ? "Mencatat..." : "Check Out"}
            </button>
          </div>
        </div>

        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button className="btn-secondary" type="button" onClick={() => void load()}>
              Coba Lagi
            </button>
          </div>
        ) : null}

        {success ? <p role="status">{success}</p> : null}

        <div className="table-card">
          {loading ? (
            <p>Memuat data absensi...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Jabatan</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      {search
                        ? "Tidak ada data absensi yang cocok."
                        : "Belum ada data absensi."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.tanggal}</td>
                      <td>{item.karyawanNama}</td>
                      <td>{item.jabatan}</td>
                      <td>{item.checkIn ?? "-"}</td>
                      <td>{item.checkOut ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}
