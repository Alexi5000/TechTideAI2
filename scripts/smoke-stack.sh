#!/usr/bin/env bash
# Smoke test for the docker-compose stack.
# Brings the stack up, curls /health on each service, tears down.
# Used by CI; also handy locally.

set -euo pipefail

COMPOSE="docker compose"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building backend image"
$COMPOSE build backend >/tmp/smoke-build.log 2>&1 || { tail -50 /tmp/smoke-build.log; exit 1; }

echo "==> Starting minimal stack (postgres, weaviate, backend, frontend)"
# --wait-timeout caps how long we wait for any container to become healthy.
# Weaviate's vector-module init can take 90s+ on cold boot in CI; we give
# the stack 5 minutes total to settle. The smoke curls below still probe
# the backend, which is the surface we actually care about.
if ! $COMPOSE up -d --wait --wait-timeout 300 postgres weaviate backend frontend; then
  echo "!! Compose up failed. Dumping container logs:"
  $COMPOSE ps
  $COMPOSE logs --no-color --tail=200 backend || true
  exit 1
fi

cleanup() {
  $COMPOSE down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Waiting 5s for services to settle"
sleep 5

echo "==> Curling /health on backend"
for i in 1 2 3 4 5; do
  if curl -fsS http://localhost:4050/health >/dev/null 2>&1; then
    echo "  backend OK"
    break
  fi
  sleep 2
done
curl -fsS http://localhost:4050/health | head -1
echo

echo "==> Curling /healthz on frontend"
curl -fsS http://localhost:5180/healthz | head -1
echo

echo "==> Curling /api/agents on backend (through frontend nginx proxy)"
curl -fsS http://localhost:5180/api/agents | head -c 200
echo

echo "==> Listing available eval suites"
curl -fsS http://localhost:5180/api/evals/suites | head -c 200
echo

echo "==> Smoke OK"
