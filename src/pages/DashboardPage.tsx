import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import DashboardChart from "./DashboardChart";
import api from "../lib/api";
import { SkeletonCards, Skeleton } from "../components/common/Skeleton";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
};

type TopProduct = {
  nama: string;
  qty: number;
  revenue: number;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [summary, setSummary] =
    useState<Summary>({
      omzet: 0,
      transaksi: 0,
      avg: 0,
      pelanggan: 0,
    });

  const [topProducts, setTopProducts] =
    useState<TopProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const [summaryRes, topRes] =
          await Promise.all([
            api.get<Summary>(
              "/api/laporan/summary",
              {
                params: {
                  period: "harian",
                },
              }
            ),
            api.get<TopProduct[]>(
              "/api/laporan/top-products",
              {
                params: {
                  period: "harian",
                },
              }
            ),
          ]);

        if (!active) {
          return;
        }

        setSummary(summaryRes.data);
        setTopProducts(topRes.data);
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
  }, []);

  return (
    <AppShell>
      <section
        className="content-section active"
      >

        <div className="section-header">

          <div>
            <h2>Dashboard</h2>

            <p>
              Ringkasan bisnis
              hari ini
            </p>
          </div>

          <span className="status-badge">
            ● Online
          </span>

        </div>

        {loading ? (
          <SkeletonCards />
        ) : (
          <div className="stats-grid">

            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">
                  Omzet
                </div>

                <div className="stat-value">
                  {rupiah(summary.omzet)}
                </div>

                <div className="stat-delta">
                  Hari ini
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">
                  Transaksi
                </div>

                <div className="stat-value">
                  {summary.transaksi}
                </div>

                <div className="stat-delta">
                  Hari ini
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">
                  Avg Transaksi
                </div>

                <div className="stat-value">
                  {rupiah(summary.avg)}
                </div>

                <div className="stat-delta">
                  Per transaksi
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-label">
                  Pelanggan
                </div>

                <div className="stat-value">
                  {summary.pelanggan}
                </div>

                <div className="stat-delta">
                  Hari ini
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="dashboard-bottom">

          <div className="dashboard-chart-card">

            <div className="card-header">
              <h3>
                Penjualan
                7 Hari
              </h3>
            </div>

            <div className="chart-container">
              <DashboardChart />
            </div>

          </div>

          <div className="dashboard-side">

            <div className="card-panel">

              <div className="card-header">
                <h3>
                  Produk
                  Terlaris
                </h3>
              </div>

              <div className="top-list">
                {loading ? (
                <>
                  <Skeleton className="skeleton-table-row" />
                  <Skeleton className="skeleton-table-row" />
                  <Skeleton className="skeleton-table-row" />
                  <Skeleton className="skeleton-table-row" />
                </>
              ) : topProducts.length === 0 ? (
                  <div className="empty-state-sm">
                    Belum ada data
                  </div>
                ) : (
                  topProducts.map((item) => (
                    <div
                      key={item.nama}
                      className="top-list-item"
                    >
                      <div>
                        <div className="top-item-title">
                          {item.nama}
                        </div>

                        <div className="top-item-sub">
                          {item.qty} terjual
                        </div>
                      </div>

                      <div className="top-item-value">
                        {rupiah(item.revenue)}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="card-panel">

              <div className="card-header">
                <h3>
                  Aktivitas
                  Terbaru
                </h3>
              </div>

              <div className="activity-list">

                <div className="empty-state-sm">
                  Belum ada aktivitas
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>
    </AppShell>
  );
}
