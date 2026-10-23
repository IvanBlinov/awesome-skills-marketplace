# SDD Plugin Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three plugins — `research-tools`, `architecture-reviewer`, `sdd-engineering` — into `awesome-skills-marketplace`, composed from the sources chosen in the spec, with README, CHANGELOG, NOTICE, release tags and CI release checks.

**Architecture:** Plugins are Markdown agents/skills plus templates under `plugins/<name>/`. Behaviour of prompts cannot be unit-tested, so correctness is pinned by (a) `claude plugin validate --strict`, (b) the marketplace convention check extended with new rules, (c) a structural acceptance test over the real repo (`site/indexer/sdd-plugins.test.ts`) that asserts each component exists with the right frontmatter, tools, cross-references and attribution, and (d) an isolated install smoke test.

**Tech Stack:** Markdown + YAML frontmatter, JSON manifests, TypeScript/Vitest (checks), Claude Code CLI 2.1.307.

**Spec:** `docs/specs/2026-10-22-sdd-plugins.md`

## Global Constraints

- Plugin names: `research-tools`, `architecture-reviewer`, `sdd-engineering`; all start at version `1.0.0`; license MIT; author `Ivan Blinov`.
- Categories: `research-tools` → `data-ai`, `architecture-reviewer` → `quality`, `sdd-engineering` → `productivity`.
- `version` only in `plugin.json`, never in the marketplace entry.
- Every agent declares `tools` explicitly; agents never use `hooks`, `mcpServers`, `permissionMode`.
- Only `spec-creator` and `implementation-planner` have the `Agent` tool.
- Cross-plugin references are namespaced (`research-tools:researcher`, `architecture-reviewer:architecture-reviewer`, `research-tools:source-citation`, `architecture-reviewer:architecture-review-rubric`).
- Templates referenced as `${CLAUDE_PLUGIN_ROOT}/templates/<file>`.
- No "BMAD"/"BMad" in any name or identifier; NOTICE lists every adapted file with repo, path, SHA, license (SHAs in spec §9).
- Apache-2.0-derived files (`architecture-reviewer` agent, `architecture-review-rubric`) carry an Apache-2.0 + "Modified by awesome-skills-marketplace" note.
- Default dirs: `docs/specs`, `docs/plans`, `docs/verification`, `docs/retros`, `docs/research` (userConfig keys `specs_dir`, `plans_dir`, `verification_dir`, `retros_dir`, `research_dir`).
- Agent status contract: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`. Verifier verdict: `GO` / `NO-GO`.

## Review Focus

1. A user with nesting disabled (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`) — spec-creator/planner must continue without helper and say so. Pinned by the acceptance test asserting both agents contain the fallback instruction (Task 6).
2. `sdd-run` re-run after interruption — must resume from the ledger, not restart. Pinned by asserting the resume section and ledger template fields (Tasks 5, 8).
3. Installing `sdd-engineering` alone — dependencies must install. Pinned by the isolated install smoke test (Task 12).
4. A PR that edits a plugin without bumping its version — users would never get it. Pinned by the bump-check tests (Task 11).
5. Agent without `tools` silently getting write access — pinned by the new convention rule (Task 1).

---

## File Structure

```text
plugins/research-tools/{.claude-plugin/plugin.json, agents/researcher.md, skills/source-citation/SKILL.md, README.md, CHANGELOG.md, NOTICE.md, LICENSE}
plugins/architecture-reviewer/{.claude-plugin/plugin.json, agents/architecture-reviewer.md, skills/architecture-review-rubric/SKILL.md, README.md, CHANGELOG.md, NOTICE.md, LICENSE}
plugins/sdd-engineering/
  .claude-plugin/plugin.json
  agents/{spec-creator,implementation-planner,implementer,plan-verifier}.md
  skills/{sdd-run,workflow-retro,verification-before-completion}/SKILL.md
  skills/test-driven-development/{SKILL.md,writing-good-tests.md}
  templates/{spec,plan,ledger,verification-report,retro}.md
  README.md, CHANGELOG.md, NOTICE.md, LICENSE
plugins/marketplace-tools/CHANGELOG.md            # new rule applies to existing plugin
.claude-plugin/marketplace.json                   # three new entries
README.md                                         # plugin table
site/indexer/check.ts, check.test.ts              # new conventions
site/indexer/sdd-plugins.test.ts                  # acceptance test over the real repo
site/indexer/bump-check.ts, bump-check.test.ts    # release check
site/package.json                                 # script release:check
.github/workflows/validate.yml                    # run release check on PRs
```

