import AppShell from "../components/layout/AppShell";

export default function AbsensiPage() {
  return (
    <AppShell>
      <section
        id="sec-absensi"
        className="content-section active"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Absensi
            </h2>

            <p className="section-sub">
              Kehadiran karyawan
            </p>
          </div>

          <div className="section-actions">
            <div className="search-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>

              <input
                type="text"
                id="absensi-search"
                placeholder="Cari karyawan..."
              />
            </div>

            <button
              className="btn-primary"
              id="btn-absensi"
            >
              Catat Absensi
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Masuk</th>
                  <th>Pulang</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody id="absensi-tbody">
                <tr>
                  <td
                    colSpan={6}
                    className="text-center"
                  >
                    Belum ada data.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
