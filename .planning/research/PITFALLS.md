# Pitfalls Research: Multi-Framework Runtime Support (v1.3)

**Domain:** Adding multi-framework runtime support to an existing npm-distributed AI agent toolkit (markdown agents, placeholder-based path system, zero dependencies)
**Researched:** 2026-03-31
**Confidence:** HIGH (Claude Code official docs + OpenCode official docs + Kiro official docs + agentsys codebase analysis + Node.js cross-platform docs)

---

## Critical Pitfalls

Mistakes that cause broken installs, silently wrong behavior, or agents that fail without error messages.

---

### Pitfall 1: Assuming Tool Names Are Universal Across Runtimes

**What goes wrong:**
The current agent files declare `tools: Read, Write, Bash, Grep, Glob` in their YAML frontmatter. These are Claude Code tool names with PascalCase capitalization. When the same agent file is installed for OpenCode, the runtime reads the `tools:` field but OpenCode tool names are lowercase: `read`, `write`, `bash`, `grep`, `glob`. The agent silently receives no tools or a partial tool set, causing the review agent to fail mid-execution with no clear error — it either cannot read files or cannot run bash commands.

Additionally, Kiro agents are JSON files, not markdown with YAML frontmatter, so agent content cannot be directly installed in Kiro's `.kiro/agents/` directory at all.

**Why it happens:**
The developer tests only against Claude Code during development. The `tools:` field is not validated at install time — the installer just copies the file. The failure surfaces at runtime when the agent tries to use a tool that wasn't granted.

**How to avoid:**
- At install time, rewrite the `tools:` frontmatter value based on the detected runtime. Claude Code uses `Read, Write, Bash, Grep, Glob` (PascalCase). OpenCode uses `read, write, bash, grep, glob` (lowercase).
- Add a second placeholder, e.g., `__TOOLS_LIST__`, that the installer rewrites per runtime. Or maintain per-runtime sections in the agent file that the installer selects.
- Never hardcode tool names in the source agent files — they are runtime-specific.
- Document the exact tool name mapping as a maintained registry in the codebase.

**Warning signs:**
- Agent installed on OpenCode logs "tool not found" or silently skips steps that require Read/Write.
- Review agent finishes but writes no `findings.json` (Write tool was not granted).
- Agent file header shows original PascalCase names in an OpenCode install.

**Phase to address:** Runtime-aware installer phase (the phase that adds per-runtime placeholder rewriting).

---

### Pitfall 2: The `agent:` Frontmatter Field in Commands Is a Claude Code Convention — OpenCode Does Not Honor It

**What goes wrong:**
The current command files (`review.md`, `setup.md`, `fix.md`) use `agent: pr-reviewer` in their YAML frontmatter to link to the corresponding agent file. Claude Code reads this field and routes the command invocation to the named agent. OpenCode command files use `agent:` as well per their docs, but the field value must match the agent filename without extension — and both runtimes expect the agent to exist in the runtime's own agents directory, not in a shared location.

The deeper issue: when a new runtime is added (e.g., Kiro), Kiro agents are JSON files in `.kiro/agents/`, not markdown files. The `agent:` frontmatter pattern does not apply. Commands in Kiro are slash commands defined differently. Installing the same command `.md` files into a Kiro environment will produce commands that reference non-existent agents.

**Why it happens:**
The installer uses a single `commandsDir` and `agentsDir` per runtime. When adding a third runtime, the developer assumes the directory structure is the same. Kiro's agent format (JSON, not markdown) breaks this assumption entirely.

**How to avoid:**
- Treat each runtime as a separate installation profile with explicit, verified configuration.
- For runtimes where the `agent:` frontmatter convention works (Claude Code, OpenCode), use it. For runtimes where it does not (Kiro), generate a different artifact — a JSON agent config file that embeds the agent instructions in the `prompt` field.
- Do not add a runtime to the installer until you have verified the complete installation contract: commands directory, agents directory, file format, and agent invocation mechanism.
- Maintain a runtime compatibility matrix in the codebase documenting what each supported runtime can and cannot do.

**Warning signs:**
- Commands install without error but fail to invoke the agent at runtime.
- The runtime shows the slash command in its UI but executing it produces a "agent not found" error.
- Agent files are copied to a directory that the runtime does not scan for agents.

