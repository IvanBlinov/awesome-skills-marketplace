# <Feature name> Implementation Plan

**Goal:** <One sentence describing what this builds>

**Architecture:** <2–3 sentences about the approach>

**Tech Stack:** <Key technologies and libraries, with versions>

**Spec:** `<path to the spec>`

## Global Constraints

<!-- Project-wide requirements from the spec, one line each, exact values copied verbatim.
Every task implicitly includes this section. -->

- <constraint>

## Review Focus

<!-- Up to five inputs or failure modes the spec implies but no task's tests exercise, most
likely to bite first. Each line names the task that adds a test for it. -->

1. <input or condition> — <expected behaviour> — pinned in Task <N>

## Technical Context

- **Language/version:** <…>
- **Primary dependencies:** <…>
- **Storage:** <… or N/A>
- **Testing:** <framework and command>
- **Target platform:** <…>
- **Performance goals / constraints:** <… or N/A>
- **Existing patterns to follow:** <file:line references>
- **Codebase fit:** extend / new / hybrid — <why>

## Decisions

| Decision | Rationale | Alternatives considered |
|---|---|---|
| <…> | <…> | <…> |

## Complexity Tracking

<!-- Only when the plan adds complexity the spec did not ask for. -->

| Added complexity | Why needed | Simpler alternative rejected because |
|---|---|---|

## File Structure

<!-- Every file created or modified, and its single responsibility. -->

```text
<path>   # <responsibility>
```

---

### Task 1: <Component name> [P]

<!-- [P] = can run in parallel with other [P] tasks (different files, no shared interfaces). -->

**Files:**
- Create: `<exact/path>`
- Modify: `<exact/path>:<lines>`
- Test: `<exact/path>`

**Covers:** FR-001, SC-001

**Interfaces:**
- Consumes: <what this task uses from earlier tasks — exact signatures>
- Produces: <what later tasks rely on — exact names, parameters, return types>

- [ ] **Step 1: Write the failing test** — `<test name>` asserting <exact values>
- [ ] **Step 2: Run it and watch it fail** — Run: `<command>` — Expected: FAIL with "<message>"
- [ ] **Step 3: Implement** `<signature>` in `<file>`
- [ ] **Step 4: Run it and watch it pass** — Run: `<command>` — Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "<type>: <message>"`
