#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
DRY_RUN=0

MANAGED_FILES=()

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

load_managed_files() {
  mapfile -t MANAGED_FILES < <(
    python3 - "$SOURCE_DIR/STACK-MANIFEST.json" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
for item in data.get("managedFiles", []):
    print(item)
PY
  )
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

load_managed_files
for rel_path in "${MANAGED_FILES[@]}"; do
  src="$SOURCE_DIR/$rel_path"
  dst="$TARGET_DIR/$rel_path"
  run mkdir -p "$(dirname "$dst")"
  run cp "$src" "$dst"
done

if [[ "$DRY_RUN" -eq 0 ]]; then
  printf '[ticketing] install finished\n'
fi
