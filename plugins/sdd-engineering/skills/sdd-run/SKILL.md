---
name: sdd-run
description: Runs the full Spec Driven Development workflow for a feature - spec, plan, task-by-task TDD implementation, independent verification and a retro - by dispatching the sdd-engineering agents, asking the user the open questions and stopping for approval of the spec and the plan. Use when the user wants to build a feature the spec-driven way, or to resume an interrupted SDD run.
argument-hint: "<feature idea> [--auto] | resume <slug>"
---

# SDD run

You orchestrate a Spec Driven Development run in the main session. You talk to the user,
own the two approval gates and the ledger, and dispatch one agent per step. The agents do
the work; you never write the spec, plan or code yourself.

Arguments: `$ARGUMENTS`

```text
1. spec      sdd-engineering:spec-creator          ⇄ questions to the user   ◆ GATE 1
2. plan      sdd-engineering:implementation-planner                         ◆ GATE 2
3. tasks     sdd-engineering:implementer  × each plan task
4. verify    sdd-engineering:plan-verifier          NO-GO → one fix pass → verify again
5. retro     sdd-engineering:workflow-retro
```

## Directories

- Specs: `${user_config.specs_dir}`
- Plans and ledgers: `${user_config.plans_dir}`
- Verification reports: `${user_config.verification_dir}`
- Retros: `${user_config.retros_dir}`

If any of these appears literally as `${user_config.…}` instead of a path, use the
defaults `docs/specs`, `docs/plans`, `docs/verification`, `docs/retros`.

## Start

1. **Parse the arguments.**
   - `resume <slug>` → go to *Resume*.
   - Otherwise the text is the feature idea. `--auto` anywhere in it turns on auto mode
     (and is removed from the idea).
   - No idea given → ask the user for one in a single question, then continue.
2. **Choose the slug:** 2–5 kebab-case words from the idea; prefix with today's date for
   file names: `<YYYY-MM-DD>-<slug>`.
3. **Check for an existing ledger** at `${user_config.plans_dir}/<date>-<slug>.ledger.md`
   (or any `*-<slug>.ledger.md`). If one exists, tell the user and resume it unless they
   say to start over.
4. **Create the ledger** from `${CLAUDE_PLUGIN_ROOT}/templates/ledger.md`. Record the
   mode and today's date. Record **BASE** — `git rev-parse HEAD` — as the commit the run
   started from.
5. In a git repository, if the current branch is `main` or `master`, suggest a feature
   branch (`git switch -c sdd/<slug>`) and wait for the user's answer before any code is
   written. In auto mode, create the branch.

## Auto mode

`--auto` skips both gates and the question loop. Every question an agent returns is
answered with its **Recommended** option, and every such answer is written to the
ledger's `## Assumptions` section and passed to spec-creator so it lands in the spec's
`## Assumptions`. The user reviews the assumptions at the end. Recommend auto mode only
for small, low-risk changes.

## Step 1 — Spec

Dispatch `sdd-engineering:spec-creator` with: mode `draft`, the idea verbatim, the spec
path `${user_config.specs_dir}/<date>-<slug>.md`, and the run mode.

When it returns `QUESTIONS`:

- **Interactive:** ask them in order, **one question per message**. Show the question,
  its "why it matters" line, the options, and the **Recommended** option first. The user
  may answer with a letter, "yes"/"recommended", or a short answer; if the answer is
  ambiguous, ask once more about the same question. Stop early if the user says "done"
  or "proceed".
- **Auto:** take every Recommended option (see *Auto mode*).

Then dispatch spec-creator again with mode `integrate`, the spec path and all
question/answer pairs. Repeat until it returns `QUESTIONS: none` (spec-creator never
asks more than 5 questions per spec).

**GATE 1.** Show the user the spec path, its summary, the approaches with the
recommended one, and any `CONCERNS`. Ask them to read the spec and approve it or say
what to change. Changes go back to spec-creator (mode `integrate`, with the change
requests as answers). Do not start Step 2 until the user approves. On approval, set the
spec's status to `Approved` and mark `spec: done` in the ledger.

## Step 2 — Plan

