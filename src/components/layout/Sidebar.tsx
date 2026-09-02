import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";
import { useTenantContextStore } from "../../stores/tenantContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const hasCapability = useTenantContextStore((s) => s.hasCapability);

  const isAdmin =
    user?.role === "owner" ||
    user?.role === "admin";

  const canCorePos = hasCapability("core_pos");
  const canInventory = hasCapability("inventory");
  const canCustomers = hasCapability("customers");
  const canReports = hasCapability("reports");
  const canAttendance = hasCapability("attendance");
  const canFinance = hasCapability("finance_withdrawal");

  const showManagement =
    user?.role !== "kasir" &&
    (canCorePos || canInventory || canCustomers);

  const showAnalytics =
    canCorePos ||
    (user?.role !== "kasir" && canReports) ||
    (user?.role === "owner" && canFinance);

  return (
    <aside
      className={open ? "sidebar mobile-open" : "sidebar"}
      id="sidebar"
      aria-label="Navigasi utama"
    >
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
          aria-label="Tutup navigasi"
          onClick={onClose}
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

      <nav
        className="sidebar-nav"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            onClose();
          }
        }}
      >
        {(canCorePos || (user?.role !== "kasir" && canReports)) && (
          <div className="nav-section-label">
            UTAMA
          </div>
        )}

        {canCorePos && (
          <NavLink
            to="/kasir"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
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

            <span>Kasir</span>
          </NavLink>
        )}

        {user?.role !== "kasir" && canReports && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
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

            <span>Dashboard</span>

            <span
              className="nav-badge"
              id="cart-badge"
              style={{ display: "none" }}
            >
              0
            </span>
          </NavLink>
        )}

        {showManagement && (
          <div className="nav-section-label">
            MANAJEMEN
          </div>
        )}

        {user?.role !== "kasir" && canCorePos && (
          <NavLink
            to="/produk"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>

            <span>Produk</span>
          </NavLink>
        )}

        {user?.role !== "kasir" && canInventory && (
          <NavLink
            to="/inventaris"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12.01 11 20.73 6.96" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>

            <span>Inventaris</span>
          </NavLink>
        )}

        {user?.role !== "kasir" && canCustomers && (
          <NavLink
            to="/pelanggan"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>

            <span>Pelanggan</span>
          </NavLink>
        )}

        {showAnalytics && (
          <div className="nav-section-label">
            ANALITIK
          </div>
        )}

        {canCorePos && (
          <NavLink
            to="/transaksi"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>

            <span>Transaksi</span>
          </NavLink>
        )}

        {user?.role !== "kasir" && canReports && (
          <NavLink
            to="/laporan"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>

            <span>Laporan</span>
          </NavLink>
        )}

        {user?.role === "owner" && canFinance && (
          <NavLink
            to="/keuangan"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 9h18M16 14h2" />
            </svg>
            <span>Keuangan</span>
          </NavLink>
        )}

        {isAdmin && canAttendance && (
          <>
            <div className="nav-section-label nav-admin-section">
              SDM
            </div>

            <NavLink
              to="/karyawan"
              className={({ isActive }) =>
                isActive ? "nav-item nav-admin-only active" : "nav-item nav-admin-only"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>

              <span>Karyawan</span>
            </NavLink>

            <NavLink
              to="/absensi"
              className={({ isActive }) =>
                isActive ? "nav-item nav-admin-only active" : "nav-item nav-admin-only"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <polyline points="9 16 11 18 15 14" />
              </svg>

              <span>Absensi</span>
            </NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <div className="nav-section-label nav-admin-section">
              SISTEM
            </div>

            <NavLink
              to="/pengguna"
              className={({ isActive }) =>
                isActive ? "nav-item nav-admin-only active" : "nav-item nav-admin-only"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>

              <span>Pengguna</span>
            </NavLink>

            <NavLink
              to="/pengaturan"
              className={({ isActive }) =>
                isActive ? "nav-item nav-admin-only active" : "nav-item nav-admin-only"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>

              <span>Pengaturan</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar" id="sidebar-avatar">
            {user?.nama?.charAt(0).toUpperCase() ?? "O"}
          </div>

          <div>
            <div
              className="sidebar-user-name"
              id="sidebar-user-name"
            >
              {user?.nama ?? "Owner"}
            </div>

            <div
              className="sidebar-user-role"
              id="sidebar-user-role"
            >
              {user?.role ?? "Owner"}
            </div>
          </div>
        </div>

        <div
          className="sidebar-version"
          id="sidebar-version"
        >
          v1.0.0 · Memeriksa koneksi...
        </div>
      </div>
    </aside>
  );
}
