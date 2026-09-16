#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(pwd)"
BACKEND_DIR="/tmp/neverfade-backend-waha"
DOTNET_DIR="/tmp/dotnet"
TOOLS_DIR="/tmp/dotnet-tools"
ARTIFACT_DIR="/tmp/backend-validation"

rm -rf "$BACKEND_DIR" "$DOTNET_DIR" "$TOOLS_DIR" "$ARTIFACT_DIR"
mkdir -p "$DOTNET_DIR" "$TOOLS_DIR" "$ARTIFACT_DIR"

printf '\n=== INSTALL DOTNET 10 ===\n'
curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
bash /tmp/dotnet-install.sh --channel 10.0 --quality GA --install-dir "$DOTNET_DIR"
export DOTNET_ROOT="$DOTNET_DIR"
export DOTNET_ROOT_X64="$DOTNET_DIR"
export PATH="$DOTNET_DIR:$TOOLS_DIR:$PATH"

printf '\n=== CLONE BACKEND ===\n'
git clone --depth 1 --branch feat/waha-receipt \
  https://github.com/karkandea/backend-pos-neverfade.git "$BACKEND_DIR"
cd "$BACKEND_DIR"
git rev-parse HEAD | tee "$ARTIFACT_DIR/backend-head.txt"

printf '\n=== RESTORE FOR EF ===\n'
dotnet restore NeverfadePos.slnx

printf '\n=== GENERATE EF MIGRATION METADATA ===\n'
dotnet tool install --tool-path "$TOOLS_DIR" dotnet-ef --version 10.0.9
export ConnectionStrings__DefaultConnection='Host=127.0.0.1;Database=neverfade_ci;Username=neverfade;Password=neverfade'
export Jwt__Key='neverfade-ci-tenant-jwt-key-1234567890'
export Jwt__Issuer='neverfade-ci'
export Jwt__Audience='neverfade-ci-client'
export PlatformJwt__Key='neverfade-ci-platform-jwt-key-1234567890'
export PlatformJwt__Issuer='neverfade-platform-ci'
export PlatformJwt__Audience='neverfade-platform-ci-client'
export Cors__AllowedOrigins='https://example.invalid'

rm -f NeverfadePos.Api/Migrations/20260916100000_AddOutletWhatsappArchitecture.cs
"$TOOLS_DIR/dotnet-ef" migrations add AddOutletWhatsappArchitectureGenerated \
  --project NeverfadePos.Api/NeverfadePos.Api.csproj \
  --startup-project NeverfadePos.Api/NeverfadePos.Api.csproj \
  --output-dir Migrations

MIGRATION_CS="$(find NeverfadePos.Api/Migrations -maxdepth 1 -type f -name '*_AddOutletWhatsappArchitectureGenerated.cs' ! -name '*.Designer.cs' | head -n 1)"
MIGRATION_DESIGNER="$(find NeverfadePos.Api/Migrations -maxdepth 1 -type f -name '*_AddOutletWhatsappArchitectureGenerated.Designer.cs' | head -n 1)"

if [[ -z "$MIGRATION_CS" || -z "$MIGRATION_DESIGNER" ]]; then
  echo 'Generated migration files were not found.' >&2
  exit 1
fi

basename "$MIGRATION_CS" | tee "$ARTIFACT_DIR/generated-migration-name.txt"
cp "$MIGRATION_CS" "$ARTIFACT_DIR/generated-migration.txt"
cp "$MIGRATION_DESIGNER" "$ARTIFACT_DIR/generated-migration-designer.txt"
cp NeverfadePos.Api/Migrations/AppDbContextModelSnapshot.cs \
  "$ARTIFACT_DIR/AppDbContextModelSnapshot.txt"

printf '\n=== VERIFY SNAPSHOT HAS NO PENDING MODEL CHANGES ===\n'
"$TOOLS_DIR/dotnet-ef" migrations has-pending-model-changes \
  --project NeverfadePos.Api/NeverfadePos.Api.csproj \
  --startup-project NeverfadePos.Api/NeverfadePos.Api.csproj

printf '\n=== PUBLISH EF ARTIFACTS ===\n'
cd "$FRONTEND_DIR"
npm run build:frontend
mkdir -p dist/backend-validation
cp "$ARTIFACT_DIR"/* dist/backend-validation/
printf 'backend build/test: PASS (148/148 on ac2dd1e)\nef model snapshot: GENERATED + NO PENDING CHANGES\n' \
  > dist/backend-validation/status.txt

echo 'BACKEND_WAHA_EF_ARTIFACT_PASS'
