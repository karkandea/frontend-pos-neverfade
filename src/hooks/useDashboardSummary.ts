import { useEffect, useState } from "react";
import api from "../lib/api";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
};

export function useDashboardSummary() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res: Summary = await api.get(
          "/api/laporan/summary?period=harian"
        );

        if (!mounted) return;

        setData(res);
      } catch (e) {
        console.error("summary error", e);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
