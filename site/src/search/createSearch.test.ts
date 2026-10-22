import { describe, expect, it } from "vitest";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { createSearch, type Filters } from "./createSearch";

const NO_FILTERS: Filters = { types: [], category: null, tags: [] };
const search = createSearch(ARTIFACTS);
const ids = (q: string, f: Filters = NO_FILTERS) => search(q, f).results.map((a) => a.id);

describe("createSearch", () => {
  it("ranks the matching skill first for the spec example", () => {
    const r = search("I need a skill for deploying to Railway", NO_FILTERS);
    expect(r.results[0].id).toBe("alpha/skill/deploy-railway");
    expect(r.results.every((a) => a.type === "skill")).toBe(true);
    expect(r.detectedType).toBe("skill");
  });

  it("matches by prefix and with typos", () => {
    expect(ids("deplo")).toContain("alpha/skill/deploy-railway");
    expect(ids("raliway")).toContain("alpha/skill/deploy-railway");
  });

  it("matches keywords", () => {
    expect(ids("hosting")[0]).toBe("alpha/skill/deploy-railway");
  });

  it("falls back to OR when AND finds nothing", () => {
    const r = search("lint zzzqqq", NO_FILTERS);
    expect(r.usedFallback).toBe(true);
    expect(r.results.map((a) => a.id)).toContain("beta/skill/lint-fast");
  });

  it("returns nothing for gibberish", () => {
    expect(search("zzzqqq", NO_FILTERS).results).toEqual([]);
  });

  it("applies category and tag filters", () => {
    expect(ids("", { ...NO_FILTERS, category: "quality" })).toEqual(["beta/plugin/beta", "beta/skill/lint-fast"]);
    expect(ids("", { ...NO_FILTERS, tags: ["notes"] }).every((id) => id.startsWith("gamma/"))).toBe(true);
  });

  it("explicit type filter wins over detected type", () => {
    const r = search("skill for deploy", { ...NO_FILTERS, types: ["agent"] });
    expect(r.results.map((a) => a.id)).toEqual(["alpha/agent/reviewer"]);
  });

  it("shows all of a type for an intent-only query, newest first", () => {
    expect(ids("I need a skill")).toEqual(["alpha/skill/deploy-railway", "gamma/skill/notes", "beta/skill/lint-fast"]);
  });
});
