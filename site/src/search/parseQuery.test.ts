import { describe, expect, it } from "vitest";
import { parseQuery } from "./parseQuery";

describe("parseQuery", () => {
  it("extracts terms and type from the spec example", () => {
    expect(parseQuery("I need a skill for deploying to Railway")).toEqual({
      terms: ["deploying", "railway"],
      typeFilter: "skill",
    });
  });

  it("returns no terms for intent-only queries", () => {
    expect(parseQuery("I need a skill")).toEqual({ terms: [], typeFilter: "skill" });
  });

  it("maps subagents to agent", () => {
    expect(parseQuery("subagents for review")).toEqual({ terms: ["review"], typeFilter: "agent" });
  });

  it("maps mcp and slash commands", () => {
    expect(parseQuery("an MCP server for postgres").typeFilter).toBe("mcp");
    expect(parseQuery("slash command to deploy").typeFilter).toBe("command");
  });

  it("strips punctuation and handles empty input", () => {
    expect(parseQuery("  Lint, please!!  ")).toEqual({ terms: ["lint"], typeFilter: null });
    expect(parseQuery("")).toEqual({ terms: [], typeFilter: null });
  });
});
