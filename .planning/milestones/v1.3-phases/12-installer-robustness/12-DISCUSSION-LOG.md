# Phase 12: Installer Robustness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 12-installer-robustness
**Areas discussed:** Cleanup strategy, User data preservation, Failure handling, Install feedback

---

## Cleanup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Wipe-and-replace | Delete commands/pr-review/ and agents/pr-*.md entirely before copying fresh. Simple, reliable, guaranteed no stale files. | ✓ |
| Manifest-based | Write a .manifest file listing installed files. On re-install, diff old vs new, delete stale. More surgical but adds complexity. | |

**User's choice:** Wipe-and-replace
**Notes:** Simple and reliable approach preferred over more complex manifest tracking

---

## User Data Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Selective overwrite | Only overwrite known runtime files (index.html, serve.js, .gitignore, templates/, .version). Leave everything else untouched. | ✓ |
| Backup and restore | Save user files to temp, wipe pr-review/, copy fresh, restore. Clean slate but more moving parts. | |

**User's choice:** Selective overwrite
**Notes:** User data survives because installer never touches it -- only overwrites known runtime files

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail fast with message | Let error propagate with clear message. Existing try/catch handles this. Worst case user re-runs installer. | ✓ |
| Atomic with rollback | Copy to temp first, verify, then swap. Original files stay on failure. Significantly more complex. | |

**User's choice:** Fail fast with message
**Notes:** Pragmatic approach -- the existing error handler is sufficient

---

## Install Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal upgrade note | If .version exists, show one line "Upgrading from vX -> vY" before normal output. No per-file listing. | ✓ |
| Verbose cleanup log | List every stale file removed and every file replaced. Useful for debugging but noisy. | |

**User's choice:** Minimal upgrade note
**Notes:** Keep output clean and minimal

---

## Claude's Discretion

- Exact ordering of wipe vs copy operations
- Whether to extract runtime-file list into a constant
- How to handle agents/ directory with non-pr-review files

## Deferred Ideas

None
