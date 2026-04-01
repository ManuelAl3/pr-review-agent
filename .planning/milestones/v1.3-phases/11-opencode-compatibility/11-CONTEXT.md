# Phase 11: OpenCode Compatibility - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent and command files work correctly on OpenCode with no manual modification after install. This phase audits tool names, adds inline compatibility documentation, extends AskUserQuestion fallbacks, and verifies frontmatter parsing. No new features — only compatibility and documentation of runtime differences.

</domain>

<decisions>
## Implementation Decisions

### Compatibility block format
- **D-01:** Use HTML comment blocks (`<!-- runtime-compat ... -->`) for inline runtime compatibility documentation — invisible to rendered markdown, parseable by tools if needed later
- **D-02:** Place compat blocks right after the closing `---` of YAML frontmatter, before the first `<role>` or `<objective>` tag

### Tool name verification
- **D-03:** Grep-and-confirm audit — grep all agent/command files for tool name references (frontmatter, inline mentions, instructions), confirm PascalCase throughout, document any oddities in the compat block

### AskUserQuestion handling
- **D-04:** Bash readline fallback — agents detect if AskUserQuestion fails or is unavailable, then fall back to bash readline prompts (extending the existing pattern from reviewer Step 1b)
- **D-05:** Fallback logic lives inline in each agent file near the AskUserQuestion usage point — self-contained per the project's no-shared-modules convention

### Frontmatter compatibility
- **D-06:** Verify key frontmatter fields work on OpenCode: `allowed-tools` (array), `agent` (string reference), `argument-hint` (string with special chars like `< > |`). Quick verification pass during the tool audit step.

### Claude's Discretion
- Exact wording of compat block content per file
- Order of fields within compat blocks
- Specific readline prompt formatting in fallback code

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Agent files (to be audited and modified)
- `agents/pr-reviewer.md` — Review agent: tool names in frontmatter + inline, AskUserQuestion usage, existing bash readline fallback in Step 1b
- `agents/pr-fixer.md` — Fix agent: tool names in frontmatter + inline, AskUserQuestion usage points

### Command files (to be audited and modified)
- `commands/pr-review/review.md` — Review command: `allowed-tools` array, `argument-hint` field, `agent` reference
- `commands/pr-review/fix.md` — Fix command: `allowed-tools` array, `agent` reference
- `commands/pr-review/setup.md` — Setup command: `allowed-tools` array, no agent reference

### Installer (reference only — not modified in this phase)
- `bin/install.js` — RUNTIMES config with OpenCode paths, `__CONFIG_DIR__` placeholder rewriting

### Requirements
- `.planning/REQUIREMENTS.md` — RTCOMPAT-01 (tool name auto-mapping), RTCOMPAT-02 (inline compatibility blocks)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pr-reviewer.md` Step 1b already has a bash readline fallback for skill selection when `AskUserQuestion` is unavailable — this pattern can be extended to all interactive points
- `__CONFIG_DIR__` placeholder system already handles path differences between Claude Code and OpenCode

### Established Patterns
- Tool names in frontmatter use comma-separated list for agents (`tools: Read, Bash, Grep, Glob, Write`) and YAML array for commands (`allowed-tools: [Read, Write, ...]`)
- All tool names are already PascalCase across the codebase
- Agent files use XML-like tags (`<role>`, `<execution_flow>`, `<constraints>`) — compat block as HTML comment is consistent with this tag-based structure
- Self-contained files with no shared modules — each agent duplicates utilities locally

### Integration Points
- Every `.md` file in `agents/` and `commands/pr-review/` gets a compat block added
- AskUserQuestion fallback code inserts near existing interactive prompts in agent execution flows
- No changes to `bin/install.js`, `template/serve.js`, or `template/index.html`

</code_context>

<specifics>
## Specific Ideas

- Compat block placement example:
  ```
  ---
  name: pr-reviewer
  tools: Read, Bash, Grep, Glob, Write
  color: blue
  ---

  <!-- runtime-compat
  runtime: claude-code
    status: full
    notes: All tools native
  runtime: opencode
    status: partial
    degraded: AskUserQuestion -> bash readline
    notes: PascalCase tools auto-map
  -->

  <role>
  You are a PR Review Agent...
  ```
- STATE.md blocker note: "OpenCode tool name exact values are MEDIUM confidence (community source). Verify against opencode.ai/docs/tools/ before writing installer tool map." — this phase should resolve this uncertainty during the grep-and-confirm audit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-opencode-compatibility*
*Context gathered: 2026-04-01*
