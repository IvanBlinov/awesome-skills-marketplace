import type { Artifact } from "../catalog/types";
import { keywordsOf, type Filters, type SearchResult } from "./createSearch";

export type FacetKey = keyof Filters;

export interface FacetValue {
  value: string;
  count: number;
}

export type FacetCounts = Record<FacetKey, FacetValue[]>;

type Search = (q: string, filters: Filters) => SearchResult;

const VALUES: Record<FacetKey, (a: Artifact) => string[]> = {
  types: (a) => [a.type],
  categories: (a) => [a.category],
  keywords: keywordsOf,
  authors: (a) => (a.author ? [a.author] : []),
  plugins: (a) => [a.plugin],
};

/** Display order for kinds; other facets sort by count, then name. */
const TYPE_ORDER = ["plugin", "skill", "agent", "command", "hook", "mcp"];

function count(results: Artifact[], key: FacetKey, selected: string[]): FacetValue[] {
  const counts = results
    .flatMap(VALUES[key])
    .reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
  const withSelected = selected.reduce((acc, v) => ({ [v]: 0, ...acc }), counts);
  const order =
    key === "types"
      ? (a: FacetValue, b: FacetValue) => TYPE_ORDER.indexOf(a.value) - TYPE_ORDER.indexOf(b.value)
      : (a: FacetValue, b: FacetValue) => b.count - a.count || a.value.localeCompare(b.value);
  return Object.entries(withSelected)
    .map(([value, n]) => ({ value, count: n }))
    .sort(order);
}

/**
 * Counts for each facet value among the results of `q`. Each facet is counted with every
 * other facet's selection applied but not its own, so its unselected values stay useful.
 */
export function facetCounts(search: Search, q: string, filters: Filters): FacetCounts {
  const keys = Object.keys(VALUES) as FacetKey[];
  return Object.fromEntries(
    keys.map((key) => {
      const { results } = search(q, { ...filters, [key]: [] });
      return [key, count(results, key, filters[key] as string[])];
    }),
  ) as FacetCounts;
}
