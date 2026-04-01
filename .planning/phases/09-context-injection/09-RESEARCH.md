# Phase 9: Context Injection - Research

**Researched:** 2026-03-31
**Domain:** Agent markdown authoring — injecting skill file content as mandatory review criteria and persisting skill names to config.json
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New Step 1c in pr-reviewer.md, immediately after skill selection (Step 1b). Reads each selected skill file and outputs content under `## Active Skills Context` heading
- **D-02:** Step 1c reads `/tmp/skills.json` (already filtered by selection), reads the `path` field of each skill object, and outputs the content as agent-visible context
- **D-03:** Step 2 (analyze_changes) treats Active Skills Context as mandatory criteria equal to REVIEW-PLAN.md — violations of skill-defined patterns produce findings with the same schema
- **D-04:** Each skill gets a `### {skill-name} ({source-dir})` heading followed by the full file content with YAML frontmatter stripped
- **D-05:** Frontmatter stripping uses the same `---` delimiter pattern already established in Phase 7's discovery code
- **D-06:** Skills are output in the order they appear in `/tmp/skills.json` (preserves discovery priority order from Phase 7 D-06)
- **D-07:** Add a `skills` field to config.json containing a simple array of skill name strings (e.g., `["design-tokens", "i18n-patterns"]`)
- **D-08:** When no skills are selected, `skills` is an empty array `[]` — config.json is still written normally
- **D-09:** The `skills` field is written in Step 3b alongside existing PR metadata and category definitions
- **D-10:** No size cap — inject full skill file content regardless of length. Real-world skill files are typically 50-200 lines
- **D-11:** ASEL-01 (truncation at 500-line cap) remains a future requirement — not implemented in this phase

### Claude's Discretion

- Exact `node -e` implementation for reading skill files and stripping frontmatter
- Error handling for unreadable skill files (skip silently vs warn on stderr)
- Whether Step 1c outputs content via `echo` or `cat` or inline JS
- Exact placement of `## Active Skills Context` in Step 2's analysis instructions

### Deferred Ideas (OUT OF SCOPE)

- ASEL-01: Skill content truncation (500-line cap) — future requirement
- GSKILL-01: Global skills (~/.claude/skills/) — only project-local for now per REQUIREMENTS.md
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | Selected skill content is injected as mandatory review criteria alongside REVIEW-PLAN.md | Step 1c pattern with `## Active Skills Context` heading; Step 2 instruction update to treat it as mandatory criteria |
| CTX-02 | Selected skills are recorded in config.json for traceability in the review output | `skills` array field added to config.json write in Step 3b |
</phase_requirements>

---

## Summary

Phase 9 is a pure agent-markdown authoring task within `agents/pr-reviewer.md`. No new files, no new tools, no external dependencies. It has three discrete editing locations: (1) insert Step 1c after Step 1b's selection code, (2) update Step 2's analysis instructions, and (3) extend Step 3b's config.json write to include a `skills` field.

The entire implementation follows patterns already established in Phases 7 and 8. The frontmatter-stripping regex from Phase 7's discovery code is directly reusable. The `/tmp/skills.json` file written by Phase 8 is the input for Step 1c — no new IPC mechanism is needed. The config.json write in Step 3b is currently prose-only (no code block); the planner must draft the exact write block while adding the `skills` field.

**Primary recommendation:** Three surgical edits to `agents/pr-reviewer.md` — add Step 1c, update Step 2 instructions, extend Step 3b. No other files require changes unless the `argument-hint` in `review.md` also needs updating (it does not — --skills was already added in Phase 8).

---

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | >= 18.0.0 | Read skill files, strip frontmatter, output content | Zero-dep constraint; already used throughout agents |
| Inline `node -e` blocks | — | JavaScript logic embedded in agent markdown steps | Established pattern in pr-reviewer.md (Step 1, Step 4) |
| `/tmp/skills.json` | — | IPC between Step 1b (selection) and Step 1c (injection) | Written by Phase 8; just needs to be read |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `process.stdout.write()` | — | Output skill content as agent-visible context | When content must flow directly into the agent's reasoning context |
| `process.stderr.write()` | — | Warn on unreadable skill files | When a file is listed in skills.json but cannot be read at runtime |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node -e` inline | `cat` + bash variable | `cat` works for file read but frontmatter stripping requires JS; node -e is already established |
| `process.stdout.write()` | `echo` via bash | `echo` introduces quoting complexity with multi-line content; node handles it cleanly |

**Installation:** No new packages required.

---

## Architecture Patterns

### Exact Insert Point in pr-reviewer.md

```
<step name="load_context" priority="first">
## Step 1: Load Review Context
  ...
  [line ~84-157]  Step 1 (skill discovery)
  [line ~159-260] Step 1b (skill selection)   ← Phase 8 already here
  [HERE]          Step 1c (skill injection)    ← Phase 9 inserts here
  [line ~262+]    Parse PR URL from arguments  ← existing code continues
