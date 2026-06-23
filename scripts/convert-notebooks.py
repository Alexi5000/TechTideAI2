#!/usr/bin/env python3
"""
convert-notebooks.py — emit a sibling .py for every .ipynb in notebooks/.

The .ipynb is the authoring surface. The .py is the reviewable artifact.
A reviewer reading a PR should be able to read the .py without a Jupyter
kernel.

Behavior:
  - For every notebooks/*.ipynb, write notebooks/<basename>.py.
  - The .py strips `execution_count`, `metadata`, and `outputs`. It
    concatenates the source of every cell as comments + code blocks.
  - The first cell is treated as a module docstring.
  - Cells with source that is already valid Python are emitted as code;
    everything else is a comment block.

Usage:
  python scripts/convert-notebooks.py
  python scripts/convert-notebooks.py --check   # exit non-zero if any .py is stale
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS_DIR = REPO_ROOT / "notebooks"


def _is_python_source(source_lines: list[str]) -> bool:
    """Heuristic: a cell is 'code' if its first non-blank, non-comment
    line is not markdown (i.e. doesn't start with '# '). The notebook
    schema tells us cell_type, but we re-derive because the JSON often
    lies. The simplest reliable signal: a cell whose source doesn't begin
    with '# ' is code."""
    for line in source_lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Allow full-line Python comments but reject markdown headers / list items.
        if stripped.startswith("# "):
            continue
        return True
    return False


def convert_one(ipynb_path: Path) -> str:
    data = json.loads(ipynb_path.read_text(encoding="utf-8"))
    cells = data.get("cells", [])
    if not cells:
        return ""

    out: list[str] = []
    # First cell: docstring.
    first = cells[0]
    first_source = "".join(first.get("source", []))
    if first.get("cell_type") == "markdown" and first_source.strip():
        out.append('"""')
        out.append(first_source.strip())
        out.append('"""')
        out.append("")
        cells_iter = cells[1:]
    else:
        cells_iter = cells

    for cell in cells_iter:
        source = "".join(cell.get("source", []))
        if not source.strip():
            continue
        if _is_python_source(source.splitlines()):
            out.append(source)
        else:
            for line in source.splitlines():
                out.append(f"# {line}" if line else "#")
        out.append("")

    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit non-zero if any .py is stale (does not write).",
    )
    args = parser.parse_args()

    if not NOTEBOOKS_DIR.exists():
        print(f"notebooks dir not found: {NOTEBOOKS_DIR}", file=sys.stderr)
        return 1

    failures = 0
    ipynbs = sorted(NOTEBOOKS_DIR.glob("*.ipynb"))
    if not ipynbs:
        print("no notebooks found", file=sys.stderr)
        return 1

    for ipynb in ipynbs:
        try:
            generated = convert_one(ipynb)
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            print(f"!! failed to convert {ipynb.name}: {exc}", file=sys.stderr)
            failures += 1
            continue
        target = ipynb.with_suffix(".py")
        if args.check:
            existing = target.read_text(encoding="utf-8") if target.exists() else ""
            if existing != generated:
                print(f"!! {target.name} is stale; run scripts/convert-notebooks.py")
                failures += 1
        else:
            target.write_text(generated, encoding="utf-8")
            print(f"wrote {target}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
