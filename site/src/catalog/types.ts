export const ARTIFACT_TYPES = ["plugin", "skill", "agent", "command", "hook", "mcp"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface TrustReport {
  hasHooks: boolean;
  hookEvents: string[];
  hasMcp: boolean;
  mcpServers: string[];
  hasBin: boolean;
  requiresSecrets: string[];
  requiresConfig: string[];
  networkCommands: boolean;
  level: "none" | "low" | "review";
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  displayName?: string;
  description: string;
  plugin: string;
  category: string;
  tags: string[];
  keywords: string[];
  path: string;
  sourceUrl: string;
  updatedAt: string;
  version?: string;
  author?: string;
  invocation?: string;
  install: { add: string; install: string };
  searchText: string;
  bodyTokens?: number;
  contextTokens?: number;
  trust?: TrustReport;
  dependencies?: string[];
  children?: string[];
  hook?: { event: string; matcher?: string; commands: string[] };
  mcp?: { transport: "stdio" | "http" | "sse"; command?: string; url?: string };
}

export interface Catalog {
  schemaVersion: 1;
  generatedAt: string;
  marketplace: {
    name: string;
    repo: string;
    description: string;
    addCommand: string;
  };
  categories: string[];
  artifacts: Artifact[];
}

/** File name of an artifact's Markdown body under `content/`. */
export function contentFileName(id: string): string {
  return `${id.replaceAll("/", "__")}.md`;
}
