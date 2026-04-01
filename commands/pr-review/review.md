---
name: pr-review:review
description: Analyze a GitHub PR against project architectural patterns and generate an interactive review preview. Posts comments to GitHub optionally.
argument-hint: "<pr-url-or-number> [--post] [--focus security|i18n|architecture|design-tokens|all] [--skills all|none|name1,name2] [--help]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
agent: pr-reviewer
---

<!-- runtime-compat
runtime: claude-code
  status: full
  notes: allowed-tools enforced, argument-hint displayed in TUI, AskUserQuestion available.
runtime: opencode
  status: partial
  degraded: allowed-tools ignored, argument-hint not displayed, AskUserQuestion not available
  notes: agent: delegation works. Tool permissions via opencode.json instead.
         AskUserQuestion listed in allowed-tools but not invoked by the agent; bash readline used.
-->

<objective>
Perform a comprehensive code review on a GitHub pull request by analyzing diffs against
project-specific conventions defined in project instructions, skills, and ./REVIEW-PLAN.md.
Generates structured findings and optionally posts comments to the PR.
</objective>

<execution_context>
@./REVIEW-PLAN.md
@./CLAUDE.md
</execution_context>

<context>
PR identifier: $ARGUMENTS (GitHub URL, org/repo#N, or PR number)

**Flags:**
- `--post` — Post findings as comments on the GitHub PR
- `--focus security` — Focus on security patterns only
- `--focus i18n` — Focus on i18n violations only
- `--focus architecture` — Focus on architectural patterns only
- `--focus design-tokens` — Focus on design token violations only
- `--focus all` — Full review (default)
- `--skills all|none|name1,name2` — Choose which project skills provide review context
- `--help` — Show available flags and usage information

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- `./REVIEW-PLAN.md` exists (run `/pr-review:setup` to generate it)

**First run:** If `REVIEW-PLAN.md` doesn't exist, generate it from the template at
`__CONFIG_DIR__/pr-review/templates/review-plan.md` — copy to `./REVIEW-PLAN.md` and ask the
user to customize the "Project-Specific Rules" section before proceeding.
</context>

<process>
0. **Help flag check:** If `$ARGUMENTS` contains `--help`, print the flag reference below and stop. Do not proceed to Step 1.

    ```
    Usage: /pr-review:review <pr-url-or-number> [flags]

    Flags:
      --post                    Post findings as inline PR comments
      --focus <category>        Limit review to a category (security, i18n,
                                architecture, design-tokens, or all)
      --skills <selection>      Choose skills for context (all, none, or
                                comma-separated names)
      --help                    Show this help message

    Prerequisites:
      gh CLI installed and authenticated
      ./REVIEW-PLAN.md exists (run /pr-review:setup)

    Related commands:
      /pr-review:setup          Generate REVIEW-PLAN.md for your project
      /pr-review:fix            Fix findings directly in source code
    ```

1. Verify gh CLI is available and authenticated
2. Detect pr-review directory (local `__CONFIG_DIR__/pr-review/` or global `$HOME/__CONFIG_DIR__/pr-review/`)
3. If REVIEW-PLAN.md doesn't exist at project root, generate it from template and notify user
4. Load project context (project instructions, skills, REVIEW-PLAN.md)
5. Fetch PR metadata and existing comments
6. Analyze each code file against review checklist
7. Generate structured findings (`$PR_REVIEW_DIR/findings.json`)
8. Generate config (`$PR_REVIEW_DIR/config.json`)
9. Print summary to user
10. If --post flag: parse diff hunks, dedup against existing comments, submit batched review with inline comments, retrieve and store commentIds in findings.json
</process>

<success_criteria>
- [ ] All code files analyzed against project patterns
- [ ] findings.json created
- [ ] config.json created
- [ ] Summary table displayed
- [ ] Inline review comments posted on correct diff lines in Files Changed tab (if --post flag)
- [ ] All findings submitted as single batched review, not one call per finding (if --post flag)
- [ ] commentId stored in findings.json for each posted finding (if --post flag)
</success_criteria>
