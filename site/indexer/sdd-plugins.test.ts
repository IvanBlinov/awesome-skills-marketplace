/**
 * Structural acceptance tests for the SDD plugin family (spec docs/specs/2026-10-22-sdd-plugins.md).
 * Prompt behaviour cannot be unit-tested; these pin the contracts other components rely on.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import type { MarketplaceFile, PluginManifest } from "./types";

const REPO = path.resolve(__dirname, "../..");
const SHA = {
  superpowers: "2ce8aa15d05bd57213e6f746f953aafb7ded7a8b",
  specKit: "27d14e20c187c1f2916540ea201ecbdc9f8ed588",
  ccSdd: "e2a0c671aef37a482404905b409ab5c27092b25b",
  pluginsOfficial: "465f09344424225c25d438f2e052732c3d688d2f",
  wshobson: "0874a27b17a22e2b7c2e2bcd725768e0803cad06",
  mattpocock: "5beb35b040e3de97e54fa9e386d7e42d15c295c2",
  bmad: "61e01f82644c4bb533750cfa0d6d61ab61d2cc9b",
  ecc: "90606c8315ee09cafc303515c5f33024db6b9882",
};

const CATEGORY: Record<string, string> = {
  "research-tools": "data-ai",
  "architecture-reviewer": "quality",
  "sdd-engineering": "productivity",
};

/** Plugins implemented so far; later tasks append. */
const PLUGINS = ["research-tools", "architecture-reviewer"];

const read = (rel: string) => readFile(path.join(REPO, rel), "utf8");
const body = async (rel: string) => matter(await read(rel)).content;

async function readFrontmatter(rel: string): Promise<Record<string, unknown>> {
  return matter(await read(rel)).data;
}

async function pluginJson(name: string): Promise<PluginManifest> {
  return JSON.parse(await read(`plugins/${name}/.claude-plugin/plugin.json`)) as PluginManifest;
}

async function tools(rel: string): Promise<string[]> {
  const t = (await readFrontmatter(rel)).tools;
  const list = Array.isArray(t) ? t : String(t ?? "").split(",");
  return list.map((x) => String(x).trim()).filter(Boolean).sort();
}

/** NOTICE.md of `plugin` mentions the source file and the repo's pinned SHA. */
async function noticeLists(plugin: string, repo: string, sourcePath: string, sha: string): Promise<boolean> {
  const notice = await read(`plugins/${plugin}/NOTICE.md`);
  return notice.includes(repo) && notice.includes(sourcePath) && notice.includes(sha);
}

describe.each(PLUGINS)("plugin %s", (name) => {
  it("has a complete manifest", async () => {
    const m = await pluginJson(name);
    expect(m).toMatchObject({ name, version: "1.0.0", license: "MIT", author: { name: "Ivan Blinov" } });
    expect(m.description?.length).toBeGreaterThan(20);
  });

  it("ships README, CHANGELOG, NOTICE and LICENSE", async () => {
    for (const f of ["README.md", "NOTICE.md", "LICENSE"]) {
      expect(existsSync(path.join(REPO, "plugins", name, f)), f).toBe(true);
    }
    expect(await read(`plugins/${name}/CHANGELOG.md`)).toContain("## [1.0.0]");
  });

  it("is listed in the marketplace without a version", async () => {
    const mp = JSON.parse(await read(".claude-plugin/marketplace.json")) as MarketplaceFile;
    const entry = mp.plugins.find((p) => p.name === name);
    expect(entry).toMatchObject({ source: `./plugins/${name}`, category: CATEGORY[name] });
    expect(entry?.version).toBeUndefined();
  });

  it("never uses the BMAD trademark in names", async () => {
    const mp = await read(".claude-plugin/marketplace.json");
    expect(mp.toLowerCase()).not.toMatch(/bmad/);
    expect((await read(`plugins/${name}/.claude-plugin/plugin.json`)).toLowerCase()).not.toMatch(/bmad/);
  });
});

