#!/usr/bin/env python3
"""Validate a declared Jira broker call without executing it or loading envs."""
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True

def check(command):
    broker = Path(__file__).resolve().parent / 'planner_shell.py'
    spec = importlib.util.spec_from_file_location('ticketing_broker', broker)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    argv = module.literal_argv(command)
    if argv == ['python3', str(broker), '--help']:
        module.check_invocation(command, Path.cwd())
        return
    if len(argv) < 5 or argv[:4] != ['python3', str(broker), 'helper', 'jira']:
        raise ValueError('Only the installed Jira broker route is allowed')
    module.check_invocation(command, Path.cwd())

if __name__ == '__main__':
    try:
        if sys.argv[1:] != ['--check-command']:
            raise ValueError('Use --check-command with a JSON stdin payload')
        check(json.load(sys.stdin)['command'])
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f'Ticketing shell blocked: {error}', file=sys.stderr)
        raise SystemExit(2)
