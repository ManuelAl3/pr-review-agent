# Architecture Patterns: PR Fix Agent

**Domain:** AI-powered PR review auto-fix with GitHub integration
**Researched:** 2026-03-30
**Confidence:** HIGH — based on existing codebase analysis + established gh CLI patterns

---

## System Context

This is a brownfield addition. The existing system already has:

- `pr-reviewer.md` — writes `findings.json` + `config.json`
- `pr-fixer.md` — reads `findings.json`, applies file edits, never commits
- `serve.js` — local HTTP server, persists UI edits to `findings.json`
- `index.html` — renders findings, supports in-browser editing
- `findings.json` schema: `{file, line, severity, category, title, body, snippet}`

The milestone extends this system with: branch checkout, one-commit-per-finding, push, PR comment replies, and UI resolution tracking. No new runtime dependencies are permitted.

---

## Recommended Architecture

### Layered Component Model

```
┌─────────────────────────────────────────────────────┐
│  COMMAND LAYER  (commands/pr-review/fix.md)         │
│  Parses flags, resolves PR_REVIEW_DIR, invokes agent │
└────────────────────┬────────────────────────────────┘
                     │ invokes via agent: pr-fixer
┌────────────────────▼────────────────────────────────┐
│  AGENT LAYER  (agents/pr-fixer.md)                  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Git Context  │  │ Fix Engine   │  │  GitHub   │ │
│  │  Component   │  │  Component   │  │  Bridge   │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└────────────────────────────────────────────────────-┘
                     │ reads/writes
┌────────────────────▼────────────────────────────────┐
│  STATE LAYER  (filesystem)                          │
│  findings.json  config.json  source files           │
└─────────────────────────────────────────────────────┘
                     │ reflected in
┌────────────────────▼────────────────────────────────┐
│  UI LAYER  (index.html + serve.js)                  │
│  Resolution badges, status filter, commit links     │
└─────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Component 1: Git Context Component

**Responsibility:** Establish correct git state before any file is touched. Isolated because git state errors must abort the entire fix run before any edits happen.

**What it does:**
1. Reads `config.json` to get `headRefName` (the PR branch name stored during review)
2. Detects current branch: `git branch --show-current`
3. If already on the PR branch, proceed
4. If on a different branch, checks for clean working tree: `git status --porcelain`
5. If clean: `gh pr checkout {PR_NUMBER}` (preferred over raw `git checkout` — handles fork PRs automatically)
6. If dirty: STOP and report to user; do not auto-stash

**Output:** Confirmed branch name for use in commit messages and push target

**Communicates with:** Fix Engine Component (passes branch name), GitHub Bridge (needed for push target)

**Error cases:**
- `config.json` has no PR number or branch → ask user to re-run review
- Working tree dirty → print clear message, stop; never auto-stash
- `gh pr checkout` fails (fork PR, no write access) → report limitation, continue with file edits only (skip commit+push steps)

---

### Component 2: Fix Engine Component

**Responsibility:** Apply one surgical code change per finding, then commit it immediately. One finding = one atomic git commit. This is the core loop.

**What it does (per finding):**

1. Read the target file at `finding.file`
2. Locate the issue using `finding.line` and `finding.snippet` (left side of `→`)
3. Find a reference implementation in the codebase (for pattern-based fixes)
4. Apply the fix using Edit or Write tools
5. Stage the specific file: `git add {finding.file}`
6. Commit with structured message: `git commit -m "fix(review): {finding.title}"`
7. Capture the commit hash from stdout: `git rev-parse HEAD`
8. Update `findings[i].status = "resolved"` and `findings[i].commitHash = "{hash}"`
9. Write updated `findings.json` immediately (not batched — crash safety)
10. Emit progress: `Fixed: {title} ({file}:{line}) → {commitHash}`

**What it does NOT do:**
- Never stages files other than `finding.file`
- Never modifies `findings.json` fields other than `status` and `commitHash`
- Never commits if fix was skipped

**Communicates with:** State Layer (reads/writes findings.json, reads source files), Git Context Component (requires branch to be set), GitHub Bridge (passes commit hashes for reply linking)

---

### Component 3: GitHub Bridge Component

**Responsibility:** All outbound GitHub API calls. Isolated so they can be skipped cleanly when the user lacks push access (fork PRs from external contributors).

**What it does (after all fixes are applied):**

**Push step:**
```bash
git push origin HEAD
```
Pushes all commits accumulated during the fix run in one network call. Push happens after all findings are processed, not per-finding — reduces API surface and avoids mid-run push failures.

**Reply step (per resolved finding):**

For each finding where `status === "resolved"` and a `commentId` exists:

```bash
gh api repos/{OWNER}/{REPO}/pulls/comments/{COMMENT_ID}/replies \
  --method POST \
  --field body="Fixed in \`{commitHash}\` — see commit for changes."
