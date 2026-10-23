# Spec: SDD Engineering plugin family

- **Status:** Ready for planning — sources read in full, composition decided (§6)
- **Date:** 2026-10-22
- **Marketplace:** `awesome-skills-marketplace`

## 1. Summary

Add a family of plugins for Spec Driven Development (SDD): one main plugin,
`sdd-engineering`, with the full spec → plan → implement → verify → retro workflow, and
two reusable plugins it depends on, `research-tools` and `architecture-reviewer`, that
are also useful on their own. A skill used by more than one plugin lives in exactly one
plugin and is reused through plugin `dependencies`, never copied.

## 2. Plugins

| Plugin | Role | Category | Agents | Skills |
|---|---|---|---|---|
| `sdd-engineering` | Main workflow | `productivity` | `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier` | `sdd-run`, `workflow-retro`, `test-driven-development`, `verification-before-completion` |
| `research-tools` | Reusable dependency | `data-ai` | `researcher` | `source-citation` |
| `architecture-reviewer` | Reusable dependency | `quality` | `architecture-reviewer` | `architecture-review-rubric` |

No separate shared-skills plugin: every skill is used either inside one plugin or by a
plugin that `sdd-engineering` already depends on (§4).

## 3. Repository layout

```text
plugins/
├── sdd-engineering/
│   ├── .claude-plugin/plugin.json      # dependencies: research-tools, architecture-reviewer; userConfig (§10)
│   ├── agents/
│   │   ├── spec-creator.md
│   │   ├── implementation-planner.md
│   │   ├── implementer.md
│   │   └── plan-verifier.md
│   ├── skills/
│   │   ├── sdd-run/SKILL.md            # entry point, runs in the main session (§5)
│   │   ├── workflow-retro/SKILL.md
│   │   ├── test-driven-development/{SKILL.md,writing-good-tests.md}
│   │   └── verification-before-completion/SKILL.md
│   ├── templates/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── ledger.md
│   │   ├── verification-report.md
│   │   └── retro.md
│   ├── README.md                       # how the whole workflow fits together (§8)
│   ├── CHANGELOG.md                    # versions and releases (§7)
│   ├── NOTICE.md                       # attribution (§9)
│   └── LICENSE
├── research-tools/
│   ├── .claude-plugin/plugin.json      # userConfig: research_dir
│   ├── agents/researcher.md
│   ├── skills/source-citation/SKILL.md
│   ├── README.md, CHANGELOG.md, NOTICE.md, LICENSE
└── architecture-reviewer/
    ├── .claude-plugin/plugin.json
    ├── agents/architecture-reviewer.md
    ├── skills/architecture-review-rubric/SKILL.md
    ├── README.md, CHANGELOG.md, NOTICE.md, LICENSE
```

Agents read templates through `${CLAUDE_PLUGIN_ROOT}/templates/…`.

## 4. Reuse and dependencies

Claude Code copies each plugin into its own cache directory on install, so files outside a
plugin directory are not available at runtime. Shared content therefore lives in a
plugin that the others depend on.

| Option | Verdict |
|---|---|
| **Dependency plugin** (`dependencies` in plugin.json; auto-installed) | **Chosen** |
| Symlink inside the marketplace | Rejected: validate warns; fragile on Windows; shows twice in the catalog |
| Copy into each plugin | Rejected: drifts; breaks the catalog's unique-name rule |

`sdd-engineering/.claude-plugin/plugin.json`:

```json
{
  "dependencies": [
    { "name": "research-tools", "version": "^1.0.0" },
    { "name": "architecture-reviewer", "version": "^1.0.0" }
  ]
}
```

