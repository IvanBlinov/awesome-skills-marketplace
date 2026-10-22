import type { ArtifactType } from "../catalog/types";
import { STOPWORDS, TYPE_WORDS } from "./stopwords";

export interface ParsedQuery {
  terms: string[];
  typeFilter: ArtifactType | null;
}

export function parseQuery(input: string): ParsedQuery {
  const words = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const typeFilter = words.map((w) => TYPE_WORDS[w]).find(Boolean) ?? null;
  const terms = words.filter((w) => !TYPE_WORDS[w] && !STOPWORDS.has(w));
  return { terms, typeFilter };
}
