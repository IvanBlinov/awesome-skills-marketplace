# Verification: <Feature name>

- **Spec:** `<path>`
- **Plan:** `<path>`
- **Ledger:** `<path>`
- **Commit range:** `<base>..<head>`
- **Date:** <YYYY-MM-DD>

## Verdict

**GO** | **NO-GO** — <one sentence why>

<!-- NO-GO when any Critical or High finding exists, the test suite fails, or a P1 story is not covered. -->

## Test Run

- **Command:** `<full suite command>`
- **Result:** <passed / failed counts, duration>
- **Failures:** <list, or "none">

## Coverage

| Requirement | Tasks | Code | Tests | Status |
|---|---|---|---|---|
| FR-001 | Task 1 | `src/x.ts:12` | `src/x.test.ts:30` | Covered / Partial / Missing |
| SC-001 | Task 3 | … | … | … |

## Findings

<!-- Each: class, severity, evidence (file:line), what the spec says, what the code does. -->

1. **[Missing | Extra | Misunderstood | Can't verify] [Critical | High | Medium | Low]** —
   <finding> — evidence: `<file:line>` — spec: <FR/SC/section>

## Rulings Weighed

- <ledger ruling> — <stands / now a finding, and why>

## Metrics

- Requirements: <N total>, covered <N>, partial <N>, missing <N>
- Plan tasks: <N>, completed <N>
- Findings: Critical <N>, High <N>, Medium <N>, Low <N>
