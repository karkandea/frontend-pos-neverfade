#!/usr/bin/env bash

set +u

BACKEND="$HOME/neverfade-pos-backend"
FRONTEND="$HOME/neverfade-pos-frontend"
RESULT_DIR="$HOME/neverfade-pos-qa"
BACKEND_RESULT="$RESULT_DIR/transaction-result.env"

source "$BACKEND/qa/lib.sh"

FRONTEND_PID=""

cleanup() {
  qa_restore_terminal

  if [ -n "$FRONTEND_PID" ] &&
     kill -0 "$FRONTEND_PID" \
       >/dev/null 2>&1
  then
    kill "$FRONTEND_PID" \
      >/dev/null 2>&1 || true

    wait "$FRONTEND_PID" \
      >/dev/null 2>&1 || true
  fi

  qa_stop_backend
}

trap cleanup EXIT INT TERM

mkdir -p "$RESULT_DIR"

echo "=================================================="
echo "NEVERFADE POS — PLAYWRIGHT E2E"
echo "=================================================="

echo
echo "===== START BACKEND ====="

qa_start_backend || exit 1

echo
echo "===== OWNER CREDENTIAL ====="

QA_OWNER_USERNAME="owner"
QA_OWNER_PASSWORD="owner123"

export QA_OWNER_USERNAME
export QA_OWNER_PASSWORD

echo "[PASS] Using dummy testing owner automatically."

LOGIN_STATUS="$(
  curl \
    --silent \
    --show-error \
    --output "$RESULT_DIR/e2e-login-check.json" \
    --write-out "%{http_code}" \
    --request POST \
    --header "Content-Type: application/json" \
    --data "$(
      jq -n \
        --arg username "$QA_OWNER_USERNAME" \
        --arg password "$QA_OWNER_PASSWORD" \
        '{
          username:$username,
          password:$password
        }'
    )" \
    "http://127.0.0.1:5012/api/auth/login"
)"

if [ "$LOGIN_STATUS" != "200" ]; then
  echo "[FAIL] Owner login check — HTTP $LOGIN_STATUS"
  exit 1
fi

echo "[PASS] Owner credential verified."

QA_OWNER_TOKEN="$(
  jq -r '.token // empty'     "$RESULT_DIR/e2e-login-check.json"
)"

if [ -z "$QA_OWNER_TOKEN" ]; then
  echo "[FAIL] Owner token tidak ditemukan."
  exit 1
fi

echo
echo "===== CLEAN STALE E2E CUSTOMERS ====="

curl   --silent   --show-error   --header "Authorization: Bearer $QA_OWNER_TOKEN"   "http://127.0.0.1:5012/api/customers"   > "$RESULT_DIR/e2e-customers-before-run.json"

STALE_CUSTOMER_COUNT=0

while IFS= read -r CUSTOMER_ID; do
  if [ -z "$CUSTOMER_ID" ]; then
    continue
  fi

  DELETE_STATUS="$(
    curl       --silent       --show-error       --output /dev/null       --write-out "%{http_code}"       --request DELETE       --header "Authorization: Bearer $QA_OWNER_TOKEN"       "http://127.0.0.1:5012/api/customers/$CUSTOMER_ID"
  )"

  if [ "$DELETE_STATUS" = "200" ]; then
    STALE_CUSTOMER_COUNT=$(
      expr "$STALE_CUSTOMER_COUNT" + 1
    )
  else
    echo "[FAIL] Cleanup customer $CUSTOMER_ID — HTTP $DELETE_STATUS"
    exit 1
  fi
done <<CUSTOMERS
$(
  jq -r '
    .[] |
    select(
      (.email // "") |
      test("^e2e-[0-9]+@qa\\.local$")
    ) |
    .id
  ' "$RESULT_DIR/e2e-customers-before-run.json"
)
CUSTOMERS

echo "[PASS] Stale E2E customers removed: $STALE_CUSTOMER_COUNT"

if [ ! -f "$BACKEND_RESULT" ]; then
  echo "[FAIL] Missing $BACKEND_RESULT"
  exit 1
fi

TRX_RUN_ID="$(
  grep '^QA_RUN_ID=' \
    "$BACKEND_RESULT" |
  head -1 |
  cut -d= -f2-
)"

KNOWN_TRANSACTION_NO="$(
  grep \
    '^TRANSACTION_WITH_CUSTOMER_NO=' \
    "$BACKEND_RESULT" |
  head -1 |
  cut -d= -f2-
)"

export QA_E2E_PRODUCT_NAME="${TRX_RUN_ID}_Transaction_Product"
export QA_KNOWN_TRANSACTION_NO="$KNOWN_TRANSACTION_NO"

echo
echo "===== E2E FIXTURE ====="
echo "Product     : $QA_E2E_PRODUCT_NAME"
echo "Transaction : $QA_KNOWN_TRANSACTION_NO"

echo
echo "===== START FRONTEND ====="

if lsof -tiTCP:5273 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[FAIL] Port 5273 sudah digunakan proses lain."
  lsof -nP -iTCP:5273 -sTCP:LISTEN
  exit 1
fi

cd "$FRONTEND" || exit 1

VITE_API_URL="http://127.0.0.1:5012" \
npm run dev \
  -- \
  --host 127.0.0.1 \
  --port 5273 \
  --strictPort \
  > "$RESULT_DIR/frontend-e2e.log" \
  2>&1 &

FRONTEND_PID=$!

FRONTEND_READY=0

for ATTEMPT in $(seq 1 60); do
  STATUS="$(
    curl \
      --silent \
      --output /dev/null \
      --write-out "%{http_code}" \
      "http://127.0.0.1:5273/login" \
      2>/dev/null || true
  )"

  if [ "$STATUS" = "200" ]; then
    FRONTEND_READY=1
    break
  fi

  sleep 1
done

if [ "$FRONTEND_READY" -ne 1 ]; then
  echo "[FAIL] Frontend tidak siap."
  cat "$RESULT_DIR/frontend-e2e.log"
  exit 1
fi

echo "[PASS] Frontend siap."

echo
echo "===== RUN PLAYWRIGHT ====="

npx playwright test "$@"

E2E_EXIT=$?

echo
echo "===== RESULT LOCATIONS ====="
echo "JSON   : $RESULT_DIR/playwright-result.json"
echo "HTML   : $FRONTEND/playwright-report/index.html"
echo "Assets : $FRONTEND/test-results"
echo "Log    : $RESULT_DIR/frontend-e2e.log"

echo
echo "===== GIT STATUS ====="

git -C "$BACKEND" status --short --branch
git -C "$FRONTEND" status --short --branch

exit "$E2E_EXIT"
