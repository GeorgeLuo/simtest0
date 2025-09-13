#!/usr/bin/env python3
"""Utility for storing memory records and ways."""

import argparse
import datetime as _dt
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
MEMORY_DIR = ROOT / "memory"
RECORDS_DIR = MEMORY_DIR / "records"
WAYS_DIR = MEMORY_DIR / "ways"


def _slugify(title: str) -> str:
    """Convert a title into snake_case suitable for filenames."""
    title = title.lower()
    title = re.sub(r"[^a-z0-9]+", "_", title)
    return title.strip("_")


def _write_entry(directory: pathlib.Path, title: str, content: str) -> pathlib.Path:
    timestamp = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{_slugify(title)}.md"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n{content}\n")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Store memory records or ways.")
    subparsers = parser.add_subparsers(dest="command")

    rec_parser = subparsers.add_parser("add-record", help="Add a memory record")
    rec_parser.add_argument("title")
    rec_parser.add_argument("content")

    way_parser = subparsers.add_parser("add-way", help="Add a memory way")
    way_parser.add_argument("title")
    way_parser.add_argument("content")

    args = parser.parse_args()

    if args.command == "add-record":
        path = _write_entry(RECORDS_DIR, args.title, args.content)
    elif args.command == "add-way":
        path = _write_entry(WAYS_DIR, args.title, args.content)
    else:
        parser.print_help()
        return

    print(f"Wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