describe("research-tools", () => {
  const agent = "plugins/research-tools/agents/researcher.md";
  const skill = "plugins/research-tools/skills/source-citation/SKILL.md";

  it("researcher has read/search/write tools but cannot dispatch agents", async () => {
    expect((await readFrontmatter(agent)).name).toBe("researcher");
    expect(await tools(agent)).toEqual(["Glob", "Grep", "Read", "WebFetch", "WebSearch", "Write"]);
  });

  it("researcher follows the research workflow", async () => {
    const b = await body(agent);
    for (const s of ["research-tools:source-citation", "research_dir", "3–5 sub-questions", "Confidence"]) {
      expect(b).toContain(s);
    }
    expect(b).toMatch(/do not ask the user questions/i);
    expect(b).toMatch(/do not dispatch subagents/i);
  });

  it("declares research_dir in userConfig", async () => {
    const m = await pluginJson("research-tools");
    expect(m.userConfig?.research_dir).toMatchObject({ type: "directory" });
    expect(JSON.stringify(m.userConfig?.research_dir)).toContain("docs/research");
  });

  it("source-citation covers primary sources and untrusted content", async () => {
    expect((await readFrontmatter(skill)).name).toBe("source-citation");
    const b = await body(skill);
    expect(b).toMatch(/## .*untrusted/i);
    expect(b).toMatch(/primary source/i);
  });

  it("attributes its sources", async () => {
    expect(await noticeLists("research-tools", "affaan-m/ECC", "skills/deep-research/SKILL.md", SHA.ecc)).toBe(true);
    expect(
      await noticeLists("research-tools", "mattpocock/skills", "skills/engineering/research/SKILL.md", SHA.mattpocock),
    ).toBe(true);
  });
});


describe("architecture-reviewer", () => {
  const agent = "plugins/architecture-reviewer/agents/architecture-reviewer.md";
  const rubric = "plugins/architecture-reviewer/skills/architecture-review-rubric/SKILL.md";

  it("reviewer is read-only", async () => {
    expect((await readFrontmatter(agent)).name).toBe("architecture-reviewer");
    expect(await tools(agent)).toEqual(["Bash", "Glob", "Grep", "Read"]);
    expect(await body(agent)).toMatch(/read-only/i);
    expect(await body(agent)).toMatch(/never create or modify files/i);
  });

  it("reviewer uses tiered findings and the rubric", async () => {
    const b = await body(agent);
    for (const s of ["Blocker", "High", "Medium", "Nit", "If I could only change one thing", "architecture-reviewer:architecture-review-rubric"]) {
      expect(b).toContain(s);
    }
  });

  it("rubric has the checklist items", async () => {
    expect((await readFrontmatter(rubric)).name).toBe("architecture-review-rubric");
    const b = (await body(rubric)).toLowerCase();
    for (const s of ["every requirement", "verified current", "existing codebase", "operational", "deferred"]) {
      expect(b).toContain(s);
    }
  });

  it("keeps the Apache-2.0 notice on derived files", async () => {
    for (const f of [agent, rubric]) {
      const text = await read(f);
      expect(text).toContain("Apache License, Version 2.0");
      expect(text).toContain("Modified by awesome-skills-marketplace");
    }
    expect(existsSync(path.join(REPO, "plugins/architecture-reviewer/LICENSE-APACHE-2.0"))).toBe(true);
  });

  it("attributes its sources", async () => {
    const n = (repo: string, p: string, sha: string) => noticeLists("architecture-reviewer", repo, p, sha);
    expect(await n("anthropics/claude-plugins-official", "plugins/code-modernization/agents/architecture-critic.md", SHA.pluginsOfficial)).toBe(true);
    expect(await n("wshobson/agents", "plugins/comprehensive-review/agents/architect-review.md", SHA.wshobson)).toBe(true);
    expect(await n("bmad-code-org/BMAD-METHOD", "skills/bmad-architecture/references/reviewer-gate.md", SHA.bmad)).toBe(true);
  });
});

describe("sdd-engineering manifest and templates", () => {
  const T = (f: string) => `plugins/sdd-engineering/templates/${f}`;

  it("depends on the two helper plugins by version range", async () => {
    expect((await pluginJson("sdd-engineering")).dependencies).toEqual([
      { name: "research-tools", version: "^1.0.0" },
      { name: "architecture-reviewer", version: "^1.0.0" },
    ]);
  });

  it("declares output directories as userConfig", async () => {
    const cfg = (await pluginJson("sdd-engineering")).userConfig ?? {};
    const defaults = Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, (v as { default?: string }).default]));
    expect(defaults).toEqual({
      specs_dir: "docs/specs",
      plans_dir: "docs/plans",
      verification_dir: "docs/verification",
      retros_dir: "docs/retros",
    });
    for (const v of Object.values(cfg)) expect(v).toMatchObject({ type: "directory" });
  });

  it.each([
    ["spec.md", ["## Intent", "## Goals", "## Non-goals", "## Anti-goals", "## User Stories", "## Functional Requirements", "FR-001", "## Success Criteria", "SC-001", "## Edge Cases", "## Constraints", "## Approaches", "## Decided / Left to the builder", "## Assumptions", "## Clarifications"]],
    ["plan.md", ["**Goal:**", "**Architecture:**", "**Tech Stack:**", "**Spec:**", "## Global Constraints", "## Review Focus", "## Technical Context", "## Decisions", "## Complexity Tracking", "## File Structure", "### Task 1:", "**Files:**", "**Interfaces:**", "**Covers:**", "[P]"]],
    ["ledger.md", ["# Ledger — ", "## Steps", "## Tasks", "## Rulings", "## Assumptions", "## Deferred"]],
    ["verification-report.md", ["## Verdict", "GO", "NO-GO", "## Test Run", "## Coverage", "| Requirement | Tasks | Code | Tests | Status |", "## Findings", "Missing", "Extra", "Misunderstood", "Can't verify", "## Rulings Weighed", "## Metrics"]],
    ["retro.md", ["slug:", "date:", "mode:", "## Summary", "## Findings", "Source:", "## Previous Retro Follow-through", "## Actions", "## Open Questions", "## Assumptions"]],
  ])("template %s has its sections", async (file, headings) => {
    const text = await read(T(file));
    for (const h of headings) expect(text, h).toContain(h);
  });

  it("ships the discipline skills with attribution", async () => {
    for (const skill of ["test-driven-development", "verification-before-completion"]) {
      const f = `plugins/sdd-engineering/skills/${skill}/SKILL.md`;
      expect((await readFrontmatter(f)).name).toBe(skill);
      expect(await noticeLists("sdd-engineering", "obra/superpowers", `skills/${skill}/SKILL.md`, SHA.superpowers)).toBe(true);
    }
    expect(existsSync(path.join(REPO, "plugins/sdd-engineering/skills/test-driven-development/writing-good-tests.md"))).toBe(true);
    expect(await read("plugins/sdd-engineering/skills/test-driven-development/SKILL.md")).not.toMatch(/human partner/);
  });
});

