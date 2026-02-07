#!/usr/bin/env bash
# Pull in all submodules and then in main repo.
# Usage: ./scripts/pull.sh [git pull args...]
# Example: ./scripts/pull.sh
# Example: ./scripts/pull.sh --rebase

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

pull_repo() {
  local dir="$1"
  local name="${2:-$dir}"
  shift 2
  echo "==> Pulling $name"
  (cd "$dir" && if [ $# -eq 0 ]; then git pull origin "$(git branch --show-current)"; else git pull "$@"; fi)
}

# Submodules first
while IFS= read -r path; do
  [ -z "$path" ] && continue
  [ ! -d "$REPO_ROOT/$path" ] && continue
  pull_repo "$REPO_ROOT/$path" "$path" "$@"
done < <(git config --file .gitmodules --get-regexp path | awk '{ print $2 }')

# Main repo last
pull_repo "$REPO_ROOT" "main repo" "$@"

echo "Done."
