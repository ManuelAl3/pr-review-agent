---
phase: 04-fix-engine
plan: 01
subsystem: agents
tags: [fix-agent, filter-logic, snippet-matching, idempotency, reference-search]
dependency_graph:
  requires: [03-01]
  provides: [pendingFindings pipeline, snippet extraction, reference search]
  affects: [agents/pr-fixer.md]
tech_stack:
  added: []
  patterns: [filter AND logic, idempotency pre-loop filter, snippet-based code location, whitespace-normalized fallback, targeted reference search]
key_files:
  created: []
  modified:
    - agents/pr-fixer.md
decisions:
  - "pendingFindings variable is the canonical pipeline output from Step 1 to Step 3 — only unresolved, filtered findings enter the fix loop"
  - "Snippet extraction uses split(' → ')[0] for current and .at(-1) for expected to handle embedded arrow characters in code"
  - "Whitespace normalization is only for detection — Edit tool always receives original (non-normalized) strings from file"
  - "Reference search depth limited to same directory then parent directory — no exhaustive codebase scan (D-20)"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 1
---

# Phase 04 Plan 01: Fix Engine — Filter Logic, Snippet Matching, and Reference Search Summary

**One-liner:** Enhanced pr-fixer.md Steps 1 and 2 with filter AND logic, idempotency pre-loop exclusion, deterministic snippet extraction with whitespace-normalized fallback, and category-targeted reference implementation search.

## What Was Built

Updated `agents/pr-fixer.md` with two surgical enhancements to Steps 1 and 2:

**Step 1 (load_findings):** Replaced the simple filter bullet list with a structured 6-step filter processing algorithm implementing all locked decisions from D-08 through D-15:
- `--only N` override selects finding at 1-based index exclusively (D-14)
- AND filter logic chains `--severity X` and `--category X` filters (D-13)
- No-flags behavior defaults to all findings, same as `--all` (D-15)
- Idempotency filter removes resolved findings via `(f.status ?? 'pending') !== 'resolved'` (D-08, D-10)
- Early exit prints "Nothing to fix — all findings already resolved." when `pendingFindings` is empty (D-09)
- Bottom-up sort within each file group by line descending for multi-finding files (D-12)
- Summary print updated to show resolved count alongside total

**Step 2 (analyze_before_fix):** Replaced the generic "Locate the issue" and "Study existing patterns" bullets with two subsections:

Snippet-based code location (D-03 through D-06):
- Extracts `currentCode` via `snippet.split(' → ')[0]`
- Extracts `expectedCode` via `snippet.split(' → ').at(-1)` — handles embedded `→` in code
- Tries exact substring match first
- Falls back to whitespace-normalized matching (trim + collapse runs to single space)
- Skip messages: "file not found" and "code has changed since review"
- Graceful failure — continues to next finding, never halts

Reference implementation search (D-18 through D-20):
- Category-to-search-term mapping: i18n → `useTranslation`/`t('`, design-token → CSS variable from snippet, architecture → glob for pattern files, security → `@UseGuards`
- Search depth: same directory first, then parent directory, no deeper
- No reference found → snippet-only fix; 1-2 found → read one and replicate its pattern

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add filter AND logic, --only override, and idempotency filter to Step 1 | fb7687d |
| 2 | Add snippet-based location algorithm and reference implementation search to Step 2 | a9fa450 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — this plan modifies agent prose (markdown), not source code. No data flows or UI rendering involved.

## Self-Check: PASSED

- [x] `agents/pr-fixer.md` exists and was modified
- [x] Commit fb7687d exists (Task 1)
- [x] Commit a9fa450 exists (Task 2)
- [x] All 5 overall verification checks pass (pendingFindings, snippet.split, Whitespace-normalized, Reference implementation search, Nothing to fix)
- [x] All Task 1 acceptance criteria: pendingFindings, findings[N-1], filteredFindings.filter(f => f.severity === X), (f.status ?? 'pending') !== 'resolved', Nothing to fix, descending, D-08, D-14
- [x] All Task 2 acceptance criteria: snippet.split(' → ')[0], .at(-1), Whitespace-normalized fallback, code has changed since review, Reference implementation search, D-18, D-20, same directory first, old IMPORTANT note removed
