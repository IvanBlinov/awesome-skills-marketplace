import { readFile } from "node:fs/promises";
import matter from "gray-matter";

export const MAX_SEARCH_TEXT = 4000;

export interface MarkdownArtifact {
  name?: string;
  description?: string;
  keywords: string[];
  body: string;
  plainText: string;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1") // fenced code: keep contents
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/<[^>]+>/g, " ") // html tags
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "") // headings, quotes, list markers
    .replace(/[`*_~#\[\]()|]/g, "") // remaining inline syntax
    .replace(/\s+/g, " ")
    .trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function parseMarkdownArtifact(absPath: string): Promise<MarkdownArtifact> {
  const raw = await readFile(absPath, "utf8");
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (e) {
    throw new Error(`${absPath}: invalid frontmatter (${(e as Error).message})`);
  }
  const { data, content } = parsed;
  const keywords = data.keywords ?? [];
  if (!Array.isArray(keywords) || !keywords.every((k) => typeof k === "string")) {
    throw new Error(`${absPath}: keywords must be an array of strings`);
  }
  return {
    name: optionalString(data.name),
    description: optionalString(data.description),
    keywords,
    body: content,
    plainText: stripMarkdown(content).slice(0, MAX_SEARCH_TEXT),
  };
}
