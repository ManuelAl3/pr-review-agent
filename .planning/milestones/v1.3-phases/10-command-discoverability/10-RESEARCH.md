# Phase 10: Command Discoverability - Research

**Researched:** 2026-03-31
**Domain:** Claude Code / OpenCode command frontmatter and agent process step authoring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Simple flag list format (like `gh pr --help`) — usage line at top, each flag on its own line with aligned descriptions, prerequisites section at bottom
- **D-02:** Include a "Related commands" section at the bottom mentioning `/pr-review:setup` and `/pr-review:fix` with one-line descriptions
- **D-03:** Add a new Step 0 in `review.md`'s `<process>` section that checks for `--help` in `$ARGUMENTS` before anything else — if found, print the flag reference and stop. The agent never loads.
- **D-04:** Append `[--help]` to the existing `argument-hint` string in review.md frontmatter. Do not restructure or shorten the existing hint.

### Claude's Discretion

- Exact column alignment/spacing in the help output
- Whether to include a version number in the help output
- Prerequisites wording

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Running `/pr-review:review --help` prints a formatted list of all available flags with descriptions instead of starting a review | D-03 specifies where the intercept lives (`<process>` Step 0) and D-01 specifies the output format. The existing `$ARGUMENTS` regex pattern in `pr-reviewer.md` confirms the approach. |
| DISC-02 | Command frontmatter `argument-hint` reflects all current flags including `--skills` from v1.2 | D-04 specifies append-only change: add `[--help]` to the existing string. Current string already contains `--skills`. |
</phase_requirements>

---

## Summary

Phase 10 is a pure text-change phase. It touches exactly one file (`commands/pr-review/review.md`) in two places: the YAML frontmatter `argument-hint` field and the `<process>` section. No logic changes, no new files, no agent modifications.

The `<process>` section in `review.md` currently has 10 numbered steps (1 through 10). Decision D-03 adds a new "Step 0" that intercepts `--help` in `$ARGUMENTS` and prints a formatted text block before any other work occurs. This mirrors the existing pattern in `pr-reviewer.md` (Steps 0 and 0.5 before Step 1) — using unnumbered or zero-indexed steps for guard-clause checks is already established in this codebase.

The `argument-hint` field in YAML frontmatter is a single-quoted string that populates the tooltip shown in Claude Code's and OpenCode's command autocomplete. The current value covers all v1.2 flags but is missing `--help`. Decision D-04 appends `[--help]` to the end of this string with no other restructuring.

**Primary recommendation:** Two edits to `commands/pr-review/review.md` — insert Step 0 before the existing numbered step list, and append `[--help]` to `argument-hint`. No other files change.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Markdown (YAML frontmatter) | — | Command definition format | Existing project convention — all commands use this format |
| Plain text output | — | Help message rendering | Project constraint: zero dependencies, no formatter libraries |

No npm packages required. This phase involves only markdown/text editing.

**Installation:** No new dependencies.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes. Both edits are within a single existing file:

```
commands/pr-review/
└── review.md        ← two edits: frontmatter + <process> Step 0
```

### Pattern 1: Guard-Clause Step 0 in `<process>`

**What:** A numbered step inserted before Step 1 that checks for a flag and short-circuits the entire execution flow.

**When to use:** Whenever a flag must be intercepted before any agent work begins (loading context, checking prerequisites, etc.).

**Example — how `pr-reviewer.md` uses Step 0 already:**

```markdown
<step name="prerequisites" priority="first">
## Step 0: Verify GitHub CLI

```bash
gh auth status
```

If `gh` is not found or not authenticated, STOP and inform the user.
</step>
```

The `review.md` `<process>` section uses a simpler numbered list format (no XML step tags), so the new Step 0 follows that same style:

```markdown
<process>
0. If `--help` is in `$ARGUMENTS`, print the flag reference (see below) and stop — do not proceed to Step 1.

**Flag reference:**
```
/pr-review:review --help

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
Stop. Do not continue to Step 1.

