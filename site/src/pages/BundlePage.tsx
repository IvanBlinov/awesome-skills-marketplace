import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { bundleShareUrl, settingsJson, shellScript } from "../bundle/bundleOutput";
import type { Bundle } from "../bundle/useBundle";
import type { Artifact, Catalog, TrustReport } from "../catalog/types";
import { CopyButton } from "../components/CopyButton";
import { TrustBadges } from "../components/TrustBadges";
import { formatTokens } from "../format";

interface Props {
  catalog: Catalog;
  bundle: Bundle;
}

const TABS = [
  { id: "settings", label: ".claude/settings.json", file: "settings.json", render: settingsJson },
  { id: "script", label: "Shell script", file: "install-plugins.sh", render: shellScript },
] as const;

function mergeTrust(plugins: Artifact[]): TrustReport {
  const reports = plugins.map((p) => p.trust).filter((t): t is TrustReport => !!t);
  const union = (pick: (t: TrustReport) => string[]) => [...new Set(reports.flatMap(pick))].sort();
  const any = (pick: (t: TrustReport) => boolean) => reports.some(pick);
  const levels: TrustReport["level"][] = ["none", "low", "review"];
  return {
    hasHooks: any((t) => t.hasHooks),
    hookEvents: union((t) => t.hookEvents),
    hasMcp: any((t) => t.hasMcp),
    mcpServers: union((t) => t.mcpServers),
    hasBin: any((t) => t.hasBin),
    requiresSecrets: union((t) => t.requiresSecrets),
    requiresConfig: union((t) => t.requiresConfig),
    networkCommands: any((t) => t.networkCommands),
    level: levels[Math.max(0, ...reports.map((t) => levels.indexOf(t.level)))],
  };
}

function download(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BundlePage({ catalog, bundle }: Props) {
  const location = useLocation();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("settings");
  const pluginsByName = useMemo(
    () => new Map(catalog.artifacts.filter((a) => a.type === "plugin").map((a) => [a.name, a])),
    [catalog],
  );

  // A shared link (?p=a,b) replaces the stored selection once, on arrival.
  // `bundle` is a new object every render, so it is deliberately not a dependency.
  const shared = new URLSearchParams(location.search).get("p");
  const { replace } = bundle;
  useEffect(() => {
    if (shared !== null) replace(shared.split(",").filter((p) => pluginsByName.has(p)));
  }, [shared, pluginsByName]);

  const selected = bundle.plugins.map((p) => pluginsByName.get(p)).filter((a): a is Artifact => !!a);
  const names = selected.map((a) => a.name);

  if (selected.length === 0) {
    return (
      <section className="empty">
        <p>Your bundle is empty.</p>
        <p>
          Add plugins from <Link to="/">search</Link> to get a ready-to-commit settings file.
        </p>
      </section>
    );
  }

  const active = TABS.find((t) => t.id === tab)!;
  const output = active.render(names);
  const totalTokens = selected.reduce((n, a) => n + (a.contextTokens ?? 0), 0);

  return (
    <section>
      <h1>Your bundle</h1>
      <div className="detail-layout">
        <div>
          <ul className="bundle-list" aria-label="Selected plugins">
            {selected.map((a) => (
              <li key={a.id}>
                <span>
                  <Link to={`/a/${a.id}`}>{a.name}</Link> <span className="muted">— {a.description}</span>
                </span>
                <button type="button" className="btn btn-ghost" aria-label={`Remove ${a.name}`} onClick={() => bundle.remove(a.name)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="tabs" role="tablist" aria-label="Output format">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                className="chip tab"
                aria-selected={t.id === tab}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <pre className="code-block" data-testid="bundle-output">
            <code>{output}</code>
          </pre>
          <div className="card-actions">
            <CopyButton text={output} label="Copy" />
            <button type="button" className="btn btn-ghost" onClick={() => download(active.file, output)}>
              Download {active.file}
            </button>
            <a className="btn btn-ghost" href={bundleShareUrl(names)}>
              Share this bundle
            </a>
          </div>
        </div>

        <aside>
          <section className="panel" aria-label="Bundle summary">
            <h2>Summary</h2>
            <p>
              <strong>{formatTokens(totalTokens)}</strong> <span className="muted">always loaded</span>
            </p>
            <TrustBadges trust={mergeTrust(selected)} />
          </section>
          <section className="panel" aria-label="Notes">
            <h2>Before you commit</h2>
            <ul className="list-plain">
              <li>Project-scope plugins load after each teammate accepts the workspace trust prompt.</li>
              <li>
                Third-party marketplaces do not auto-update by default. Turn it on in <code>/plugin</code> →
                Marketplaces → Enable auto-update, or run <code>/plugin marketplace update</code>.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
