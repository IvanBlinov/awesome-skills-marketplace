import { describe, expect, it } from "vitest";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { createSearch, type Filters } from "./createSearch";

const NO_FILTERS: Filters = { types: [], categories: [], keywords: [], authors: [], plugins: [] };
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

  it("applies category and keyword filters", () => {
    expect(ids("", { ...NO_FILTERS, categories: ["quality"] })).toEqual(["beta/plugin/beta", "beta/skill/lint-fast"]);
    expect(ids("", { ...NO_FILTERS, keywords: ["notes"] }).every((id) => id.startsWith("gamma/"))).toBe(true);
  });

  it("keyword filter matches artifact keywords as well as plugin tags", () => {
    expect(ids("", { ...NO_FILTERS, keywords: ["hosting"] })).toEqual(["alpha/skill/deploy-railway"]);
  });

  it("filters by author and plugin, any of the selected values", () => {
    expect(ids("", { ...NO_FILTERS, authors: ["Alpha Team"] })).toEqual(["alpha/plugin/alpha"]);
    expect(ids("", { ...NO_FILTERS, plugins: ["beta", "gamma"] }).every((id) => !id.startsWith("alpha/"))).toBe(true);
    expect(ids("", { ...NO_FILTERS, categories: ["quality", "productivity"] })).toHaveLength(4);
  });

  it("explicit type filter wins over detected type", () => {
    const r = search("skill for deploy", { ...NO_FILTERS, types: ["agent"] });
    expect(r.results.map((a) => a.id)).toEqual(["alpha/agent/reviewer"]);
  });

  it("shows all of a type for an intent-only query, newest first", () => {
    expect(ids("I need a skill")).toEqual(["alpha/skill/deploy-railway", "gamma/skill/notes", "beta/skill/lint-fast"]);
  });
});
