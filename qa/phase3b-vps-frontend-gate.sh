#!/usr/bin/env bash
set -euo pipefail

BRANCH="feat/phase-3b-shared-device-attendance"
WORKSPACE="${NF_PHASE3B_WORKSPACE:-$HOME/neverfade-phase3b}"
REPO="$WORKSPACE/frontend"
QA_DIR="$WORKSPACE/neverfade-pos-qa"
PW_IMAGE="mcr.microsoft.com/playwright:v1.62.0-noble"
NPM_VOLUME="neverfade-phase3b-npm"

fail() {
  printf '\n[FAIL] %s\n' "$1" >&2
  exit 1
}

step() {
  printf '\n==> %s\n' "$1"
}

[[ -d "$REPO/.git" ]] || fail "Workspace frontend tidak ditemukan di $REPO"
command -v docker >/dev/null 2>&1 || fail "Docker tidak tersedia"
command -v git >/dev/null 2>&1 || fail "git tidak tersedia"

cd "$REPO"

step "Verify isolated frontend workspace is clean and current"
if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  fail "Workspace frontend harus clean"
fi

git fetch origin "$BRANCH"
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"
printf 'Frontend HEAD: %s\n' "$(git rev-parse HEAD)"
printf 'Remote HEAD  : %s\n' "$(git rev-parse "origin/$BRANCH")"

mkdir -p "$QA_DIR"
docker volume inspect "$NPM_VOLUME" >/dev/null 2>&1 || docker volume create "$NPM_VOLUME" >/dev/null

step "npm ci + build/typecheck + lint + full Playwright regression"
docker run --rm \
  --cpus=1 \
  --memory=3g \
  --shm-size=1g \
  -e CI=1 \
  -e PLAYWRIGHT_BASE_URL=http://127.0.0.1:5273 \
  -v "$NPM_VOLUME:/root/.npm" \
  -v "$WORKSPACE:/phase3b" \
  -w /phase3b/frontend \
  "$PW_IMAGE" bash -lc '
    set -euo pipefail

    npm ci
    npm run build
    npm run lint

    npm run dev -- --host 127.0.0.1 --port 5273 >/tmp/nf-phase3b-vite.log 2>&1 &
    vite_pid=$!
    trap "kill $vite_pid >/dev/null 2>&1 || true" EXIT

    ready=0
    for _ in $(seq 1 60); do
      if node -e "fetch(\"http://127.0.0.1:5273\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
        ready=1
        break
      fi
      sleep 1
    done

    if [[ $ready -ne 1 ]]; then
      cat /tmp/nf-phase3b-vite.log
      exit 1
    fi

    npx playwright test
  '

step "Verify frontend repository cleanliness"
if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  fail "Frontend gate changed tracked repository files"
fi

printf '\nFINAL PHASE 3B VPS FRONTEND GATE: PASS\n'
printf 'Frontend HEAD : %s\n' "$(git rev-parse HEAD)"
printf 'npm ci        : PASS\n'
printf 'Build/type    : PASS\n'
printf 'Lint          : PASS\n'
printf 'Playwright    : PASS\n'
printf 'Production    : NOT MODIFIED\n'
printf 'Supabase      : NOT USED\n'