describe("sdd-engineering spec and plan agents", () => {
  const A = (n: string) => `plugins/sdd-engineering/agents/${n}.md`;
  const NESTING = /CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH/;

  it("spec-creator can research but asks the user nothing directly", async () => {
    expect((await readFrontmatter(A("spec-creator"))).name).toBe("spec-creator");
    expect(await tools(A("spec-creator"))).toEqual(["Agent", "Glob", "Grep", "Read", "WebFetch", "Write"]);
    const b = await body(A("spec-creator"));
    for (const s of ["research-tools:researcher", "research-tools:source-citation", "${CLAUDE_PLUGIN_ROOT}/templates/spec.md", "## Clarifications", "Recommended:", "QUESTIONS:", "STATUS:", "FILE:"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/at most 3 \[NEEDS CLARIFICATION/);
    expect(b).toMatch(/at most 5 questions/i);
    expect(b).toMatch(/never ask the user directly/i);
    expect(b).toMatch(NESTING);
  });

  it("implementation-planner gets the plan reviewed", async () => {
    expect((await readFrontmatter(A("implementation-planner"))).name).toBe("implementation-planner");
    expect(await tools(A("implementation-planner"))).toEqual(["Agent", "Glob", "Grep", "Read", "Write"]);
    const b = await body(A("implementation-planner"));
    for (const s of ["architecture-reviewer:architecture-reviewer", "${CLAUDE_PLUGIN_ROOT}/templates/plan.md", "extend / new / hybrid", "[P]", "FR-", "Review Focus", "REVIEW:", "STATUS:", "FILE:"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/self-review/i);
    expect(b).toMatch(NESTING);
  });

  it("attributes the spec and plan sources", async () => {
    const n = (repo: string, p: string, sha: string) => noticeLists("sdd-engineering", repo, p, sha);
    expect(await n("github/spec-kit", "templates/commands/specify.md", SHA.specKit)).toBe(true);
    expect(await n("github/spec-kit", "templates/commands/clarify.md", SHA.specKit)).toBe(true);
    expect(await n("obra/superpowers", "skills/brainstorming/SKILL.md", SHA.superpowers)).toBe(true);
    expect(await n("obra/superpowers", "skills/writing-plans/SKILL.md", SHA.superpowers)).toBe(true);
    expect(await n("anthropics/claude-plugins-official", "plugins/feature-dev/agents/code-architect.md", SHA.pluginsOfficial)).toBe(true);
  });
});

describe("sdd-engineering implementer and verifier", () => {
  const A = (n: string) => `plugins/sdd-engineering/agents/${n}.md`;

  it("implementer works alone on one task with the status contract", async () => {
    expect((await readFrontmatter(A("implementer"))).name).toBe("implementer");
    expect(await tools(A("implementer"))).toEqual(["Bash", "Edit", "Glob", "Grep", "Read", "Write"]);
    const b = await body(A("implementer"));
    for (const s of ["DONE", "DONE_WITH_CONCERNS", "BLOCKED", "NEEDS_CONTEXT", "sdd-engineering:test-driven-development", "sdd-engineering:verification-before-completion", "Ruling:", "STATUS:", "COMMIT:", "TESTS:", "RULINGS:"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/do not dispatch subagents/i);
    expect(b).toMatch(/four stop conditions/i);
  });

  it("plan-verifier checks independently and writes only its report", async () => {
    expect((await readFrontmatter(A("plan-verifier"))).name).toBe("plan-verifier");
    expect(await tools(A("plan-verifier"))).toEqual(["Bash", "Glob", "Grep", "Read", "Write"]);
    const b = await body(A("plan-verifier"));
    for (const s of ["Missing", "Extra", "Misunderstood", "Can't verify", "GO", "NO-GO", "${CLAUDE_PLUGIN_ROOT}/templates/verification-report.md", "VERDICT:", "FILE:", "FINDINGS:", "verification_dir"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/full test suite/i);
    expect(b).toMatch(/do not trust/i);
    expect(b).toMatch(/write only the report/i);
  });

  it("attributes the implementation and verification sources", async () => {
    const n = (repo: string, p: string, sha: string) => noticeLists("sdd-engineering", repo, p, sha);
    expect(await n("obra/superpowers", "skills/subagent-driven-development/implementer-prompt.md", SHA.superpowers)).toBe(true);
    expect(await n("obra/superpowers", "skills/executing-plans/SKILL.md", SHA.superpowers)).toBe(true);
    expect(await n("obra/superpowers", "skills/subagent-driven-development/task-reviewer-prompt.md", SHA.superpowers)).toBe(true);
    expect(await n("gotalab/cc-sdd", "validate-impl.md", SHA.ccSdd)).toBe(true);
    expect(await n("github/spec-kit", "templates/commands/analyze.md", SHA.specKit)).toBe(true);
  });
});

describe("sdd-run orchestrator", () => {
  const F = "plugins/sdd-engineering/skills/sdd-run/SKILL.md";

  it("runs in the main session", async () => {
    const fm = await readFrontmatter(F);
    expect(fm.name).toBe("sdd-run");
    expect(fm.context).toBeUndefined();
  });

  it("dispatches every step by namespaced name", async () => {
    const b = await body(F);
    for (const s of ["sdd-engineering:spec-creator", "sdd-engineering:implementation-planner", "sdd-engineering:implementer", "sdd-engineering:plan-verifier", "sdd-engineering:workflow-retro"]) {
      expect(b, s).toContain(s);
    }
  });

  it("owns the conversation, gates and auto mode", async () => {
    const b = await body(F);
    for (const s of ["GATE 1", "GATE 2", "--auto", "one question per message", "Recommended", "## Assumptions"]) {
      expect(b, s).toContain(s);
    }
  });

  it("keeps a ledger and resumes from it", async () => {
    const b = await body(F);
    for (const s of ["${CLAUDE_PLUGIN_ROOT}/templates/ledger.md", "first incomplete", "Ruling:", "BASE"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/never dispatch implementers in parallel/i);
  });

  it("handles every status and the verify/fix loop", async () => {
    const b = await body(F);
    for (const s of ["DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED", "NO-GO", "one fix pass", "Rulings I made", "Deferred"]) {
      expect(b, s).toContain(s);
    }
  });

  it("uses the configured directories", async () => {
    const b = await body(F);
    for (const k of ["specs_dir", "plans_dir", "verification_dir", "retros_dir"]) expect(b).toContain(`\${user_config.${k}}`);
  });

  it("attributes its sources", async () => {
    expect(await noticeLists("sdd-engineering", "obra/superpowers", "skills/subagent-driven-development/SKILL.md", SHA.superpowers)).toBe(true);
  });
});

describe("workflow-retro skill", () => {
  const F = "plugins/sdd-engineering/skills/workflow-retro/SKILL.md";

  it("reads the run's evidence and requires a source per finding", async () => {
    expect((await readFrontmatter(F)).name).toBe("workflow-retro");
    const b = await body(F);
    for (const s of ["spec", "plan", "ledger", "verification report", "git log", "${CLAUDE_PLUGIN_ROOT}/templates/retro.md", "retros_dir"]) {
      expect(b, s).toContain(s);
    }
    expect(b).toMatch(/without a source[\s\S]*?drop it/i);
  });

  it("covers the categories aimed at the workflow itself", async () => {
    const b = await body(F);
    for (const s of ["Agents and prompts", "Skills and templates", "Navigation", "Automated checks", "Coding standards", "Tool economy", "Information access"]) {
      expect(b, s).toContain(s);
    }
  });

  it("follows up the previous retro and writes only its own file", async () => {
    const b = await body(F);
    expect(b).toContain("Previous Retro Follow-through");
    expect(b).toMatch(/writes only the retro file/i);
    expect(b).toMatch(/no time estimates/i);
  });

  it("attributes its sources", async () => {
    expect(await noticeLists("sdd-engineering", "mattpocock/skills", "skills/engineering/retro/SKILL.md", SHA.mattpocock)).toBe(true);
    expect(await noticeLists("sdd-engineering", "bmad-code-org/BMAD-METHOD", "skills/bmad-retrospective/workflow.md", SHA.bmad)).toBe(true);
  });
});
