#!/usr/bin/env bash
# Run before git push to catch accidental secret commits.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

echo "Checking for staged secret files…"
STAGED="$(git diff --cached --name-only 2>/dev/null || true)"
if echo "$STAGED" | grep -qE '(^|/)\.env$|\.env\.local$|\.env\.[^/]+$'; then
  if echo "$STAGED" | grep -qv '\.env\.example$'; then
    echo "ERROR: Staged .env file detected (only .env.example should be committed):"
    echo "$STAGED" | grep -E '\.env' | grep -v '\.env\.example$' || true
    FAIL=1
  fi
fi

echo "Checking tracked files for common secret patterns…"
TRACKED="$(git ls-files)"
if echo "$TRACKED" | grep -qE '(^|/)\.env$'; then
  echo "ERROR: .env is tracked by git — run: git rm --cached <path>"
  FAIL=1
fi

# Scan staged + tracked text for leaked API key prefixes
SCAN_FILES="$( { echo "$STAGED"; echo "$TRACKED"; } | sort -u | grep -vE '\.(png|jpg|svg|otf|ttf|pdf|docx|woff|ico)$' | grep -v node_modules || true )"
if [[ -n "$SCAN_FILES" ]]; then
  while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    if grep -qE 'sk-proj-[A-Za-z0-9]|sk-ant-api|service_role.*eyJ' "$f" 2>/dev/null; then
      echo "ERROR: Possible API key in tracked/staged file: $f"
      FAIL=1
    fi
  done <<< "$SCAN_FILES"
fi

echo "Verifying node_modules are not tracked or staged…"
if git ls-files | grep -q node_modules; then
  echo "ERROR: node_modules files are tracked — run: git rm -r --cached '**/node_modules'"
  FAIL=1
fi
if echo "$STAGED" | grep -q node_modules; then
  echo "ERROR: node_modules staged for commit"
  FAIL=1
fi
NODE_COUNT=$(find . -name node_modules -type d -not -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
if [[ "$NODE_COUNT" -gt 0 ]]; then
  echo "Note: $NODE_COUNT node_modules folder(s) on disk are gitignored (IDE may still show ~10k files — that is normal)."
fi

echo "Verifying .env.example will be committed, .env will not…"
for envfile in narrative-engine-api/.env frontend/.env; do
  if [[ -f "$envfile" ]] && ! git check-ignore -q "$envfile"; then
    echo "ERROR: $envfile exists but is NOT gitignored"
    FAIL=1
  fi
done
for example in narrative-engine-api/.env.example frontend/.env.example; do
  if [[ -f "$example" ]] && git check-ignore -q "$example"; then
    echo "ERROR: $example is gitignored — devs need this committed"
    FAIL=1
  fi
done

if [[ $FAIL -eq 1 ]]; then
  echo ""
  echo "Fix issues above before pushing to GitHub."
  exit 1
fi

echo "OK — no obvious secrets staged for commit."
