import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth";

export default function DemoEntryPage() {
  const navigate = useNavigate();
  const enterDemo = useAuthStore((state) => state.enterDemo);
  const startedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    void enterDemo()
      .then(() => {
        navigate("/kasir", { replace: true });
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Demo NeverFade gagal dibuka."
        );
      });
  }, [enterDemo, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0f172a",
        color: "white",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <strong style={{ fontSize: 28 }}>NEVERFADE.</strong>
        <h1 style={{ marginTop: 24 }}>Menyiapkan demo POS…</h1>
        <p style={{ opacity: 0.72 }}>
          Anda akan langsung masuk ke toko retail contoh dengan data simulasi.
        </p>

        {error ? (
          <div role="alert" style={{ marginTop: 20 }}>
            <p>{error}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/login", { replace: true })}
            >
              Kembali ke Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
