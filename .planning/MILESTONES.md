# Milestones

## v1.3 Multi-Framework & Discoverability (Shipped: 2026-04-01)

**Phases completed:** 4 phases, 3 plans, 4 tasks

**Key accomplishments:**

- `--help` flag intercept on review command — Step 0 prints formatted flag reference before agent loads
- Runtime-compat blocks in all 5 agent/command files documenting Claude Code vs OpenCode behavior differences inline
- Tool name audit confirmed PascalCase consistency across all files — zero changes needed
- `cleanStaleFiles()` helper for safe re-install upgrades with version detection — user data preserved
- Version detection with upgrade messaging on re-install (only shows when version changes)

---

## v1.2 Skill-Aware PR Review (Shipped: 2026-04-01)

**Phases completed:** 4 phases, 3 plans, 2 tasks

**Key accomplishments:**

- One-liner:
- Skill content injection into PR review: Step 1c reads selected skills from /tmp/skills.json, strips frontmatter, and outputs under ## Active Skills Context as mandatory REVIEW-PLAN.md-equivalent criteria, with skill names persisted to config.json

---
