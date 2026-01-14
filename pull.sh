#!/bin/bash

# Script to pull all updates including submodules for Raspberry Pi
# Usage: ./pull.sh [branch] [--debug]
#   branch - optional branch name (default: current branch)
#   --debug - show git output (default: hidden)

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Parse arguments
DEBUG_MODE=false
TARGET_BRANCH=""

for arg in "$@"; do
    case $arg in
        --debug)
            DEBUG_MODE=true
            ;;
        *)
            if [ -z "$TARGET_BRANCH" ] && [[ ! "$arg" =~ ^-- ]]; then
                TARGET_BRANCH="$arg"
            fi
            ;;
    esac
done

# Helper function to run git commands with optional output suppression
run_git() {
    if [ "$DEBUG_MODE" = true ]; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

run_git_stdout() {
    if [ "$DEBUG_MODE" = true ]; then
        "$@"
    else
        "$@" 2>/dev/null
    fi
}

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Get branch from argument or use current branch
if [ -n "$TARGET_BRANCH" ]; then
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Checkout target branch if different from current
    if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
        echo -e "${CYAN}Switching from ${BOLD}$CURRENT_BRANCH${NC}${CYAN} to ${BOLD}$TARGET_BRANCH${NC}..."
        if ! run_git git checkout "$TARGET_BRANCH"; then
            echo -e "${YELLOW}Branch $TARGET_BRANCH doesn't exist locally, fetching...${NC}"
            run_git git fetch origin "$TARGET_BRANCH" || {
                echo -e "${RED}${BOLD}Branch $TARGET_BRANCH not found on remote${NC}"
                exit 1
            }
            run_git git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH" || {
                echo -e "${RED}${BOLD}Failed to checkout branch $TARGET_BRANCH${NC}"
                exit 1
            }
        fi
    fi
    CURRENT_BRANCH="$TARGET_BRANCH"
else
    # Use current branch if no argument provided
    CURRENT_BRANCH=$(git branch --show-current)
    if [ -z "$CURRENT_BRANCH" ]; then
        echo -e "${RED}${BOLD}Not on any branch. Please specify a branch: ./pull.sh <branch>${NC}"
        exit 1
    fi
fi

echo -e "${CYAN}${BOLD}Starting update process...${NC}"
echo -e "${BLUE}Target branch: ${BOLD}$CURRENT_BRANCH${NC}"

# Pull main repository
echo ""
echo -e "${CYAN}Pulling main repository (branch: $CURRENT_BRANCH)...${NC}"
BEFORE_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
if ! run_git git pull origin "$CURRENT_BRANCH"; then
    echo -e "${RED}${BOLD}Failed to pull main repository${NC}"
    exit 1
fi
AFTER_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ] && [ -n "$BEFORE_COMMIT" ]; then
    echo -e "${YELLOW}Main repository: already up to date${NC}"
else
    echo -e "${GREEN}Main repository updated${NC}"
fi

# Initialize and update submodules
echo ""
echo -e "${CYAN}Initializing submodules...${NC}"
run_git git submodule update --init --recursive

# Update each submodule to dev branch (or main if dev doesn't exist)
echo ""
echo -e "${CYAN}Updating submodules...${NC}"

# Function to update submodule
update_submodule() {
    local submodule_path=$1
    local submodule_name=$(basename "$submodule_path")
    local target_branch="dev"
    
    if [ ! -d "$submodule_path" ]; then
        echo -e "    ${YELLOW}Warning: $submodule_path not found${NC}"
        return
    fi
    
    echo -e "  ${MAGENTA}Updating $submodule_name...${NC}"
    cd "$submodule_path"
    
    # Fetch all branches
    run_git git fetch origin || true
    
    # Check if dev branch exists on remote
    if run_git_stdout git ls-remote --heads origin dev | grep -q dev; then
        target_branch="dev"
    elif run_git_stdout git ls-remote --heads origin main | grep -q main; then
        target_branch="main"
    else
        # Try to get default branch
        target_branch=$(run_git_stdout git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@' || echo "main")
    fi
    
    # Checkout target branch
    if git show-ref --verify --quiet refs/heads/"$target_branch" 2>/dev/null; then
        run_git git checkout "$target_branch"
    else
        run_git git checkout -b "$target_branch" "origin/$target_branch" || {
            echo -e "    ${YELLOW}Warning: Failed to checkout $target_branch in $submodule_name${NC}"
            cd "$SCRIPT_DIR"
            return
        }
    fi
    
    # Pull latest changes
    SUBMODULE_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "")
    if run_git git pull origin "$target_branch"; then
        SUBMODULE_AFTER=$(git rev-parse HEAD 2>/dev/null || echo "")
        if [ "$SUBMODULE_BEFORE" = "$SUBMODULE_AFTER" ] && [ -n "$SUBMODULE_BEFORE" ]; then
            echo -e "    ${YELLOW}$submodule_name: already up to date (branch: $target_branch)${NC}"
        else
            echo -e "    ${GREEN}$submodule_name updated (branch: $target_branch)${NC}"
        fi
    else
        echo -e "    ${YELLOW}Warning: Failed to pull $submodule_name${NC}"
    fi
    
    cd "$SCRIPT_DIR"
}

# Update each submodule
if [ -f .gitmodules ]; then
    while IFS= read -r line; do
        if [[ $line =~ ^[[:space:]]*path[[:space:]]*=[[:space:]]*(.+)$ ]]; then
            submodule_path="${BASH_REMATCH[1]}"
            update_submodule "$submodule_path"
        fi
    done < .gitmodules
fi

echo ""
echo -e "${GREEN}${BOLD}Update completed successfully!${NC}"