---

### Task 1: New conventions — agents declare tools, plugins have CHANGELOG

**Files:** Modify `site/indexer/check.ts`, `site/indexer/check.test.ts`, fixtures under `site/indexer/__fixtures__/` (add `CHANGELOG.md` to alpha/beta/gamma, `tools:` to fixture agents); create `plugins/marketplace-tools/CHANGELOG.md`.

**Interfaces:** Produces check errors `"<agent path>: tools must be declared"` and `"<plugin dir>: CHANGELOG.md missing"`.

- [ ] **Step 1: Tests** — in `bad-repo`: an agent file without `tools` → error with its path; plugin `two` has no CHANGELOG → error. Existing count assertion updated accordingly. Good fixture still yields only the gamma plugin.json error.
- [ ] **Step 2:** `npx vitest run indexer/check.test.ts` → FAIL.
- [ ] **Step 3:** Implement; agent `tools` read from frontmatter (string or list).
- [ ] **Step 4:** Run → PASS; `npm run index:check` on the real repo → ok after adding `plugins/marketplace-tools/CHANGELOG.md` (version 0.1.0 entry). Commit `feat(check): require agent tools and plugin changelog`.

### Task 2: Acceptance test scaffold

**Files:** Create `site/indexer/sdd-plugins.test.ts`.

**Interfaces:** Produces helpers used by Tasks 3–10, all in this file:
```ts
const REPO = path.resolve(__dirname, "../..");
readFrontmatter(rel: string): Promise<Record<string, unknown>>   // gray-matter, yaml only
pluginJson(name: string): Promise<PluginManifest>
noticeLists(plugin: string, sourcePath: string): Promise<boolean> // NOTICE.md contains the source path
```
- [ ] **Step 1:** `describe.each(["research-tools","architecture-reviewer","sdd-engineering"])` — plugin.json has name, version `1.0.0`, license MIT; README, CHANGELOG (contains `## [1.0.0]`), NOTICE, LICENSE exist; marketplace entry exists with the category from Global Constraints and no `version`.
- [ ] **Step 2:** Run → FAIL (plugins missing). Commit the failing test only after Task 3 makes part of it pass (tests per plugin are enabled task by task with `describe.each` over the plugins done so far).

### Task 3: research-tools

**Files:** Create everything under `plugins/research-tools/`; add marketplace entry (tags `research`, `citations`, `web`).

**Interfaces:** Produces agent `research-tools:researcher` (tools `Read, Grep, Glob, WebSearch, WebFetch, Write`; no `Agent`), skill `research-tools:source-citation`; userConfig `research_dir` default `docs/research`.

- [ ] **Step 1: Tests** (in sdd-plugins.test.ts) — researcher frontmatter `name: researcher`, tools exactly as above; body mentions `research-tools:source-citation`, `research_dir`, "3–5 sub-questions", confidence levels, and "Do not ask the user questions"/"Do not dispatch subagents"; source-citation SKILL.md has an untrusted-content section; NOTICE lists `affaan-m/ECC skills/deep-research/SKILL.md` and `mattpocock/skills skills/engineering/research/SKILL.md` with their SHAs.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Write content composed per spec §6.1/§6.2 (ECC workflow without MCP servers or fan-out; primary-sources rule). **Step 4:** Run → PASS; `claude plugin validate plugins/research-tools --strict` → pass. Commit `feat(research-tools): researcher agent and source-citation skill`.

### Task 4: architecture-reviewer

**Files:** Create everything under `plugins/architecture-reviewer/`; marketplace entry (tags `architecture`, `review`, `design`).

**Interfaces:** Agent `architecture-reviewer:architecture-reviewer` (tools `Read, Grep, Glob, Bash`), skill `architecture-reviewer:architecture-review-rubric`.

