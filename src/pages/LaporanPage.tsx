import AppShell from "../components/layout/AppShell";

export default function LaporanPage() {
  return (
    <AppShell>
      <section
        id="sec-laporan"
        className="content-section"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Laporan
            </h2>

            <p className="section-sub">
              Ringkasan dan analitik bisnis
            </p>
          </div>

          <div className="section-actions">
            <input
              type="date"
              id="laporan-start-date"
            />

            <input
              type="date"
              id="laporan-end-date"
            />

            <button
              className="btn-primary"
              id="btn-generate-laporan"
            >
              Generate
            </button>
          </div>
        </div>

        <div className="dashboard-bottom">
          <div className="dashboard-chart-card">
            <div className="card-header">
              <h3>Grafik Penjualan</h3>
            </div>

            <div className="chart-container">
              <canvas id="laporan-chart"></canvas>
            </div>
          </div>

          <div className="dashboard-side">
            <div className="card-panel">
              <div className="card-header">
                <h3>Ringkasan</h3>
              </div>

              <div id="laporan-summary">
                <div className="summary-row">
                  <span>Total Penjualan</span>
                  <strong>Rp 0</strong>
                </div>

                <div className="summary-row">
                  <span>Total Transaksi</span>
                  <strong>0</strong>
                </div>

                <div className="summary-row">
                  <span>Rata-rata</span>
                  <strong>Rp 0</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
