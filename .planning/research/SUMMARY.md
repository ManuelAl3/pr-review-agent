# Project Research Summary

**Project:** PR Review Agent v1.3 — Multi-Framework Runtime Support and Command Discoverability
**Domain:** Multi-framework AI agent toolkit — npm-distributed, zero-dependency, markdown-agent based
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

The v1.3 milestone for PR Review Agent focuses on two goals: making the toolkit work across AI assistant runtimes beyond Claude Code, and improving command discoverability so users can find available flags without reading source files. Research confirms both goals are achievable with minimal surgery to the existing architecture — the placeholder substitution system already in `bin/install.js` is the correct mechanism to extend, and the `$ARGUMENTS` interpolation available in both Claude Code and OpenCode command files is the correct way to implement `--help` output. No new files are needed. No new dependencies are introduced.

The recommended approach is a two-track delivery. Track 1 — discoverability — is entirely self-contained: add a `<help>` block and `--help` guard to command files, and extend `argument-hint` to show all flags. These are pure text changes with no runtime dependencies and should ship in the first phase. Track 2 — multi-runtime support — requires extending the `RUNTIMES` constant in `bin/install.js` with tool name maps per runtime and adding `__TOOL_*` placeholders to agent and command source files. OpenCode PascalCase tool names may auto-map from Claude Code format per a community source, but the installer rewrite is still recommended for reliability so the system does not depend on undocumented behavior. GitHub Copilot lacks an installable slash command system and its command support should be deferred.

The key risk across both tracks is OpenCode tool name verification — STACK.md found a community claim that OpenCode auto-maps PascalCase tool names, but this is MEDIUM confidence. PITFALLS.md independently identifies tool name mismatches as the highest-severity pitfall, with silent failure (no tool grant, no error message) as the failure mode rather than a visible crash. A secondary cross-cutting risk is the hardcoded `/tmp/` paths in agent bash steps — these work on macOS and Linux today but break on Windows native and containerized environments. This is flagged for a cross-platform hardening phase after v1.3 ships.

---

## Key Findings

### Recommended Stack

The project has no new runtime dependencies for v1.3. The zero-dependency constraint remains intact. All work is within `bin/install.js` (Node.js built-ins), existing markdown agent and command files, and no new files are required. The `RUNTIMES` constant in the installer is the single configuration surface that drives all runtime-specific behavior. Do not introduce a YAML parser — the existing manual string rewrite in `copyFile()` handles all frontmatter substitution.

**Core technologies:**
- Node.js built-ins only (`fs`, `path`, `os`, `http`) — runtime constraint; all installer and server logic stays dependency-free
- Placeholder substitution in `copyFile()` — existing mechanism extended for `__TOOL_*` tool name rewriting; same pattern as `__CONFIG_DIR__`
- Markdown YAML frontmatter — agent and command files use abstract placeholders rewritten at install time; agent body content is identical across all runtimes
- `$ARGUMENTS` interpolation — both Claude Code and OpenCode pass full user input; `--help` detection is plain string comparison in the command markdown body

**Runtime compatibility matrix (verified 2026-03-31):**
- Claude Code: `agents/<name>.md`, `commands/<slug>.md`, PascalCase CSV tool names, `agent:` field works
- OpenCode: same directory convention, lowercase tool names, `agent:` field works, `name:` frontmatter field may cause parse warning — strip on install
- GitHub Copilot: `.agent.md` format, no installable slash command file system — agent-only install at most, defer command support

### Expected Features

**Must have (v1.3 launch — table stakes):**
- `--help` flag on review command — every CLI tool responds to `--help`; users try it before reading docs; pure agent logic change, no installer work; agent detects `--help` in `$ARGUMENTS` and prints formatted flag reference
- `argument-hint` update — extend to show full flag syntax (`<pr-url> [--post] [--focus topics] [--skills list] [--help]`); first touchpoint for new users in autocomplete on both runtimes
- Tool name audit — verify all existing agent files use PascalCase consistently before claiming cross-runtime compatibility; fix any lowercase or inconsistent names found
- Runtime-aware installer config file — write `pr-review/runtime-config.json` with `{ "runtime": "...", "model": "..." }` at install time; keystone for multi-runtime agent behavior

