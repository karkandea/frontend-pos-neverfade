import { useEffect } from "react";
import api from "../../lib/api";

export function useDashboardExtras() {
  useEffect(() => {
    async function load() {
      try {
        const [topProducts, transactions] = await Promise.all([
          api.get("/api/laporan/top-products?period=bulanan"),
          api.get("/api/transactions"),
        ]);

        const tpEl = document.getElementById("top-products-list");
        if (tpEl) {
          tpEl.innerHTML = topProducts.data.length
            ? topProducts.data
                .slice(0, 5)
                .map(
                  (p: any, i: number) =>
                    `<div class="top-list-item">
                      <span class="top-list-rank">#${i + 1}</span>
                      <span class="top-list-name">${p.nama}</span>
                      <span class="top-list-val">${p.qty}x</span>
                    </div>`
                )
                .join("")
            : `<div class="empty-state-sm">Belum ada data</div>`;
        }

        const raEl = document.getElementById("recent-activity-list");
        if (raEl) {
          const acts = [...transactions.data]
            .sort(
              (a: any, b: any) =>
                new Date(b.tanggal).getTime() -
                new Date(a.tanggal).getTime()
            )
            .slice(0, 8);

          raEl.innerHTML = acts.length
            ? acts
                .map(
                  (t: any) =>
                    `<div class="activity-item">
                      <div class="activity-text">
                        Transaksi <b>${t.noTrx}</b> - ${t.total}
                      </div>
                    </div>`
                )
                .join("")
            : `<div class="empty-state-sm">Belum ada aktivitas</div>`;
        }
      } catch (e) {
        console.error("dashboard extras error", e);
      }
    }

    load();
  }, []);
}
