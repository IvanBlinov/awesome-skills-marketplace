import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkConventions } from "./check";

describe("checkConventions", () => {
  it("only flags the manifest-less plugin in the good fixture", async () => {
    expect(await checkConventions(path.join(__dirname, "__fixtures__/repo"))).toEqual([
      "plugins/gamma: .claude-plugin/plugin.json missing",
    ]);
  });

  it("reports each broken convention with its path", async () => {
    const errors = await checkConventions(path.join(__dirname, "__fixtures__/bad-repo"));
    expect(errors).toHaveLength(5);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/plugins\/one\/skills\/helper\/SKILL\.md: name "Claude_Helper"/),
        expect.stringMatching(/plugins\/one\/skills\/dup\/SKILL\.md: description must be 20–1024 chars/),
        expect.stringMatching(/plugin "two": unknown category "not-a-category"/),
        expect.stringMatching(/plugins\/two: LICENSE missing/),
        expect.stringMatching(/plugins\/two\/skills\/dup\/SKILL\.md: skill name "dup" already used/),
      ]),
    );
  });

  it("rejects plugin names that are not kebab-case", async () => {
    const { mkdtempSync, cpSync, readFileSync, writeFileSync } = await import("node:fs");
    const os = await import("node:os");
    const repo = mkdtempSync(path.join(os.tmpdir(), "mp-"));
    cpSync(path.join(__dirname, "__fixtures__/repo"), repo, { recursive: true });
    const file = path.join(repo, ".claude-plugin/marketplace.json");
    const mp = JSON.parse(readFileSync(file, "utf8"));
    const renamed = { ...mp, plugins: mp.plugins.map((p: { name: string }) => (p.name === "gamma" ? { ...p, name: "Gamma;x" } : p)) };
    writeFileSync(file, JSON.stringify(renamed));
    expect(await checkConventions(repo)).toContain('plugin "Gamma;x": name must be kebab-case (a-z, 0-9, "-")');
  });

  it("rejects command files and mcp server names that are not url-safe", async () => {
    const { mkdtempSync, cpSync, writeFileSync } = await import("node:fs");
    const os = await import("node:os");
    const repo = mkdtempSync(path.join(os.tmpdir(), "mp-"));
    cpSync(path.join(__dirname, "__fixtures__/repo"), repo, { recursive: true });
    writeFileSync(path.join(repo, "plugins/alpha/commands/what?.md"), "---\ndescription: Asks things.\n---\n");
    writeFileSync(path.join(repo, "plugins/alpha/.mcp.json"), JSON.stringify({ mcpServers: { "my server#1": { command: "x" } } }));
    const errors = await checkConventions(repo);
    expect(errors).toContain('plugins/alpha/commands/what?.md: name "what?" must use only A-Z, a-z, 0-9, ".", "_", "-"');
    expect(errors).toContain('plugin "alpha": MCP server "my server#1" must use only A-Z, a-z, 0-9, ".", "_", "-"');
  });

  it("rejects a marketplace entry without a name", async () => {
    const { mkdtempSync, cpSync, readFileSync, writeFileSync } = await import("node:fs");
    const os = await import("node:os");
    const repo = mkdtempSync(path.join(os.tmpdir(), "mp-"));
    cpSync(path.join(__dirname, "__fixtures__/repo"), repo, { recursive: true });
    const file = path.join(repo, ".claude-plugin/marketplace.json");
    const mp = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(file, JSON.stringify({ ...mp, plugins: [...mp.plugins, { source: "./plugins/gamma", category: "meta", tags: ["x"] }] }));
    expect(await checkConventions(repo)).toContain("a marketplace entry has no name");
  });

  it("reports unreadable marketplace", async () => {
    const errors = await checkConventions("/nonexistent");
    expect(errors[0]).toMatch(/marketplace\.json/);
  });
});
