import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSearch, NO_FILTERS } from "../search/createSearch";
import { facetCounts } from "../search/facets";
import { ARTIFACTS } from "../test/fixtureCatalog";
import { FacetSidebar } from "./FacetSidebar";

const counts = facetCounts(createSearch(ARTIFACTS), "", NO_FILTERS);

describe("FacetSidebar", () => {
  it("shows a section per facet with a checkbox and count per value", () => {
    render(<FacetSidebar counts={counts} filters={NO_FILTERS} detectedType={null} onChange={vi.fn()} />);
    for (const name of ["Kind", "Keyword", "Category", "Author", "Plugin"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    const kind = screen.getByRole("group", { name: "Kind" });
    expect(within(kind).getByRole("checkbox", { name: "skill 3" })).not.toBeChecked();
    expect(within(screen.getByRole("group", { name: "Plugin" })).getByRole("checkbox", { name: "alpha 6" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Category" })).getByRole("checkbox", { name: "DevOps & Cloud 6" })).toBeInTheDocument();
  });

  it("toggles a value", async () => {
    const onChange = vi.fn();
    render(
      <FacetSidebar counts={counts} filters={{ ...NO_FILTERS, plugins: ["beta"] }} detectedType={null} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "alpha 6" }));
    expect(onChange).toHaveBeenCalledWith("plugins", ["beta", "alpha"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "beta 2" }));
    expect(onChange).toHaveBeenCalledWith("plugins", []);
  });

  it("checks the kind named in the query when no kind is selected", () => {
    render(<FacetSidebar counts={counts} filters={NO_FILTERS} detectedType="skill" onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "skill 3" })).toBeChecked();
  });

  it("shows the first 8 values of a long facet and expands on request", async () => {
    const many = { ...counts, keywords: Array.from({ length: 12 }, (_, i) => ({ value: `k${i}`, count: 12 - i })) };
    render(<FacetSidebar counts={many} filters={NO_FILTERS} detectedType={null} onChange={vi.fn()} />);
    const kw = screen.getByRole("group", { name: "Keyword" });
    expect(within(kw).getAllByRole("checkbox")).toHaveLength(8);
    await userEvent.click(within(kw).getByRole("button", { name: "Show all 12" }));
    expect(within(kw).getAllByRole("checkbox")).toHaveLength(12);
  });

  it("hides facets with no values", () => {
    render(
      <FacetSidebar counts={{ ...counts, authors: [] }} filters={NO_FILTERS} detectedType={null} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole("group", { name: "Author" })).toBeNull();
  });
});
