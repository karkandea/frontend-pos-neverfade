import { useEffect, useState, type ReactNode } from "react";
import DemoAmbient from "./DemoAmbient";
import { Link, NavLink } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleHelp,
  LayoutGrid,
  Menu,
  X,
  LogIn,
  PlayCircle,
  Sparkles,
} from "lucide-react";

type DemoShellProps = { children: ReactNode; cinematic?: boolean };

function BrandMark() {
  return (
    <span className="nf-brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export default function DemoShell({ children, cinematic = false }: DemoShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    // POS intentionally locks document scroll. Marketing pages must scroll independently.
    document.documentElement.classList.add("nf-demo-marketing-active");
    document.body.classList.add("nf-demo-marketing-active");
    return () => {
      document.documentElement.classList.remove("nf-demo-marketing-active");
      document.body.classList.remove("nf-demo-marketing-active");
    };
  }, []);

  return (
    <main className={cinematic ? "demo-home demo-home--cinematic" : "demo-home"}>
      <aside className="demo-sidebar">
        <div className="demo-sidebar-brand">
          <BrandMark />
          <span><strong>NeverFade</strong><small>POS</small></span>
        </div>

        <button className="demo-mobile-menu" type="button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="demo-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}<span>Menu</span></button>
        <nav id="demo-navigation" className={menuOpen ? "demo-nav demo-nav--open" : "demo-nav"} aria-label="Demo navigation" onClick={() => setMenuOpen(false)}>
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
        {cinematic ? <DemoAmbient /> : null}
        <div className="demo-content">{children}</div>
      </section>
    </main>
  );
}