1. Verify gh CLI is available and authenticated
...
</process>
```

**Note:** The exact output format (column alignment) is at Claude's discretion. The content (all four flags, prerequisites, related commands) is locked by D-01 and D-02.

### Pattern 2: `argument-hint` Frontmatter Field

**What:** YAML frontmatter field that provides the autocomplete tooltip text in Claude Code and OpenCode.

**Current value (review.md, line 4):**
```yaml
argument-hint: "<pr-url-or-number> [--post] [--focus security|i18n|architecture|design-tokens|all] [--skills all|none|name1,name2]"
```

**Target value (D-04 — append only):**
```yaml
argument-hint: "<pr-url-or-number> [--post] [--focus security|i18n|architecture|design-tokens|all] [--skills all|none|name1,name2] [--help]"
```

**Why this pattern:** `argument-hint` in Claude Code / OpenCode command frontmatter controls the usage hint shown in the slash-command tooltip. It is a free-form string — no schema validation. Existing commands in this repo (fix.md) use the same bracket-notation convention: `[--all] [--only <N>] [--severity critical|warning|suggestion] [--category <key>]`.

### Anti-Patterns to Avoid

- **Modifying `agents/pr-reviewer.md`:** The agent file is NOT modified in this phase. The `--help` intercept lives in `commands/pr-review/review.md`'s `<process>` section only. The agent only runs for non-help invocations.
- **Restructuring the argument-hint:** D-04 is explicit — append `[--help]`, do not reorder or shorten the existing string.
- **Adding `--help` parsing to the agent's existing flag parsing block:** The `<context>` section of `review.md` lists flags for reference. Update it to include `--help` if doing so keeps it accurate, but this is documentation-only — no logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flag parsing | Custom regex to parse `--help` | Simple `$ARGUMENTS.includes('--help')` or `$ARGUMENTS` string match | Flag is a single token with no value; no regex needed |
| Help formatting | Dynamic column calculator | Hardcoded aligned text block | Static content, fixed width — over-engineering a text constant |

**Key insight:** The help output is static content. Every flag is known at write time. No dynamic generation is needed or appropriate.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is not a rename/refactor/migration phase. The phase adds new text content to an existing file; no stored data, service config, OS registrations, or build artifacts reference the changed content.

---

## Common Pitfalls

### Pitfall 1: Help step fires when `--help` appears as a value inside another flag

**What goes wrong:** If a user runs `/pr-review:review 123 --focus architecture --help`, the check correctly intercepts. But a naive `includes('--help')` check on `$ARGUMENTS` would also fire for a hypothetical `--no-help` flag or a PR URL that contains the string "help". In practice this is not a real risk given the PR URL patterns (`<number>` or `owner/repo#N`), but it is worth using a word-boundary check.

**How to avoid:** Check for `--help` as a standalone token: the string `--help` preceded by a space or at position 0, or followed by a space or end-of-string. A simple approach: check if `$ARGUMENTS` contains the exact token ` --help` or starts with `--help`.

**Warning signs:** User reports help being printed when they did not pass `--help`.

### Pitfall 2: `<process>` step numbering confusion

**What goes wrong:** The existing steps in `review.md` are numbered 1–10. Inserting "Step 0" before them is unambiguous, but if the implementer accidentally renumbers Step 1 to Step 2 (etc.), the planner's task would cascade into a large renumbering change not in scope.

**How to avoid:** Insert Step 0 as a new item before Step 1. Do NOT renumber Steps 1 through 10.

**Warning signs:** Diff shows more than ~15 lines changed in the `<process>` block.

### Pitfall 3: `argument-hint` string quoting

**What goes wrong:** The current `argument-hint` value contains `|` characters (for the `--focus` flag). In YAML, `|` inside a double-quoted or unquoted string is fine, but if the string is edited and the quoting style is accidentally changed to a block scalar or the quotes are dropped, the frontmatter parser may misinterpret the value.

**How to avoid:** Keep the value as a double-quoted YAML string. Only append ` [--help]` before the closing `"`.

**Warning signs:** Frontmatter parse error in the AI assistant when invoking `/pr-review:review`.

### Pitfall 4: Help output uses emoji or color codes

**What goes wrong:** The project CLAUDE.md explicitly states "avoid writing emojis to files unless asked" and the convention for help output is plain text (like `gh pr --help`). Adding ANSI codes or emoji to the help text block would violate project conventions and display poorly in some terminals.

**How to avoid:** Use plain ASCII text for the help output. No color codes, no emoji.

---

## Code Examples

### Exact current `argument-hint` line (review.md, line 4)

```yaml
argument-hint: "<pr-url-or-number> [--post] [--focus security|i18n|architecture|design-tokens|all] [--skills all|none|name1,name2]"
```

Target (append ` [--help]` before closing `"`):

```yaml
argument-hint: "<pr-url-or-number> [--post] [--focus security|i18n|architecture|design-tokens|all] [--skills all|none|name1,name2] [--help]"
```

### Exact help output block (from CONTEXT.md specifics, locked by D-01/D-02)

```
/pr-review:review --help

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

Column alignment (Claude's discretion): descriptions start at column 28 (two spaces + 24-char flag field). This matches the column width of `--focus <category>` which is the longest flag token.

### Step 0 intercept pattern (to insert at top of `<process>`)

```markdown
0. **Help flag check:** If `$ARGUMENTS` contains `--help` (as a standalone token), print the flag reference below and stop — do not proceed further.

