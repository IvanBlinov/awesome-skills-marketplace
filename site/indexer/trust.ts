import type { TrustReport } from "../src/catalog/types";
import type { ResolvedPlugin } from "./manifest";
import type { HookHandler } from "./types";

export const NETWORK_COMMAND_RE = /\b(curl|wget|nc|ncat|Invoke-WebRequest)\b/;

/** The command line a hook runs, as shown to users and scanned for network tools. */
export function hookCommandText(h: HookHandler): string {
  if (h.command) return [h.command, ...(h.args ?? [])].join(" ").trim();
  if (h.url) return `${h.type} ${h.url}`;
  if (h.prompt) return `${h.type}: ${h.prompt}`;
  return h.type;
}

const isNetworkHook = (h: HookHandler) =>
  h.type === "http" || typeof h.url === "string" || NETWORK_COMMAND_RE.test(hookCommandText(h));

export function buildTrustReport(p: ResolvedPlugin): TrustReport {
  const hookEvents = Object.keys(p.hooks).sort();
  const mcpServers = [
    ...Object.keys(p.mcpServers).sort(),
    ...p.uninspectedMcp.map((src) => `${src} (not inspected)`),
  ];
  // A stdio server runs a local process, and an uninspected source could; both need review.
  const runsLocalCode =
    Object.values(p.mcpServers).some((s) => typeof s.command === "string") || p.uninspectedMcp.length > 0;
  const userConfig = Object.entries(p.manifest.userConfig ?? {});
  const handlers = Object.values(p.hooks).flatMap((ms) => ms.flatMap((m) => m.hooks));

  const hasHooks = hookEvents.length > 0;
  const hasMcp = mcpServers.length > 0;
  const requiresSecrets = userConfig.filter(([, o]) => o.sensitive).map(([k]) => k).sort();
  const requiresConfig = userConfig.filter(([, o]) => !o.sensitive).map(([k]) => k).sort();
  const level: TrustReport["level"] =
    hasHooks || p.hasBin || runsLocalCode ? "review" : hasMcp || userConfig.length > 0 ? "low" : "none";

  return {
    hasHooks,
    hookEvents,
    hasMcp,
    mcpServers,
    hasBin: p.hasBin,
    requiresSecrets,
    requiresConfig,
    networkCommands: handlers.some(isNetworkHook),
    level,
  };
}
