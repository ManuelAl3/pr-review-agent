# Project Research Summary

**Project:** pr-review-agent v1.2 — Skill-Aware PR Review
**Domain:** AI agent toolkit — multi-framework skill detection and context injection
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone adds skill detection and interactive selection to the existing `pr-reviewer.md` agent. The existing system (zero-dependency Node.js, vanilla HTML/JS, `gh` CLI) is well-validated and no new stack surface is required. The change is narrow: one new step (`Step 0.9`) in `pr-reviewer.md` and a modified `Step 1` context assembly. All three AI assistant frameworks (Claude Code, OpenCode, generic `.agents/`) use the same `SKILL.md` format defined by the Agent Skills Open Standard, meaning a single scanning implementation covers all relevant paths. The discovery algorithm checks six canonical paths in priority order (project-local before global, Claude Code before OpenCode before generic) and deduplicates by the `name` frontmatter field.

The recommended approach is a three-phase build: silent discovery first (no user interaction), then add interactive selection, then update the analysis instructions to treat skill rules as mandatory criteria equal to `REVIEW-PLAN.md`. This ordering lets each phase be independently tested and avoids user friction regressions — projects with no skills see zero behavior change throughout. The only files that change are `agents/pr-reviewer.md` and optionally `commands/pr-review/review.md`. The fix agent, UI, installer, findings schema, and `serve.js` are all unchanged.

The primary risks are context overflow (too many large skills diluting review quality), Windows path separator mismatches (this repo runs on `win32`), and prompt injection via third-party skill content. All three are preventable with known mitigations: per-skill content caps, `path.join()` throughout, and requiring explicit user selection before any skill content is injected. The security risk (OWASP LLM01:2025) is the highest-stakes pitfall and must be designed in at the selection UI phase, not patched afterwards.

---

## Key Findings

### Recommended Stack

No new dependencies. The existing stack handles everything: Node.js built-ins for filesystem scanning, the `Glob` and `Read` tools already in the agent's `allowed-tools` for skill discovery, and `AskUserQuestion` (already permitted in `review.md`) for interactive selection. YAML frontmatter is simple enough for manual string parsing (split on `---`, extract `key: value` lines) — no `js-yaml` or similar library is needed or permitted under the zero-dependency constraint.

The Agent Skills Open Standard (published December 2025) is stable and adopted by Claude Code, OpenCode, GitHub Copilot, and Codex. Its `SKILL.md` format uses YAML frontmatter with `name` and `description` as required fields plus optional Claude Code-specific extensions. The format is backwards-compatible across all frameworks. OpenCode also reads `.claude/skills/` paths in addition to its own `.opencode/skills/`, which means a project committing skills to `.claude/skills/` is automatically covered by both runtimes.

**Core technologies:**
- Node.js built-ins (`fs`, `path`, `os`): skill directory scanning — zero-dependency constraint maintained throughout
- `path.join()` / `path.resolve()`: cross-platform path construction — mandatory on the `win32` platform this repo runs on
- `AskUserQuestion` tool: interactive skill selection — already permitted in `review.md`, no new tool grants needed
- Agent Skills Open Standard (`SKILL.md`): universal skill format — covers Claude Code, OpenCode, and generic `.agents/` frameworks with one implementation

**Critical version notes:**
- Node.js `>=18.0.0`: no change to existing requirement
- No new npm dependencies of any kind permitted

### Expected Features

The feature set is well-bounded. All table-stakes features for v1.2 are derivable from the skills frameworks' own documentation and the existing agent's gap (skills are mentioned in the `<role>` block of `pr-reviewer.md` but the detection and injection logic is not implemented).

**Must have (table stakes — v1.2):**
- Detect skills from all six standard paths (`.claude/skills/`, `.opencode/skills/`, `.agents/skills/` at project root; same three paths at user global level) — discovery must be complete across all frameworks
- List found skills to developer (name + description) before review begins — no visibility equals no trust
- Interactive selection: all skills or pick by number — not every skill is relevant to every PR
- Inject selected skill content as mandatory review criteria alongside `REVIEW-PLAN.md` — listing skills without applying them is a table-stakes violation
- Graceful empty state: zero skills found means zero interaction; proceed with `REVIEW-PLAN.md` only — critical for the majority case where skills are not present

**Should have (v1.2.x after core is stable):**
- `--skills name1,name2` flag for non-interactive or scripted selection
- Finding category field reflects skill source (e.g., `typescript-conventions` instead of `architecture`) for traceability

**Defer (v2+):**
- Skill file size truncation and summarization — validate real-world need before adding complexity
- Monorepo per-package skill scoping — defer until a concrete use case arises
- Skill registry or installation management — explicitly out of scope for this toolkit

