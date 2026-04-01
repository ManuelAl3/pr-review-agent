# Phase 11: OpenCode Compatibility - Research

**Researched:** 2026-04-01
**Domain:** Cross-runtime compatibility (Claude Code vs OpenCode) for markdown agent/command files
**Confidence:** MEDIUM — OpenCode docs verified via official site; tool auto-mapping behavior has conflicting evidence

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use HTML comment blocks (`<!-- runtime-compat ... -->`) for inline runtime compatibility documentation — invisible to rendered markdown, parseable by tools if needed later
- **D-02:** Place compat blocks right after the closing `---` of YAML frontmatter, before the first `<role>` or `<objective>` tag
- **D-03:** Grep-and-confirm audit — grep all agent/command files for tool name references (frontmatter, inline mentions, instructions), confirm PascalCase throughout, document any oddities in the compat block
- **D-04:** Bash readline fallback — agents detect if AskUserQuestion fails or is unavailable, then fall back to bash readline prompts (extending the existing pattern from reviewer Step 1b)
- **D-05:** Fallback logic lives inline in each agent file near the AskUserQuestion usage point — self-contained per the project's no-shared-modules convention
- **D-06:** Verify key frontmatter fields work on OpenCode: `allowed-tools` (array), `agent` (string reference), `argument-hint` (string with special chars like `< > |`). Quick verification pass during the tool audit step.

### Claude's Discretion
- Exact wording of compat block content per file
- Order of fields within compat blocks
- Specific readline prompt formatting in fallback code

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTCOMPAT-01 | Agent and command files work on OpenCode without modification (PascalCase tool names auto-map, frontmatter parses correctly) | Tool name audit findings + OpenCode frontmatter parsing behavior |
| RTCOMPAT-02 | Runtime differences are documented inline in agent files via compatibility blocks (what works, what degrades, fallback behavior) | Compat block format decisions, AskUserQuestion/question mapping |
</phase_requirements>

---

## Summary

Phase 11 is a compatibility and documentation phase — no new features. It has three workstreams: (1) audit all tool name references across agent and command files and confirm they are PascalCase, (2) add HTML-comment compat blocks to every agent and command file documenting runtime behavior, and (3) insert bash readline fallbacks near every AskUserQuestion usage point.

The codebase audit (done as part of this research) reveals all tool names are already PascalCase in frontmatter and body text. No tool name mismatches exist. The primary compatibility gap is AskUserQuestion: Claude Code has this as a native tool, OpenCode has a `question` tool (different name, similar concept). The bash readline fallback pattern already exists in pr-reviewer.md Step 1b (skill selection) and can be applied to any AskUserQuestion invocations.

OpenCode frontmatter parsing is narrower than Claude Code's. Fields `allowed-tools` (array), `argument-hint`, `color`, and `tools` are either deprecated or silently ignored on OpenCode. The `agent:` field is supported on both. This means the command files will work on OpenCode for routing to agents but lose tool-allowlist enforcement — which is acceptable since OpenCode controls permissions via its own config.

**Primary recommendation:** The three tasks are: (1) tool name audit (READ-ONLY, confirms current state is clean), (2) compat block insertion in 5 files, (3) AskUserQuestion fallback insertion in 2 agent files. Phase is low-risk — all changes are additive (inserting blocks/comments/fallback code, no deletions).

---

## Standard Stack

This phase has no new library dependencies. It is documentation and minor code additions to existing markdown agent files.

### Core Files Being Modified

| File | Type | Current State | Change |
|------|------|---------------|--------|
| `agents/pr-reviewer.md` | Agent | PascalCase tools in frontmatter, has readline fallback in Step 1b | Add compat block + AskUserQuestion fallback |
| `agents/pr-fixer.md` | Agent | PascalCase tools in frontmatter | Add compat block |
| `commands/pr-review/review.md` | Command | `allowed-tools` array, `argument-hint`, `AskUserQuestion` listed | Add compat block |
| `commands/pr-review/fix.md` | Command | `allowed-tools` array, `AskUserQuestion` listed | Add compat block |
| `commands/pr-review/setup.md` | Command | `allowed-tools` array, `AskUserQuestion` listed | Add compat block |

