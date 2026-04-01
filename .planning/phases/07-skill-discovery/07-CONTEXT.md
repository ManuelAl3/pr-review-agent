# Phase 7: Skill Discovery - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

The review agent silently detects all skill files in the project's skill directories before any review begins. Discovery produces an in-memory array of skill metadata (name, description, path, source). No user interaction, no file output, no content injection — those are Phase 8 and Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Directory Scanning Strategy
- **D-01:** Derive the config root from `PR_REVIEW_DIR` by going up one level (`path.dirname(PR_REVIEW_DIR)`), then append `skills/` to get the primary skill directory
- **D-02:** Scan ALL known config directories regardless of which runtime is active: `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, `.config/opencode/skills/` — resolved relative to the project root
- **D-03:** Missing directories are silently skipped (no errors, no warnings, no prompts)

### Frontmatter Parsing Approach
- **D-04:** Use regex-based minimal parser — split on `---` delimiters, extract `name` and `description` fields with regex. No YAML library (zero-dep constraint)
- **D-05:** When a skill file has no frontmatter, use the filename (stripped of extension) as the skill name and empty string as description. The skill is still discoverable

### Deduplication Logic
- **D-06:** First-found-wins with fixed priority order: `.claude/skills/` > `.opencode/skills/` > `.agents/skills/` > `.config/opencode/skills/`. First occurrence of a name is kept, later duplicates silently dropped
- **D-07:** Duplicates detected by parsed `name` field (not filename). Two files with different names but same frontmatter `name:` are considered duplicates

### Output Data Structure
- **D-08:** Discovery produces an in-memory array of skill objects — no intermediate file written to disk. Phase 8 selection UI consumes this array directly
- **D-09:** Each skill object contains: `{ name, description, path, source }` — content is NOT read at discovery time, deferred to Phase 9 (Context Injection)
- **D-10:** Discovery logic runs inline in the review agent's Step 1 (Load Review Context), not as a separate step

### Claude's Discretion
- Exact regex patterns for frontmatter parsing
- How to enumerate `.md` files within each skill directory (glob vs readdir)
- Error handling for unreadable/corrupt skill files (skip silently vs warn)
- Whether to sort the skills array (alphabetical, by source dir, or insertion order)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SKILL-01 (directory scanning) and SKILL-02 (frontmatter parsing with fallback)

### Existing Agent Structure
- `agents/pr-reviewer.md` — Step 0.5 (PR_REVIEW_DIR detection) and Step 1 (Load Review Context where discovery will be added)

### Project Conventions
- `.planning/codebase/CONVENTIONS.md` — Zero-dep constraint, naming patterns, function design guidelines
- `.planning/codebase/STRUCTURE.md` — Where to add new code, agent file structure, placeholder system

### Prior Decisions
- `.planning/STATE.md` — Accumulated decisions section: skill paths project-local only, derive from PR_REVIEW_DIR, use path.join() for Windows safety

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PR_REVIEW_DIR` resolution in `agents/pr-reviewer.md` Step 0.5 — already resolves the config directory, can derive skill paths from `path.dirname()`
- YAML frontmatter pattern used throughout `agents/` and `commands/` — same `---` delimiter format that skill files use
- `path.join()` usage in `bin/install.js` — established cross-platform path handling pattern

### Established Patterns
- Agent execution flows use inline Bash with `node -e` for JavaScript logic (see Step 4 of pr-reviewer.md)
- Zero-dependency constraint: all file I/O uses `fs`, `path` built-ins
- Guard clauses with early returns for missing files/dirs

### Integration Points
- Step 1 of `agents/pr-reviewer.md` already has line "Read any project skills for architectural patterns" — discovery logic slots in here
- `commands/pr-review/review.md` Step 4 references "Load project context (project instructions, skills, REVIEW-PLAN.md)" — command layer already expects skills

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

*Phase: 07-skill-discovery*
*Context gathered: 2026-03-31*
