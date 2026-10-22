import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
import { resetCatalogCache } from "./catalog/useCatalog";
import { CATALOG } from "./test/fixtureCatalog";

afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCache();
});

const renderApp = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe("App", () => {
  it("shows a loading state, then the search page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG))));
    renderApp();
    expect(screen.getByText(/loading the catalog/i)).toBeInTheDocument();
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a skill/i })).toBeInTheDocument();
  });

  it("shows an error with a retry hint when the catalog fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(/HTTP 500/);
  });
});

describe("App routes", () => {
  it("renders the detail page for deep links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(new Response(url.endsWith("catalog.json") ? JSON.stringify(CATALOG) : "# Body")),
      ),
    );
    renderApp("/a/gamma/skill/notes");
    expect(await screen.findByRole("heading", { level: 1, name: "notes" })).toBeInTheDocument();
  });
});

describe("App bundle wiring", () => {
  it("adds a plugin from search and counts it in the nav", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG))));
    renderApp();
    await screen.findByRole("searchbox");
    await userEvent.click(screen.getAllByRole("button", { name: "Add gamma to bundle" })[0]);
    expect(screen.getByRole("link", { name: "Bundle (1)" })).toBeInTheDocument();
    localStorage.clear();
  });

  it("shows not found for unknown routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG))));
    renderApp("/nope");
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });
});
