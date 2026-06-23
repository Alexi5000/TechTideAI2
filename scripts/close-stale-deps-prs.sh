#!/usr/bin/env bash
#
# close-stale-deps-prs.sh — closes the stale dependabot PRs that pre-date a
# consolidated `build(deps): refresh all groups` PR.
#
# After this script runs, the consolidated PR is the canonical record.
#
# Usage:
#   SUPERSEDING_PR_NUMBER=43 ./scripts/close-stale-deps-prs.sh
#
# Optional env:
#   REPO=owner/name                 (default: Alexi5000/TechTideAI2)
#   LABEL=dependencies              (default: dependencies)
#   STATE=open                      (default: open)
#   AGE_DAYS=30                     (default: 30)
#
# Requires: gh CLI authenticated as a maintainer.

set -euo pipefail

REPO="${REPO:-Alexi5000/TechTideAI2}"
LABEL="${LABEL:-dependencies}"
STATE="${STATE:-open}"
AGE_DAYS="${AGE_DAYS:-30}"
SUPERSEDING_PR_NUMBER="${SUPERSEDING_PR_NUMBER:-}"

if [[ -z "${SUPERSEDING_PR_NUMBER}" ]]; then
  echo "Set SUPERSEDING_PR_NUMBER to the consolidated PR number before running."
  echo "Example: SUPERSEDING_PR_NUMBER=43 ./scripts/close-stale-deps-prs.sh"
  exit 1
fi

# Discover stale dependabot PRs from the API rather than hardcoding numbers.
# Filter: state=open, label=dependencies, older than AGE_DAYS days.
#
# gh pr list outputs one PR per line in the form:
#   <number>\t<title>\t...
# We grab the first column (the PR number) and pass each to close.
mapfile -t STALE_PRS < <(gh pr list \
  --repo "${REPO}" \
  --state "${STATE}" \
  --label "${LABEL}" \
  --json number,title,createdAt \
  --limit 100 \
  | jq -r --arg cutoff "$(date -u -d "-${AGE_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v -"${AGE_DAYS}"d +%Y-%m-%dT%H:%M:%SZ)" '.[] | select(.createdAt < $cutoff) | .number')

if [[ ${#STALE_PRS[@]} -eq 0 ]]; then
  echo "No stale dependabot PRs older than ${AGE_DAYS} days with label '${LABEL}'."
  exit 0
fi

echo "Found ${#STALE_PRS[@]} stale dependabot PR(s):"
for pr in "${STALE_PRS[@]}"; do
  echo "  - #${pr}"
done

for pr in "${STALE_PRS[@]}"; do
  echo "-> Closing PR #${pr} with supersede comment"
  gh pr comment "${pr}" --repo "${REPO}" --body "Superseded by #${SUPERSEDING_PR_NUMBER} (build(deps): refresh all groups). Closing to keep the queue clean. The bump history lives in the new PR." || echo "   (comment failed for #${pr}, continuing)"
  gh pr close "${pr}" --repo "${REPO}" --delete-branch=false || echo "   (already closed or close failed for #${pr})"
done

echo "Done. ${#STALE_PRS[@]} PR(s) closed. The canonical record is PR #${SUPERSEDING_PR_NUMBER}."
