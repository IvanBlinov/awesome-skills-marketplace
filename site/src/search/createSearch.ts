import MiniSearch from "minisearch";
import type { Artifact, ArtifactType } from "../catalog/types";
import { parseQuery } from "./parseQuery";

/** Facet selections. Within a facet any selected value matches; keywords must all match. */
export interface Filters {
  types: ArtifactType[];
  categories: string[];
  keywords: string[];
  authors: string[];
  plugins: string[];
}

export const NO_FILTERS: Filters = { types: [], categories: [], keywords: [], authors: [], plugins: [] };

/** Plugin tags plus the artifact's own keywords — what the Keyword facet lists. */
export function keywordsOf(a: Artifact): string[] {
  return [...new Set([...a.tags, ...a.keywords])];
}

export interface SearchResult {
  results: Artifact[];
  /** True when no artifact matched every term and results match any term. */
  usedFallback: boolean;
  /** Type named in the query ("skill", "agent", …), if any. */
  detectedType: ArtifactType | null;
}

const FIELDS = ["name", "displayName", "keywords", "tags", "description", "plugin", "category", "searchText"];
const BOOST = { name: 4, displayName: 4, keywords: 3, tags: 3, description: 2, plugin: 1.5, category: 1.5, searchText: 1 };

const byRecency = (a: Artifact, b: Artifact) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);

export function createSearch(artifacts: Artifact[]) {
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  const index = new MiniSearch<Artifact>({
    fields: FIELDS,
    extractField: (doc, field) => {
      const value = (doc as unknown as Record<string, unknown>)[field];
      return Array.isArray(value) ? value.join(" ") : (value as string | undefined) ?? "";
    },
    searchOptions: {
      boost: BOOST,
      prefix: true,
      // 0.3 on longer terms so one transposition ("raliway") still matches.
      fuzzy: (term) => (term.length >= 6 ? 0.3 : 0.2),
    },
  });
  index.addAll(artifacts);

  return function search(q: string, filters: Filters): SearchResult {
    const { terms, typeFilter } = parseQuery(q);
    const types = filters.types.length ? filters.types : typeFilter ? [typeFilter] : [];
    const passes = (a: Artifact) =>
      (types.length === 0 || types.includes(a.type)) &&
      (filters.categories.length === 0 || filters.categories.includes(a.category)) &&
      (filters.authors.length === 0 || (a.author !== undefined && filters.authors.includes(a.author))) &&
      (filters.plugins.length === 0 || filters.plugins.includes(a.plugin)) &&
      filters.keywords.every((k) => keywordsOf(a).includes(k));

    if (terms.length === 0) {
      return { results: artifacts.filter(passes).sort(byRecency), usedFallback: false, detectedType: typeFilter };
    }

    const run = (combineWith: "AND" | "OR") =>
      index
        .search(terms.join(" "), { combineWith, filter: (r) => passes(byId.get(r.id as string)!) })
        .map((r) => byId.get(r.id as string)!);

    const strict = run("AND");
    const results = strict.length ? strict : run("OR");
    return { results, usedFallback: strict.length === 0 && results.length > 0, detectedType: typeFilter };
  };
}
