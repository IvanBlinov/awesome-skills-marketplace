import { existsSync, realpathSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  HookMatcher,
  HooksConfig,
  MarketplaceEntry,
  MarketplaceFile,
  McpServerConfig,
  PathSpec,
  PluginManifest,
} from "./types";

export interface ResolvedPlugin {
  entry: MarketplaceEntry;
  manifest: PluginManifest;
  /** Repo-relative plugin directory. */
  dir: string;
  skillFiles: string[];
  agentFiles: string[];
  commandFiles: string[];
  hooks: Record<string, HookMatcher[]>;
  mcpServers: Record<string, McpServerConfig>;
  /** MCP sources that were declared but not parsed (.mcpb bundles, URLs). */
  uninspectedMcp: string[];
  hasBin: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
}

async function readJson<T>(file: string): Promise<T> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new Error(`${file}: file not found`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`${file}: invalid JSON (${(e as Error).message})`);
  }
}

export async function loadMarketplace(root: string): Promise<MarketplaceFile> {
  const file = path.join(root, ".claude-plugin/marketplace.json");
  const mp = await readJson<MarketplaceFile>(file);
  if (!mp.name || !Array.isArray(mp.plugins)) {
    throw new Error(`${file}: "name" and "plugins" are required`);
  }
  return mp;
}

const toPosix = (p: string) => p.split(path.sep).join("/");

/** Throws unless `abs` is `base` or inside it (lexically, and after following symlinks if it exists). */
function assertInside(abs: string, base: string, what: string): void {
  const within = (a: string, b: string) => {
    const rel = path.relative(b, a);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  };
  // A path that does not exist cannot be read, so only the lexical check applies to it.
  const escapesViaSymlink = existsSync(abs) && existsSync(base) && !within(realpathSync(abs), realpathSync(base));
  if (!within(abs, base) || escapesViaSymlink) {
    throw new Error(`${what} resolves outside ${base}`);
  }
}
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

async function walkMarkdown(absDir: string): Promise<string[]> {
  if (!isDir(absDir)) return [];
  const entries = await readdir(absDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(absDir, e.name);
      if (e.isDirectory()) return walkMarkdown(full);
      return Promise.resolve(e.name.endsWith(".md") ? [full] : []);
    }),
  );
  return nested.flat();
}

/** Files for agents/commands: each spec entry is a .md file or a directory of them. */
async function markdownFiles(pluginAbs: string, specs: string[]): Promise<string[]> {
  const lists = await Promise.all(
    specs.map((spec) => {
      const abs = path.join(pluginAbs, spec);
      assertInside(abs, pluginAbs, `path "${spec}"`);
      return isDir(abs) ? walkMarkdown(abs) : Promise.resolve(existsSync(abs) && abs.endsWith(".md") ? [abs] : []);
    }),
  );
  return lists.flat();
}

/** Each skills spec entry is a skill dir (has SKILL.md) or a dir of skill dirs. */
async function skillFiles(pluginAbs: string, specs: string[]): Promise<string[]> {
  const lists = await Promise.all(
    specs.map(async (spec) => {
      const abs = path.join(pluginAbs, spec);
      assertInside(abs, pluginAbs, `path "${spec}"`);
      if (existsSync(path.join(abs, "SKILL.md"))) return [path.join(abs, "SKILL.md")];
      if (!isDir(abs)) return [];
      const entries = await readdir(abs, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && existsSync(path.join(abs, e.name, "SKILL.md")))
        .map((e) => path.join(abs, e.name, "SKILL.md"));
    }),
  );
  return lists.flat();
}

function mergeHooks(a: HooksConfig, b: HooksConfig): HooksConfig {
  return Object.entries(b).reduce<HooksConfig>(
    (acc, [event, matchers]) => ({ ...acc, [event]: [...(acc[event] ?? []), ...matchers] }),
    a,
  );
}

