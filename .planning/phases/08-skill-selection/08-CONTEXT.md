# Phase 8: Skill Selection - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

The developer explicitly chooses which skills apply before the review analysis runs. This phase adds an interactive selection prompt and a `--skills` flag to the review agent. No skill content is injected into the review (that's Phase 9) — this phase only filters the discovered skills array down to the user's selection.

</domain>

<decisions>
## Implementation Decisions

### Selection Prompt UX
- **D-01:** Inline numbered list printed directly in the agent output — no AskUserQuestion widget, no external UI. Each skill shows its number, name, and description on one line
- **D-02:** User types `all`, `none`, or a comma-separated list of numbers (e.g., `1,3`) to select skills
- **D-03:** Empty input (just pressing Enter) defaults to selecting all skills — lowest friction for the common case
- **D-04:** Brief confirmation line after selection: `Using N skills: name1, name2` — then continues to review

### Flag Design (--skills)
- **D-05:** `--skills` flag parsed in `pr-reviewer.md` (agent layer), same as `--post` and `--focus`. `review.md` only documents it in `argument-hint`
- **D-06:** Supported values: `--skills all`, `--skills none`, `--skills name1,name2` (comma-separated skill names, no spaces)
- **D-07:** When `--skills` is present, the interactive prompt is skipped entirely
- **D-08:** Unknown skill names in `--skills` produce a warning and are skipped; matched skills proceed. Review does not fail on a typo

### Non-Interactive Fallback
- **D-09:** Detect non-interactive environment via `process.stdin.isTTY` (standard Node.js check). If not a TTY and no `--skills` flag present, auto-select all skills
- **D-10:** Auto-selection log message goes to stderr: `[skills] Non-interactive — auto-selected all N skills`

### Selection Data Flow
- **D-11:** After selection, filter the in-memory skills array and overwrite `/tmp/skills.json` with only the selected skills. Phase 9 reads this same file for content injection
- **D-12:** Selection logic runs as a new sub-step (Step 1b) immediately after discovery in pr-reviewer.md Step 1

### Claude's Discretion
- Exact formatting of the numbered list (padding, alignment, colors)
- How to handle the edge case of exactly 1 skill (still show prompt or auto-select)
- Exact wording of warning messages for unknown skill names

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SEL-01 (interactive prompt), SEL-02 (--skills flag), SEL-03 (no prompt when zero skills)

### Existing Agent Structure
- `agents/pr-reviewer.md` — Step 1 lines 84-157: skill discovery code, /tmp/skills.json write, SKILL_COUNT check. Selection logic inserts after this block
- `commands/pr-review/review.md` — argument-hint field (line 4): needs `--skills` added to flag documentation

### Prior Phase Context
- `.planning/phases/07-skill-discovery/07-CONTEXT.md` — D-08 through D-10: discovery output format, in-memory array structure, Step 1 integration point

### Project Conventions
- `.planning/codebase/CONVENTIONS.md` — Zero-dep constraint, naming patterns, inline node -e pattern for JS in agents
- `.planning/codebase/STRUCTURE.md` — Agent file structure, where to add new code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Skill discovery inline JS in `pr-reviewer.md` Step 1 (lines 86-152) — produces `SKILLS_JSON` and writes `/tmp/skills.json`. Selection step consumes this output directly
- `SKILL_COUNT` variable already computed after discovery — can gate whether to show the prompt
- `bin/install.js` has `process.stdin.isTTY` check pattern and ANSI color constants for terminal output

### Established Patterns
- Agent reads `$ARGUMENTS` directly and parses flags with string matching (see `--post` and `--focus` handling)
- Inline `node -e` blocks for JavaScript logic within agent markdown steps
- Guard clauses: if no skills found, skip silently (Phase 7 D-03)
- `process.stdout.write()` for output, `console.error()` for stderr messages

### Integration Points
- `pr-reviewer.md` Step 1, after line 157 (after `SKILL_COUNT` check) — new Step 1b for selection
- `review.md` line 4 `argument-hint` — add `[--skills all|none|name1,name2]`
- `/tmp/skills.json` — overwritten with selected-only array, consumed by Phase 9

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-skill-selection*
*Context gathered: 2026-03-31*