**Firm anti-features (never implement):**
- Auto-select skills based on changed file paths — path heuristics break; the developer knows context
- Persist skill selection between runs — stale state erodes trust
- Checkout PR branch to read its skills — requires git state change before review even starts
- Load supporting files from skill directories — only `SKILL.md` body is in scope

### Architecture Approach

This is a brownfield addition with a narrow change surface. The only files that change are `agents/pr-reviewer.md` (add Step 0.9, modify Step 1 context assembly) and optionally `commands/pr-review/review.md` (update `argument-hint` for the `--skills` flag). The fix agent, UI, installer, findings schema, `serve.js`, and `config.json` are all unchanged for core v1.2 scope.

Skills are session context, not persistent state. Selected skill contents are held in-memory for the duration of the agent session. The review level (not per-finding) should record which skills were used in `config.json` for reproducibility, but no new fields are added to `findings.json`. Skill rules that generate findings produce standard 10-field finding objects — the schema is unchanged.

**Major components:**
1. **Skill Discovery** (Step 0.9, detection sub-step) — scans six candidate directories, reads frontmatter only for listing, deduplicates by `name` field, outputs `SKILLS_FOUND` array
2. **Skill Selection UI** (Step 0.9, prompt sub-step) — presents numbered list with names and descriptions, accepts `all` / comma-separated numbers / `none`, skips entirely when `SKILLS_FOUND` is empty
3. **Context Assembly** (Step 1, modified) — reads full `SKILL.md` body for selected skills only, appends as clearly labeled block after `REVIEW-PLAN.md` in priority stack
4. **Analysis Framing** (Step 2, modified instruction) — treats skill rules as mandatory criteria at equal priority to `REVIEW-PLAN.md`; findings from skill rules use the standard 10-field schema unchanged

### Critical Pitfalls

1. **Skill context overwhelms review analysis** — Too many large skills bloat the prompt; findings become generic. Load frontmatter only during selection, full body only for explicitly selected skills, cap total skill content with a warning above approximately 4000 tokens. Inject as a clearly labeled `## Active Skills Context` block so the agent references it deliberately.

2. **Windows path separator mismatch silently skips skill directories** — This repo runs on `win32`. String concatenation with `/` produces mixed-separator paths that `fs.readdirSync` may fail on. Use `path.join()` exclusively for all directory construction; normalize to forward-slash only when passing paths to agent Read tool instructions.

3. **Prompt injection via third-party skill content** — Skill content from external sources can contain adversarial instructions (OWASP LLM01:2025). Require explicit user selection before any skill content is injected — auto-injection is never acceptable. Show source path during selection so the user can assess trust level.

4. **Skill name collision loads wrong content** — The same skill name in `.claude/skills/` and `.config/opencode/skills/` creates contradictory context. Apply explicit precedence order (project-local before global, Claude Code before OpenCode before generic), display source path in selection UI, and deduplicate — never load both.

5. **`__CONFIG_DIR__` placeholder used at runtime** — Agent files use `__CONFIG_DIR__` as an install-time placeholder. Adding skill path logic that references this literal string will fail at runtime. Derive skill paths from the already-resolved `PR_REVIEW_DIR` variable (established in Step 0.5), never from a raw `__CONFIG_DIR__` literal.

---

## Implications for Roadmap

Based on research, the architecture's explicit build order maps cleanly to three phases. Each phase is independently deliverable and testable. No phase requires deeper pre-planning research.

### Phase 1: Skill Discovery (Silent)

**Rationale:** Discovery is the foundation for everything else. Building it without any user interaction first means it can be validated end-to-end (correct paths, correct parsing, correct deduplication) before the UX layer is added. Regressions are easy to detect: projects without skills must see zero behavior change.

**Delivers:** Agent scans all six candidate paths, parses frontmatter, deduplicates by `name`, logs "Loaded skills: X, Y" when skills exist. All discovered skills are auto-loaded into Step 1 context without user prompt. Graceful no-op when no skills exist.

**Addresses:** Table-stakes detection feature; graceful empty state.

**Avoids:** `__CONFIG_DIR__` placeholder pitfall (derive from `PR_REVIEW_DIR`); Windows path separator pitfall (`path.join()` throughout); YAML parsing crash pitfall (validate `---` presence before extracting, use directory name as fallback for missing `name` field).

---

### Phase 2: Interactive Selection

**Rationale:** Depends on Phase 1. Adding the selection prompt before discovery is proven stable creates untestable combinations. This phase wraps the existing discovery result with `AskUserQuestion`, implements `all / 1,2 / none` input handling, and applies the selection filter before context injection.

**Delivers:** Developer sees discovered skills with names and descriptions, chooses scope per review. Projects without skills get no prompt. Non-interactive mode (CI / no TTY) auto-selects all skills and proceeds with a logged note.

**Addresses:** Interactive selection table-stakes feature; `--skills` flag as a follow-on.

