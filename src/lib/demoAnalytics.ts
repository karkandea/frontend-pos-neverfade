import type { DemoBusinessSlug } from "./demoJourney";
import { findDemoJourney } from "./demoJourney";

type EventName =
  | "category_selected"
  | "demo_mode_selected"
  | "demo_started"
  | "scenario_step_completed"
  | "scenario_completed"
  | "conversion_cta_clicked";

type EventMode = "guided" | "free";
type EventStep =
  | "order_opened" | "item_added" | "sent_to_kitchen" | "kitchen_preparing" | "kitchen_ready"
  | "payment_completed" | "order_closed" | "work_order_created"
  | "laundry_processing" | "laundry_ready" | "laundry_completed"
  | "product_selected" | "sale_completed" | "result_viewed" | "pricing" | "contact" | "merchant_login";

const SESSION_KEY = "nfpos_demo_analytics_session";

function getSessionId(): string {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

/** First-party, anonymous, allowlisted events; no contact data or full URLs. */
export function trackDemo(
  eventName: EventName,
  slug: DemoBusinessSlug,
  mode?: EventMode,
  step?: EventStep,
): void {
  if (import.meta.env.VITE_DEMO_MODE !== "true") return;
  const businessType = findDemoJourney(slug)?.businessType;
  if (!businessType) return;

  const payload = JSON.stringify({
    sessionId: getSessionId(), businessType, eventName,
    mode: mode ?? null, step: step ?? null,
  });

  // Never block navigation or checkout on non-essential measurement.
  void fetch("/api/demo/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "omit",
  }).catch(() => {});
}
