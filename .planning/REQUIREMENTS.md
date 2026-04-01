# Requirements: PR Review Agent v1.3

**Defined:** 2026-03-31
**Core Value:** The developer gets a complete review-to-resolution cycle without leaving their AI assistant: review a PR, see findings, fix them, and have every fix tracked on GitHub with commit links.

## v1.3 Requirements

Requirements for multi-framework support and discoverability. Each maps to roadmap phases.

### Discoverability

- [x] **DISC-01**: Running `/pr-review:review --help` prints a formatted list of all available flags with descriptions instead of starting a review
- [x] **DISC-02**: Command frontmatter `argument-hint` reflects all current flags including `--skills` from v1.2

### Runtime Compatibility

- [ ] **RTCOMPAT-01**: Agent and command files work on OpenCode without modification (PascalCase tool names auto-map, frontmatter parses correctly)
- [ ] **RTCOMPAT-02**: Runtime differences are documented inline in agent files via compatibility blocks (what works, what degrades, fallback behavior)
- [ ] **RTCOMPAT-03**: Installer cleans stale agent/command files on re-install while preserving user data (`findings.json`, `config.json`, `REVIEW-PLAN.md`)

## Future Requirements

### Extended Runtime Support

- **EXT-01**: Copilot agent file generation (`.github/agents/*.agent.md`) — agent-only, no commands
- **EXT-02**: Runtime-config.json written at install time for conditional agent behavior
- **EXT-03**: Global skills scanning (~/.claude/skills/, ~/.config/opencode/skills/)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Kiro support | JSON-only agent format — incompatible with markdown agents |
| Copilot slash commands | No file-based command installation system |
| Tool name placeholders (`__TOOL_READ__` etc.) | Over-engineering — PascalCase works across runtimes |
| `runtime-config.json` | No proven need for runtime-conditional agent behavior yet |
| Global skills (`~/.claude/skills/`) | Deferred from v1.2, still not needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 10 | Complete |
| DISC-02 | Phase 10 | Complete |
| RTCOMPAT-01 | Phase 11 | Pending |
| RTCOMPAT-02 | Phase 11 | Pending |
| RTCOMPAT-03 | Phase 12 | Pending |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap created (Phases 10-12)*
