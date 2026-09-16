export const ACTIVE_OUTLET_KEY = "nfpos_active_outlet";
export const OUTLET_CHANGED_EVENT = "nfpos-outlet-changed";

export type Outlet = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  isDefault: boolean;
  active: boolean;
};

export function getActiveOutletId() {
  return localStorage.getItem(ACTIVE_OUTLET_KEY) || "";
}

export function setActiveOutletId(outletId: string) {
  if (outletId) {
    localStorage.setItem(ACTIVE_OUTLET_KEY, outletId);
  } else {
    localStorage.removeItem(ACTIVE_OUTLET_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(OUTLET_CHANGED_EVENT, {
      detail: { outletId },
    })
  );
}

export function resolveActiveOutlet(
  outlets: Outlet[]
) {
  const activeOutlets = outlets.filter((outlet) => outlet.active);
  const savedId = getActiveOutletId();

  const saved = activeOutlets.find(
    (outlet) => outlet.id === savedId
  );

  if (saved) return saved;

  return (
    activeOutlets.find((outlet) => outlet.isDefault) ??
    activeOutlets[0] ??
    null
  );
}
