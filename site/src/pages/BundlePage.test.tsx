import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useBundle } from "../bundle/useBundle";
import { CATALOG } from "../test/fixtureCatalog";
import { renderAt } from "../test/renderWithRouter";
import { BundlePage } from "./BundlePage";

afterEach(() => localStorage.clear());

function Harness() {
  const bundle = useBundle();
  return <BundlePage catalog={CATALOG} bundle={bundle} />;
}

const renderBundle = (path = "/bundle") => renderAt(path, [{ path: "/bundle", element: <Harness /> }]);

describe("BundlePage", () => {
  it("loads the selection from ?p and shows totals, trust and notes", () => {
    renderBundle("/bundle?p=alpha,beta");
    const list = screen.getByRole("list", { name: "Selected plugins" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("≈ 101 tokens")).toBeInTheDocument();
    for (const badge of ["hooks", "mcp", "bin", "secrets"]) expect(screen.getAllByText(badge).length).toBeGreaterThan(0);
    expect(screen.getByText(/workspace trust prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/do not auto-update/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /share/i }).getAttribute("href")).toContain("p=alpha%2Cbeta");
  });

  it("shows settings.json by default and the script on its tab", async () => {
    renderBundle("/bundle?p=alpha,beta");
    const output = () => screen.getByTestId("bundle-output").textContent ?? "";
    expect(output()).toContain('"alpha@awesome-skills-marketplace": true');
    expect(output()).toContain('"beta@awesome-skills-marketplace": true');
    await userEvent.click(screen.getByRole("tab", { name: /shell script/i }));
    expect(output()).toContain("claude plugin install beta@awesome-skills-marketplace --scope project");
  });

  it("removes plugins", async () => {
    renderBundle("/bundle?p=alpha,beta");
    await userEvent.click(screen.getByRole("button", { name: "Remove alpha" }));
    expect(within(screen.getByRole("list", { name: "Selected plugins" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("ignores unknown plugins in the link", () => {
    renderBundle("/bundle?p=alpha,nope");
    expect(within(screen.getByRole("list", { name: "Selected plugins" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows an empty state", () => {
    renderBundle();
    expect(screen.getByText(/your bundle is empty/i)).toBeInTheDocument();
  });

  it("keeps a stored selection when there is no ?p", () => {
    const { result } = renderHook(() => useBundle());
    act(() => result.current.add("gamma"));
    renderBundle();
    expect(screen.getByRole("link", { name: "gamma" })).toBeInTheDocument();
  });
});
