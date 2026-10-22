import { describe, expect, it } from "vitest";
import { skillRequestUrl } from "./issueUrl";

describe("skillRequestUrl", () => {
  it("builds a prefilled issue url", () => {
    const url = new URL(skillRequestUrl("a&b"));
    expect(url.origin + url.pathname).toBe("https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new");
    expect(url.searchParams.get("template")).toBe("skill-request.yml");
    expect(url.searchParams.get("what")).toBe("a&b");
    expect(url.searchParams.get("title")).toBe("Skill request: a&b");
    expect(skillRequestUrl("a&b")).toContain("what=a%26b");
  });

  it("truncates long queries", () => {
    const url = new URL(skillRequestUrl("x".repeat(2000)));
    expect(url.searchParams.get("what")).toHaveLength(1500);
    expect(url.searchParams.get("title")).toBe(`Skill request: ${"x".repeat(80)}`);
  });

  it("uses a generic title for an empty query", () => {
    expect(new URL(skillRequestUrl("  ")).searchParams.get("title")).toBe("Skill request");
  });
});
