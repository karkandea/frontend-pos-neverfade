import {
  type ChangeEvent,
  useEffect,
  useState,
} from "react";

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
  showTax: false,
  showPoint: true,
  defaultTax: 0,
  minStok: 5,
  poinRate: 1,
};

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

export default function PengaturanPage() {
  const [settings, setSettings] =
    useState<Settings>(emptySettings);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.get<Settings>(
          "/api/settings"
        );

      setSettings(response.data);
    } catch (error) {
      setLoadError(
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }

  function onChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
    >
  ) {
    const target = event.target;

    setSettings((current) => ({
      ...current,
      [target.name]:
        target.type === "checkbox"
          ? (
              target as HTMLInputElement
            ).checked
          : target.type === "number"
          ? Number(target.value)
          : target.value,
    }));
  }

  async function save() {
    if (!settings.namaToko.trim()) {
      window.alert(
        "Nama toko wajib diisi."
      );
      return;
    }

    if (
      settings.defaultTax < 0 ||
      settings.defaultTax > 100
    ) {
      window.alert(
        "Pajak default harus antara 0 sampai 100."
      );
      return;
    }

    if (settings.minStok < 0) {
      window.alert(
        "Minimum stok tidak boleh negatif."
      );
      return;
    }

    if (settings.poinRate < 0) {
      window.alert(
        "Rasio poin tidak boleh negatif."
      );
      return;
    }

    setSaving(true);

    try {
      await api.put(
        "/api/settings",
        settings
      );

      window.alert(
        "Pengaturan berhasil disimpan."
      );

      await load();
    } catch (error) {
      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="content-section active">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Pengaturan
            </h2>

            <p className="section-sub">
              Konfigurasi toko dan sistem
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={
              saving ||
              loading ||
              Boolean(loadError)
            }
            onClick={() => void save()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>

            {saving
              ? "Menyimpan..."
              : "Simpan"}
          </button>
        </div>

        {loading ? (
          <div className="card-panel">
            <div className="settings-form">
              <p>Memuat pengaturan...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="card-panel">
            <div className="settings-form">
              <p>{loadError}</p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => void load()}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-grid">
            <div className="card-panel">
              <div className="card-header">
                <h3>Informasi Toko</h3>
              </div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Nama Toko</label>

                  <input
                    type="text"
                    name="namaToko"
                    placeholder="Nama toko"
                    value={settings.namaToko}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Alamat</label>

                  <textarea
                    name="alamat"
                    rows={3}
                    placeholder="Alamat lengkap toko"
                    value={settings.alamat}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>No. Telepon</label>

                  <input
                    type="text"
                    name="telepon"
                    placeholder="08xxxxxxxxxx"
                    value={settings.telepon}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    placeholder="email@toko.com"
                    value={settings.email}
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Website</label>

                  <input
                    type="text"
                    name="website"
                    placeholder="www.tokoanda.com"
                    value={settings.website}
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="card-header">
                <h3>Pengaturan Struk</h3>
              </div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Header Struk</label>

                  <textarea
                    name="headerStruk"
                    rows={4}
                    placeholder="Teks pembuka struk"
                    value={
                      settings.headerStruk
                    }
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>Footer Struk</label>

                  <textarea
                    name="footerStruk"
                    rows={4}
                    placeholder="Teks penutup struk"
                    value={
                      settings.footerStruk
                    }
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="card-header">
                <h3>Pengaturan Sistem</h3>
              </div>

              <div className="settings-form">
                <div className="form-group">
                  <label>
                    Default Pajak (%)
                  </label>

                  <input
                    type="number"
                    name="defaultTax"
                    min={0}
                    max={100}
                    value={
                      settings.defaultTax
                    }
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Stok Minimum Alert
                  </label>

                  <input
                    type="number"
                    name="minStok"
                    min={0}
                    value={
                      settings.minStok
                    }
                    onChange={onChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Poin per Rp 1.000
                  </label>

                  <input
                    type="number"
                    name="poinRate"
                    min={0}
                    value={
                      settings.poinRate
                    }
                    onChange={onChange}
                  />
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="showTax"
                    checked={
                      settings.showTax
                    }
                    onChange={onChange}
                  />

                  <span className="checkbox-custom" />

                  <span>
                    Tampilkan pajak pada transaksi
                  </span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="showPoint"
                    checked={
                      settings.showPoint
                    }
                    onChange={onChange}
                  />

                  <span className="checkbox-custom" />

                  <span>
                    Aktifkan perhitungan poin
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