**Phase to address:** Runtime compatibility matrix and installer expansion phase.

---

### Pitfall 3: `/tmp/` Is Not Available on All Platforms or Runtimes

**What goes wrong:**
The review agent uses `/tmp/skills.json`, `/tmp/hunk_ranges.json`, `/tmp/inline_findings.json`, `/tmp/fallback_findings.json`, `/tmp/review_payload.json`, and others as inter-step communication files. This pattern works on macOS and Linux. On Windows, `/tmp/` does not exist. The agent currently runs under bash (Git Bash or WSL on Windows), which maps `/tmp/` to a Windows temp directory, but this mapping is fragile — it depends on the bash environment being configured correctly.

When a new runtime is added that runs agents in a different shell environment (e.g., PowerShell, or a containerized environment where `/tmp/` is not mounted), all inter-step temp file operations fail silently. The agent writes to a path that doesn't exist or can't be read back by Node.js in a subsequent step.

**Why it happens:**
`/tmp/` is so universally available on macOS/Linux that developers forget it is a Unix convention. The existing Windows behavior works because the project runs in Git Bash, which provides a `/tmp` symlink. Adding a runtime that uses a different execution environment removes this safety net.

**How to avoid:**
- Replace all `/tmp/` hardcoded paths with `$(node -e "process.stdout.write(require('os').tmpdir())")` or a pre-computed `$TMPDIR` variable set at the start of each step.
- At the top of each bash step that uses temp files, set: `TMPDIR=$(node -e "process.stdout.write(require('os').tmpdir())")` and use `$TMPDIR/pr-review-skills.json` etc.
- Use prefixed filenames (e.g., `pr-review-skills.json` not `skills.json`) to avoid collisions with other tools using the same temp directory.
- Test this explicitly on Windows native (not just WSL) before declaring multi-platform support.

**Warning signs:**
- Steps that write to `/tmp/` succeed but the next step that reads from `/tmp/` finds the file missing.
- Node.js `fs.readFileSync('/tmp/skills.json')` throws `ENOENT` on Windows.
- On PowerShell-based runtimes, bash heredoc temp file writes have no effect.

**Phase to address:** Every phase that touches inter-step temp file communication — address as part of the cross-platform hardening phase.

---

### Pitfall 4: `__CONFIG_DIR__` Placeholder System Breaks for Runtimes With Multi-Segment Config Paths

**What goes wrong:**
The current placeholder system uses a single string replacement: `__CONFIG_DIR__` → `.claude` or `.config/opencode`. For `.config/opencode`, the replacement produces paths like `$HOME/.config/opencode/pr-review/` — two path segments in the replaced value. This works when the path is embedded in a shell variable assignment (`PR_REVIEW_DIR="$HOME/.config/opencode/pr-review/"`).

However, when the placeholder appears inside a Node.js string (e.g., `path.join(home, '__CONFIG_DIR__', 'pr-review')`), the two-segment replacement produces `path.join(home, '.config/opencode', 'pr-review')`. On Windows, this creates a mixed-separator path. When a future runtime has a three-segment config path (e.g., `.config/some-tool/v2`), the assumption of "one path segment" breaks more severely.

Additionally, the installer's `configDirName` variable is set globally before file copying begins. If the installer ever needs to copy files for two runtimes in a single invocation (e.g., a `--all` flag), the global `configDirName` state will be wrong for the second runtime.

**Why it happens:**
The placeholder was designed for a single path segment (`.claude`) and extended to handle `.config/opencode` without examining all code paths where the replacement might behave differently. The global mutable `configDirName` variable in `bin/install.js` works for the current sequential, single-runtime install but would fail in a multi-runtime scenario.

**How to avoid:**
- Audit every location in agent files and command files where `__CONFIG_DIR__` appears. For each occurrence, verify the resulting path is correct for both `.claude` and `.config/opencode` after substitution.
- For Node.js path operations in bash heredocs within agent files, prefer `path.join(os.homedir(), '__CONFIG_DIR__', ...)` — which works correctly when `__CONFIG_DIR__` is replaced with `.config/opencode` because `path.join` handles sub-path segments.
- Refactor the installer to pass `configDirName` as a parameter to `copyFile` rather than using a global variable. This enables future multi-runtime installs.
- Test path construction with each runtime's config dir value immediately after adding a new runtime to the installer.

