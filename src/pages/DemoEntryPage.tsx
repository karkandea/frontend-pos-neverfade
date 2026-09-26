import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { demoJourneys } from "../lib/demoJourney";
import { trackDemo } from "../lib/demoAnalytics";
import DemoShell from "../components/demo/DemoShell";
import "./DemoEntryPage.css";

export default function DemoEntryPage() {
  useEffect(() => {
    // The merchant POS globally locks page scrolling. Only the marketing demo
    // picker needs document scrolling on compact screens.
    document.documentElement.classList.add("nf-demo-picker-active");
    document.body.classList.add("nf-demo-picker-active");
    return () => {
      document.documentElement.classList.remove("nf-demo-picker-active");
      document.body.classList.remove("nf-demo-picker-active");
    };
  }, []);

  return (
    <DemoShell cinematic>
      <div className="nf-cinematic-picker">
        <header className="nf-cinematic-header">
          <span className="nf-cinematic-eyebrow">NEVERFADE POS · DEMO INTERAKTIF</span>
          <h1>Coba langsung POS untuk usahamu.</h1>
          <p>Lihat bagaimana NeverFade menghubungkan transaksi, operasional, dan laporan dalam satu sistem.</p>
          <div className="nf-cinematic-trust" aria-label="Tentang demo">
            <span><Check aria-hidden="true" /> Interaktif</span>
            <span><Check aria-hidden="true" /> Data simulasi</span>
            <span><ShieldCheck aria-hidden="true" /> Aman dicoba</span>
          </div>
        </header>

        <section className="nf-cinematic-panel" aria-label="Pilih jenis usaha">
          <div className="nf-cinematic-panel-head">
            <span>PILIH JENIS USAHA</span>
          </div>

          <div className="nf-cinematic-grid">
            {demoJourneys.map(({ slug, title, examples, benefit, icon, actions }) => (
              <Link
                key={slug}
                to={`/demo/business/${slug}`}
                className="nf-cinematic-card"
                aria-label={`Pilih demo ${title}`}
                onClick={() => trackDemo("category_selected", slug)}
              >
                <span className="nf-cinematic-card-header">
                  <span className="nf-cinematic-icon" aria-hidden="true">
                    <img
                      src={`/demo-icons/${icon}-idle.png`}
                      width="56"
                      height="56"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="nf-cinematic-card-title">
                    <strong>{title}</strong>
                    <small>{examples}</small>
                  </span>
                </span>

                <p className="nf-cinematic-benefit">{benefit}</p>
                <span className="nf-cinematic-features-label">YANG AKAN KAMU COBA</span>
                <ul className="nf-cinematic-features">
                  {actions.map((action) => (
                    <li key={action}><Check aria-hidden="true" />{action}</li>
                  ))}
                </ul>

                <span className="nf-cinematic-cta">
                  Coba Demo <ArrowRight size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="nf-cinematic-note">Tanpa registrasi · Data demo terpisah dari data merchant</p>
      </div>
    </DemoShell>
  );
}
