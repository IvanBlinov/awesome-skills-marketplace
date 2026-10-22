import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { estimateTokens, parseMarkdownArtifact, stripMarkdown } from "./markdown";

function tmpFile(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "md-"));
  const file = path.join(dir, "SKILL.md");
  writeFileSync(file, content);
  return file;
}

describe("parseMarkdownArtifact", () => {
  it("parses frontmatter and body", async () => {
    const file = tmpFile("---\nname: x\ndescription: Does x\nkeywords: [a, b]\n---\n\n# Title\n\nText.\n");
    const r = await parseMarkdownArtifact(file);
    expect(r.name).toBe("x");
    expect(r.description).toBe("Does x");
    expect(r.keywords).toEqual(["a", "b"]);
    expect(r.body.trim()).toBe("# Title\n\nText.");
    expect(r.plainText).toBe("Title Text.");
  });

  it("defaults keywords to an empty array", async () => {
    const r = await parseMarkdownArtifact(tmpFile("---\nname: x\n---\nBody"));
    expect(r.keywords).toEqual([]);
    expect(r.description).toBeUndefined();
  });

  it("throws with the path for non-string keywords", async () => {
    const file = tmpFile("---\nname: x\nkeywords: [1, {a: b}]\n---\n");
    await expect(parseMarkdownArtifact(file)).rejects.toThrow(`${file}: keywords must be an array of strings`);
  });

  it("caps plainText at 4000 chars", async () => {
    const r = await parseMarkdownArtifact(tmpFile("---\nname: x\n---\n" + "word ".repeat(2000)));
    expect(r.plainText.length).toBeLessThanOrEqual(4000);
  });
});

describe("stripMarkdown", () => {
  it("removes markdown syntax", () => {
    const out = stripMarkdown("## Head\n\nUse `code` and [link](https://x.y) **bold** _it_.\n\n```sh\nnpm i\n```\n- item");
    expect(out).not.toMatch(/[#`*_\[\]()]/);
    expect(out).toContain("Head");
    expect(out).toContain("link");
    expect(out).toContain("npm i");
    expect(out).toContain("item");
  });
});

describe("estimateTokens", () => {
  it("uses ceil(chars / 4)", () => {
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});
