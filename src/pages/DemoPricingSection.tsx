import { ArrowRight, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { demoPricingIsApproved, demoPricingPlans } from "../config/demoPricing";
import { getDemoPricingWhatsappUrl } from "../lib/demoSales";
import "./DemoPricingSection.css";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function DemoPricingSection() {
  return (
    <div className="demo-pricing-page">
      <header className="demo-page-header demo-pricing-header">
        <span className="demo-overline">NEVERFADE POS · HARGA</span>
        <h1>Pilih paket untuk usahamu.</h1>
        <p>Bandingkan pilihan paket NeverFade tanpa harus keluar dari pengalaman demo.</p>
        {!demoPricingIsApproved ? (
          <div className="demo-pricing-notice" role="note">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Daftar paket masih berupa template. Nama, fitur, dan harga belum menjadi penawaran resmi.</span>
          </div>
        ) : null}
      </header>

      <section className="demo-pricing-grid" aria-label="Pilihan paket NeverFade">
        {demoPricingPlans.map((plan) => {
          const published = plan.isFinal && plan.monthlyPrice !== null &&
            Number.isFinite(plan.monthlyPrice) && plan.monthlyPrice > 0;
          const whatsappUrl = getDemoPricingWhatsappUrl(plan.name);

          return (
            <article className="demo-pricing-card" key={plan.id}>
              <div className="demo-pricing-card-head">
                <span className="demo-pricing-plan-index">{plan.isFinal ? "PAKET" : "TEMPLATE PAKET"}</span>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="demo-pricing-amount" aria-label={published ? `Harga ${rupiah.format(plan.monthlyPrice!)}` : "Harga belum ditentukan"}>
                {published ? (
                  <><strong>{rupiah.format(plan.monthlyPrice!)}</strong><small>{plan.billingLabel}</small></>
                ) : (
                  <><strong>Rp —</strong><small>Harga belum final</small></>
                )}
              </div>

              <div className="demo-pricing-features">
                <span>YANG TERMASUK</span>
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={`${plan.id}-${index}`}>
                      <Check size={15} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="demo-pricing-card-actions">
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="demo-pricing-main-cta">
                    <MessageCircle size={16} aria-hidden="true" /> Tanya Paket <ArrowRight size={15} aria-hidden="true" />
                  </a>
                ) : (
                  <Link className="demo-pricing-main-cta" to="/demo">
                    Coba Demo <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <div className="demo-pricing-footer">
        <span>Masih ingin lihat cara kerjanya? Demo tersedia tanpa registrasi.</span>
        <Link to="/demo">Pilih jenis bisnis <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
