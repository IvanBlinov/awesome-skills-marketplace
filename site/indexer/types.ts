/** Raw shapes read from marketplace.json, plugin.json, hooks.json and .mcp.json. */

export interface MarketplaceEntry {
  name: string;
  source: string | Record<string, unknown>;
  description?: string;
  version?: string;
  category?: string;
  tags?: string[];
  displayName?: string;
  author?: { name: string; email?: string; url?: string };
  dependencies?: unknown[];
  [key: string]: unknown;
}

export interface MarketplaceFile {
  name: string;
  description?: string;
  owner: { name: string; url?: string; email?: string };
  plugins: MarketplaceEntry[];
}

export type PathSpec = string | string[];

export interface UserConfigOption {
  type: string;
  title?: string;
  description?: string;
  sensitive?: boolean;
  required?: boolean;
}

export interface PluginManifest {
  name: string;
  displayName?: string;
  version?: string;
  description?: string;
  author?: { name: string; email?: string; url?: string };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: unknown[];
  skills?: PathSpec;
  agents?: PathSpec;
  commands?: PathSpec | Record<string, unknown>;
  hooks?: string | HooksConfig | (string | HooksConfig)[];
  mcpServers?: string | Record<string, McpServerConfig> | (string | Record<string, McpServerConfig>)[];
  userConfig?: Record<string, UserConfigOption>;
  [key: string]: unknown;
}

export interface HookHandler {
  type: string;
  command?: string;
  args?: string[];
  [key: string]: unknown;
}

export interface HookMatcher {
  matcher?: string;
  hooks: HookHandler[];
}

export type HooksConfig = Record<string, HookMatcher[]>;

export interface McpServerConfig {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  [key: string]: unknown;
}