### Installation (none required)

No npm packages to install. Pure markdown edits.

---

## Architecture Patterns

### Recommended Compat Block Format (D-01, D-02)

Based on the format proposed in CONTEXT.md specifics section, with field names confirmed against what we now know about each runtime:

```markdown
---
name: pr-reviewer
tools: Read, Bash, Grep, Glob, Write
color: blue
---

<!-- runtime-compat
runtime: claude-code
  status: full
  notes: All tools native. AskUserQuestion available for interactive prompts.
runtime: opencode
  status: partial
  degraded: AskUserQuestion -> bash readline (readline.createInterface fallback)
  notes: PascalCase tool names are deprecated in opencode (use permission: in config).
         allowed-tools and argument-hint frontmatter fields are silently ignored.
         tools: field is deprecated; permissions managed via opencode.json.
-->

<role>
```

**Placement rule (D-02):** After closing `---` of frontmatter, before first XML tag (`<role>`, `<objective>`, etc.). One blank line before the comment block, one blank line after.

### AskUserQuestion Fallback Pattern (D-04, D-05)

The existing pattern in pr-reviewer.md Step 1b provides the template. It uses bash readline in a Node.js subprocess — compatible with both Claude Code and OpenCode terminals:

```javascript
// Source: agents/pr-reviewer.md Step 1b (existing pattern)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Select skills (all / none / 1,3 / Enter = all): ', (answer) => {
  rl.close();
  // process answer...
});
```

For AskUserQuestion replacement, the pattern is: wrap agent instructions to first attempt AskUserQuestion, and if the context is non-interactive or the tool is unavailable, fall back to a bash readline block that produces the same outcome.

**Per D-05:** Fallback code lives inline in the agent file, near the relevant step. No shared utilities.

### Non-interactive Guard

The existing Step 1b already handles the non-interactive case:

```javascript
// D-09: non-interactive → auto-select all
if (!process.stdin.isTTY) {
  process.stderr.write('[skills] Non-interactive — auto-selected all ' + skills.length + ' skills\n');
  process.exit(0);
}
```

Apply same pattern for any AskUserQuestion replacements: check `process.stdin.isTTY` before attempting readline.

### Anti-Patterns to Avoid

- **Adding tool name placeholders (`__TOOL_READ__` etc.):** Explicitly out of scope per REQUIREMENTS.md "Out of Scope" section. PascalCase works.
- **Modifying `bin/install.js`:** CONTEXT.md states installer is reference-only for this phase.
- **Changing agent execution logic:** This phase adds documentation and fallback paths, not behavior changes.
- **Using AskUserQuestion in new code:** Existing usage in command files (`allowed-tools` list) is documented, not executed — commands list it as a permitted tool. The actual usage is in agent steps.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive user prompts | Custom event loop or signal handlers | Node.js `readline.createInterface` | Already proven pattern in Step 1b |
| Runtime detection | Custom runtime sniffing | Document both paths in compat block | Project decision: no runtime sniffing |
| Tool name translation | Placeholder system | PascalCase as-is | REQUIREMENTS.md explicitly excludes tool name placeholders |

---

## Tool Name Audit Results (D-03)

Direct inspection of all 5 target files — complete findings:

### agents/pr-reviewer.md

**Frontmatter (`tools:` field):**
```yaml
tools: Read, Bash, Grep, Glob, Write
```
Status: PascalCase. Consistent.

**Body text (inline tool references):** None found — steps describe behaviors, not tool names directly.

**AskUserQuestion usage:** NOT present in agent body. The interactive skill selection prompt uses bash readline (Step 1b) — no AskUserQuestion invocation.

### agents/pr-fixer.md

**Frontmatter (`tools:` field):**
```yaml
tools: Read, Edit, Write, Bash, Grep, Glob
```
Status: PascalCase. Consistent.

**Body text:** Steps reference "Edit tool", "Write tool", "Read tool" with PascalCase in prose. Consistent.

