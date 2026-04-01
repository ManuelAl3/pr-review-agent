# Requirements: PR Review Agent v1.2

**Defined:** 2026-03-31
**Core Value:** The developer gets a complete review-to-resolution cycle without leaving their AI assistant: review a PR, see findings, fix them, and have every fix tracked on GitHub with commit links.

## v1.2 Requirements

Requirements for skill-aware PR review. Each maps to roadmap phases.

### Skill Discovery

- [x] **SKILL-01**: Review agent detects skill files from the project's working directory (scans `.claude/skills/`, `.opencode/skills/`, `.agents/skills/` — whichever exist)
- [x] **SKILL-02**: Agent parses SKILL.md frontmatter (name + description) with graceful fallback when frontmatter is missing

### Skill Selection

- [x] **SEL-01**: Interactive prompt lets developer choose "all skills" or select specific ones before review runs
- [x] **SEL-02**: `--skills` flag for non-interactive mode (`--skills all`, `--skills none`, `--skills name1,name2`)
- [x] **SEL-03**: No prompt shown when project has zero skills (review continues normally)

### Context Injection

- [ ] **CTX-01**: Selected skill content is injected as mandatory review criteria alongside REVIEW-PLAN.md
- [ ] **CTX-02**: Selected skills are recorded in config.json for traceability in the review output

## Future Requirements

### Global Skills

- **GSKILL-01**: Scan global skill directories (~/.claude/skills/, ~/.config/opencode/skills/) in addition to project-local

### Advanced Selection

- **ASEL-01**: Skill content truncation for oversized skill files (500-line cap)
- **ASEL-02**: Skill source path display in selection prompt for trust visibility

## Out of Scope

| Feature | Reason |
|---------|--------|
| Global skills (~/.claude/skills/) | Only project-local for now — review should use project-relevant skills |
| Auto-selection by file type | Anti-feature — breaks constantly, surprises developers |
| Skill content truncation | Defer until real-world usage shows it's needed |
| Monorepo nested skill discovery | Claude Code runtime behavior, not agent responsibility |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKILL-01 | Phase 7 | Complete |
| SKILL-02 | Phase 7 | Complete |
| SEL-01 | Phase 8 | Complete |
| SEL-02 | Phase 8 | Complete |
| SEL-03 | Phase 8 | Complete |
| CTX-01 | Phase 9 | Pending |
| CTX-02 | Phase 9 | Pending |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
