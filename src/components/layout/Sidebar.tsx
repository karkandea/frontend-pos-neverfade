import { useAuthStore } from "../../stores/auth";

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-wrap">
          <div className="logo-text-wrap logo-text-sm">
            <span className="logo-never">NEVER</span>
            <span className="logo-fade">FADE.</span>
          </div>

          <span className="sidebar-brand-sub">
            POS Suite
          </span>
        </div>

        <button
          type="button"
          className="sidebar-close-btn"
          id="sidebar-close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">
          UTAMA
        </div>

        <a className="nav-item" data-page="dashboard">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>

          <span>Dashboard</span>
        </a>

        <a className="nav-item" data-page="kasir">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
            <path d="M7 8h2M11 8h6M7 12h2M11 12h2" />
          </svg>

          <span>Kasir</span>

          <span
            className="nav-badge"
            id="cart-badge"
            style={{ display: "none" }}
          >
            0
          </span>
        </a>

        <div className="nav-section-label">
          MANAJEMEN
        </div>

        <a className="nav-item" data-page="produk">
          <span>Produk</span>
        </a>

        <a className="nav-item" data-page="inventaris">
          <span>Inventaris</span>
        </a>

        <a className="nav-item" data-page="pelanggan">
          <span>Pelanggan</span>
        </a>

        <div className="nav-section-label">
          ANALITIK
        </div>

        <a className="nav-item" data-page="transaksi">
          <span>Transaksi</span>
        </a>

        <a className="nav-item" data-page="laporan">
          <span>Laporan</span>
        </a>

        {isAdmin && (
          <>
            <div className="nav-section-label nav-admin-section">
              SDM
            </div>

            <a className="nav-item nav-admin-only" data-page="karyawan">
              <span>Karyawan</span>
            </a>

            <a className="nav-item nav-admin-only" data-page="absensi">
              <span>Absensi</span>
            </a>

            <div className="nav-section-label nav-admin-section">
              SISTEM
            </div>

            <a className="nav-item nav-admin-only" data-page="pengguna">
              <span>Pengguna</span>
            </a>

            <a className="nav-item nav-admin-only" data-page="pengaturan">
              <span>Pengaturan</span>
            </a>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar" id="sidebar-avatar">
            {user?.nama?.charAt(0).toUpperCase() ?? "?"}
          </div>

          <div>
            <div
              className="sidebar-user-name"
              id="sidebar-user-name"
            >
              {user?.nama ?? "-"}
            </div>

            <div
              className="sidebar-user-role"
              id="sidebar-user-role"
            >
              {user?.role ?? "-"}
            </div>
          </div>
        </div>

        <div
          className="sidebar-version"
          id="sidebar-version"
        >
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
