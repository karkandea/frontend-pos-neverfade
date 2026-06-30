import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(username, password);
      navigate("/produk", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
        err?.message ??
        "Login gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="page-login" className="page active">
      <div className="login-bg">
        <div className="login-grid-overlay"></div>
      </div>

      <div className="login-container">
        <div className="login-brand">
          <div className="logo-text-wrap">
            <span className="logo-never">NEVER</span>
            <span className="logo-fade">FADE.</span>
          </div>

          <div className="brand-tagline-login">
            Business Management Suite
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <h1>Selamat Datang</h1>
            <p>Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>

              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>

                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="toggle-password"
                  id="toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="checkbox-label">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />

                <span className="checkbox-custom"></span>

                Ingat saya
              </label>
            </div>

            <button
              id="btn-login"
              className="btn-primary btn-full"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading ? "Masuk..." : "Masuk"}
              </span>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>

            <div
              id="login-error"
              className={`login-error ${error ? "" : "hidden"}`}
            >
              {error}
            </div>
          </form>
        </div>

        <div className="login-footer">
          Demo: owner/owner123 · admin/admin123 · kasir/kasir123
        </div>
      </div>
    </div>
  );
}
