---
phase: 11
slug: opencode-compatibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no test suite — pure distribution package) |
| **Config file** | none |
| **Quick run command** | `grep -rn "tools:\|allowed-tools\|AskUserQuestion" agents/ commands/` |
| **Full suite command** | `grep -rn "tools:\|allowed-tools\|AskUserQuestion\|runtime-compat" agents/ commands/` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep to verify tool names and compat blocks
- **After every plan wave:** Run full grep to verify all compat blocks present
- **Before `/gsd:verify-work`:** Full grep must show compat blocks in all 5 files
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | RTCOMPAT-01 | grep | `grep -c "PascalCase\|tools:" agents/*.md commands/pr-review/*.md` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | RTCOMPAT-02 | grep | `grep -c "runtime-compat" agents/*.md commands/pr-review/*.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework needed — this phase is documentation/audit only, verified by grep commands.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compat block readable inline | RTCOMPAT-02 | Readability is subjective | Open each agent/command file, verify compat block is visible after frontmatter |
| OpenCode install works | RTCOMPAT-01 | Requires OpenCode runtime | Install via `npx pr-review-agent@latest` on OpenCode, run `/pr-review:review --help` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
