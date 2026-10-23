# Ledger — <slug>

- **Spec:** `<path>`
- **Plan:** `<path>`
- **Mode:** interactive | auto
- **Branch:** <branch name>
- **Base:** <commit sha the run started from — the verifier diffs Base..HEAD>
- **Started:** <YYYY-MM-DD>

## Steps

<!-- One line per pipeline step; sdd-run resumes at the first step not marked done. -->

- spec: pending | done (`<path>`, approved <date>)
- plan: pending | done (`<path>`, approved <date>)
- tasks: pending | in progress | done
- verify: pending | GO | NO-GO (`<report path>`)
- fix pass: not needed | done
- retro: pending | done (`<path>`)

## Tasks

<!-- Only finished tasks get a line here, with status DONE or DONE_WITH_CONCERNS.
sdd-run resumes at the first task without one. Fix-pass work is recorded as Fix lines. -->

- Task 1: DONE (commit <sha>, tests: <command> → <result>)
- Fix <N>: DONE (finding <n>, commit <sha>, tests: <command> → <result>)

## Blocked

<!-- Tasks that returned BLOCKED, with what blocked them. A blocked task has no line under
## Tasks, so resume retries it once the blocker is cleared. -->

- Task <N> (<YYYY-MM-DD>): <what blocked it, what the implementer tried>

## Rulings

<!-- Every deviation from the plan, as reported by the implementer or decided by sdd-run. -->

- Ruling (Task <N>): <what was decided> — <why> — <cost if wrong>

## Assumptions

<!-- Every question answered without the user (auto mode). -->

- <question> → <assumed answer> (<step>)

## Deferred

- <minor finding not fixed, with source>
