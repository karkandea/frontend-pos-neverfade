import DemoShell from "../components/demo/DemoShell";
import DemoPricingSection from "./DemoPricingSection";
import DemoFeaturesContent from "./DemoFeaturesContent";
import "./DemoEntryPage.css";

type DemoInfoKind = "features" | "pricing" | "how-it-works" | "faq";

type DemoInfoPageProps = {
  kind: DemoInfoKind;
};

export default function DemoInfoPage({ kind }: DemoInfoPageProps) {
  return (
    <DemoShell cinematic={kind === "features"} ambient={kind !== "features"}>
      {kind === "features" ? <DemoFeaturesContent /> : null}

      {kind === "pricing" ? <DemoPricingSection /> : null}

      {kind === "how-it-works" ? (
        <>
          <header className="demo-page-header demo-info-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>Cara Kerja</h1>
            <p>Dari pilih jenis usaha sampai siap dipakai.</p>
          </header>
          <section className="demo-how-section demo-info-section">
            <div className="demo-steps">
              <div><span>01</span><strong>Pilih jenis usaha</strong><small>Demo menyesuaikan alur operasionalnya.</small></div>
              <div><span>02</span><strong>Coba langsung</strong><small>Jalankan kasir, operasional, dan laporan.</small></div>
              <div><span>03</span><strong>Mulai saat siap</strong><small>Setup akun merchant tanpa membawa data demo.</small></div>
            </div>
          </section>
        </>
      ) : null}

      {kind === "faq" ? (
        <>
          <header className="demo-page-header demo-info-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>FAQ</h1>
            <p>Hal yang paling sering ditanyakan soal demo NeverFade.</p>
          </header>
          <section className="demo-faq-section demo-info-section">
            <div className="demo-faq-copy">
              <p><strong>Apakah data demo masuk ke akun merchant?</strong><br />Tidak. Transaksi demo berjalan di lingkungan simulasi terpisah.</p>
              <p><strong>Perlu daftar dulu?</strong><br />Tidak. Pilih jenis usaha dan demo langsung bisa dicoba.</p>
            </div>
          </section>
        </>
      ) : null}
    </DemoShell>
  );
}
