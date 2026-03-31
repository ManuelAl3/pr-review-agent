# Roadmap: PR Review Agent — Fix/Resolution Milestone

## Overview

This milestone extends the existing working PR review tool with a complete fix-and-close-the-loop cycle. Starting from the shared schema contract, the build proceeds layer by layer: UI first (isolated, testable with synthetic data), then git safety (checkout, dirty-tree guard, fork detection), then the commit loop (one commit per finding, SHA capture, idempotency), then external side effects (push + GitHub thread replies), and finally inline review comment posting from the review agent. Each phase is independently verifiable before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema Foundation** - Extend findings.json with status, commitHash, and commentId fields (completed 2026-03-30)
- [x] **Phase 2: UI Resolution Display** - Show resolved state in the HTML UI with badges, dimming, and filtering (completed 2026-03-31)
- [x] **Phase 3: Git Context** - Auto-checkout PR branch, guard against dirty tree and fork PRs (completed 2026-03-31)
- [ ] **Phase 4: Fix Engine** - Per-finding commit loop with SHA capture and idempotent re-runs
- [ ] **Phase 5: GitHub Bridge** - Push commits to PR branch and reply to inline comment threads
- [ ] **Phase 6: Review Agent Inline Comments** - Post findings as line-anchored GitHub review comments

## Phase Details

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
**Plans**: TBD

### Phase 5: GitHub Bridge
**Goal**: All fix commits are pushed to the PR branch and each resolved GitHub thread gets a reply linking the fixing commit
**Depends on**: Phase 4
**Requirements**: FIX-06, GH-04, GH-05
**Success Criteria** (what must be TRUE):
  1. After all fixes are applied, a single `git push` sends all commits to the PR branch and they appear on GitHub
  2. Each resolved finding whose `commentId` is set receives a reply "Fixed in `<commit-hash>`" visible in the GitHub inline comment thread
  3. When push fails (e.g., no push access), commits remain local and a clear error is shown; the failure does not prevent comment replies from being attempted
  4. When a fix agent reply would go to a line outside the diff (422 error), it falls back to posting a general PR comment instead
**Plans**: TBD

### Phase 6: Review Agent Inline Comments
**Goal**: The `--post` flag posts findings as line-anchored inline review comments in the GitHub Files Changed tab and stores the resulting commentId
**Depends on**: Phase 1
**Requirements**: GH-01, GH-02, GH-03
**Success Criteria** (what must be TRUE):
  1. Running `/pr-review:review <url> --post` creates an inline review comment on the specific diff line for each finding in the GitHub Files Changed tab (not the general Conversation tab)
  2. All findings are submitted as a single batched review (one `gh api` call with a `comments[]` array), not one call per finding
  3. The `commentId` returned by GitHub is stored in findings.json for each posted finding
  4. A finding on a line outside the current diff hunk falls back to a general PR comment rather than silently failing
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Foundation | 2/2 | Complete   | 2026-03-30 |
| 2. UI Resolution Display | 2/2 | Complete   | 2026-03-31 |
| 3. Git Context | 1/1 | Complete   | 2026-03-31 |
| 4. Fix Engine | 0/? | Not started | - |
| 5. GitHub Bridge | 0/? | Not started | - |
| 6. Review Agent Inline Comments | 0/? | Not started | - |
