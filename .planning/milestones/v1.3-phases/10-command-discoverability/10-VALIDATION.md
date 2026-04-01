---
phase: 10
slug: command-discoverability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test framework — this project has no test suite |
| **Config file** | none |
| **Quick run command** | `grep --help commands/pr-review/review.md` |
| **Full suite command** | `grep -c "\-\-help" commands/pr-review/review.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run grep verification commands
- **After every plan wave:** Run full grep suite
- **Before `/gsd:verify-work`:** All grep checks must pass
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DISC-01 | grep | `grep -c "Step 0" commands/pr-review/review.md` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | DISC-01 | grep | `grep -c "\-\-help" commands/pr-review/review.md` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | DISC-02 | grep | `grep "argument-hint" commands/pr-review/review.md \| grep "\-\-help"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — validation is grep-based on the modified file.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Help output formatting | DISC-01 | Visual alignment check | Run `/pr-review:review --help` and verify flag descriptions are aligned |
| Autocomplete tooltip | DISC-02 | Requires IDE interaction | Check Claude Code/OpenCode shows updated argument-hint in tooltip |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
