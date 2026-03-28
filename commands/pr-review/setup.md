---
name: pr-review:setup
description: Initialize PR review for the current project. Generates REVIEW-PLAN.md with project-specific criteria.
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Set up PR review for the current project. Generates a REVIEW-PLAN.md at the project
root with review criteria tailored to the project's stack and patterns.

This is similar to how `/gsd:new-project` generates PROJECT.md — the review plan
is a project-level file that developers edit and commit, not agent infrastructure.
</objective>

<context>
$ARGUMENTS

**What gets created:**
- `./REVIEW-PLAN.md` — Review criteria checklist at project root (developer-editable, committed to repo)

**What already exists (installed by the agent):**
- `__CONFIG_DIR__/pr-review/index.html` — Interactive preview UI
- `__CONFIG_DIR__/pr-review/serve.js` — Local dev server for the preview
- `__CONFIG_DIR__/pr-review/templates/review-plan.md` — Base template
</context>

<process>

## Step 1: Check Prerequisites

```bash
gh --version 2>/dev/null || echo "gh not installed"
gh auth status 2>/dev/null || echo "gh not authenticated"
```

If `gh` is not available, ask the user:
- "GitHub CLI is required for PR review. Would you like to install it?"
- Windows: `winget install GitHub.cli --source winget`
- macOS: `brew install gh`
- Then: `gh auth login`

## Step 2: Detect PR Review Directory

Locate the pr-review runtime:
1. `./__CONFIG_DIR__/pr-review/` (local)
2. `$HOME/__CONFIG_DIR__/pr-review/` (global)

If neither exists, inform user to install: `npx pr-review-agent`

## Step 3: Discover Project Context

Read these files to understand the project:
- `./CLAUDE.md` or equivalent project instructions
- Project skills directory (if any)
- `package.json` or equivalent — detect stack

## Step 4: Generate REVIEW-PLAN.md

1. Read the base template from `$PR_REVIEW_DIR/templates/review-plan.md`
2. Ask the user about their project:
   - Backend framework and patterns to enforce
   - Frontend framework and patterns to enforce
   - Key rules they want every PR checked against
   - Any additional custom criteria
3. Generate `./REVIEW-PLAN.md` at the project root, customizing the template
   with the project's specific stack, patterns, and rules
4. If project instructions or skills define architectural patterns, incorporate those
   automatically into the "Project-Specific Rules" section

**Important:** Do NOT hardcode framework-specific rules in the template.
Generate them dynamically based on what the project actually uses.

## Step 5: Confirm

Tell the user:
- Where REVIEW-PLAN.md was created
- That they can edit it anytime
- That the agent reads it before every `/pr-review:review` run
- How to start reviewing: `/pr-review:review <pr-url>`

</process>

<success_criteria>
- [ ] gh CLI verified or installation guided
- [ ] Project stack detected
- [ ] REVIEW-PLAN.md generated at project root with project-specific criteria
- [ ] User informed about next steps
</success_criteria>
