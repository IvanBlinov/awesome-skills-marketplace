import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadMarketplace, resolvePlugin } from "./manifest";

const ROOT = path.join(__dirname, "__fixtures__/repo");

async function plugin(name: string) {
  const mp = await loadMarketplace(ROOT);
  const entry = mp.plugins.find((p) => p.name === name)!;
  return resolvePlugin(ROOT, entry);
}

describe("loadMarketplace", () => {
  it("reads name and entries", async () => {
    const mp = await loadMarketplace(ROOT);
    expect(mp.name).toBe("awesome-skills-marketplace");
    expect(mp.plugins.map((p) => p.name)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("throws with the file path when marketplace.json is missing", async () => {
    await expect(loadMarketplace("/nonexistent")).rejects.toThrow(/marketplace\.json/);
  });
});

describe("resolvePlugin", () => {
  it("resolves default dirs", async () => {
    const p = await plugin("alpha");
    expect(p.dir).toBe("plugins/alpha");
    expect(p.skillFiles).toEqual(["plugins/alpha/skills/deploy-railway/SKILL.md"]);
    expect(p.agentFiles).toEqual(["plugins/alpha/agents/reviewer.md"]);
    expect(p.commandFiles).toEqual(["plugins/alpha/commands/status.md"]);
    expect(Object.keys(p.hooks)).toEqual(["PreToolUse"]);
    expect(Object.keys(p.mcpServers)).toEqual(["db"]);
    expect(p.hasBin).toBe(true);
    expect(p.hasReadme).toBe(true);
    expect(p.hasLicense).toBe(true);
    expect(p.manifest.version).toBe("1.2.0");
  });

  it("agents key replaces default dir", async () => {
    const p = await plugin("beta");
    expect(p.agentFiles).toEqual(["plugins/beta/custom/only.md"]);
  });

  it("skills key adds to default dir", async () => {
    const p = await plugin("beta");
    expect(p.skillFiles).toEqual([
      "plugins/beta/extra-skills/lint-fast/SKILL.md",
      "plugins/beta/skills/base/SKILL.md",
    ]);
  });

  it("merges inline mcpServers from plugin.json", async () => {
    const p = await plugin("beta");
    expect(p.mcpServers["lint-api"]).toMatchObject({ type: "http", url: "https://lint.example.com/mcp" });
    expect(p.hasBin).toBe(false);
  });

  it("plugin without plugin.json uses entry as manifest", async () => {
    const p = await plugin("gamma");
    expect(p.manifest.name).toBe("gamma");
    expect(p.manifest.description).toBe("Note taking without a manifest");
    expect(p.skillFiles).toEqual(["plugins/gamma/skills/notes/SKILL.md"]);
    expect(p.agentFiles).toEqual([]);
    expect(p.hooks).toEqual({});
  });
});

describe("resolvePlugin uninspected MCP", () => {
  it("records non-json MCP sources instead of dropping them", async () => {
    const p = await resolvePlugin(ROOT, {
      name: "gamma",
      source: "./plugins/gamma",
      mcpServers: ["./server.mcpb", "https://example.com/bundle.mcpb"],
    });
    expect(p.uninspectedMcp).toEqual(["./server.mcpb", "https://example.com/bundle.mcpb"]);
  });
});
