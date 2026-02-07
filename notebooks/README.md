# TechTideAI Notebooks

Jupyter notebooks for interactive exploration of the agentic system.

## Prerequisites

```bash
pip install jupyter requests
```

## Available Notebooks

| Notebook | Description |
|----------|-------------|
| `prompt-engineering-playground.ipynb` | Iterate on agent prompt templates |
| `memory-playground.ipynb` | Experiment with short-term and long-term memory |
| `tool-calling-playground.ipynb` | Test tool execution interactively |
| `evaluation-playground.ipynb` | Run evaluations and visualize results |

## Setup

1. Start the backend: `pnpm -C backend dev`
2. Launch Jupyter: `jupyter notebook notebooks/`
3. Each notebook has a setup cell to configure the API URL

## Configuration

All notebooks use the TechTideAI API running at `http://localhost:4050`.
Set the `API_URL` and `API_KEY` variables in the first cell of each notebook.
