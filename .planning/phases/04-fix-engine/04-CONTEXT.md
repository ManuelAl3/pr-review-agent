# Phase 4: Fix Engine - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Per-finding commit loop with SHA capture and idempotent re-runs. Each finding that passes filters gets one traceable commit, findings.json is updated per-fix, and re-runs skip already-resolved findings. Push and GitHub replies belong in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Commit contents
- **D-01:** Each commit contains ONLY the fixed source file(s). findings.json is updated in the working tree but NOT included in any commit — it stays as a runtime artifact.
- **D-02:** Commit message format: `fix(review): [title]` where `[title]` is the finding's title field.

### Snippet matching strategy
- **D-03:** Extract the "current" side of the snippet (left of `→`), search the target file for that exact text.
- **D-04:** If exact match not found, retry with whitespace-normalized matching (trimmed, collapsed spaces).
- **D-05:** If still not found, skip the finding with message: `⊘ Skipped: [title] — code has changed since review`.

### Failure behavior
- **D-06:** On fix failure (snippet not found, edit conflict, file missing), log the skip reason and continue to the next finding. Never halt the run.
- **D-07:** Summary at the end shows all skipped findings with reasons. Developer can re-run with `--only N` for specific retries.

### Idempotency
- **D-08:** Findings with `status: "resolved"` are excluded before the fix loop starts. They never enter the processing pipeline.
- **D-09:** If all targeted findings are already resolved, print: `Nothing to fix — all findings already resolved.`
- **D-10:** Skip is silent — no per-finding "already resolved" log line during normal operation.

### Multi-finding file ordering
- **D-11:** One commit per finding, even when multiple findings target the same file. The 1:1 finding-to-commit invariant is never broken.
- **D-12:** When multiple findings target the same file, fix in reverse line order (bottom-up) to preserve line number accuracy for subsequent fixes.

### Filter combination logic
- **D-13:** Multiple filters combine with AND logic: `--severity critical --category security` = only findings that are BOTH critical AND in security category.
- **D-14:** `--only N` overrides all other filters — it selects finding #N exclusively (1-based index).
- **D-15:** No flags = same as `--all` (fix everything pending).

### Fork PR commit behavior
- **D-16:** For fork PRs (`$IS_FORK=true`), apply edits AND update findings.json locally (`status: "resolved"`, `commitHash: null`), but create NO git commits.
- **D-17:** UI shows "Resolved" badge for fork-fixed findings (no commit chip since hash is null).

### Reference implementation search
- **D-18:** Before applying a pattern-based fix, search for 1-2 reference files matching the fix category (e.g., a component using `t()` for i18n fixes) in the same directory or nearby.
- **D-19:** If a reference is found, replicate its pattern in the target file. If no reference found, apply the fix based on snippet guidance alone.
- **D-20:** No exhaustive codebase scan — targeted search only (same directory, then parent directory).

### Claude's Discretion
- Exact implementation of whitespace normalization for snippet matching
- How to stage files for git commit (git add specific file vs pattern)
- How to capture commit SHA after `git commit` (parse output vs `git rev-parse HEAD`)
- findings.json write strategy (after each fix vs batch at end — as long as idempotency is preserved)
- Reference search depth when category doesn't have an obvious pattern to grep for

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fix agent (primary target)
- `agents/pr-fixer.md` — Fix agent execution flow; Steps 1-4 need modification for commit loop, SHA capture, idempotency, and snippet matching
- `commands/pr-review/fix.md` — Fix command definition with filter flag spec

### Schema and findings contract
- `CLAUDE.md` — Findings schema (10-field), snippet `→` separator convention
- `template/serve.js` — PUT `/api/save/findings` endpoint for findings.json persistence

### Prior phase artifacts
- `.planning/phases/03-git-context/03-CONTEXT.md` — Pre-flight gate decisions (D-01 through D-10), IS_FORK convention
- `.planning/phases/01-schema-foundation/01-CONTEXT.md` — Silent defaults pattern, backward compat strategy

### Requirements
- `.planning/REQUIREMENTS.md` — FIX-03 (one commit per finding), FIX-04 (snippet-based location), FIX-05 (reference implementations), FIX-08 (status + commitHash update), FIX-09 (filter flags), FIX-10 (skip resolved)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pr-fixer.md` Step 0 (pre-flight gate) already handles checkout, dirty tree, fork detection — Phase 4 builds on top
- `pr-fixer.md` Step 1 already parses filter flags (`--all`, `--only N`, `--severity X`, `--category X`) and applies backward-compat defaults
- `pr-fixer.md` Step 2 already reads target files and locates issues using snippet + line fields
- `pr-fixer.md` Step 3 already applies fixes with Edit/Write tools and prints per-finding results
- `config.json` already contains PR metadata (pr.number, pr.url, pr.repo) from review agent

### Established Patterns
- Agent steps follow numbered `<step>` elements with `name` and `priority` attributes
- Error reporting uses terse CLI-style messages (Phase 3, D-09/D-10)
- Bash commands in agents use cross-platform patterns (`node -e` for detection, Phase 2 convention)
- Bottom-up fix order already specified in constraints section of pr-fixer.md

### Integration Points
- `pr-fixer.md` Step 3 (apply_fixes) — add git commit after each successful fix
- `pr-fixer.md` Step 3 after-fix output — capture SHA, update findings.json in working tree
- `pr-fixer.md` constraints section — update "NEVER commit" to "one commit per finding when not fork"
- `pr-fixer.md` Step 1 — add resolved-finding filtering before fix loop
- `fix.md` success_criteria — add commit and idempotency criteria

</code_context>

<specifics>
## Specific Ideas

- Commit history should read like a clean audit trail — one commit per finding, each clearly titled
- findings.json update is a local side-effect, not part of the git history — keeps source commits clean
- Fork PR users still get the full resolution tracking experience in the UI, just without commit links

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-fix-engine*
*Context gathered: 2026-03-30*
