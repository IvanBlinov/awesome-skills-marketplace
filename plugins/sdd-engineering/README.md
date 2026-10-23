# sdd-engineering

Spec Driven Development for Claude Code: one command takes a feature idea through a
written spec, an implementation plan, task-by-task TDD implementation, an independent
check against the spec, and a retrospective. You approve the spec and the plan; agents do
the rest.

## What is Spec Driven Development

In Spec Driven Development (SDD) the spec is the source of truth. Work moves through
fixed steps, each producing a file the next step reads:

1. **Spec** — what to build and why, as testable requirements (`FR-001`) and measurable
   success criteria (`SC-001`). No implementation details.
2. **Plan** — how to build it: exact files, interfaces and tests for each small task,
   every task traced to the requirements it covers.
3. **Implementation** — one task at a time, test first.
4. **Verification** — an independent check that every requirement is implemented and
   tested.
5. **Retro** — what to change in the process for next time.

**Use it** for features that touch several files, need decisions written down, or will be
handed between people or sessions.

**Skip it** for typo fixes, one-line bugs and quick experiments — the spec and plan cost
more than they save there.

## Install

```text
/plugin marketplace add IvanBlinov/awesome-skills-marketplace
/plugin install sdd-engineering@awesome-skills-marketplace
```

`research-tools` and `architecture-reviewer` install automatically as dependencies.
After uninstalling `sdd-engineering`, run `claude plugin prune` to remove dependencies
nothing else needs.

## Quick start

```text
/sdd-engineering:sdd-run add CSV export to the orders page
```

What happens:

1. `spec-creator` reads the code around the orders page and drafts a spec. You get up to
   five questions, one at a time, each with a recommended answer — reply with a letter or
   "yes".
2. **GATE 1:** you read `docs/specs/2026-10-22-orders-csv-export.md` and approve it (or
   say what to change).
3. `implementation-planner` writes the plan; `architecture-reviewer` reviews it.
4. **GATE 2:** you approve `docs/plans/2026-10-22-orders-csv-export.md`.
5. `implementer` builds each task with TDD and commits it. No more questions unless
   something blocks.
6. `plan-verifier` runs the full test suite and checks every requirement: **GO** or
   **NO-GO** (one automatic fix pass on NO-GO).
7. `workflow-retro` writes what to improve next time.

You end with a branch of commits, a verification report, and a list of every decision
the agents made on your behalf.

## The pipeline

```text
/sdd-engineering:sdd-run "<idea>" [--auto]
  │  main session: asks you questions, owns the gates and the ledger
  │
  ├─ 1. spec-creator ──(calls)──► research-tools:researcher
  │      writes  docs/specs/<date>-<slug>.md
  │      returns ≤ 5 questions → asked one per message → answers integrated
  │   ◆  GATE 1  you approve the spec
  │
  ├─ 2. implementation-planner ──(calls)──► architecture-reviewer:architecture-reviewer
  │      writes  docs/plans/<date>-<slug>.md
  │   ◆  GATE 2  you approve the plan
  │
  ├─ 3. implementer × each task (one at a time)
  │      commits code + tests; status recorded in docs/plans/<date>-<slug>.ledger.md
  │
  ├─ 4. plan-verifier
  │      writes  docs/verification/<date>-<slug>.md   GO | NO-GO
  │      NO-GO → one fix pass → verified again
  │
  └─ 5. workflow-retro
         writes  docs/retros/<date>-<slug>.md
```

| Step | Reads | Writes |
|---|---|---|
| Spec | your idea, the codebase, research | spec |
| Plan | spec, codebase, review | plan |
| Implement | plan, spec, ledger | code, tests, commits, ledger lines |
| Verify | spec, plan, ledger, diff, test run | verification report |
| Retro | all of the above, git log, previous retro | retro |

## Agents and skills

