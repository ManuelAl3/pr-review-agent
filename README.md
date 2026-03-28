# PR Review Agent

AI-powered pull request review agent for Claude Code, OpenCode, and other AI coding assistants.

Analyzes PRs against your project's architectural patterns and generates an interactive preview with inline editing.

## Install

```bash
npx pr-review-agent@latest
```

The interactive installer asks for your AI assistant (Claude Code, OpenCode) and scope (global or project-level).

### Non-interactive

```bash
npx pr-review-agent --claude --global    # Claude Code, user-wide
npx pr-review-agent --claude --local     # Claude Code, project only
npx pr-review-agent --opencode --global  # OpenCode, user-wide
```

### Uninstall

```bash
npx pr-review-agent --claude --global --uninstall
```

## Usage

After installing, in your AI assistant:

```
/pr-review:review https://github.com/org/repo/pull/123
```

The agent will:
1. Fetch the PR diff via GitHub CLI (`gh`)
2. Analyze code against your `REVIEW-PLAN.md` checklist and project skills
3. Generate `findings.json` + `config.json`
4. Output a summary of findings

### Preview UI

Start the local server to view and edit findings:

```bash
node .claude/pr-review/serve.js
# Open http://localhost:3847
```

Features:
- Filter by severity, category, file
- Inline editing with live preview
- Create/edit/delete categories
- Auto-save to disk

## What Gets Installed

Everything lives inside `.claude/` (like GSD uses `.claude/get-shit-done/`):

| Location | Files |
|----------|-------|
| `.claude/commands/pr-review/` | Slash commands (`review.md`, `setup.md`) |
| `.claude/agents/` | Agent definition (`pr-reviewer.md`) |
| `.claude/pr-review/` | UI template, server, review plan, findings data |

## Configuration

Edit `.claude/pr-review/REVIEW-PLAN.md` to customize what the agent checks. The agent also reads `CLAUDE.md` and project skills automatically.

## Requirements

- Node.js >= 18
- GitHub CLI (`gh`) installed and authenticated
- Claude Code, OpenCode, or compatible AI assistant

## License

MIT
