#!/usr/bin/env bash
# Run lint/build checks for packages touched by staged files (or --all).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_FRONTEND=false
RUN_API=false

if [[ "${1:-}" == "--all" ]]; then
  RUN_FRONTEND=true
  RUN_API=true
else
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    case "$file" in
      frontend/*) RUN_FRONTEND=true ;;
      narrative-engine-api/*|supabase/*) RUN_API=true ;;
      .husky/*|package.json|scripts/pre-commit-checks.sh) RUN_FRONTEND=true; RUN_API=true ;;
    esac
  done < <(git -C "$ROOT" diff --cached --name-only --diff-filter=ACM)
fi

if ! $RUN_FRONTEND && ! $RUN_API; then
  exit 0
fi

if $RUN_FRONTEND; then
  echo "→ frontend: lint"
  (cd "$ROOT/frontend" && pnpm run lint)
  echo "→ frontend: build"
  (cd "$ROOT/frontend" && pnpm run build)
fi

if $RUN_API; then
  echo "→ narrative-engine-api: typecheck"
  (cd "$ROOT/narrative-engine-api" && npm run typecheck)
  echo "→ narrative-engine-api: build"
  (cd "$ROOT/narrative-engine-api" && npm run build)
fi

echo "✓ pre-commit checks passed"
