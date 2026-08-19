import { useState, type ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
