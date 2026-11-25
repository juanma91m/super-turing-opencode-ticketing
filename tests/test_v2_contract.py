import base64
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class V2ContractTests(unittest.TestCase):
    def test_preflight_emits_only_selected_metadata_not_unrelated_credentials(self):
        preflight = load('ticketing_preflight', ROOT / 'v2/preflight.py')
        configure = load('ticketing_preflight_config', ROOT / 'scripts/configure_ticketing.py')
        config = {'mcp': {'other': {'headers': {'Authorization': 'fixture-secret'}}}}
        configure.install(config, json.loads((ROOT / 'mcp/atlassian-rovo.json').read_text()))
        result = preflight.inspect(config)
        self.assertNotIn('fixture-secret', json.dumps(result))
        self.assertTrue(result['canonicalEndpoint'])
        self.assertTrue(result['canonicalOAuthRequest'])
        self.assertTrue(result['globallyHidden'])
        self.assertEqual(len(result['roleReads']['planner']), 4)
        self.assertEqual(len(result['roleReads']['code-reviewer']), 3)

    def test_allowlists_match_current_canonical_v1_configuration(self):
        current = load('ticketing_current', ROOT / 'scripts/configure_ticketing.py')
        contract = json.loads((ROOT / 'v2/rovo-tools.json').read_text())
        self.assertEqual(contract['planner'], list(current.PLANNER_READ_TOOLS))
        self.assertEqual(contract['code-reviewer'], list(current.CODE_REVIEWER_READ_TOOLS))
        self.assertEqual(set(contract), {'planner', 'code-reviewer'})

    def test_plan_is_pure_additive_and_keeps_existing_plan_build_and_knowledge(self):
        renderer = load('ticketing_assets', ROOT / 'v2/assets.py')
        template = '---\nmode: primary\npermission:\n  edit: deny\n  bash:\n    "*": deny\n---\nBASE\n<!-- KNOWLEDGE_AUTONOMY_START -->\nkeep knowledge\n<!-- KNOWLEDGE_AUTONOMY_END -->\n'
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / 'not-created/config'
            plan = renderer.plan({'config': str(target), 'agents': {name: template for name in ('plan', 'build', 'planner', 'master-dev', 'code-reviewer')}})
            self.assertFalse(target.exists())
            files = {item['path']: base64.b64decode(item['content_b64']).decode() for item in plan['assets']}
            self.assertEqual(files['agents/plan.md'], template)
            self.assertEqual(files['agents/build.md'], template)
            for role in ('planner', 'master-dev'):
                self.assertIn('keep knowledge', files[f'agents/{role}.md'])
                self.assertEqual(files[f'agents/{role}.md'].count('TICKETING_AUTONOMY_START'), 1)
            self.assertIn('  edit: deny', files['agents/planner.md'])
            self.assertIn('    "*": deny', files['agents/planner.md'])
            self.assertEqual(plan['commands'], 6)
            self.assertIn('scripts/jira_api_read.py', files)
            self.assertIn('planner-helpers/ticketing.json', files)

    def test_existing_rovo_rules_are_not_overridden_or_duplicated(self):
        renderer = load('ticketing_rule_preservation', ROOT / 'v2/assets.py')
        for rule in ('atlassian-rovo_getJiraIssue: deny', '"atlassian-rovo_*": deny'):
            original = '---\npermission:\n  ' + rule + '\n  edit: deny\n---\nKeep me\n'
            result = renderer.render_agent('planner', original)
            self.assertIn(rule, result)
            self.assertNotIn('atlassian-rovo_getJiraIssue: allow', result)
            self.assertIn('  edit: deny', result)
            self.assertIn('Keep me', result)

    def test_managed_renderer_wires_the_installed_helper_without_legacy_fallback(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            config = root / 'profile'
            rendered = subprocess.run([sys.executable, str(ROOT / 'v2/general-assets.py')],
                                      input=json.dumps({'config': str(config)}), text=True, capture_output=True,
                                      timeout=10, check=True)
            for asset in json.loads(rendered.stdout)['assets']:
                if asset['path'] in {'scripts/jira_helper.sh', 'scripts/jira_api_read.py'}:
                    destination = config / asset['path']
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(base64.b64decode(asset['content_b64']))
            helper = config / 'scripts/jira_helper.sh'
            result = subprocess.run(['bash', str(helper), 'context', 'TEST-101'], cwd=root,
                                    capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 1)
            self.assertIn('Jira project binding missing', json.loads(result.stdout)['error'])


if __name__ == '__main__':
    unittest.main()
