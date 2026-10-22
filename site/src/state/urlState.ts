import { ARTIFACT_TYPES, type ArtifactType } from "../catalog/types";

export interface SearchState {
  q: string;
  types: ArtifactType[];
  category: string | null;
  tags: string[];
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const isType = (t: string): t is ArtifactType => (ARTIFACT_TYPES as readonly string[]).includes(t);

export function readSearchState(search: string): SearchState {
  const p = new URLSearchParams(search);
  return {
    q: p.get("q") ?? "",
    types: list(p.get("type")).filter(isType),
    category: p.get("category") || null,
    tags: list(p.get("tag")),
  };
}

export function writeSearchState(s: SearchState): string {
  const entries: [string, string][] = [
    ["q", s.q],
    ["type", s.types.join(",")],
    ["category", s.category ?? ""],
    ["tag", s.tags.join(",")],
  ];
  const p = new URLSearchParams(entries.filter(([, v]) => v !== ""));
  const str = p.toString();
  return str ? `?${str}` : "";
}
