"""Contract-sync test, guards against TS/Python drift.

Reads the drift-check hash embedded in both the TS and Python generated files
and asserts they match. The hash is produced by ``scripts/sync-contracts.ts``
from ``contracts/schema.json``.

Run:
    pytest tests/test_contract_sync.py -v
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
PY_GENERATED = REPO_ROOT / "agents" / "python" / "src" / "techtide_agents" / "contracts" / "generated.py"
TS_GENERATED = REPO_ROOT / "agents" / "src" / "runtime" / "contract-types.generated.ts"
SCHEMA = REPO_ROOT / "contracts" / "schema.json"


HASH_RE = re.compile(r"(?:#|//) Drift-check hash \(mirrored in (?:TypeScript|Python)\):\s*([0-9a-fA-F]+)")


def _read_hash(path: Path, marker_prefix: str) -> str:
    text = path.read_text(encoding="utf8")
    for line in text.splitlines():
        if marker_prefix in line:
            match = HASH_RE.search(line)
            if match:
                return match.group(1)
    raise AssertionError(f"hash marker not found in {path}")


@pytest.mark.skipif(not PY_GENERATED.exists(), reason="generated.py not present")
@pytest.mark.skipif(not TS_GENERATED.exists(), reason="contract-types.generated.ts not present")
def test_contracts_have_matching_drift_hashes() -> None:
    py_hash = _read_hash(PY_GENERATED, "mirrored in TypeScript")
    ts_hash = _read_hash(TS_GENERATED, "mirrored in Python")
    assert py_hash == ts_hash, (
        f"Drift detected: Python hash {py_hash} != TypeScript hash {ts_hash}. "
        f"Re-run `pnpm tsx scripts/sync-contracts.ts` from the repo root."
    )


@pytest.mark.skipif(not SCHEMA.exists(), reason="schema.json not present")
def test_schema_contains_required_definitions() -> None:
    import json

    schema = json.loads(SCHEMA.read_text(encoding="utf8"))
    required = {
        "LlmProvider",
        "AgentEventType",
        "AgentRunRequest",
        "AgentEvent",
        "AgentRunResult",
        "LlmRequest",
        "LlmResponse",
    }
    assert required.issubset(schema["definitions"].keys()), (
        f"schema is missing definitions: {required - set(schema['definitions'].keys())}"
    )


def test_python_models_match_schema_definitions() -> None:
    """Each schema definition should have a matching Python model."""
    import json

    if not SCHEMA.exists() or not PY_GENERATED.exists():
        pytest.skip("schema or generated file missing")

    _ = json.loads(SCHEMA.read_text(encoding="utf8"))
    py_text = PY_GENERATED.read_text(encoding="utf8")
    expected = {
        "LlmProvider",
        "AgentEventType",
        "AgentRunRequest",
        "AgentEvent",
        "AgentRunResult",
        "LlmRequest",
        "LlmResponse",
    }
    for name in expected:
        if name in {"LlmProvider", "AgentEventType"}:
            # Literal aliases, names must appear in the file.
            assert name in py_text, f"Python file missing type alias {name}"
        else:
            # Class definitions.
            assert f"class {name}(BaseModel)" in py_text, f"Python file missing class {name}"
