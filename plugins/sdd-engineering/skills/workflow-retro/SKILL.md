---
name: workflow-retro
description: Runs an evidence-based retrospective on a finished SDD run (or any piece of agent-driven work) and proposes concrete changes to the agents, skills, templates, checks and repo docs that would make the next run better. Use as the last step of an SDD run, or after any agent-driven feature when the user asks for a retro.
argument-hint: "[slug | path to ledger]"
---

# Workflow retro

You review how a piece of agent-driven work went, from the evidence it left, and propose
changes to the **environment** — the agents, skills, templates, automated checks and repo
docs — so the next run goes better. You are not reviewing the feature's code quality;
`plan-verifier` did that.

Arguments: `$ARGUMENTS`

## Inputs

Called from `sdd-engineering:sdd-run`, you get the slug and paths. Called by the user,
find them from the slug or ledger path in the arguments (or the most recent ledger in
`${user_config.plans_dir}`; if that is empty or appears literally, use `docs/plans`), and
read:

| Evidence | Use |
|---|---|
| **spec** | what was asked; how many clarifications it needed |
| **plan** | task breakdown, Review Focus, decisions |
| **ledger** | task statuses, `Ruling:` lines, assumptions, deferred items, NEEDS_CONTEXT and BLOCKED events |
| **verification report** | verdict, findings, whether a fix pass was needed |
| **git log** for the run's commit range | commit size and order, rework, reverted work |
| session logs (optional, if the user points to them) | where agents searched, stalled or repeated work |
| previous retro in `${user_config.retros_dir}` (optional) | what was promised last time |

Record any missing input under *Summary → Missing inputs*: a reader must be able to tell
"checked and fine" from "never checked".

## Working document

Create the retro from `${CLAUDE_PLUGIN_ROOT}/templates/retro.md` at
`${user_config.retros_dir}/<YYYY-MM-DD>-<slug>.md` (if that directory is empty or appears literally, use `docs/retros`)
first, and fill it as you go. If the file already exists, load it, reconcile it with the
current evidence (the evidence wins) and continue where it stopped.

## Rule: every finding has a source

Every finding names where it comes from: a ledger line, a `file:line`, a commit, a report
section, a log excerpt. A claim without a source — an invented root cause, a pattern the
evidence does not show — is not a finding: drop it.

## Categories

Look for candidates in each category. Use a category only when the evidence calls for it.

- **Agents and prompts** — did an agent misunderstand its brief, ask avoidable questions,
  return the wrong format, or need a re-dispatch? Propose the prompt change in
  `agents/<name>.md`. *Use when* the ledger shows NEEDS_CONTEXT, re-dispatches, or
  rulings that a clearer instruction would have prevented.
- **Skills and templates** — was a template section always empty, always misused, or
  missing? Did the plan format let a gap through? *Use when* the verifier found
  something the spec or plan template should have forced into the open.
- **Navigation** — how easily did agents find the right files? Would a pointer in the
  repo's docs or `CLAUDE.md` help? *Use when* finding information took many steps.
- **Automated checks** — could a linter, type check, test or CI job have caught an error
  that reached verification? Read the repo's existing check commands and CI first: a
  check that exists but is unwired or broken is the finding. A repo with no guardrail at
  all (no CI running lint/typecheck/tests) is itself a finding. *Use when* a defect was
  mechanical.
- **Coding standards** — should the verifier enforce a new rule, or an old one be
  clarified? Mechanical rules become checks; only judgement calls belong in a standards
  document. *Use when* the verifier missed a mistake or flagged a non-issue.
- **Tool economy** — expensive or repeated tool calls, oversized dispatch prompts,
  re-reading the same files. *Use when* the logs or ledger show waste.
- **Information access** — information an agent needed but could not reach (logs,
  read-only service access, docs). *Use when* an agent had to guess.

## Previous Retro Follow-through

If a previous retro exists, check each of its action items: landed or not, with the
evidence (commit, file, or its absence). An action that did not land and still matters
carries over into this retro's *Actions*.

## Actions

Turn findings into specific action items: the exact file to change and what to change
in it, with an owner. Propose; do not apply. Order by impact on the next run.

## Modes

Interactive (default): before analysing, ask the user one question — anything they want
weighed (a step that felt slow, a surprising result). Use it to focus your reading; it
never becomes a finding without a source. Present the actions at the end.

Auto (called from an `--auto` run): ask nothing; record every choice you made without
the user under *Assumptions*.

## Conventions

- **No time estimates** anywhere in the document.
- This skill **writes only the retro file**. It does not edit agents, skills, templates,
  code, the plan or the ledger — those changes are the actions it proposes.

## Finish

Report the retro's path, the number of findings by category, the top three actions, and
whether the previous retro's actions landed.

<!--
Adapted from mattpocock/skills skills/engineering/retro/SKILL.md (MIT, Copyright (c) 2026
Matt Pocock) and bmad-code-org/BMAD-METHOD skills/bmad-retrospective/workflow.md and
references/retro-document.md (MIT, Copyright (c) 2025 BMad Code, LLC). See NOTICE.md.
-->
