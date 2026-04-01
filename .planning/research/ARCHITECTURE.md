# Architecture Research

**Domain:** Multi-framework runtime support integration for an npm-distributed AI agent toolkit
**Researched:** 2026-03-31
**Confidence:** HIGH — all findings derived from direct codebase analysis

---

## Standard Architecture

This file supersedes and extends previous versions. The previous content (v1.1 fix/resolution and v1.2 skill-aware review) is preserved in the build order history below. This section focuses on the v1.3 multi-framework milestone.

### System Overview (Current State — v1.2)

```
┌──────────────────────────────────────────────────────────────────────┐
│                       INSTALLER (bin/install.js)                      │
│  RUNTIMES map: { claude, opencode }                                   │
│  Detects runtime from flags, copies files, rewrites __CONFIG_DIR__    │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ installs into
┌──────────────────────────────────────────────────────────────────────┐
│                     COMMAND LAYER (commands/pr-review/)               │
│  review.md  setup.md  fix.md                                          │
│  YAML frontmatter: name, description, agent, argument-hint            │
│  allowed-tools: array of tool names per runtime                       │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ invokes via agent: field
┌──────────────────────────────────────────────────────────────────────┐
│                     AGENT LAYER (agents/)                             │
│  pr-reviewer.md   pr-fixer.md                                         │
│  YAML frontmatter: name, description, tools, color                    │
│  tools: list of Claude Code tool names                                │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ reads/writes
┌──────────────────────────────────────────────────────────────────────┐
│                     STATE LAYER (filesystem)                          │
│  findings.json   config.json   source files   /tmp/skills.json        │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ rendered by
┌──────────────────────────────────────────────────────────────────────┐
│                     UI LAYER (template/)                              │
│  index.html   serve.js   templates/review-plan.md                     │
└──────────────────────────────────────────────────────────────────────┘
```

### What v1.3 Must Change

The current architecture has three places where runtime-specific knowledge is hard-baked:

1. **`bin/install.js` RUNTIMES constant** — maps runtime names to config dir paths and subdirectories. Currently handles `claude` and `opencode`. To add a new runtime, a developer edits this constant.

2. **Agent YAML `tools:` field** — currently lists Claude Code tool names (`Read`, `Bash`, `Grep`, `Glob`, `Write`, `Edit`, `AskUserQuestion`). OpenCode uses different tool names or different frontmatter conventions. The `tools:` list is runtime-specific, but the file is runtime-shared.

3. **Command YAML `allowed-tools:` field** — same problem as agent `tools:`. The field name itself may differ per runtime.

4. **No `--help` flag on slash commands** — the `argument-hint` frontmatter field hints at usage in some runtimes but does not produce output when invoked with `--help`.

---

## Recommended Architecture for v1.3

### Integration Strategy: Minimal Surgery

The existing architecture is sound. The correct strategy is extension, not redesign. Two narrow integration points need to change; everything else stays.

**Principle:** Make the installer runtime-aware enough to write the right frontmatter for the target runtime. The agent bodies (markdown content below YAML) are identical across runtimes — only metadata differs.

---

### Component 1: Extended RUNTIMES Definition

**What changes:** The RUNTIMES constant in `bin/install.js` gains two fields per runtime entry: `toolsField` (the YAML key for listing tools) and `tools` (the array of tool names that runtime understands). A third field `agentField` captures whether the runtime uses `agent:` or `agents:` in command frontmatter.

**Current shape:**
```javascript
const RUNTIMES = {
  claude: {
    name: 'Claude Code',
    configDirName: '.claude',
    globalDir: () => ...,
    localDir: () => ...,
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
  },
  opencode: { ... }
};
```