**Warning signs:**
- Paths in agent files contain mixed separators on Windows after install (`\.config/opencode\pr-review`).
- Global installs work but local installs fail (different base paths expose the path-joining bug).
- The installer log shows the correct destination directory but the agent file still contains the literal placeholder.

**Phase to address:** Installer refactoring phase, before any new runtime is added.

---

### Pitfall 5: Model ID Format Differences Between Runtimes Cause Silent Wrong Model Selection

**What goes wrong:**
Claude Code model selection is configured separately from agent files — agents inherit the session model or specify `model: "inherit"`. OpenCode requires explicit model IDs in the format `anthropic/claude-3-5-sonnet-20241022`. If the agent file specifies a model ID using one format, it either fails to resolve or silently falls back to a different model in the other runtime.

For a review agent, this means the review might run on a significantly cheaper/weaker model than intended without any warning to the user. The quality difference is invisible unless the user actively checks.

**Why it happens:**
Model ID namespacing differs by runtime. Claude Code model IDs match Anthropic's internal naming (`claude-3-5-sonnet-20241022`). OpenCode model IDs are namespaced by provider (`anthropic/claude-3-5-sonnet-20241022`). A toolkit that tries to specify a model in its agent frontmatter must account for this difference or omit the field entirely.

**How to avoid:**
- Omit the `model:` field from agent frontmatter entirely. Let the user's runtime configuration determine which model to use. The review agent does not require a specific model — it requires the model the user has already chosen and authenticated.
- If a minimum model capability is required, document it in the installation output: "Works best with Claude 3.5 Sonnet or equivalent. Ensure your AI assistant is configured to use a capable model."
- Do not add a `__MODEL_ID__` placeholder — model resolution is too complex and varies too much between runtimes to be reliably managed in a distribution file.

**Warning signs:**
- Agent frontmatter contains a model ID that is not recognized by the installed runtime.
- Review findings are lower quality than expected on the same PR — suggests a weaker fallback model was used.
- Runtime logs show model resolution warnings or fallback messages.

**Phase to address:** Runtime-aware installer phase — add a model field handling decision to the compatibility matrix.

---

### Pitfall 6: Adding a New Runtime to the Installer Does Not Update Already-Installed Copies

**What goes wrong:**
A user installs the toolkit at v1.2 for Claude Code. v1.3 is released with multi-framework support. The user runs `npx pr-review-agent@latest --opencode --global` to install for OpenCode. The installer writes new files to `~/.config/opencode/`, but the existing `~/.claude/` installation still has v1.2 agent files. If the v1.3 agent files are not backward-compatible with v1.2 behavior (e.g., new frontmatter fields, changed step logic), the Claude Code installation will silently run stale code.

The user now has two different agent versions running against the same `findings.json` and `config.json` files — producing inconsistent results.

**Why it happens:**
The installer writes to a target directory without checking whether an existing installation exists for other runtimes. There is no cross-runtime version registry. The `.version` file written by the installer is per-installation, not shared.

**How to avoid:**
- When a new runtime is installed, also re-install for all previously-detected runtimes (or prompt the user to do so).
- Write the version file to a shared location (`~/.pr-review-agent-version` or similar) that all runtime installations can check.
- At review time, have the agent check its own version file and warn if it is behind the npm package version: "This pr-review-agent installation is v1.2. Run `npx pr-review-agent@latest` to update."
- Never change the `findings.json` or `config.json` schema in a way that is not backward-compatible with the previous version.

**Warning signs:**
- `config.json` written by the OpenCode agent is missing fields expected by the HTML UI loaded by the Claude Code agent.
- User reports that the HTML preview shows different fields after switching runtimes.
- `findings.json` schema has changed between installed versions, causing parse errors in the UI.

**Phase to address:** Installer expansion phase — design the upgrade path before releasing multi-runtime support.

---

## Moderate Pitfalls

Mistakes that create inconsistent behavior or difficult debugging, but do not completely break functionality.

---

### Pitfall 7: The `allowed-tools` Frontmatter Field Is Parsed Differently in Claude Code vs OpenCode

