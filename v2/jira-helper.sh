#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_TICKETING_HELPER=managed-v2 exec python3 "$SCRIPT_DIR/jira_api_read.py" "$@"
