import { NavLink } from "react-router-dom";

import { useAuthStore } from "../../stores/auth";
import { useTenantContextStore } from "../../stores/tenantContext";
import { getDemoScope } from "../../lib/demoScope";

type Props = {
  onOpenMenu: () => void;
};

type NavItemProps = {
  to: string;
  label: string;
  icon: "cashier" | "transactions" | "dashboard" | "finance" | "table" | "kitchen" | "reports";
};

function NavIcon({ icon }: { icon: NavItemProps["icon"] }) {
  if (icon === "cashier") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h4M15 12h2M7 16h2m2 0h2m2 0h2" />
      </svg>
    );
  }

  if (icon === "table") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 18v2M17 18v2M3 10h18" />
      </svg>
    );
  }

  if (icon === "kitchen") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 3v18M9 3v8a4 4 0 0 1-4 4M15 3v6M19 3v6M15 6h4v15" />
      </svg>
    );
  }

  if (icon === "reports") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    );
  }

  if (icon === "transactions") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (icon === "finance") {
    return (
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M16 15h2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MobileNavItem({ to, label, icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? "mobile-nav-item active" : "mobile-nav-item"
      }
    >
      <NavIcon icon={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function MobileNav({ onOpenMenu }: Props) {
  const role = useAuthStore((state) => state.user?.role);
  const hasCapability = useTenantContextStore((state) => state.hasCapability);
  const canCorePos = hasCapability("core_pos");
  const canReports = hasCapability("reports");
  const canFinance = hasCapability("finance_withdrawal");
  const isDemo = useAuthStore((state) => state.isDemo);
  const demoScope = isDemo ? getDemoScope() : null;
  const restaurantPersona =
    demoScope?.businessSlug === "restaurant"
      ? demoScope.persona
      : null;

  if (restaurantPersona === "cashier") {
    return (
      <nav className="mobile-bottom-nav" aria-label="Navigasi cepat demo kasir">
        {canCorePos ? <MobileNavItem to="/kasir" label="Kasir" icon="cashier" /> : null}
        {hasCapability("table_orders") ? <MobileNavItem to="/meja" label="Meja" icon="table" /> : null}
        {canCorePos ? <MobileNavItem to="/transaksi" label="Transaksi" icon="transactions" /> : null}
        <button type="button" className="mobile-nav-item mobile-nav-more" onClick={onOpenMenu} aria-label="Buka menu lainnya">
          <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
          <span>Menu</span>
        </button>
      </nav>
    );
  }

  if (restaurantPersona === "kitchen") {
    return (
      <nav className="mobile-bottom-nav" aria-label="Navigasi cepat demo kitchen">
        {hasCapability("kitchen_queue") ? <MobileNavItem to="/dapur" label="Dapur" icon="kitchen" /> : null}
        <button type="button" className="mobile-nav-item mobile-nav-more" onClick={onOpenMenu} aria-label="Buka menu lainnya">
          <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
          <span>Menu</span>
        </button>
      </nav>
    );
  }

  if (restaurantPersona === "owner") {
    return (
      <nav className="mobile-bottom-nav" aria-label="Navigasi cepat demo owner">
        {canReports ? <MobileNavItem to="/dashboard" label="Dashboard" icon="dashboard" /> : null}
        {canReports ? <MobileNavItem to="/laporan" label="Laporan" icon="reports" /> : null}
        {canFinance ? <MobileNavItem to="/keuangan" label="Keuangan" icon="finance" /> : null}
        <button type="button" className="mobile-nav-item mobile-nav-more" onClick={onOpenMenu} aria-label="Buka menu lainnya">
          <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
          <span>Menu</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi cepat">
      {canCorePos ? (
        <>
          <MobileNavItem to="/kasir" label="Kasir" icon="cashier" />
          <MobileNavItem to="/transaksi" label="Transaksi" icon="transactions" />
        </>
      ) : null}

      {role === "owner" && canFinance ? (
        <MobileNavItem to="/keuangan" label="Keuangan" icon="finance" />
      ) : role === "admin" && canReports ? (
        <MobileNavItem to="/dashboard" label="Dashboard" icon="dashboard" />
      ) : null}

      <button
        type="button"
        className="mobile-nav-item mobile-nav-more"
        onClick={onOpenMenu}
        aria-label="Buka menu lainnya"
      >
        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
        <span>Menu</span>
      </button>
    </nav>
  );
}
