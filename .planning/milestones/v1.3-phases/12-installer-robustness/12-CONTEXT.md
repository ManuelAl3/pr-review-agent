# Phase 12: Installer Robustness - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-installing over an existing installation never leaves stale agent or command files from previous versions. User data (findings.json, config.json, REVIEW-PLAN.md) is preserved through upgrades.

</domain>

<decisions>
## Implementation Decisions

### Cleanup strategy
- **D-01:** Wipe-and-replace for commands and agents — delete `commands/pr-review/` directory and `agents/pr-reviewer.md`, `agents/pr-fixer.md` entirely before copying fresh files from the package
- **D-02:** Cleanup runs as the first step inside `install()`, before any file copying begins

### User data preservation
- **D-03:** Selective overwrite for `pr-review/` template directory — only overwrite known runtime files (`index.html`, `serve.js`, `.gitignore`, `templates/*`, `.version`)
- **D-04:** Never touch user data files: `findings.json`, `config.json`, `REVIEW-PLAN.md`, and any other files the user may have added to `pr-review/`

### Failure handling
- **D-05:** Fail fast with the existing `main().catch()` error handler — no rollback or atomic swap logic
- **D-06:** Worst case after mid-install failure (commands wiped, not replaced), user re-runs `npx pr-review-agent@latest` to get a clean install

### Install feedback
- **D-07:** When `.version` file exists in `pr-review/`, show one upgrade line: `Upgrading from vX.Y.Z -> vA.B.C` before the normal install output
- **D-08:** No per-file removal listing, no "preserved" confirmations — keep output minimal

### Claude's Discretion
- Exact ordering of wipe vs copy operations within `install()`
- Whether to extract the runtime-file list into a constant or keep it inline
- How to handle the edge case where `agents/` directory has other non-pr-review agent files (should only delete `pr-reviewer.md` and `pr-fixer.md`, not the whole directory)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Installer
- `bin/install.js` -- Current installer with `install()`, `uninstall()`, `copyFile()`, `copyDir()` functions. Lines 136-200 are the install flow, lines 111-133 are the uninstall flow (has the known-paths pattern to reuse)

### Requirements
- `.planning/REQUIREMENTS.md` -- RTCOMPAT-03 defines the requirement: "Installer cleans stale agent/command files on re-install while preserving user data"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uninstall()` function (install.js:111-133): Already has the pattern of knowing which paths to clean — `commands/pr-review`, `agents/pr-reviewer.md`, `agents/pr-fixer.md`, `pr-review/`. The wipe step in `install()` can reuse this knowledge
- `copyDir()` function (install.js:100-108): Recursively copies directories, already handles `mkdirp`
- `copyFile()` function (install.js:87-98): Handles placeholder rewriting for `.md`, `.js`, `.json` files
- `.version` file (install.js:176): Already written on install — can be read to detect previous version for upgrade message

### Established Patterns
- ANSI color helpers (`c` object) for consistent CLI output
- `mkdirp()` for safe directory creation
- `fs.existsSync()` checks before operations

### Integration Points
- The cleanup logic goes inside `install()` (install.js:136), before the existing copy steps
- Version detection reads from `pr-review/.version` in the target config directory
- The existing `runtimeFiles` array (install.js:163) already lists the files that get copied to `pr-review/` — this is the selective overwrite list

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 12-installer-robustness*
*Context gathered: 2026-04-01*
