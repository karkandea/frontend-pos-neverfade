import { useEffect, useState } from "react";
import api from "../../lib/api";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
};

type ChartItem = {
  label: string;
  total: number;
};

export function useDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartItem[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [sRes, cRes] = await Promise.all([
          api.get("/api/laporan/summary?period=bulanan"),
          api.get("/api/laporan/chart?period=bulanan"),
        ]);

        if (!alive) return;

        setSummary(sRes.data);
        setChart(cRes.data);
      } catch (e) {
        console.error(e);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return { summary, chart };
}