```

### Pattern 1: Step 1c — Read and Output Skill Content

The entire step runs as a single `node -e` block, guarded by a SKILL_COUNT check. If SKILL_COUNT is 0, the block is skipped without any output.

**What:** Read each skill object's `path` from `/tmp/skills.json`, load the file, strip frontmatter, and output under labeled headings.

**When to use:** Immediately after the SKILL_COUNT re-check that Phase 8 writes at the end of its selection block.

**Example (verified pattern — zero-dep, matches existing Phase 7/8 style):**

```javascript
// Source: derived from Phase 7 discovery code in pr-reviewer.md lines 126-145
node -e "
const fs = require('fs');
const path = require('path');

let skills;
try {
  skills = JSON.parse(fs.readFileSync('/tmp/skills.json', 'utf8'));
} catch(e) {
  process.exit(0); // No skills file or unparseable — skip silently
}

if (!skills || skills.length === 0) process.exit(0);

process.stdout.write('\n## Active Skills Context\n\n');
process.stdout.write('The following skill definitions are MANDATORY review criteria.\n');
process.stdout.write('Treat violations of skill-defined patterns the same as REVIEW-PLAN.md violations.\n\n');

for (const skill of skills) {
  let content;
  try {
    content = fs.readFileSync(skill.path, 'utf8');
  } catch(e) {
    process.stderr.write('[skills] Could not read skill file: ' + skill.path + ' — skipped\n');
    continue;
  }

  // Strip YAML frontmatter (same --- delimiter pattern as Phase 7 discovery)
  const fm = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const body = fm ? content.slice(fm[0].length) : content;

  process.stdout.write('### ' + skill.name + ' (' + skill.source + ')\n\n');
  process.stdout.write(body.trim() + '\n\n');
}
"
```

### Pattern 2: Step 2 — Mandatory Criteria Reference

Update the `analyze_changes` step to explicitly list Active Skills Context alongside REVIEW-PLAN.md as required criteria. The current text says:

```
2. Analyze against REVIEW-PLAN.md checklist categories.
```

Should become:

```
2. Analyze against:
   - REVIEW-PLAN.md checklist categories
   - Active Skills Context (from Step 1c, if present) — treat as mandatory criteria equal to REVIEW-PLAN.md.
     Skill-defined pattern violations produce findings with the same 10-field schema.
     Use the skill name as the `category` field when no REVIEW-PLAN.md category matches.
```

### Pattern 3: Step 3b — config.json with skills field

The current Step 3b is prose-only. It should write config.json with a `skills` field. The `SKILL_COUNT` variable and `/tmp/skills.json` are available at this point.

```javascript
// Source: derived from existing config.json write pattern in pr-reviewer.md Step 3b
node -e "
const fs = require('fs');

// Read selected skills for traceability (D-07, D-08)
let skillNames = [];
try {
  const skills = JSON.parse(fs.readFileSync('/tmp/skills.json', 'utf8'));
  skillNames = skills.map(s => s.name);
} catch(e) {
  skillNames = []; // Safe default: no skills
}

const config = {
  pr: {
    number: process.env.PR_NUMBER,
    title: process.env.PR_TITLE,
    repo: process.env.REPO,
    head: process.env.HEAD_REF,
    base: process.env.BASE_REF,
    state: process.env.PR_STATE,
    changedFiles: parseInt(process.env.CHANGED_FILES || '0'),
    additions: parseInt(process.env.ADDITIONS || '0'),
    deletions: parseInt(process.env.DELETIONS || '0')
  },
  skills: skillNames,
  categories: { /* existing category definitions */ }
};

fs.writeFileSync(process.env.PR_REVIEW_DIR + '/config.json', JSON.stringify(config, null, 2));
process.stdout.write('config.json written with ' + skillNames.length + ' active skills\n');
"
```

Note: The actual Step 3b config.json write in pr-reviewer.md does not have a visible code block — the planner must audit the existing write (or add a new one) to ensure the `skills` field is included. The pattern above shows the shape; the exact implementation depends on how the current Step 3b writes config values.

### Anti-Patterns to Avoid

- **Injecting content before user selection is confirmed:** Step 1c must run AFTER Step 1b completes and `/tmp/skills.json` contains only the user's selection. Never read the pre-selection discovery output.
- **Using `echo "$SKILLS_CONTENT"` for multi-line content:** Shell `echo` with large multi-line strings produces quoting bugs on Windows. Use `node -e` + `process.stdout.write()` for all multi-line content output.
- **Hardcoding `## Active Skills Context` in multiple places:** The heading is the contract — it appears once in the output (Step 1c) and once in Step 2's reference. If Step 1c is skipped (zero skills), Step 2 must not require it.
- **Omitting the skills field when empty:** Per D-08, `"skills": []` is always written to config.json — consumers should not need to handle a missing field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter stripping | Custom state machine parser | Same `---` regex from Phase 7 (line 126 in pr-reviewer.md) | Already tested, handles both `\r\n` and `\n` line endings |
| File read with error handling | Complex try/catch wrappers | `fs.readFileSync` in a simple try/catch with `continue` | Matches the pattern in Phase 7 discovery (lines 120-125) |
| Skills-to-names mapping | Separate bash step | Inline in the same `node -e` block as the config.json write | Keeps the logic co-located with the write; avoids an extra SKILL_NAMES env var |

