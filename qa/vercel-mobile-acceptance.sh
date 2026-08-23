#!/usr/bin/env bash
set -euo pipefail

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "===== BUILD ====="
npm run build

echo "===== LINT ====="
npm run lint

echo "===== PLAYWRIGHT CHROMIUM ====="
npx playwright install chromium

echo "===== START CANDIDATE FRONTEND ====="
VITE_API_URL="http://127.0.0.1:9999" \
  npm run dev -- --host 127.0.0.1 --port 5273 --strictPort \
  > /tmp/neverfade-mobile-vite.log 2>&1 &
SERVER_PID=$!

for attempt in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:5273/login >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    cat /tmp/neverfade-mobile-vite.log
    exit 1
  fi
  sleep 1
done

echo "===== MOBILE BROWSER ACCEPTANCE ====="
RUN_PRODUCTION_MOBILE_AUDIT=1 npx playwright test \
  tests/e2e/mobile-production-audit.spec.ts \
  tests/e2e/mobile-login.spec.ts \
  tests/e2e/mobile-role-navigation.spec.ts \
  tests/e2e/mobile-landscape.spec.ts \
  tests/e2e/navigation-responsive.spec.ts \
  tests/e2e/qris-checkout.spec.ts \
  tests/e2e/mobile-ux.spec.ts \
  tests/e2e/mobile-candidate-visual.spec.ts \
  tests/e2e/finance-withdrawal.spec.ts \
  tests/e2e/platform-control-plane.spec.ts \
  tests/e2e/transaction-status-history.spec.ts \
  --project="Desktop Chromium" \
  --project="Mobile Chromium"

echo "===== PUBLISH EVIDENCE ====="
mkdir -p dist/mobile-evidence
if [ -d test-results/mobile-evidence ]; then
  cp -R test-results/mobile-evidence/. dist/mobile-evidence/
fi
if [ -d playwright-report ]; then
  cp -R playwright-report dist/mobile-evidence/playwright-report
fi
printf '%s\n' \
  "Candidate commit: ${VERCEL_GIT_COMMIT_SHA:-unknown}" \
  "Production baseline: https://neverfade-pos.vercel.app" \
  "Acceptance: PASS" \
  > dist/mobile-evidence/acceptance.txt

echo "Mobile acceptance PASS"
