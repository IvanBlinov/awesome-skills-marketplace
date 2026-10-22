import type { Artifact, Catalog, TrustReport } from "../catalog/types";

const NONE: TrustReport = {
  hasHooks: false, hookEvents: [], hasMcp: false, mcpServers: [], hasBin: false,
  requiresSecrets: [], requiresConfig: [], networkCommands: false, level: "none",
};

function art(partial: Partial<Artifact> & Pick<Artifact, "id" | "type" | "name" | "plugin">): Artifact {
  return {
    description: "",
    category: "devops",
    tags: [],
    keywords: [],
    path: `plugins/${partial.plugin}`,
    sourceUrl: `https://github.com/IvanBlinov/awesome-skills-marketplace/blob/main/plugins/${partial.plugin}`,
    updatedAt: "2026-10-01T00:00:00Z",
    install: {
      add: "/plugin marketplace add IvanBlinov/awesome-skills-marketplace",
      install: `/plugin install ${partial.plugin}@awesome-skills-marketplace`,
    },
    searchText: "",
    ...partial,
  };
}

export const ALPHA_TRUST: TrustReport = {
  hasHooks: true, hookEvents: ["PreToolUse"], hasMcp: true, mcpServers: ["db"], hasBin: true,
  requiresSecrets: ["API_KEY"], requiresConfig: ["REGION"], networkCommands: true, level: "review",
};

export const ARTIFACTS: Artifact[] = [
  art({
    id: "alpha/plugin/alpha", type: "plugin", name: "alpha", plugin: "alpha",
    description: "Deployment helpers for Railway", tags: ["deploy", "railway"], version: "1.2.0",
    author: "Alpha Team", contextTokens: 61, trust: ALPHA_TRUST,
    children: ["alpha/agent/reviewer", "alpha/command/status", "alpha/hook/PreToolUse-1", "alpha/mcp/db", "alpha/skill/deploy-railway"],
    updatedAt: "2026-10-10T00:00:00Z",
  }),
  art({
    id: "alpha/skill/deploy-railway", type: "skill", name: "deploy-railway", plugin: "alpha",
    description: "Deploys the current project to Railway and checks the build logs.",
    tags: ["deploy", "railway"], keywords: ["ship", "hosting"], invocation: "/alpha:deploy-railway",
    searchText: "Deploy to Railway Run railway up and watch the logs.", bodyTokens: 20,
  }),
  art({
    id: "alpha/agent/reviewer", type: "agent", name: "reviewer", plugin: "alpha",
    description: "Reviews deployment configuration for mistakes before release.",
    tags: ["deploy", "railway"], invocation: "alpha:reviewer", bodyTokens: 6,
  }),
  art({
    id: "alpha/command/status", type: "command", name: "status", plugin: "alpha",
    description: "Shows the status of the latest Railway deployment.",
    tags: ["deploy", "railway"], invocation: "/alpha:status", bodyTokens: 6,
  }),
  art({
    id: "alpha/hook/PreToolUse-1", type: "hook", name: "PreToolUse-1", plugin: "alpha",
    description: "PreToolUse hook on Bash", tags: ["deploy", "railway"],
    hook: { event: "PreToolUse", matcher: "Bash", commands: ["curl -s https://example.com"] },
  }),
  art({
    id: "alpha/mcp/db", type: "mcp", name: "db", plugin: "alpha",
    description: "MCP server db (stdio)", tags: ["deploy", "railway"],
    mcp: { transport: "stdio", command: "${CLAUDE_PLUGIN_ROOT}/scripts/db-server" },
  }),
  art({
    id: "beta/plugin/beta", type: "plugin", name: "beta", plugin: "beta", category: "quality",
    description: "Code quality tools", tags: ["lint"], version: "0.3.0", contextTokens: 40,
    trust: { ...NONE, hasMcp: true, mcpServers: ["lint-api"], level: "low" },
    children: ["beta/skill/lint-fast"],
  }),
  art({
    id: "beta/skill/lint-fast", type: "skill", name: "lint-fast", plugin: "beta", category: "quality",
    description: "Fast incremental lint that only checks staged files before commit.",
    tags: ["lint"], invocation: "/beta:lint-fast", updatedAt: "2026-09-01T00:00:00Z",
  }),
  art({
    id: "gamma/plugin/gamma", type: "plugin", name: "gamma", plugin: "gamma", category: "productivity",
    description: "Note taking without a manifest", tags: ["notes"], contextTokens: 20, trust: NONE,
    children: ["gamma/skill/notes"],
  }),
  art({
    id: "gamma/skill/notes", type: "skill", name: "notes", plugin: "gamma", category: "productivity",
    description: "Keeps running meeting notes in a markdown file in the project.",
    tags: ["notes"], invocation: "/gamma:notes",
  }),
];

export const CATALOG: Catalog = {
  schemaVersion: 1,
  generatedAt: "2026-10-21T00:00:00Z",
  marketplace: {
    name: "awesome-skills-marketplace",
    repo: "IvanBlinov/awesome-skills-marketplace",
    description: "Fixture marketplace",
    addCommand: "/plugin marketplace add IvanBlinov/awesome-skills-marketplace",
  },
  categories: ["devops", "quality", "productivity"],
  artifacts: ARTIFACTS,
};
