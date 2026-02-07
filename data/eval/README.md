# Evaluation Datasets

This directory contains evaluation datasets for testing agent quality.

## Format

Each dataset is a JSON file with the following structure:

```json
{
  "id": "unique-dataset-id",
  "name": "Human-readable name",
  "cases": [
    {
      "id": "unique-case-id",
      "agentId": "target-agent-id",
      "input": { "prompt": "Input text for the agent" },
      "expectedOutput": { "text": "Expected substring in output" },
      "tags": ["optional", "categorization"]
    }
  ],
  "createdAt": "ISO-8601 timestamp"
}
```

## Available Datasets

| File | Description | Cases |
|------|-------------|-------|
| `ceo-basic.json` | Basic CEO agent evaluation | 5 |
| `orchestrator-basic.json` | Basic orchestrator evaluation | 5 |

## Running Evaluations

```bash
# Via CLI
npx tsx scripts/evaluate-agent.ts --dataset data/eval/ceo-basic.json

# Via Make
make evaluate ARGS="--dataset data/eval/ceo-basic.json"
```

## Generating Datasets

```bash
npx tsx scripts/generate-eval-dataset.ts --agent ceo --output data/eval/ceo-generated.json
```