**What goes wrong:**
The current command files use `allowed-tools:` as a list in YAML frontmatter. Claude Code reads this and enforces it as an allowlist for the command. OpenCode's newer configuration uses a `permission:` field with allow/deny/ask values per tool. The `allowed-tools:` field is treated as a legacy alias in OpenCode and may be deprecated or ignored in future versions.

When `allowed-tools:` is silently ignored, the command runs with full tool access in OpenCode. This is not a security failure in this context (the toolkit is developer-local), but it means the command's documented tool requirements are not enforced, making debugging harder.

**How to avoid:**
- Generate runtime-specific command files during installation. The installer already rewrites `__CONFIG_DIR__` — extend it to also rewrite tool permission declarations based on runtime.
- For Claude Code: keep `allowed-tools:` as a list.
- For OpenCode: generate `permission:` blocks with appropriate allow/deny entries.
- Or accept that tool permission declarations will be best-effort for now and focus on correctness over strictness.

**Warning signs:**
- OpenCode shows the command as available but does not restrict tool access as expected.
- Command executes successfully despite tools not being in the declared `allowed-tools` list.
- OpenCode logs show "unknown frontmatter field: allowed-tools" warnings.

**Phase to address:** Runtime-specific command generation phase.

---

### Pitfall 8: Commands Directory Path Diverges Between Claude Code and OpenCode in Nested Subpaths

**What goes wrong:**
Claude Code slash commands live at `.claude/commands/pr-review/review.md` and are invoked as `/pr-review:review`. OpenCode slash commands live at `.opencode/commands/pr-review/review.md` (or `~/.config/opencode/commands/pr-review/review.md` globally) and are invoked as `/pr-review:review`.

The subdirectory convention (`commands/pr-review/`) happens to work for both runtimes because both support nested command directories. However, if a future runtime uses a flat command directory (e.g., `commands/pr-review-review.md` with `-` as the namespace separator), the nested folder structure will either create a deeply nested command name or not be recognized at all.

**How to avoid:**
- Verify the command naming convention (slash command name = subdirectory/file or flat?) for every new runtime before adding it to the installer.
- Document the expected invocation name for each runtime in the compatibility matrix.
- If a runtime requires flat command files, generate flat files with a name mapping (`pr-review_review.md` or similar) rather than using the nested folder structure.

**Warning signs:**
- Slash commands installed for a new runtime do not appear in the runtime's command list.
- Commands appear but with a different name than expected (e.g., `/review` instead of `/pr-review:review`).
- Nested subdirectory is treated as a nested namespace that does not match the documented command name.

**Phase to address:** New runtime onboarding phase.

---

### Pitfall 9: `AskUserQuestion` Is Claude Code-Specific — OpenCode Uses `question` Tool

**What goes wrong:**
The review command frontmatter declares `AskUserQuestion` in `allowed-tools`. The review agent uses this tool for interactive skill selection. In OpenCode, the equivalent tool is named `question` (lowercase). If the agent file is installed in OpenCode without the tool name being rewritten, the agent cannot ask the user anything interactively — it will either fail with "tool not available" or silently fall back to auto-selecting all skills.

Silent auto-selection is less bad than a crash, but it removes the skill selection UX that v1.2 implemented. Users on OpenCode lose feature parity.

**How to avoid:**
- Add `AskUserQuestion` → `question` to the runtime tool name mapping in the installer.
- Or, restructure skill selection to use a bash-based `readline` prompt (already used in the skill selection Node.js script in the agent) rather than the `AskUserQuestion` tool. This makes the interactive prompt runtime-agnostic.
- The bash-based approach is already present in `pr-reviewer.md` Step 1b — this is the correct pattern to expand rather than relying on runtime-specific tools.

**Warning signs:**
- OpenCode shows no skill selection prompt; all skills are auto-selected every time.
- OpenCode logs show "tool not found: AskUserQuestion."
- Agent fails mid-execution on OpenCode when it reaches the skill selection step.

**Phase to address:** Runtime tool name mapping phase.

---

### Pitfall 10: The `serve.js` Background Process Launch Uses Unix-Specific Redirection

**What goes wrong:**
The review agent launches the preview server with:
```bash
node "$PR_REVIEW_DIR/serve.js" > /dev/null 2>&1 &
```