- [ ] **Step 1: Tests** — tools exact; body says read-only / writes nothing, uses severities `Blocker`, `High`, `Medium`, `Nit` and "the one thing I'd change", loads the rubric skill by namespaced name; both files contain `Apache License, Version 2.0` and `Modified by awesome-skills-marketplace`; rubric contains the five checklist items of spec §6.2; NOTICE lists architecture-critic.md (Apache-2.0), architect-review.md, reviewer-gate.md; no `bmad` substring in names.
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(architecture-reviewer): reviewer agent and rubric skill`.

### Task 5: sdd-engineering skeleton, templates, discipline skills

**Files:** `plugins/sdd-engineering/.claude-plugin/plugin.json` (dependencies with `^1.0.0`, userConfig four dirs), `templates/*.md`, `skills/test-driven-development/{SKILL.md,writing-good-tests.md}`, `skills/verification-before-completion/SKILL.md`, LICENSE; marketplace entry (tags `sdd`, `specs`, `planning`, `tdd`, `workflow`).

**Interfaces:** Template headings consumed by agents in Tasks 6–9:
- `spec.md`: `## Intent`, `## Goals`, `## Non-goals`, `## Anti-goals`, `## User Stories`, `## Functional Requirements` (FR-###), `## Success Criteria` (SC-###), `## Edge Cases`, `## Constraints`, `## Approaches`, `## Decided / Left to the builder`, `## Assumptions`, `## Clarifications`.
- `plan.md`: header `**Goal:**`, `**Architecture:**`, `**Tech Stack:**`, `**Spec:**`, `## Global Constraints`, `## Review Focus`, `## Technical Context`, `## Decisions`, `## Complexity Tracking`, `## File Structure`, task block `### Task N:` with `**Files:**`, `**Interfaces:**`, `**Covers:** FR-…`, `[P]` marker.
- `ledger.md`: first line `# Ledger — <slug>`, sections `## Steps` (spec/plan/tasks/verify/retro status), `## Tasks` (`Task N: DONE|… (commit <sha>)`), `## Rulings`, `## Assumptions`, `## Deferred`.
- `verification-report.md`: `## Verdict` (GO/NO-GO), `## Test Run`, `## Coverage` table (Requirement | Tasks | Code | Tests | Status), `## Findings` (Missing/Extra/Misunderstood/Can't verify, severity), `## Rulings Weighed`, `## Metrics`.
- `retro.md`: frontmatter (`slug`, `date`, `mode`), `## Summary`, `## Findings` (each with `Source:`), `## Previous Retro Follow-through`, `## Actions`, `## Open Questions`, `## Assumptions`.

- [ ] **Step 1: Tests** — plugin.json dependencies equal `[{name:"research-tools",version:"^1.0.0"},{name:"architecture-reviewer",version:"^1.0.0"}]`; userConfig keys and defaults; each template contains its headings above; TDD and verification skills present and NOTICE-listed (superpowers).
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(sdd-engineering): manifest, templates and discipline skills`.

### Task 6: spec-creator and implementation-planner

**Files:** `plugins/sdd-engineering/agents/{spec-creator,implementation-planner}.md`.

**Interfaces:** Both receive from `sdd-run`: slug, output path, idea/spec path, mode (`interactive`/`auto`), answers (spec-creator re-dispatch). Return format: first line `STATUS: <status>`, then `FILE: <path>`, then `QUESTIONS:` (spec-creator, numbered, each with `Recommended:`) or `REVIEW: <unapplied findings>` (planner).

- [ ] **Step 1: Tests** — tools: spec-creator `Read, Grep, Glob, Write, WebFetch, Agent`; planner `Read, Grep, Glob, Write, Agent`. spec-creator body: `research-tools:researcher`, "at most 3" open markers, "≤ 5"/"at most 5" questions with `Recommended:`, `## Clarifications`, the nesting fallback sentence, `${CLAUDE_PLUGIN_ROOT}/templates/spec.md`, never asks the user directly. Planner body: `architecture-reviewer:architecture-reviewer`, `extend / new / hybrid`, `[P]`, `FR-`, five-point self-review, nesting fallback, `${CLAUDE_PLUGIN_ROOT}/templates/plan.md`.
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(sdd-engineering): spec-creator and implementation-planner agents`.

### Task 7: implementer and plan-verifier

**Files:** `plugins/sdd-engineering/agents/{implementer,plan-verifier}.md`.

**Interfaces:** Implementer input: plan path, task number, ledger path, mode; output first line `STATUS: DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT`, then `COMMIT:`, `TESTS:`, `RULINGS:`. Verifier input: spec, plan, ledger paths, report path; output `VERDICT: GO|NO-GO`, `FILE:`, `FINDINGS:` (numbered, severity).

- [ ] **Step 1: Tests** — implementer tools `Read, Write, Edit, Bash, Grep, Glob` (no Agent); body: four statuses, "do not dispatch subagents", `sdd-engineering:test-driven-development`, `sdd-engineering:verification-before-completion`, `Ruling:` format, four stop conditions. Verifier tools `Read, Grep, Glob, Bash, Write`; body: runs the full suite, coverage table, `Missing`/`Extra`/`Misunderstood`/`Can't verify`, "do not trust", `GO`/`NO-GO`, writes only the report.
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(sdd-engineering): implementer and plan-verifier agents`.

### Task 8: sdd-run skill

**Files:** `plugins/sdd-engineering/skills/sdd-run/SKILL.md` (composed from superpowers `subagent-driven-development/SKILL.md`, read in full first).

- [ ] **Step 1: Tests** — frontmatter `name: sdd-run`, no `context: fork`; body dispatches all four agents by namespaced name and `workflow-retro`; sections for: question loop (one question per message, recommended option), GATE 1 and GATE 2, `--auto` (assumptions recorded), ledger + resume ("first incomplete"), status handling for all four statuses, NO-GO → one fix pass → re-verify, final report listing rulings and deferred items, userConfig dirs via `${user_config.specs_dir}` etc.
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(sdd-engineering): sdd-run orchestrator skill`.

### Task 9: workflow-retro skill

**Files:** `plugins/sdd-engineering/skills/workflow-retro/SKILL.md`.

- [ ] **Step 1: Tests** — inputs listed (spec, plan, ledger, verification report, git log); "every finding needs a source" rule; the seven categories retargeted (agents, skills, templates, repo navigation, automated checks, tool economy, information access); previous-retro follow-through; uses `${CLAUDE_PLUGIN_ROOT}/templates/retro.md`; writes only the retro file; NOTICE lists mattpocock retro and the BMAD-METHOD retrospective files.
- [ ] **Step 2–4:** fail → write → pass + validate. Commit `feat(sdd-engineering): workflow-retro skill`.

### Task 10: Docs — READMEs, CHANGELOGs, NOTICEs, root README

**Files:** `plugins/*/README.md` (sdd-engineering README per spec §8 — 10 sections), `plugins/*/CHANGELOG.md`, complete `NOTICE.md`s, root `README.md` plugin table.

- [ ] **Step 1: Tests** — sdd-engineering README has the 10 headings of spec §8 and the pipeline diagram; every adapted source file named in spec §6 appears in some NOTICE with its SHA; root README lists all four plugins.
- [ ] **Step 2–4:** fail → write → pass. Full `npm run index:check`, `claude plugin validate . --strict` and per-plugin validate pass. Commit `docs: plugin READMEs, changelogs and notices`.

### Task 11: Release check in CI

**Files:** Create `site/indexer/bump-check.ts`, `site/indexer/bump-check.test.ts`; modify `site/package.json` (script `release:check`: `tsx indexer/bump-check.ts`), `.github/workflows/validate.yml` (PR-only step with `BASE_REF`).

**Interfaces:**
```ts
changedPlugins(changedFiles: string[]): string[]                       // plugin names under plugins/<name>/
bumpErrors(input: { changed: string[]; baseVersions: Record<string,string|undefined>; headVersions: Record<string,string>; changelogs: Record<string,string> }): string[]
```
Errors: `"<plugin>: version not bumped (still <v>)"`, `"<plugin>: CHANGELOG.md has no entry for <v>"`. New plugins (no base version) need only the CHANGELOG entry. CLI reads `git diff --name-only $BASE_REF...HEAD`, `git show $BASE_REF:<plugin.json>`.

- [ ] **Step 1: Tests** — unchanged plugin ignored; changed without bump → error; bumped without changelog → error; new plugin with changelog → ok; files outside plugins/ ignored.
- [ ] **Step 2–4:** fail → implement → pass. Commit `ci: require version bump and changelog for changed plugins`.

### Task 12: Install smoke test and release tags

- [ ] **Step 1:** In an isolated config dir (`CLAUDE_CONFIG_DIR=<scratch>`), `claude plugin marketplace add <repo>` then `claude plugin install sdd-engineering@awesome-skills-marketplace` → `claude plugin list` shows all three. Expected: research-tools and architecture-reviewer installed as dependencies.
- [ ] **Step 2:** Rebuild the catalog (`npm run index`), e2e still passes; the three plugins show "no hooks/MCP/bin".
- [ ] **Step 3:** `claude plugin tag plugins/<name>` (local, **no push**) for research-tools, architecture-reviewer, then sdd-engineering. Expected tags `<name>--v1.0.0`.
