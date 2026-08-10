import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { usePlatformAuthStore } from "../../stores/platformAuth";

type Props = {
  children: ReactNode;
};

export default function PlatformShell({ children }: Props) {
  const navigate = useNavigate();
  const user = usePlatformAuthStore((state) => state.user);
  const logout = usePlatformAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate("/platform/login", { replace: true });
  }

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <div className="logo-text-wrap logo-text-sm">
            <span className="logo-never">NEVER</span>
            <span className="logo-fade">FADE.</span>
          </div>
          <span>Platform Console</span>
        </div>

        <nav aria-label="Navigasi Super Admin">
          <span className="platform-nav-label">CONTROL PLANE</span>
          <NavLink
            to="/platform/tenants"
            className={({ isActive }) =>
              `platform-nav-link${isActive ? " active" : ""}`
            }
          >
            <svg
              aria-hidden="true"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2m2 0h2m-6 4h2m2 0h2m-6 4h6" />
            </svg>
            <span>Tenant</span>
          </NavLink>
        </nav>

        <div className="platform-sidebar-footer">
          <div className="platform-user">
            <span className="platform-avatar" aria-hidden="true">
              {user?.nama.slice(0, 1).toUpperCase() ?? "S"}
            </span>
            <span>
              <strong>{user?.nama ?? "Super Admin"}</strong>
              <small>Super Admin</small>
            </span>
          </div>
          <button
            type="button"
            className="platform-logout"
            onClick={handleLogout}
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div>
            <span className="platform-eyebrow">Neverfade Platform</span>
            <strong>Super Admin</strong>
          </div>
          <span className="platform-scope-badge">Platform scope</span>
        </header>
        <main className="platform-content" id="platform-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
