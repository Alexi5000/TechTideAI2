"""Notebook bridge, re-export of the package module.

This file exists so notebooks can `import notebooks._bridge` and the
reviewer-facing notebook (the `.ipynb` exported via `scripts/convert-notebooks.py`)
gets a stable import path. The real implementation lives in
`agents/python/src/techtide_agents/notebook_bridge.py` so it sits inside the
`techtide_agents` package and is testable with pytest.

If you edit one, edit the other. The CI test
`agents/python/tests/test_notebook_bridge.py` covers the package module
directly.
"""

from techtide_agents.notebook_bridge import (  # noqa: F401, re-export
    EvalRun,
    EvalRunSummary,
    EvalSuiteSummary,
    EvalTaskResult,
    NotebookBridge,
    NotebookBridgeError,
    ScoringBreakdown,
)
