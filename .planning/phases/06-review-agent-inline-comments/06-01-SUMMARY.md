---
phase: 06-review-agent-inline-comments
plan: 01
subsystem: review-agent
tags: [github-api, inline-comments, pr-review, gh-cli, diff-parsing]
dependency_graph:
  requires: [05-02]
  provides: [GH-01, GH-02, GH-03]
  affects: [agents/pr-reviewer.md, commands/pr-review/review.md]
tech_stack:
  added: []
  patterns: [batched-github-review, diff-hunk-parsing, dedup-commentId-capture, temp-file-json-pattern]
key_files:
  created: []
  modified:
    - agents/pr-reviewer.md
    - commands/pr-review/review.md
decisions:
  - "Temp file pattern for JSON payloads: write EXISTING_COMMENTS and review_payload.json to /tmp/ to avoid shell quoting issues on Windows (Pitfall 6 from RESEARCH.md)"
  - "--input /tmp/review_payload.json instead of --input - with stdin pipe: avoids Windows bash piping edge cases with large JSON payloads"
  - "First-match-wins for duplicate file+line commentId: when two findings share exact file+line pair, first match in GET /reviews/{id}/comments response wins (documented known limitation)"
metrics:
  duration_seconds: 115
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
---

# Phase 06 Plan 01: Inline Comment Posting Logic Summary

**One-liner:** Full Step 4 implementation in pr-reviewer.md: diff hunk parsing, dedup with commentId capture, single batched GitHub review submission, and per-comment ID retrieval via follow-up GET call.

## What Was Built

Expanded the placeholder Step 4 (`post_comments`) in `agents/pr-reviewer.md` from a 4-line placeholder into a complete 301-line implementation covering 8 sub-steps (4a through 4h). Updated `commands/pr-review/review.md` to reflect the expanded `--post` behavior.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace Step 4 placeholder with full inline comment posting logic | 9ed3f8a | agents/pr-reviewer.md |
| 2 | Update review.md command definition for --post behavior | 0a2fc17 | commands/pr-review/review.md |

## Implementation Details

### Step 4 Sub-steps (agents/pr-reviewer.md)

**4a: Guard check** — If `--post` flag absent, print skip message and exit Step 4.

**4b: Parse diff hunks** — Re-fetch full FILES_JSON (unfiltered), extract `@@ -a,b +c,d @@` ranges per file into `HUNK_RANGES` map using `node -e` inline script. New-file lines `c` through `c+d-1` (inclusive) define each hunk range.

**4c: Dedup check** — Re-fetch `EXISTING_COMMENTS` as raw JSON (not --jq filtered, to preserve `id` field). For each finding, check if `comment.path === finding.file` AND `finding.title` substring appears in `comment.body`. On match: set `commentId = dup.id` (D-10) and count as skipped (D-09). Write findings.json immediately after dedup pass.

**4d: Partition findings** — Split remaining findings (commentId === null) into `inlineFindings` (line > 0 AND falls within a hunk range) and `fallbackFindings` (line === 0 or outside all hunk ranges). Writes both to temp files.

**4e: Build review JSON** — Assembles complete review payload: severity summary line in body (D-05), fallback table if any (D-07), attribution footer (D-02). Per-comment bodies include severity emoji (critical=🔴, warning=🟡, suggestion=🔵), title, body text, snippet code block, attribution footer (D-01, D-02). Sets `event: "COMMENT"` (neutral semantics, D-04) and `side: "RIGHT"` for all inline comments. Writes to `/tmp/review_payload.json`.

**4f: Submit review** — Single `gh api --method POST --input /tmp/review_payload.json` call (GH-01, GH-02). Extracts `REVIEW_ID` from response. Error handling on non-zero exit or empty ID.

**4g: Retrieve and store commentIds** — `GET /repos/{REPO}/pulls/{PR_NUMBER}/reviews/{REVIEW_ID}/comments` (GH-03). Matches returned comments to findings by `path + line`. Updates findings.json with commentId values. Documents first-match-wins limitation for duplicate file+line pairs.

**4h: Print summary** — `"Posted: N new findings / Skipped: M (already posted)"`. If fallback findings exist: `"Fallback: F findings added to review body (lines outside diff)"`.

### Success Criteria Added (pr-reviewer.md)

Three new entries in `<success_criteria>`:
- `[ ] Inline comments posted to PR on correct diff lines (if --post flag)`
- `[ ] All findings submitted as single batched review (if --post flag)`
- `[ ] commentId stored in findings.json for each posted finding (if --post flag)`

### review.md Updates

- Process step 10: replaced "ask confirmation then post comments to PR" with detailed batched review description
- Success criteria: replaced 1 vague entry with 3 specific entries matching GH-01, GH-02, GH-03

## Locked Decisions Implemented

All 11 locked decisions (D-01 through D-11) from CONTEXT.md are implemented:

| Decision | Implementation |
|----------|----------------|
| D-01 | Severity emoji + bold severity + backtick-category + bold title + body + snippet code block |
| D-02 | `---` + `<sub>Posted by pr-review-agent</sub>` footer on each comment and review body |
| D-03 | No localhost:3847 link added |
| D-04 | `event: "COMMENT"`, single POST call |
| D-05 | `"PR Review: N findings (X critical, Y warnings, Z suggestions)"` in review body |
| D-06 | Pre-filter by hunk ranges before building payload |
| D-07 | `| Could not place inline | File | Line |` table in review body |
| D-08 | 422 risk eliminated by pre-filtering (no retry logic needed) |
| D-09 | Skip findings where existing comment matches file+title |
| D-10 | Capture existing comment `id` as `commentId` in findings.json during dedup |
| D-11 | `"Posted: N / Skipped: M"` terminal output |

## Requirements Addressed

| Req ID | Status | Implementation |
|--------|--------|----------------|
| GH-01 | Implemented | `POST /repos/{REPO}/pulls/{PR_NUMBER}/reviews` with `comments[]` containing `path`, `line`, `side: "RIGHT"`, `body` per finding |
| GH-02 | Implemented | Single `gh api --method POST --input /tmp/review_payload.json` call — all comments in one batch |
| GH-03 | Implemented | Follow-up `GET /reviews/{REVIEW_ID}/comments`, match by `path + line`, write `commentId` to findings.json |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Used temp file pattern for all JSON payloads**
- **Found during:** Task 1 (Step 4c, 4e)
- **Issue:** Plan showed inline `node -e "... '${EXISTING_COMMENTS}' ..."` which would fail with shell quoting when JSON contains single quotes
- **Fix:** Added `echo "$EXISTING_COMMENTS" > /tmp/existing_comments.json` pattern and used `--input /tmp/review_payload.json` instead of `--input -` with stdin pipe. Pitfall 6 in RESEARCH.md explicitly called this out.
- **Files modified:** agents/pr-reviewer.md
- **Commit:** 9ed3f8a

## Known Stubs

None — Step 4 is a complete implementation. All data flows are connected: findings.json → hunk parsing → dedup → partition → JSON assembly → POST review → GET commentIds → findings.json update.

## Self-Check: PASSED
