import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getPlatformErrorMessage } from "../../lib/platformError";
import { usePlatformAuthStore } from "../../stores/platformAuth";

export default function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((state) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username, password);
      navigate("/platform/tenants", { replace: true });
    } catch (requestError: unknown) {
      setError(getPlatformErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="platform-login-page">
      <section className="platform-login-intro" aria-label="Neverfade Platform">
        <div className="platform-login-brand">
          <div className="logo-text-wrap">
            <span className="logo-never">NEVER</span>
            <span className="logo-fade">FADE.</span>
          </div>
          <span>Platform Console</span>
        </div>
        <div>
          <span className="platform-eyebrow">Tenant Control Plane</span>
          <h1>Kelola operasional tenant dengan batas akses yang jelas.</h1>
          <p>
            Area khusus administrator platform untuk provisioning dan lifecycle
            tenant. Session ini terpisah dari aplikasi POS.
          </p>
        </div>
        <small>Authorized platform personnel only</small>
      </section>

      <section className="platform-login-panel">
        <form className="platform-login-card" onSubmit={handleSubmit}>
          <div>
            <span className="platform-eyebrow">Super Admin</span>
            <h2>Masuk ke Platform</h2>
            <p>Gunakan kredensial PlatformUser Anda.</p>
          </div>

          <label className="platform-field" htmlFor="platform-username">
            <span>Username</span>
            <input
              id="platform-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              maxLength={100}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="platform-field" htmlFor="platform-password">
            <span>Password</span>
            <div className="platform-password-input">
              <input
                id="platform-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={100}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </label>

          <div className="platform-form-error" role="alert" aria-live="polite">
            {error}
          </div>

          <button
            type="submit"
            className="platform-button platform-button-primary"
            disabled={submitting}
          >
            {submitting ? "Memverifikasi..." : "Masuk ke Platform"}
          </button>
        </form>
      </section>
    </div>
  );
}
