import { describe, expect, it } from "vitest";
import { readSearchState, writeSearchState, type SearchState } from "./urlState";

const EMPTY: SearchState = { q: "", types: [], category: null, tags: [] };

describe("url state", () => {
  it("round-trips a full state", () => {
    const s: SearchState = { q: "deploy railway", types: ["skill", "agent"], category: "devops", tags: ["ci", "deploy"] };
    expect(readSearchState(writeSearchState(s))).toEqual(s);
  });

  it("writes an empty string for an empty state", () => {
    expect(writeSearchState(EMPTY)).toBe("");
  });

  it("omits empty params", () => {
    expect(writeSearchState({ ...EMPTY, q: "lint" })).toBe("?q=lint");
  });

  it("drops unknown types", () => {
    expect(readSearchState("?type=skill,bogus").types).toEqual(["skill"]);
  });

  it("reads an empty search as the empty state", () => {
    expect(readSearchState("")).toEqual(EMPTY);
  });
});
