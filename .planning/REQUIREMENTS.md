# Requirements: PR Review Agent

**Defined:** 2026-03-30
**Core Value:** The developer gets a complete review-to-resolution cycle without leaving their AI assistant: review a PR, see findings, fix them, and have every fix tracked on GitHub with commit links.

## v1 Requirements

Requirements for the fix/resolution milestone. Each maps to roadmap phases.

### Schema

- [x] **SCHEMA-01**: Findings JSON gains `status` field ("pending" | "resolved") defaulting to "pending"
- [x] **SCHEMA-02**: Findings JSON gains `commitHash` field (string | null) storing the fix commit SHA
- [x] **SCHEMA-03**: Findings JSON gains `commentId` field (number | null) storing the GitHub inline comment ID
- [x] **SCHEMA-04**: Existing findings.json files without new fields are handled gracefully (missing = pending/null)

### Fix Agent

- [ ] **FIX-01**: Fix agent auto-checkouts PR branch via `gh pr checkout` before applying any fixes
- [ ] **FIX-02**: Fix agent detects dirty working tree and warns user before switching branches
- [ ] **FIX-03**: Fix agent creates one commit per finding with message format `fix(review): [title]`
- [ ] **FIX-04**: Fix agent locates code by searching snippet content, not relying on line numbers
- [ ] **FIX-05**: Fix agent finds reference implementations in codebase before applying pattern-based fixes
- [ ] **FIX-06**: Fix agent pushes all commits to PR branch after all fixes are applied (single push)
- [ ] **FIX-07**: Fix agent detects fork PRs (`isCrossRepository`) and skips push with clear warning
- [ ] **FIX-08**: Fix agent updates `status` to "resolved" and stores `commitHash` in findings.json after each fix
- [ ] **FIX-09**: Fix agent supports filter flags: `--all`, `--only N`, `--severity X`, `--category X`
- [ ] **FIX-10**: Fix agent skips findings already marked as "resolved" (idempotent re-runs)

### GitHub Integration

- [ ] **GH-01**: Review agent posts findings as inline code review comments on specific diff lines via `gh api` (not `gh pr comment`)
- [ ] **GH-02**: Review agent submits all comments as a single review (batch, one API call with `comments[]` array)
- [ ] **GH-03**: Review agent stores `commentId` per finding in findings.json after posting
- [ ] **GH-04**: Fix agent replies to each inline comment thread with "Fixed in \`<commit-hash>\`" linking the commit
- [ ] **GH-05**: Fix agent handles 422 errors (line outside diff) with fallback to general PR comment

### HTML UI

- [ ] **UI-01**: Resolved findings display green "Resolved" badge
- [ ] **UI-02**: Resolved findings are visually dimmed (reduced opacity + strikethrough on title)
- [ ] **UI-03**: User can filter findings to show pending only, resolved only, or all
- [ ] **UI-04**: Resolved findings display clickable commit hash linking to the commit on GitHub
- [x] **UI-05**: Review agent auto-starts preview server and prints URL after generating findings

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Developer Experience

- **DX-01**: Dry-run/preview mode — show what fixes would be applied without changing code
- **DX-02**: Fix confidence score — agent rates how confident it is in each fix
- **DX-03**: Undo fix — revert a specific finding's commit

### Advanced GitHub

- **AGH-01**: Resolve GitHub review threads automatically after fix (mark as "resolved" on GitHub)
- **AGH-02**: Re-review after fix — run review again on only the changed files to verify fixes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-merge PRs | Human reviewer decides when to merge — safety boundary |
| GitHub App / OAuth | `gh` CLI handles auth; adding OAuth adds complexity and a dependency |
| CI/CD integration | Developer tool, not a pipeline step |
| Generic fixes without codebase context | Anti-feature: CodeRabbit/Copilot already do this poorly. Our value is project-pattern-aware fixes |
| Multi-language locale file generation | Agent suggests i18n keys, doesn't create .json translation files |
| Real-time collaboration | Single developer workflow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 1 | Complete |
| SCHEMA-02 | Phase 1 | Complete |
| SCHEMA-03 | Phase 1 | Complete |
| SCHEMA-04 | Phase 1 | Complete |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| UI-05 | Phase 2 | Complete |
| FIX-01 | Phase 3 | Pending |
| FIX-02 | Phase 3 | Pending |
| FIX-07 | Phase 3 | Pending |
| FIX-03 | Phase 4 | Pending |
| FIX-04 | Phase 4 | Pending |
| FIX-05 | Phase 4 | Pending |
| FIX-08 | Phase 4 | Pending |
| FIX-09 | Phase 4 | Pending |
| FIX-10 | Phase 4 | Pending |
| FIX-06 | Phase 5 | Pending |
| GH-04 | Phase 5 | Pending |
| GH-05 | Phase 5 | Pending |
| GH-01 | Phase 6 | Pending |
| GH-02 | Phase 6 | Pending |
| GH-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*