```
Usage: /pr-review:review <pr-url-or-number> [flags]
...
```
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No `--help` flag; users read source | `--help` prints flag reference inline | Phase 10 (this phase) | Users never need to read `review.md` to discover flags |
| `argument-hint` missing `--help` and `--skills` | Full flag list including `--skills` and `--help` | Phase 10 | Tooltip in assistant shows complete signature |

---

## Open Questions

1. **Should the `<context>` flags list in `review.md` be updated to include `--help`?**
   - What we know: The `<context>` block (lines 28–44 of `review.md`) lists flags as a markdown reference for the agent to consult. It currently lists `--post`, `--focus`, and their variants, but does NOT list `--skills` (added in v1.2). If `--skills` is already missing, the list is already incomplete.
   - What's unclear: Whether the `<context>` flags block is authoritative reference or stale documentation.
   - Recommendation: Update the `<context>` block to add both `--skills` and `--help` as part of this phase — it is a documentation-only change that keeps the file self-consistent. However, this is a small discretionary addition not in the locked decisions; the planner may include it as a sub-task or omit it.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is a pure text/markdown edit with no external dependencies. No tools, services, CLIs, or runtimes beyond a text editor are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — project has no test suite (see CLAUDE.md: "No build step, no tests, no linter") |
| Config file | none |
| Quick run command | Manual inspection of the edited `review.md` |
| Full suite command | n/a |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | `--help` in `$ARGUMENTS` prints flag reference and stops | manual-only | n/a — no test framework | n/a |
| DISC-02 | `argument-hint` contains `[--help]` and full flag list | manual-only | grep on `review.md` frontmatter | n/a |

**Justification for manual-only:** The project explicitly has no test suite ("No build step, no tests, no linter" per CLAUDE.md). The validations are trivially verifiable by reading the edited file.

**Lightweight automated check** (can be included as a verification step in the plan):

```bash
# Verify argument-hint contains --help
grep -q '\-\-help' commands/pr-review/review.md && echo "PASS: --help in argument-hint" || echo "FAIL"

# Verify Step 0 exists in process
grep -q 'Step 0\|step 0' commands/pr-review/review.md && echo "PASS: Step 0 present" || echo "FAIL"
```

### Sampling Rate

- **Per task commit:** Manual read of modified `review.md`
- **Per wave merge:** Bash grep checks above
- **Phase gate:** Both grep checks green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing infrastructure (none) covers all phase requirements. The plan needs only a single implementation task and a verification task.

---

## Sources

### Primary (HIGH confidence)

- Direct file read: `commands/pr-review/review.md` — current frontmatter and `<process>` content
- Direct file read: `commands/pr-review/fix.md` — description for "Related commands" section
- Direct file read: `commands/pr-review/setup.md` — description for "Related commands" section
- Direct file read: `agents/pr-reviewer.md` — Step 0 and Step 0.5 patterns, flag parsing via `$ARGUMENTS`
- Direct file read: `.planning/phases/10-command-discoverability/10-CONTEXT.md` — locked decisions D-01 through D-04, exact help output format
- Direct file read: `CLAUDE.md` — project conventions (no emoji, no dependencies, frontmatter format)

### Secondary (MEDIUM confidence)

- Inferred from codebase patterns: `argument-hint` as free-form YAML string controlling autocomplete tooltip (not verified against Claude Code / OpenCode official docs, but consistent across all three command files in the repo)

### Tertiary (LOW confidence)

None.

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md apply to this phase:

| Directive | Impact on Phase 10 |
|-----------|-------------------|
| Zero runtime dependencies | Help output must be a static text block — no npm packages, no dynamic generation |
| No emojis in files unless asked | Help output uses plain ASCII text only |
| Commit messages in English, conventional commits | Commit for this phase: `feat: add --help flag to review command` |
| Agent/command files use YAML frontmatter with `argument-hint` | Confirmed — `review.md` uses this pattern already |
| `argument-hint` format: bracket-notation per existing commands | Append `[--help]` following the same `[--flag]` bracket style |
| No build step, no tests, no linter | Validation is manual + grep; no test files to create |
| YAML frontmatter fields: `name`, `description`, `argument-hint`, `allowed-tools`, `agent` | No new frontmatter fields needed |

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new stack; pure text edit to existing markdown file
- Architecture: HIGH — `<process>` step structure and `argument-hint` field are directly observed from existing files
- Pitfalls: HIGH — derived from direct reading of the current file content and project conventions

**Research date:** 2026-03-31
**Valid until:** Stable — no external dependencies or ecosystem churn. Valid until `review.md` is restructured.
