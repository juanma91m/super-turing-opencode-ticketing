#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: bash scripts/install.sh [options]

Stable distribution contract for the Ticketing addon.

Options:
  --target-dir <path>   Target OpenCode config dir (default: ~/.config/opencode)
  --dry-run             Show actions without writing files
  -h, --help            Show this help
EOF
  exit 0
fi

# Stable distribution contract. The addon keeps ownership of its internal
# installer and may change that implementation without changing callers.
bash "$SCRIPT_DIR/preflight.sh"
exec bash "$SCRIPT_DIR/install-opencode-ticketing.sh" "$@"
