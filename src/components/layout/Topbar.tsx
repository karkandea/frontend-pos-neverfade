import { useMemo } from "react";
import { useAuthStore } from "../../stores/auth";

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const now = useMemo(() => new Date(), []);

  const date = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-toggle"
          id="sidebar-toggle"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div
          className="topbar-title"
          id="topbar-title"
        >
          Dashboard
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-datetime">
          <div
            className="topbar-date"
            id="topbar-date"
          >
            {date}
          </div>

          <div
            className="topbar-time"
            id="topbar-time"
          >
            {time}
          </div>
        </div>

        <div className="topbar-divider"></div>

        <div className="topbar-user">
          <div
            className="user-avatar"
            id="user-avatar"
          >
            {user?.nama?.charAt(0).toUpperCase() ?? "?"}
          </div>

          <div className="user-info">
            <div
              className="user-name"
              id="user-name"
            >
              {user?.nama ?? "-"}
            </div>

            <div
              className="user-role"
              id="user-role"
            >
              {user?.role ?? "-"}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-logout"
          id="btn-logout"
          onClick={logout}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>

          <span className="btn-logout-text">
            Keluar
          </span>
        </button>
      </div>
    </header>
  );
}
