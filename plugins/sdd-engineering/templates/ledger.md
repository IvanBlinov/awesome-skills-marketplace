# Ledger — <slug>

- **Spec:** `<path>`
- **Plan:** `<path>`
- **Mode:** interactive | auto
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

<!-- One line per finished task. sdd-run resumes at the first task without a line. -->

- Task 1: DONE (commit <sha>, tests: <command> → <result>)

## Rulings

<!-- Every deviation from the plan, as reported by the implementer or decided by sdd-run. -->

- Task <N>: Ruling: <what was decided> — <why> — <cost if wrong>

## Assumptions

<!-- Every question answered without the user (auto mode). -->

- <question> → <assumed answer> (<step>)

## Deferred

- <minor finding not fixed, with source>
