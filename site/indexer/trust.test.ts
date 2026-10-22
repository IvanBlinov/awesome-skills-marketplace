import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadMarketplace, resolvePlugin } from "./manifest";
import { buildTrustReport, NETWORK_COMMAND_RE } from "./trust";

const ROOT = path.join(__dirname, "__fixtures__/repo");

async function plugin(name: string) {
  const mp = await loadMarketplace(ROOT);
  return resolvePlugin(ROOT, mp.plugins.find((p) => p.name === name)!);
}

describe("buildTrustReport", () => {
  it("flags everything alpha does", async () => {
    expect(buildTrustReport(await plugin("alpha"))).toEqual({
      hasHooks: true,
      hookEvents: ["PreToolUse"],
      hasMcp: true,
      mcpServers: ["db"],
      hasBin: true,
      requiresSecrets: ["API_KEY"],
      requiresConfig: ["REGION"],
      networkCommands: true,
      level: "review",
    });
  });

  it("rates mcp-only plugins low", async () => {
    expect(buildTrustReport(await plugin("beta")).level).toBe("low");
  });

  it("rates plain plugins none", async () => {
    const t = buildTrustReport(await plugin("gamma"));
    expect(t.level).toBe("none");
    expect(t.hasHooks).toBe(false);
    expect(t.networkCommands).toBe(false);
  });
});

describe("NETWORK_COMMAND_RE", () => {
  it("matches network tools as whole words only", () => {
    expect(NETWORK_COMMAND_RE.test("wget http://x")).toBe(true);
    expect(NETWORK_COMMAND_RE.test("Invoke-WebRequest x")).toBe(true);
    expect(NETWORK_COMMAND_RE.test("echo curlew")).toBe(false);
  });
});

describe("buildTrustReport fail-closed", () => {
  const base = {
    entry: { name: "x", source: "./x" },
    manifest: { name: "x" },
    dir: "plugins/x",
    skillFiles: [],
    agentFiles: [],
    commandFiles: [],
    hooks: {},
    mcpServers: {},
    uninspectedMcp: [],
    hasBin: false,
    hasReadme: true,
    hasLicense: true,
  };

  it("rates a local stdio MCP server as review", () => {
    const t = buildTrustReport({ ...base, mcpServers: { local: { command: "node", args: ["s.js"] } } });
    expect(t.level).toBe("review");
  });

  it("keeps remote http MCP servers low", () => {
    expect(buildTrustReport({ ...base, mcpServers: { r: { type: "http", url: "https://x" } } }).level).toBe("low");
  });

  it("treats uninspected MCP sources as present and review", () => {
    const t = buildTrustReport({ ...base, uninspectedMcp: ["./server.mcpb"] });
    expect(t.hasMcp).toBe(true);
    expect(t.mcpServers).toEqual(["./server.mcpb (not inspected)"]);
    expect(t.level).toBe("review");
  });
});
