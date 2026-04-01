# Phase 10: Command Discoverability - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can discover all available review command flags without reading source files. This phase adds a `--help` flag to the review command and updates the `argument-hint` frontmatter. No new review capabilities — just discoverability of existing ones.

</domain>

<decisions>
## Implementation Decisions

### Help output format
- **D-01:** Simple flag list format (like `gh pr --help`) — usage line at top, each flag on its own line with aligned descriptions, prerequisites section at bottom
- **D-02:** Include a "Related commands" section at the bottom mentioning `/pr-review:setup` and `/pr-review:fix` with one-line descriptions

### Help intercept location
- **D-03:** Add a new Step 0 in `review.md`'s `<process>` section that checks for `--help` in `$ARGUMENTS` before anything else — if found, print the flag reference and stop. The agent never loads.

### argument-hint update
- **D-04:** Append `[--help]` to the existing `argument-hint` string in review.md frontmatter. Do not restructure or shorten the existing hint.

### Claude's Discretion
- Exact column alignment/spacing in the help output
- Whether to include a version number in the help output
- Prerequisites wording

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Command definition
- `commands/pr-review/review.md` -- The review command file to modify (frontmatter + process steps)

### Related commands (for help output content)
- `commands/pr-review/fix.md` -- Fix command description needed for "Related commands" section
- `commands/pr-review/setup.md` -- Setup command description needed for "Related commands" section

### Agent (flag parsing reference)
- `agents/pr-reviewer.md` -- Shows existing flag parsing patterns (regex on ARGUMENTS). NOT modified in this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `review.md` already has a well-structured `<process>` section with numbered steps — Step 0 inserts cleanly before Step 1
- `argument-hint` in frontmatter already lists all v1.2 flags in a consistent format

### Established Patterns
- Flag parsing uses regex on `$ARGUMENTS` (e.g., `args.match(/--skills\s+(\S+)/)`)
- Process steps are numbered sequentially in `<process>` blocks
- Command files use YAML frontmatter with `argument-hint` for tooltip display

### Integration Points
- `review.md` `<process>` section — new Step 0 before existing Step 1
- `review.md` frontmatter `argument-hint` — append `[--help]`

</code_context>

<specifics>
## Specific Ideas

The help output should look like this:

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

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 10-command-discoverability*
*Context gathered: 2026-03-31*