**Recommended shape:**
```javascript
const RUNTIMES = {
  claude: {
    name: 'Claude Code',
    configDirName: '.claude',
    globalDir: () => ...,
    localDir: () => ...,
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
    // v1.3 additions
    frontmatter: {
      agentToolsKey: 'tools',           // key in agent YAML frontmatter
      commandToolsKey: 'allowed-tools', // key in command YAML frontmatter
      commandAgentKey: 'agent',         // key referencing the agent file
    },
    tools: {
      read: 'Read',
      write: 'Write',
      edit: 'Edit',
      bash: 'Bash',
      grep: 'Grep',
      glob: 'Glob',
      ask: 'AskUserQuestion',
    },
  },
  opencode: {
    // ... same shape, different values
    frontmatter: {
      agentToolsKey: 'tools',
      commandToolsKey: 'tools',         // OpenCode may use 'tools' for both
      commandAgentKey: 'agent',
    },
    tools: {
      read: 'read_file',                // OpenCode tool names (verify)
      write: 'write_file',
      edit: 'edit_file',
      bash: 'run_bash',
      grep: 'search_files',
      glob: 'find_files',
      ask: null,                        // null = omit from tools list
    },
  },
};
```

**Confidence on OpenCode tool names:** LOW — requires verification against OpenCode documentation. The shape of the data structure is correct; specific values need research before implementation.

---

### Component 2: Template-Based Frontmatter Rewriting

**What changes:** The `copyFile()` function currently rewrites `__CONFIG_DIR__` placeholders in `.md` and `.js` files. It must also rewrite tool name placeholders in frontmatter.

**Approach:** Use abstract tool name placeholders in source agent and command files. The installer substitutes them at copy time, exactly as it does for `__CONFIG_DIR__`.

**Source file format (agents/pr-reviewer.md):**
```yaml
---
name: pr-reviewer
description: Automated PR code review agent.
__TOOLS_KEY__: __TOOL_READ__, __TOOL_BASH__, __TOOL_GREP__, __TOOL_GLOB__, __TOOL_WRITE__
color: blue
---
```

**After install for Claude Code:**
```yaml
---
name: pr-reviewer
description: Automated PR code review agent.
tools: Read, Bash, Grep, Glob, Write
color: blue
---
```

**After install for OpenCode:**
```yaml
---
name: pr-reviewer
description: Automated PR code review agent.
tools: read_file, run_bash, search_files, find_files, write_file
color: blue
---
```

**Implementation:** Extend the `copyFile()` substitution pass to also replace `__TOOLS_KEY__`, `__TOOL_READ__`, `__TOOL_WRITE__`, etc. with runtime-specific values from `RUNTIMES[runtime].tools`.

**Why this approach over alternatives:**

- Separate files per runtime (`pr-reviewer.claude.md`, `pr-reviewer.opencode.md`) — rejected. Doubles maintenance surface. Every agent change must be applied to N files.
- Post-process with sed — rejected. `copyFile()` already does string substitution; extending it is more consistent than adding a separate tool.
- Runtime detection at agent execution time — rejected. Agents run inside the AI assistant's runtime; they cannot inspect their own environment's tool registry.

---

### Component 3: --help Flag from Markdown Frontmatter

**What:** When the user runs `/pr-review:review --help`, the command should print usage information rather than invoking the review agent.

**Integration pattern:** The `--help` behavior belongs in the **command file**, not the agent file. The command file is what the AI assistant's slash command parser reads first.

**Where the flag logic lives:**

Add a `<help>` block to each command's markdown body. The command execution logic checks for `--help` in `$ARGUMENTS` before invoking the agent:

```markdown
---
name: pr-review:review
description: ...
argument-hint: "<pr-url-or-number> [--post] [--focus ...]"
allowed-tools:
  - Read
  - Bash
agent: pr-reviewer
---

<help>
Usage: /pr-review:review <pr-url-or-number> [flags]

Flags:
  --post            Post findings as inline GitHub PR comments
  --focus <area>    Focus review on: security | i18n | architecture | design-tokens | all
  --skills <list>   Skills to load: all | none | name1,name2
  --help            Show this help

Examples:
  /pr-review:review 123
  /pr-review:review https://github.com/org/repo/pull/123 --post
  /pr-review:review 123 --focus security --skills all
</help>

<objective>
...
</objective>
```

