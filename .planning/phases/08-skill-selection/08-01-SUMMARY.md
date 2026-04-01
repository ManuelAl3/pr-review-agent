---
phase: 08-skill-selection
plan: 01
subsystem: agents
tags: [skill-selection, interactive-prompt, cli-flags, pr-reviewer]
dependency_graph:
  requires: [Phase 07 skill discovery — /tmp/skills.json written by pr-reviewer.md Step 1]
  provides: [Filtered /tmp/skills.json with only user-selected skills — consumed by Phase 09 context injection]
  affects: [agents/pr-reviewer.md, commands/pr-review/review.md]
tech_stack:
  added: []
  patterns: [inline node -e bash block, readline TTY prompt, process.stdin.isTTY non-interactive detection, /tmp JSON temp file overwrite]
key_files:
  created: []
  modified:
    - agents/pr-reviewer.md
    - commands/pr-review/review.md
decisions:
  - "Use readline.createInterface (Node.js built-in) for interactive TTY prompt — no AskUserQuestion widget (D-01)"
  - "Flag parsing in agent layer (pr-reviewer.md), not command layer (review.md) — consistent with --post and --focus pattern (D-05)"
  - "No 2>/dev/null on Step 1b node call so D-10 stderr messages reach the user (per RESEARCH.md Open Question 3)"
  - "Pitfall 4 guard: if --skills captures a value starting with --, treat as no flag"
metrics:
  duration: 131s
  completed: "2026-04-01T02:33:17Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 08 Plan 01: Skill Selection Logic Summary

**One-liner:** Interactive skill selection Step 1b with readline TTY prompt, --skills flag bypass, non-interactive auto-select, and /tmp/skills.json overwrite using Node.js built-ins.

## What Was Built

Added Step 1b (Select skills) to `agents/pr-reviewer.md` immediately after the Phase 7 skill discovery block. The step implements all four selection branches in a single self-contained `node -e` block:

1. **Zero-skills guard (SEL-03):** If `/tmp/skills.json` has no skills, exits silently with no output.
2. **`--skills` flag branch (SEL-02):** Parses `--skills all|none|name1,name2` from `$ARGUMENTS` via regex, filters skills by name (case-insensitive, warns unknown), writes selected subset, prints confirmation, exits without showing prompt.
3. **Non-interactive fallback (D-09):** If `process.stdin.isTTY` is falsy and no flag, logs `[skills] Non-interactive — auto-selected all N skills` to stderr, leaves `/tmp/skills.json` unchanged.
4. **Interactive TTY prompt (SEL-01):** Prints bold-formatted numbered list with dim descriptions (truncated at 60 chars), prompts `Select skills (all / none / 1,3 / Enter = all): `, reads input via `readline.createInterface`, handles `all`/`none`/number-list/name-list inputs, overwrites `/tmp/skills.json`, prints confirmation.

After the `node -e` block, `SKILL_COUNT` is re-read from the now-filtered `/tmp/skills.json` so downstream steps see the selected count.

The only change to `commands/pr-review/review.md` is adding `[--skills all|none|name1,name2]` to the `argument-hint` frontmatter field (line 4).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Step 1b skill selection logic to pr-reviewer.md | 987f36b | agents/pr-reviewer.md |
| 2 | Update review.md argument-hint with --skills flag | a714ffe | commands/pr-review/review.md |

## Deviations from Plan

None — plan executed exactly as written.

The RESEARCH.md skeleton (line 380) showed `2>/dev/null` on the `node -e` call, but the plan action explicitly said NOT to include it (per RESEARCH.md Open Question 3 — D-10 stderr messages would be swallowed). Implementation followed the plan action, not the skeleton.

## Verification Results

All 10 phase-level checks passed:
1. `Select skills` present in pr-reviewer.md
2. `--skills` appears 3 times in pr-reviewer.md (flag regex, Pitfall 4 guard, filter logic)
3. `--skills` appears 1 time in review.md (argument-hint)
4. `isTTY` present (non-interactive detection)
5. `readline` present (interactive prompt)
6. `filterByNames` present (name-matching helper)
7. `Available skills:` present (section header per UI-SPEC)
8. `Non-interactive` present (stderr log per D-10)
9. `Unknown skill name` present (warning per D-08)
10. YAML frontmatter unchanged (name: pr-reviewer, tools: Read, Bash, Grep, Glob, Write)

Smoke test passed: `--skills all` flag parsing and Pitfall 4 guard verified inline.

## Known Stubs

None — the selection logic is fully wired. Phase 9 will consume the filtered `/tmp/skills.json` for context injection, but that is the next phase's responsibility, not a stub in this plan.

## Self-Check: PASSED
