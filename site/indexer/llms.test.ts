import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/test/fixtureCatalog";
import { renderLlmsTxt } from "./llms";

describe("renderLlmsTxt", () => {
  it("lists every artifact with its page URL", () => {
    const txt = renderLlmsTxt(CATALOG);
    expect(txt.startsWith("# awesome-skills-marketplace\n")).toBe(true);
    expect(txt).toContain("catalog.json");
    expect(txt).toContain(
      "- [deploy-railway](https://ivanblinov.github.io/awesome-skills-marketplace/content/alpha__skill__deploy-railway.md): " +
        "Deploys the current project to Railway and checks the build logs.",
    );
    const hook = CATALOG.artifacts.find((a) => a.id === "alpha/hook/PreToolUse-1")!;
    expect(txt).toContain(`- [PreToolUse-1](${hook.sourceUrl}): ${hook.description}`);
    expect(txt).not.toContain("/a/");
  });
});
