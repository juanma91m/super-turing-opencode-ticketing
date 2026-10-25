from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class HandoffContractTests(unittest.TestCase):
    def test_skill_is_discoverable_and_activation_is_explicit(self):
        text = (ROOT / 'skills/workflow-ticket-handoff/SKILL.md').read_text()
        self.assertTrue(text.startswith('---\nname: workflow-ticket-handoff\n'))
        self.assertIn('proyecto y el pedido adoptan ese workflow', text)
        self.assertIn('Un identificador, un comando o un archivo viejo no lo habilitan', text)
        self.assertIn('Si el handoff es requerido y falta o está incompleto', text)
        self.assertIn('Reglas base (con el workflow activo)', text)
        for required in ('Problema / Objetivo', 'Alcance', 'Estado actual',
                         'Causa / Hipótesis vigente', 'Solución propuesta', 'Validación esperada'):
            self.assertIn(required, text)

    def test_ticket_commands_do_not_enable_handoff_implicitly(self):
        for name in ('ticket-plan', 'ticket-refresh', 'ticket-verdict', 'ticket-implement'):
            with self.subTest(command=name):
                text = (ROOT / 'commands' / f'{name}.md').read_text()
                self.assertRegex(text, r'no habilita|ni habilitarlo')
                self.assertTrue('workflow local' in text or 'handoff local' in text
                                or 'si el proyecto no lo adopta' in text)


if __name__ == '__main__':
    unittest.main()