**AskUserQuestion usage:** NOT present in agent body. No interactive prompts exist in this agent.

### commands/pr-review/review.md

**Frontmatter (`allowed-tools:` array):**
```yaml
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
```
Status: PascalCase. Consistent. `AskUserQuestion` is listed.

**`argument-hint:` field:** Present with `< > |` special characters — verified content is fine for YAML parsing.

### commands/pr-review/fix.md

**Frontmatter (`allowed-tools:` array):**
```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
```
Status: PascalCase. Consistent. `AskUserQuestion` is listed.

### commands/pr-review/setup.md

**Frontmatter (`allowed-tools:` array):**
```yaml
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
```
Status: PascalCase. Consistent. `AskUserQuestion` is listed.

### Audit Summary

| File | Tool Names | AskUserQuestion | Issues Found |
|------|-----------|-----------------|--------------|
| agents/pr-reviewer.md | All PascalCase | Not invoked | None |
| agents/pr-fixer.md | All PascalCase | Not invoked | None |
| commands/pr-review/review.md | All PascalCase | Listed in allowed-tools | None |
| commands/pr-review/fix.md | All PascalCase | Listed in allowed-tools | None |
| commands/pr-review/setup.md | All PascalCase | Listed in allowed-tools | None |

**Finding:** Zero tool name mismatches. All PascalCase throughout. RTCOMPAT-01 tool name requirement is already satisfied at the source level.

---

## OpenCode Frontmatter Compatibility Details

### Agent Files (`agents/*.md`)

| Field | Claude Code | OpenCode | Behavior |
|-------|-------------|----------|----------|
| `name:` | Supported | Unknown — not in documented fields | Likely silently ignored |
| `description:` | Supported | Supported | Works on both |
| `tools:` | Supported (comma-separated list) | **Deprecated** (use `permission:` instead) | Silently processed or ignored |
| `color:` | Supported | Supported | Works on both |

**Key insight:** On OpenCode, `tools:` is deprecated. The compat block should note that permissions on OpenCode are managed via `opencode.json`, not the agent file's `tools:` field.

### Command Files (`commands/pr-review/*.md`)

| Field | Claude Code | OpenCode | Behavior |
|-------|-------------|----------|----------|
| `name:` | Supported | Not documented | May be silently ignored |
| `description:` | Supported | Supported | Works on both |
| `argument-hint:` | Supported (shows in TUI) | **Not recognized** | Silently ignored |
| `allowed-tools:` | Supported (allowlist enforcement) | **Not recognized** | Silently ignored |
| `agent:` | Supported | Supported | Works on both |

**Key insight:** On OpenCode, commands lose tool allowlisting (`allowed-tools`) and argument hints (`argument-hint`). These are documentation/safety features — losing them does not break execution, only reduces TUI UX and tool restriction enforcement.

### AskUserQuestion Compatibility

| Runtime | Tool Name | Behavior |
|---------|-----------|----------|
| Claude Code | `AskUserQuestion` | Native interactive prompt with structured UI |
| OpenCode | `question` | Native interactive prompt (different API, similar concept) |

**Critical detail:** `AskUserQuestion` is listed in `allowed-tools` of the command files but is NOT actually invoked in the current agent implementations. The agent bodies (pr-reviewer.md, pr-fixer.md) do not contain AskUserQuestion calls — they use bash readline directly. The `allowed-tools` listing is a permission declaration, not an invocation.