On Unix systems this works reliably. On Windows (even in Git Bash), `/dev/null` is available as a bash compatibility shim, but `&` for background processes behaves differently — the background process may be killed when the bash session ends, which happens immediately after the agent's bash step completes. The server starts and then terminates before the user can open the browser.

When a new runtime is added that runs agents in a native Windows shell (PowerShell or cmd) rather than Git Bash, this command fails entirely: `/dev/null` is unavailable in PowerShell, and the `&` operator has different semantics.

**How to avoid:**
- Use `node -e "require('child_process').spawn(..., { detached: true, stdio: 'ignore' }).unref()"` instead of bash background process syntax. This is Node.js built-in, cross-platform, and produces a truly detached process that survives the parent shell exiting.
- Keep the existing health-check logic (port 3847 check) before attempting to start the server — this already handles the "already running" case correctly.
- Test the background server launch explicitly on Windows before releasing any runtime that might use PowerShell.

**Warning signs:**
- On Windows, the server starts (health check passes) but is unreachable 2-3 seconds later.
- The preview URL is printed but the browser gets "connection refused."
- The server works when started manually (`node serve.js`) but not when launched by the agent.

**Phase to address:** Cross-platform hardening phase, alongside the `/tmp/` path fix.

---

### Pitfall 11: Re-installing Over an Existing Installation Leaves Stale Runtime-Specific Files

**What goes wrong:**
When a user re-runs the installer to upgrade, the current implementation copies all files to the target directory, overwriting existing files. Files that have been removed from the package (deprecated commands, renamed agents) persist in the installed directory because the installer only writes — it never deletes.

When a runtime's file structure changes between versions (e.g., a command is renamed from `review.md` to `pr-review.md`, or a frontmatter field changes), the old file remains alongside the new file. The runtime may load both, creating duplicate or conflicting commands.

**Why it happens:**
The installer uses `copyDir` which writes files but never calls `fs.rmSync` on the destination. This was fine at v1.0 when the file set was stable, but as multi-framework support adds runtime-specific files, the risk of stale file accumulation increases.

**How to avoid:**
- Before copying, remove the target subdirectory for each component being installed (commands directory, agents directory, template directory). Then copy fresh. This is safe because the `.gitignore` in the template directory explicitly excludes `findings.json` and `config.json` — but add an explicit preservation step for these data files before deletion.
- Or: write a manifest file (`.pr-review-manifest.json`) listing all installed files. On re-install, delete files in the old manifest that are not in the new manifest before copying.

**Warning signs:**
- User reports seeing duplicate slash commands after an upgrade.
- Old command names still appear in the runtime's command picker after renaming.
- The runtime loads an outdated agent file from a previous install that was supposed to be replaced.

**Phase to address:** Installer robustness phase (can be addressed before or during multi-runtime expansion).

---

## Minor Pitfalls

Edge cases that cause confusion but do not break core functionality.

---

### Pitfall 12: Runtime Detection From Environment Variables Is Unreliable

**What goes wrong:**
A common approach for runtime auto-detection is checking environment variables set by the AI assistant (e.g., `CLAUDE_CODE_SESSION`, `OPENCODE_SESSION`). These are not guaranteed to be set by all runtimes, are undocumented, and can change between versions. If the installer or agent auto-detects the wrong runtime based on environment, it installs files to the wrong directory without user confirmation.

**How to avoid:**
- Keep runtime selection explicit — always prompt the user or require an explicit CLI flag (`--claude`, `--opencode`). Do not attempt environment-based auto-detection.
- For agent-side runtime detection (to choose correct temp paths, tool names, etc.), use filesystem presence checks: if `$HOME/.claude` exists, assume Claude Code; if `$HOME/.config/opencode` exists, assume OpenCode. These are stable facts.
- Document this limitation clearly: the installer is explicit-first by design.

**Warning signs:**
- Installer auto-detects the wrong runtime and installs files to the wrong directory.
- User is not prompted for runtime choice in an environment where both Claude Code and OpenCode are installed.

**Phase to address:** Installer runtime selection phase.

---

### Pitfall 13: The `--skills` Flag in Review Command Frontmatter Is Claude Code-Specific Syntax

