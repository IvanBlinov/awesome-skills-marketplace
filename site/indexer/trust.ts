import type { TrustReport } from "../src/catalog/types";
import type { ResolvedPlugin } from "./manifest";
import type { HookHandler } from "./types";

export const NETWORK_COMMAND_RE = /\b(curl|wget|nc|ncat|Invoke-WebRequest)\b/;

/** The command line a hook runs, as shown to users and scanned for network tools. */
export function hookCommandText(h: HookHandler): string {
  return [h.command ?? "", ...(h.args ?? [])].join(" ").trim();
}

export function buildTrustReport(p: ResolvedPlugin): TrustReport {
  const hookEvents = Object.keys(p.hooks).sort();
  const mcpServers = Object.keys(p.mcpServers).sort();
  const userConfig = Object.entries(p.manifest.userConfig ?? {});
  const commands = Object.values(p.hooks).flatMap((ms) => ms.flatMap((m) => m.hooks.map(hookCommandText)));

  const hasHooks = hookEvents.length > 0;
  const hasMcp = mcpServers.length > 0;
  const requiresSecrets = userConfig.filter(([, o]) => o.sensitive).map(([k]) => k).sort();
  const requiresConfig = userConfig.filter(([, o]) => !o.sensitive).map(([k]) => k).sort();
  const level: TrustReport["level"] =
    hasHooks || p.hasBin ? "review" : hasMcp || userConfig.length > 0 ? "low" : "none";

  return {
    hasHooks,
    hookEvents,
    hasMcp,
    mcpServers,
    hasBin: p.hasBin,
    requiresSecrets,
    requiresConfig,
    networkCommands: commands.some((c) => NETWORK_COMMAND_RE.test(c)),
    level,
  };
}