**Consequence for planning:** No AskUserQuestion runtime fallback code needs to be added to agent bodies (since they don't call it). The compat block should document: "AskUserQuestion listed in allowed-tools — not invoked; agents use bash readline for all interactive prompts."

---

## Common Pitfalls

### Pitfall 1: Confusing "listed in allowed-tools" with "invoked in agent"
**What goes wrong:** Planner assumes AskUserQuestion is called in the agent flow and writes fallback code inside agent steps.
**Why it happens:** `allowed-tools` in command frontmatter looks like a list of tools the agent will use, but it's a permission allowlist — the agent may or may not actually call every tool listed.
**How to avoid:** Read the agent execution_flow sections to verify actual invocations. AskUserQuestion is not called anywhere in pr-reviewer.md or pr-fixer.md step bodies.
**Warning signs:** If a plan task says "add AskUserQuestion fallback to Step X" — check whether Step X actually calls AskUserQuestion.

### Pitfall 2: Compat block breaks YAML frontmatter parsing
**What goes wrong:** Placing the HTML comment inside the `---` delimiters corrupts the frontmatter.
**Why it happens:** HTML comments are not valid YAML.
**How to avoid:** D-02 is clear — place block AFTER the closing `---`, not inside it. The blank line after `---` before the comment is essential.
**Warning signs:** If the agent fails to load on Claude Code after the edit.

### Pitfall 3: Assuming OpenCode auto-maps PascalCase tool names
**What goes wrong:** Plan assumes no compat issues with tool names because "OpenCode auto-maps."
**Why it happens:** The joshuadavidthomas plugin documentation describes an injection-based mapping, but this is a third-party plugin, not core OpenCode behavior. Core OpenCode uses lowercase.
**How to avoid:** The compat block should NOT state "PascalCase auto-maps" as a fact. Instead, state: "PascalCase tools: field is deprecated on OpenCode; tool permissions managed via opencode.json."
**Warning signs:** Any compat block text claiming auto-mapping without citing an official source.

### Pitfall 4: Compat block format inconsistency across files
**What goes wrong:** Each file gets a slightly different block structure, making future tooling harder.
**Why it happens:** D-01/D-02 lock the comment tag and placement but leave content at discretion.
**How to avoid:** Use the same field names (`runtime:`, `status:`, `degraded:`, `notes:`) in every compat block. Only vary the values.

---

## Code Examples

### Compat Block: Agent File (pr-reviewer.md style)

```markdown
<!-- runtime-compat
runtime: claude-code
  status: full
  notes: All tools native. Interactive prompts use bash readline (not AskUserQuestion).
runtime: opencode
  status: partial
  degraded: tools: field deprecated -> permissions managed via opencode.json
  notes: AskUserQuestion not invoked; bash readline fallback used throughout.
         allowed-tools and argument-hint on command files are silently ignored.
-->
```

### Compat Block: Command File (review.md style)

```markdown
<!-- runtime-compat
runtime: claude-code
  status: full
  notes: allowed-tools enforced, argument-hint displayed in TUI.
runtime: opencode
  status: partial
  degraded: allowed-tools ignored, argument-hint not displayed
  notes: agent: delegation works. Tool permissions via opencode.json instead.
-->
```

### Compat Block: Agent File (pr-fixer.md style)

```markdown
<!-- runtime-compat
runtime: claude-code
  status: full
  notes: All tools native. No interactive prompts in this agent.
runtime: opencode
  status: partial
  degraded: tools: field deprecated -> permissions managed via opencode.json
  notes: No AskUserQuestion usage. Bash/Edit/Write/Read/Grep/Glob all lowercase in opencode.
-->
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tools:` field for OpenCode agents | `permission:` field with allow/deny per tool | OpenCode current | `tools:` silently works or is deprecated; `permission:` is recommended |
| Manual tool name mapping | PascalCase works (deprecated but functional) | OpenCode current | Tools listed as `Read, Bash` still function; exact behavior depends on OpenCode version |

**Deprecated/outdated:**
- `tools:` field in OpenCode agent frontmatter: Use `permission:` for new OpenCode agents. For cross-runtime compatibility, `tools:` in Claude Code + document-in-compat-block for OpenCode is acceptable.
- `allowed-tools:` in command files: Not recognized by OpenCode. Claude Code enforces it; OpenCode ignores it silently.

---

## Open Questions

1. **Does OpenCode actually reject PascalCase tool names at runtime, or only deprecate the `tools:` field?**
   - What we know: OpenCode docs say `tools:` is deprecated in favor of `permission:`. The oh-my-opencode issue shows custom tools fail with PascalCase. Built-in tools (Read, Bash, etc.) may behave differently.
   - What's unclear: Whether built-in PascalCase tool names (`Read`, `Bash`) actually fail or just work via case-insensitive matching.
   - Recommendation: The compat block documents the ambiguity. For RTCOMPAT-01 compliance, since agents use standard bash/node execution (not direct tool calls in agent step bodies), the risk is low. The `tools:` frontmatter field is a declaration, not a call site.

2. **Does OpenCode's `question` tool require explicit listing in `allowed-tools` / `permission`?**
   - What we know: OpenCode has a native `question` tool. It's conditionally included for interactive clients.
   - What's unclear: Whether it requires explicit permission grant.
   - Recommendation: Document in compat block that `question` is the OpenCode equivalent. Since no AskUserQuestion calls exist in agent bodies, this is informational only.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely markdown edits to agent/command files. No external tools, runtimes, services, or CLIs are installed or invoked by the implementation tasks.

---

## Validation Architecture

**nyquist_validation:** enabled (config.json `workflow.nyquist_validation: true`)

### Test Framework

This project has no test suite (CLAUDE.md: "No build step, no tests, no linter. This is a pure distribution package.").

| Property | Value |
|----------|-------|
| Framework | None |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| RTCOMPAT-01 | PascalCase tool names consistent, frontmatter fields correct | manual-only | N/A | Visual grep audit + reading agent files |
| RTCOMPAT-02 | Compat blocks present in all 5 files, correct format | manual-only | N/A | Read each file and verify block exists after `---` |

**Manual-only justification:** The project has no test infrastructure by design (zero-dependency distribution package). Verification is reading the modified files to confirm correct placement and content.

### Wave 0 Gaps

None — no test framework needed or appropriate for this project type.

---

## Sources

### Primary (HIGH confidence)
- [OpenCode Tools docs](https://opencode.ai/docs/tools/) — Lowercase tool names: `read, write, edit, bash, grep, glob, question`
- [OpenCode Agents docs](https://opencode.ai/docs/agents/) — Supported frontmatter: `description`, `mode`, `model`, `color`, `permission`, `tools` (deprecated)
- [OpenCode Commands docs](https://opencode.ai/docs/commands/) — Supported command fields: `description`, `agent`, `model`, `subtask`
- [OpenCode Skills docs](https://opencode.ai/docs/skills/) — "Unknown frontmatter fields are ignored"
- Direct file inspection — `agents/pr-reviewer.md`, `agents/pr-fixer.md`, `commands/pr-review/*.md`

### Secondary (MEDIUM confidence)
- [DeepWiki OpenCode question system](https://deepwiki.com/sst/opencode/2.5-permission-and-question-system) — `question` tool name confirmed
- [Claude Code plugin for OpenCode](https://github.com/unixfox/opencode-claude-code-plugin) — AskUserQuestion rendered as text, not mapped to OpenCode tool
- [OpenCode issue #5960](https://github.com/anomalyco/opencode/issues/5960) — AskUserQuestion equivalent feature request (closed as duplicate)

### Tertiary (LOW confidence)
- [Claude Code compatibility plugin docs](https://lzw.me/docs/opencodedocs/joshuadavidthomas/opencode-agent-skills/advanced/claude-code-compatibility/) — Claims PascalCase auto-mapping via plugin injection; this is third-party plugin behavior, not core OpenCode
- [oh-my-opencode issue #778](https://github.com/code-yeongyu/oh-my-opencode/issues/778) — PascalCase causes "invalid" errors for custom tools (unclear if same applies to built-in tools)

---

## Metadata

**Confidence breakdown:**
- Tool name audit: HIGH — direct file inspection, all 5 files read
- OpenCode frontmatter parsing: MEDIUM — official docs verified; exact behavior for deprecated fields not 100% confirmed
- AskUserQuestion behavior: MEDIUM — confirmed not invoked in agent bodies; `question` as OpenCode equivalent confirmed via deepwiki
- PascalCase auto-mapping claim: LOW — third-party plugin docs only, contradicted by oh-my-opencode issue

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (OpenCode docs may change; check opencode.ai/docs for version updates)
