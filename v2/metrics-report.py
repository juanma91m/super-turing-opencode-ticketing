#!/usr/bin/env python3
"""Compatible report CLI. Capture uses ticket-metrics in the native host, not V1."""
import argparse
import json
from pathlib import Path
import re
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('operation', choices=['report', 'capture'])
parser.add_argument('--ticket', required=True)
parser.add_argument('--project-root', default='.')
parser.add_argument('--json', action='store_true')
args, extra = parser.parse_known_args()
if args.operation == 'capture':
    parser.exit(2, 'V2 capture: use native tool ticket-metrics(operation=capture); no opencode export/DB fallback.\n')
if extra:
    parser.error('Unknown report options')
try:
    root = Path(args.project_root).resolve(strict=True)
    temporary = root / 'tmp'
    directory = (temporary / args.ticket.strip().upper() / 'metrics').absolute()
    if not directory.resolve().is_relative_to(temporary.resolve()):
        raise ValueError('Metrics must remain under project tmp')
    for candidate in (directory, *directory.parents):
        if candidate.is_symlink():
            raise ValueError('Metrics symlink refused')
    source = directory / 'summary.json'
    if source.is_symlink():
        raise ValueError('Metrics symlink refused')
    summary = json.loads(source.read_text())
    markdown = directory / 'summary.md'
    if markdown.is_symlink():
        raise ValueError('Metrics symlink refused')
    content = json.dumps(summary, indent=2, ensure_ascii=False) + '\n' if args.json or not markdown.exists() else markdown.read_text()
    if re.search(r'<\/?private\b|(?:password|bearer|api[_-]?key|access[_-]?token)\s*[=:]', content, re.I):
        raise ValueError('Sensitive metric metadata refused')
    print(content, end='')
except (OSError, ValueError):
    parser.exit(2, 'Metrics unavailable/unsafe; no capture, export or fallback performed.\n')
