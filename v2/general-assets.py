#!/usr/bin/env python3
"""Expose canonical non-agent assets and autonomy as data, never execute Jira."""
import importlib.util
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True
root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('ticketing_general_assets', root / 'assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    options = json.load(sys.stdin)
    data = module.plan({'config': options['config'], 'agents': {}, 'mock': options.get('mock', False)})
    data['assets'] = [entry for entry in data['assets'] if not entry['path'].startswith('agents/')]
    data['autonomy'] = module.autonomy.AGENT_RULES
    print(json.dumps(data))
except Exception:
    print('Native Ticketing asset plan rejected; values suppressed', file=sys.stderr)
    raise SystemExit(2)
