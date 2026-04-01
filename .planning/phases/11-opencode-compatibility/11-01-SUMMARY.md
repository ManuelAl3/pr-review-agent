---
phase: 11-opencode-compatibility
plan: "01"
subsystem: agents-commands
tags: [opencode, compatibility, documentation, compat-blocks]
dependency_graph:
  requires: []
  provides: [runtime-compat-docs]
  affects: [agents/pr-reviewer.md, agents/pr-fixer.md, commands/pr-review/review.md, commands/pr-review/fix.md, commands/pr-review/setup.md]
tech_stack:
  added: []
  patterns: [html-comment-compat-blocks, runtime-compat-documentation]
key_files:
  created: []
  modified:
    - agents/pr-reviewer.md
    - agents/pr-fixer.md
    - commands/pr-review/review.md
    - commands/pr-review/fix.md
    - commands/pr-review/setup.md
decisions:
  - "Compat blocks use consistent field names (runtime:, status:, degraded:, notes:) across all 5 files per Pitfall 4 guidance"
  - "AskUserQuestion documented as listed-but-not-invoked — no fallback code needed since agents already use bash readline"
  - "PascalCase tools: field stated as 'may be deprecated' (not 'auto-maps') per Pitfall 3 guidance from RESEARCH.md"
metrics:
  duration: ~90s
  completed: "2026-04-01T19:26:11Z"
  tasks_completed: 2
  files_modified: 5
requirements:
  - RTCOMPAT-01
  - RTCOMPAT-02
---

# Phase 11 Plan 01: OpenCode Compatibility Compat Blocks Summary

**One-liner:** HTML comment runtime-compat blocks added to all 5 agent/command files documenting Claude Code vs OpenCode behavior differences inline.

## What Was Built

Added `<!-- runtime-compat ... -->` HTML comment blocks to every agent and command file in the PR Review Agent toolkit. Each block documents:
- Full support on Claude Code (all frontmatter fields enforced, native tools available)
- Partial support on OpenCode with specific degradation notes (tools: field deprecated, allowed-tools/argument-hint ignored, AskUserQuestion not available)

Tool name audit (RTCOMPAT-01) confirmed all 5 files already use PascalCase tool names throughout — zero changes needed to tool names.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add compat blocks to agent files | 0306012 | agents/pr-reviewer.md, agents/pr-fixer.md |
| 2 | Add compat blocks to command files | c13752a | commands/pr-review/review.md, commands/pr-review/fix.md, commands/pr-review/setup.md |

## Compat Block Details

### Agent Files

**agents/pr-reviewer.md** — Notes bash readline used for all interactive prompts (AskUserQuestion not invoked). PascalCase tools: field may be deprecated on OpenCode.

**agents/pr-fixer.md** — Notes no interactive prompts exist. PascalCase tools: field may be deprecated on OpenCode.

### Command Files

**commands/pr-review/review.md** — Notes allowed-tools ignored and argument-hint not displayed on OpenCode. agent: delegation works on both runtimes.

**commands/pr-review/fix.md** — Same as review.md. AskUserQuestion listed but not invoked.

**commands/pr-review/setup.md** — Notes no agent: field (runs inline). allowed-tools ignored on OpenCode.

## Tool Name Audit Results (RTCOMPAT-01)

Direct inspection of all 5 files confirmed:

| File | Tool Names | AskUserQuestion | Issues Found |
|------|-----------|-----------------|--------------|
| agents/pr-reviewer.md | All PascalCase | Not invoked | None |
| agents/pr-fixer.md | All PascalCase | Not invoked | None |
| commands/pr-review/review.md | All PascalCase | Listed only | None |
| commands/pr-review/fix.md | All PascalCase | Listed only | None |
| commands/pr-review/setup.md | All PascalCase | Listed only | None |

Zero tool name mismatches. RTCOMPAT-01 already satisfied at source level — no tool name changes needed.

## Deviations from Plan

None — plan executed exactly as written. All 5 compat blocks match the exact content specified in the plan, with consistent field names as required by Pitfall 4 guidance.

## Known Stubs

None. This plan is documentation-only (HTML comment insertions). No UI rendering, data wiring, or functional code was added.

## Self-Check: PASSED

Verified:
- `agents/pr-reviewer.md` — contains `<!-- runtime-compat` at line 8 (after `---` at line 6, before `<role>`)
- `agents/pr-fixer.md` — contains `<!-- runtime-compat` at line 8 (after `---` at line 6, before `<role>`)
- `commands/pr-review/review.md` — contains `<!-- runtime-compat` at line 15 (after `---`, before `<objective>`)
- `commands/pr-review/fix.md` — contains `<!-- runtime-compat` at line 16 (after `---`, before `<objective>`)
- `commands/pr-review/setup.md` — contains `<!-- runtime-compat` at line 13 (after `---`, before `<objective>`)
- Zero "auto-map" occurrences in any file
- Both commits exist: 0306012, c13752a
