# Phase 12: Installer Robustness - Research

**Researched:** 2026-04-01
**Domain:** Node.js installer script / filesystem operations (`bin/install.js`)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Wipe-and-replace for commands and agents — delete `commands/pr-review/` directory and `agents/pr-reviewer.md`, `agents/pr-fixer.md` entirely before copying fresh files from the package.
- **D-02:** Cleanup runs as the first step inside `install()`, before any file copying begins.
- **D-03:** Selective overwrite for `pr-review/` template directory — only overwrite known runtime files (`index.html`, `serve.js`, `.gitignore`, `templates/*`, `.version`).
- **D-04:** Never touch user data files: `findings.json`, `config.json`, `REVIEW-PLAN.md`, and any other files the user may have added to `pr-review/`.
- **D-05:** Fail fast with the existing `main().catch()` error handler — no rollback or atomic swap logic.
- **D-06:** Worst case after mid-install failure (commands wiped, not replaced), user re-runs `npx pr-review-agent@latest` to get a clean install.
- **D-07:** When `.version` file exists in `pr-review/`, show one upgrade line: `Upgrading from vX.Y.Z -> vA.B.C` before the normal install output.
- **D-08:** No per-file removal listing, no "preserved" confirmations — keep output minimal.

### Claude's Discretion

- Exact ordering of wipe vs copy operations within `install()`.
- Whether to extract the runtime-file list into a constant or keep it inline.
- How to handle the edge case where `agents/` directory has other non-pr-review agent files (should only delete `pr-reviewer.md` and `pr-fixer.md`, not the whole directory).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTCOMPAT-03 | Installer cleans stale agent/command files on re-install while preserving user data (`findings.json`, `config.json`, `REVIEW-PLAN.md`) | Addressed by D-01 through D-08 in locked decisions; implementation is entirely within `bin/install.js` |
</phase_requirements>

---

## Summary

Phase 12 is a pure JavaScript surgery task on `bin/install.js`. No external libraries are involved. The entire implementation fits inside the existing `install()` function with two additions: a cleanup prologue (wipe stale agent/command files) and a version-detection prologue (read `.version` to emit the upgrade line).

The installer already has all the primitives needed: `fs.rmSync()` for directory removal, `fs.unlinkSync()` for individual files, `fs.existsSync()` for guard checks, and the `uninstall()` function (lines 111-133) which encodes exactly which paths belong to pr-review-agent. The cleanup step in `install()` is a targeted subset of what `uninstall()` already does — it wipes `commands/pr-review/` and the two named agent files, but does NOT touch `pr-review/` (which contains user data).

The version detection reads `pr-review/.version` from the target config directory before any operations begin, stores the value, then after the upgrade line is emitted the rest of the install flow is unchanged.

**Primary recommendation:** Add a `cleanStaleFiles(configDir)` helper that mirrors the path knowledge from `uninstall()` but only removes the commands dir and two agent files. Call it, preceded by version detection, as the first two statements in `install()`.

---

## Standard Stack

### Core (no new dependencies)

| Tool | Where it lives | Purpose |
|------|---------------|---------|
| `fs.rmSync(path, { recursive: true })` | Node.js built-in | Remove a directory tree. Available since Node 14.14. Project requires >= 18. |
| `fs.unlinkSync(path)` | Node.js built-in | Remove a single file. |
| `fs.existsSync(path)` | Node.js built-in | Guard check before removal. |
| `fs.readFileSync(path, 'utf-8')` | Node.js built-in | Read `.version` file to get prior version string. |

No npm packages added. Zero-dependency constraint is unchanged.

**Version verification:** Not applicable — all tools are Node.js built-ins available in Node >= 18.

---

## Architecture Patterns

### Recommended Structure of the Modified `install()` Function

```
install(runtime, configDir)
  │
  ├─ [NEW] Step 0a: Detect prior version
  │     Read configDir/pr-review/.version (if exists) → store as prevVersion
  │
  ├─ [NEW] Step 0b: Emit upgrade line (if prevVersion exists)
  │     log(`  Upgrading from v${prevVersion} -> v${VERSION}`)
  │
  ├─ [NEW] Step 0c: Clean stale agent/command files
  │     cleanStaleFiles(configDir)  ← new helper
  │
  ├─ Step 1: Copy commands  (unchanged)
  ├─ Step 2: Copy agents    (unchanged)
  ├─ Step 3: Copy runtime files (unchanged — selective by design)
  ├─ Step 4: Write .version  (unchanged)
  └─ Step 5: Ensure .gitignore (unchanged)
```

### Pattern 1: cleanStaleFiles Helper

**What:** Deletes `commands/pr-review/` directory and the two named agent files before fresh files are copied. Mirrors the path knowledge already encoded in `uninstall()`.

