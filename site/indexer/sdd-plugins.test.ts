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