**What goes wrong:**
The `argument-hint` field in the command frontmatter documents `--skills all|none|name1,name2`. This flag is parsed from `$ARGUMENTS` inside the agent's Node.js scripts. This pattern works in Claude Code and OpenCode because both pass raw user input through `$ARGUMENTS`. However, if a runtime pre-parses flags or has reserved flag names, the `--skills` flag might be intercepted or cause a parse error.

**How to avoid:**
- Test flag parsing behavior on each new runtime before adding it to the compatibility matrix.
- The flag parsing is implemented in Node.js inside the agent (not relying on the runtime's flag parser), so it is relatively portable — but verify that the runtime passes the full argument string unmodified to `$ARGUMENTS`.

**Warning signs:**
- `--skills` flag is not recognized or silently ignored on a new runtime.
- The runtime's built-in flag handling consumes `--skills` before the agent receives it.

**Phase to address:** New runtime QA phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded `/tmp/` paths in agent steps | Works on macOS/Linux today | Breaks on Windows native, containerized runtimes, or any non-Unix shell | Never — replace with `os.tmpdir()` immediately |
| Single `__CONFIG_DIR__` placeholder for all path variations | Simple implementation | Breaks for runtimes with multi-segment config dirs or different path norms | Never add a runtime without auditing every placeholder occurrence |
| PascalCase tool names in source agent files | Matches Claude Code docs | Silent tool-grant failure in OpenCode (lowercase) and Kiro (different model entirely) | Never — use a tool name placeholder or runtime-specific rewriting |
| Single `configDirName` global in installer | Works for sequential single-runtime install | Fails for multi-runtime installs; untestable in isolation | Acceptable until multi-runtime install is needed; refactor before then |
| Omitting model field from agent frontmatter | Runtime picks the user's configured model | User may not realize which model is running the review; no capability check | Acceptable — document the expected capability level instead |
| `copyDir` without cleanup on reinstall | Simple; no data loss risk | Stale runtime-specific files accumulate; duplicate commands after renames | Acceptable for v1.3; address before v1.4 if file structure changes |

---

## Integration Gotchas

Common mistakes when wiring runtime-specific behavior into the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenCode tool names | Copy `tools: Read, Write, Bash` from Claude Code agent | Installer rewrites PascalCase → lowercase for OpenCode; maintain a tool name map in installer |
| Kiro agent format | Copy `.md` files with YAML frontmatter into `.kiro/agents/` | Kiro agents are JSON files; generate a JSON config with the agent prompt embedded in the `prompt` field |
| OpenCode `permission:` vs `allowed-tools:` | Use `allowed-tools:` for all runtimes | Generate runtime-specific frontmatter for permission declarations in the installer |
| Temp file paths | Hardcode `/tmp/pr-review-*.json` in agent bash steps | Compute `$TMPDIR` from `node -e "process.stdout.write(require('os').tmpdir())"` at step start |
| Background server launch | Use bash `&` with `/dev/null` redirection | Use `child_process.spawn` with `detached: true` and `.unref()` for cross-platform process detachment |
| `AskUserQuestion` tool | Declare it in `allowed-tools:` for all runtimes | Use the bash `readline` approach already in Step 1b; or map `AskUserQuestion` → `question` in OpenCode via installer |
| Model ID in agent frontmatter | Specify `model: claude-3-5-sonnet-20241022` | Omit `model:` entirely; each runtime uses its own model configuration |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Runtime installed successfully:** Verify agent files have correct tool names (lowercase for OpenCode, PascalCase for Claude Code) — not just that the files were copied.
- [ ] **Slash command appears in runtime UI:** Verify it actually invokes the correct agent, not that it just appears in the command picker.
- [ ] **Temp file operations work:** Verify on Windows native (not just WSL or Git Bash) that `/tmp/` substitution resolves correctly.
- [ ] **Background server survives bash exit:** Verify preview URL is accessible 10 seconds after the agent step completes, not just immediately after.
- [ ] **`__CONFIG_DIR__` fully resolved:** Search installed files for the literal string `__CONFIG_DIR__` — it must not appear in any installed file.
- [ ] **Upgrade path works:** Re-run installer over an existing v1.2 installation and verify no stale files remain and no duplicate commands appear.
- [ ] **Cross-runtime findings.json compatibility:** Write a finding on one runtime, open the HTML UI from the other runtime's install, verify all 10 fields load correctly.
- [ ] **`config.json` skills array:** Verify the `skills` array is present in `config.json` for both runtimes, even when no skills are used (should be `[]`).

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong tool names installed for runtime | LOW | Re-run `npx pr-review-agent@latest --[runtime]`; installer overwrites the file with correct tool names |
| `/tmp/` path failure on Windows | MEDIUM | Add `$TMPDIR` computation to top of failing bash step; test on Windows before re-release |
| Stale agent file from previous install | LOW | Run `npx pr-review-agent@latest --[runtime] --uninstall` then reinstall; check uninstall covers all file paths |
| Background server not surviving bash exit | MEDIUM | Switch to `child_process.spawn` + `.unref()` in Node.js; update agent file; reinstall |
| `__CONFIG_DIR__` literal in installed file | LOW | Fix `copyFile` regex in installer; bump version; re-release; users re-run installer |
| Duplicate commands after upgrade | LOW | Run uninstall then install; or manually delete old command files from the runtime's commands directory |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Tool names are runtime-specific (PascalCase vs lowercase) | Runtime-aware installer — tool name rewriting | Install for each runtime; inspect installed file `tools:` field |
| `agent:` field and command format don't transfer to Kiro | Runtime compatibility matrix before Kiro support | Document supported runtimes and their limitations before claiming support |
| `/tmp/` unavailable on non-Unix environments | Cross-platform hardening phase | Test on Windows native; verify `os.tmpdir()` substitution |
| `__CONFIG_DIR__` breaks for multi-segment paths | Installer refactoring phase | Audit all placeholder occurrences; test `.config/opencode` paths on Windows |
| Model ID format differences | Installer compatibility matrix | Omit model field from agent frontmatter; verify runtime uses correct model |
| Stale files on re-install | Installer upgrade path phase | Re-install over existing install; verify no duplicate commands |
| `allowed-tools:` vs `permission:` divergence | Runtime-specific command generation | Install on OpenCode; verify tool restrictions are enforced |
| `AskUserQuestion` not in OpenCode | Runtime tool name mapping | Test skill selection on OpenCode; verify interactive prompt works |
| Background server dies on Windows | Cross-platform hardening phase | Start server via agent on Windows; verify URL accessible after 30 seconds |
| Upgrade does not update other runtime's install | Upgrade path design | Install Claude Code, then install OpenCode; verify Claude Code files are also updated |

---

## Sources

- Claude Code tools reference (official): https://code.claude.com/docs/en/tools-reference (HIGH confidence — official Anthropic docs, verified 2026-03-31)
- OpenCode tools documentation (official): https://opencode.ai/docs/tools/ (HIGH confidence — official OpenCode docs, verified 2026-03-31)
- OpenCode agents documentation (official): https://opencode.ai/docs/agents/ (HIGH confidence — official OpenCode docs, verified 2026-03-31)
- OpenCode commands documentation (official): https://opencode.ai/docs/commands/ (HIGH confidence — official OpenCode docs, verified 2026-03-31)
- Kiro custom agent configuration reference (official): https://kiro.dev/docs/cli/custom-agents/configuration-reference/ (HIGH confidence — official Kiro docs, verified 2026-03-31)
- Claude Code to OpenCode agent migration guide: https://gist.github.com/RichardHightower/827c4b655f894a1dd2d14b15be6a33c0 (MEDIUM confidence — community gist, verified against official docs)
- Node.js os.tmpdir() cross-platform behavior: https://nodejs.org/api/os.html (HIGH confidence — official Node.js docs)
- Node.js os.tmpdir() Windows path issue: https://github.com/nodejs/node/issues/60582 (MEDIUM confidence — Node.js GitHub issue)
- AgentSys multi-framework config directory registry: https://github.com/agent-sh/agentsys (MEDIUM confidence — open source project, verified against docs)
- Codebase analysis: `agents/pr-reviewer.md`, `bin/install.js`, `commands/pr-review/review.md`, `.planning/PROJECT.md` (HIGH confidence — first-party code analysis)

---
*Pitfalls research for: Adding multi-framework runtime support to pr-review-agent (v1.3 milestone)*
*Researched: 2026-03-31*