**Avoids:** Skill selection blocking non-interactive environments (TTY check before prompt); empty-state friction (skip prompt entirely when `SKILLS_FOUND` is empty); `disable-model-invocation` task skills appearing in list (filter these during discovery).

---

### Phase 3: Analysis Framing and Context Injection

**Rationale:** Depends on Phase 2 — skills must be selected before the analysis instructions can reference them. This phase consists entirely of prompt-engineering changes to `pr-reviewer.md`: update Step 1 to acknowledge selected skills alongside `REVIEW-PLAN.md`, update Step 2 to treat skill rules as mandatory criteria. No JavaScript, no new files.

**Delivers:** PR reviews produce findings that reflect skill-defined patterns. A skill-sourced finding is indistinguishable from a `REVIEW-PLAN.MD` finding in the output schema. `config.json` records which skills were used so the review is reproducible.

**Addresses:** Context injection table-stakes feature; mandatory-criteria enforcement (skills are enforced, not optional hints).

**Avoids:** Context overflow pitfall (cap skill content, use `## Active Skills Context` label); prompt injection pitfall (user selection was required in Phase 2 — injection here is gated); large supporting files pitfall (explicit instruction in Step 0.9: read `SKILL.md` only, do not follow references).

---

### Phase Ordering Rationale

- Discovery before selection: Cannot present a reliable list to the user until the scanner is proven correct against all six paths. Silent mode also lets the zero-regression requirement be tested independently.
- Selection before framing: The analysis step cannot reference "selected skills" until the selection mechanism exists and is passing skill names and content forward.
- Framing last: Pure prompt-engineering changes carry the lowest risk and are the easiest to iterate. Changing them does not affect the plumbing built in Phases 1 and 2.
- No UI, schema, or installer changes across any phase: The change surface is entirely within `pr-reviewer.md`. All three phases are independently rollback-safe.

### Research Flags

Phases with standard patterns (no further research needed):
- **Phase 1:** Filesystem traversal of documented paths and string-based YAML frontmatter parsing — all patterns are well-established.
- **Phase 2:** `AskUserQuestion` is already used in this codebase. TTY detection is a standard Node.js pattern. No unknowns.
- **Phase 3:** Additive context injection in an existing agent following the same structure as `REVIEW-PLAN.md` loading. No unknowns.

No phases require deeper research during planning. All implementation decisions are resolved by the existing research documents.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Claude Code docs + OpenCode docs verified 2026-03-31; existing skill file in this repo provides first-party format validation |
| Features | HIGH | Table stakes derived from official skill framework docs + direct gap analysis of current `pr-reviewer.md`; differentiators rated MEDIUM (ecosystem pattern analysis) |
| Architecture | HIGH | All component boundaries derived from direct codebase inspection; brownfield constraints are well-understood; change surface explicitly traced to two files |
| Pitfalls | HIGH | Critical pitfalls sourced from official docs, OWASP LLM01:2025 spec, and deterministic Node.js cross-platform path behavior |

**Overall confidence:** HIGH

### Gaps to Address

- **Skill content size threshold in practice:** PITFALLS.md recommends approximately 4000 tokens as a cap but this threshold should be validated against real-world skill files during Phase 3. Measure actual token counts of representative skills before hardcoding a limit.
- **Non-interactive mode detection:** The exact behavior of `AskUserQuestion` when stdin is not a TTY is not fully documented for this runtime. During Phase 2 implementation, verify the tool's behavior in piped/CI contexts and implement an explicit fallback (auto-select all, log the decision).
- **`--skills` flag parsing location:** FEATURES.md treats this as a v1.2.x item. When implementing it, decide whether flag parsing belongs in `review.md` (command layer passes to agent) or in `pr-reviewer.md` (agent reads arguments directly). This decision is minor but needs a concrete answer at implementation time.

---

## Sources

### Primary (HIGH confidence)

- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) — skill directory paths, SKILL.md frontmatter fields, `disable-model-invocation` behavior, Claude Code extensions (verified 2026-03-31)
- [Agent Skills Open Standard](https://agentskills.io/specification) — canonical `name`, `description`, `license`, `compatibility`, `metadata` fields; base spec adopted by all frameworks (verified 2026-03-31)
- [OpenCode Skills Docs](https://opencode.ai/docs/skills/) — OpenCode discovery paths including `.claude/skills/` cross-compatibility (verified 2026-03-31)
- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — supply-chain attack vector for skill content injection
- Direct codebase inspection: `agents/pr-reviewer.md`, `commands/pr-review/review.md`, `bin/install.js`, `.claude/skills/conventional-commit/SKILL.md`, `.planning/PROJECT.md`

### Secondary (MEDIUM confidence)

- Ecosystem analysis of competitive code review tools — informed differentiator feature prioritization
- Redis blog on context window overflow — informed skill content cap recommendation (vendor blog, not official spec)

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
