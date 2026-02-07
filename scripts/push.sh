#!/usr/bin/env bash
# Push commits: first in each submodule (if any), then in main repo.
# Usage: ./scripts/push.sh [git push args...]
# Example: ./scripts/push.sh
# Example: ./scripts/push.sh --force-with-lease

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

push_repo() {
  local dir="$1"
  local name="${2:-$dir}"
  shift 2
  local ahead
  ahead=$(cd "$dir" && git rev-list --count "@{u}..HEAD" 2>/dev/null || echo "0")
  if [ "${ahead:-0}" -gt 0 ]; then
    echo "==> Pushing $name (${ahead} commit(s) ahead)"
    (cd "$dir" && git push "$@")
  else
    echo "==> $name: nothing to push (skip)"
  fi
}

# Submodules first
while IFS= read -r path; do
  [ -z "$path" ] && continue
  [ ! -d "$REPO_ROOT/$path" ] && continue
  push_repo "$REPO_ROOT/$path" "$path" "$@"
done < <(git config --file .gitmodules --get-regexp path | awk '{ print $2 }')

# Main repo last
push_repo "$REPO_ROOT" "main repo" "$@"

echo "Done."
