#!/bin/bash
# Setup Git hooks for the project

set -e

echo "🔧 Setting up Git hooks..."

# Check if we're in a Git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Not in a Git repository. Please run 'git init' first."
  exit 1
fi

# Get the Git hooks directory
GIT_HOOKS_DIR=$(git rev-parse --git-dir)/hooks

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Copy our custom hooks
if [ -f ".githooks/pre-commit" ]; then
  cp .githooks/pre-commit "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ Pre-commit hook installed"
else
  echo "❌ Pre-commit hook not found in .githooks/"
  exit 1
fi

if [ -f ".githooks/commit-msg" ]; then
  cp .githooks/commit-msg "$GIT_HOOKS_DIR/commit-msg"
  chmod +x "$GIT_HOOKS_DIR/commit-msg"
  echo "✅ Commit-msg hook installed"
else
  echo "⚠️  Commit-msg hook not found in .githooks/"
fi

echo "🎉 Git hooks setup complete!"
echo ""
echo "The following checks will run before each commit:"
echo "  - Type checking (bun run check-types)"
echo "  - Linting (bun run lint)"
echo "  - Formatting (bun run format)"
echo "  - Tests (bun run test)"
echo ""
echo "Commit messages will be validated for conventional commit format:"
echo "  <type>[optional scope]: <description>"
echo "  Example: feat: add user authentication"
echo ""
echo "To skip hooks temporarily, use: git commit --no-verify"