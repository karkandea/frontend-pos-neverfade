import AppShell from "../components/layout/AppShell";

export default function DashboardPage() {
  return (
    <AppShell>
      <section id="sec-dashboard" className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Dashboard</h2>
            <p className="section-sub">
              Ringkasan bisnis hari ini
            </p>
          </div>

          <span
            className="status-badge"
            id="conn-status-badge"
          >
            ● Memeriksa...
          </span>
        </div>

        {/* TODO: Pixel pass dashboard dari vanilla */}
      </section>
    </AppShell>
  );
}
