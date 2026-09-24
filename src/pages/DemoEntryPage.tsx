import { useNavigate } from "react-router-dom";

import DemoShell from "../components/demo/DemoShell";
import "./DemoEntryPage.css";

type Category = {
  slug: string;
  label: string;
  description: string;
  icon: string;
};

const categories: Category[] = [
  { slug: "restaurant", label: "Restoran", description: "Restoran, kafe, dan warung", icon: "restaurant" },
  { slug: "retail", label: "Minimarket", description: "Toko dan minimarket", icon: "minimarket" },
  { slug: "fashion", label: "Fashion", description: "Butik dan distro", icon: "fashion" },
  { slug: "laundry", label: "Laundry", description: "Laundry kiloan dan express", icon: "laundry" },
  { slug: "salon", label: "Salon", description: "Layanan salon", icon: "salon" },
  { slug: "barbershop", label: "Barbershop", description: "Layanan barbershop", icon: "barbershop" },
];

export default function DemoEntryPage() {
  const navigate = useNavigate();

  return (
    <DemoShell>
      <header className="demo-page-header">
        <span className="demo-overline">NEVERFADE POS</span>
        <h1>Demo</h1>
        <p>Pilih jenis usaha untuk mencoba NeverFade POS.</p>
      </header>

      <section className="nf-category-section" aria-label="Pilih jenis usaha">
        <div className="nf-category-grid">
          {categories.map(({ slug, label, description, icon }) => (
            <button
              key={slug}
              type="button"
              className="nf-category-option"
              aria-label={description}
              onClick={() => navigate("/demo/business/" + slug)}
            >
              <span className="nf-category-art" aria-hidden="true">
                <img className="nf-category-icon nf-category-icon-idle" src={"/demo-icons/" + icon + "-idle.png"} alt="" width="82" height="82" />
                <img className="nf-category-icon nf-category-icon-active" src={"/demo-icons/" + icon + "-active.png"} alt="" width="82" height="82" />
              </span>
              <span className="nf-category-label">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </DemoShell>
  );
}
