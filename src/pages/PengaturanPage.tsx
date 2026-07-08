import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Settings = {
  namaToko: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  headerStruk: string;
  footerStruk: string;
  showTax: boolean;
  showPoint: boolean;
  defaultTax: number;
  minStok: number;
  poinRate: number;
};

const emptySettings: Settings = {
  namaToko: "",
  alamat: "",
  telepon: "",
  email: "",
  website: "",
  headerStruk: "",
  footerStruk: "",
  showTax: true,
  showPoint: true,
  defaultTax: 11,
  minStok: 5,
  poinRate: 10000,
};

export default function PengaturanPage() {
  const [settings, setSettings] =
    useState<Settings>(emptySettings);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const { data } = await api.get(
        "/api/settings"
      );

      setSettings(data);
    } finally {
      setLoading(false);
    }
  }

  function onChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >
  ) {
    const target = e.target;

    setSettings({
      ...settings,
      [target.name]:
        target.type === "checkbox"
          ? (target as HTMLInputElement)
              .checked
          : target.type === "number"
          ? Number(target.value)
          : target.value,
    });
  }

  async function save() {
    await api.put(
      "/api/settings",
      settings
    );

    alert("Pengaturan berhasil disimpan.");

    await load();
  }

  if (loading) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="content-section active">

        <div className="section-header">
          <div>
            <h2>Pengaturan</h2>

            <p>
              Konfigurasi aplikasi
            </p>
          </div>

          <div className="section-actions">
            <button
              className="btn-primary"
              onClick={save}
            >
              Simpan
            </button>
          </div>
        </div>

        <div className="card-panel">

          <h3>
            Informasi Toko
          </h3>

          <div className="form-grid-2">

            <div className="form-group">
              <label>
                Nama Toko
              </label>

              <input
                name="namaToko"
                value={
                  settings.namaToko
                }
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>
                Telepon
              </label>

              <input
                name="telepon"
                value={
                  settings.telepon
                }
                onChange={onChange}
              />
            </div>

            <div className="form-group span-2">
              <label>
                Alamat
              </label>

              <textarea
                name="alamat"
                value={
                  settings.alamat
                }
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>
                Email
              </label>

              <input
                name="email"
                value={
                  settings.email
                }
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>
                Website
              </label>

              <input
                name="website"
                value={
                  settings.website
                }
                onChange={onChange}
              />
            </div>
            <div className="form-group span-2">
              <label>
                Header Struk
              </label>

              <textarea
                name="headerStruk"
                value={settings.headerStruk}
                onChange={onChange}
              />
            </div>

            <div className="form-group span-2">
              <label>
                Footer Struk
              </label>

              <textarea
                name="footerStruk"
                value={settings.footerStruk}
                onChange={onChange}
              />
            </div>

          </div>
        </div>

        <div className="card-panel">

          <h3>
            Pengaturan Sistem
          </h3>

          <div className="form-grid-2">

            <div className="form-group">
              <label>
                Pajak Default (%)
              </label>

              <input
                type="number"
                name="defaultTax"
                value={settings.defaultTax}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>
                Minimum Stok
              </label>

              <input
                type="number"
                name="minStok"
                value={settings.minStok}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>
                Rasio Poin
              </label>

              <input
                type="number"
                name="poinRate"
                value={settings.poinRate}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="showTax"
                  checked={settings.showTax}
                  onChange={onChange}
                />

                Tampilkan Pajak
              </label>
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="showPoint"
                  checked={settings.showPoint}
                  onChange={onChange}
                />

                Aktifkan Poin
              </label>
            </div>

          </div>

        </div>

      </section>
    </AppShell>
  );
}
