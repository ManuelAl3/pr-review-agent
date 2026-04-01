# Phase 10: Command Discoverability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 10-command-discoverability
**Areas discussed:** Help output format, Help intercept location, Cross-command awareness, argument-hint update

---

## Help output format

| Option | Description | Selected |
|--------|-------------|----------|
| Simple flag list | Clean list: each flag on its own line with a short description. Like `gh pr --help`. Minimal, scannable. | ✓ |
| Grouped sections | Flags grouped by purpose (review options, output options, help). More structured but heavier. | |
| Markdown table | A table with Flag, Description, Default columns. Renders well but feels heavy for 4 flags. | |

**User's choice:** Simple flag list
**Notes:** User selected the preview showing usage line, flags section, and prerequisites section.

---

## Help intercept location

| Option | Description | Selected |
|--------|-------------|----------|
| Step 0 in command process | Add a new Step 0 in review.md's process that checks for --help before anything else. Agent never loads. | ✓ |
| Early check in agent file | Add --help detection at the top of pr-reviewer.md's execution flow. Agent loads but exits immediately. | |
| Separate help command | Create a new command file commands/pr-review/help.md invoked as /pr-review:help. | |

**User's choice:** Step 0 in command process
**Notes:** None

---

## Cross-command awareness

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, brief mentions | Add a "Related commands" section at the bottom with one-line descriptions of setup and fix. | ✓ |
| No, review flags only | Keep --help strictly about the review command. | |
| Full cross-reference | Show each related command with its own flags. Comprehensive but noisy. | |

**User's choice:** Yes, brief mentions
**Notes:** User selected the preview showing "Related commands" section with setup and fix one-liners.

---

## argument-hint update

| Option | Description | Selected |
|--------|-------------|----------|
| Append --help | Just add [--help] to the existing hint string. Current hint already lists all v1.2 flags correctly. | ✓ |
| Shorten to key flags only | Trim to essentials: "<pr-url-or-number> [flags]" and let --help show the full list. | |
| Restructure with line breaks | Break into multiple lines for readability. May not render well in all tooltip contexts. | |

**User's choice:** Append --help
**Notes:** None

## Claude's Discretion

- Exact column alignment/spacing in help output
- Whether to include a version number
- Prerequisites wording

## Deferred Ideas

None
