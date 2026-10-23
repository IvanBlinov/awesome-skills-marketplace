# Spec: SDD Engineering plugin family

- **Status:** Draft — waiting for source screenshots and original repo links (§10)
- **Date:** 2026-10-22
- **Marketplace:** `awesome-skills-marketplace`

## 1. Summary

Add a family of plugins for Spec Driven Development (SDD): one main plugin,
`sdd-engineering`, with the full spec → plan → implement → verify → retro workflow, and
two reusable plugins it depends on, `research-tools` and `architecture-reviewer`, that
are also useful on their own. Skills shared by more than one plugin live in one place and
are reused through plugin `dependencies`, not copied.

## 2. Plugins

| Plugin | Role | Category | Components |
|---|---|---|---|
| `sdd-engineering` | Main workflow | `productivity` | agents: `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skills: `sdd-run`, `workflow-retro` |
| `research-tools` | Reusable dependency | `data-ai` | agent: `researcher`; research skills (§6) |
| `architecture-reviewer` | Reusable dependency | `quality` | agent: `architecture-reviewer`; review skills (§6) |
| `sdd-foundations` | Reusable dependency, shared skills only | `meta` | skills shared by two or more plugins (§6) |

`sdd-foundations` exists only if §6 finds skills used by more than one plugin. If every
skill belongs to one plugin, it is dropped.

## 3. Repository layout

```text
plugins/
├── sdd-engineering/
│   ├── .claude-plugin/plugin.json      # dependencies: research-tools, architecture-reviewer, sdd-foundations
│   ├── agents/
│   │   ├── spec-creator.md
│   │   ├── implementation-planner.md
│   │   ├── implementer.md
│   │   └── plan-verifier.md
│   ├── skills/
│   │   ├── sdd-run/SKILL.md            # entry point, orchestrates the agents (§5)
│   │   └── workflow-retro/SKILL.md
│   ├── templates/                      # spec and plan templates the agents fill in
│   ├── README.md                       # how the whole workflow fits together (§8)
│   ├── CHANGELOG.md                    # versions and releases (§7)
│   ├── NOTICE.md                       # attribution for adapted content (§9)
│   └── LICENSE
├── research-tools/
│   ├── .claude-plugin/plugin.json
│   ├── agents/researcher.md
│   ├── skills/<research skills>/SKILL.md
│   ├── README.md, CHANGELOG.md, LICENSE
├── architecture-reviewer/
│   ├── .claude-plugin/plugin.json
│   ├── agents/architecture-reviewer.md
│   ├── skills/<review skills>/SKILL.md
│   ├── README.md, CHANGELOG.md, LICENSE
└── sdd-foundations/
    ├── .claude-plugin/plugin.json
    ├── skills/<shared skills>/SKILL.md
    ├── README.md, CHANGELOG.md, LICENSE
```

## 4. Reuse strategy

Claude Code copies each plugin into its own cache directory on install, so files outside a
plugin directory are not available at runtime (`../shared` does not exist after install).
Three ways to share a skill:

| Option | How | Verdict |
|---|---|---|
| **Dependency plugin** | Shared skills live in one plugin; others list it in `dependencies`. Claude Code installs it automatically. | **Chosen.** One copy, versioned, works for every install path. |
| Symlink inside the marketplace | `plugins/a/skills/x → ../../shared/skills/x`. Claude Code dereferences it on install. | Rejected: `claude plugin validate` warns on symlinks; Windows checkouts often break them; the skill appears twice in the catalog. |
| Copy the skill into each plugin | Duplicate files | Rejected: drifts, and duplicate skill names break the catalog's uniqueness rule. |

Dependency declaration in `sdd-engineering/.claude-plugin/plugin.json`:

```json
{
  "dependencies": [
    { "name": "research-tools", "version": "^1.0.0" },
    { "name": "architecture-reviewer", "version": "^1.0.0" },
    { "name": "sdd-foundations", "version": "^1.0.0" }
  ]
}
```

How Claude Code handles this ([docs](https://code.claude.com/docs/en/plugins/dependencies.md)):
- Bare names resolve in the same marketplace, so no `marketplace` field is needed.
- Dependencies install automatically with `sdd-engineering`. On update they stay within
  the declared range: Claude Code picks the highest tag `<name>--v<version>` in this repo
  that satisfies every installed plugin's range.
- If a loaded dependency's `plugin.json` version is outside the range, the dependent
  plugin is disabled. That is why every release is tagged (§7).
- Uninstalling `sdd-engineering` leaves its dependencies installed;
  `claude plugin prune` removes the ones nothing needs (README documents this).

Rules:
- Components from another plugin are referenced by their namespaced name:
  `research-tools:researcher`, `architecture-reviewer:architecture-reviewer`,
  `sdd-foundations:<skill>`. Never by short name.
- Agents use shared skills through the Skill tool by namespaced name. They do not preload
  them with the agent `skills:` frontmatter field, because preloading skills from another
  plugin is not documented.
- Plugin agents ignore the `hooks`, `mcpServers` and `permissionMode` frontmatter fields,
  so agents in these plugins don't use them. Anything that needs hooks goes in the
  plugin's `hooks/hooks.json`.
- Dependency plugins never depend back on `sdd-engineering` (no cycles).

## 5. How the workflow runs

```text
/sdd-engineering:sdd-run "<feature idea>"
   │
   ├─ 1. spec-creator            → docs/specs/<date>-<feature>.md
   │      uses research-tools:researcher for prior art / API facts
   ├─ 2. implementation-planner  → docs/plans/<date>-<feature>.md
   │      uses architecture-reviewer:architecture-reviewer on the plan's design
   ├─ 3. implementer             → code + tests, task by task, commits per task
   ├─ 4. plan-verifier           → verification report: every spec requirement and plan
   │                               task checked against the code and tests
   └─ 5. workflow-retro          → docs/retros/<date>-<feature>.md: what went well,
                                   what to change in the agents/skills next time
