# Stack Research

**Domain:** Multi-framework AI agent toolkit runtime support and CLI discoverability (npm-distributed)
**Researched:** 2026-03-31
**Confidence:** HIGH (Claude Code subagent format, OpenCode agent format, tool name mapping — all verified from official docs)

## Context

This document covers the **new stack surface** for v1.3: adding runtime-aware installer configuration
for GitHub Copilot and other AI agent frameworks, and adding `--help` flag discoverability to the
review command. It supplements the existing STACK.md (v1.2) which covers skill detection.

The core constraint is unchanged: **zero runtime dependencies** — all implementation uses Node.js
built-ins only.

---

## Section 1: Runtime Differences — Agent and Command Formats

The three runtimes that matter have meaningfully different agent and command file conventions.

### Claude Code (current, verified)

**Agent files:** `~/.claude/agents/<name>.md` or `.claude/agents/<name>.md`
**Command files:** `~/.claude/commands/<name>.md` or `.claude/commands/<name>.md`

**Agent frontmatter fields (subagents):**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | Yes | string, lowercase + hyphens | Unique identifier |
| `description` | Yes | string | When Claude should delegate |
| `tools` | No | comma-separated list | Allowlist; inherits all if omitted |
| `disallowedTools` | No | comma-separated list | Denylist from inherited tools |
| `model` | No | `sonnet`, `opus`, `haiku`, full ID, or `inherit` | Defaults to `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` | Permission behavior |
| `maxTurns` | No | number | Max agentic iterations |
| `color` | No | string | Visual indicator |

**Command frontmatter fields:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | No | string | Defaults to filename |
| `description` | Yes | string | Shown in command picker |
| `allowed-tools` | No | array | Tools this command pre-approves |
| `agent` | No | string | Agent file to invoke |
| `argument-hint` | No | string | Usage hint in autocomplete |

**Tool names (exact, case-sensitive):**
`Read`, `Write`, `Edit`, `MultiEdit`, `Bash`, `Glob`, `Grep`, `LS`, `WebFetch`, `WebSearch`,
`TodoRead`, `TodoWrite`, `NotebookRead`, `NotebookEdit`, `exit_plan_mode`

