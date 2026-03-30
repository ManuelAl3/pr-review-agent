# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An npm-distributed AI agent toolkit for PR code review. Users install it via `npx pr-review-agent@latest` into their AI assistant's config directory (Claude Code or OpenCode). It provides slash commands (`/pr-review:review`, `/pr-review:setup`) that analyze GitHub PRs against project-specific patterns and generate structured findings with an interactive HTML preview.

## Architecture

```
bin/install.js          → Installer entry point (npx). Copies files to target config dir.
agents/
  pr-reviewer.md        → Review agent: analyzes PR diffs, generates findings.
  pr-fixer.md           → Fix agent: applies corrections from findings to source code.
commands/pr-review/     → Slash command definitions that invoke agents.
  review.md             → /pr-review:review <pr-url> [--post] [--focus ...]
  setup.md              → /pr-review:setup (generates REVIEW-PLAN.md)
  fix.md                → /pr-review:fix [--all] [--only N] [--severity X] [--category X]
template/               → Runtime files copied into user's config dir.
  index.html            → Interactive preview UI (pure HTML/CSS/JS, no dependencies)
  serve.js              → Zero-dep Node.js server (port 3847) with PUT APIs for persistence
  templates/review-plan.md → Base template for project review plans
```

**Review flow:** Installer copies agents + commands + template into `{CONFIG_DIR}/pr-review/`. Review agent reads `./REVIEW-PLAN.md` + `./CLAUDE.md` from the target project, fetches PR diffs via `gh` CLI, and writes `findings.json` + `config.json` which the HTML UI loads.

**Fix flow:** Fix agent reads `findings.json` from a previous review, applies filters (all/only/severity/category), then for each finding: reads the target file, finds a reference implementation in the codebase, and applies the correction using Edit/Write tools. Never commits — the user decides when.

## Placeholder System

All `.md`, `.js`, `.json` files use `__CONFIG_DIR__` as a placeholder. During installation, `bin/install.js` rewrites it to the actual config directory name (`.claude` or `.config/opencode`). When adding new commands or agents, use `__CONFIG_DIR__` for any path that references the config directory.

## Findings Schema

Every finding in `findings.json` has exactly 10 required fields:

```json
{
  "file": "src/path/to/file.ts",
  "line": 35,
  "severity": "critical|warning|suggestion",
  "category": "category-key",
  "title": "Short title (<80 chars)",
  "body": "Detailed explanation (supports HTML)",
  "snippet": "current code → expected code",
  "status": "pending|resolved (default: pending)",
  "commitHash": "abc1234 or null (default: null)",
  "commentId": "12345 or null (default: null)"
}
```

The `snippet` field uses `→` to separate current from expected code. The `status`, `commitHash`, and `commentId` fields track fix resolution state. When loading existing findings files that lack these fields, consumers apply silent defaults: `status` → `"pending"`, `commitHash` → `null`, `commentId` → `null`. The HTML UI renders, edits, and persists all 10 fields.

## Development

No build step, no tests, no linter. This is a pure distribution package. To test changes locally:

```bash
node template/serve.js          # Start preview server on :3847
npx . --claude --local          # Install locally to test the installer
```

## Publishing

```bash
npm version patch|minor|major   # Bump version
git add -A && git commit        # Commit
git push && npm publish          # Publish to both GitHub and npm
```

## Conventions

- **Zero runtime dependencies.** `serve.js` and `install.js` use only Node.js built-ins.
- **`index.html` is self-contained.** All CSS, JS, and markup live in one file. No bundler.
- **Agent/command files use YAML frontmatter** (`name`, `description`, `allowed-tools`, `agent`).
- **Commands reference agents** via the `agent:` frontmatter key. The agent file lives in `agents/`.
- **Commit messages in English.** Use conventional commits (`feat:`, `fix:`, etc.).

<!-- GSD:project-start source:PROJECT.md -->
## Project

**PR Review Agent**

An npm-distributed AI agent toolkit that gives developers a complete PR review cycle: analyze GitHub PRs against project-specific patterns, view findings in an interactive UI, fix issues directly in code, and close the loop on GitHub with inline comments and commit-linked replies. Installed via `npx pr-review-agent@latest` into Claude Code or OpenCode config directories.

**Core Value:** The developer gets a complete review-to-resolution cycle without leaving their AI assistant: review a PR, see findings, fix them, and have every fix tracked on GitHub with commit links.

### Constraints

