# Roadmap: PR Review Agent

## Milestones

- ✅ **v1.1 Fix/Resolution** - Phases 1-6 (shipped 2026-03-31)
- 🚧 **v1.2 Skill-Aware PR Review** - Phases 7-9 (in progress)

## Phases

<details>
<summary>✅ v1.1 Fix/Resolution (Phases 1-6) - SHIPPED 2026-03-31</summary>

### Phase 1: Schema Foundation
**Goal**: The findings.json contract is extended with three new fields that all downstream components depend on
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. A new findings.json file includes `status` ("pending"), `commitHash` (null), and `commentId` (null) for every finding
  2. An existing findings.json from v1.1 (without the new fields) loads without errors and behaves as if all findings are pending with null hashes/IDs
  3. The serve.js PUT endpoint accepts and persists all three new fields without dropping them
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Update schema documentation and agent prompts to 10-field contract
- [x] 01-02-PLAN.md — Add backward-compatible schema handling to HTML UI

### Phase 2: UI Resolution Display
**Goal**: Users can see fix resolution state — badges, commit links, and filtering — directly in the HTML UI
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. A finding with `status: "resolved"` displays a green "Resolved" badge and reduced opacity with strikethrough on its title
  2. A finding with a non-null `commitHash` displays a clickable chip that opens the GitHub commit URL in a new tab
  3. User can switch between "All", "Pending only", and "Resolved only" views using a toggle in the sidebar
  4. A finding with `status: "pending"` displays no badge and full opacity (unchanged from current behavior)
  5. After generating findings, the review agent auto-starts the preview server (if not already running) and prints the URL to the user
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — Add resolution display CSS/HTML/JS to index.html (badge, dimming, chip, filter)
- [x] 02-02-PLAN.md — Add auto-start preview server to review agent + test fixture
**UI hint**: yes

### Phase 3: Git Context
**Goal**: The fix agent reliably operates on the correct PR branch and cleanly aborts in unsafe conditions before touching any file
**Depends on**: Phase 1
**Requirements**: FIX-01, FIX-02, FIX-07
**Success Criteria** (what must be TRUE):
  1. Running the fix command on a PR automatically checks out the PR branch via `gh pr checkout` before any file is modified
  2. Running the fix command with a dirty working tree prints a clear warning and exits without changing any file or switching branches
  3. Running the fix command on a fork PR (cross-repository) prints a clear warning, skips push/commit/reply steps, but still applies local edits
**Plans:** 1/1 plans complete

Plans:
- [x] 03-01-PLAN.md — Add pre-flight safety gate to fix agent (checkout, dirty tree, fork detection)

### Phase 4: Fix Engine
**Goal**: Each finding that passes filters gets one traceable commit, findings.json is updated per-commit, and re-runs skip already-resolved findings
**Depends on**: Phase 3
**Requirements**: FIX-03, FIX-04, FIX-05, FIX-08, FIX-09, FIX-10
**Success Criteria** (what must be TRUE):
  1. Each fixed finding produces exactly one git commit with message `fix(review): [title]` and the commit appears in `git log`
  2. After a fix is applied, findings.json immediately shows `status: "resolved"` and the correct `commitHash` for that finding
  3. Re-running the fix command skips findings already marked `status: "resolved"` without creating duplicate commits
  4. Running `fix --severity critical` applies only critical-severity findings; `fix --only 2` applies only finding number 2; filters can be combined
  5. When a finding's snippet text is not found in the target file, the fix is skipped with a "code has changed since review" message
**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — Add filter AND logic, idempotency filter, snippet matching, and reference search to Steps 1-2
- [x] 04-02-PLAN.md — Add per-finding commit loop, SHA capture, findings.json persistence, and summary to Steps 3-4

### Phase 5: GitHub Bridge
**Goal**: All fix commits are pushed to the PR branch and each resolved GitHub thread gets a reply linking the fixing commit
**Depends on**: Phase 4
**Requirements**: FIX-06, GH-04, GH-05
**Success Criteria** (what must be TRUE):
  1. After all fixes are applied, a single `git push` sends all commits to the PR branch and they appear on GitHub
  2. Each resolved finding whose `commentId` is set receives a reply "Fixed in `<commit-hash>`" visible in the GitHub inline comment thread
  3. When push fails (e.g., no push access), commits remain local and a clear error is shown; the failure does not prevent comment replies from being attempted
  4. When a fix agent reply would go to a line outside the diff (422 error), it falls back to posting a general PR comment instead
**Plans:** 2/2 plans complete

Plans:
- [x] 05-01-PLAN.md — Add Step 5 push logic to fix agent (single git push, fork guard, error resilience)
- [x] 05-02-PLAN.md — Add Step 6 reply to inline comment threads with 422 batched fallback

