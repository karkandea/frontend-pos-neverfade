import {
  useEffect,
  useRef,
  useState,
} from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { drawChart } from "../lib/chart";

type Period =
  | "harian"
  | "mingguan"
  | "bulanan"
  | "tahunan";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
};

type ChartItem = {
  date: string;
  label: string;
  total: number;
};

type TopProduct = {
  nama: string;
  qty: number;
  revenue: number;
};

const periodLabels: Record<Period, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
  tahunan: "Tahunan",
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return "Terjadi kesalahan.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        title?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Terjadi kesalahan."
  );
}

export default function LaporanPage() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const [selectedPeriod, setSelectedPeriod] =
    useState<Period>("harian");

  const [appliedPeriod, setAppliedPeriod] =
    useState<Period>("harian");

  const [reloadKey, setReloadKey] =
    useState(0);

  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [chart, setChart] =
    useState<ChartItem[]>([]);

  const [topProducts, setTopProducts] =
    useState<TopProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const [
          summaryResponse,
          chartResponse,
          topProductsResponse,
        ] = await Promise.all([
          api.get<Summary>(
            "/api/laporan/summary",
            {
              params: {
                period: appliedPeriod,
              },
            }
          ),
          api.get<ChartItem[]>(
            "/api/laporan/chart"
          ),
          api.get<TopProduct[]>(
            "/api/laporan/top-products",
            {
              params: {
                period: appliedPeriod,
              },
            }
          ),
        ]);

        if (!active) {
          return;
        }

        setSummary(
          summaryResponse.data
        );

        setChart(
          chartResponse.data
        );

        setTopProducts(
          topProductsResponse.data
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError(
          getErrorMessage(error)
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [
    appliedPeriod,
    reloadKey,
  ]);

  useEffect(() => {
    function renderChart() {
      if (!canvasRef.current) {
        return;
      }

      drawChart(
        canvasRef.current,
        chart.map(
          (item) => item.label
        ),
        chart.map(
          (item) => item.total
        )
      );
    }

    renderChart();

    window.addEventListener(
      "resize",
      renderChart
    );

    return () => {
      window.removeEventListener(
        "resize",
        renderChart
      );
    };
  }, [chart]);

  function generate() {
    if (
      selectedPeriod ===
      appliedPeriod
    ) {
      setReloadKey(
        (value) => value + 1
      );

      return;
    }

    setAppliedPeriod(
      selectedPeriod
    );
  }

  return (
    <AppShell>
      <section
        id="sec-laporan"
        className="content-section active"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Laporan
            </h2>

            <p className="section-sub">
              Ringkasan dan analitik bisnis
            </p>
          </div>

          <div className="section-actions">
            <select
              id="laporan-period"
              value={selectedPeriod}
              onChange={(event) =>
                setSelectedPeriod(
                  event.target
                    .value as Period
                )
              }
            >
              <option value="harian">
                Harian
              </option>

              <option value="mingguan">
                Mingguan
              </option>

              <option value="bulanan">
                Bulanan
              </option>

              <option value="tahunan">
                Tahunan
              </option>
            </select>

            <button
              type="button"
              className="btn-primary"
              id="btn-generate-laporan"
              disabled={loading}
              onClick={generate}
            >
              {loading
                ? "Memuat..."
                : "Terapkan"}
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="table-card">
            <div className="table-empty">
              <p>{loadError}</p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setReloadKey(
                    (value) =>
                      value + 1
                  )
                }
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-bottom">
              <div className="dashboard-chart-card">
                <div className="card-header">
                  <div>
                    <h3>
                      Tren Penjualan 7 Hari
                    </h3>

                    <p>
                      Grafik ini selalu menampilkan 7 hari terakhir dan tidak mengikuti filter periode di atas.
                    </p>
                  </div>
                </div>

                <div className="chart-container">
                  <canvas
                    id="laporan-chart"
                    ref={canvasRef}
                  />
                </div>
              </div>

              <div className="dashboard-side">
                <div className="card-panel">
                  <div className="card-header">
                    <div>
                      <h3>
                        Ringkasan
                      </h3>
                      <p>
                        Periode: {periodLabels[appliedPeriod]}
                      </p>
                    </div>
                  </div>

                  <div id="laporan-summary">
                    {loading &&
                    !summary ? (
                      <p>
                        Memuat laporan...
                      </p>
                    ) : (
                      <>
                        <div className="summary-row">
                          <span>
                            Total Penjualan
                          </span>

                          <strong>
                            {rupiah(
                              summary
                                ?.omzet ??
                                0
                            )}
                          </strong>
                        </div>

                        <div className="summary-row">
                          <span>
                            Total Transaksi
                          </span>

                          <strong>
                            {summary
                              ?.transaksi ??
                              0}
                          </strong>
                        </div>

                        <div className="summary-row">
                          <span>
                            Rata-rata
                          </span>

                          <strong>
                            {rupiah(
                              summary?.avg ??
                                0
                            )}
                          </strong>
                        </div>

                        <div className="summary-row">
                          <span>
                            Pelanggan
                          </span>

                          <strong>
                            {summary
                              ?.pelanggan ??
                              0}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="table-card"
              id="laporan-top-products"
            >
              <div className="card-header">
                <div>
                  <h3>
                    Produk Terlaris
                  </h3>

                  <p>
                    Periode: {periodLabels[appliedPeriod]}
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading &&
                    topProducts.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center"
                        >
                          Memuat produk...
                        </td>
                      </tr>
                    ) : topProducts.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center"
                        >
                          Belum ada data.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map(
                        (product) => (
                          <tr
                            key={
                              product.nama
                            }
                          >
                            <td>
                              {
                                product.nama
                              }
                            </td>

                            <td>
                              {
                                product.qty
                              }
                            </td>

                            <td>
                              {rupiah(
                                product.revenue
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