**Should have (v1.3 follow-on if effort allows):**
- `compatibility` frontmatter field documenting `gh` CLI requirement — enables Agent Skills ecosystem to surface this constraint to users; one-line change per command file
- `--help` output includes usage examples in addition to flag list — add after confirming flag detection works correctly on both runtimes

**Defer to v2+:**
- Full SKILL.md directory format migration — unlocks 30+ Agent Skills-compatible runtimes but requires significant installer restructuring; no evidence users need it yet
- GitHub Copilot command installation — Copilot has no installable slash command file system; agent-only is the ceiling without deep integration work
- Per-runtime agent source files — maintenance burden doubles for every new runtime; placeholder substitution is the correct alternative

### Architecture Approach

The existing layered architecture (Installer → Command layer → Agent layer → State layer → UI layer) requires no structural changes for v1.3. The correct strategy is extension at two narrow points: the `RUNTIMES` constant gains `frontmatter` and `tools` sub-objects, and `copyFile()` gains a second substitution pass for `__TOOL_*` placeholders. Command files gain a `<help>` block and a `--help` guard at the top of their `<process>` section. No new files are created. The runtime data files (`findings.json`, `config.json`) remain runtime-agnostic — they must not gain runtime-specific fields.

**Major components and what changes in v1.3:**
1. `bin/install.js` (RUNTIMES constant + `copyFile()`) — gains `frontmatter` and `tools` sub-objects per runtime; `copyFile()` gains `__TOOL_*` substitution pass; this is the core of multi-runtime support
2. `agents/pr-reviewer.md` and `agents/pr-fixer.md` — frontmatter `tools:` line gains `__TOOLS_KEY__` and `__TOOL_*` placeholders; agent body content unchanged
3. `commands/pr-review/review.md`, `setup.md`, `fix.md` — gain `<help>` block, `--help` guard at top of `<process>`, and `__TOOL_*` placeholders in `allowed-tools:`
4. `template/` directory — unchanged for v1.3; cross-platform fixes (`/tmp/` and background server) deferred to next hardening milestone

### Critical Pitfalls

1. **Tool names are runtime-specific — silent failure is the failure mode** — Claude Code uses PascalCase (`Read`, `Bash`, `Grep`); OpenCode uses lowercase (`read`, `bash`, `grep`). When the wrong names are installed, the agent receives no tool grant and fails mid-execution with no clear error. Never hardcode tool names in source agent files; use `__TOOL_*` placeholders rewritten by the installer.

2. **`/tmp/` is not available on all platforms** — all inter-step temp file paths use `/tmp/` hardcoded; these work on macOS/Linux but break on Windows native and containerized runtimes. Replace with `$(node -e "process.stdout.write(require('os').tmpdir())")` before claiming Windows support. This is a cross-platform hardening concern flagged for a post-v1.3 phase.

3. **Model ID format differs by runtime** — Claude Code uses short IDs (`claude-3-5-sonnet-20241022`); OpenCode uses provider-prefixed format (`anthropic/claude-3-5-sonnet-20241022`). Do not put a `model:` field in agent frontmatter; let each runtime use its user-configured model; document capability expectations in the installer output.

4. **Stale files on re-install accumulate over upgrades** — `copyDir()` writes files but never deletes; deprecated command files or renamed agents persist alongside new versions; runtimes may load both creating duplicate commands. Before v1.3 ships, add an upgrade path that wipes the commands and agents directories (while preserving `findings.json` and `config.json`) before copying fresh.

5. **`AskUserQuestion` is Claude Code-specific** — OpenCode uses `question` (lowercase). The review agent uses this tool for interactive skill selection. Add it to the tool name map in the installer, or — the recommended path — expand the bash `readline` approach already present in Step 1b which is runtime-agnostic.

---

## Implications for Roadmap

Based on combined research, the v1.3 milestone maps to five phases ordered by dependency and risk. Phases 1 through 4 are the core v1.3 delivery; Phase 5 is a release-quality gate.

### Phase 1: Command Discoverability (`--help` + argument-hint)

**Rationale:** Fully independent of all runtime work; pure text changes to command files; highest user-facing value per unit of effort; ships immediately with no risk and no dependency on tool name verification
**Delivers:** `/pr-review:review --help` prints formatted flag reference with usage examples; `argument-hint` shows full flag syntax in autocomplete for both Claude Code and OpenCode
**Addresses:** Table-stakes discoverability features from FEATURES.md (`--help` flag, `argument-hint` update — both P1 priority)
**Avoids:** No pitfall risk — no installer changes, no tool name involvement, no cross-platform concerns

