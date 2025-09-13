#!/usr/bin/env python3
"""Utility to create and optionally seed workspace directories."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def copy_templates(templates_dir: Path, destination: Path) -> None:
    """Copy files from ``templates_dir`` into ``destination``.

    Copies files recursively while preserving relative structure.
    Existing files are overwritten.
    """
    for item in templates_dir.rglob('*'):
        if item.is_file():
            target = destination / item.relative_to(templates_dir)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize a workspace directory")
    parser.add_argument("workspace_name", help="Name of the workspace to create")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Seed workspace with template files (from tools/templates by default)",
    )
    parser.add_argument(
        "--templates",
        type=Path,
        default=None,
        help="Path to template files (defaults to tools/templates)",
    )

    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    workspaces_dir = repo_root / "workspaces"
    workspaces_dir.mkdir(exist_ok=True)

    workspace_dir = workspaces_dir / args.workspace_name
    if workspace_dir.exists():
        print(f"Workspace '{args.workspace_name}' already exists: {workspace_dir}")
    else:
        workspace_dir.mkdir(parents=True)
        print(f"Created workspace directory: {workspace_dir}")

    if args.seed:
        templates_dir = args.templates or Path(__file__).resolve().parent / "templates"
        if templates_dir.exists():
            copy_templates(templates_dir, workspace_dir)
            print(f"Seeded workspace using templates from {templates_dir}")
        else:
            print(f"Template directory '{templates_dir}' not found; skipping seeding")


if __name__ == "__main__":
    main()
