import { ARTIFACT_TYPES, type ArtifactType } from "../catalog/types";
import type { Filters } from "../search/createSearch";

export interface SearchState extends Filters {
  q: string;
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const isType = (t: string): t is ArtifactType => (ARTIFACT_TYPES as readonly string[]).includes(t);

export function readSearchState(search: string): SearchState {
  const p = new URLSearchParams(search);
  return {
    q: p.get("q") ?? "",
    types: list(p.get("type")).filter(isType),
    categories: list(p.get("category")),
    // `tag` is the pre-facet name of this parameter; keep old links working.
    keywords: list(p.get("keyword") ?? p.get("tag")),
    authors: list(p.get("author")),
    plugins: list(p.get("plugin")),
  };
}

export function writeSearchState(s: SearchState): string {
  const entries: [string, string][] = [
    ["q", s.q],
    ["type", s.types.join(",")],
    ["category", s.categories.join(",")],
    ["keyword", s.keywords.join(",")],
    ["author", s.authors.join(",")],
    ["plugin", s.plugins.join(",")],
  ];
  const str = new URLSearchParams(entries.filter(([, v]) => v !== "")).toString();
  return str ? `?${str}` : "";
}
