import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/test/fixtureCatalog";
import { renderLlmsTxt } from "./llms";

describe("renderLlmsTxt", () => {
  it("lists every artifact with its page URL", () => {
    const txt = renderLlmsTxt(CATALOG);
    expect(txt.startsWith("# awesome-skills-marketplace\n")).toBe(true);
    expect(txt).toContain("catalog.json");
    for (const a of CATALOG.artifacts) {
      expect(txt).toContain(
        `- [${a.name}](https://ivanblinov.github.io/awesome-skills-marketplace/a/${a.id}): ${a.description}`,
      );
    }
  });
});
