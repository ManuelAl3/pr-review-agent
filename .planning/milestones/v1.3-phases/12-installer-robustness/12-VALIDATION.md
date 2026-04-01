---
phase: 12
slug: installer-robustness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project has no test suite (per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `node bin/install.js --help` |
| **Full suite command** | `node bin/install.js --claude --local` (manual smoke) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/install.js --help`
- **After every plan wave:** Run `node bin/install.js --claude --local` (verify no crash)
- **Before `/gsd:verify-work`:** Manual re-install scenario
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | RTCOMPAT-03 | manual-smoke | `node bin/install.js --help` | N/A | ⬜ pending |
| 12-01-02 | 01 | 1 | RTCOMPAT-03 | manual-smoke | `node bin/install.js --claude --local` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Re-install replaces all agent/command files | RTCOMPAT-03 | No test suite in project | Run `npx . --claude --local` twice, verify no stale files |
| User data preserved after re-install | RTCOMPAT-03 | Requires dummy data setup | Create findings.json/config.json, re-install, compare contents |
| Upgrade line shown when version differs | RTCOMPAT-03 | Requires manual .version edit | Write older version to .version, re-run installer, check output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
