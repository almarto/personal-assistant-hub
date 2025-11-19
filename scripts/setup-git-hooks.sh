#!/bin/bash
# Setup Git hooks for the project

echo "🔧 Setting up Git hooks..."

# Check if .git directory exists (simple check)
if [ ! -d ".git" ]; then
  echo "❌ Not in a Git repository. Skipping Git hooks setup."
  echo "ℹ️  You can run 'bun run setup-hooks' manually later."
  exit 0
fi

# Try to use git, but don't fail if it's not available
if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git command not available. Skipping Git hooks setup."
  echo "ℹ️  You can run 'bun run setup-hooks' manually later."
  exit 0
fi

# Get the Git hooks directory
GIT_HOOKS_DIR=".git/hooks"

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
echo "  - Type checking (pnpm run check-types)"
echo "  - Linting (pnpm run lint)"
echo "  - Formatting (pnpm run format)"
echo "  - Tests (pnpm run test)"
echo ""
echo "Commit messages will be validated for conventional commit format:"
echo "  <type>[optional scope]: <description>"
echo "  Example: feat: add user authentication"
echo ""
echo "To skip hooks temporarily, use: git commit --no-verify"