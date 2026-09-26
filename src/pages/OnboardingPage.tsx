import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type SetupStep = {
  id: string;
  title: string;
  description: string;
  actionPath: string;
  required: boolean;
  complete: boolean;
};
type Setup = {
  tenantId: string;
  mode: "live" | "demo";
  businessType: string;
  completedRequired: number;
  totalRequired: number;
  requiredStepsComplete: boolean;
  steps: SetupStep[];
};

function errorText(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const body = (error as { response?: { data?: { message?: string } } }).response?.data;
    if (body?.message) return body.message;
  }
  return "Checklist belum dapat dimuat. Coba lagi.";
}

export default function OnboardingPage() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api.get<Setup>("/api/tenant/onboarding").then((response) => {
      if (active) { setSetup(response.data); setError(""); }
    }).catch((cause) => {
      if (active) setError(errorText(cause));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const response = await api.get<Setup>("/api/tenant/onboarding");
      setSetup(response.data);
      setError("");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="content-section active" aria-label="Checklist setup usaha">
        <div className="section-header">
          <div>
            <h1 className="section-title">Setup Usaha</h1>
            <p className="section-sub">Status diambil dari data yang tersimpan, bukan checklist yang ditandai manual.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Memuat..." : "Periksa Lagi"}
          </button>
        </div>
        {error ? <p role="alert" className="financial-validation-error">{error}</p> : null}
        {loading && !setup ? <p>Memuat setup usaha...</p> : null}
        {setup ? (
          <>
            <div className="table-card" style={{ padding: 20, marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>{setup.completedRequired} dari {setup.totalRequired} langkah wajib</h2>
              <p>{setup.requiredStepsComplete ? "Langkah setup dasar terisi." : "Lengkapi langkah wajib sebelum mulai operasional."}</p>
              <progress aria-label="Progres setup" value={setup.completedRequired} max={setup.totalRequired} style={{ width: "100%" }} />
              {setup.mode === "demo" ? (
                <p role="note">Ini tenant demo dengan data contoh. Status checklist bukan persetujuan rilis production; QRIS demo tetap nonaktif.</p>
              ) : (
                <p role="note">Checklist setup dasar bukan sertifikasi kesiapan production atau aktivasi payment gateway.</p>
              )}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {setup.steps.map((step) => (
                <article className="table-card" key={step.id} style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ fontSize: 17, margin: "0 0 5px" }}>{step.title}</h2>
                      <p style={{ margin: 0 }}>{step.description}</p>
                    </div>
                    <span className="status-badge">{step.complete ? "Selesai" : step.required ? "Perlu dilengkapi" : "Opsional"}</span>
                  </div>
                  {!step.complete && step.actionPath.startsWith("/") ? (
                    <Link className="btn-secondary" style={{ display: "inline-block", marginTop: 12 }} to={step.actionPath}>
                      Buka pengaturan
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
