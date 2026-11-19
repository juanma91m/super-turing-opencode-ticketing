#!/usr/bin/env python3
"""Pure additive asset renderer. No Jira connection, env loading or writes."""
import base64
import fnmatch
import importlib.util
import json
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ticketing_autonomy', ROOT / 'scripts/manage_agent_autonomy.py')
autonomy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(autonomy)
ROLE_TOOLS = json.loads((ROOT / 'v2/rovo-tools.json').read_text())


def render_agent(name, text):
    prefix, header, body = autonomy.split_frontmatter(text)
    if name in autonomy.AGENT_RULES:
        body = autonomy.patch_body(body, autonomy.AGENT_RULES[name])
    if name in ROLE_TOOLS:
        # Earlier additions never override a caller's existing Rovo-specific
        # rule. In particular don't duplicate YAML keys or defeat local denies.
        existing = re.findall(r'^\s+[\'"]?(atlassian-rovo_[^\'":\s]+)[\'"]?:', header, re.MULTILINE)
        additions = [tool for tool in ROLE_TOOLS[name] if not any(fnmatch.fnmatchcase(tool, pattern) for pattern in existing)]
        if additions:
            if not re.search(r'^permission:\s*$', header, re.MULTILINE):
                raise ValueError('Role permissions need explicit reconciliation')
            header = re.sub(r'^permission:\s*$', 'permission:\n' + '\n'.join('  ' + tool + ': allow' for tool in additions), header, count=1, flags=re.MULTILINE)
    return prefix + header + '\n---\n' + body


def plan(options):
    config = Path(options['config'])
    if not config.is_absolute():
        raise ValueError('Profile config must be absolute')
    bases = options.get('agents', {})
    agents = dict(bases)
    # Same fallback rule as V1 ensure_primary_agent_templates: do not replace
    # existing Knowledge/base plan/build definitions with Ticketing templates.
    for role in ('plan', 'build'):
        if role not in agents:
            agents[role] = (ROOT / 'agents' / f'{role}.md').read_text()
    files = []
    def add(relative, content, previous=None):
        if Path(relative).is_absolute() or '..' in Path(relative).parts:
            raise ValueError('Unsafe asset path')
        encode = lambda value: base64.b64encode(value.encode() if isinstance(value, str) else value).decode()
        entry = {'path': relative, 'content_b64': encode(content)}
        if previous is not None:
            entry['previous_b64'] = encode(previous)
        files.append(entry)
    def profile_text(text):
        text = text.replace('~/.config/opencode', str(config))
        if options.get('mock'):
            text = text.replace('model: openai/gpt-6.1-sol', 'model: workshop-mock/mock')
            text = re.sub(r'^variant: .+\n', '', text, flags=re.MULTILINE)
        return text
    for role, text in agents.items():
        add(f'agents/{role}.md', profile_text(render_agent(role, text)), bases.get(role))
    for relative in json.loads((ROOT / 'STACK-MANIFEST.json').read_text())['managedFiles']:
        if relative.startswith(('commands/', 'scripts/', 'planner-helpers/')):
            file = ROOT / relative
            if file.is_symlink() or not file.is_file():
                raise ValueError('Ticketing assets must be regular files')
            data = file.read_bytes()
            if file.suffix == '.md':
                data = profile_text(data.decode()).encode()
            add(relative, data)
    for skill in sorted((ROOT / 'skills').glob('*/SKILL.md')):
        if skill.parent.is_symlink():
            raise ValueError('Skill links require explicit review')
        for file in sorted(skill.parent.rglob('*')):
            if file.is_symlink():
                raise ValueError('Skill links require explicit review')
            if file.is_file():
                data = file.read_bytes()
                if file.suffix == '.md':
                    data = profile_text(data.decode()).encode()
                add(str(file.relative_to(ROOT)), data)
    add('scripts/ticketing_check.py', (ROOT / 'v2/check-helper.py').read_bytes())
    return {'assets': files, 'roles': sorted(agents), 'skills': ['workflow-ticket-handoff'], 'commands': 6}


if __name__ == '__main__':
    try:
        print(json.dumps(plan(json.load(sys.stdin))))
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f'Ticketing asset plan rejected: {error}', file=sys.stderr)
        raise SystemExit(2)
