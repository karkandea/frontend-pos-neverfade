import { useEffect } from "react";
import api from "../../lib/api";

type TopProduct = {
  nama: string;
  qty: number;
  revenue: number;
};

type TransactionActivity = {
  noTrx: string;
  tanggal: string;
  total: number;
};

export function useDashboardExtras() {
  useEffect(() => {
    async function load() {
      try {
        const [topProducts, transactions] =
          await Promise.all([
            api.get<TopProduct[]>(
              "/api/laporan/top-products?period=bulanan"
            ),
            api.get<TransactionActivity[]>(
              "/api/transactions"
            ),
          ]);

        const tpEl =
          document.getElementById(
            "top-products-list"
          );

        if (tpEl) {
          tpEl.innerHTML =
            topProducts.data.length
              ? topProducts.data
                  .slice(0, 5)
                  .map(
                    (product, index) =>
                      `<div class="top-list-item">
                        <span class="top-list-rank">#${index + 1}</span>
                        <span class="top-list-name">${product.nama}</span>
                        <span class="top-list-val">${product.qty}x</span>
                      </div>`
                  )
                  .join("")
              : `<div class="empty-state-sm">Belum ada data</div>`;
        }

        const raEl =
          document.getElementById(
            "recent-activity-list"
          );

        if (raEl) {
          const activities = [
            ...transactions.data,
          ]
            .sort(
              (first, second) =>
                new Date(
                  second.tanggal
                ).getTime() -
                new Date(
                  first.tanggal
                ).getTime()
            )
            .slice(0, 8);

          raEl.innerHTML =
            activities.length
              ? activities
                  .map(
                    (transaction) =>
                      `<div class="activity-item">
                        <div class="activity-text">
                          Transaksi <b>${transaction.noTrx}</b> - ${transaction.total}
                        </div>
                      </div>`
                  )
                  .join("")
              : `<div class="empty-state-sm">Belum ada aktivitas</div>`;
        }
      } catch (error) {
        console.error(
          "dashboard extras error",
          error
        );
      }
    }

    void load();
  }, []);
}
