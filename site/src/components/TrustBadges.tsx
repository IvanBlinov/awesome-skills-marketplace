import type { TrustReport } from "../catalog/types";

export function trustBadges(t: TrustReport): { label: string; title: string }[] {
  return [
    ...(t.hasHooks ? [{ label: "hooks", title: `Runs hooks on: ${t.hookEvents.join(", ")}` }] : []),
    ...(t.hasMcp ? [{ label: "mcp", title: `MCP servers: ${t.mcpServers.join(", ")}` }] : []),
    ...(t.hasBin ? [{ label: "bin", title: "Adds executables to PATH" }] : []),
    ...(t.requiresSecrets.length ? [{ label: "secrets", title: `Asks for: ${t.requiresSecrets.join(", ")}` }] : []),
  ];
}

export function TrustBadges({ trust }: { trust: TrustReport }) {
  const badges = trustBadges(trust);
  if (badges.length === 0) return null;
  return (
    <ul className={`badges trust-${trust.level}`} aria-label="Runs on your machine">
      {badges.map((b) => (
        <li key={b.label} className="badge badge-trust" title={b.title}>
          {b.label}
        </li>
      ))}
    </ul>
  );
}