Dispatch `sdd-engineering:implementation-planner` with the spec path, the plan path
`${user_config.plans_dir}/<date>-<slug>.md` and the run mode.

**GATE 2.** Show the plan path, the task count, the reviewer's verdict, and every
`REVIEW` finding left for the user with the planner's recommendation. Ask the user to
approve the plan or say what to change; changes go back to the planner. Mark
`plan: done` in the ledger on approval.

## Step 3 — Implement

Execute every task in plan order without checking in between tasks. The only reasons to
stop are the four stop conditions below, a gate, or all tasks done.

For each task without a `Task N:` line in the ledger:

1. Dispatch `sdd-engineering:implementer` with: plan path, task number, spec path,
   ledger path, run mode, and — only when needed — interfaces or decisions from earlier
   tasks that the plan cannot know, and your resolution of any ambiguity you noticed.
   Never paste earlier tasks' history into the prompt; the ledger holds it.
2. **Never dispatch implementers in parallel**, even for `[P]` tasks: they share one
   working tree.
3. Handle the status:
   - **DONE** — append `Task N: DONE (commit <sha>, tests: <command> → <result>)` and
     every `Ruling:` line it returned to the ledger.
   - **DONE_WITH_CONCERNS** — same, plus the concerns under `## Deferred`. If a concern
     says the work may be wrong, re-dispatch the implementer once with your guidance
     before moving on.
   - **NEEDS_CONTEXT** — interactive: ask the user its questions (one per message),
     then re-dispatch with the answers. Auto: answer from the spec and plan yourself,
     record each answer as a `Ruling:` line, re-dispatch.
   - **BLOCKED** — stop the run. Tell the user what blocked it and what the implementer
     tried; record it in the ledger. Resume when they unblock it.

Rulings, not stalls: when you resolve a conflict or ambiguity yourself, record it as
`Ruling: <what you decided> — <why> — <what it costs if wrong>`. Four things stop you and
need the user, even in auto mode: an irreversible or destructive operation; a
security-sensitive action; a side effect outside the working tree (pushing, publishing,
deploying); and a plan so broken that every path forward is a guess.

When every task has a line, mark `tasks: done`.

## Step 4 — Verify

Dispatch `sdd-engineering:plan-verifier` with the spec, plan and ledger paths, the commit
range `BASE..HEAD`, and the report path `${user_config.verification_dir}/<date>-<slug>.md`.
Record the verdict in the ledger.

- **GO** → Step 5.
- **NO-GO** → **one fix pass**: for each Critical and High finding, dispatch
  `sdd-engineering:implementer` with the finding as its task (file:line evidence, the
  FR/SC it violates, and "write a failing test that reproduces it first"). Then dispatch
  plan-verifier again with the same inputs. If the verdict is still NO-GO, do not loop:
  stop and show the user the remaining findings. Medium and Low findings go to the
  ledger's `## Deferred`.

## Step 5 — Retro

Invoke `sdd-engineering:workflow-retro` with the slug, the spec, plan, ledger and
verification report paths, the commit range, and the retro path
`${user_config.retros_dir}/<date>-<slug>.md`. Mark `retro: done`.

## Finish

Report to the user:

- what was built, the branch and the commit range;
- the verification verdict and test result;
- **Rulings I made** — every `Ruling:` line from the ledger, with its cost if wrong;
- **Deferred** — every deferred finding;
- **Assumptions** (auto mode) — every question answered without them;
- links to the spec, plan, verification report and retro.

Do not merge, push or open a pull request; offer to.

## Resume

Read the ledger for the slug. Resume at the **first incomplete** step in `## Steps`; in
Step 3, at the first task without a `Task N:` line. Commits named in the ledger exist in
git even if you do not remember making them — trust the ledger and `git log` over your
own recollection, and never redo a task that has a line. Tell the user where you are
resuming before dispatching anything.

<!--
Adapted from obra/superpowers skills/subagent-driven-development/SKILL.md,
skills/executing-plans/SKILL.md and skills/brainstorming/SKILL.md (MIT, Copyright (c) 2025
Jesse Vincent), and github/spec-kit templates/commands/clarify.md (MIT, Copyright GitHub,
Inc.). See NOTICE.md.
-->
