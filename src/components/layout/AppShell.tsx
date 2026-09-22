import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../stores/auth";
import { useTenantContextStore } from "../../stores/tenantContext";
import {
  getDemoDefaultPath,
  getDemoPersonaLabel,
  getDemoScope,
  isDemoPathAllowed,
} from "../../lib/demoScope";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDemo = useAuthStore((state) => state.isDemo);
  const tenantName = useTenantContextStore((state) => state.context?.namaToko);
  const location = useLocation();
  const navigate = useNavigate();
  const demoScope = isDemo ? getDemoScope() : null;
  const demoPersona = demoScope?.persona ?? null;
  const demoBusinessSlug = demoScope?.businessSlug ?? null;

  useEffect(() => {
    if (!isDemo || !demoPersona || !demoBusinessSlug) return;

    const activeScope = {
      persona: demoPersona,
      businessSlug: demoBusinessSlug,
    };

    if (!isDemoPathAllowed(activeScope, location.pathname)) {
      navigate(getDemoDefaultPath(activeScope), { replace: true });
    }
  }, [
    isDemo,
    demoPersona,
    demoBusinessSlug,
    location.pathname,
    navigate,
  ]);

  return (
    <div id="page-app" className="page page-active" style={{display:"flex"}}>
      <button
        type="button"
        aria-label="Tutup navigasi"
        className={
          sidebarOpen
            ? "sidebar-overlay active"
            : "sidebar-overlay"
        }
        id="sidebar-overlay"
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        <Topbar onOpenNavigation={() => setSidebarOpen(true)} />

        {isDemo ? (
          <div
            role="status"
            style={{
              padding: "9px 16px",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              background: "#fef3c7",
              color: "#92400e",
              borderBottom: "1px solid #fde68a",
            }}
          >
            <span>
              Mode Demo · {tenantName ?? "Data simulasi"}
              {demoPersona ? " · " + getDemoPersonaLabel(demoPersona) : ""}
              {" · "}Bukan transaksi merchant asli
            </span>
            <Link
              to={demoBusinessSlug ? "/demo/business/" + demoBusinessSlug : "/demo"}
              style={{
                marginLeft: 12,
                color: "inherit",
                fontWeight: 800,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {demoPersona ? "Ganti mode" : "Ganti jenis bisnis"}
            </Link>
            {demoPersona ? (
              <Link
                to="/demo"
                style={{
                  marginLeft: 10,
                  color: "inherit",
                  fontWeight: 700,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Ganti bisnis
              </Link>
            ) : null}
          </div>
        ) : null}

        <main className="content-area">
          {children}
        </main>
      </div>

      {!sidebarOpen ? (
        <MobileNav onOpenMenu={() => setSidebarOpen(true)} />
      ) : null}
    </div>
  );
}
