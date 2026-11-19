#!/usr/bin/env python3
"""Read only selected configuration metadata, never OAuth stores or env files."""
import fnmatch
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def inspect(config):
    canonical = json.loads((ROOT / 'mcp/atlassian-rovo.json').read_text())['atlassian-rovo']
    roles = json.loads((ROOT / 'v2/rovo-tools.json').read_text())
    server = config.get('mcp', {}).get('atlassian-rovo')
    global_tools = config.get('tools', {})
    result = {'serverPresent': isinstance(server, dict), 'canonicalEndpoint': False,
              'canonicalOAuthRequest': False, 'enabled': False,
              'globallyHidden': global_tools.get('atlassian-rovo_*') is False, 'roleReads': {}}
    if isinstance(server, dict):
        result.update(canonicalEndpoint=server.get('url') == canonical['url'],
                      canonicalOAuthRequest=server.get('oauth') == canonical['oauth'],
                      enabled=server.get('enabled', True) is True)
        result['unsupportedServerFields'] = len(set(server) - {'type', 'url', 'enabled', 'oauth', 'timeout'})
    for actor, tools in roles.items():
        selected = config.get('agent', {}).get(actor, {}).get('tools', {})
        enabled = []
        for tool in tools:
            effect = True
            for rules in (global_tools, selected):
                for pattern, value in rules.items():
                    if fnmatch.fnmatchcase(tool, pattern):
                        effect = value
            if effect is True:
                enabled.append(tool)
        result['roleReads'][actor] = enabled
    return result


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or not Path(sys.argv[1]).is_absolute():
            raise ValueError('Select one absolute OpenCode config path')
        print(json.dumps(inspect(json.loads(Path(sys.argv[1]).read_text())), indent=2))
    except (ValueError, KeyError, TypeError, OSError):
        print('Ticketing preflight failed; configuration values suppressed', file=sys.stderr)
        raise SystemExit(2)
