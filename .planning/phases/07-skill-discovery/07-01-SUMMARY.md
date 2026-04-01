---
phase: 07-skill-discovery
plan: 01
subsystem: agents
tags: [skill-discovery, pr-reviewer, node-js, frontmatter-parsing]
dependency_graph:
  requires: []
  provides: [skill-discovery-in-step1]
  affects: [agents/pr-reviewer.md]
tech_stack:
  added: []
  patterns: [inline-node-e-script, temp-file-cross-step-sharing, regex-frontmatter-parser]
key_files:
  created: []
  modified:
    - agents/pr-reviewer.md
decisions:
  - "Use process.cwd() as anchor for all four skill dirs (not path.dirname(PR_REVIEW_DIR)) — correct for both local and global installs"
  - "Store relDir string as source field (not path.join result) to avoid Windows backslash in display values"
  - "SKILL_COUNT read from /tmp/skills.json via node -e to avoid shell quoting issues with large JSON"
metrics:
  duration: 87s
  completed: "2026-04-01"
  tasks_completed: 2
  files_modified: 1
---

# Phase 07 Plan 01: Skill Discovery Sub-Step Summary

Silent skill discovery added to Step 1 of `pr-reviewer.md` — scans four config directories, parses SKILL.md frontmatter with regex fallback, deduplicates by name, writes `/tmp/skills.json` for Phase 8 consumption.

## What Was Built

Task 1 modified `agents/pr-reviewer.md` Step 1 (Load Review Context) to replace the placeholder line "Read any project skills for architectural patterns" with a complete `node -e` inline discovery script. The script:

- Scans all four skill directories: `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, `.config/opencode/skills/`
- Silently skips missing directories via `fs.existsSync()` + `try/catch`
- For each subdirectory containing a `SKILL.md`, reads and parses frontmatter using the regex `^---\r?\n([\s\S]*?)\r?\n---`
- Strips outer single or double quotes from parsed YAML scalar values (Pitfall 1 avoidance)
- Falls back to the directory name if no frontmatter is present (SKILL-02)
- Deduplicates by parsed `name` field using a `Set` (first-found-wins by priority order)
- Produces `{ name, description, path, source }` objects — content NOT read at discovery time
- Writes results to `/tmp/skills.json` and sets `SKILL_COUNT` for conditional downstream logic

Task 2 validated the script runs correctly against the project's actual `.claude/skills/conventional-commit/SKILL.md`, confirming:
- Output: `name: "conventional-commit"`, `source: ".claude/skills"`, description starts with `"Prompt and workflow"`
- Zero-skill scenario (running from `/tmp`) returns `[]` with exit code 0

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3e4c99c | feat(07-01): add skill discovery sub-step to Step 1 of pr-reviewer.md |
| 2 | (no commit — validation only, no files modified) | Discovery script validated against real SKILL.md |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The discovery logic is complete and writes real data to `/tmp/skills.json`. Phase 8 will consume this output for skill selection UI.

## Self-Check: PASSED

- `agents/pr-reviewer.md` exists and contains `SKILL_DIRS` (2 occurrences) ✓
- Commit `3e4c99c` exists in git log ✓
- Discovery script produces correct output for `conventional-commit` skill ✓
- YAML frontmatter (lines 1-6) unchanged: `name: pr-reviewer`, `tools: Read, Bash, Grep, Glob, Write` ✓