async function loadHooks(pluginAbs: string, manifest: PluginManifest): Promise<HooksConfig> {
  const defaultFile = path.join(pluginAbs, "hooks/hooks.json");
  const sources = [...(existsSync(defaultFile) ? ["./hooks/hooks.json"] : []), ...asArray(manifest.hooks)];
  const configs = await Promise.all(
    sources.map(async (src) => {
      if (typeof src === "string") assertInside(path.join(pluginAbs, src), pluginAbs, `path "${src}"`);
      const raw = typeof src === "string" ? await readJson<Record<string, unknown>>(path.join(pluginAbs, src)) : src;
      return ((raw as { hooks?: HooksConfig }).hooks ?? raw) as HooksConfig;
    }),
  );
  return configs.reduce(mergeHooks, {});
}

async function loadMcp(pluginAbs: string, manifest: PluginManifest): Promise<Record<string, McpServerConfig>> {
  const defaultFile = path.join(pluginAbs, ".mcp.json");
  const sources = [...(existsSync(defaultFile) ? ["./.mcp.json"] : []), ...asArray(manifest.mcpServers)];
  const maps = await Promise.all(
    sources.map(async (src) => {
      if (typeof src !== "string") return src;
      if (!src.endsWith(".json")) return {}; // reported via uninspectedMcp
      assertInside(path.join(pluginAbs, src), pluginAbs, `path "${src}"`);
      const raw = await readJson<Record<string, unknown>>(path.join(pluginAbs, src));
      return ((raw as { mcpServers?: Record<string, McpServerConfig> }).mcpServers ?? raw) as Record<string, McpServerConfig>;
    }),
  );
  return maps.reduce((acc, m) => ({ ...acc, ...m }), {});
}

export async function resolvePlugin(root: string, entry: MarketplaceEntry): Promise<ResolvedPlugin> {
  if (typeof entry.source !== "string") {
    throw new Error(`plugin "${entry.name}": only relative-path sources are indexed`);
  }
  const pluginAbs = path.resolve(root, entry.source);
  assertInside(pluginAbs, root, `plugin "${entry.name}" source`);
  const manifestFile = path.join(pluginAbs, ".claude-plugin/plugin.json");
  const own = existsSync(manifestFile) ? await readJson<PluginManifest>(manifestFile) : undefined;
  const manifest: PluginManifest = { ...(entry as PluginManifest), ...(own ?? {}) };

  // commands/agents in plugin.json replace the default dir; skills add to it.
  const skillSpecs = ["./skills", ...asArray(manifest.skills as PathSpec | undefined)];
  const agentSpecs = manifest.agents ? asArray(manifest.agents) : ["./agents"];
  const commandSpecs =
    manifest.commands && (typeof manifest.commands === "string" || Array.isArray(manifest.commands))
      ? asArray(manifest.commands)
      : ["./commands"];

  const rel = (abs: string) => {
    assertInside(abs, root, `file ${toPosix(path.relative(root, abs))}`);
    return toPosix(path.relative(root, abs));
  };
  const readme = path.join(pluginAbs, "README.md");
  if (existsSync(readme)) assertInside(readme, root, `file ${rel(pluginAbs)}/README.md`);
  const relSorted = (files: string[]) => [...new Set(files.map(rel))].sort();

  return {
    entry,
    manifest,
    dir: rel(pluginAbs),
    skillFiles: relSorted(await skillFiles(pluginAbs, skillSpecs)),
    agentFiles: relSorted(await markdownFiles(pluginAbs, agentSpecs)),
    commandFiles: relSorted(await markdownFiles(pluginAbs, commandSpecs)),
    hooks: await loadHooks(pluginAbs, manifest),
    mcpServers: await loadMcp(pluginAbs, manifest),
    uninspectedMcp: asArray(manifest.mcpServers).filter(
      (src): src is string => typeof src === "string" && !src.endsWith(".json"),
    ),
    hasBin: isDir(path.join(pluginAbs, "bin")),
    hasReadme: existsSync(path.join(pluginAbs, "README.md")),
    hasLicense: ["LICENSE", "LICENSE.md", "LICENSE.txt"].some((f) => existsSync(path.join(pluginAbs, f))),
  };
}
