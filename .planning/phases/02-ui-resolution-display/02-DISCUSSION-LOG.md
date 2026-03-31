# Phase 2: UI Resolution Display - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 02-ui-resolution-display
**Areas discussed:** Resolved badge & dimming, Commit hash display, Status filter toggle, Auto-start server

---

## Resolved Badge Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Green pill badge | Same pill style as severity badges but in green. Reads "Resolved" next to the severity badge. Consistent with existing UI patterns. | :heavy_check_mark: |
| Checkmark icon overlay | A green checkmark overlaid on the card corner. More subtle, less text. | |
| Replace severity badge | Swap severity badge for green "Resolved" badge. De-emphasizes original severity. | |

**User's choice:** Green pill badge
**Notes:** Keeps severity visible alongside resolved status.

## Visual Dimming

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate dim + strikethrough | 60% opacity on whole card + strikethrough on title only. Card still readable but clearly secondary. | :heavy_check_mark: |
| Heavy dim (collapsed) | 40% opacity, collapsed card body. Click to expand. | |
| Subtle dim only | 80% opacity, no strikethrough. Almost the same but slightly faded. | |

**User's choice:** Moderate dim + strikethrough
**Notes:** Matches ROADMAP success criteria requirement for reduced opacity + strikethrough.

## Commit Hash Display

| Option | Description | Selected |
|--------|-------------|----------|
| Monospace chip | Small monospace chip showing 7-char hash next to Resolved badge. Clicks open GitHub commit URL. Same visual weight as category tag. | :heavy_check_mark: |
| Inline text link in body | "Fixed in abc1234" as blue link below title in card body. More descriptive but takes extra line. | |
| You decide | Let Claude pick based on existing UI patterns. | |

**User's choice:** Monospace chip
**Notes:** User asked for clarification about the ASCII previews — confirmed these are browser HTML UI mockups, not terminal views.

## Status Filter Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| New sidebar section | "Status" section in sidebar above Severity with All/Pending/Resolved items. Same click-to-toggle pattern. | :heavy_check_mark: |
| Header toggle buttons | Three toggle buttons in header bar next to PR title. Always visible. | |
| You decide | Let Claude pick based on sidebar layout. | |

**User's choice:** New sidebar section
**Notes:** None.

## Default Filter on Load

| Option | Description | Selected |
|--------|-------------|----------|
| All findings | Show everything by default. Nothing hidden. Safest default. | :heavy_check_mark: |
| Pending only | Show only pending by default. Focuses on unresolved work. | |
| You decide | Let Claude pick the default. | |

**User's choice:** All findings
**Notes:** None.

## Auto-start Preview Server

| Option | Description | Selected |
|--------|-------------|----------|
| Start + print URL | Run serve.js in background after writing findings, print URL. Skip if port already in use. | :heavy_check_mark: |
| Print URL only | Just print URL, user starts server manually. Simpler. | |
| You decide | Let Claude pick simplest approach for UI-05. | |

**User's choice:** Start + print URL
**Notes:** None.

---

## Claude's Discretion

- CSS class naming for resolved styles
- CSS transition/animation for dimming
- Port-in-use detection method
- Whether to add resolved/pending counts to stats grid

## Deferred Ideas

None — discussion stayed within phase scope.
