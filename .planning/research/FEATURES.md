# Feature Landscape: Skill-Aware PR Review

**Domain:** AI-powered PR review with skill detection and selection
**Researched:** 2026-03-31
**Confidence:** HIGH (skills documentation verified from official Claude Code docs + OpenCode docs)

---

## Context: What Already Exists

The prior milestone (v1.1) delivered the full fix-and-resolution loop. The existing feature set:

- `pr-reviewer.md` reads `REVIEW-PLAN.md` + `CLAUDE.md`, fetches PR diffs, posts inline GitHub
  comments, writes `findings.json`
- `pr-fixer.md` reads findings, applies fixes, commits one per finding, pushes, replies to threads
- HTML UI: finding viewer, filter by severity/category/status, edit and persist findings
- Zero-dependency installer (`npx pr-review-agent`) with placeholder system for multi-runtime support

**What is missing:** The reviewer currently does NOT read project skills. The `<project_context>`
block in `pr-reviewer.md` mentions skills with "check for project-specific skills" but provides no
implementation for discovering, listing, or injecting them into the analysis.

---

## Skills Ecosystem: What They Are

Skills in Claude Code (and OpenCode) are markdown files (`SKILL.md`) stored in directories under
`.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, or `~/.config/opencode/skills/`. Each
skill has YAML frontmatter (`name`, `description`) and a markdown body containing domain-specific
rules, patterns, and instructions. Skills represent specialized knowledge — architectural conventions,
code style rules, domain patterns — that agents apply when relevant.

**For code review, skills represent additional review criteria.** A `typescript-conventions` skill
defines naming rules. A `react-component-patterns` skill describes how components should be
structured. An `api-security` skill specifies what API endpoints must validate. These are exactly
the kinds of project-specific rules that make a PR review meaningful.

**Confidence:** HIGH — verified from official Claude Code skills documentation and OpenCode skills
documentation (code.claude.com/docs/en/skills, opencode.ai/docs/skills/).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist for skill-aware review to feel complete. Missing any of these means the
feature is half-built.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Detect skills from standard directories | Users store skills in `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, `~/.config/opencode/skills/`. The agent must scan all four paths — else it silently misses available rules. | LOW | Bash `find`/`ls` across known paths. Glob each `*/SKILL.md`. No parsing required to enumerate. |
| Show developer which skills were found | Developer must confirm the agent is using the right context before review runs. No visibility = no trust. "Review running against 3 skills" is not enough — show names. | LOW | Print a numbered list: `[1] typescript-conventions`, `[2] react-patterns`. One line per skill. |
| Let developer choose all skills or select subset | Not every skill is relevant to every PR. An i18n skill should not clutter a security-focused review. Developer chooses scope, agent respects it. | MEDIUM | Two paths: "all" (skip selection) or interactive list with numbered input. Uses `AskUserQuestion` tool or sequential prompts. |
| Pass selected skill content as review context | Selected skills must actually inform the analysis — not just be listed. The agent must read each skill's `SKILL.md` and treat its rules as mandatory review criteria alongside `REVIEW-PLAN.md`. | MEDIUM | Read each selected `SKILL.md`, inject content into the analysis step's context. Append after REVIEW-PLAN.md in the priority stack. |
| Skip review if no skills found (gracefully) | When a project has no skills, the agent should not fail or hang waiting for selection. It should proceed with REVIEW-PLAN.md alone and inform the developer. | LOW | Guard check: if zero skills found, print "No skills found — proceeding with REVIEW-PLAN.md only" and skip selection step. |
| Respect the existing `--focus` flag alongside skill selection | Skill selection and focus scoping are orthogonal. Developer may want "all skills, security focus only" or "typescript skill only, all categories." Both must work together. | LOW | Selection is about context injection; `--focus` is about category filtering. They compose naturally — no conflict in implementation. |

### Differentiators (Competitive Advantage)