### Phase 6: Review Agent Inline Comments
**Goal**: The `--post` flag posts findings as line-anchored inline review comments in the GitHub Files Changed tab and stores the resulting commentId
**Depends on**: Phase 1
**Requirements**: GH-01, GH-02, GH-03
**Success Criteria** (what must be TRUE):
  1. Running `/pr-review:review <url> --post` creates an inline review comment on the specific diff line for each finding in the GitHub Files Changed tab (not the general Conversation tab)
  2. All findings are submitted as a single batched review (one `gh api` call with a `comments[]` array), not one call per finding
  3. The `commentId` returned by GitHub is stored in findings.json for each posted finding
  4. A finding on a line outside the current diff hunk falls back to a general PR comment rather than silently failing
**Plans:** 1/1 plans complete

Plans:
- [x] 06-01-PLAN.md — Expand Step 4 with inline comment posting (hunk parsing, dedup, batch review, comment ID retrieval)

</details>

### v1.2 Skill-Aware PR Review (In Progress)

**Milestone Goal:** Let developers select which project skills inform the PR review analysis, with multi-framework support across Claude Code, OpenCode, and generic agent directories.

## Phase Checklist

- [x] **Phase 7: Skill Discovery** - Scan project skill directories, parse frontmatter, deduplicate by name (completed 2026-04-01)
- [ ] **Phase 8: Skill Selection** - Interactive prompt and --skills flag so the developer chooses which skills apply
- [ ] **Phase 9: Context Injection** - Inject selected skill content as mandatory review criteria and record used skills in config.json

## Phase Details

### Phase 7: Skill Discovery
**Goal**: The review agent silently detects all skill files in the project's skill directories before any review begins
**Depends on**: Phase 6
**Requirements**: SKILL-01, SKILL-02
**Success Criteria** (what must be TRUE):
  1. Running a review on a project with skills in `.claude/skills/`, `.opencode/skills/`, or `.agents/skills/` discovers all skill files without any manual configuration
  2. Each discovered skill is parsed for its `name` and `description` frontmatter fields; a skill file with no frontmatter is still included using the directory name as fallback
  3. Running a review on a project with no skill directories or no SKILL.md files completes normally with no skill-related output or prompts
  4. Skills appearing in multiple directories are deduplicated by `name` field; only the first occurrence (by priority order) is retained
**Plans:** 1/1 plans complete

Plans:
- [x] 07-01-PLAN.md — Add skill discovery sub-step to review agent Step 1

### Phase 8: Skill Selection
**Goal**: The developer explicitly chooses which skills apply before the review analysis runs
**Depends on**: Phase 7
**Requirements**: SEL-01, SEL-02, SEL-03
**Success Criteria** (what must be TRUE):
  1. When skills are found, a numbered list of skill names and descriptions is presented and the developer can type `all`, a comma-separated list of numbers, or `none` to control which skills are active
  2. Passing `--skills all` skips the interactive prompt and selects all discovered skills; `--skills none` skips all skills; `--skills name1,name2` selects specific skills by name
  3. When no skills are found in the project, no prompt is shown and the review continues exactly as it did before v1.2
  4. In a non-interactive environment (piped stdin / CI), the agent auto-selects all skills and logs the decision rather than hanging on a prompt
**Plans:** 1 plan

Plans:
- [ ] 08-01-PLAN.md — Add Step 1b skill selection logic to pr-reviewer.md and update review.md argument-hint

### Phase 9: Context Injection
**Goal**: Selected skill content is treated as mandatory review criteria alongside REVIEW-PLAN.md, and the skills used are recorded for traceability
**Depends on**: Phase 8
**Requirements**: CTX-01, CTX-02
**Success Criteria** (what must be TRUE):
  1. A PR review run with skills selected produces findings that enforce skill-defined patterns — violations caught by a skill rule appear in findings.json with the same schema as REVIEW-PLAN.md findings
  2. The full content of each selected skill file is injected into the review context under a clearly labeled `## Active Skills Context` block that the agent treats as mandatory criteria
  3. After the review completes, config.json includes a `skills` field listing the names of all skills that were active during that review
  4. A PR review run with no skills selected produces identical output to a pre-v1.2 review (no skills block, no `skills` field in config.json beyond an empty array)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema Foundation | v1.1 | 2/2 | Complete | 2026-03-30 |
| 2. UI Resolution Display | v1.1 | 2/2 | Complete | 2026-03-31 |
| 3. Git Context | v1.1 | 1/1 | Complete | 2026-03-31 |
| 4. Fix Engine | v1.1 | 2/2 | Complete | 2026-03-31 |
| 5. GitHub Bridge | v1.1 | 2/2 | Complete | 2026-03-31 |
| 6. Review Agent Inline Comments | v1.1 | 1/1 | Complete | 2026-03-31 |
| 7. Skill Discovery | v1.2 | 1/1 | Complete   | 2026-04-01 |
| 8. Skill Selection | v1.2 | 0/1 | Planning complete | - |
| 9. Context Injection | v1.2 | 0/? | Not started | - |
