import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import api from "../lib/api";
import { drawChart, getChartPadding } from "../lib/chart";

type ChartItem = {
  date: string;
  label: string;
  total: number;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

export default function DashboardChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      try {
        const response = await api.get<ChartItem[]>("/api/laporan/chart");
        if (!mounted) return;

        const next = Array.isArray(response.data) ? response.data : [];
        setData(next);
        setActiveIndex(null);
        setError(false);
      } catch (loadError) {
        if (!mounted) return;
        console.error("chart error", loadError);
        setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      mounted = false;
    };
  }, []);

  const retry = async () => {
    setLoading(true);
    setError(false);

    try {
      const response = await api.get<ChartItem[]>("/api/laporan/chart");
      const next = Array.isArray(response.data) ? response.data : [];
      setData(next);
      setActiveIndex(null);
    } catch (loadError) {
      console.error("chart error", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const labels = useMemo(() => data.map((item) => item.label), [data]);
  const values = useMemo(() => data.map((item) => item.total), [data]);
  const selected =
    activeIndex != null && activeIndex >= 0 ? data[activeIndex] : undefined;
  const hasSales = values.some((value) => value > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || loading || error) return;

    const render = () => {
      drawChart(canvas, labels, values, { activeIndex });
    };

    render();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(render);
      observer.observe(wrap);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [activeIndex, error, labels, loading, values]);

  const selectFromPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const padding = getChartPadding(rect.width);
    const graphWidth = Math.max(rect.width - padding.left - padding.right, 1);
    const step = data.length > 1 ? graphWidth / (data.length - 1) : graphWidth;
    const x = Math.min(
      Math.max(event.clientX - rect.left - padding.left, 0),
      graphWidth,
    );
    const index = data.length > 1 ? Math.round(x / step) : 0;

    setActiveIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (data.length === 0) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max((current ?? data.length) - 1, 0));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.min((current ?? -1) + 1, data.length - 1));
    }

    if (event.key === "Escape") {
      setActiveIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="sales-chart-state sales-chart-loading" aria-label="Memuat grafik penjualan">
        <div className="sales-chart-loading-plot" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-chart-state">
        <strong>Grafik belum bisa dimuat</strong>
        <span>Coba muat ulang data penjualan.</span>
        <button type="button" className="sales-chart-retry" onClick={() => void retry()}>
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="sales-chart sales-chart-minimal" ref={wrapRef}>
      <div className="sales-chart-meta" aria-live="polite">
        {selected ? (
          <div className="sales-chart-value-chip">
            <span>{selected.label} · {shortDate(selected.date)}</span>
            <strong>{rupiah(selected.total)}</strong>
          </div>
        ) : (
          <span className="sales-chart-helper">Ketuk titik untuk melihat nominal</span>
        )}
      </div>

      <div className="sales-chart-plot">
        <canvas
          id="sales-chart"
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label="Grafik penjualan 7 hari. Ketuk titik atau gunakan tombol panah untuk melihat nominal harian."
          onPointerMove={selectFromPointer}
          onPointerDown={selectFromPointer}
          onPointerLeave={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
        />

        {!hasSales && (
          <div className="sales-chart-empty-note">
            Belum ada penjualan dalam 7 hari terakhir
          </div>
        )}
      </div>
    </div>
  );
}
