---
phase: 01-schema-foundation
plan: "01"
subsystem: schema
tags: [schema, documentation, findings, backward-compatibility]
dependency_graph:
  requires: []
  provides: [10-field-findings-schema]
  affects: [pr-reviewer, pr-fixer, CLAUDE.md]
tech_stack:
  added: []
  patterns: [nullish-coalescing-defaults, silent-backward-compat]
key_files:
  created: []
  modified:
    - CLAUDE.md
    - agents/pr-reviewer.md
    - agents/pr-fixer.md
decisions:
  - "Single schema block in CLAUDE.md (no v1.1/v1.2 split sections)"
  - "Silent defaults over validation errors for backward compatibility"
  - "Nullish coalescing pattern for safe field access in pr-fixer"
metrics:
  duration: "2 minutes"
  completed: "2026-03-30"
  tasks_completed: 3
  files_modified: 3
---

# Phase 01 Plan 01: Schema Foundation — 10-Field Contract Summary

Established the 10-field findings schema as the single source of truth across CLAUDE.md and both agent files. Downstream phases (UI, fix engine, GitHub bridge) can now build against a consistent contract with documented backward compatibility.

## What Was Built

Extended the findings schema from 7 to 10 fields by adding `status`, `commitHash`, and `commentId` tracking fields. Updated all documentation and agent prompts to reflect the new contract.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update CLAUDE.md schema documentation to 10 fields | f4aac12 | CLAUDE.md |
| 2 | Update pr-reviewer.md to output 10-field findings | e25780b | agents/pr-reviewer.md |
| 3 | Update pr-fixer.md for defensive field reading | 7620edb | agents/pr-fixer.md |

## Changes Made

**CLAUDE.md:**
- Changed "exactly 7 required fields" to "exactly 10 required fields"
- Added `status`, `commitHash`, `commentId` to the JSON example block with inline defaults
- Added silent defaults documentation for backward-compatible consumers
- Updated Key Abstractions from "7-field JSON structure" to "10-field JSON structure"
- Updated Cross-Cutting Concerns validation reference from 7 to 10 fields

**agents/pr-reviewer.md:**
- Changed "all 7 fields" to "all 10 fields" in Step 3a
- Added `status`, `commitHash`, `commentId` to the required field enumeration
- Added instruction to set `status: "pending"`, `commitHash: null`, `commentId: null` for new findings

**agents/pr-fixer.md:**
- Added backward compatibility paragraph in Step 1 with nullish coalescing pattern
- Added new constraint: "NEVER assume findings have `status`, `commitHash`, or `commentId` fields"
- All original constraints preserved unchanged

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Updated stale field count references in Key Abstractions and Cross-Cutting Concerns sections**

- **Found during:** Task 1
- **Issue:** CLAUDE.md had two additional references to "7-field schema" in the Architecture and Key Abstractions sections that were not part of the plan spec but would create contradictions with the updated Findings Schema section
- **Fix:** Updated both references to "10-field" for internal consistency
- **Files modified:** CLAUDE.md
- **Commit:** f4aac12

## Known Stubs

None — all schema fields are documented with defaults. No UI rendering or data wiring involved in this plan (that is Phase 3).

## Self-Check: PASSED

- [x] CLAUDE.md contains "exactly 10 required fields" — verified
- [x] CLAUDE.md contains `status`, `commitHash`, `commentId` fields with defaults — verified
- [x] CLAUDE.md contains "silent defaults" — verified
- [x] CLAUDE.md contains "persists all 10 fields" — verified
- [x] No "7 fields" references remain in CLAUDE.md or pr-reviewer.md — verified
- [x] pr-reviewer.md contains "all 10 fields" — verified
- [x] pr-reviewer.md contains `status: "pending"` default — verified
- [x] pr-fixer.md contains `finding.status ?? 'pending'` — verified
- [x] pr-fixer.md contains "NEVER assume findings have" constraint — verified
- [x] All three task commits exist: f4aac12, e25780b, 7620edb — verified
