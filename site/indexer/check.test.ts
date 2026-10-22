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

  it("reports unreadable marketplace", async () => {
    const errors = await checkConventions("/nonexistent");
    expect(errors[0]).toMatch(/marketplace\.json/);
  });
});
