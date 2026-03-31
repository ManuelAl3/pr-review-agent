# Phase 4: Fix Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 04-Fix Engine
**Areas discussed:** Commit contents, Snippet matching, Failure behavior, Idempotency, Multi-finding file order, Filter combination logic, Fork PR commit behavior, Reference implementation search

---

## Commit Contents

| Option | Description | Selected |
|--------|-------------|----------|
| Source file only | Each commit has only the fixed source file(s). findings.json updated in working tree but not committed. | ✓ |
| Source + findings.json | Each commit includes fixed source AND updated findings.json. Full traceability per commit. | |
| Source commits + one findings commit | Source-only commits per finding, then one final commit updating findings.json. | |

**User's choice:** Source file only
**Notes:** Keeps git history clean with source-only diffs. findings.json stays as runtime artifact.

---

## Snippet Matching

| Option | Description | Selected |
|--------|-------------|----------|
| Snippet text search | Extract "current" side, search file for exact text, fallback to whitespace-normalized match. | ✓ |
| Line number + snippet verify | Go to reported line first, check snippet, fall back to text search. | |
| Grep-based search | Use Grep tool for all occurrences, pick closest to reported line. | |

**User's choice:** Snippet text search
**Notes:** Three-step: exact match → whitespace-normalized → skip with "code has changed" message.

---

## Failure Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Skip and continue | Log skip reason, move to next finding. Summary shows all skipped. | ✓ |
| Skip and continue with prompt | After each skip, ask user whether to continue or stop. | |
| Stop on first failure | Halt immediately. Already-committed fixes remain. | |

**User's choice:** Skip and continue
**Notes:** Developer can re-run with --only N for specific retries.

---

## Idempotency

| Option | Description | Selected |
|--------|-------------|----------|
| Skip resolved silently | Resolved findings excluded before fix loop. "Nothing to fix" if all resolved. | ✓ |
| Skip resolved with log | Print each skipped-because-resolved finding. More verbose. | |
| Force flag to re-fix | Skip by default, --force flag to re-apply. | |

**User's choice:** Skip resolved silently
**Notes:** No per-finding "already resolved" log line during normal operation.

---

## Multi-Finding File Order

| Option | Description | Selected |
|--------|-------------|----------|
| One commit per finding | Even same-file findings get separate commits. Bottom-up order. | ✓ |
| Batch same-file findings | Group all findings for same file into one commit. | |
| You decide | Claude decides during planning. | |

**User's choice:** One commit per finding
**Notes:** Maintains 1:1 finding-to-commit invariant. Bottom-up preserves line numbers.

---

## Filter Combination Logic

| Option | Description | Selected |
|--------|-------------|----------|
| AND logic | --severity critical --category security = BOTH. --only N overrides. No flags = --all. | ✓ |
| OR logic | --severity critical --category security = either critical OR security. | |
| You decide | Claude decides based on CLI conventions. | |

**User's choice:** AND logic
**Notes:** --only N overrides all other filters. No flags defaults to --all.

---

## Fork PR Commit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Update findings.json locally | Apply edits, update status to resolved (commitHash: null). UI shows badge. | ✓ |
| Don't update findings.json | Only apply file edits. findings.json stays unchanged. | |
| You decide | Claude decides during planning. | |

**User's choice:** Update findings.json locally
**Notes:** Fork users still get resolution tracking in UI, just without commit links.

---

## Reference Implementation Search

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted search | Search 1-2 reference files in same/nearby directory. Fall back to snippet guidance. | ✓ |
| Deep search (3-5 files) | Search broadly across codebase. More thorough, slower. | |
| Skip reference search | Always use snippet as guide. Fastest. | |
| You decide | Claude decides based on category and complexity. | |

**User's choice:** Targeted search
**Notes:** Same directory first, then parent. No exhaustive codebase scan.

---

## Claude's Discretion

- Exact whitespace normalization implementation for snippet matching
- Git staging and SHA capture mechanics
- findings.json write timing (per-fix vs batch, preserving idempotency)
- Reference search depth for non-obvious categories

## Deferred Ideas

None — discussion stayed within phase scope
