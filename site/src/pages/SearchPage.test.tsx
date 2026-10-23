import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ISSUE_NEW_URL } from "../config";
import { CATALOG } from "../test/fixtureCatalog";
import { renderAt } from "../test/renderWithRouter";
import { SearchPage } from "./SearchPage";

const renderSearch = (path = "/") => renderAt(path, [{ path: "/", element: <SearchPage catalog={CATALOG} /> }]);
const cardNames = () => screen.getAllByRole("article").map((a) => within(a).getByRole("heading").textContent);

describe("SearchPage", () => {
  it("ranks the spec example and activates the detected type chip", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "I need a skill for deploying to Railway");
    expect(cardNames()[0]).toBe("deploy-railway");
    expect(screen.getByRole("checkbox", { name: /^skill/ })).toBeChecked();
    expect(document.querySelector(".result-bar")?.textContent).toMatch(/\d+ results? for “I need a skill for deploying to Railway”/);
  });

  it("writes the query to the url after a debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSearch();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lint" } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByTestId("location").textContent).toBe("/?q=lint");
    vi.useRealTimers();
  });

  it("restores query and filters from the url", () => {
    renderSearch("/?q=lint&category=quality");
    expect(screen.getByRole("searchbox")).toHaveValue("lint");
    expect(cardNames()).toContain("lint-fast");
    expect(cardNames()).not.toContain("deploy-railway");
  });

  it("toggles type filters", async () => {
    renderSearch();
    await userEvent.click(screen.getByRole("checkbox", { name: /^agent/ }));
    expect(cardNames()).toEqual(["reviewer"]);
    expect(screen.getByTestId("location").textContent).toBe("/?type=agent");
  });

  it("shows the empty state with a prefilled request link", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "zzzqqq");
    expect(screen.getByText(/Nothing found for/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /request this skill/i });
    expect(link.getAttribute("href")).toMatch(new RegExp(`^${ISSUE_NEW_URL}`));
    expect(link.getAttribute("href")).toContain("what=zzzqqq");
  });

  it("notes when results match only some words", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "lint zzzqqq");
    expect(screen.getByText(/match some of your words/i)).toBeInTheDocument();
  });

  it("clears filters", async () => {
    renderSearch("/?q=lint&type=skill");
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getAllByRole("article")).toHaveLength(CATALOG.artifacts.length);
  });

  it("focuses the search box when / is pressed", async () => {
    renderSearch();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("/");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});

describe("SearchPage url sync", () => {
  it("resets when navigating to / from inside the app", async () => {
    const { MemoryRouter, Route, Routes, Link } = await import("react-router-dom");
    const { render } = await import("@testing-library/react");
    render(
      <MemoryRouter initialEntries={["/?q=lint&type=skill"]}>
        <Link to="/">Home</Link>
        <Routes>
          <Route path="/" element={<SearchPage catalog={CATALOG} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("searchbox")).toHaveValue("lint");
    await userEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getAllByRole("article")).toHaveLength(CATALOG.artifacts.length);
  });
});

describe("SearchPage catalog stats", () => {
  it("shows the catalog totals and filters by type when one is clicked", async () => {
    renderSearch();
    const stats = screen.getByRole("group", { name: "Catalog contents" });
    expect(within(stats).getByRole("button", { name: "3 plugins" })).toBeInTheDocument();
    await userEvent.click(within(stats).getByRole("button", { name: "3 skills" }));
    expect(screen.getByTestId("location").textContent).toBe("/?type=skill");
    expect(cardNames()).toEqual(expect.arrayContaining(["deploy-railway", "lint-fast", "notes"]));
    expect(cardNames()).toHaveLength(3);
    await userEvent.click(within(stats).getByRole("button", { name: "3 skills" }));
    expect(screen.getByTestId("location").textContent).toBe("/");
  });
});