### Phase 2: Installer Extension — Tool Name Placeholders

**Rationale:** Architectural keystone for multi-runtime support; must land before any runtime-specific agent file work; the `RUNTIMES` constant changes drive all downstream file generation; Phase 3 is blocked until this ships
**Delivers:** `npx pr-review-agent --claude` and `npx pr-review-agent --opencode` produce agent files with correct runtime-specific tool names; `__TOOL_*` substitution verified end-to-end in `copyFile()`
**Uses:** Placeholder substitution pattern already established in `bin/install.js`; no new mechanism needed
**Implements:** Extended `RUNTIMES` constant with `frontmatter` and `tools` maps; second substitution pass in `copyFile()`
**Avoids:** Pitfall 1 (tool name mismatches); Pitfall 4 (`__CONFIG_DIR__` path audit happens in this phase before adding new placeholders)

### Phase 3: Agent and Command File Frontmatter Placeholders

**Rationale:** Depends on Phase 2 — the installer must know how to rewrite placeholders before source files use them; agent and command file changes are independent of each other and can proceed in parallel within this phase
**Delivers:** Source agent and command files use `__TOOLS_KEY__` and `__TOOL_*` placeholders throughout frontmatter; installed files have concrete runtime-correct tool names; PascalCase audit completed and any inconsistencies resolved
**Implements:** Architecture components 2 and 3 from ARCHITECTURE.md build order
**Avoids:** Pitfall 1 (tool names); Pitfall 9 (`AskUserQuestion` — include in tool map or switch to bash readline approach from Step 1b)

### Phase 4: Runtime Config File + OpenCode Frontmatter Hardening

**Rationale:** Installer writes `runtime-config.json` at install time completing the multi-runtime support story; OpenCode `name:` field warning resolved; model field decision finalized; completes the v1.3 feature set
**Delivers:** `runtime-config.json` written for each runtime at install time; OpenCode installs do not produce frontmatter warnings (`name:` field stripped); `model:` field omitted from agent frontmatter; `compatibility` field added to command files documenting `gh` CLI requirement
**Addresses:** Runtime-aware installer config file (P1 from FEATURES.md); `compatibility` field (P2 from FEATURES.md)
**Avoids:** Pitfall 5 (model ID format differences); Pitfall 2 (`agent:` field and command format — verified per runtime during this phase)

### Phase 5: Installer Robustness — Upgrade Path

**Rationale:** Multi-runtime support creates stale-file risk on re-install that did not exist in prior versions; this is a release-quality gate before v1.3 ships broadly; low implementation risk but must be done before users with existing v1.2 installations upgrade
**Delivers:** Re-install over existing installation removes stale command and agent files while preserving `findings.json` and `config.json`; no duplicate commands appear after upgrade; upgrade tested against a v1.2 installation
**Avoids:** Pitfall 6 (stale files accumulate across runtime installs); Pitfall 11 (re-install leaves stale runtime-specific files from previous version)

### Phase Ordering Rationale

- Phase 1 ships first because it has zero dependencies and maximum user-facing value. Discoverability improvements are visible immediately without any multi-runtime testing required.
- Phases 2 and 3 are ordered by dependency: the installer must know target tool names before source files can use abstract placeholders. Phase 3 work is blocked until Phase 2 is confirmed correct.
- Phase 4 completes the multi-runtime story. It is sequenced after Phase 3 because it verifies the end-to-end install flow on both runtimes.
- Phase 5 is a release gate, not a feature. It matters most at the moment users upgrade from v1.2, which is exactly when v1.3 ships.

### Research Flags

Phases needing deeper verification during planning:

- **Phase 2 (Installer tool name mapping):** OpenCode tool name exact values need verification against current official docs before finalizing the `RUNTIMES` tool map. Research found community-sourced values (MEDIUM confidence: community gist and compatibility guide). Verify `read`, `write`, `bash`, `grep`, `glob`, `edit` against `opencode.ai/docs/tools/` before coding. If auto-mapping from PascalCase is confirmed as official behavior, the rewrite becomes belt-and-suspenders hardening rather than a strict requirement.
- **Phase 4 (OpenCode frontmatter):** The `name:` field behavior (warning vs parse error vs silently ignored) in current OpenCode versions needs a direct test against a real installation. Also verify whether `allowed-tools:` is honored, generates a warning, or requires `permission:` field instead.