| Name | Kind | What it does | Use it alone |
|---|---|---|---|
| `sdd-run` | skill | Runs the pipeline, asks your questions, keeps the ledger | `/sdd-engineering:sdd-run "<idea>"` |
| `spec-creator` | agent | Drafts a testable spec from an idea; returns open questions | `@sdd-engineering:spec-creator draft a spec for …` |
| `implementation-planner` | agent | Writes a TDD plan from a spec and gets it reviewed | `@sdd-engineering:implementation-planner plan docs/specs/….md` |
| `implementer` | agent | Implements one plan task test-first and commits | `@sdd-engineering:implementer do task 3 of docs/plans/….md` |
| `plan-verifier` | agent | Runs the suite, traces requirements to code and tests, GO/NO-GO | `@sdd-engineering:plan-verifier verify docs/specs/….md against main..HEAD` |
| `workflow-retro` | skill | Evidence-based retro with concrete changes to agents, skills and checks | `/sdd-engineering:workflow-retro <slug>` |
| `test-driven-development` | skill | Red-green-refactor rules the implementer follows | loaded by agents |
| `verification-before-completion` | skill | No "done" without command output | loaded by agents |

Agents never ask you questions directly — they run as subagents and return questions to
`sdd-run`, which asks you.

## How the plugins fit together

```text
sdd-engineering ──depends on──► research-tools          (researcher, source-citation)
       └─────────depends on──► architecture-reviewer   (architecture-reviewer, architecture-review-rubric)
```

- `spec-creator` calls `research-tools:researcher` for facts about libraries, APIs and
  prior art, and follows `research-tools:source-citation`.
- `implementation-planner` sends every plan to
  `architecture-reviewer:architecture-reviewer`, applies clear fixes, and brings the rest
  to you at GATE 2.
- Both helper plugins work on their own too; see their READMEs.

## Output files and configuration

| File | Default location | Option |
|---|---|---|
| Specs | `docs/specs/<date>-<slug>.md` | `specs_dir` |
| Plans and ledgers | `docs/plans/<date>-<slug>.md`, `….ledger.md` | `plans_dir` |
| Verification reports | `docs/verification/<date>-<slug>.md` | `verification_dir` |
| Retros | `docs/retros/<date>-<slug>.md` | `retros_dir` |
| Research reports | `docs/research/…` | `research_dir` (in `research-tools`) |

Set the options when you enable the plugin, or later in `/plugin` → sdd-engineering →
Configure. Templates for every file are in this plugin's `templates/` directory.

## Auto mode, resuming and nesting

- **Auto mode:** `/sdd-engineering:sdd-run "<idea>" --auto` skips both gates and answers
  every question with its recommended option. Every such answer is recorded under
  *Assumptions* in the spec and the ledger. Use it only for small, low-risk changes.
- **Resuming:** the ledger records every finished step and task. If a run is interrupted,
  run `/sdd-engineering:sdd-run resume <slug>` (or start the same idea again) and it
  continues at the first incomplete step — finished tasks are never redone.
- **Branches:** on `main` or `master`, `sdd-run` suggests a feature branch before any
  code is written. It never merges, pushes or opens a pull request on its own.
- **Nesting:** the spec-creator and planner call their helper agents themselves (two
  levels below your session; Claude Code allows three by default). If you set
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, they skip the helpers, check facts or walk the
  review rubric themselves, and say so in their output.

## Versions

Versions follow Semantic Versioning: a major version changes output formats, file
locations or agent names; a minor version adds agents, skills or options; a patch changes
wording or fixes. Each release is tagged `sdd-engineering--v<version>`. This plugin
requires `research-tools` and `architecture-reviewer` at `^1.0.0`. See
[CHANGELOG.md](CHANGELOG.md).

## Credits

The agents, skills and templates adapt work from obra/superpowers, github/spec-kit,
gotalab/cc-sdd, mattpocock/skills and bmad-code-org/BMAD-METHOD under their MIT
licenses. Sources, commits and license texts are in [NOTICE.md](NOTICE.md).
