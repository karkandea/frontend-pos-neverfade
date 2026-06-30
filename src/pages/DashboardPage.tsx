import AppShell from "../components/layout/AppShell";

export default function DashboardPage() {
  return (
    <AppShell>
      <section id="sec-dashboard" className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Dashboard</h2>
            <p className="section-sub">Ringkasan bisnis hari ini</p>
          </div>

          <span
            className="status-badge"
            id="conn-status-badge"
          >
            ● Memeriksa...
          </span>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Omzet Hari Ini</div>
              <div className="stat-value" id="stat-omzet-hari">Rp 0</div>
              <div className="stat-delta" id="stat-omzet-delta">0 transaksi</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Omzet Bulan Ini</div>
              <div className="stat-value" id="stat-omzet-bulan">Rp 0</div>
              <div className="stat-delta" id="stat-trx-bulan">0 transaksi</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Total Produk</div>
              <div className="stat-value" id="stat-produk">0</div>
              <div className="stat-delta" id="stat-stok">0 unit</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Total Transaksi</div>
              <div className="stat-value" id="stat-transaksi">0</div>
              <div className="stat-delta" id="stat-trx-hari">0 hari ini</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Total Pelanggan</div>
              <div className="stat-value" id="stat-pelanggan">0</div>
              <div className="stat-delta">Member aktif</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-label">Total Stok</div>
              <div className="stat-value" id="stat-total-stok">0</div>
              <div className="stat-delta" id="stat-stok-low">— stok rendah</div>
            </div>
          </div>
        </div>
        <div className="dashboard-bottom">
          <div className="dashboard-chart-card">
            <div className="card-header">
              <h3>Penjualan 7 Hari Terakhir</h3>
            </div>

            <div className="chart-container">
              <canvas id="sales-chart"></canvas>
            </div>
          </div>

          <div className="dashboard-side">
            <div className="card-panel">
              <div className="card-header">
                <h3>Produk Terlaris</h3>
              </div>

              <div
                id="top-products-list"
                className="top-list"
              >
                <div className="empty-state-sm">
                  Belum ada data
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="card-header">
                <h3>Aktivitas Terbaru</h3>
              </div>

              <div
                id="recent-activity-list"
                className="activity-list"
              >
                <div className="empty-state-sm">
                  Belum ada aktivitas
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