**Command execution guard:**

Add to the top of the `<process>` block:

```
If $ARGUMENTS contains --help:
  Print the contents of the <help> block above.
  Stop. Do not invoke the agent.
```

**Why command-side, not agent-side:** The help flag is a meta-operation on the command interface, not a review operation. Routing it through the full agent invocation wastes resources and couples discovery to the agent lifecycle. The command layer exists precisely to handle this kind of dispatch.

**Why `<help>` block in markdown, not in YAML frontmatter:** YAML frontmatter is parsed by the runtime and has schema constraints. A freeform `<help>` block in the markdown body is under agent/command control and can be formatted exactly as needed.

---

### Component 4: Config Schema Additions

**What new fields, if any, belong in config.json:**

`config.json` currently stores PR metadata (owner, repo, prNumber, headRefName) written by the review agent and read by the fix agent and UI. For v1.3, **no new fields are needed in `config.json`**.

Rationale:
- Runtime identity is already encoded in the installed paths (`.claude/` vs `.config/opencode/`)
- Tool name mapping is resolved at install time, not at review time
- The fix agent and UI do not need to know which runtime generated a review

The only schema work for v1.3 is in the **installer and source files** — substitution maps and placeholder conventions. The runtime data files (findings.json, config.json) are runtime-agnostic by design.

---

## Recommended Project Structure (v1.3 additions)

```
pr-review-agent/
├── bin/
│   └── install.js          # RUNTIMES extended with frontmatter + tools maps
├── agents/
│   ├── pr-reviewer.md      # __TOOLS_KEY__ and __TOOL_* placeholders in frontmatter
│   └── pr-fixer.md         # same
├── commands/pr-review/
│   ├── review.md           # <help> block added; __TOOLS_KEY__ in allowed-tools
│   ├── setup.md            # <help> block added
│   └── fix.md              # <help> block added
└── template/               # unchanged
    ├── index.html
    ├── serve.js
    └── templates/
        └── review-plan.md
```

No new files are required. All changes are modifications to existing files.

---

## Architectural Patterns

### Pattern 1: Placeholder Substitution at Install Time

**What:** Source files contain abstract placeholders. The installer rewrites them with runtime-specific concrete values during file copy.

**When to use:** Any value that differs by runtime but whose surrounding logic is identical. Tool names are the v1.3 case. `__CONFIG_DIR__` is the existing case.

**Trade-offs:** Pros — single source of truth for agent logic; runtimes diverge only in metadata. Cons — source files are not directly runnable; must be installed to test in a real runtime.

**Example:**
```javascript
// copyFile() extended substitution pass
content = content.replace(/__TOOLS_KEY__/g, rt.frontmatter.agentToolsKey);
for (const [key, value] of Object.entries(rt.tools)) {
  const placeholder = `__TOOL_${key.toUpperCase()}__`;
  if (value === null) {
    // Remove the placeholder and its trailing comma/space
    content = content.replace(new RegExp(`,?\\s*${placeholder}`, 'g'), '');
  } else {
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }
}
```

### Pattern 2: Command-Side Flag Dispatch

**What:** Command files check for meta-flags (`--help`) before invoking the agent. The agent is only invoked for substantive work.

**When to use:** Any flag that controls the command interface itself rather than the review process.

**Trade-offs:** Pros — keeps agents focused on their task; `--help` output stays close to the command definition. Cons — adds dispatch logic to each command file separately (not DRY across commands).

### Pattern 3: Null-Safe Tool Omission

**What:** When a runtime does not support a tool (e.g., OpenCode has no `AskUserQuestion` equivalent), the tool map entry is `null`. The substitution pass removes null placeholders from the tools list rather than including an invalid name.

**When to use:** Any capability gap between runtimes where graceful degradation is preferable to hard failure.

**Trade-offs:** Pros — single source file works for all runtimes; null tools are omitted cleanly. Cons — agent logic that uses the omitted tool must have a fallback path documented in the agent body.

