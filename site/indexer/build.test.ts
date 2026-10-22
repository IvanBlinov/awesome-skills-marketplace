import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "./build";
import { estimateTokens } from "./markdown";

const ROOT = path.join(__dirname, "__fixtures__/repo");
const build = () =>
  buildCatalog(ROOT, { lastModified: () => "2026-10-01T00:00:00.000Z", now: () => new Date("2026-10-21T00:00:00Z") });

describe("buildCatalog", () => {
  it("emits one artifact per component", async () => {
    const { catalog } = await build();
    const count = (t: string) => catalog.artifacts.filter((a) => a.type === t).length;
    expect([count("plugin"), count("skill"), count("agent"), count("command"), count("hook"), count("mcp")]).toEqual([
      3, 4, 2, 1, 1, 2,
    ]);
    const ids = catalog.artifacts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
  });

  it("fills marketplace metadata", async () => {
    const { catalog } = await build();
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.generatedAt).toBe("2026-10-21T00:00:00.000Z");
    expect(catalog.marketplace).toEqual({
      name: "awesome-skills-marketplace",
      repo: "IvanBlinov/awesome-skills-marketplace",
      description: "Fixture marketplace",
      addCommand: "/plugin marketplace add IvanBlinov/awesome-skills-marketplace",
    });
    expect(catalog.categories).toEqual(["devops", "productivity", "quality"]);
  });

  it("builds skill cards with inherited plugin data", async () => {
    const { catalog, bodies } = await build();
    const s = catalog.artifacts.find((a) => a.id === "alpha/skill/deploy-railway")!;
    expect(s).toMatchObject({
      type: "skill",
      name: "deploy-railway",
      plugin: "alpha",
      category: "devops",
      tags: ["deploy", "railway"],
      keywords: ["ship", "hosting"],
      invocation: "/alpha:deploy-railway",
      path: "plugins/alpha/skills/deploy-railway/SKILL.md",
      sourceUrl: "https://github.com/IvanBlinov/awesome-skills-marketplace/blob/main/plugins/alpha/skills/deploy-railway/SKILL.md",
      updatedAt: "2026-10-01T00:00:00.000Z",
      version: "1.2.0",
      author: "Alpha Team",
      install: {
        add: "/plugin marketplace add IvanBlinov/awesome-skills-marketplace",
        install: "/plugin install alpha@awesome-skills-marketplace",
      },
    });
    expect(s.searchText).toContain("railway up");
    expect(bodies["alpha/skill/deploy-railway"]).toContain("# Deploy to Railway");
    expect(s.bodyTokens).toBe(estimateTokens(bodies["alpha/skill/deploy-railway"]));
  });

  it("names commands by file and agents with plugin prefix", async () => {
    const { catalog } = await build();
    expect(catalog.artifacts.find((a) => a.id === "alpha/command/status")?.invocation).toBe("/alpha:status");
    expect(catalog.artifacts.find((a) => a.id === "alpha/agent/reviewer")?.invocation).toBe("alpha:reviewer");
  });

  it("builds plugin cards with trust, children and context cost", async () => {
    const { catalog, bodies } = await build();
    const p = catalog.artifacts.find((a) => a.id === "alpha/plugin/alpha")!;
    const kids = catalog.artifacts.filter((a) => a.plugin === "alpha" && a.type !== "plugin");
    const expectedTokens = kids
      .filter((a) => ["skill", "agent", "command"].includes(a.type))
      .reduce((n, a) => n + estimateTokens(a.name + a.description), 0);
    expect(p.contextTokens).toBe(expectedTokens);
    expect(p.children).toEqual(kids.map((a) => a.id));
    expect(p.trust?.level).toBe("review");
    expect(p.description).toBe("Deployment helpers");
    expect(bodies["alpha/plugin/alpha"]).toBe("# alpha\n");
  });

  it("builds hook and mcp cards", async () => {
    const { catalog } = await build();
    expect(catalog.artifacts.find((a) => a.id === "alpha/hook/PreToolUse-1")?.hook).toEqual({
      event: "PreToolUse",
      matcher: "Bash",
      commands: ["curl -s https://example.com"],
    });
    expect(catalog.artifacts.find((a) => a.id === "alpha/mcp/db")?.mcp).toEqual({
      transport: "stdio",
      command: "${CLAUDE_PLUGIN_ROOT}/scripts/db-server --readonly",
    });
    expect(catalog.artifacts.find((a) => a.id === "beta/mcp/lint-api")?.mcp).toEqual({
      transport: "http",
      url: "https://lint.example.com/mcp",
    });
  });

  it("points hook and mcp cards at the file that declares them", async () => {
    const { catalog } = await build();
    const get = (id: string) => catalog.artifacts.find((a) => a.id === id)!;
    expect(get("alpha/hook/PreToolUse-1").path).toBe("plugins/alpha/hooks/hooks.json");
    expect(get("alpha/hook/PreToolUse-1").sourceUrl).toMatch(/\/blob\/main\/plugins\/alpha\/hooks\/hooks\.json$/);
    expect(get("alpha/mcp/db").path).toBe("plugins/alpha/.mcp.json");
    expect(get("beta/mcp/lint-api").path).toBe("plugins/beta/.claude-plugin/plugin.json");
  });

  it("does not index agents replaced by plugin.json", async () => {
    const { catalog } = await build();
    expect(catalog.artifacts.some((a) => a.name === "ignored")).toBe(false);
  });
});