```

`commentId` comes from `findings[i].commentId`, which the Review Agent must store when it posts inline comments with `--post`. If `commentId` is absent (finding was never posted as a GitHub comment), the GitHub Bridge silently skips the reply for that finding.

**Communicates with:** State Layer (reads commitHash, commentId from findings.json), Git Context Component (needs branch info for push target)

**Degradation modes:**
- Push fails → report error, leave commits local, user pushes manually
- Reply fails for one comment → log and continue; do not roll back fixes
- No `commentId` on finding → skip reply silently (finding was local-only)

---

### Component 4: State Layer (findings.json schema extension)

The existing 7-field schema gains two optional fields:

```json
{
  "file": "src/api/users.ts",
  "line": 35,
  "severity": "critical",
  "category": "security",
  "title": "Missing auth guard",
  "body": "...",
  "snippet": "getUser() → @UseGuards(AuthGuard)\ngetUser()",
  "status": "pending",
  "commitHash": null,
  "commentId": null
}
```

| Field | Type | Set by | Used by |
|-------|------|--------|---------|
| `status` | `"pending" \| "resolved"` | Fix Engine | UI (badge), fix filter |
| `commitHash` | `string \| null` | Fix Engine after commit | GitHub Bridge (reply body), UI (link) |
| `commentId` | `string \| null` | Review Agent (--post flow) | GitHub Bridge (reply target) |

**Backward compatibility:** Fields are optional. Existing `findings.json` files without them behave as `status: "pending"`, `commitHash: null`, `commentId: null`.

---

### Component 5: UI Layer Extensions (index.html + serve.js)

**serve.js changes:** None. The existing `PUT /api/save/findings` endpoint already handles arbitrary JSON — it just validates and writes. The agent writes updated findings.json directly via the Write tool (not through serve.js), matching the existing fix agent pattern.

**index.html changes (additive only):**

- **Resolved badge:** When `finding.status === "resolved"`, render a green "Resolved" badge alongside the severity badge. Card gets visual dimming (`opacity: 0.6`, `text-decoration: line-through` on title).
- **Commit link:** When `finding.commitHash` is present, render a monospace chip linking to `{repoUrl}/commit/{commitHash}` (repo URL sourced from `config.json`).
- **Fix status filter:** Add a "Pending only / All" toggle to the sidebar filter section. Default: show all. Pure client-side filter over the loaded array.

**No new API endpoints required.** The UI is read-only with respect to `status` and `commitHash` — only the agent writes those fields.

---

## Data Flow

### Full Fix Cycle: Review → Fix → GitHub

```
/pr-review:review <PR>
        │
        ▼
  pr-reviewer.md
    ├── gh pr view → config.json (stores: prNumber, owner, repo, headRefName)
    ├── gh api pulls/{N}/files → analyze diffs
    ├── writes findings.json [{status:"pending", commentId:null, ...}]
    └── if --post: posts inline comments
          └── stores commentId per finding in findings.json

/pr-review:fix [--filters]
        │
        ▼
  fix.md command
    └── loads findings.json, applies filters, invokes pr-fixer agent

  pr-fixer.md (agent)
    │
    ├── [Git Context Component]
    │     ├── reads config.json → prNumber, headRefName
    │     ├── gh pr checkout {prNumber}
    │     └── confirms branch name
    │
    ├── [Fix Engine Component] (per finding, sequential)
    │     ├── reads source file
    │     ├── applies edit (Edit/Write tools)
    │     ├── git add {file}
    │     ├── git commit -m "fix(review): {title}"
    │     ├── git rev-parse HEAD → commitHash
    │     └── writes findings.json: {status:"resolved", commitHash}
    │
    └── [GitHub Bridge Component] (after all fixes)
          ├── git push origin HEAD
          └── per resolved finding with commentId:
                gh api .../comments/{commentId}/replies
                  --field body="Fixed in `{commitHash}`"

User opens browser:
  serve.js → index.html
    ├── fetches findings.json
    ├── renders resolved badges + dimming for status:"resolved"
    ├── renders commit hash chips with links
    └── sidebar filter: "Pending only" hides resolved cards