Phases with standard patterns (skip research-phase):

- **Phase 1 (`--help` flag):** Fully documented; `$ARGUMENTS` string detection in command markdown is established and verified in both runtimes; zero implementation unknowns.
- **Phase 3 (agent/command file placeholders):** Same pattern as existing `__CONFIG_DIR__` substitution; additive change to frontmatter only; agent body content unchanged.
- **Phase 5 (installer robustness):** Standard file-copy-with-cleanup pattern; Node.js built-ins handle everything; no external dependencies; low implementation risk.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Claude Code and OpenCode official docs verified 2026-03-31; OpenCode exact tool names are MEDIUM confidence (community source, not official docs) |
| Features | HIGH | Feature priorities derived directly from official runtime docs; Agent Skills standard specification read directly; anti-features grounded in concrete technical constraints |
| Architecture | HIGH | All patterns derived from direct codebase analysis of `bin/install.js`, agent files, and command files; existing placeholder system is well-understood; no structural change required |
| Pitfalls | HIGH | Critical pitfalls verified against official docs (tool names, model IDs, `/tmp/`); secondary pitfalls sourced from codebase analysis and Node.js cross-platform documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **OpenCode tool names (exact values):** Research found PascalCase auto-mapping claim in a community compatibility guide (MEDIUM confidence). Before writing the `RUNTIMES` tool map in Phase 2, verify exact lowercase names directly against `opencode.ai/docs/tools/`. If auto-mapping is confirmed as official behavior, the installer rewrite is still recommended as insurance against future OpenCode version changes.
- **OpenCode `allowed-tools:` vs `permission:` field:** PITFALLS.md flags this as a moderate risk but confidence in OpenCode's current behavior is MEDIUM. Test an actual OpenCode install with the current command frontmatter to confirm whether `allowed-tools:` is honored, ignored, or produces a warning before designing the Phase 4 frontmatter hardening.
- **`AskUserQuestion` → `question` resolution path:** Two approaches exist — add to the installer tool name map, or expand the bash `readline` approach already present in Step 1b of the review agent. The bash approach is more portable and already present in the codebase. The Phase 3 plan should explicitly choose one and document why.

---

## Sources

### Primary (HIGH confidence)

- [Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents) — frontmatter fields, tool names, directory paths (verified 2026-03-31)
- [Claude Code tools reference](https://code.claude.com/docs/en/tools-reference) — exact PascalCase tool names (verified 2026-03-31)
- [OpenCode agents docs](https://opencode.ai/docs/agents/) — frontmatter fields, directory paths, model ID format (verified 2026-03-31)
- [OpenCode tools docs](https://opencode.ai/docs/tools/) — lowercase tool names (verified 2026-03-31)
- [OpenCode commands docs](https://opencode.ai/docs/commands/) — `$ARGUMENTS` injection, `agent:` field (verified 2026-03-31)
- [Agent Skills open standard specification](https://agentskills.io/specification) — `compatibility` field, `allowed-tools`, runtime adoption list (verified 2026-03-31)
- [VS Code custom agents docs](https://code.visualstudio.com/docs/copilot/customization/custom-agents) — Copilot `.agent.md` format, no slash command install system
- [Kiro custom agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference/) — JSON-only agent format, no markdown agent install
- [Node.js os.tmpdir() docs](https://nodejs.org/api/os.html) — cross-platform temp directory behavior
- Codebase analysis: `bin/install.js`, `agents/pr-reviewer.md`, `agents/pr-fixer.md`, `commands/pr-review/review.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md` — HIGH confidence first-party

### Secondary (MEDIUM confidence)

- [Claude Code to OpenCode compatibility guide (community gist)](https://gist.github.com/RichardHightower/827c4b655f894a1dd2d14b15be6a33c0) — tool name mapping table; PascalCase auto-map claim
- [OpenCode issue #3461](https://github.com/sst/opencode/issues/3461) — `name:` field warning behavior; `mode: subagent` behavior
- [AgentSys multi-framework config directory registry](https://github.com/agent-sh/agentsys) — runtime config directory paths cross-referenced
- [Node.js os.tmpdir() Windows path issue](https://github.com/nodejs/node/issues/60582) — Windows temp path edge cases

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
