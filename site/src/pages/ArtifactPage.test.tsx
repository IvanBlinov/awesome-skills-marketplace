import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../test/fixtureCatalog";
import { renderAt } from "../test/renderWithRouter";
import { ArtifactPage } from "./ArtifactPage";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("# Deploy to Railway\n\nRun it."));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderDetail = (id: string, props = {}) =>
  renderAt(`/a/${id}`, [
    { path: "/a/*", element: <ArtifactPage catalog={CATALOG} {...props} /> },
    { path: "/", element: <p>home</p> },
  ]);

describe("ArtifactPage", () => {
  it("renders a skill with install commands and body", async () => {
    renderDetail("alpha/skill/deploy-railway");
    expect(screen.getByRole("heading", { level: 1, name: "deploy-railway" })).toBeInTheDocument();
    expect(screen.getByText("/plugin install alpha@awesome-skills-marketplace")).toBeInTheDocument();
    expect(screen.getByText("/plugin marketplace add IvanBlinov/awesome-skills-marketplace")).toBeInTheDocument();
    expect(screen.getByText("/alpha:deploy-railway")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Deploy to Railway" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}content/alpha__skill__deploy-railway.md`);
  });

  it("renders a plugin with children, trust panel and context table", async () => {
    renderDetail("alpha/plugin/alpha");
    const contents = screen.getByRole("region", { name: "Contents" });
    expect(within(contents).getByRole("link", { name: "deploy-railway" })).toHaveAttribute(
      "href",
      "/a/alpha/skill/deploy-railway",
    );
    expect(within(contents).getByRole("heading", { name: "Agents" })).toBeInTheDocument();
    const trust = screen.getByRole("region", { name: "What it runs on your machine" });
    expect(within(trust).getByText("curl -s https://example.com")).toBeInTheDocument();
    expect(within(trust).getByText(/API_KEY/)).toBeInTheDocument();
    expect(within(trust).getByText(/network/i)).toBeInTheDocument();
    const cost = screen.getByRole("region", { name: "Context cost" });
    expect(within(cost).getByText("≈ 61 tokens")).toBeInTheDocument();
    expect(within(cost).getByRole("cell", { name: "deploy-railway" })).toBeInTheDocument();
    await screen.findByText("Run it.");
  });

  it("says a plain plugin runs nothing", () => {
    renderDetail("gamma/plugin/gamma");
    const trust = screen.getByRole("region", { name: "What it runs on your machine" });
    expect(within(trust).getByText(/no hooks, MCP servers or executables/i)).toBeInTheDocument();
  });

  it("renders a hook without fetching a body", () => {
    renderDetail("alpha/hook/PreToolUse-1");
    expect(screen.getByText("PreToolUse")).toBeInTheDocument();
    expect(screen.getByText("Bash")).toBeInTheDocument();
    expect(screen.getByText("curl -s https://example.com")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an mcp server", () => {
    renderDetail("alpha/mcp/db");
    expect(screen.getByText("stdio")).toBeInTheDocument();
    expect(screen.getByText("${CLAUDE_PLUGIN_ROOT}/scripts/db-server")).toBeInTheDocument();
  });

  it("shows not found for unknown ids", () => {
    renderDetail("nope/skill/nope");
    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to search/i })).toHaveAttribute("href", "/");
  });

  it("shows a fallback when the body fails to load", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    renderDetail("alpha/skill/deploy-railway");
    expect(await screen.findByText(/could not load the content/i)).toBeInTheDocument();
  });

  it("offers add to bundle", () => {
    renderDetail("alpha/skill/deploy-railway", { onAddToBundle: vi.fn(), isInBundle: () => false });
    expect(screen.getByRole("button", { name: /add alpha to bundle/i })).toBeInTheDocument();
  });
});