```

### Information Flow Direction

```
config.json ──────────────────────────────► Git Context Component
                                                    │
                                                    ▼ branch name
findings.json ────────────────────────────► Fix Engine Component
                                                    │
                                                    ▼ commitHash
                                    findings.json (updated in place)
                                                    │
                                                    ▼
                                            GitHub Bridge Component
                                                    │
                                    ┌───────────────┴──────────────┐
                                    ▼                              ▼
                            git push origin HEAD         gh api .../replies
                                (commits)               (PR comment threads)
```

Key property: **data flows forward only**. No component reads back from GitHub to update local state. The commit hash captured from `git rev-parse HEAD` is the only value that flows from git back into `findings.json`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Batch Commit at End

**What:** Fix all findings first, then make one big commit.

**Why bad:** Loses per-finding traceability. The PR reviewer cannot see "which commit fixed which issue." Defeats the core value proposition of the one-commit-per-finding design decision.

**Instead:** Commit immediately after each fix, before moving to the next finding.

---

### Anti-Pattern 2: Stashing Working Tree Automatically

**What:** Agent runs `git stash` when it detects a dirty working tree.

**Why bad:** Silently moves user's in-progress work. If the agent crashes after stashing, the user loses context. Violates the principle of not taking irreversible action without explicit user consent.

**Instead:** Detect dirty tree, print a clear explanation, stop. Let the user decide whether to stash, commit, or discard.

---

### Anti-Pattern 3: Push Per Commit

**What:** After each `git commit`, immediately `git push`.

**Why bad:** One push per finding means N network calls for N findings. Rate limiting risk. If a push fails mid-run, some findings are on GitHub and others are not — inconsistent state.

**Instead:** Accumulate all commits locally during the fix run, then push once at the end (GitHub Bridge Component).

---

### Anti-Pattern 4: Inline commentId Lookup at Fix Time

**What:** During fix, call `gh api .../comments` to find the comment ID for each finding by matching body text.

**Why bad:** Expensive API call per finding. Fragile text matching. The Review Agent already has the comment IDs when it posts comments.

**Instead:** Review Agent stores `commentId` in `findings.json` at comment-post time. Fix Agent reads it directly.

---

### Anti-Pattern 5: Blocking Fix on Push Failure

**What:** If `git push` fails, roll back commits and mark all findings as pending.

**Why bad:** The source code fixes are correct and committed locally. Rolling back throws away valid work. Push failures are usually transient (network, auth) and recoverable.

**Instead:** Report push failure clearly. Commits remain local. User can push manually. `findings.json` retains `status: "resolved"` because the code is fixed.

---

## Suggested Build Order

The components have explicit dependencies. Build them in this order:

### Phase 1: Schema + State Foundation

**What:** Extend `findings.json` schema with `status`, `commitHash`, `commentId`. Add backward-compat handling in existing read paths.

**Why first:** Every other component depends on these fields existing. The UI changes and agent changes both assume the schema is stable.

**Deliverable:** Schema definition documented, existing `findings.json` files still load correctly.

---

### Phase 2: UI Resolution Display

**What:** Add resolved badge, commit link chip, and "Pending only" filter to `index.html`.

**Why second:** UI is isolated from agent complexity. Can be built and tested with synthetic `findings.json` data before the fix agent exists. Gives immediate visible feedback on schema design.

**Deliverable:** `index.html` renders resolved state correctly when `status: "resolved"` and `commitHash` are present in data.

---

### Phase 3: Git Context Component

**What:** Add branch checkout logic to `pr-fixer.md`. Reads `config.json.headRefName`, runs `gh pr checkout`, handles dirty-tree abort.

**Why third:** Must be proven stable before Fix Engine runs. A bad checkout corrupts the user's git state — highest risk component. Isolating it makes it testable independently (just run checkout, no fixes).

**Deliverable:** Agent correctly checkouts PR branch, aborts cleanly on dirty tree.

---

### Phase 4: Fix Engine Component (commit loop)

**What:** Extend fix loop in `pr-fixer.md` to stage, commit, capture hash, update `findings.json` after each fix.

**Why fourth:** Depends on Git Context (branch must be set), depends on schema (status/commitHash fields must exist).

**Deliverable:** Each fix produces one commit. `findings.json` updated immediately. Summary shows commit hashes.

---

### Phase 5: GitHub Bridge Component (push + replies)

**What:** Add push step and comment reply loop to `pr-fixer.md`. Reads `commentId` from findings, calls `gh api .../replies`.

**Why last:** Depends on all previous components. External side effects (push, API calls). Can be built and tested with `--dry-run` flag or by reviewing the shell commands before execution.

**Deliverable:** All commits pushed. PR comment threads show "Fixed in `abc1234`" replies.

---

### Phase 6: Review Agent commentId Plumbing

**Note:** This is a dependency for Phase 5 replies to work end-to-end, but it can be developed in parallel with Phases 3-5 since it only touches `pr-reviewer.md` and `findings.json` writes.

**What:** When Review Agent posts comments with `--post`, capture the returned comment ID and store it in the corresponding finding's `commentId` field.

**gh API for posting inline review comments:**
```bash
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments \
  --method POST \
  --field body="{body}" \
  --field path="{file}" \
  --field line={line} \
  --field side="RIGHT" \
  --jq '.id'