---

## Data Flow

### Installation Flow (v1.3 extended)

```
npx pr-review-agent --claude --global
        |
        v
bin/install.js
  |-- Selects RUNTIMES['claude']
  |-- Calls install('claude', globalDir)
        |
        v
  install() function
  |-- copyDir(commands/) for each .md file:
  |     copyFile() rewrites:
  |       __CONFIG_DIR__  -> '.claude'
  |       __TOOLS_KEY__   -> 'allowed-tools'
  |       __TOOL_READ__   -> 'Read'
  |       __TOOL_BASH__   -> 'Bash'
  |       ... etc
  |
  |-- copyDir(agents/) for each .md file:
  |     copyFile() same substitution pass
  |
  |-- copyDir(template/) unchanged
```

### --help Flag Dispatch Flow

```
User types: /pr-review:review --help
        |
        v
AI assistant parses command YAML frontmatter
        |
        v
Executes command markdown body
  if $ARGUMENTS contains '--help':
    Print <help> block contents
    Return (do not invoke agent)
  else:
    Invoke agent: pr-reviewer
        |
        v
  pr-reviewer.md runs normal review flow
```

---

## Integration Points: New vs Modified Files

### Modified Files (no new files required)

| File | What Changes | Why |
|------|--------------|-----|
| `bin/install.js` | `RUNTIMES` constant gains `frontmatter` and `tools` sub-objects; `copyFile()` gains tool placeholder substitution | Core of multi-runtime support |
| `agents/pr-reviewer.md` | Frontmatter `tools:` line uses `__TOOLS_KEY__` and `__TOOL_*` placeholders | Runtime-agnostic source |
| `agents/pr-fixer.md` | Same frontmatter changes as pr-reviewer.md | Runtime-agnostic source |
| `commands/pr-review/review.md` | Frontmatter `allowed-tools:` uses placeholders; `<help>` block added; `--help` guard in `<process>` | Discoverability + multi-runtime |
| `commands/pr-review/setup.md` | `<help>` block added; `--help` guard added | Discoverability |
| `commands/pr-review/fix.md` | Frontmatter and `<help>` block | Discoverability + multi-runtime |

### New Files

None required for v1.3.

---

## Build Order

Dependencies are explicit. Build in this order to avoid blocked phases.

### Phase 1: RUNTIMES Extension + Placeholder Substitution

**What:** Extend `RUNTIMES` in `bin/install.js` with `frontmatter` and `tools` maps for both `claude` and `opencode`. Extend `copyFile()` to substitute `__TOOL_*` placeholders.

**Why first:** Everything else depends on the installer being able to produce correct output. This phase has no dependencies on agent or command changes.

**Deliverable:** `npx pr-review-agent --claude` produces agent files with correct Claude Code tool names. `npx pr-review-agent --opencode` produces files with correct OpenCode tool names (once tool names are verified).

**Risk:** OpenCode tool names must be verified against current OpenCode documentation before this phase can be completed. If verification is delayed, the `claude` path can be implemented and tested first, with OpenCode values added when confirmed.

---

### Phase 2: Agent File Frontmatter Placeholders

**What:** Update `agents/pr-reviewer.md` and `agents/pr-fixer.md` to use `__TOOLS_KEY__` and `__TOOL_*` in their frontmatter.

**Why second:** Depends on Phase 1 (the installer must know how to rewrite the placeholders before the source files use them). Agent body content is unchanged — only the frontmatter `tools:` line changes.

**Deliverable:** Source agent files use abstract placeholders. Installed agent files have concrete tool names per runtime.

---

### Phase 3: Command File Frontmatter Placeholders

**What:** Update `commands/pr-review/review.md`, `setup.md`, `fix.md` to use `__TOOLS_KEY__` and `__TOOL_*` in their `allowed-tools:` frontmatter.

**Why third:** Same dependency as Phase 2. Can be done in parallel with Phase 2 since agent and command files are independent.

