import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Attendance = {
  id: string;
  tanggal: string;
  namaKaryawan: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  keterangan: string;
};

export default function AbsensiPage() {
  const [items, setItems] =
    useState<Attendance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      try {
        const { data } =
          await api.get<Attendance[]>(
            "/api/absensi",
            {
              params: {
                search:
                  search || undefined,
              },
            }
          );

        if (!active) {
          return;
        }

        setItems(data);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, [search]);

  async function load() {
    setLoading(true);

    try {
      const { data } =
        await api.get<Attendance[]>(
          "/api/absensi",
          {
            params: {
              search:
                search || undefined,
            },
          }
        );

      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function checkIn() {
    await api.post(
      "/api/absensi/checkin"
    );

    await load();
  }

  async function checkOut() {
    await api.post(
      "/api/absensi/checkout"
    );

    await load();
  }

  return (
    <AppShell>
      <section className="content-section active">

        <div className="section-header">

          <div>
            <h2>Absensi</h2>

            <p>
              Kehadiran
              karyawan
            </p>
          </div>

          <div className="section-actions">

            <input
              type="text"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

            <button
              className="btn-secondary"
              onClick={checkIn}
            >
              Check In
            </button>

            <button
              className="btn-primary"
              onClick={checkOut}
            >
              Check Out
            </button>

          </div>
        </div>

        <div className="table-card">

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="data-table">

              <thead>
                <tr>
                  <th>
                    Tanggal
                  </th>

                  <th>
                    Karyawan
                  </th>

                  <th>
                    Check In
                  </th>

                  <th>
                    Check Out
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Keterangan
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center"
                    >
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.tanggal}</td>

                      <td>
                        {item.namaKaryawan}
                      </td>

                      <td>
                        {item.checkIn ?? "-"}
                      </td>

                      <td>
                        {item.checkOut ?? "-"}
                      </td>

                      <td>
                        {item.status}
                      </td>

                      <td>
                        {item.keterangan ||
                          "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          )}

        </div>

      </section>
    </AppShell>
  );
}
