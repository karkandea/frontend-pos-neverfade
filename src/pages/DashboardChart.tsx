import { useEffect, useRef } from "react";
import api from "../lib/api";
import { drawChart } from "../lib/chart";

type ChartItem = {
  label: string;
  total: number;
};

export default function DashboardChart() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data: ChartItem[] = await api.get("/api/laporan/chart");

        if (!mounted) return;

        const labels = data.map((d) => d.label);
        const values = data.map((d) => d.total);

        if (ref.current) {
          drawChart(ref.current, labels, values);
        }
      } catch (e) {
        console.error("chart error", e);
      }
    }

    load();

    const onResize = () => {
      load();
    };

    window.addEventListener("resize", onResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas id="sales-chart" ref={ref} />;
}