**When to use:** Called at the start of every `install()` invocation (first-time installs are no-ops since the paths don't exist yet — guard with `fs.existsSync()`).

**Example:**
```javascript
// Source: adapted from uninstall() pattern at bin/install.js:111-133
function cleanStaleFiles(configDir) {
  const stale = [
    path.join(configDir, 'commands', 'pr-review'),
    path.join(configDir, 'agents', 'pr-reviewer.md'),
    path.join(configDir, 'agents', 'pr-fixer.md'),
  ];
  for (const p of stale) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, { recursive: true });
      else fs.unlinkSync(p);
    }
  }
}
```

Key difference from `uninstall()`: `pr-review/` is NOT in the list — that directory contains user data.

### Pattern 2: Version Detection

**What:** Read the `.version` file written by the previous install to detect and announce upgrades.

**When to use:** Called at the very start of `install()`, before `cleanStaleFiles()`.

**Example:**
```javascript
// Source: .version already written at install.js:176
const versionPath = path.join(configDir, 'pr-review', '.version');
const prevVersion = fs.existsSync(versionPath)
  ? fs.readFileSync(versionPath, 'utf-8').trim()
  : null;

if (prevVersion && prevVersion !== VERSION) {
  log(`  ${c.yellow}Upgrading from v${prevVersion} -> v${VERSION}${c.reset}`);
  log('');
}
```

Note: `prevVersion === VERSION` (same version re-install) emits no upgrade line — clean behavior for idempotent re-installs.

### Anti-Patterns to Avoid

- **Wiping `pr-review/` entirely:** Destroys `findings.json`, `config.json`, and `REVIEW-PLAN.md`. D-04 explicitly forbids this.
- **Using `copyDir()` to overwrite `commands/pr-review/`:** `copyDir()` does not remove files first — renamed/deleted source files would leave orphans. Wipe-then-copy is the correct pattern.
- **Calling `uninstall()` from `install()`:** `uninstall()` removes `pr-review/` which would destroy user data. Do not reuse it directly.
- **Hardcoding paths differently from `uninstall()`:** The two functions must agree on which paths belong to the agent. Use the same list.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive directory delete | Custom tree walker | `fs.rmSync(p, { recursive: true })` | Node.js built-in, available since 14.14, already tested in production |
| Directory existence check | Try/catch on stat | `fs.existsSync()` | Consistent with rest of installer — same pattern used in `mkdirp()`, `copyDir()`, step 5 |

**Key insight:** Every filesystem primitive needed already exists in the codebase or as a Node.js built-in. This phase adds ~15-20 lines of code, not a new subsystem.

---

## Runtime State Inventory

> Not applicable. This is not a rename/refactor/migration phase — it modifies installer behavior. No stored data, live service config, OS-registered state, secrets, or build artifacts carry values that must change.

---

## Common Pitfalls

### Pitfall 1: Leaving orphan files after a rename in a future version

**What goes wrong:** A future phase renames `pr-fixer.md` to `pr-fix-agent.md`. The installer copies the new name, but the old `pr-fixer.md` remains because `cleanStaleFiles` only lists the names it knew about at authoring time.

**Why it happens:** The stale-file list is static, not derived from a manifest.

**How to avoid:** The current scope (D-01) only needs to handle the known v1.2 file set. For future renames, the developer must update the `cleanStaleFiles` list when renaming files. This is acceptable given the project's low churn rate. Document this in a comment near the list.

**Warning signs:** After install, both old and new agent filenames exist side-by-side in the agents directory.

### Pitfall 2: stat() call on non-existent path

**What goes wrong:** `fs.existsSync()` returns false, but between the check and `fs.statSync()` the file is created (TOCTOU race). In practice impossible in this single-user installer context, but the pattern of calling `statSync` without a prior `existsSync` guard would throw `ENOENT`.

**Why it happens:** Missing existence guard.

**How to avoid:** Always guard with `fs.existsSync()` before `fs.statSync()` and removal calls — exactly as done in `uninstall()` (lines 121-128).

### Pitfall 3: Version file read timing

**What goes wrong:** Reading `.version` after cleanup instead of before means if cleanup removes anything before the read, the upgrade message still works because `.version` lives in `pr-review/` which is NOT cleaned. But if ordering is confused and `.version` is read after being overwritten, the displayed "from" version is incorrect.

**Why it happens:** Reading version after `install()` has already written the new `.version`.

**How to avoid:** Version detection (Step 0a) must occur before `cleanStaleFiles()` and before any `copyFile`/`copyDir` calls. Step 0a → 0b → 0c ordering is mandatory.

### Pitfall 4: Same-version re-install shows upgrade message

**What goes wrong:** User re-runs same version (e.g., to repair a broken install). The upgrade line reads "Upgrading from v1.3.0 -> v1.3.0" which is confusing.

**Why it happens:** Version comparison not guarded.

**How to avoid:** Only emit the upgrade line when `prevVersion !== VERSION` (see Pattern 2 example).

---

## Code Examples

### Current `uninstall()` — the pattern to mirror (lines 111-133)

```javascript
// Source: bin/install.js:111-133
function uninstall(configDir) {
  const toRemove = [
    path.join(configDir, 'commands', 'pr-review'),
    path.join(configDir, 'agents', 'pr-reviewer.md'),
    path.join(configDir, 'agents', 'pr-fixer.md'),
    path.join(configDir, 'pr-review'),               // <-- NOT included in cleanStaleFiles
  ];
  for (const p of toRemove) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, { recursive: true });
      else fs.unlinkSync(p);
      removed++;
      log(`  ${c.red}removed${c.reset} ${p}`);
    }
  }
}
```

### Current `install()` entry point — where new steps go (lines 136-145)

```javascript
// Source: bin/install.js:136-145
function install(runtime, configDir) {
  const rt = RUNTIMES[runtime];
  configDirName = rt.configDirName;
  const templateDest = path.join(configDir, 'pr-review');

  log(`  ${c.cyan}Installing for ${rt.name}...${c.reset}`);
  log('');

  // 1. Copy commands  ← new steps 0a/0b/0c go BEFORE here
  ...
}
```

### Current `runtimeFiles` list (line 163) — the selective-overwrite contract

```javascript
// Source: bin/install.js:163
const runtimeFiles = ['index.html', 'serve.js', '.gitignore'];
// Also: templates/ subdir (lines 170-172), .version (line 176), .gitignore guard (lines 179-182)
// User data NOT in this list: findings.json, config.json, REVIEW-PLAN.md
```

This existing list already encodes D-03. No change needed to the runtime copy logic — it already performs selective overwrite by only touching files it explicitly lists.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `fs.rmdirSync(p, { recursive: true })` | `fs.rmSync(p, { recursive: true })` | `rmdirSync` recursive option deprecated in Node 16, removed in Node 22. `rmSync` is the correct API for Node >= 14.14. Project requires >= 18 so `rmSync` is safe. |

**Deprecated/outdated:**
- `fs.rmdirSync(path, { recursive: true })`: Deprecated. Use `fs.rmSync(path, { recursive: true })` instead.

---

## Open Questions

1. **Should `cleanStaleFiles` log anything?**
   - What we know: D-08 says no per-file removal listing.
   - What's unclear: Whether silent removal is sufficient or a single "Cleaning up previous version..." line would be helpful.
   - Recommendation: Stay silent (D-08). The upgrade line (D-07) already communicates that an upgrade is happening. Noisy removal output is explicitly rejected.

2. **Does the `agents/` directory need to exist before agent files are deleted?**
   - What we know: `fs.existsSync()` on a file path returns false if neither the file nor the directory exists. No error thrown.
   - What's unclear: Nothing — the guard in the pattern handles this correctly.
   - Recommendation: No special handling needed. First-time installs skip the loop body silently.

---

## Environment Availability

Step 2.6: SKIPPED — Phase is purely a code change to `bin/install.js`. No external tools, services, or runtimes beyond Node.js >= 18 (already required by `package.json`) are involved.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — project has no test suite (per CLAUDE.md: "No build step, no tests, no linter") |
| Config file | None |
| Quick run command | `node bin/install.js --help` (smoke test) |
| Full suite command | Manual: run `npx . --claude --local` twice, verify idempotence |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTCOMPAT-03a | Re-install replaces all agent and command files | manual-smoke | `node bin/install.js --claude --local && node bin/install.js --claude --local` — verify no duplicate/stale files | N/A — no test suite |
| RTCOMPAT-03b | `findings.json`, `config.json`, `REVIEW-PLAN.md` unchanged after re-install | manual-smoke | Create dummy files, re-install, verify contents unchanged | N/A |
| RTCOMPAT-03c | Upgrade line shown when `.version` differs | manual-smoke | Manually write older version string to `.version`, re-run installer | N/A |

### Sampling Rate

- **Per task commit:** `node bin/install.js --help` (sanity check, no crash)
- **Phase gate:** Manual re-install scenario described in RTCOMPAT-03a and 03b above

### Wave 0 Gaps

None — no test infrastructure required (project has no test suite by design).

---

## Sources

### Primary (HIGH confidence)

- `bin/install.js` (this repository) — full read of lines 1-283, all patterns extracted directly from source
- `E:/Proyectos/pr-review-agent/.planning/phases/12-installer-robustness/12-CONTEXT.md` — all locked decisions D-01 through D-08
- Node.js 18 documentation (built-in `fs` module) — `rmSync`, `unlinkSync`, `existsSync`, `readFileSync` APIs confirmed as stable

### Secondary (MEDIUM confidence)

None required — this phase has no external dependencies.

### Tertiary (LOW confidence)

None.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|---------------------|
| Zero runtime dependencies | No npm packages added — use `fs` built-ins only |
| Commit messages in English, conventional commits | `fix: clean stale agent/command files on re-install` |
| `log()` helper for all CLI output | Use `log()`, not `console.log()`, for upgrade message |
| ANSI color via `c` object | Use `c.yellow` or similar for upgrade line (consistent with existing style) |
| 2-space indentation, single quotes | Apply to all new code |
| Section headers use `// ===== Section Name =====` | New helper goes in the Install section or a new Upgrade section |
| Functions stay focused, single responsibility | `cleanStaleFiles(configDir)` is its own named function, not inlined |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Node.js built-ins, no unknowns
- Architecture: HIGH — all patterns derived directly from existing installer code
- Pitfalls: HIGH — derived from first-principles analysis of the specific code

**Research date:** 2026-04-01
**Valid until:** Stable — no external libraries involved; valid until `bin/install.js` is substantially refactored
