#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# preview.sh — Run the Relay MCP welcome screen
#
# Works from any directory. Just run:
#   bash helium-api/mcp/preview.sh
# or, from inside mcp/:
#   bash preview.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  npm install
fi

exec npx ts-node src/welcome.ts
