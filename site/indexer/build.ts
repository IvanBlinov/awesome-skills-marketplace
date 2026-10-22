import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADD_COMMAND, MARKETPLACE_NAME, REPO, SOURCE_BASE_URL } from "../src/config";
import type { Artifact, ArtifactType, Catalog } from "../src/catalog/types";
import { gitLastModified } from "./git";
import { loadMarketplace, resolvePlugin, type ResolvedPlugin } from "./manifest";
import { estimateTokens, MAX_SEARCH_TEXT, parseMarkdownArtifact, stripMarkdown } from "./markdown";
import { buildTrustReport, hookCommandText } from "./trust";
import type { McpServerConfig } from "./types";

export interface BuildOptions {
  lastModified?: (relPath: string) => string;
  now?: () => Date;
}

export interface BuildResult {
  catalog: Catalog;
  /** Markdown body per artifact id (plugins: README). */
  bodies: Record<string, string>;
}

interface Built {
  artifact: Artifact;
  body?: string;
}

type Common = Pick<
  Artifact,
  "plugin" | "category" | "tags" | "version" | "author" | "install" | "updatedAt" | "path" | "sourceUrl"
>;

const COUNTED_IN_CONTEXT: ArtifactType[] = ["skill", "agent", "command"];

function dependencyNames(deps: unknown[] | undefined): string[] | undefined {
  const names = (deps ?? []).map((d) =>
    typeof d === "string" ? d : (d as { name?: string })?.name ?? "",
  );
  const clean = names.filter(Boolean);
  return clean.length ? clean : undefined;
}

function mcpInfo(cfg: McpServerConfig): NonNullable<Artifact["mcp"]> {
  if (cfg.type === "http" || cfg.type === "sse") return { transport: cfg.type, url: cfg.url };
  if (cfg.url && !cfg.command) return { transport: "http", url: cfg.url };
  return { transport: "stdio", command: [cfg.command ?? "", ...(cfg.args ?? [])].join(" ").trim() };
}

async function markdownArtifacts(
  root: string,
  p: ResolvedPlugin,
  type: "skill" | "agent" | "command",
  files: string[],
  common: (relPath: string) => Common,
): Promise<Built[]> {
  return Promise.all(
    files.map(async (rel) => {
      const md = await parseMarkdownArtifact(path.join(root, rel));
      const fallbackName =
        type === "skill" ? path.posix.basename(path.posix.dirname(rel)) : path.posix.basename(rel, ".md");
      const name = type === "command" ? fallbackName : md.name ?? fallbackName;
      const invocation = type === "agent" ? `${p.entry.name}:${name}` : `/${p.entry.name}:${name}`;
      return {
        artifact: {
          ...common(rel),
          id: `${p.entry.name}/${type}/${name}`,
          type,
          name,
          description: md.description ?? "",
          keywords: md.keywords,
          invocation,
          searchText: md.plainText,
          bodyTokens: estimateTokens(md.body),
        },
        body: md.body,
      };
    }),
  );
}

function hookArtifacts(p: ResolvedPlugin, common: (relPath: string) => Common): Built[] {
  return Object.entries(p.hooks).flatMap(([event, matchers]) =>
    matchers.map((m, i) => {
      const commands = m.hooks.map(hookCommandText).filter(Boolean);
      const name = `${event}-${i + 1}`;
      return {
        artifact: {
          ...common(m.source ?? `${p.dir}/.claude-plugin/plugin.json`),
          id: `${p.entry.name}/hook/${name}`,
          type: "hook" as const,
          name,
          description: `${event} hook${m.matcher ? ` on ${m.matcher}` : ""}`,
          keywords: [event],
          searchText: commands.join(" ").slice(0, MAX_SEARCH_TEXT),
          hook: { event, ...(m.matcher ? { matcher: m.matcher } : {}), commands },
        },
      };
    }),
  );
}

