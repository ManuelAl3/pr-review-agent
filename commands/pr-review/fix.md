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
- A clean working tree (no uncommitted tracked changes). Untracked files are fine.

**First:** Detect the pr-review directory and load `findings.json`. If it doesn't exist,
tell the user to run `/pr-review:review <pr-url>` first.
</context>

<process>
1. Detect pr-review directory (local `__CONFIG_DIR__/pr-review/` or global `$HOME/__CONFIG_DIR__/pr-review/`)
2. **Pre-flight safety gate:**
   a. Read `$PR_REVIEW_DIR/config.json` for PR metadata (number, head branch) — if missing, stop with error
   b. Check for dirty working tree (`git status --porcelain`, ignoring untracked files) — if dirty, stop with error
   c. Check current branch vs `config.json` `pr.head` — if different, run `gh pr checkout`; if same, skip silently
   d. Detect fork PR via `gh pr view --json isCrossRepository` — if fork, warn user and set flag to skip commits/push/replies
3. Read `$PR_REVIEW_DIR/findings.json` — if missing, stop and ask user to run review first
4. Parse filter flags from arguments, select target findings
5. Load project context (CLAUDE.md, REVIEW-PLAN.md, skills)
6. For each targeted finding:
   a. Read the target file
   b. Find a reference implementation in the codebase (for pattern-based fixes)
   c. Apply the fix using Edit/Write tools
   d. Report result (fixed or skipped with reason)
   e. If not fork: stage fixed file, commit with `fix(review): [title]`, capture SHA
   f. Update findings.json: set status to "resolved", store commitHash (null for forks)
7. Print summary with fixed/skipped counts
</process>

<success_criteria>
- [ ] Pre-flight gate passed (clean tree, correct branch, fork status known)
- [ ] If fork PR: no commits created, warning displayed
- [ ] findings.json loaded and parsed
- [ ] Filters applied correctly
- [ ] Each targeted finding attempted
- [ ] Fixes follow project conventions (verified against reference implementations)
- [ ] Summary report displayed
- [ ] No unrelated code modified
- [ ] Each fix produces one commit with format `fix(review): [title]` (non-fork only)
- [ ] findings.json reflects resolved status and commitHash after each fix
- [ ] Re-runs skip already-resolved findings without duplicate commits
- [ ] Skipped findings reported with reasons in summary
</success_criteria>
