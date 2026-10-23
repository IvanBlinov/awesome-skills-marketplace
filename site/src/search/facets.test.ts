import { describe, expect, it } from "vitest";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { createSearch, type Filters } from "./createSearch";
import { facetCounts } from "./facets";

const NONE: Filters = { types: [], categories: [], keywords: [], authors: [], plugins: [] };
const search = createSearch(ARTIFACTS);

describe("facetCounts", () => {
  it("counts every facet value over all artifacts when nothing is selected", () => {
    const f = facetCounts(search, "", NONE);
    expect(f.types).toEqual([
      { value: "plugin", count: 3 },
      { value: "skill", count: 3 },
      { value: "agent", count: 1 },
      { value: "command", count: 1 },
      { value: "hook", count: 1 },
      { value: "mcp", count: 1 },
    ]);
    expect(f.plugins).toEqual([
      { value: "alpha", count: 6 },
      { value: "beta", count: 2 },
      { value: "gamma", count: 2 },
    ]);
    expect(f.keywords[0]).toEqual({ value: "deploy", count: 6 });
    expect(f.keywords).toContainEqual({ value: "hosting", count: 1 });
    expect(f.authors).toEqual([{ value: "Alpha Team", count: 1 }]);
    expect(f.categories).toEqual([
      { value: "devops", count: 6 },
      { value: "productivity", count: 2 },
      { value: "quality", count: 2 },
    ]);
  });

  it("counts only artifacts matching the query", () => {
    expect(facetCounts(search, "lint", NONE).types).toEqual([
      { value: "plugin", count: 1 },
      { value: "skill", count: 1 },
    ]);
  });

  it("a facet's own selection does not narrow its counts, other facets' selections do", () => {
    const f = facetCounts(search, "", { ...NONE, types: ["skill"] });
    expect(f.types).toEqual(facetCounts(search, "", NONE).types);
    expect(f.plugins).toEqual([
      { value: "alpha", count: 1 },
      { value: "beta", count: 1 },
      { value: "gamma", count: 1 },
    ]);
  });

  it("keeps selected values visible even when their count drops to zero", () => {
    const f = facetCounts(search, "lint", { ...NONE, plugins: ["gamma"] });
    expect(f.plugins).toContainEqual({ value: "gamma", count: 0 });
  });
});
