"""Global Jira wiring without credentials, network or project handoff."""
import copy
import fnmatch
import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("configure_ticketing", ROOT / "scripts/configure_ticketing.py")
wiring = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wiring)


class ReviewerJiraTests(unittest.TestCase):
    def setUp(self):
        self.config = {
            "agent": {"code-reviewer": {"tools": {"codegraph_*": True},
                                        "permission": {"edit": "deny", "bash": "deny"}}},
            "tools": {"unrelated_*": False},
        }
        self.fragment = {wiring.SERVER: {"type": "remote", "url": "https://example.invalid/mcp"}}

    def test_only_jira_reads_are_enabled_without_project_opt_in(self):
        wiring.install(self.config, self.fragment)
        tools = self.config["tools"] | self.config["agent"]["code-reviewer"]["tools"]

        def enabled(name):
            return next((value for pattern, value in reversed(list(tools.items()))
                         if fnmatch.fnmatchcase(name, pattern)), False)

        self.assertEqual(set(wiring.CODE_REVIEWER_READ_TOOLS), {
            "atlassian-rovo_getAccessibleAtlassianResources",
            "atlassian-rovo_search", "atlassian-rovo_getJiraIssue"})
        for name in wiring.CODE_REVIEWER_READ_TOOLS:
            self.assertTrue(enabled(name))
        for operation in ("createJiraIssue", "editJiraIssue", "addCommentToJiraIssue",
                          "transitionJiraIssue", "createConfluencePage", "getConfluenceContent",
                          "unknownFutureTool"):
            with self.subTest(operation=operation):
                self.assertFalse(enabled("atlassian-rovo_" + operation))
        self.assertTrue(enabled("codegraph_explore"))
        self.assertEqual(self.config["agent"]["code-reviewer"]["permission"],
                         {"edit": "deny", "bash": "deny"})

    def test_install_is_idempotent_and_uninstall_preserves_unrelated_settings(self):
        before = copy.deepcopy(self.config)
        wiring.install(self.config, self.fragment)
        installed = copy.deepcopy(self.config)
        wiring.install(self.config, self.fragment)
        self.assertEqual(self.config, installed)
        wiring.uninstall(self.config, self.fragment)
        self.assertEqual(self.config["agent"]["code-reviewer"], before["agent"]["code-reviewer"])
        self.assertEqual(self.config["tools"], before["tools"])

    def test_uninstall_preserves_explicit_local_tool_restriction(self):
        wiring.install(self.config, self.fragment)
        tools = self.config["agent"]["code-reviewer"]["tools"]
        tools["atlassian-rovo_getJiraIssue"] = False
        wiring.uninstall(self.config, self.fragment)
        self.assertIs(tools["atlassian-rovo_getJiraIssue"], False)


if __name__ == "__main__":
    unittest.main()