**Key insight:** Every mechanism needed for Phase 9 already exists in the codebase. This phase is wiring three existing elements together, not building anything new.

---

## Common Pitfalls

### Pitfall 1: Step 1c Running When Zero Skills Selected

**What goes wrong:** Step 1c outputs `## Active Skills Context` heading even when no skills were selected, leaving an empty heading in agent context. Step 2 then treats the empty block as mandatory criteria (nothing to enforce, but confusing).

**Why it happens:** The guard `if (!skills || skills.length === 0) process.exit(0)` is omitted.

**How to avoid:** Always check `skills.length === 0` before writing ANY output — including the heading. If zero skills, `process.exit(0)` immediately. The heading must only appear when there is at least one skill.

**Warning signs:** `config.json` shows `"skills": []` but agent output still contains `## Active Skills Context` with no skill subsections.

### Pitfall 2: config.json Missing the skills Field

**What goes wrong:** CTX-02 is satisfied in Step 1c but not in config.json — skills are visible during the review but not persisted for later traceability.

**Why it happens:** Step 3b's config.json write is updated for the `skills` field but `/tmp/skills.json` was never read in that step (or was read before the file was written by Phase 8).

**How to avoid:** Step 3b must read `/tmp/skills.json` fresh at write time. The file is reliably present at Step 3 because Steps 1, 1b, and 1c all run before Step 2 and Step 3.

**Warning signs:** `config.json` loads in the HTML preview without a `skills` badge, or the UI's `config.skills` field is undefined.

### Pitfall 3: Frontmatter Appearing in Injected Content

**What goes wrong:** Skill content appears under the heading with raw YAML frontmatter (`---`, `name:`, `description:`) included — the agent reads the frontmatter as review criteria.

**Why it happens:** The frontmatter regex does not match if the file uses Windows line endings (`\r\n`) and the pattern only covers `\n`.

**How to avoid:** Use the same regex as Phase 7 discovery code: `/^---\r?\n[\s\S]*?\r?\n---\r?\n/`. The `\r?` makes it tolerant of both line ending styles. This is already proven in Phase 7.

**Warning signs:** Injected skill content starts with `---` lines instead of the skill's actual documentation body.

### Pitfall 4: Step 2 Requiring Active Skills Context When It Was Skipped

**What goes wrong:** Step 2 instructs "apply all criteria from Active Skills Context" but when no skills were selected, the section doesn't exist in context. The agent may hallucinate skill requirements.

**Why it happens:** Step 2's instruction is written as unconditional.

**How to avoid:** Write Step 2's instruction with conditional language: "If an `## Active Skills Context` section is present in context, treat it as mandatory criteria equal to REVIEW-PLAN.md." This makes the enforcement conditional on the heading being present.

**Warning signs:** Reviews with zero skills show skill-category findings that weren't in REVIEW-PLAN.md.

### Pitfall 5: Shell Quoting Breaking Multi-Line Skill Content Output

**What goes wrong:** `echo "$SKILL_BODY"` truncates or corrupts content with special characters (backticks, dollar signs, quotes). Particularly acute on Windows bash environments.

**Why it happens:** Shell variable interpolation processes the content before echo outputs it.

**How to avoid:** Use `node -e` + `process.stdout.write()` for all content output. Never pass multi-line skill content through shell variables.

**Warning signs:** Injected skill content is truncated mid-paragraph or shows `command not found` errors mid-output.

---

## Code Examples

### Frontmatter Stripping (verified — matches Phase 7 code, pr-reviewer.md line 126)

```javascript
// Source: pr-reviewer.md line 126 (Phase 7 discovery code)
const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
// For full body extraction (Phase 9 needs body, not just frontmatter):
const fmBlock = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
const body = fmBlock ? content.slice(fmBlock[0].length) : content;
```

### Reading /tmp/skills.json (verified — matches Phase 8 pattern)