Features that distinguish this toolkit from generic code review tools. These are where the
skill-aware feature becomes compelling rather than table stakes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Skills as additional mandatory rules (not optional hints) | Most tools apply generic LLM checks. Skill rules are project-authored, versioned, and should be enforced consistently — not treated as optional context. The review agent should report a finding when code violates a skill rule, same as it would for a REVIEW-PLAN.md rule. | MEDIUM | Achieved through context injection order: skills sit alongside REVIEW-PLAN.md in the analysis step's mandatory criteria list. No special code path needed — it is a context-assembly problem. |
| Multi-framework discovery (Claude Code + OpenCode + generic) | Teams use different AI assistants. A project may have skills in `.claude/skills/` from one developer and `.agents/skills/` from another. Scanning all four paths means the review agent sees all available rules regardless of which assistant wrote them. | LOW | Four directory scans, deduplicated by skill name (first found wins, consistent with OpenCode's precedence model). |
| Surface skill names in findings categories | When a finding is based on a skill rule, the category field can reflect the skill name (e.g., `typescript-conventions` instead of the generic `architecture`). This makes findings traceable to their source rule. | MEDIUM | Requires the agent to tag each finding with a source: REVIEW-PLAN.md category or skill name. The category field in the findings schema already supports arbitrary strings. |
| `--skills` flag for non-interactive skill selection | Experienced users running review in scripts or repeatedly want to skip the interactive prompt. `--skills typescript-conventions,react-patterns` selects skills directly from the command line. | LOW | Parse `--skills` flag in the command layer. Split on comma, validate each name exists in discovered skills. Pass selected list to agent. |
| Graceful handling of large skill files | A skill with 500+ lines of conventions would bloat context. Skills that are too long should be summarized: use the `description` frontmatter and the first section heading only if the body exceeds a threshold. | MEDIUM | Check character count of skill body. Above threshold (e.g., 4000 chars), truncate to frontmatter description + first section. Print a warning: "Skill X truncated to summary (body: N chars)." |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-select skills based on changed file paths | Seems smart: if PR touches `*.tsx`, auto-load the React skill. Reduces friction. | Path-based heuristics break constantly: a PR touching `utils/api.ts` might need the React skill if it exports hooks. The developer knows context; the agent guessing creates surprises. | Always show the skills list and let the developer choose. The default of "all skills" is safe. |
| Persist skill selection between review runs | Seems convenient: remember which skills were selected last time. | Persisted state becomes stale. A new skill gets added, the developer runs review, the old selection silently excludes it. Hidden state breaks trust. | Always discover fresh, always show what was found. The `--skills` flag handles the "scripted" use case for repeatable runs without persistence. |
| Load skills from the PR branch's config directory | PR branches may have different skills than the current branch. Checking out the PR branch to read its skills seems thorough. | This requires a branch checkout before the review even starts, adds complexity, and creates state the user did not request. The PR review is done against the author's code but informed by the reviewer's conventions. | Read skills from the current working tree (where the developer is) — this is their project's conventions, which is the correct authority. |
| Install skills from a registry during review | "No skills found? Here are popular ones you can install." | Scope creep. This toolkit installs agents into AI assistants, it does not manage skill libraries. Installing unknown skills during a review erodes the zero-dependency, zero-surprise model. | Document that developers create skills manually or use their AI assistant's skill management tools. Out of scope for this toolkit. |
| Parse nested skill reference files (examples/, references/) | Skills can have supporting files. Parsing them all would capture richer context. | Skills with `references/` can be megabytes of documentation. Reading all supporting files creates unpredictable context size and slow reviews. | Read only `SKILL.md`. If the skill author wants rules in scope for reviews, they belong in `SKILL.md`. This is documented guidance, not a technical limitation. |

---

## Feature Dependencies

```
Detect skills from multiple directories
    └──required by──> Show available skills list
                          └──required by──> Interactive skill selection
                                                └──required by──> Pass selected skills as context
                                                                      └──required by──> Skill-informed findings

--skills flag (non-interactive)
    └──alternative to──> Interactive skill selection
                              └──feeds into──> Pass selected skills as context

Pass selected skills as context
    └──enhances──> Existing REVIEW-PLAN.md analysis (additive, not replacement)

Graceful empty state (no skills found)
    └──guards──> Interactive skill selection step
```

### Dependency Notes

- **Detect skills is the foundation:** Everything else depends on reliable, consistent discovery
  across all four paths. Get this right first.
- **Selection requires detection:** The interactive step cannot run before the discovery step
  completes and returns a list.
- **Context injection is additive:** Selected skill content sits alongside `REVIEW-PLAN.md` in the
  analysis step. No existing logic changes — it is an addition to the context assembly, not a
  replacement.
- **`--skills` flag bypasses interactive selection only:** Discovery still runs to validate that the
  named skills exist. If a named skill is not found, fail with a clear error rather than silently
  omitting it.

---

## MVP Definition

### Launch With (v1.2)

Minimum viable feature set. These together deliver the stated milestone goal.

- [ ] **Detect skills** from `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`,
  `~/.config/opencode/skills/` — global and project-local paths for each
- [ ] **List found skills** to developer with names before review begins
- [ ] **Interactive selection**: "all skills" or pick by number
- [ ] **Inject selected skill content** into the analysis context (read each `SKILL.md`, add to
  mandatory review criteria after `REVIEW-PLAN.md`)
- [ ] **Graceful empty state**: if no skills found, skip selection and proceed with REVIEW-PLAN.md

### Add After Validation (v1.2.x)

- [ ] **`--skills` flag** for non-interactive skill selection — adds value once users are
  comfortable with skill-aware review and want to script or repeat runs
- [ ] **Findings tagged with skill source** in category field — adds traceability but requires
  findings schema consideration

### Future Consideration (v2+)

- [ ] **Skill file size handling / truncation** — only needed if real-world skill files are
  consistently too large; validate first
- [ ] **Multi-package / monorepo skill scoping** — skills from subdirectory `.claude/skills/`
  auto-loaded by Claude Code but not currently part of the discovery path in this agent; defer
  until needed

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Detect skills (multi-path) | HIGH | LOW | P1 |
| List found skills to developer | HIGH | LOW | P1 |
| Interactive selection (all / subset) | HIGH | MEDIUM | P1 |
| Inject selected skills as review context | HIGH | MEDIUM | P1 |
| Graceful empty state | HIGH | LOW | P1 |
| `--skills` flag (non-interactive) | MEDIUM | LOW | P2 |
| Findings tagged with skill source | MEDIUM | MEDIUM | P2 |
| Skill file size guard (truncation) | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when core is stable
- P3: Nice to have, validate need first

---

## Implementation Notes for Roadmap

### Discovery paths to scan (in order, deduplicating by name)

Project-local paths (scanned first — project overrides global):
1. `./__CONFIG_DIR__/skills/*/SKILL.md`
2. `./.opencode/skills/*/SKILL.md`
3. `./.agents/skills/*/SKILL.md`

Global paths (user-level):
4. `$HOME/__CONFIG_DIR__/skills/*/SKILL.md`
5. `$HOME/.config/opencode/skills/*/SKILL.md`
6. `$HOME/.agents/skills/*/SKILL.md`

First occurrence of a skill name wins. Log a note if duplicates are found.

### Context injection order (review analysis step)

Priority stack for the reviewer:
1. Security vulnerabilities (always highest — unchanged from existing agent)
2. REVIEW-PLAN.md rules (existing — unchanged)
3. Selected skill rules (NEW — appended after REVIEW-PLAN.md)
4. CLAUDE.md conventions (existing — unchanged)

Skills do not outrank REVIEW-PLAN.md but they are mandatory, not optional. The agent must check
code against skill rules with the same rigor as checklist items.

### Where the change lives in the existing agent

The implementation touches exactly two places in `pr-reviewer.md`:

1. **Step 1 (Load Review Context):** After reading REVIEW-PLAN.md, scan for skills, show list,
   run selection, read selected skill files.
2. **Step 2 (Analyze Code Changes):** Apply skill rules as additional criteria alongside the
   existing REVIEW-PLAN.md checklist.

The `review.md` command file may also need:
- Updated `argument-hint` to show `[--skills name1,name2]`
- Updated `<process>` block to describe the skill selection step

No changes needed to: `pr-fixer.md`, `fix.md`, `setup.md`, `serve.js`, `index.html`,
`install.js`, or the findings schema. The feature is entirely contained to the review flow.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Skills discovery paths | HIGH | Verified from official Claude Code docs (code.claude.com/docs/en/skills) and OpenCode docs (opencode.ai/docs/skills/) — both list exact paths |
| SKILL.md structure | HIGH | Read official Claude Code docs + read actual skill file in this repo (`.claude/skills/conventional-commit/SKILL.md`) |
| Table stakes features | HIGH | Derived from project requirements in PROJECT.md + direct reading of pr-reviewer.md current state — no speculation |
| Differentiator features | MEDIUM | Based on analysis of competitive code review tools and skills ecosystem patterns — partially training knowledge |
| Anti-features | HIGH | Based on explicit PROJECT.md constraints, zero-dependency model requirements, and identified failure modes |
| Implementation scope | HIGH | Traced directly to specific steps in pr-reviewer.md — the change surface is confirmed narrow |

---

## Sources

- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — canonical
  skills documentation, skills directory paths, SKILL.md structure, frontmatter fields (HIGH confidence)
- [Agent Skills — OpenCode Docs](https://opencode.ai/docs/skills/) — OpenCode discovery paths and
  SKILL.md format (HIGH confidence)
- Direct reading of `agents/pr-reviewer.md` — current state of review agent, what it reads today
- Direct reading of `.planning/PROJECT.md` — v1.2 requirements, constraints, key decisions
- Direct reading of `.claude/skills/conventional-commit/SKILL.md` — real example of a SKILL.md file
  in this project

---
*Feature research for: Skill-Aware PR Review (v1.2)*
*Researched: 2026-03-31*
