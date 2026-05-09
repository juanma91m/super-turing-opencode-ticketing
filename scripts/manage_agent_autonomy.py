#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

OPTIONAL_AGENT_RULES = {
    "planner": """
## Ticketing autonomy (addon)
- si el proyecto usa workflow de tickets, respetá su handoff antes de inventar notas ad-hoc,
- si el proyecto usa el patrón `tmp/<ticket>/verdict.md`, usalo solo cuando esté explícitamente habilitado en el repo,
- si existen helpers o wrappers aprobados para Jira/tickets, podés usarlos; si no, no los asumas.
""".strip(),
    "master-dev": """
## Ticketing autonomy (addon)
- si el proyecto trae un handoff canónico de tickets, usalo como insumo primario antes de implementar,
- si el proyecto usa el patrón `tmp/<ticket>/result-dev.md`, escribilo solo cuando ese workflow esté habilitado,
- si existen helpers o wrappers aprobados para Jira/tickets, podés usarlos; si no, no los asumas.
""".strip(),
    "agent-design": """
## Ticketing autonomy (addon)
- si el proyecto usa scaffolding o templating específico, preferí los assets del addon antes de inventar estructuras nuevas,
- si el proyecto usa workflow de tickets, respetá sus artefactos y helpers solo cuando estén explícitamente habilitados,
- no promuevas rutas `tmp/` ni handoffs canónicos si el proyecto no usa ese flujo.
""".strip(),
}

MARKER_START = "<!-- TICKETING_AUTONOMY_START -->"
MARKER_END = "<!-- TICKETING_AUTONOMY_END -->"


def split_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---\n"):
        raise ValueError("Agent file without YAML frontmatter")
    second = text.find("\n---\n", 4)
    if second == -1:
        raise ValueError("Could not locate end of YAML frontmatter")
    frontmatter = text[4:second]
    body = text[second + 5 :]
    return "---\n", frontmatter, body


def patch_body(body: str, block: str) -> str:
    if MARKER_START in body:
        return body
    insertion = f"{MARKER_START}\n{block}\n{MARKER_END}\n\n"
    for anchor in ("Skills sugeridas:", "Skill sugerida:", "Entrega esperada:"):
        pos = body.find(anchor)
        if pos != -1:
            return body[:pos] + insertion + body[pos:]
    return body.rstrip() + "\n\n" + insertion


def unpatch_body(body: str) -> str:
    start = body.find(MARKER_START)
    if start == -1:
        return body
    end = body.find(MARKER_END, start)
    if end == -1:
        return body
    end += len(MARKER_END)
    while end < len(body) and body[end] in "\n\r":
        end += 1
    return body[:start] + body[end:]


def apply_to_agent(path: Path, block: str) -> None:
    text = path.read_text()
    prefix, frontmatter, body = split_frontmatter(text)
    body = patch_body(body, block)
    path.write_text(prefix + frontmatter + "\n---\n" + body)


def remove_from_agent(path: Path) -> None:
    text = path.read_text()
    prefix, frontmatter, body = split_frontmatter(text)
    body = unpatch_body(body)
    path.write_text(prefix + frontmatter + "\n---\n" + body)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Apply or remove ticketing autonomy on optional agents")
    subparsers = parser.add_subparsers(dest="command", required=True)

    apply_cmd = subparsers.add_parser("apply")
    apply_cmd.add_argument("--target-dir", required=True)

    remove_cmd = subparsers.add_parser("remove")
    remove_cmd.add_argument("--target-dir", required=True)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    target_dir = Path(args.target_dir).expanduser()
    agents_dir = target_dir / "agents"

    for agent_name, block in OPTIONAL_AGENT_RULES.items():
      path = agents_dir / f"{agent_name}.md"
      if not path.exists():
          continue
      if args.command == "apply":
          apply_to_agent(path, block)
      else:
          remove_from_agent(path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
