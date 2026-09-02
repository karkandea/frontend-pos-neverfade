import { useEffect, useMemo, useState } from "react";
import { TOKEN_KEY } from "../../lib/api";
import {
  SHARED_SESSION_TOKEN_KEY,
  isSharedMode,
  lockSharedPosSession,
} from "../../lib/sharedPos";
import { useAuthStore } from "../../stores/auth";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export default function SharedPosActivityGuard() {
  const [active, setActive] = useState(() =>
    isSharedMode() &&
    Boolean(sessionStorage.getItem(SHARED_SESSION_TOKEN_KEY)) &&
    Boolean(sessionStorage.getItem(TOKEN_KEY))
  );

  const events = useMemo(
    () => ["pointerdown", "keydown", "touchstart"] as const,
    []
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    let timeout = window.setTimeout(() => void lockNow("idle"), IDLE_TIMEOUT_MS);

    function resetTimer() {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => void lockNow("idle"), IDLE_TIMEOUT_MS);
    }

    async function lockNow(reason: "idle" | "manual") {
      setActive(false);
      try {
        await lockSharedPosSession();
      } finally {
        useAuthStore.getState().logout();
        window.location.replace(`/shared-pos?reason=${reason}`);
      }
    }

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    window.addEventListener("shared-pos-lock-requested", resetTimer);

    return () => {
      window.clearTimeout(timeout);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      window.removeEventListener("shared-pos-lock-requested", resetTimer);
    };
  }, [active, events]);

  if (!active) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setActive(false);
        void lockSharedPosSession().finally(() => {
          useAuthStore.getState().logout();
          window.location.replace("/shared-pos?reason=manual");
        });
      }}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1200,
        border: 0,
        borderRadius: 999,
        padding: "10px 16px",
        background: "#101828",
        color: "white",
        fontWeight: 800,
        boxShadow: "0 10px 30px rgba(16,24,40,.22)",
        cursor: "pointer",
      }}
      aria-label="Kunci Shared POS"
    >
      Kunci POS
    </button>
  );
}
