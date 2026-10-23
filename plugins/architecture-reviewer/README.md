# architecture-reviewer

A skeptical, read-only architecture reviewer and the rubric it uses. It checks designs,
implementation plans and code changes for missed requirements, failure modes,
over-engineering and simpler alternatives.

`sdd-engineering` depends on this plugin: its `implementation-planner` agent sends every
plan through the reviewer before you see it. You can also use it on its own.

## Install

```text
/plugin marketplace add IvanBlinov/awesome-skills-marketplace
/plugin install architecture-reviewer@awesome-skills-marketplace
```

## Contents

| Component | Name | What it does |
|---|---|---|
| Agent | `architecture-reviewer:architecture-reviewer` | Reviews a design, plan or commit range; returns a verdict, impact rating, findings ranked Blocker / High / Medium / Nit, ADR suggestions and "the one thing I'd change" |
| Skill | `architecture-reviewer:architecture-review-rubric` | Ten-point checklist and severity scale. Use it to self-check a design, or load it from your own agents |

## Use

```text
Use the architecture-reviewer:architecture-reviewer agent to review docs/plans/2026-10-22-payments.md against docs/specs/2026-10-22-payments.md.
```

```text
Review the architecture of the changes in main..HEAD with @architecture-reviewer:architecture-reviewer.
```

## Permissions

Read-only. The agent uses `Read`, `Grep`, `Glob` and `Bash` for inspection only
(`git diff`, `grep`, …) and never writes files; your session decides what to do with the
findings. No hooks, MCP servers or executables.

## License

MIT (see `LICENSE`). The agent and rubric are derived in part from Apache-2.0 material;
see `LICENSE-APACHE-2.0` and [NOTICE.md](NOTICE.md).

## Versions

See [CHANGELOG.md](CHANGELOG.md).
