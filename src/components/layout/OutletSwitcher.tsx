import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import {
  OUTLET_CHANGED_EVENT,
  resolveActiveOutlet,
  setActiveOutletId,
  type Outlet,
} from "../../lib/outlet";

export default function OutletSwitcher() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await api.get<Outlet[]>("/api/outlets");
      const active = response.data.filter((outlet) => outlet.active);
      const selected = resolveActiveOutlet(active);

      setOutlets(active);
      setSelectedId(selected?.id ?? "");

      if (selected) {
        setActiveOutletId(selected.id);
      }
    } catch {
      setOutlets([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleOutletChanged = (event: Event) => {
      const outletId = (event as CustomEvent<{ outletId?: string }>).detail?.outletId;
      if (outletId) {
        setSelectedId(outletId);
      }
    };

    window.addEventListener(OUTLET_CHANGED_EVENT, handleOutletChanged);
    return () => {
      window.removeEventListener(OUTLET_CHANGED_EVENT, handleOutletChanged);
    };
  }, []);

  if (loading || outlets.length === 0) {
    return null;
  }

  if (outlets.length === 1) {
    return (
      <div
        title="Outlet aktif"
        style={{
          fontSize: 12,
          padding: "6px 10px",
          border: "1px solid var(--border-color, #e5e7eb)",
          borderRadius: 8,
          whiteSpace: "nowrap",
        }}
      >
        {outlets[0].name}
      </div>
    );
  }

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span>Outlet</span>
      <select
        aria-label="Outlet aktif"
        value={selectedId}
        onChange={(event) => {
          const nextId = event.target.value;
          setSelectedId(nextId);
          setActiveOutletId(nextId);
        }}
        style={{
          minWidth: 130,
          maxWidth: 200,
          padding: "6px 8px",
          borderRadius: 8,
        }}
      >
        {outlets.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </select>
    </label>
  );
}