function mcpArtifacts(p: ResolvedPlugin, common: (relPath: string) => Common): Built[] {
  return Object.entries(p.mcpServers).map(([server, cfg]) => {
    const mcp = mcpInfo(cfg);
    return {
      artifact: {
        ...common(p.mcpSources[server] ?? `${p.dir}/.claude-plugin/plugin.json`),
        id: `${p.entry.name}/mcp/${server}`,
        type: "mcp" as const,
        name: server,
        description: `MCP server ${server} (${mcp.transport})`,
        keywords: ["mcp", server],
        searchText: [mcp.command, mcp.url].filter(Boolean).join(" "),
        mcp,
      },
    };
  });
}

async function pluginArtifacts(root: string, p: ResolvedPlugin, opts: Required<BuildOptions>): Promise<Built[]> {
  const { entry, manifest } = p;
  const common = (relPath: string): Common => ({
    plugin: entry.name,
    category: entry.category ?? "",
    tags: entry.tags ?? [],
    version: manifest.version,
    author: manifest.author?.name,
    install: { add: ADD_COMMAND, install: `/plugin install ${entry.name}@${MARKETPLACE_NAME}` },
    updatedAt: opts.lastModified(relPath),
    path: relPath,
    sourceUrl: `${SOURCE_BASE_URL}${relPath}`,
  });

  const children = [
    ...(await markdownArtifacts(root, p, "skill", p.skillFiles, common)),
    ...(await markdownArtifacts(root, p, "agent", p.agentFiles, common)),
    ...(await markdownArtifacts(root, p, "command", p.commandFiles, common)),
    ...hookArtifacts(p, common),
    ...mcpArtifacts(p, common),
  ];
  const childArtifacts = children.map((c) => c.artifact);
  const readme = p.hasReadme ? await readFile(path.join(root, p.dir, "README.md"), "utf8") : "";

  const plugin: Built = {
    artifact: {
      ...common(p.dir),
      id: `${entry.name}/plugin/${entry.name}`,
      type: "plugin",
      name: entry.name,
      displayName: entry.displayName ?? manifest.displayName,
      description: entry.description ?? manifest.description ?? "",
      keywords: manifest.keywords ?? [],
      searchText: stripMarkdown(readme).slice(0, MAX_SEARCH_TEXT),
      contextTokens: childArtifacts
        .filter((a) => COUNTED_IN_CONTEXT.includes(a.type))
        .reduce((n, a) => n + estimateTokens(a.name + a.description), 0),
      trust: buildTrustReport(p),
      dependencies: dependencyNames(manifest.dependencies),
      children: childArtifacts.map((a) => a.id).sort(),
    },
    body: readme,
  };
  return [plugin, ...children];
}

export async function buildCatalog(root: string, options: BuildOptions = {}): Promise<BuildResult> {
  const opts: Required<BuildOptions> = {
    lastModified: options.lastModified ?? ((rel) => gitLastModified(root, rel)),
    now: options.now ?? (() => new Date()),
  };
  const mp = await loadMarketplace(root);
  const plugins = await Promise.all(mp.plugins.map((e) => resolvePlugin(root, e)));
  const built = (await Promise.all(plugins.map((p) => pluginArtifacts(root, p, opts)))).flat();
  const sorted = [...built].sort((a, b) => a.artifact.id.localeCompare(b.artifact.id));

  const ids = sorted.map((b) => b.artifact.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`duplicate artifact ids: ${[...new Set(dupes)].join(", ")}`);

  return {
    catalog: {
      schemaVersion: 1,
      generatedAt: opts.now().toISOString(),
      marketplace: {
        name: mp.name,
        repo: REPO,
        description: mp.description ?? "",
        addCommand: ADD_COMMAND,
      },
      categories: [...new Set(mp.plugins.map((e) => e.category).filter((c): c is string => !!c))].sort(),
      artifacts: sorted.map((b) => b.artifact),
    },
    bodies: Object.fromEntries(sorted.filter((b) => b.body !== undefined).map((b) => [b.artifact.id, b.body!])),
  };
}