**Deliverable:** Installed command files have correct `allowed-tools` / `tools` key and tool names per runtime.

---

### Phase 4: --help Flag Implementation

**What:** Add `<help>` blocks and `--help` guards to all three command files.

**Why fourth:** Independent of Phases 2-3. Could be done in parallel, but Phase 3 touches the same files, so sequential is cleaner to avoid merge conflicts.

**Deliverable:** `/pr-review:review --help`, `/pr-review:setup --help`, `/pr-review:fix --help` each print usage without invoking the agent.

**Note:** This phase has no runtime dependencies — `--help` output is plain text in the command markdown body. It works identically on Claude Code and OpenCode.

---

## Anti-Patterns

### Anti-Pattern 1: Separate Source Files Per Runtime

**What people do:** Create `pr-reviewer.claude.md` and `pr-reviewer.opencode.md` to handle tool name differences.

**Why it's wrong:** Every bug fix, every new step, every wording change must be applied to N files. The divergence grows over time. The installer becomes a selector rather than a substitutor.

**Do this instead:** Single source file with abstract placeholders. Installer writes runtime-specific concrete values.

---

### Anti-Pattern 2: Runtime Detection Inside Agents

**What people do:** Have the agent run `which claude` or inspect environment variables to determine its runtime, then conditionally use different tool names.

**Why it's wrong:** Agents run inside the AI assistant's sandbox. They have no reliable way to inspect the runtime environment. Tool names are resolved by the runtime itself — if a tool name is wrong in the frontmatter, the tool call fails regardless of any detection logic.

**Do this instead:** Resolve tool names at install time when the runtime is known. The installed file has the correct tool names hardcoded for that runtime.

---

### Anti-Pattern 3: --help in Agent, Not Command

**What people do:** Route `--help` through the agent invocation flow, checking for it in the agent's `<role>` block.

**Why it's wrong:** Invoking an agent has overhead (loading context, reading project files). Help output is static — it should be served from the command definition without agent invocation. Also, the argument-hint and help text are most naturally defined in the command layer, not scattered into the agent body.

**Do this instead:** Check `$ARGUMENTS` for `--help` at the top of the command's `<process>` block and print the `<help>` block. Return before invoking the agent.

---

### Anti-Pattern 4: config.json as Runtime Metadata Store

**What people do:** Write `runtime: "claude"` or `toolMap: {...}` into `config.json` at review time to persist runtime context.

**Why it's wrong:** `config.json` is PR metadata — it captures what was reviewed, not how the toolkit was installed. The fix agent and UI have no use for runtime identity. Mixing concerns makes `config.json` harder to reason about and introduces a possible future conflict if two runtimes review the same PR.

**Do this instead:** Runtime identity lives in installed file paths only. No runtime metadata in runtime data files.

---

## Scalability Considerations

This toolkit is developer-tooling, not a service. Scale is measured in runtimes supported, not concurrent users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2 runtimes (current) | RUNTIMES constant + placeholder substitution is sufficient |
| 3-5 runtimes | Same pattern scales linearly. Each new runtime is one new RUNTIMES entry + one verification pass on tool names. |
| 6+ runtimes | Consider extracting RUNTIMES to a separate `runtimes.js` config file and auto-generating test fixtures. |

---

## Sources

- Direct reading: `bin/install.js` — complete installer implementation, RUNTIMES constant shape
- Direct reading: `agents/pr-reviewer.md` — frontmatter pattern, tools list
- Direct reading: `agents/pr-fixer.md` — frontmatter pattern
- Direct reading: `commands/pr-review/review.md` — argument-hint field, allowed-tools format
- Direct reading: `.planning/PROJECT.md` — v1.3 requirements and constraints
- Direct reading: `.planning/ROADMAP.md` — --help backlog item context
- Confidence: HIGH for architecture patterns derived from existing code. LOW for OpenCode-specific tool names (requires external verification).

---

*Architecture research for: PR Review Agent v1.3 multi-framework support*
*Researched: 2026-03-31*
