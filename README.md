# PR Review Agent

AI-powered pull request review agent for Claude Code, OpenCode, and other AI coding assistants.

Gives developers a complete review-to-resolution cycle without leaving their AI assistant: analyze a PR against project-specific patterns, view findings in an interactive UI, fix issues directly in code, and close the loop on GitHub with inline comments and commit-linked replies.

## Install

```bash
npx pr-review-agent@latest
```

The interactive installer asks for your AI assistant (Claude Code, OpenCode) and scope (global or project-level). Re-installing over an existing installation safely upgrades — stale files are cleaned up while your data (`findings.json`, `config.json`, `REVIEW-PLAN.md`) is preserved.

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

## Commands

### Review a PR

```
/pr-review:review <pr-url-or-number>
```

The agent fetches the PR diff via `gh`, analyzes code against your `REVIEW-PLAN.md` checklist and project skills, and generates structured findings.

**Flags:**

| Flag | Description |
|------|-------------|
| `--post` | Post findings as inline code review comments on the PR |
| `--focus <area>` | Limit review to a category: `security`, `i18n`, `architecture`, `design-tokens`, or `all` |
| `--skills <selection>` | Choose project skills to include: `all`, `none`, or comma-separated names |
| `--help` | Print flag reference and exit |

**Examples:**

```
/pr-review:review https://github.com/org/repo/pull/42
/pr-review:review 42 --post --focus security
/pr-review:review 42 --skills auth,logging
/pr-review:review --help
```

When `--post` is used, findings are posted as inline comments on specific PR lines — the same way a human reviewer would comment.

### Fix findings

```
/pr-review:fix
```

Reads findings from a previous review and applies corrections directly to the source code. Each fix follows project conventions by finding reference implementations in the codebase.

**Flags:**

| Flag | Description |
|------|-------------|
| `--all` | Fix all findings (default) |
| `--only <N>` | Fix only finding at index N (1-based, as shown in the preview UI) |
| `--severity <level>` | Fix only `critical`, `warning`, or `suggestion` findings |
| `--category <key>` | Fix only findings in a category (e.g. `security`, `i18n`) |

Filters can be combined: `--severity critical --category security`

**What the fix agent does for each finding:**

1. Reads the target file and finds a reference implementation in the codebase
2. Applies the correction using the project's own patterns
3. Creates one commit per fix: `fix(review): [title]`
4. Pushes all commits to the PR branch
5. Replies to each inline PR comment with "Fixed in \`<commit-hash>\`" linking the commit

Already-resolved findings are skipped on re-runs. Fork PRs are detected automatically — commits and pushes are skipped with a warning.

### Set up review criteria

```
/pr-review:setup
```

Generates a `REVIEW-PLAN.md` in your project root with review categories, severity levels, and project-specific rules. The review agent uses this as its primary checklist.

## Preview UI

Start the local server to view and edit findings interactively:

```bash
node .claude/pr-review/serve.js
# Open http://localhost:3847
```

Features:
- Filter by severity, category, file, or fix status (pending/resolved)
- Inline editing with live preview
- Create/edit/delete categories
- Resolved findings show a green "Resolved" badge with visual dimming
- Auto-save to disk

## The Full Cycle

```
1. /pr-review:setup                          # One-time: generate REVIEW-PLAN.md
2. /pr-review:review <pr-url> --post         # Review PR, post inline comments
3.   node .claude/pr-review/serve.js         # (Optional) Browse findings in UI
4. /pr-review:fix                            # Fix issues, commit, push, reply on GitHub
```

After step 4, every inline comment thread on the PR shows "Fixed in \`abc1234\`" with a link to the commit that resolved it.

## What Gets Installed

| Location | Files |
|----------|-------|
| `.claude/commands/pr-review/` | Slash commands (`review.md`, `setup.md`, `fix.md`) |
| `.claude/agents/` | Agent definitions (`pr-reviewer.md`, `pr-fixer.md`) |
| `.claude/pr-review/` | UI template, server, review plan template |

## Runtime Compatibility

| Feature | Claude Code | OpenCode |
|---------|------------|----------|
| Slash commands | Full support | Full support |
| Agent delegation | Full support | Full support |
| `--help` flag | Full support | Full support |
| Argument hints in autocomplete | Displayed | Not displayed |
| Tool permissions | Via `allowed-tools` | Via `opencode.json` |

Each agent and command file includes an inline compatibility block documenting runtime-specific behavior.

## Configuration

Edit `REVIEW-PLAN.md` in your project root to customize what the agent checks. The agent also reads `CLAUDE.md` and project skills automatically.

## Requirements

- Node.js >= 18
- GitHub CLI (`gh`) installed and authenticated
- Claude Code, OpenCode, or compatible AI assistant

## License

MIT