```
The returned `.id` is the `commentId` to store.

---

## Scalability Considerations

| Concern | Current (MVP) | At 50+ findings |
|---------|--------------|-----------------|
| Commit volume | 1 commit per finding, fine | Still fine — git handles thousands of commits |
| Push strategy | One push after all fixes | Still one push — no change needed |
| API reply rate | Sequential per comment | May hit GitHub secondary rate limits; add 500ms delay between reply calls |
| findings.json size | Written per-fix (crash safety) | File stays small (<100KB for realistic finding counts); no concern |
| Comment deduplication | commentId prevents duplicate posts | Relies on commentId being set; if missing, Bridge skips silently |

---

## Sources

- Existing codebase: `agents/pr-fixer.md`, `agents/pr-reviewer.md`, `commands/pr-review/fix.md`
- Existing architecture analysis: `.planning/codebase/ARCHITECTURE.md`
- Existing integration audit: `.planning/codebase/INTEGRATIONS.md`
- Project requirements: `.planning/PROJECT.md`
- GitHub REST API (gh CLI proxy): `gh api repos/{owner}/{repo}/pulls/comments/{id}/replies` — standard GitHub inline comment reply endpoint
- Confidence: HIGH — component boundaries derived from explicit requirements in PROJECT.md and observed patterns in existing agent code

---

---

# Architecture Extension: Skill Detection and Selection (v1.2)

**Milestone:** v1.2 Skill-Aware PR Review
**Researched:** 2026-03-31
**Confidence:** HIGH — all findings derived from direct codebase reading

---

## What Changes and What Does Not

This milestone adds skill detection and selection to the review agent (`pr-reviewer.md`). The fix agent, UI, installer, and findings schema are unaffected.

| Component | Change | Reason |
|-----------|--------|--------|
| `agents/pr-reviewer.md` | Add Step 0.9, modify Step 1 | Skills must be discovered and selected before analysis begins |
| `commands/pr-review/review.md` | None | Skill detection is agent-side; command layer unchanged |
| `bin/install.js` | None (optional: one cosmetic log line) | Installer does not own skills directories |
| `template/serve.js` | None | Skills are analysis context, not output data |
| `template/index.html` | None | No new finding fields; no new UI concepts |
| `agents/pr-fixer.md` | None | Fix agent consumes findings, not review context |
| findings.json schema | None | Skill rules produce standard findings; no new fields needed |

---

## Updated System Overview (v1.2 Layer Added)

```
┌──────────────────────────────────────────────────────────────────────┐
│              Command Layer (commands/pr-review/review.md)             │
│  No changes. Invokes pr-reviewer via agent: field.                    │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ invokes
┌──────────────────────────────────────────────────────────────────────┐
│                 Agent Layer (agents/pr-reviewer.md)                   │
│                                                                       │
│  Step 0    — Verify gh CLI (unchanged)                                │
│  Step 0.5  — Detect PR_REVIEW_DIR (unchanged)                         │
│  Step 0.9  — [NEW] Detect skills + interactive selection              │
│  Step 1    — Load Review Context (modified: includes selected skills) │
│  Step 2    — Analyze Code Changes (unchanged structure)               │
│  Step 3    — Generate Output (unchanged)                              │
│  Step 4    — Post Comments (unchanged)                                │
└──────────────────────────────────────────────────────────────────────┘
                               ↓ reads at Step 0.9
