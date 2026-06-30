
import AppShell from "../components/layout/AppShell";



export default function PengaturanPage() {

  return (

    <AppShell>

      <section

        id="sec-pengaturan"

        className="content-section active"

      >

        <div className="section-header">

          <div>

            <h2 className="section-title">

              Pengaturan

            </h2>



            <p className="section-sub">

              Konfigurasi aplikasi

            </p>

          </div>



          <div className="section-actions">

            <button

              className="btn-primary"

              id="btn-save-settings"

            >

              Simpan

            </button>

          </div>

        </div>

        <div className="card-panel">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nama-toko">
                Nama Toko
              </label>

              <input
                id="nama-toko"
                type="text"
                placeholder="Nama toko"
              />
            </div>

            <div className="form-group">
              <label htmlFor="telepon-toko">
                Telepon
              </label>

              <input
                id="telepon-toko"
                type="text"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label htmlFor="alamat-toko">
                Alamat
              </label>

              <textarea
                id="alamat-toko"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="footer-struk">
                Footer Struk
              </label>

              <textarea
                id="footer-struk"
                rows={3}
              />
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
