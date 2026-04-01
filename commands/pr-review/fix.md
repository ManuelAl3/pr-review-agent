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

<!-- runtime-compat
runtime: claude-code
  status: full
  notes: allowed-tools enforced, argument-hint displayed in TUI, AskUserQuestion available.
runtime: opencode
  status: partial
  degraded: allowed-tools ignored, argument-hint not displayed, AskUserQuestion not available
  notes: agent: delegation works. Tool permissions via opencode.json instead.
         AskUserQuestion listed in allowed-tools but not invoked by the agent.
-->

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
8. **Push commits to remote (non-fork only):**
   a. If fork PR ($IS_FORK is "true"): skip push, print "Push: skipped (fork PR)"
   b. If no fixes were applied: skip push silently
   c. Run `git push` — on failure, print error with hint to push manually; continue to reply step
9. **Reply to inline comment threads (non-fork only):**
   a. Filter resolved findings with non-null commentId as reply targets
   b. Print reply target count: "Reply targets: N of M resolved findings have commentId"
   c. If zero targets: print "Replies: No inline comments to reply to", skip rest
   d. For each target: POST reply via `gh api repos/{repo}/pulls/{number}/comments/{commentId}/replies` with body "Fixed in [`{sha}`]({url})\n\n{title} (`{file}`)"
   e. On 422: collect for batched fallback. On other error: skip and report. No retries.
   f. After all replies: if any 422s, post ONE `gh pr comment` with markdown table of failed inline replies
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
- [ ] Fix commits pushed to PR branch in a single git push (skipped for forks)
- [ ] Each resolved finding with commentId gets a reply on its inline comment thread
- [ ] 422 errors fall back to a single batched general PR comment
</success_criteria>
