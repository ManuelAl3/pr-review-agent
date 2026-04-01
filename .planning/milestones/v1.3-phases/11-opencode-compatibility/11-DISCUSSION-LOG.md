# Phase 11: OpenCode Compatibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 11-opencode-compatibility
**Areas discussed:** Compatibility block format, Tool name verification, AskUserQuestion handling, Frontmatter compatibility

---

## Compatibility Block Format

| Option | Description | Selected |
|--------|-------------|----------|
| HTML comment block | Invisible to rendered markdown, parseable by tools later | ✓ |
| Markdown section at bottom | Visible ## Runtime Compatibility section, human-readable but adds noise | |
| Structured XML tag | `<runtime_compat>` tag matching existing agent tag conventions | |

**User's choice:** HTML comment block
**Notes:** None — straightforward pick

### Follow-up: Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Right after frontmatter | Between closing --- and first tag | ✓ |
| At the very end of file | After last section | |
| Inside frontmatter as YAML comment | Compact but may not survive parsers | |

**User's choice:** Right after frontmatter

---

## Tool Name Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Grep-and-confirm | Grep all files for tool references, confirm PascalCase, document oddities | ✓ |
| Minimal — trust existing state | Just add a note in compat block | |
| Full audit with OpenCode docs | Research exact tool list, cross-reference everything | |

**User's choice:** Grep-and-confirm

---

## AskUserQuestion Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Bash readline fallback | Detect if unavailable, fall back to readline. Extend existing Step 1b pattern | ✓ |
| Remove interactive prompts entirely | Non-interactive with defaults on OpenCode | |
| Document as known limitation | List as unsupported, no fallback code | |

**User's choice:** Bash readline fallback

### Follow-up: Fallback Location

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in each agent | Self-contained, matches no-shared-modules convention | ✓ |
| Pattern in compat block, agents reference it | Document once, reference from usage points | |

**User's choice:** Inline in each agent

---

## Frontmatter Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Verify key fields | Check allowed-tools, agent, argument-hint parse correctly | ✓ |
| Trust YAML standard | Standard YAML should work everywhere | |
| Add OpenCode-specific fields | Research if OpenCode expects additional fields | |

**User's choice:** Verify key fields

---

## Claude's Discretion

- Exact wording of compat block content per file
- Order of fields within compat blocks
- Specific readline prompt formatting in fallback code

## Deferred Ideas

None — discussion stayed within phase scope