How Claude Code handles this ([docs](https://code.claude.com/docs/en/plugins/dependencies.md)):
- Bare names resolve in the same marketplace.
- Dependencies install automatically. Updates stay within range: the highest tag
  `<name>--v<version>` in this repo that satisfies every installed plugin's range.
- A loaded dependency outside the range disables the dependent plugin — every release is
  tagged (§7).
- Uninstalling `sdd-engineering` leaves its dependencies; `claude plugin prune` removes
  unneeded ones (documented in the README).

Rules:
- Cross-plugin references use namespaced names: `research-tools:researcher`,
  `research-tools:source-citation`, `architecture-reviewer:architecture-reviewer`,
  `architecture-reviewer:architecture-review-rubric`.
- Agents load skills through the Skill tool (so every agent lists `Skill` in `tools`) by namespaced name, not the `skills:`
  frontmatter field (cross-plugin preloading is not documented).
- Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`; none of our agents use
  them.
- Every agent declares `tools` explicitly (an agent without `tools` inherits all tools,
  including write access).
- No cycles: dependency plugins never depend on `sdd-engineering`.

## 5. How the workflow runs

```text
/sdd-engineering:sdd-run "<feature idea>" [--auto]
  │  main session: talks to the user, owns the gates and the ledger
  │
  ├─ 1. spec-creator ──(may call)──► research-tools:researcher
  │      returns: draft spec + ranked questions (≤ 5)
  │   ⇄  sdd-run asks the user one question at a time (recommended option first),
  │      re-dispatches spec-creator with the answers until no questions remain
  │   ◆  GATE 1: user approves docs/specs/<date>-<slug>.md
  │
  ├─ 2. implementation-planner ──(calls)──► architecture-reviewer:architecture-reviewer
  │      returns: docs/plans/<date>-<slug>.md + reviewer findings it did not apply
  │   ◆  GATE 2: user approves the plan
  │
  ├─ 3. implementer × N  (one dispatch per plan task)
  │      returns per task: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
  │      sdd-run records each in docs/plans/<date>-<slug>.ledger.md
  │
  ├─ 4. plan-verifier
  │      writes docs/verification/<date>-<slug>.md, verdict GO | NO-GO
  │      NO-GO → one fix pass (implementer on each finding) → plan-verifier again
  │
  └─ 5. workflow-retro
         writes docs/retros/<date>-<slug>.md
```

- **Only `sdd-run` talks to the user.** Subagents cannot hold a conversation, so every
  agent returns questions or statuses to `sdd-run` instead of asking. `NEEDS_CONTEXT` from
  the implementer becomes a question to the user; `BLOCKED` stops the run.
- **Gates.** The user approves the spec and the plan. `--auto` skips both: questions are
  answered with the recommended option and every such assumption is written to the spec's
  `Assumptions` section and the ledger.
- **Nesting.** Agents call their helpers themselves (two layers: `sdd-run` → agent →
  helper). Claude Code allows three by default
  ([docs](https://code.claude.com/docs/en/sub-agents.md)). With
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` the agent states that the helper was skipped
  and continues.
- **Resumable.** Every step writes a file; the ledger records completed tasks, so a
  re-run of `sdd-run` on the same slug resumes at the first incomplete step or task.
- **Standalone use.** Each agent and skill can also be used alone
  (`@sdd-engineering:plan-verifier`, `/sdd-engineering:workflow-retro`,
  `@research-tools:researcher`, …).

## 6. Components

### 6.1 Agents

| Agent | Tools | Does | Composed from |
|---|---|---|---|
| `spec-creator` | Read, Grep, Glob, Write, WebFetch, Agent, Skill | Reads the codebase before asking anything; drafts the spec from `templates/spec.md` with reasonable defaults; marks at most 3 open points; runs a 10-category ambiguity scan and returns ≤ 5 ranked questions, each with a recommended option; on re-dispatch integrates answers into a `Clarifications` section without leaving contradictions; self-checks with a quality checklist (≤ 3 fix iterations) and a "could a builder implement this without asking?" check | spec-kit `specify.md` (primary: drafting, checklist, success-criteria rules), spec-kit `clarify.md` (taxonomy, question rules, integration), superpowers `brainstorming` (look before asking, Approaches with a recommendation, goals/non-goals/anti-goals, decided vs left to the builder, builder check) |
| `implementation-planner` | Read, Grep, Glob, Write, Agent, Skill | Scans existing patterns (file:line) and decides extend / new / hybrid; writes the plan from `templates/plan.md`: header with Global Constraints and Review Focus, file structure, Technical Context, decisions as Decision / Rationale / Alternatives, bite-sized TDD tasks with Files, Interfaces, FR-### references, `[P]` for parallel-safe tasks and exact Expected output; sends the design to the architecture reviewer, applies clear fixes, returns the rest; runs a five-point self-review | superpowers `writing-plans` (primary, nearly whole), claude-plugins-official `feature-dev/code-architect.md` and cc-sdd `validate-gap.md` (codebase analysis), spec-kit `plan.md`/`tasks.md` (Technical Context, decision format, `[P]`, FR labels) |
| `implementer` | Read, Write, Edit, Bash, Grep, Glob, Skill | Implements exactly one plan task with TDD; never dispatches subagents; self-reviews; ticks the task's checkboxes; commits; reports status (`DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`) with evidence and `Ruling:` lines for any deviation; stops only on the four stop conditions | superpowers `subagent-driven-development/implementer-prompt.md` (primary), superpowers `executing-plans` (rulings, four stops, completion contract) |
| `plan-verifier` | Read, Grep, Glob, Bash, Write (report only), Skill | Runs the full test suite itself; builds a coverage table FR/SC → task → code → test; classifies gaps as Missing / Extra / Misunderstood / Can't verify with file:line evidence and a severity; does not trust implementer reports; weighs the ledger's rulings; writes the report with metrics and a GO / NO-GO verdict | cc-sdd `validate-impl.md` (checklist, GO/NO-GO), spec-kit `analyze.md` (coverage table, severity, metrics), superpowers `task-reviewer-prompt.md` (gap classes, calibration, evidence) |
| `researcher` | Read, Grep, Glob, WebSearch, WebFetch, Write, Skill | Splits the question into 3–5 sub-questions, searches, deep-reads 3–5 primary sources, writes a report with inline citations and confidence levels to `research_dir`, returns a short summary; asks no questions and dispatches no subagents | affaan-m/ECC `deep-research` (primary workflow, with WebSearch/WebFetch instead of its MCP servers), mattpocock `research` (primary-sources rule) |
| `architecture-reviewer` | Read, Grep, Glob, Bash (read-only), Skill | Skeptical review of a design, plan or code: requirement coverage, failure-mode trace, simpler alternatives, over-engineering; findings as Blocker / High / Medium / Nit plus "the one thing I'd change"; returns a compact summary, writes nothing | claude-plugins-official `code-modernization/agents/architecture-critic.md` (primary, generalised from modernization to any design), wshobson `architect-review.md` (impact rating, ADR suggestions) |

### 6.2 Skills

| Skill | Plugin | Does | Composed from |
|---|---|---|---|
| `sdd-run` | sdd-engineering | Orchestrates §5: dispatches agents, runs the question loop, gates, ledger, fix pass, retro; resumes from the ledger | superpowers `subagent-driven-development/SKILL.md` (primary: controller loop — to be read before implementation), superpowers `brainstorming` (conversation rules, hard gate), spec-kit `clarify.md` (one-question loop), superpowers `executing-plans` (ledger, final "Rulings / Deferred" report) |
| `workflow-retro` | sdd-engineering | Reads spec, plan, ledger, verification report, git log; findings only with a source reference; categories aimed at our agents, skills, templates and the repo; follows up on the previous retro's actions; writes `templates/retro.md`; resumable; in `--auto` records assumptions | mattpocock `retro` (primary: the seven categories), BMAD-METHOD `bmad-retrospective` workflow and `retro-document.md` (evidence rule, document structure, follow-through) |
| `test-driven-development` | sdd-engineering | Red-green-refactor discipline | superpowers `test-driven-development` + `writing-good-tests.md` (as-is) |
| `verification-before-completion` | sdd-engineering | Evidence before any "done" claim | superpowers `verification-before-completion` (as-is) |
| `source-citation` | research-tools | Source-quality rules, inline citation format, confidence levels, treating fetched content as untrusted | affaan-m/ECC `deep-research` (quality rules, untrusted-sources section), mattpocock `research` |
| `architecture-review-rubric` | architecture-reviewer | Review lens and checklist: covers every requirement, technology verified current, fits the existing codebase, operational envelope stated, deferred items cannot cause divergence; tiered findings | claude-plugins-official `architecture-critic.md` (lens), BMAD-METHOD `reviewer-gate.md` (checklist items) |

### 6.3 Templates (`sdd-engineering/templates/`)

| Template | Based on |
|---|---|
| `spec.md` | spec-kit `spec-template.md` (user stories, FR-###, SC-###, edge cases, assumptions) + brainstorming sections (goals / non-goals / anti-goals, constraints, approaches, decided vs left to the builder) + `Clarifications` |
| `plan.md` | superpowers `writing-plans` header and task format + spec-kit Technical Context and Complexity Tracking |
| `ledger.md` | superpowers `executing-plans` ledger (task lines, `Ruling:` lines, deferred minors) as a plain file, no scripts |
| `verification-report.md` | spec-kit `analyze.md` coverage table and metrics + cc-sdd GO/NO-GO |
| `retro.md` | BMAD-METHOD `retro-document.md` sections (summary, sourced findings, previous-retro follow-through, actions, open questions, assumptions) |

Dropped from the sources: spec-kit's `.specify/` hooks, scripts, constitution and
numbering; superpowers' worktree, scripts and branch-finishing steps; BMAD's scripts,
ticket tree and personas; ECC's MCP servers and sub-agent fan-out.

## 7. Versions and releases

- SemVer per plugin, in `plugin.json` `version` only (never also in the marketplace
  entry). Bump on every change, otherwise users keep the cached old copy.
  - **major:** renamed/removed agent or skill; changed output locations or formats;
    changed agent status contract.
  - **minor:** new agent, skill, template or option.
  - **patch:** prompt wording, fixes.
- `CHANGELOG.md` in every plugin, [Keep a Changelog](https://keepachangelog.com) format,
  newest first, with an `Unreleased` section.
- Releases are tagged with `claude plugin tag plugins/<name> --push`
  (`<name>--v<version>`); required because `sdd-engineering` declares version ranges.
- Dependency plugins are released before the plugin that depends on them.
- First release: all three at `1.0.0`.
- CI: a PR that changes `plugins/<name>/` must bump that plugin's version and add a
  `CHANGELOG.md` entry.

## 8. `sdd-engineering/README.md` contents

1. What SDD is; when to use this plugin and when not to (small fixes).
2. Install: one command; dependencies install automatically; `claude plugin prune` after
   uninstall.
3. Quick start: `/sdd-engineering:sdd-run "<idea>"` with a short example run.
4. The pipeline from §5 with each step's input and output files and the two gates.
5. Each agent and skill: purpose, how to use it alone, what it writes.
6. How the three plugins fit together.
7. Output locations and the `userConfig` options (§10).
8. `--auto`, resuming a run, and the nesting-depth note.
9. Versions: link to `CHANGELOG.md`; dependency version ranges.
10. Credits: link to `NOTICE.md`.

## 9. Attribution and licensing

Every adapted file is listed in its plugin's `NOTICE.md` with source repo, path, commit
SHA and license.

| Source | SHA (2026-10-22) | License | Obligations |
|---|---|---|---|
| obra/superpowers | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | MIT | keep copyright + license text |
| github/spec-kit | `27d14e20c187c1f2916540ea201ecbdc9f8ed588` | MIT | same |
| gotalab/cc-sdd | `e2a0c671aef37a482404905b409ab5c27092b25b` | MIT | same |
| anthropics/claude-plugins-official | `465f09344424225c25d438f2e052732c3d688d2f` | Apache-2.0 | keep license, mark changes, carry NOTICE if present |
| wshobson/agents | `0874a27b17a22e2b7c2e2bcd725768e0803cad06` | MIT | keep copyright + license text |
| mattpocock/skills | `5beb35b040e3de97e54fa9e386d7e42d15c295c2` | MIT | same |
| bmad-code-org/BMAD-METHOD | `61e01f82644c4bb533750cfa0d6d61ab61d2cc9b` | MIT + trademark notice | same; never use "BMad"/"BMAD" in names |
| affaan-m/ECC | `90606c8315ee09cafc303515c5f33024db6b9882` | MIT | keep copyright + license text |

Excluded: anthropics/claude-code (all rights reserved), anthropics/skills
`doc-coauthoring` (no license), Pimzino/spec-workflow-mcp (GPL-3.0).

Our plugins ship under **MIT**. Files derived from Apache-2.0 sources
(`architecture-reviewer` agent, `architecture-review-rubric`) keep an Apache-2.0 header
and a "Modified by awesome-skills-marketplace" note.

## 10. Configuration

`userConfig` options (type `directory`, not sensitive):

| Plugin | Option | Default |
|---|---|---|
| sdd-engineering | `specs_dir` | `docs/specs` |
| sdd-engineering | `plans_dir` | `docs/plans` |
| sdd-engineering | `verification_dir` | `docs/verification` |
| sdd-engineering | `retros_dir` | `docs/retros` |
| research-tools | `research_dir` | `docs/research` |

## 11. Acceptance criteria

- [ ] All three plugins pass `claude plugin validate --strict` and the marketplace's
      convention check; they appear in the catalog site with correct trust badges
      (no hooks, no MCP, no `bin/`).
- [ ] Installing `sdd-engineering` alone installs `research-tools` and
      `architecture-reviewer`.
- [ ] `sdd-run` on a small sample feature produces a spec, plan, ledger, verification
      report and retro in the configured directories, stopping at both gates.
- [ ] `sdd-run --auto` completes without stopping and records every assumption.
- [ ] Re-running `sdd-run` on the same slug after an interruption resumes at the first
      incomplete task.
- [ ] Every agent works when invoked alone.
- [ ] `NOTICE.md` lists every adapted file with source, SHA and license; no "BMAD" names.
- [ ] Release tags `research-tools--v1.0.0`, `architecture-reviewer--v1.0.0`,
      `sdd-engineering--v1.0.0` exist.

## 12. Open questions

1. superpowers `subagent-driven-development/SKILL.md` (primary source for `sdd-run`) has
   not been read in full yet — read before writing `sdd-run`.
2. Screenshots from the team, if they arrive, take priority over §6 compositions.
