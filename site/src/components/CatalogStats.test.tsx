import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { CatalogStats, countByType } from "./CatalogStats";

describe("countByType", () => {
  it("counts artifacts per type in display order, without zero entries", () => {
    expect(countByType(ARTIFACTS)).toEqual([
      { type: "plugin", count: 3 },
      { type: "skill", count: 3 },
      { type: "agent", count: 1 },
      { type: "command", count: 1 },
      { type: "hook", count: 1 },
      { type: "mcp", count: 1 },
    ]);
    expect(countByType(ARTIFACTS.filter((a) => a.type === "skill"))).toEqual([{ type: "skill", count: 3 }]);
  });
});

describe("CatalogStats", () => {
  it("labels each count with a singular or plural noun", () => {
    render(<CatalogStats artifacts={ARTIFACTS} active={[]} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "3 plugins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 skills" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 agent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 MCP server" })).toBeInTheDocument();
  });

  it("selects a type when a count is clicked and marks the active one", async () => {
    const onSelect = vi.fn();
    render(<CatalogStats artifacts={ARTIFACTS} active={["agent"]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "3 skills" }));
    expect(onSelect).toHaveBeenCalledWith("skill");
    expect(screen.getByRole("button", { name: "1 agent" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "3 skills" })).toHaveAttribute("aria-pressed", "false");
  });
});
