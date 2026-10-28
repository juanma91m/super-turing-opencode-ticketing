from pathlib import Path
from contextlib import redirect_stdout
import importlib.util
import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class HandoffContractTests(unittest.TestCase):
    def test_skill_is_discoverable_and_activation_is_explicit(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        self.assertTrue(text.startswith('---\nname: workflow-ticket-handoff\n'))
        self.assertIn('proyecto y el pedido adoptan ese workflow', text)
        self.assertIn('cuentan como pedido explícito', text)
        self.assertIn('Un identificador aislado o un archivo viejo no activan handoff', text)
        self.assertIn('Si el handoff es requerido y falta o está incompleto', text)
        self.assertIn('Reglas base (con el workflow activo)', text)
        for required in ('Problema / Objetivo', 'Alcance', 'Estado actual',
                         'Causa / Hipótesis vigente', 'Solución propuesta', 'Validación esperada'):
            self.assertIn(required, text)

    def test_commands_are_explicit_only_where_project_admits_handoff(self):
        for name in ('ticket-plan', 'ticket-refresh', 'ticket-verdict', 'ticket-implement'):
            with self.subTest(command=name):
                text = (ROOT / 'commands' / f'{name}.md').read_text()
                self.assertIn('proyecto que admite handoff', text)
                self.assertIn('pedido explícito', text)
                self.assertRegex(text, r'ID aislado|identificador')

    def test_natural_activation_is_project_owned_not_a_global_default(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        for clause in ('Los comandos no son la única entrada', 'si la política local activa handoff',
                       'sin una segunda autorización', 'al cambiar el tipo de tarea',
                       'No imponer ese default a proyectos que no lo adoptan'):
            self.assertIn(clause, text)

    def test_draft_is_early_and_unknowns_are_not_fabricated(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        for clause in ('crear o actualizar un borrador mediante el helper aprobado',
                       'faltantes marcados como pendientes', 'No esperar a conocer toda la solución',
                       'borrador, listo o bloqueado', 'Mantenerlo por hitos',
                       'No reescribir por cada tool call'):
            self.assertIn(clause, text)

    def test_readiness_requires_persisted_reread_current_handoff(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        for clause in ('Antes de anunciar «listo para implementar»', 'releer el archivo real',
                       'ticket/path', 'secciones mínimas', 'alcance vigente',
                       'ausencia de bloqueos materiales sin resolver',
                       'no anunciarlo listo ni implementar desde ese estado',
                       'Memoria durable, respuesta de chat, promesa de escribir'):
            self.assertIn(clause, text)

    def test_exceptions_and_formal_review_stay_outside_implementation_handoff(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        for clause in ('Un identificador aislado o un archivo viejo no activan handoff',
                       'Respetar pedidos expresos sin archivos', 'señalar el conflicto antes de actuar',
                       'Si el proyecto solo habilita code review',
                       '`/ticket-code-review` conserva solo su flujo formal',
                       'tareas sin ticket o sin activación de handoff según la política local'):
            self.assertIn(clause, text)

    def test_command_closures_no_longer_only_promise_a_verdict(self):
        plan = (ROOT / 'commands/ticket-plan.md').read_text()
        self.assertNotIn('dejá encaminado', plan)
        self.assertIn('borrador temprano', plan)
        for name in ('ticket-plan', 'ticket-refresh', 'ticket-verdict'):
            text = (ROOT / 'commands' / f'{name}.md').read_text()
            self.assertIn('workflow-ticket-handoff', text)
            self.assertRegex(text, r'releer|Releer')
            self.assertRegex(text, r'path[/,] ?estado|path, estado')

    def test_optional_augment_has_lifecycle_and_preserves_other_owner_blocks(self):
        autonomy = module('ticketing_autonomy', ROOT / 'scripts/manage_agent_autonomy.py')
        source = '---\nmode: primary\npermission:\n  edit: deny\n---\nBase\n<!-- KNOWLEDGE_AUTONOMY_START -->\nknowledge unchanged\n<!-- KNOWLEDGE_AUTONOMY_END -->\n'
        with tempfile.TemporaryDirectory(prefix='handoff-augment-') as temp:
            path = Path(temp) / 'planner.md'
            path.write_text(source)
            autonomy.apply_to_agent(path, autonomy.AGENT_RULES['planner'])
            result = path.read_text()
            self.assertEqual(source.split('---', 2)[1], result.split('---', 2)[1])
            self.assertIn('knowledge unchanged', result)
            self.assertIn('borrador temprano', result)
            self.assertIn('Memoria durable y chat no lo reemplazan', result)
            autonomy.apply_to_agent(path, autonomy.AGENT_RULES['planner'])
            self.assertEqual(result, path.read_text())
            # Owner lifecycle refreshes existing blocks via remove/apply.
            autonomy.remove_from_agent(path)
            autonomy.apply_to_agent(path, autonomy.AGENT_RULES['planner'])
            self.assertEqual(result, path.read_text())
        self.assertIn('no implementes si falta', autonomy.AGENT_RULES['master-dev'])

    def test_claude_keeps_equivalent_lifecycle_and_shared_skill_when_available(self):
        claude = ROOT.parent / 'super-turing-claude-code'
        if not claude.is_dir():
            self.skipTest('Optional Claude source not available')
        skill = claude / 'addons/ticketing/skills/workflow-ticket-handoff/SKILL.md'
        self.assertTrue(skill.is_symlink())  # Candidate is validated at its Ticketing source, not by editing this link.
        role = (claude / 'base/agents/planner.md').read_text()
        for clause in ('política local', 'borrador temprano', 'actualizar y releer el verdict real',
                       'memoria/chat no lo reemplazan'):
            self.assertIn(clause, role)
        for name in ('ticket-plan', 'ticket-refresh', 'ticket-verdict'):
            text = (claude / 'addons/ticketing/commands' / f'{name}.md').read_text()
            self.assertIn('workflow-ticket-handoff', text)
            self.assertIn('releer', text)


class LocalHandoffFixtureTests(unittest.TestCase):
    def test_broker_writes_and_rereads_draft_updates_and_ready_without_network(self):
        core = ROOT.parent / 'opencode-stack/scripts/planner_shell.py'
        if not core.exists():
            self.skipTest('Optional Core broker not available')
        broker = module('handoff_broker', core)
        api = module('handoff_api', ROOT / 'scripts/jira_api_read.py')
        with tempfile.TemporaryDirectory(prefix='handoff-workspace-') as temp:
            root = Path(temp)
            config, project = root / 'config', root / 'project'
            (config / 'planner-helpers').mkdir(parents=True)
            (config / 'scripts').mkdir()
            project.mkdir()
            (config / 'planner-helpers/ticketing.json').write_bytes((ROOT / 'planner-helpers/ticketing.json').read_bytes())
            (config / 'scripts/jira_helper.sh').write_text('# trusted synthetic fixture\n')
            envfile = root / 'credentials.example'
            envfile.write_text('')
            app = project / 'app.txt'
            app.write_text('application unchanged')
            env = {'JIRA_ENV_FILE': str(envfile), 'JIRA_BASE_URL': 'https://jira.invalid',
                   'JIRA_EMAIL': 'fixture@example.invalid', 'JIRA_API_TOKEN': 'synthetic-not-a-secret'}
            headings = ('Problema / Objetivo', 'Alcance', 'Estado actual', 'Causa / Hipótesis vigente',
                        'Solución propuesta', 'Validación esperada')
            with patch.dict(os.environ, env), patch.object(api, 'repo_root', return_value=project), \
                 patch.object(api.urllib.request, 'urlopen', side_effect=AssertionError('Network forbidden')):
                for status in ('borrador: hipótesis pendiente', 'borrador: alcance actualizado', 'listo: alcance confirmado'):
                    content = '\n\n'.join('## ' + heading + '\n' + (status if heading == 'Estado actual' else 'Synthetic evidence') for heading in headings)
                    command, _ = broker.helper_command(['jira', 'verdict', 'TEST-101', '--content', content], project, config)
                    with redirect_stdout(io.StringIO()):
                        self.assertEqual(api.main(command[2:]), 0)
                    path = project / 'tmp/TEST-101/verdict.md'
                    self.assertEqual(path.read_text(), content + '\n')
                    self.assertEqual(app.read_text(), 'application unchanged')
                # Sandbox failure is an error, never a ready handoff or a write into application files.
                (project / 'tmp/TEST-101').rename(project / 'saved-ticket')
                (project / 'tmp/TEST-101').symlink_to(project, target_is_directory=True)
                command, _ = broker.helper_command(['jira', 'verdict', 'TEST-101', '--content', 'blocked'], project, config)
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(api.main(command[2:]), 1)
                self.assertFalse((project / 'verdict.md').exists())
                self.assertEqual(app.read_text(), 'application unchanged')


if __name__ == '__main__':
    unittest.main()