┌──────────────────────────────────────────────────────────────────────┐
│              Skill Source Directories (filesystem scan)               │
│                                                                       │
│  .claude/skills/            (Claude Code — current project)           │
│  $HOME/.claude/skills/      (Claude Code — global)                    │
│  .opencode/skills/          (OpenCode — current project)              │
│  $HOME/.config/opencode/skills/   (OpenCode — global)                 │
│  .agents/skills/            (generic agent frameworks)                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Step 0.9: Skill Detection and Selection

Step 0.9 is placed between the existing Step 0.5 (PR_REVIEW_DIR detection) and Step 1 (load review context). It is a **read-and-prompt phase** — no GitHub API calls, no file writes, no git operations.

**Why between 0.5 and 1:**
- Skills must be selected before Step 1 runs, because Step 1 is where context is assembled for analysis
- Step 0.5 establishes `PR_REVIEW_DIR`, which may be used as one root to check (though it is not a skills directory itself — this is a secondary benefit)
- The prompt must occur before any analysis work, not as an interruption mid-review

**Silent pass-through:** If no skill directories exist or no skill subdirectories are found inside them, Step 0.9 completes without any user interaction. Existing review behavior is fully preserved.

---

## Skill Detection Algorithm

The agent scans candidate directories in priority order. Local project directories take precedence over global user directories. When the same skill name appears in multiple locations, the first occurrence wins.

**Candidate directories (ordered, highest priority first):**
```
.claude/skills/
$HOME/.claude/skills/
.opencode/skills/
$HOME/.config/opencode/skills/
.agents/skills/
```

**Detection per directory:**
```bash
ls -d {dir}/*/ 2>/dev/null   # list skill subdirectories
```

For each subdirectory found:
- Attempt to read `SKILL.md` (canonical name for this project)
- Fall back to `README.md`
- Fall back to any `.md` file in the directory
- Parse YAML frontmatter `name` and `description` fields if present
- Use directory name as fallback for `name`

**Deduplication:** After scanning all directories, deduplicate by `name` field. First occurrence in priority order wins.

**Output:** `SKILLS_FOUND` — ordered array of `{ name, description, skill_path }` entries.

---

## Interactive Selection Prompt

