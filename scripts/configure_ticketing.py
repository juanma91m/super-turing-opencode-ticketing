#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path


SERVER = "atlassian-rovo"
GLOBAL_TOOL_PATTERN = "atlassian-rovo_*"
PLANNER_READ_TOOLS = (
    "atlassian-rovo_search",
    "atlassian-rovo_fetch",
    "atlassian-rovo_getJiraIssue",
    "atlassian-rovo_getConfluencePage",
)


def load_json(path: Path) -> dict:
    if not path.exists():
        return {"$schema": "https://opencode.ai/config.json"}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def install(config: dict, fragment: dict) -> None:
    config.setdefault("mcp", {})[SERVER] = fragment[SERVER]
    config.setdefault("tools", {})[GLOBAL_TOOL_PATTERN] = False

    planner = config.setdefault("agent", {}).setdefault("planner", {})
    planner_tools = planner.setdefault("tools", {})
    for tool_name in PLANNER_READ_TOOLS:
        planner_tools[tool_name] = True


def uninstall(config: dict, fragment: dict) -> None:
    mcp = config.get("mcp")
    if isinstance(mcp, dict) and mcp.get(SERVER) == fragment.get(SERVER):
        mcp.pop(SERVER, None)
        if not mcp:
            config.pop("mcp", None)

    tools = config.get("tools")
    if isinstance(tools, dict) and tools.get(GLOBAL_TOOL_PATTERN) is False:
        tools.pop(GLOBAL_TOOL_PATTERN, None)
        if not tools:
            config.pop("tools", None)

    planner = (config.get("agent") or {}).get("planner")
    planner_tools = planner.get("tools") if isinstance(planner, dict) else None
    if isinstance(planner_tools, dict):
        for tool_name in PLANNER_READ_TOOLS:
            if planner_tools.get(tool_name) is True:
                planner_tools.pop(tool_name, None)
        if not planner_tools:
            planner.pop("tools", None)


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure Ticketing MCP and read-only tool exposure")
    parser.add_argument("command", choices=("install", "uninstall"))
    parser.add_argument("--config", required=True)
    parser.add_argument("--mcp-fragment", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config_path = Path(args.config).expanduser()
    fragment = load_json(Path(args.mcp_fragment).expanduser())
    config = load_json(config_path)

    if args.command == "install":
        install(config, fragment)
    else:
        uninstall(config, fragment)

    if args.dry_run:
        print(json.dumps({
            "serverConfigured": SERVER in config.get("mcp", {}),
            "globallyHidden": config.get("tools", {}).get(GLOBAL_TOOL_PATTERN) is False,
            "plannerReadTools": sorted(
                name
                for name in PLANNER_READ_TOOLS
                if ((config.get("agent", {}).get("planner", {}).get("tools", {})).get(name) is True)
            ),
        }, indent=2))
        return 0

    write_json(config_path, config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