```

- `sdd-run` is a **skill that runs in the main session** and dispatches each agent in
  turn, passing the previous step's file to the next agent. It stays in the main session
  (no `context: fork`) because only the main session can stop and ask the user to approve
  the spec and the plan.
- Within a step, an agent dispatches its helper itself: `spec-creator` calls
  `research-tools:researcher`, `implementation-planner` calls
  `architecture-reviewer:architecture-reviewer`. Claude Code allows subagents to spawn
  subagents up to three layers below the main session by default
  ([docs](https://code.claude.com/docs/en/sub-agents.md)); this design needs two
  (`sdd-run` → `spec-creator` → `researcher`). A user who set
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` loses this; the agents then say so and
  continue without the helper, and the README documents it.
- Each step writes a file. The next step reads that file, so any step can be re-run alone,
  and the user can review/edit the spec and plan between steps.
- The user approves the spec (after step 1) and the plan (after step 2) before
  implementation starts.
- Every agent can also be invoked directly (`@sdd-engineering:plan-verifier`), outside the
  full run.

## 6. Shared skills

To be filled from the screenshots (§10). Placement rule:

| Used by | Lives in |
|---|---|
| Only `sdd-engineering` | `sdd-engineering/skills/` |
| Only `research-tools` or only `architecture-reviewer` | that plugin |
| Two or more plugins | `sdd-foundations/skills/` |

Likely candidates (confirm against the screenshots): spec and plan templates/conventions,
test-driven development, verification-before-completion, source citation rules for
research, an architecture review rubric.

## 7. Versions and releases

- SemVer per plugin, in `plugin.json` `version` only (never also in the marketplace
  entry). Bump on every change; otherwise users stay on the cached old copy.
  - **major:** renamed/removed agent or skill, changed output file locations or formats.
  - **minor:** new agent, skill or option.
  - **patch:** prompt wording, fixes.
- `CHANGELOG.md` in every plugin, [Keep a Changelog](https://keepachangelog.com) format,
  newest first, with an `Unreleased` section.
- Releases are tagged with `claude plugin tag plugins/<name> --push`
  (tag `<name>--v<version>`). Tags are required because `sdd-engineering` declares
  version ranges on its dependencies.
- Dependency plugins are released before the plugin that depends on them.
- CI addition: a PR that changes files under `plugins/<name>/` must bump that plugin's
  `version` and add a `CHANGELOG.md` entry.

## 8. `sdd-engineering/README.md` contents

1. What SDD is and when to use this plugin (and when not to: small fixes).
2. Install: one command; dependencies install automatically.
3. Quick start: `/sdd-engineering:sdd-run "<idea>"`, with a short example run.
4. The pipeline diagram from §5, with each step's input and output files.
5. Each agent and skill: purpose, how to call it alone, what it writes.
6. How the plugins fit together: `research-tools`, `architecture-reviewer`,
   `sdd-foundations` and which step uses which.
7. Where the output files go and how to change it.
8. Customization: editing templates, skipping steps.
9. Versions: link to `CHANGELOG.md`, compatibility of dependency versions.
10. Credits: link to `NOTICE.md`.

## 9. Attribution and licensing

Content adapted from other repositories keeps its license obligations:
- Each plugin's `NOTICE.md` lists source repo, commit SHA, file, and license for every
  adapted agent/skill.
- Only sources with licenses that allow redistribution (MIT, Apache-2.0, …) are used;
  Apache-2.0 sources keep their NOTICE text.
- Plugin `license` matches what the sources permit.

## 10. Decisions (defaults — change any of them)

1. **`workflow-retro`** runs as the last step of every `sdd-run`, and can also be run alone
   (`/sdd-engineering:workflow-retro`) after any piece of work.
2. **Output locations** default to `docs/specs`, `docs/plans`, `docs/verification`,
   `docs/retros`, configurable through `userConfig` options `specs_dir`, `plans_dir`,
   `verification_dir`, `retros_dir` (type `directory`, not sensitive).
3. **Approval gates** stay on: the user approves the spec and the plan. `sdd-run --auto`
   skips both gates for small, low-risk changes; the README warns against it for anything
   larger.

## 11. Open questions

1. **Screenshots and source repos** — needed for the exact content of each agent and
   skill, the shared skills list (§6), and attribution (§9). Nothing in §2–§6 that names
   a component's behaviour is final until these arrive.
