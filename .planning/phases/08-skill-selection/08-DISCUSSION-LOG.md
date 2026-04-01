# Phase 8: Skill Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 08-skill-selection
**Areas discussed:** Selection prompt UX, Flag design (--skills), Non-interactive fallback, Selection data flow

---

## Selection Prompt UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline numbered list | Print numbered list in agent output, user types all/none/numbers | ✓ |
| AskUserQuestion multi-select | Use Claude Code's built-in multiSelect checkboxes | |
| Simple yes/no per skill | Ask one yes/no per skill | |

**User's choice:** Inline numbered list
**Notes:** Consistent with terminal-based UX, works in any environment

### Default behavior on empty input

| Option | Description | Selected |
|--------|-------------|----------|
| Default to all | Empty input = all skills selected | ✓ |
| Require explicit input | Empty input re-prompts | |

**User's choice:** Default to all
**Notes:** Lowest friction for common case

### Source directory display

**User's choice:** Claude's discretion — user said "I want the best UX for the user"
**Notes:** No source directory shown. Clean output with name + description only. ASEL-02 (source display) is already in Future Requirements, not v1.2 scope.

---

## Flag Design (--skills)

### Flag parsing layer

| Option | Description | Selected |
|--------|-------------|----------|
| Agent layer | pr-reviewer.md parses --skills from $ARGUMENTS | ✓ |
| Command layer | review.md pre-processes --skills | |
| Split responsibility | Command documents, agent parses, shared validation | |

**User's choice:** Agent layer
**Notes:** Consistent with how --post and --focus are already handled

### Flag syntax

| Option | Description | Selected |
|--------|-------------|----------|
| all / none / name1,name2 | Match interactive prompt inputs, select by skill name | ✓ |
| all / none / numbers | Select by discovery order number | |
| all / none only | No per-skill flag selection | |

**User's choice:** all / none / name1,name2
**Notes:** Names are stable across runs unlike numbers

### Unknown skill name handling

| Option | Description | Selected |
|--------|-------------|----------|
| Warn and skip unknown | Print warning, continue with matched skills | ✓ |
| Fail with error | Exit immediately on mismatch | |
| Silently ignore | Skip without output | |

**User's choice:** Warn and skip unknown
**Notes:** Forgiving — typo doesn't break the review

---

## Non-Interactive Fallback

### Detection method

| Option | Description | Selected |
|--------|-------------|----------|
| Check process.stdin.isTTY | Standard Node.js approach | ✓ |
| Check CI env vars | Look for CI=true, GITHUB_ACTIONS, etc. | |
| Always require --skills in CI | No auto-detection | |

**User's choice:** process.stdin.isTTY
**Notes:** Already a pattern used in bin/install.js

### Log target

| Option | Description | Selected |
|--------|-------------|----------|
| stderr | Doesn't pollute stdout | ✓ |
| stdout | Inline with review output | |
| Silent | No message | |

**User's choice:** stderr
**Notes:** Standard practice for informational CLI messages

---

## Selection Data Flow

### Passing selected skills downstream

| Option | Description | Selected |
|--------|-------------|----------|
| Filter in-memory, overwrite temp file | Overwrite /tmp/skills.json with selected only | ✓ |
| Separate selected file | Write /tmp/selected-skills.json alongside full list | |
| Shell variable only | Pass as SELECTED_SKILLS env var | |

**User's choice:** Filter in-memory, overwrite temp file
**Notes:** Minimal change to existing flow, Phase 9 reads same file

### Selection confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Brief confirmation line | "Using N skills: name1, name2" | ✓ |
| No confirmation | Go straight to review | |
| Detailed confirmation | Show name + description per selected skill | |

**User's choice:** Brief confirmation line
**Notes:** Quick feedback without cluttering output

---

## Claude's Discretion

- Exact formatting of the numbered list (padding, alignment, colors)
- Whether to show source directory alongside skills (decided: no, for cleaner UX)
- How to handle exactly 1 skill (still show prompt or auto-select)
- Exact wording of warning messages for unknown skill names

## Deferred Ideas

None — discussion stayed within phase scope
