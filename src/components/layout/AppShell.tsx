import type { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div id="page-app" className="page">
      <div
        className="sidebar-overlay"
        id="sidebar-overlay"
      />

      <Sidebar />

      <div className="main-wrapper">
        <Topbar />

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
