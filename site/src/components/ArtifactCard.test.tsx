import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { ArtifactCard } from "./ArtifactCard";

const byId = (id: string) => ARTIFACTS.find((a) => a.id === id)!;
const renderCard = (id: string, props: Partial<Parameters<typeof ArtifactCard>[0]> = {}) =>
  render(
    <MemoryRouter>
      <ArtifactCard artifact={byId(id)} {...props} />
    </MemoryRouter>,
  );

describe("ArtifactCard", () => {
  it("shows trust badges and context cost for plugins", () => {
    renderCard("alpha/plugin/alpha");
    for (const badge of ["hooks", "mcp", "bin", "secrets"]) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
    expect(screen.getByText("≈ 61 tokens")).toBeInTheDocument();
  });

  it("links to the detail page and shows type, plugin and tags", () => {
    renderCard("alpha/skill/deploy-railway");
    expect(screen.getByRole("link", { name: "deploy-railway" })).toHaveAttribute("href", "/a/alpha/skill/deploy-railway");
    expect(screen.getByText("skill")).toBeInTheDocument();
    expect(screen.getByText("in alpha")).toBeInTheDocument();
    expect(screen.getByText("railway")).toBeInTheDocument();
  });

  it("copies the install command", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderCard("alpha/skill/deploy-railway");
    await userEvent.click(screen.getByRole("button", { name: /copy install/i }));
    expect(writeText).toHaveBeenCalledWith("/plugin install alpha@awesome-skills-marketplace");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("adds the parent plugin to the bundle", async () => {
    const onAddToBundle = vi.fn();
    renderCard("alpha/skill/deploy-railway", { onAddToBundle });
    await userEvent.click(screen.getByRole("button", { name: /add alpha to bundle/i }));
    expect(onAddToBundle).toHaveBeenCalledWith("alpha");
  });

  it("shows in-bundle state", () => {
    renderCard("alpha/plugin/alpha", { onAddToBundle: vi.fn(), inBundle: true });
    expect(screen.getByRole("button", { name: /alpha in bundle/i })).toBeDisabled();
  });
});
