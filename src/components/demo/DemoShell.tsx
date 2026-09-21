import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleHelp,
  LayoutGrid,
  LogIn,
  PlayCircle,
  Sparkles,
} from "lucide-react";

type DemoShellProps = { children: ReactNode };

function BrandMark() {
  return (
    <span className="nf-brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export default function DemoShell({ children }: DemoShellProps) {
  return (
    <main className="demo-home">
      <aside className="demo-sidebar">
        <div className="demo-sidebar-brand">
          <BrandMark />
          <span><strong>NeverFade</strong><small>POS</small></span>
        </div>

        <nav className="demo-nav" aria-label="Demo navigation">
          <NavLink end to="/demo"><LayoutGrid aria-hidden="true" />Demo</NavLink>
          <NavLink to="/demo/features"><Sparkles aria-hidden="true" />Fitur</NavLink>
          <NavLink to="/demo/pricing"><BadgeDollarSign aria-hidden="true" />Harga</NavLink>
          <NavLink to="/demo/how-it-works"><PlayCircle aria-hidden="true" />Cara Kerja</NavLink>
          <NavLink to="/demo/faq"><CircleHelp aria-hidden="true" />FAQ</NavLink>
        </nav>

        <div className="demo-sidebar-bottom">
          <Link className="demo-login-link" to="/login"><LogIn aria-hidden="true" /><span>Masuk Merchant</span></Link>
          <Link className="demo-start-button" to="/demo">Mulai Demo <ArrowRight aria-hidden="true" /></Link>
          <small>Data demo terpisah dari data merchant.</small>
        </div>
      </aside>

      <section className="demo-main">
        <div className="demo-content">{children}</div>
      </section>
    </main>
  );
}
