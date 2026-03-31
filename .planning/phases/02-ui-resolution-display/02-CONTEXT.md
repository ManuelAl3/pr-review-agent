# Phase 2: UI Resolution Display - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Show resolved state in the HTML UI with badges, dimming, and filtering. Users can see which findings have been fixed, click through to the fixing commit on GitHub, and filter between pending and resolved findings. Also auto-start the preview server after review.

</domain>

<decisions>
## Implementation Decisions

### Resolved badge styling
- **D-01:** Green pill badge reading "Resolved", same style as existing severity badges (critical/warning/suggestion). Placed next to the severity badge in the card header row. Uses the existing `--accent-green` color variable.
- **D-02:** Severity badge remains visible alongside the Resolved badge — it is NOT replaced.

### Visual dimming
- **D-03:** Resolved findings display at 60% opacity on the entire card.
- **D-04:** Resolved finding titles get a strikethrough (`text-decoration: line-through`).
- **D-05:** Pending findings remain at full opacity with no visual changes (unchanged from current behavior).

### Commit hash display
- **D-06:** Non-null `commitHash` renders as a small monospace chip (7-char short hash) in the card header, next to the Resolved badge. Styled like the existing category tag but with monospace font.
- **D-07:** Clicking the commit chip opens `https://github.com/{owner}/{repo}/commit/{hash}` in a new tab. The owner/repo comes from `config.json` PR metadata.
- **D-08:** If `commitHash` is null, no chip is shown (even if status is resolved).

### Status filter
- **D-09:** New "Status" section in the sidebar, placed above the existing Severity section. Contains three filter items: All, Pending, Resolved — using the same click-to-toggle pattern as severity/category filters.
- **D-10:** Default filter on load is "All" — no findings are hidden by default.
- **D-11:** Status filter integrates with existing `activeFilters` object, adding a `status` key alongside `severity`, `category`, and `file`.

### Auto-start preview server
- **D-12:** After the review agent writes `findings.json` and `config.json`, it starts `serve.js` in background via `node serve.js &` (or equivalent) and prints "Preview: http://localhost:3847" to the user.
- **D-13:** If the port is already in use (server already running), skip starting a new process and just print the URL.

### Claude's Discretion
- CSS class naming for new resolved styles
- Exact CSS transition/animation for dimming effect
- How to detect port-in-use (e.g., try-catch on listen, or check with a quick fetch)
- Whether to add resolved/pending counts to the stats grid at the top of the sidebar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI implementation
- `template/index.html` — Self-contained HTML UI: existing badge system (lines 96-99), filter system (lines 398, 790-792, 961), card rendering, sidebar layout
- `template/serve.js` — HTTP server that serves the UI and persists findings via PUT API

### Schema contract
- `CLAUDE.md` — Findings schema section defining all 10 fields including `status`, `commitHash`, `commentId`

### Agent that triggers auto-start
- `agents/pr-reviewer.md` — Review agent execution flow; needs modification to auto-start server after writing findings

### Requirements
- `.planning/REQUIREMENTS.md` — UI-01 through UI-05 requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Severity badge CSS pattern (`.severity-badge`, `.severity-critical/warning/suggestion`) — reuse for resolved badge with green variant
- Category tag CSS (`.category-tag`) — reuse pattern for commit hash chip with monospace font
- `activeFilters` object and `toggleFilter()` function — extend with `status` key
- CSS variables: `--accent-green`, `--badge-*` pattern for consistent theming

### Established Patterns
- Badge styling: pill shape with rgba background, colored text, 1px colored border, 20px border-radius
- Filter sidebar: sections with `.sidebar-section` containing `.filter-item` elements with click handlers
- Card rendering in `render()` function builds HTML string with template literals
- Silent defaults applied at load time: `status: 'pending'`, `commitHash: null`, `commentId: null` (lines 697-699, 1010-1012)

### Integration Points
- `render()` function — add resolved badge, dimming class, and commit chip to card HTML generation
- `activeFilters` object initialization (line 398) — add `status: null`
- Filter rendering in sidebar — add new Status section before Severity
- `toggleFilter()` function (line 961) — already generic, should work with new `status` key
- Filter logic (lines 790-792) — add status filter condition
- `pr-reviewer.md` execution flow — add server auto-start step after findings generation

</code_context>

<specifics>
## Specific Ideas

- Badge should feel like GitHub's existing UI patterns — green pill for resolved, monospace chip for commit hash
- Dimming should make resolved findings clearly secondary but still readable (60% opacity, not hidden)
- Filter interaction should be identical to existing severity/category filters — click to toggle, click again to clear

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-ui-resolution-display*
*Context gathered: 2026-03-30*
