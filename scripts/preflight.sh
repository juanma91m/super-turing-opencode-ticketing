#!/usr/bin/env bash

set -euo pipefail

command -v python3 >/dev/null 2>&1 || {
  printf '[ticketing-addon][preflight] python3 is required\n' >&2
  exit 2
}

printf '[ticketing-addon][preflight] prerequisites OK\n'
