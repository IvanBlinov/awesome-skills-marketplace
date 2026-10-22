import { Link } from "react-router-dom";
import type { Artifact, ArtifactType } from "../catalog/types";
import { formatTokens } from "../format";

const GROUPS: [ArtifactType, string][] = [
  ["skill", "Skills"],
  ["agent", "Agents"],
  ["command", "Commands"],
  ["hook", "Hooks"],
  ["mcp", "MCP servers"],
];
const CONTEXT_TYPES: ArtifactType[] = ["skill", "agent", "command"];

const tokens = (text: string) => Math.ceil(text.length / 4);

export function ContentsPanel({ children }: { children: Artifact[] }) {
  return (
    <section className="panel" aria-label="Contents">
      <h2>Contents</h2>
      {GROUPS.map(([type, label]) => {
        const items = children.filter((c) => c.type === type);
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <h3>{label}</h3>
            <ul className="list-plain">
              {items.map((c) => (
                <li key={c.id}>
                  <Link to={`/a/${c.id}`}>{c.name}</Link> <span className="muted">— {c.description}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function TrustPanel({ plugin, children }: { plugin: Artifact; children: Artifact[] }) {
  const t = plugin.trust;
  const hooks = children.filter((c) => c.type === "hook" && c.hook);
  const servers = children.filter((c) => c.type === "mcp" && c.mcp);
  const runsNothing = !t || (!t.hasHooks && !t.hasMcp && !t.hasBin);

  return (
    <section className="panel" aria-label="What it runs on your machine">
      <h2>What it runs on your machine</h2>
      {runsNothing && <p className="ok">No hooks, MCP servers or executables.</p>}
      {t?.networkCommands && <p className="note">Hook commands call the network (curl, wget, …). Read them first.</p>}
      {hooks.map((h) => (
        <div key={h.id}>
          <p>
            <strong>{h.hook!.event}</strong> hook{h.hook!.matcher ? ` on ${h.hook!.matcher}` : ""}:
          </p>
          {h.hook!.commands.map((cmd) => (
            <pre key={cmd} className="code-block">
              <code>{cmd}</code>
            </pre>
          ))}
        </div>
      ))}
      {servers.length > 0 && (
        <>
          <p>
            <strong>MCP servers</strong>
          </p>
          <ul className="list-plain">
            {servers.map((s) => (
              <li key={s.id}>
                {s.name} ({s.mcp!.transport}): <code>{s.mcp!.command ?? s.mcp!.url}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {t?.mcpServers
        .filter((m) => m.endsWith("(not inspected)"))
        .map((m) => (
          <p key={m} className="note">
            MCP source {m}.
          </p>
        ))}
      {t?.hasBin && <p>Adds executables from <code>bin/</code> to your PATH.</p>}
      {t && t.requiresSecrets.length > 0 && <p>Asks for secrets: {t.requiresSecrets.join(", ")} (stored in your OS keychain).</p>}
      {t && t.requiresConfig.length > 0 && <p>Asks for settings: {t.requiresConfig.join(", ")}.</p>}
    </section>
  );
}

export function ContextPanel({ plugin, children }: { plugin: Artifact; children: Artifact[] }) {
  const rows = children.filter((c) => CONTEXT_TYPES.includes(c.type));
  return (
    <section className="panel" aria-label="Context cost">
      <h2>Context cost</h2>
      <p>
        <strong>{formatTokens(plugin.contextTokens ?? 0)}</strong> <span className="muted">always loaded</span>
      </p>
      {rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="num">Always</th>
              <th className="num">When used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="num">{tokens(c.name + c.description)}</td>
                <td className="num">{c.bodyTokens ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">Estimate: characters ÷ 4. Bodies load only when a skill or agent is used.</p>
    </section>
  );
}
