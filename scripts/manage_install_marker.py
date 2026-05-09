#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage ticketing addon installation marker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    write_cmd = subparsers.add_parser("write")
    write_cmd.add_argument("--target-dir", required=True)
    write_cmd.add_argument("--repo-dir", required=True)
    write_cmd.add_argument("--augmented-agents", default="")

    remove_cmd = subparsers.add_parser("remove")
    remove_cmd.add_argument("--target-dir", required=True)

    return parser


def write_marker(args: argparse.Namespace) -> None:
    target_dir = Path(args.target_dir).expanduser()
    repo_dir = Path(args.repo_dir).expanduser()
    manifest = json.loads((repo_dir / "STACK-MANIFEST.json").read_text())
    marker_path = target_dir / ".opencode-ticketing-addon.json"
    data = {
        "addonId": manifest["name"],
        "version": manifest["version"],
        "installedAt": utc_now(),
        "augmentedAgents": [item for item in args.augmented_agents.split(",") if item],
    }
    marker_path.write_text(json.dumps(data, indent=2) + "\n")


def remove_marker(args: argparse.Namespace) -> None:
    marker_path = Path(args.target_dir).expanduser() / ".opencode-ticketing-addon.json"
    if marker_path.exists():
        marker_path.unlink()


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "write":
        write_marker(args)
    else:
        remove_marker(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