When `SKILLS_FOUND` is non-empty, the agent prompts using `AskUserQuestion` (already present in `review.md`'s `allowed-tools`):

```
Found 2 skills for this project:
  1. conventional-commit — Commit message structure and format rules
  2. api-contracts — REST API contract enforcement patterns

Load skills for review? [all / 1,2 / none]:
```

| Developer input | Behavior |
|----------------|----------|
| `all` or empty (Enter) | Load all discovered skills |
| `1,2` (comma-separated numbers) | Load only the numbered skills |
| `none` | Skip all skills; proceed with REVIEW-PLAN.md only |

When `SKILLS_FOUND` is empty, skip the prompt entirely — zero change to user experience for projects without skills.

---

## Skill Persistence: Per-Review, In-Memory Only

Selected skill contents are held in-memory for the duration of the agent session. They are not written to `config.json`, `findings.json`, or any new file.

**Rationale for not persisting:**
- Skills inform the agent's analysis reasoning — they are context, not output state
- The developer may want different skills for different review types (security focus vs. UI focus) even on the same project
- Persisting selection would require a new config file and create stale-state problems when skills are added/removed
- The prompt takes seconds; it is not burdensome to answer once per review

**How selected skills flow into analysis:**

```
Step 0.9 outputs: SELECTED_SKILL_CONTENTS = [
  { name: "conventional-commit", content: "..." },
  { name: "api-contracts", content: "..." }
]

Step 1 adds to agent's working context:
  "Also loaded skills: conventional-commit, api-contracts"

Step 2 analysis criteria:
  REVIEW-PLAN.md checklist items  (existing)
  + selected skill rules           (new — equal priority to REVIEW-PLAN.md)
```

Skill rules that generate findings produce standard 10-field finding objects. No new schema fields.

---

## Installer: No Functional Changes Required

The installer does not scan, register, or copy skill directories. Skills are owned by the developer's AI config environment — they exist before and independently of the pr-review-agent installation.

**Why installer stays unchanged:**
- Skills may be installed or updated at any time after the pr-review-agent is installed
- A skill registry written at install time would become stale immediately
- Runtime discovery (Step 0.9) is always accurate; install-time discovery is not

**Optional cosmetic addition** (one log line in `install()`, no functional change):
```javascript
log(`  ${c.dim}Skills auto-detected from .claude/skills/, .opencode/skills/${c.reset}`);
```

This is informational only. The agent finds skills regardless of whether this line is printed.

---

## Build Order for v1.2

Three sequential phases. Each is independently deliverable and testable.

### Phase 1: Skill Discovery (Silent, No Prompt)

Implement Step 0.9 detection in `pr-reviewer.md`. Agent scans all candidate directories, collects skill paths, reads their content, and logs what it found. All discovered skills are automatically loaded into Step 1 context — no user interaction yet.

**Deliverable:** Agent output includes "Loaded skills: X, Y" when skills exist. No output change when no skills exist. No regressions.

**Testable:** Run `/pr-review:review` on a project with `.claude/skills/` containing at least one skill. Verify the log line appears and the skill content is visible in the agent's analysis context.

**Depends on:** Nothing new.

---

### Phase 2: Interactive Selection

Add the `AskUserQuestion` prompt to Step 0.9. Wrap the discovery loop: if `SKILLS_FOUND` is non-empty, prompt before loading any skill content. Apply the developer's selection.

**Deliverable:** Developer sees discovered skills, chooses all/subset/none. Projects without skills get zero change in behavior.

**Testable:** Verify (a) projects with skills prompt the developer, (b) projects without skills do not prompt, (c) selecting "none" produces the same output as a project with no skills.

**Depends on:** Phase 1 (discovery must work before selection makes sense).

---

### Phase 3: Step 1 and Step 2 Framing Updates

Update Step 1's load sequence to explicitly acknowledge selected skills alongside REVIEW-PLAN.md. Update Step 2's analysis instructions to treat skill rules as mandatory criteria at equal priority to REVIEW-PLAN.md.

This phase is prompt-engineering changes to `pr-reviewer.md` — no JavaScript, no new files.

**Deliverable:** PR reviews produce findings that reference skill-defined patterns. A finding from a skill rule is indistinguishable from a finding from REVIEW-PLAN.md in the output schema.

**Testable:** Use a skill with a specific, verifiable rule (e.g., "all functions must have JSDoc comments"). Review a PR that violates that rule. Verify a finding is generated.

**Depends on:** Phase 2 (skills must be selected before analysis can be framed around them).

---

## Anti-Patterns for v1.2

### Anti-Pattern A: Persisting Skill Selection to config.json

**What:** Store the list of selected skills in `config.json` after each review.

**Why bad:** Skills are review-session context. Persisting them creates stale state the moment a developer adds or removes a skill from their config directory. A second review run would silently use a stale selection.

**Instead:** Re-discover and re-prompt on every review run. Fast and always accurate.

---

### Anti-Pattern B: New findings.json Field for Skill Source

**What:** Add a `skill` or `source` field to findings to record which skill generated each finding.

**Why bad:** No downstream consumer uses this field in this milestone. The 10-field schema is clean and well-documented. Adding a field for attribution adds complexity with no deliverable benefit.

**Instead:** If attribution is useful to the developer, include it in the finding's `body` field as prose: "This pattern is defined in the `api-contracts` skill."

---

### Anti-Pattern C: Installer-Side Skill Registration

**What:** Have `bin/install.js` scan for `.claude/skills/` and write a `skills.json` registry file.

**Why bad:** Skills may be added after installation. A registry becomes stale immediately after creation. Runtime discovery is always fresh.

**Instead:** Agent-side filesystem scan in Step 0.9, every time the review runs.

---

### Anti-Pattern D: Hardcoding Skill Directory Paths in Agent

**What:** List all candidate skill directories as hardcoded strings in the agent with no extensibility.

**Why bad:** New AI frameworks will add new skill directory conventions. Hardcoded lists become maintenance debt.

**Instead:** List candidates in a clearly labeled "skill search paths" section at the top of Step 0.9. Updating the list is a single-line edit in a clearly marked location.

---

## Sources

- Direct reading: `agents/pr-reviewer.md` — existing step structure, `<role>` block already mentions skills
- Direct reading: `commands/pr-review/review.md` — `allowed-tools` includes `AskUserQuestion`
- Direct reading: `bin/install.js` — RUNTIMES definitions, install() function
- Direct reading: `.claude/skills/conventional-commit/SKILL.md` — actual skill file structure on this machine
- Direct reading: `.planning/PROJECT.md` — v1.2 milestone requirements
- Confidence: HIGH — all component boundaries derived from direct codebase inspection
