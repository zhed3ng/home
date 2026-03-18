#!/usr/bin/env bash
set -euo pipefail

# Scan source files for unresolved git conflict markers.
# Intentionally skip README to avoid matching documentation examples.

paths=(app components lib public scripts)

if rg -n "^(<<<<<<< |=======|>>>>>>> )" "${paths[@]}"; then
  echo "\n❌ Unresolved merge conflict markers found."
  exit 1
fi

echo "✅ No unresolved merge conflict markers found."