```javascript
// Source: pr-reviewer.md Phase 8 selection code (Step 1b)
let skills;
try {
  skills = JSON.parse(fs.readFileSync('/tmp/skills.json', 'utf8'));
} catch(e) {
  process.exit(0); // No skills file — skip silently
}
if (skills.length === 0) process.exit(0);
```

### config.json skills field (new in Phase 9)

```javascript
// D-07: simple array of name strings
// D-08: empty array when no skills selected
const skillNames = skills.map(s => s.name); // e.g., ["design-tokens", "i18n-patterns"]
// written as:
config.skills = skillNames;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REVIEW-PLAN.md as sole review criteria | REVIEW-PLAN.md + Active Skills Context | Phase 9 | Skill-defined patterns enforced with same weight as project checklist |
| config.json with pr + categories fields only | config.json adds `skills` array | Phase 9 | UI and downstream tools can display which skills were active for a given review |

---

## Open Questions

1. **Does the current Step 3b have a code block for writing config.json, or is it prose-only?**
   - What we know: The agent markdown Step 3b says "Write/update `$PR_REVIEW_DIR/config.json` with PR metadata and category definitions" — there is no explicit code block visible in the agent file.
   - What's unclear: Whether the planner should add a new explicit `node -e` write block for config.json, or whether the agent currently infers this write from the prose instruction. If the current reviews produce a valid config.json, the write is happening implicitly through the agent's reasoning.
   - Recommendation: The planner should add an explicit `node -e` code block for the config.json write in Step 3b to make the `skills` field addition deterministic. Relying on agent inference for a specific JSON schema field is fragile.

2. **Error handling preference for unreadable skill files**
   - What we know: CONTEXT.md leaves this to Claude's discretion. The Phase 7 discovery code silently skips unreadable files (`continue`).
   - What's unclear: Whether silent skip or stderr warning is preferable.
   - Recommendation: Use `process.stderr.write('[skills] Could not read: ' + skill.path + ' — skipped\n')` then `continue`. This is consistent with Phase 8's D-10 (stderr messages reach the user) while not blocking the review.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is a pure code/markdown edit to `agents/pr-reviewer.md`. No new external tools, services, CLIs, or runtimes are introduced. `/tmp/skills.json` is a filesystem path available in any Unix-compatible shell environment (already established by Phase 7 and Phase 8).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — project has no test suite (per CLAUDE.md: "No build step, no tests, no linter") |
| Config file | None |
| Quick run command | Manual review invocation: `/pr-review:review <pr-url> --skills design-tokens` |
| Full suite command | Manual end-to-end: run review with skills, run review without skills, inspect findings.json + config.json |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| CTX-01 | Skill content appears under `## Active Skills Context` and violations produce findings | manual smoke | n/a | Verify by inspecting agent output and findings.json |
| CTX-01 | Zero-skills review produces no Active Skills Context block and no skill-category findings | manual smoke | n/a | Run with `--skills none` |
| CTX-02 | config.json contains `"skills": ["name1", "name2"]` after a review with selected skills | manual smoke | n/a | `cat $PR_REVIEW_DIR/config.json \| grep skills` |
| CTX-02 | config.json contains `"skills": []` after a review with no skills | manual smoke | n/a | Run with `--skills none`, inspect config.json |

### Wave 0 Gaps

None — existing infrastructure covers all phase requirements. The project has no automated test suite; all validation is manual. The planner should include explicit manual verification steps as success criteria.

---

## Sources

### Primary (HIGH confidence)

- `agents/pr-reviewer.md` (read directly) — exact Step 1, Step 1b, Step 2, Step 3b code and line positions
- `.planning/phases/09-context-injection/09-CONTEXT.md` (read directly) — all locked decisions D-01 through D-11
- `.planning/phases/07-skill-discovery/07-CONTEXT.md` (read directly) — frontmatter regex pattern, D-06 priority order
- `.planning/phases/08-skill-selection/08-CONTEXT.md` (read directly) — /tmp/skills.json contract (D-11), Step 1b integration point (D-12)
- `.planning/codebase/CONVENTIONS.md` (read directly) — zero-dep constraint, node -e pattern, error handling conventions
- `template/index.html` (read directly) — config.json consumption: `config.pr`, `config.categories`, `config.severities` — confirmed `skills` field is not yet consumed by the UI (additive, non-breaking)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — accumulated project decisions, confirming Windows path handling and TTY behavior decisions
- `template/test-findings.json` — confirmed 10-field findings schema with status/commitHash/commentId fields

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all components are already in use in the codebase, read directly from source
- Architecture: HIGH — all three edit points identified with exact line context, patterns verified against existing code
- Pitfalls: HIGH — derived from known failure modes in Phase 7/8 patterns and Windows shell environment constraints

**Research date:** 2026-03-31
**Valid until:** Stable indefinitely — no external dependencies, pure markdown authoring task
