# Roadmap: PR Review Agent

## Milestones

- ✅ **v1.1 Fix/Resolution** - Phases 1-6 (shipped 2026-03-31)
- ✅ **v1.2 Skill-Aware PR Review** - Phases 7-9 (shipped 2026-03-31)
- 🔄 **v1.3 Multi-Framework & Discoverability** - Phases 10-12 (active)

## Phases

<details>
<summary>✅ v1.1 Fix/Resolution (Phases 1-6) - SHIPPED 2026-03-31</summary>

- [x] Phase 1: Schema Foundation (2/2 plans) — completed 2026-03-30
- [x] Phase 2: UI Resolution Display (2/2 plans) — completed 2026-03-31
- [x] Phase 3: Git Context (1/1 plans) — completed 2026-03-31
- [x] Phase 4: Fix Engine (2/2 plans) — completed 2026-03-31
- [x] Phase 5: GitHub Bridge (2/2 plans) — completed 2026-03-31
- [x] Phase 6: Review Agent Inline Comments (1/1 plans) — completed 2026-03-31

</details>

<details>
<summary>✅ v1.2 Skill-Aware PR Review (Phases 7-9) - SHIPPED 2026-03-31</summary>

- [x] Phase 7: Skill Discovery (1/1 plans) — completed 2026-04-01
- [x] Phase 8: Skill Selection (1/1 plans) — completed 2026-04-01
- [x] Phase 9: Context Injection (1/1 plans) — completed 2026-04-01

</details>

### v1.3 Multi-Framework & Discoverability (Phases 10-12)

- [x] **Phase 10: Command Discoverability** - `--help` flag and updated argument-hint on the review command (completed 2026-04-01)
- [x] **Phase 11: OpenCode Compatibility** - Audit agent/command tool names and document runtime differences inline (completed 2026-04-01)
- [ ] **Phase 12: Installer Robustness** - Clean stale agent/command files on re-install while preserving user data

## Phase Details

### Phase 10: Command Discoverability
**Goal**: Users can discover all available review command flags without reading source files
**Depends on**: Nothing (standalone text change)
**Requirements**: DISC-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. Running `/pr-review:review --help` prints a formatted flag reference instead of starting a review
  2. The flag reference lists every available flag (`--post`, `--focus`, `--skills`, `--help`) with a one-line description each
  3. Autocomplete in Claude Code and OpenCode shows the full flag syntax in the `argument-hint` tooltip
**Plans:** 1/1 plans complete
Plans:
- [x] 10-01-PLAN.md — Add --help flag intercept and update argument-hint

### Phase 11: OpenCode Compatibility
**Goal**: Agent and command files work correctly on OpenCode with no manual modification after install
**Depends on**: Phase 10
**Requirements**: RTCOMPAT-01, RTCOMPAT-02
**Success Criteria** (what must be TRUE):
  1. All tool names in agent and command files are verified consistent (PascalCase throughout) so OpenCode auto-mapping has no ambiguity to resolve
  2. Each agent file contains a compatibility block stating what works on Claude Code, what works on OpenCode, and what degrades with what fallback
  3. A user installing on OpenCode can run `/pr-review:review <pr-url>` without hitting a tool-grant failure caused by tool name mismatches
  4. The compatibility blocks are readable inline without opening any external docs
**Plans:** 1/1 plans complete
Plans:
- [x] 11-01-PLAN.md — Add runtime-compat blocks to all agent and command files

### Phase 12: Installer Robustness
**Goal**: Re-installing over an existing installation never leaves stale agent or command files from previous versions
**Depends on**: Phase 11
**Requirements**: RTCOMPAT-03
**Success Criteria** (what must be TRUE):
  1. Running `npx pr-review-agent@latest` over an existing v1.2 install replaces all agent and command files with the current version
  2. After re-install, `findings.json`, `config.json`, and `REVIEW-PLAN.md` are unchanged
  3. No deprecated or renamed agent/command files from prior versions remain alongside the new ones
**Plans:** 1 plan
Plans:
- [ ] 12-01-PLAN.md — Add cleanStaleFiles helper and version detection to installer

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema Foundation | v1.1 | 2/2 | Complete | 2026-03-30 |
| 2. UI Resolution Display | v1.1 | 2/2 | Complete | 2026-03-31 |
| 3. Git Context | v1.1 | 1/1 | Complete | 2026-03-31 |
| 4. Fix Engine | v1.1 | 2/2 | Complete | 2026-03-31 |
| 5. GitHub Bridge | v1.1 | 2/2 | Complete | 2026-03-31 |
| 6. Review Agent Inline Comments | v1.1 | 1/1 | Complete | 2026-03-31 |
| 7. Skill Discovery | v1.2 | 1/1 | Complete | 2026-04-01 |
| 8. Skill Selection | v1.2 | 1/1 | Complete | 2026-04-01 |
| 9. Context Injection | v1.2 | 1/1 | Complete | 2026-04-01 |
| 10. Command Discoverability | v1.3 | 1/1 | Complete    | 2026-04-01 |
| 11. OpenCode Compatibility | v1.3 | 1/1 | Complete    | 2026-04-01 |
| 12. Installer Robustness | v1.3 | 0/1 | Not started | - |

## Backlog

### Phase 999.1: Backlog items

The `--help` flag backlog item (Phase 999.1) has been promoted to Phase 10 as part of v1.3 milestone planning.
