# Phase 7: Skill Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 07-Skill Discovery
**Areas discussed:** Directory scanning strategy, Frontmatter parsing approach, Deduplication logic, Output data structure

---

## Directory Scanning Strategy

### Q1: How should skill directories be resolved?

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from PR_REVIEW_DIR parent | Go up one level from PR_REVIEW_DIR to get config root, then append skills/. Works for all runtimes. | ✓ |
| Scan project root directly | Glob skill dirs directly from cwd. Simpler but doesn't reuse resolved config dir. | |

**User's choice:** Derive from PR_REVIEW_DIR parent
**Notes:** None

### Q2: Should discovery scan ALL known config directories or only the active runtime's?

| Option | Description | Selected |
|--------|-------------|----------|
| All known directories | Scan .claude/skills/, .opencode/skills/, .agents/skills/, .config/opencode/skills/ regardless of active runtime | ✓ |
| Only active runtime's dir | Only scan the dir matching the installed runtime | |

**User's choice:** All known directories
**Notes:** None

---

## Frontmatter Parsing Approach

### Q3: How should YAML frontmatter be parsed?

| Option | Description | Selected |
|--------|-------------|----------|
| Regex-based minimal parser | Split on --- delimiters, extract name/description with regex. Zero-dep compliant. | ✓ |
| Line-by-line key: value parser | More robust for edge cases but more code. | |

**User's choice:** Regex-based minimal parser
**Notes:** None

### Q4: What fallback when a skill file has no frontmatter?

| Option | Description | Selected |
|--------|-------------|----------|
| Use filename as name, no description | Strip extension from filename, use as skill name. Description is empty string. | ✓ |
| Use directory name as name | Use parent dir name if skills organized in subdirs. | |

**User's choice:** Use filename as name, no description
**Notes:** None

---

## Deduplication Logic

### Q5: When the same skill name appears in multiple directories, which takes priority?

| Option | Description | Selected |
|--------|-------------|----------|
| First found wins, fixed priority order | .claude/ > .opencode/ > .agents/ > .config/opencode/. First occurrence kept, later dropped. | ✓ |
| Keep all, warn on duplicates | Include both with source dir disambiguation. | |

**User's choice:** First found wins, fixed priority order
**Notes:** None

### Q6: How should duplicates be detected?

| Option | Description | Selected |
|--------|-------------|----------|
| By parsed name field | Two files with same frontmatter name: are duplicates even if filenames differ. | ✓ |
| By filename | Only detect duplicates when same filename in multiple dirs. | |

**User's choice:** By parsed name field
**Notes:** None

---

## Output Data Structure

### Q7: What shape should the discovered skills data take?

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory array, no file | Discovery returns array of skill objects in memory. No intermediate file. | ✓ |
| Write skills.json to PR_REVIEW_DIR | Persist discovered skills to JSON file. | |

**User's choice:** In-memory array, no file
**Notes:** None

### Q8: Should skill objects include full file content at discovery time?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer content to Phase 9 | Discovery only reads frontmatter. Full content read at injection time. | ✓ |
| Read full content at discovery | Each skill object includes entire file content. | |

**User's choice:** Defer content to Phase 9
**Notes:** None

---

## Claude's Discretion

- Exact regex patterns for frontmatter parsing
- File enumeration strategy within skill dirs (glob vs readdir)
- Error handling for unreadable/corrupt skill files
- Sort order of the skills array

## Deferred Ideas

None — discussion stayed within phase scope