- **Zero dependencies**: serve.js, install.js, and index.html must remain dependency-free (Node.js built-ins only)
- **Self-contained HTML**: All CSS, JS, markup in one file. No bundler
- **GitHub CLI**: All GitHub interaction via `gh` CLI — no GitHub API tokens or OAuth
- **No commits without user intent**: Review agent never commits. Fix agent commits only when explicitly invoked
- **Placeholder portability**: All paths use `__CONFIG_DIR__` placeholder, rewritten at install time
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (Node.js) - All runtime code, CLI tools, and agent implementations
- Markdown - Agent/command definitions, documentation
- HTML - Self-contained UI template with embedded CSS and JavaScript
- JSON - Configuration and data files
## Runtime
- Node.js >= 18.0.0
- npm (Node Package Manager)
- Lockfile: `package-lock.json` (standard for npm)
## Frameworks
- No external frameworks for core runtime. Pure Node.js built-ins only.
- Not applicable - This is a distribution package with no test suite.
- No build step. Pure distribution package (npm bin executable).
## Key Dependencies
- `serve.js` - Uses only Node.js built-ins: `http`, `fs`, `path`
- `install.js` - Uses only Node.js built-ins: `fs`, `path`, `readline`, `os`
- `index.html` - Vanilla JavaScript, no external libraries
- `package.json` defines the package structure only
## Configuration
- Node.js version constraint: `>=18.0.0` in `package.json` engines field
- Platform support: Cross-platform (Windows, macOS, Linux)
- Config directories: Dynamic based on runtime environment
- No build configuration required
- No webpack, Vite, or bundler configuration
- No tsconfig.json (pure JavaScript)
- Installer: `bin/install.js` (invoked via `npx pr-review-agent@latest`)
- Installation target: AI assistant config directories
- Installation copies: agents, commands, template files
- Placeholder replacement: `__CONFIG_DIR__` placeholder rewritten during install
## Platform Requirements
- Node.js 18.0.0 or later
- npm (comes with Node.js)
- Git (for version management and publishing)
- Node.js 18.0.0 or later (installed on developer's machine)
- GitHub CLI (`gh`) - **Required external tool**, not bundled
- Claude Code or OpenCode (AI assistant running the agents)
- Modern web browser (for interactive preview UI on port 3847)
## Distribution
- npm package: `pr-review-agent`
- GitHub repository: `TheRocketCodeMX/pr-review-agent`
- License: MIT
- Current version: 1.1.0
- npm registry (`npm install pr-review-agent` or `npx pr-review-agent@latest`)
- Installation copies entire `bin/`, `commands/`, `agents/`, `template/` directories
## Server & Networking
- `serve.js` in `template/` directory
- HTTP server on port 3847 (default, can be overridden)
- No external dependencies - uses Node.js `http` module
- CORS enabled for all requests
- API routes:
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase with hyphens: `install.js`, `pr-reviewer.md`, `pr-fixer.md`
- Command files follow pattern: `{command-name}.md` (e.g., `review.md`, `setup.md`, `fix.md`)
- Agent files follow pattern: `{agent-name}.md` (e.g., `pr-reviewer.md`, `pr-fixer.md`)
- HTML/CSS/JS template files: `index.html`, `serve.js`, `.gitignore`
- camelCase with clear, action-oriented names: `hasFlag()`, `mkdirp()`, `copyFile()`, `copyDir()`, `uninstall()`, `install()`
- Helper functions prefixed with purpose: `log()`, `prompt()`, `banner()`
- Private utility functions grouped by section with comments
- camelCase for regular variables: `args`, `flags`, `configDir`, `filePath`, `stat`, `chunks`
- SCREAMING_SNAKE_CASE for constants: `VERSION`, `PKG_ROOT`, `PORT`, `DIR`, `MIME`, `RUNTIMES`
- Object keys use lowercase with hyphens in config objects: `configDirName`, `globalDir`, `localDir`
- Objects use camelCase properties: `{ isDirectory, startsWith, isTTY }`
- Maps/registries use descriptive all-caps names: `RUNTIMES`, `MIME` (for lookup tables)
## Code Style
- No explicit formatter (no prettier, no eslint config in repo)
- Consistent indentation: 2 spaces
- Single quotes for strings in Node.js code
- Consistent spacing around operators and after keywords
- Section headers use hash-mark dividers: `// ===== Section Name =====`
- Inline comments use `//` with clear, concise descriptions
- JSDoc-style comments for entry points: `/** description */`
## Markdown Frontmatter for Agents and Commands
- `name`: kebab-case identifier for the agent or command
- `description`: Single-line description
- `tools`: List of allowed Claude tools (e.g., `Read, Bash, Grep, Write`)
- `color`: Visual theme (e.g., `blue`, `green`)
- `argument-hint`: Usage hint showing expected arguments (e.g., `"<pr-url-or-number> [--post]"`)
- `allowed-tools`: Array of tools the command can use
- `agent`: Name of the agent file to invoke (e.g., `pr-reviewer`)
## Import Organization
## Error Handling
- Server errors caught and handled: `serve.js` lines 68-87 catch JSON parsing errors and file write errors
- CLI errors caught and reported: `bin/install.js` lines 279-282 catch errors and exit with status 1
- CLI validation: `bin/install.js` lines 207-225 return early if help flag is set
- Security checks: `serve.js` lines 94-95 return 403 if path traversal detected
## Logging
- CLI output uses `log()` helper function: `function log(msg = '') { process.stdout.write(msg + '\n'); }`
- Structured CLI feedback with color codes using ANSI escape sequences
- HTTP server logs startup info to stdout on successful listen
- Error messages to stderr on fatal issues: `console.error()`
## Agent/Command Documentation
- YAML frontmatter at top (name, description, tools, color)
- `<role>` section defining the agent's identity and critical context rules
- `<project_context>` or execution context blocks (what project files to load)
- `<core_principle>` or `<core_principles>` describing decision-making
- `<execution_flow>` with numbered `<step>` elements (each with `name` and `priority`)
- `<constraints>` block listing what NOT to do
- `<success_criteria>` checklist at the end
## Findings Schema
- `file`: Relative path to the source file
- `line`: Line number where issue occurs (approximate)
- `severity`: One of three levels (critical, warning, suggestion)
- `category`: Category key for filtering (e.g., i18n, architecture, design-tokens, security)
- `title`: Brief, actionable title under 80 characters
- `body`: Detailed explanation supporting HTML markup
- `snippet`: Shows current code on left side of `→`, expected code on right side
## Placeholder System
- In templates: `__CONFIG_DIR__/pr-review/templates/`
- In agent steps: `$HOME/__CONFIG_DIR__/pr-review/`
- Rewriting logic: `bin/install.js` lines 91-94
## Function Design
- Functions stay focused on single responsibility
- Helpers are small utility functions (< 15 lines)
- Major functions broken into steps with clear comments
- Limited parameter count (5 or fewer)
- Objects used for configuration when many options needed
- Callbacks/promises used for async operations
- Functions return meaningful data (not just status)
- Promises used for async operations: `readBody()` returns `Promise<string>`
- Guard clauses return early to reduce nesting
## Module Design
- Node.js files executed as CLI entry points (not exported)
- `bin/install.js` is executable via `npx pr-review-agent`
- `template/serve.js` is executable via `node serve.js [port]`
- Agent/command files are loaded and invoked by orchestrator, not directly imported
- Each file is self-contained with minimal coupling
- Shared utilities (colors, helpers) defined locally within files
- No barrel files or index.js pattern
## Commit Messages
- `feat:` for new features (e.g., `feat: add snippet field to findings schema`)
- `fix:` for bug fixes
- `docs:` for documentation changes
- Concise, lowercase, imperative mood
- `feat: add snippet field to findings schema`
- `feat: initial release v1.0.0`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Zero external runtime dependencies (all tools use Node.js built-ins)
- Self-contained UI (`index.html` with embedded CSS/JS)
- Configuration-driven review criteria via `REVIEW-PLAN.md`
- Placeholder-based portability (`__CONFIG_DIR__` replaced during install)
- Persistent findings storage in JSON (loaded/edited by HTML UI)
## Layers
- Purpose: Install toolkit into target AI assistant config directory, handle user prompts for runtime choices (assistant type, scope)
- Location: `bin/`
- Contains: Node.js installer script with ANSI UI, directory structure setup, file copying with placeholder substitution
- Depends on: Filesystem access, readline for interactive prompts, package.json for version info
- Used by: End users via `npx pr-review-agent@latest`
- Purpose: Implement autonomous review and fix logic that operates on GitHub PRs and source code
- Location: `agents/`
- Contains: Two agent definitions (`pr-reviewer.md`, `pr-fixer.md`) with role, execution flow, success criteria
- Depends on: `gh` CLI (GitHub), target project's `./CLAUDE.md` and `./REVIEW-PLAN.md`, Read/Write/Edit/Bash/Grep tools
- Used by: Command layer (invoked via command frontmatter)
- Purpose: Define slash command interfaces that users invoke from their AI assistant
- Location: `commands/pr-review/`
- Contains: Three commands (`review.md`, `setup.md`, `fix.md`) with YAML frontmatter linking to agents
- Depends on: Agent layer (via `agent:` field), project context files
- Used by: AI assistant's slash command parser
- Purpose: Provide static assets and development server for interactive findings UI
- Location: `template/`
- Contains: Self-contained HTML UI (`index.html`), zero-dependency HTTP server (`serve.js`), review plan template (`templates/review-plan.md`)
- Depends on: None (pure HTML/CSS/JS + Node.js built-ins)
- Used by: Installed agents and end users viewing review results
## Data Flow
- `findings.json` — Array of finding objects, persistent across sessions
- `config.json` — PR metadata, category definitions, review configuration
- `REVIEW-PLAN.md` — Project-level checklist, developer-editable, committed to repo
- `CLAUDE.md` → `PROJECT.md` (optional) — Project instructions, read by agents for patterns
## Key Abstractions
- Purpose: Atomic unit of a code review issue with all context needed for fixing
- Files: Referenced throughout agents (pr-reviewer generates, pr-fixer consumes, UI displays)
- Pattern: 10-field JSON structure (file, line, severity, category, title, body, snippet, status, commitHash, commentId)
- Example: `{ file: "src/api/users.ts", line: 42, severity: "critical", category: "security", title: "Missing auth guard", body: "...", snippet: "export function getUser() → export async function getUser(@UseGuards(AuthGuard))" }`
- Purpose: Describe agent role, tools, and entry point to AI assistant's agent runner
- Files: `agents/pr-reviewer.md`, `agents/pr-fixer.md`
- Pattern: YAML frontmatter (`---` delimited) with `name`, `description`, `tools`, `color` + markdown body with `<role>`, `<execution_flow>`, `<success_criteria>` tags
- Design: Agents are pure markdown files that describe their own behavior; the AI assistant's Claude Code runtime interprets and executes them
- Purpose: Define user-facing slash commands that invoke agents
- Files: `commands/pr-review/review.md`, `commands/pr-review/setup.md`, `commands/pr-review/fix.md`
- Pattern: YAML frontmatter with `name`, `description`, `agent`, `argument-hint` + markdown body with `<objective>`, `<execution_context>`, `<process>` tags
- Design: Commands reference agents via `agent: pr-reviewer` and pass context via `@./REVIEW-PLAN.md` annotations
- Purpose: Developer-editable specification of what the PR review agent should enforce
- Files: `./REVIEW-PLAN.md` (at project root, generated by `/pr-review:setup`)
- Pattern: Checklist-based with categories (Code Quality, Architecture, Security, Testing, Documentation) + severity levels + project-specific rules section
- Design: Plain markdown, versioned with project code, customizable by developers
- Purpose: Enable single distribution artifact to work with multiple AI assistant config directories
- Pattern: All `.md`, `.js`, `.json` files in `bin/`, `agents/`, `commands/`, `template/` use `__CONFIG_DIR__` placeholder
- Substitution: During installation (`bin/install.js`), all occurrences are replaced with actual config dir name (`.claude` for Claude Code, `.config/opencode` for OpenCode)
- Design: Ensures installed agents/commands reference the correct paths in the target environment
## Entry Points
- Location: `bin/install.js`
- Triggers: `npx pr-review-agent@latest` or `npx pr-review-agent --claude --global`
- Responsibilities:
- Location: `commands/pr-review/review.md`
- Triggers: `/pr-review:review <pr-url> [--post] [--focus ...]`
- Responsibilities:
- Location: `commands/pr-review/setup.md`
- Triggers: `/pr-review:setup`
- Responsibilities:
- Location: `commands/pr-review/fix.md`
- Triggers: `/pr-review:fix [--filters]`
- Responsibilities:
- Location: `agents/pr-reviewer.md`, `agents/pr-fixer.md`
- Triggers: Invoked by commands via `agent:` field
- Responsibilities: Execute core review/fix logic (see Data Flow section)
- Location: `template/serve.js`
- Triggers: User runs `node .claude/pr-review/serve.js`
- Responsibilities:
## Error Handling
- `gh` CLI verification — Agent checks `gh auth status` before starting; guides user to install/authenticate if missing
- Missing files — Agents check for `REVIEW-PLAN.md`, generate from template with user notification if absent
- Invalid findings.json — Fixer validates JSON structure, reports unfixable findings with reason
- File not found — Fixer reads target file, skips finding if file deleted or path wrong, reports reason
- Ambiguous fixes — Fixer skips pattern-based fixes if snippet ambiguous or multiple matches found, reports why
- Network errors — Review agent catches `gh` API failures, reports PR not found or auth issues
## Cross-Cutting Concerns
- Review agent: prints summary table with category/severity counts
- Fix agent: prints `✓ Fixed: {title} ({file})` or `⊘ Skipped: {reason}` per finding
- UI server: logs request paths and errors to stdout (Node.js default)
- Findings objects validated against 10-field schema by agents and UI
- REVIEW-PLAN.md structure loosely validated (checklist parsing)
- JSON files validated with `JSON.parse()` before write
- PR URL parsing uses regex or gh CLI metadata
- GitHub: Delegated to `gh` CLI, agents assume user has already authenticated
- Config dir: No auth needed (filesystem access based on write permissions)
- Installation scope: Global (user-wide) or Local (project-only) — set by installer flags
- Review criteria: Via `REVIEW-PLAN.md` and project skills
- Severity/Category levels: Hardcoded in agents (critical/warning/suggestion, architecture/security/i18n/design-tokens/etc.)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
