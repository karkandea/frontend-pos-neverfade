import AppShell from "../components/layout/AppShell";

export default function KaryawanPage() {
  return (
    <AppShell>
      <section
        id="sec-karyawan"
        className="content-section active"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Karyawan
            </h2>

            <p className="section-sub">
              Kelola data karyawan
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
                id="karyawan-search"
                placeholder="Cari karyawan..."
              />
            </div>

            <button
              className="btn-primary"
              id="btn-add-karyawan"
            >
              Tambah
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>No. HP</th>
                  <th>Status</th>
                  <th>Mulai Kerja</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody id="karyawan-tbody">
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
