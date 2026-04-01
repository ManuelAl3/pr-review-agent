# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Skill-Aware PR Review

**Shipped:** 2026-03-31
**Phases:** 3 | **Plans:** 3

### What Was Built
- Skill discovery scanning `.claude/skills/`, `.opencode/skills/`, `.agents/skills/` with frontmatter parsing and deduplication
- Interactive skill selection with `--skills` flag for non-interactive/CI mode
- Skill content injection as mandatory review criteria alongside REVIEW-PLAN.md, with traceability in config.json

### What Worked
- Single-plan phases kept scope tight — each phase was one focused change to `pr-reviewer.md`
- /tmp/skills.json as inter-step data contract made the 3-phase pipeline clean and decoupled
- Phase 7 frontmatter regex reuse in Phase 9 (strip YAML before injection) — good forward planning

### What Was Inefficient
- Phase 9 ROADMAP.md wasn't marked complete by the executor — required manual fixup after verification passed

### Patterns Established
- Temp file contracts (/tmp/*.json) for passing structured data between agent steps within a single run
- `--flag` pattern for opt-in features that don't change default behavior

### Key Lessons
1. For linear 3-phase pipelines with no parallelism, single-plan phases execute fast with minimal overhead
2. The zero-skills path must be tested explicitly — silent exit is correct behavior but easy to overlook in verification

### Cost Observations
- Model mix: executor=sonnet, verifier=sonnet, planner=opus
- All 3 phases executed in a single session
- Low total token usage due to small, focused plans

---

## Milestone: v1.3 — Multi-Framework & Discoverability

**Shipped:** 2026-04-01
**Phases:** 3 | **Plans:** 3

### What Was Built
- `--help` flag intercept on review command (Step 0 pattern) printing formatted flag reference
- Runtime-compat HTML comment blocks in all 5 agent/command files documenting Claude Code vs OpenCode differences
- `cleanStaleFiles()` installer helper removing stale files on re-install while preserving user data
- Version detection with upgrade messaging

### What Worked
- Documentation-only phases (Phase 11) execute extremely fast — no functional code risk
- Single-file changes (Phase 10: review.md, Phase 12: install.js) keep plans tight and verification simple
- Tool name audit in Phase 11 confirmed zero changes needed — good existing hygiene paid off

### What Was Inefficient
- Phase 11 SUMMARY one-liner field wasn't properly extracted by milestone CLI — needed manual MILESTONES.md fixup
- STATE.md progress bar showed 0% despite all phases complete — stale from prior milestone

### Patterns Established
- Step 0 help-flag-check pattern: intercept `--help` before any processing, print usage, exit
- HTML comment compat blocks for runtime documentation that doesn't affect rendering
- Upgrade pattern: detect version → log if needed → clean stale → copy new → write .version

### Key Lessons
1. Documentation phases are near-zero risk but high value — runtime compat blocks prevent user confusion across runtimes
2. Installer cleanup logic should be tested with both same-version and different-version re-installs
3. The `--help` pattern is reusable for any future command that gains flags

### Cost Observations
- Model mix: executor=sonnet, verifier=sonnet, planner=opus
- All 3 phases executed in a single session
- Minimal token usage — smallest milestone yet (3 plans, 6 tasks)

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Key Pattern |
|-----------|--------|-------|-------------|
| v1.1 | 6 | 10 | Multi-file agent edits with GitHub API integration |
| v1.2 | 3 | 3 | Single-file pipeline additions with temp file contracts |
| v1.3 | 3 | 3 | Documentation + installer hardening with zero-risk changes |
