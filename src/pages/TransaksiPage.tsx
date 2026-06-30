import AppShell from "../components/layout/AppShell";

export default function TransaksiPage() {
  return (
    <AppShell>
      <section
        id="sec-transaksi"
        className="content-section"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Transaksi
            </h2>

            <p className="section-sub">
              Riwayat transaksi penjualan
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
                id="transaksi-search"
                placeholder="Cari transaksi..."
              />
            </div>

            <button
              className="btn-secondary"
              id="btn-export-transaksi"
            >
              Export
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Kasir</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody id="transaksi-tbody">
                <tr>
                  <td
                    colSpan={7}
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
