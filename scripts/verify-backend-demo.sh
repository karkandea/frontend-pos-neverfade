#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(pwd)"
BACKEND_DIR="/tmp/neverfade-backend-demo"
DOTNET_DIR="/tmp/dotnet-demo"

rm -rf "$BACKEND_DIR" "$DOTNET_DIR"
mkdir -p "$DOTNET_DIR"

printf '\n=== INSTALL DOTNET 10 ===\n'
curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install-demo.sh
bash /tmp/dotnet-install-demo.sh --channel 10.0 --quality GA --install-dir "$DOTNET_DIR"
export DOTNET_ROOT="$DOTNET_DIR"
export DOTNET_ROOT_X64="$DOTNET_DIR"
export PATH="$DOTNET_DIR:$PATH"

printf '\n=== CLONE DEMO BACKEND ===\n'
git clone --depth 1 --branch feat/demo-mode \
  https://github.com/karkandea/backend-pos-neverfade.git "$BACKEND_DIR"
cd "$BACKEND_DIR"
printf 'BACKEND_HEAD='
git rev-parse HEAD

printf '\n=== RESTORE ===\n'
dotnet restore NeverfadePos.slnx

printf '\n=== BUILD ===\n'
dotnet build NeverfadePos.slnx --configuration Release --no-restore

printf '\n=== TEST ===\n'
dotnet test NeverfadePos.Api.Tests/NeverfadePos.Api.Tests.csproj \
  --configuration Release --no-build --logger "console;verbosity=normal"

printf '\n=== BUILD FRONTEND ARTIFACT ===\n'
cd "$FRONTEND_DIR"
npm run build:frontend
mkdir -p dist/backend-validation
printf 'demo backend restore/build/test: PASS\n' > dist/backend-validation/status.txt

echo 'BACKEND_DEMO_VALIDATION_PASS'
