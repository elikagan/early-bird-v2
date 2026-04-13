#!/bin/bash
# QA Gate: Run before every deploy. Catches incomplete features.
# Usage: bash scripts/qa-gate.sh

set -e
cd "$(dirname "$0")/.."

WARNINGS=0
ERRORS=0

echo ""
echo "═══════════════════════════════════════"
echo "  QA GATE — Pre-Deploy Checks"
echo "═══════════════════════════════════════"
echo ""

# ── Build check ──
echo "→ Running build..."
if npm run build > /tmp/qa-gate-build.log 2>&1; then
  echo "  ✓ Build passes"
else
  echo "  ✗ BUILD FAILED"
  tail -20 /tmp/qa-gate-build.log
  ERRORS=$((ERRORS + 1))
fi

# ── Lint check ──
echo "→ Running lint..."
if npm run lint > /tmp/qa-gate-lint.log 2>&1; then
  echo "  ✓ Lint passes"
else
  echo "  ✗ LINT FAILED"
  tail -20 /tmp/qa-gate-lint.log
  ERRORS=$((ERRORS + 1))
fi

# ── Dead links ──
echo "→ Checking for dead links..."
DEAD_LINKS=$(grep -rn 'href="#"' src/ 2>/dev/null || true)
if [ -n "$DEAD_LINKS" ]; then
  echo "  ✗ DEAD LINKS FOUND:"
  echo "$DEAD_LINKS" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ No dead links"
fi

# ── Console.log ──
echo "→ Checking for console.log..."
LOGS=$(grep -rn 'console\.log' src/ --include='*.ts' --include='*.tsx' | grep -v 'sms\.ts' | grep -v 'node_modules' || true)
if [ -n "$LOGS" ]; then
  echo "  ✗ console.log FOUND:"
  echo "$LOGS" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ No console.log"
fi

# ── TODO / FIXME / HACK ──
echo "→ Checking for TODO/FIXME/HACK..."
TODOS=$(grep -rn 'TODO\|FIXME\|HACK' src/ --include='*.ts' --include='*.tsx' || true)
if [ -n "$TODOS" ]; then
  echo "  ⚠ UNRESOLVED TODOS:"
  echo "$TODOS" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ No TODOs"
fi

# ── Buttons without handlers ──
echo "→ Checking for buttons without onClick..."
# Finds <button that does NOT have onClick on the same line or the next few chars
ORPHAN_BUTTONS=$(grep -rn '<button' src/ --include='*.tsx' | grep -v 'onClick' | grep -v 'type="submit"' | grep -v 'disabled' || true)
if [ -n "$ORPHAN_BUTTONS" ]; then
  echo "  ⚠ BUTTONS WITHOUT onClick (verify these have handlers):"
  echo "$ORPHAN_BUTTONS" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ All buttons have handlers"
fi

# ── Links without href ──
echo "→ Checking for links without href..."
ORPHAN_LINKS=$(grep -rn '<a ' src/ --include='*.tsx' | grep -v 'href=' || true)
if [ -n "$ORPHAN_LINKS" ]; then
  echo "  ✗ LINKS WITHOUT href:"
  echo "$ORPHAN_LINKS" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ All links have href"
fi

# ── Unexplained readOnly ──
echo "→ Checking for unexplained readOnly..."
READONLY=$(grep -rn 'readOnly' src/ --include='*.tsx' | grep -v '// readOnly:' | grep -v '{/\*.*readOnly' || true)
if [ -n "$READONLY" ]; then
  echo "  ⚠ readOnly without explanation:"
  echo "$READONLY" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ All readOnly inputs explained"
fi

# ── fetch without error handling ──
echo "→ Checking for fetch without error handling..."
# This is a rough heuristic: lines with fetch() or apiFetch() that don't have try/catch nearby
BARE_FETCH=$(grep -rn 'await fetch\|await apiFetch' src/ --include='*.tsx' --include='*.ts' | grep -v 'try' | grep -v 'catch' | grep -v '.ok' || true)
if [ -n "$BARE_FETCH" ]; then
  echo "  ⚠ FETCH calls that may lack error handling (verify manually):"
  echo "$BARE_FETCH" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ Fetch calls appear to have error handling"
fi

# ── Images without alt ──
echo "→ Checking for images without alt text..."
NO_ALT=$(grep -rn '<img ' src/ --include='*.tsx' | grep -v 'alt=' || true)
if [ -n "$NO_ALT" ]; then
  echo "  ⚠ IMAGES WITHOUT alt text:"
  echo "$NO_ALT" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓ All images have alt text"
fi

# ── Summary ──
echo ""
echo "═══════════════════════════════════════"
if [ $ERRORS -gt 0 ]; then
  echo "  ✗ FAILED: $ERRORS error(s), $WARNINGS warning(s)"
  echo "  Fix errors before deploying."
  echo "═══════════════════════════════════════"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "  ⚠ PASSED WITH WARNINGS: $WARNINGS warning(s)"
  echo "  Review warnings before deploying."
  echo "═══════════════════════════════════════"
  exit 0
else
  echo "  ✓ ALL CHECKS PASSED"
  echo "═══════════════════════════════════════"
  exit 0
fi
