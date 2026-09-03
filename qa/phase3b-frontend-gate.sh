#!/usr/bin/env bash
set -euo pipefail

BRANCH="feat/phase-3b-shared-device-attendance"

if [[ -n "${NF_PHASE3B_FRONTEND_REPO:-}" ]]; then
  REPO="$NF_PHASE3B_FRONTEND_REPO"
elif [[ -d "$HOME/neverfade-pos-frontend/.git" ]]; then
  REPO="$HOME/neverfade-pos-frontend"
elif [[ -d "$HOME/neverfade-phase3b/frontend/.git" ]]; then
  REPO="$HOME/neverfade-phase3b/frontend"
else
  printf '[FAIL] Frontend repo tidak ditemukan. Expected ~/neverfade-pos-frontend atau ~/neverfade-phase3b/frontend\n' >&2
  exit 1
fi

printf 'Using frontend repo: %s\n' "$REPO"

if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  git -C "$REPO" status --short
  printf '[FAIL] Frontend repo harus clean sebelum gate.\n' >&2
  exit 1
fi

git -C "$REPO" fetch origin "$BRANCH"
git -C "$REPO" switch "$BRANCH"
git -C "$REPO" pull --ff-only origin "$BRANCH"

WORKSPACE="$(dirname "$REPO")"
QA_DIR="$WORKSPACE/neverfade-pos-qa"
NF_PHASE3B_WORKSPACE="$WORKSPACE" \
NF_PHASE3B_FRONTEND_REPO="$REPO" \
NF_PHASE3B_QA_DIR="$QA_DIR" \
  bash "$REPO/qa/phase3b-vps-frontend-gate.sh"
