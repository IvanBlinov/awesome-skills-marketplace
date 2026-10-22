import { existsSync } from "node:fs";
import path from "node:path";
import { CATEGORIES } from "../src/catalog/categories";
import { loadMarketplace, resolvePlugin, type ResolvedPlugin } from "./manifest";
import { parseMarkdownArtifact } from "./markdown";
import type { MarketplaceEntry } from "./types";

const NAME_RE = /^[a-z0-9-]+$/;
const RESERVED_RE = /claude|anthropic/;
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

function entryErrors(e: MarketplaceEntry): string[] {
  const tags = e.tags ?? [];
  const tagsOk = tags.length >= 1 && tags.length <= 8 && tags.every((t) => typeof t === "string" && t === t.toLowerCase());
  return [
    ...(e.category && CATEGORY_IDS.has(e.category) ? [] : [`plugin "${e.name}": unknown category "${e.category ?? ""}"`]),
    ...(tagsOk ? [] : [`plugin "${e.name}": tags must be 1–8 lowercase strings`]),
  ];
}

function pluginFileErrors(root: string, p: ResolvedPlugin): string[] {
  if (!existsSync(path.join(root, p.dir, ".claude-plugin/plugin.json"))) {
    return [`${p.dir}: .claude-plugin/plugin.json missing`];
  }
  const m = p.manifest;
  const missing = (["version", "description", "license"] as const).filter((k) => !m[k]);
  return [
    ...(m.name === p.entry.name ? [] : [`${p.dir}: plugin.json name "${m.name}" differs from marketplace entry "${p.entry.name}"`]),
    ...missing.map((k) => `${p.dir}: plugin.json "${k}" missing`),
    ...(m.author?.name ? [] : [`${p.dir}: plugin.json "author.name" missing`]),
    ...(p.hasReadme ? [] : [`${p.dir}: README.md missing`]),
    ...(p.hasLicense ? [] : [`${p.dir}: LICENSE missing`]),
  ];
}

interface NamedFile {
  file: string;
  name: string;
  errors: string[];
}

async function markdownNameErrors(root: string, rel: string, kind: "skill" | "agent"): Promise<NamedFile> {
  const fallback = kind === "skill" ? path.posix.basename(path.posix.dirname(rel)) : path.posix.basename(rel, ".md");
  try {
    const md = await parseMarkdownArtifact(path.join(root, rel));
    const name = md.name ?? fallback;
    const desc = md.description ?? "";
    const nameOk = name.length <= 64 && NAME_RE.test(name) && !RESERVED_RE.test(name);
    return {
      file: rel,
      name,
      errors: [
        ...(nameOk ? [] : [`${rel}: name "${name}" must be ≤ 64 chars of a-z, 0-9, "-" and not contain claude/anthropic`]),
        ...(desc.length >= 20 && desc.length <= 1024 ? [] : [`${rel}: description must be 20–1024 chars (has ${desc.length})`]),
      ],
    };
  } catch (e) {
    return { file: rel, name: fallback, errors: [(e as Error).message.replace(root + path.sep, "")] };
  }
}

function duplicateNameErrors(files: NamedFile[]): string[] {
  return files.flatMap((f, i) => {
    const first = files.findIndex((g) => g.name === f.name);
    return first < i ? [`${f.file}: skill name "${f.name}" already used by ${files[first].file}`] : [];
  });
}

/** Human-readable convention violations (spec §5); empty means the repo is valid. */
export async function checkConventions(root: string): Promise<string[]> {
  try {
    const mp = await loadMarketplace(root);
    const plugins = await Promise.all(mp.plugins.map((e) => resolvePlugin(root, e)));
    const named = await Promise.all(
      plugins.flatMap((p) => [
        ...p.skillFiles.map((f) => markdownNameErrors(root, f, "skill")),
        ...p.agentFiles.map((f) => markdownNameErrors(root, f, "agent")),
      ]),
    );
    return [
      ...mp.plugins.flatMap(entryErrors),
      ...plugins.flatMap((p) => pluginFileErrors(root, p)),
      ...named.flatMap((n) => n.errors),
      ...duplicateNameErrors(named),
    ];
  } catch (e) {
    return [(e as Error).message];
  }
}