Source: [Claude Code tools reference](https://code.claude.com/docs/en/tools-reference),
[Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents)

---

### OpenCode (current, verified)

**Agent files:** `~/.config/opencode/agents/<name>.md` or `.opencode/agents/<name>.md`
**Command files:** `~/.config/opencode/commands/<name>.md` or `.opencode/commands/<name>.md`

**Agent frontmatter fields:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `description` | Yes | string | Shown in agent picker |
| `mode` | No | `primary`, `subagent`, `all` | Visibility scope — `subagent` mode agents do NOT appear in main agent list |
| `model` | No | string | Provider-prefixed model ID |
| `temperature` | No | float 0.0-1.0 | Response randomness |
| `tools` | No | map of booleans | `{ write: false, edit: false }` — boolean per-tool |
| `permission` | No | string | Permission mode |
| `color` | No | hex or theme color | Visual indicator |
| `steps` | No | number | Max agentic iterations |

**Key difference from Claude Code:** The `tools` field in OpenCode uses a boolean map (`tools: { bash: false, write: false }`), not a comma-separated list of names. Tool names are also lowercase (`bash`, `read`, `write`, `edit`, `grep`, `glob`, `list`).

**Command frontmatter fields:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `description` | No | string | Shown in TUI |
| `agent` | No | string | Agent to invoke |
| `model` | No | string | Override model |
| `subtask` | No | boolean | Force subagent invocation |

**Tool names (exact, lowercase):**
`bash`, `edit`, `write`, `read`, `grep`, `glob`, `list`, `lsp`, `apply_patch`, `skill`,
`todowrite`, `webfetch`, `websearch`, `question`

Note: `name` is NOT a required frontmatter field in OpenCode agents — the filename becomes the
identifier. The `name` field causes a parsing error in some OpenCode versions (confirmed in
[issue #2038](https://github.com/anomalyco/opencode/issues/2038)).

Source: [OpenCode agents docs](https://opencode.ai/docs/agents/),
[OpenCode tools docs](https://opencode.ai/docs/tools/),
[OpenCode commands docs](https://opencode.ai/docs/commands/)

---

### GitHub Copilot (VS Code / Copilot CLI, partial support)

**Agent files:** `.github/agents/<name>.agent.md` (repo) or `~/.copilot/agents/<name>.agent.md` (user)
**Note:** File extension is `.agent.md` — different from Claude Code and OpenCode.

**Agent frontmatter fields:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `description` | Yes | string | Agent purpose |
| `name` | No | string | Defaults to filename |
| `tools` | No | array of strings | Tool names; all available if omitted |
| `model` | No | string or array | AI model selection |
| `target` | No | `vscode` or `github-copilot` | Restricts availability |
| `user-invocable` | No | boolean | Show/hide in UI |

**Tool names:** `read`, `edit`, `search`, `web/fetch`, `search/codebase`, and MCP server tools
in `server-name/tool-name` format. No shell execution tool equivalent to Bash.

**Critical limitation:** GitHub Copilot CLI agent system is separate from VS Code Copilot Chat
agents. The CLI uses `/agent` slash commands; VS Code uses the `.agent.md` format with
`@agent-name` mentions. There is no file-based slash command installation system — commands are
invoked through conversation, not pre-installed command files.

**Verdict for this project:** Copilot CLI and VS Code Copilot do not have an installable command
file system comparable to Claude Code's `commands/` directory. Installing slash commands is not
feasible for Copilot without deep integration work. **Copilot support should be limited to
agent-only installation (no commands), or deferred to a later milestone.**

Source: [VS Code custom agents docs](https://code.visualstudio.com/docs/copilot/customization/custom-agents),
[GitHub Copilot custom agents creation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)

---

## Section 2: Tool Name Mapping

The `tools` frontmatter field is not portable across runtimes. The same capability has different
names in each runtime.

### Claude Code → OpenCode Tool Name Map

| Capability | Claude Code name | OpenCode name | Notes |
|------------|-----------------|---------------|-------|
| Read files | `Read` | `read` | Case difference |
| Write files | `Write` | `write` | Case difference |
| Edit files | `Edit` | `edit` | Case difference |
| Shell commands | `Bash` | `bash` | Case difference |
| File patterns | `Glob` | `glob` | Case difference |
| Content search | `Grep` | `grep` | Case difference |
| Directory listing | `LS` | `list` | Different name |
| Fetch URL | `WebFetch` | `webfetch` | Case difference |
| Web search | `WebSearch` | `websearch` | Case difference |

**Syntax difference:** Claude Code uses comma-separated string (`tools: Read, Bash, Grep`).
OpenCode uses boolean map (`tools: { read: true, bash: true, grep: true }`) or just disables
specific tools (`tools: { write: false }`).

### Recommended Approach: Runtime-Specific Agent Files

Because the `tools` field syntax and tool names differ, the cleanest approach is to maintain
separate agent file templates per runtime, generated from a shared source during installation.
The installer already performs placeholder substitution (`__CONFIG_DIR__`) — the same mechanism
can handle tool name translation.

**Option A (recommended): Installer rewrites `tools:` field**
- Agent source files use Claude Code format (`tools: Read, Bash, Grep`)
- Installer detects runtime and rewrites `tools:` field per target format
- One source of truth, runtime-adapted at install time

**Option B: Separate agent templates per runtime**
- `agents/pr-reviewer.claude.md` and `agents/pr-reviewer.opencode.md`
- Installer copies the correct one
- More explicit but duplicated content

Option A fits the existing placeholder model. Implement as an additional rewrite pass in
`copyFile()` alongside the existing `__CONFIG_DIR__` replacement.

---

## Section 3: Runtime Detection Strategy

The installer needs to know which runtime to install for. Detection approaches, in priority order:

### Tier 1: User-provided flags (highest priority, current behavior)
`--claude`, `--opencode` flags already work. Add `--copilot` for future.

### Tier 2: Environment variable heuristics
```javascript
// Claude Code sets this when running
process.env.CLAUDE_CONFIG_DIR  // present when running inside Claude Code

// No equivalent for OpenCode (it's a Go binary, not Node.js)
// No reliable env var for GitHub Copilot CLI
```

`CLAUDE_CONFIG_DIR` is set by Claude Code when the installer runs inside a Claude Code session.
However, this is not reliable for detecting the *target* runtime — only the *current* runtime.

### Tier 3: Directory existence detection
```javascript
// Detect installed runtimes by checking for known config directories
const detectedRuntimes = [];
if (fs.existsSync(path.join(os.homedir(), '.claude'))) detectedRuntimes.push('claude');
if (fs.existsSync(path.join(os.homedir(), '.config', 'opencode'))) detectedRuntimes.push('opencode');
if (fs.existsSync(path.join(os.homedir(), '.copilot'))) detectedRuntimes.push('copilot');
```

This is the most reliable heuristic without requiring user flags. If exactly one is detected,
pre-select it in the interactive prompt. If multiple are detected, present the list with detected
ones marked.

### Tier 4: Executable detection
```javascript
// Check if the CLI binary exists in PATH — reliable but slow
const { execSync } = require('child_process');
try { execSync('opencode --version', { stdio: 'ignore' }); detected.push('opencode'); } catch {}
```

Binary detection is the most accurate but adds latency. Use only as fallback in non-interactive mode.

**Recommended strategy:** Use Tier 3 (directory detection) as the primary heuristic for pre-selecting
options in the interactive installer. Always allow override via flags. Never block installation
if detection fails — fall through to interactive selection.

---

## Section 4: --help Flag for Review Command

The `--help` flag is needed on the review *command* (the slash command that users type in their
AI assistant), not the installer. This is a discoverability feature — users can type
`/pr-review:review --help` to see all flags without reading source files.

### How slash command help works

Claude Code and OpenCode both pass the full argument string as `$ARGUMENTS` to the command. The
agent/command file can detect `--help` in `$ARGUMENTS` and output usage text instead of running.

### Implementation approach

In `commands/pr-review/review.md`, add a help guard at the top of the `<process>` section:

```markdown
<process>
**If `$ARGUMENTS` contains `--help`:**
Print the following and stop:

```
Usage: /pr-review:review <pr-url-or-number> [options]

Arguments:
  <pr-url-or-number>    GitHub PR URL or PR number (e.g., 123 or https://github.com/org/repo/pull/123)

Options:
  --post                Post findings as inline review comments on the GitHub PR
  --focus <area>        Limit review to a specific area:
                          security      Security vulnerabilities and auth issues
                          i18n          Hardcoded text and i18n violations
                          architecture  Architectural patterns and structure
                          design-tokens Design token and hardcoded color violations
                          all           Full review (default)
  --skills <value>      Skill selection (skips interactive prompt):
                          all           Use all available skills (default when non-interactive)
                          none          Skip skill context entirely
                          name1,name2   Comma-separated skill names to use
  --help                Show this help

Examples:
  /pr-review:review 123
  /pr-review:review https://github.com/org/repo/pull/456 --post
  /pr-review:review 123 --focus security
  /pr-review:review 123 --skills all --post
```
```

This approach requires no new tooling — it's pure markdown instruction to the agent. It is
consistent with how the installer's `--help` is already implemented in `bin/install.js`.

### Runtime compatibility

`$ARGUMENTS` interpolation works in both Claude Code and OpenCode command files. The help guard
is plain text comparison logic that any LLM will execute correctly.

---

## Section 5: Config-Driven Runtime Adaptation

### Installer RUNTIMES config additions

The existing `RUNTIMES` object in `bin/install.js` needs a `toolsField` property per runtime
to drive the rewrite in `copyFile()`:

```javascript
const RUNTIMES = {
  claude: {
    name: 'Claude Code',
    configDirName: '.claude',
    globalDir: () => ...,
    localDir: () => ...,
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
    // NEW: how to write the tools field
    toolsFormat: 'comma-list',  // "Read, Bash, Grep"
    toolNames: {                // identity mapping (source is Claude Code format)
      Read: 'Read', Bash: 'Bash', Grep: 'Grep', Glob: 'Glob', Write: 'Write'
    }
  },
  opencode: {
    name: 'OpenCode',
    configDirName: '.config/opencode',
    globalDir: () => ...,
    localDir: () => ...,
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
    // NEW
    toolsFormat: 'boolean-map',  // "{ read: true, bash: true }"
    toolNames: {
      Read: 'read', Bash: 'bash', Grep: 'grep', Glob: 'glob', Write: 'write'
    }
  }
};
```

### Placeholder additions for tool portability

Add a second placeholder that the installer rewrites:

- `__TOOLS_READ_BASH_GREP_GLOB__` → `Read, Bash, Grep, Glob` (Claude Code) or `{ read: true, bash: true, grep: true, glob: true }` (OpenCode)

Use one placeholder per tool combination that appears in agent files. Agent files currently have
two distinct tool sets:
- `pr-reviewer.md`: `Read, Bash, Grep, Glob, Write`
- `pr-fixer.md`: `Read, Write, Edit, Bash, Grep, Glob`

Add two placeholders: `__TOOLS_REVIEWER__` and `__TOOLS_FIXER__`, each rewritten per target runtime.

### OpenCode `name:` field removal

OpenCode does not use the `name:` frontmatter field — it derives the name from the filename. The
`name:` field may cause a parsing warning in some OpenCode versions. Add it to the installer's
rewrite pass: when installing for OpenCode, strip the `name:` line from agent frontmatter.

---

## Section 6: What NOT to Add

| Avoid | Why | Instead |
|-------|-----|---------|
| Runtime auto-detection via process introspection | Not reliable — installer runs as standalone Node.js, not inside the target AI assistant | Directory heuristics + interactive fallback |
| Separate agent templates per runtime | Maintenance burden — two copies of the same agent diverge over time | Single source file with placeholder rewrites at install time |
| GitHub Copilot command installation | Copilot has no installable slash command file system | Agent-only install for Copilot; defer command support |
| YAML parser (js-yaml, etc.) | Breaks zero-dependency constraint | Manual string rewrite of `tools:` lines using regex in copyFile() |
| Runtime-specific branches in agent markdown | Agent files would become unreadable | All runtime adaptation happens at install time in the installer |
| `--help` as a dedicated command file | Unnecessary — the review command itself handles `--help` in `$ARGUMENTS` | Inline help guard in process section |

---

## Section 7: Version Compatibility Matrix

| Runtime | Agent Format | Command Format | Tool field syntax | Verified |
|---------|-------------|----------------|-------------------|---------|
| Claude Code | `agents/<name>.md` in `.claude/agents/` | `commands/<slug>.md` in `.claude/commands/` | `tools: Read, Bash` (CSV) | Yes — official docs 2026-03-31 |
| OpenCode | `agents/<name>.md` in `.opencode/agents/` or `.config/opencode/agents/` | `commands/<name>.md` in `.opencode/commands/` or `.config/opencode/commands/` | `tools: { bash: true }` (boolean map) | Yes — official docs 2026-03-31 |
| GitHub Copilot (VS Code) | `.github/agents/<name>.agent.md` | No installable slash command | `tools: [read, edit]` (array) | Partial — no command system |
| GitHub Copilot CLI | `~/.copilot/agents/<name>.agent.md` | `/agent <name>` via conversation | Not file-based commands | Partial — CLI-only, no project scope |

---

## Sources

- [Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents) — Complete frontmatter reference, tool names, directory paths — HIGH confidence (official docs, verified 2026-03-31)
- [Claude Code tools reference](https://code.claude.com/docs/en/tools-reference) — Exact tool names: Read, Write, Edit, Bash, Glob, Grep, LS, WebFetch, WebSearch — HIGH confidence (official docs)
- [OpenCode agents docs](https://opencode.ai/docs/agents/) — Frontmatter fields, boolean tools map, directory paths — HIGH confidence (official docs, verified 2026-03-31)
- [OpenCode tools docs](https://opencode.ai/docs/tools/) — Tool names: bash, edit, write, read, grep, glob, list, lsp, apply_patch, skill, todowrite, webfetch, websearch, question — HIGH confidence (official docs)
- [OpenCode commands docs](https://opencode.ai/docs/commands/) — Command frontmatter, $ARGUMENTS, agent field — HIGH confidence (official docs)
- [VS Code custom agents docs](https://code.visualstudio.com/docs/copilot/customization/custom-agents) — .agent.md format, frontmatter fields, storage locations — HIGH confidence (official Microsoft docs)
- [GitHub Copilot custom agents creation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) — Agent profile format, storage in .github/agents/ — HIGH confidence (official GitHub docs)
- [OpenCode issue #3461](https://github.com/sst/opencode/issues/3461) — Confirmed: `mode: subagent` agents do not appear in main list; `name:` field may cause parsing issues — MEDIUM confidence (GitHub issue, resolved Oct 2025)
- [Claude Code to OpenCode migration gist](https://gist.github.com/RichardHightower/827c4b655f894a1dd2d14b15be6a33c0) — Tool format conversion example — MEDIUM confidence (community resource)
- Existing `bin/install.js` RUNTIMES config — Current placeholder + config dir system — HIGH confidence (direct code inspection)

---

*Stack research for: v1.3 Multi-Framework Runtime Support and --help Discoverability*
*Researched: 2026-03-31*
