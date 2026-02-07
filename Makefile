.PHONY: install build test lint dev clean run-agent evaluate populate-memory

# ─── Core Commands ───────────────────────────────────────

install:
	pnpm install

build:
	pnpm -r run build

test:
	pnpm test

lint:
	pnpm -r run lint

dev:
	pnpm -C backend dev & pnpm -C frontend dev

clean:
	pnpm -r exec -- rm -rf dist

# ─── Agent Operations ────────────────────────────────────

run-agent:
	npx tsx scripts/run-agent.ts $(ARGS)

evaluate:
	npx tsx scripts/evaluate-agent.ts $(ARGS)

populate-memory:
	npx tsx scripts/populate-memory.ts $(ARGS)

delete-memory:
	npx tsx scripts/delete-memory.ts $(ARGS)

generate-eval:
	npx tsx scripts/generate-eval-dataset.ts $(ARGS)

# ─── Docker ──────────────────────────────────────────────

docker-build:
	docker build -t techtideai .

docker-run:
	docker run --env-file .env -p 4050:4050 techtideai
