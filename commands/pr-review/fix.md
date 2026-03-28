---
name: pr-review:fix
description: Fix review findings directly in the codebase. Applies corrections from a previous /pr-review:review analysis to the actual source code.
argument-hint: "[--all] [--only <N>] [--severity critical|warning|suggestion] [--category <key>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
agent: pr-fixer
---

<objective>
Apply fixes from a previous PR review directly to the codebase. Reads the structured
findings from findings.json and corrects each issue in the actual source code, following
project conventions and architectural patterns.
</objective>

<execution_context>
@./REVIEW-PLAN.md
@./CLAUDE.md
</execution_context>

<context>
$ARGUMENTS

**Filters (pick one):**
- `--all` — Fix all findings (default if no filter specified)
- `--only N` — Fix only finding at index N (1-based, as shown in the HTML preview)
- `--severity critical` — Fix only critical findings
- `--severity warning` — Fix only warning findings
- `--severity suggestion` — Fix only suggestion findings
- `--category <key>` — Fix only findings in this category (e.g. `i18n`, `design-tokens`, `architecture`)

Filters can be combined: `--severity critical --category security`

**Prerequisites:**
- A previous `/pr-review:review` must have been run (findings.json must exist)
- `./REVIEW-PLAN.md` exists (for understanding architectural patterns)

**First:** Detect the pr-review directory and load `findings.json`. If it doesn't exist,
tell the user to run `/pr-review:review <pr-url>` first.
</context>

<process>
1. Detect pr-review directory (local `__CONFIG_DIR__/pr-review/` or global `$HOME/__CONFIG_DIR__/pr-review/`)
2. Read `$PR_REVIEW_DIR/findings.json` — if missing, stop and ask user to run review first
3. Read `$PR_REVIEW_DIR/config.json` for PR context (optional, for reference)
4. Parse filter flags from arguments, select target findings
5. Load project context (CLAUDE.md, REVIEW-PLAN.md, skills)
6. For each targeted finding:
   a. Read the target file
   b. Find a reference implementation in the codebase (for pattern-based fixes)
   c. Apply the fix using Edit/Write tools
   d. Report result (fixed or skipped with reason)
7. Print summary with fixed/skipped counts
</process>

<success_criteria>
- [ ] findings.json loaded and parsed
- [ ] Filters applied correctly
- [ ] Each targeted finding attempted
- [ ] Fixes follow project conventions (verified against reference implementations)
- [ ] Summary report displayed
- [ ] No unrelated code modified
</success_criteria>
