import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoryLabel } from "../catalog/categories";
import { contentFileName, type Artifact, type Catalog } from "../catalog/types";
import { CopyButton } from "../components/CopyButton";
import { Markdown } from "../components/Markdown";
import { ContentsPanel, ContextPanel, TrustPanel } from "../components/PluginPanels";
import { formatRelative } from "../format";

interface Props {
  catalog: Catalog;
  onAddToBundle?: (plugin: string) => void;
  isInBundle?: (plugin: string) => boolean;
}

type Body = { status: "loading" } | { status: "ready"; text: string } | { status: "error" };

const HAS_BODY = new Set(["plugin", "skill", "agent", "command"]);

function useBody(a: Artifact | undefined): Body | null {
  const [body, setBody] = useState<Body>({ status: "loading" });
  const id = a && HAS_BODY.has(a.type) ? a.id : null;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setBody({ status: "loading" });
    fetch(`${import.meta.env.BASE_URL}content/${contentFileName(id)}`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(
        (text) => alive && setBody({ status: "ready", text }),
        () => alive && setBody({ status: "error" }),
      );
    return () => {
      alive = false;
    };
  }, [id]);

  return id ? body : null;
}

function InstallPanel({ a, onAddToBundle, inBundle }: { a: Artifact; onAddToBundle?: Props["onAddToBundle"]; inBundle: boolean }) {
  return (
    <section className="panel" aria-label="Install">
      <h2>Install</h2>
      {[a.install.add, a.install.install].map((cmd) => (
        <div className="cmd" key={cmd}>
          <code>{cmd}</code>
          <CopyButton text={cmd} label="Copy" className="btn btn-ghost" />
        </div>
      ))}
      {a.invocation && (
        <p>
          Use it as <code>{a.invocation}</code>
        </p>
      )}
      {onAddToBundle && (
        <button type="button" className="btn" disabled={inBundle} onClick={() => onAddToBundle(a.plugin)}>
          {inBundle ? `${a.plugin} in bundle` : `Add ${a.plugin} to bundle`}
        </button>
      )}
    </section>
  );
}

function BodyView({ body, a }: { body: Body; a: Artifact }) {
  if (body.status === "loading") return <p className="muted">Loading…</p>;
  if (body.status === "error") {
    return (
      <p className="error">
        Could not load the content. <a href={a.sourceUrl}>Read it on GitHub</a>.
      </p>
    );
  }
  return <Markdown source={body.text} />;
}

export function ArtifactPage({ catalog, onAddToBundle, isInBundle }: Props) {
  const id = useParams()["*"] ?? "";
  const a = catalog.artifacts.find((x) => x.id === id);
  const body = useBody(a);

  if (!a) {
    return (
      <section>
        <h1>Not found</h1>
        <p>
          Nothing in the catalog has the id <code>{id}</code>. <Link to="/">Back to search</Link>
        </p>
      </section>
    );
  }

  const children = catalog.artifacts.filter((x) => a.children?.includes(x.id));

  return (
    <article>
      <header className="detail-header">
        <span className={`type type-${a.type}`}>{a.type}</span>
        <h1>{a.displayName ?? a.name}</h1>
        <p>{a.description}</p>
        <p className="muted">
          {a.type !== "plugin" && (
            <>
              in <Link to={`/a/${a.plugin}/plugin/${a.plugin}`}>{a.plugin}</Link> ·{" "}
            </>
          )}
          {categoryLabel(a.category)}
          {a.version && <> · v{a.version}</>}
          {a.author && <> · {a.author}</>} · updated {formatRelative(a.updatedAt)} ·{" "}
          <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">
            source
          </a>
        </p>
      </header>

      <div className="detail-layout">
        <div>
          {a.hook && (
            <section className="panel" aria-label="Hook">
              <dl>
                <dt>Event</dt>
                <dd>{a.hook.event}</dd>
                {a.hook.matcher && (
                  <>
                    <dt>Matcher</dt>
                    <dd>{a.hook.matcher}</dd>
                  </>
                )}
              </dl>
              {a.hook.commands.map((cmd) => (
                <pre key={cmd} className="code-block">
                  <code>{cmd}</code>
                </pre>
              ))}
            </section>
          )}
          {a.mcp && (
            <section className="panel" aria-label="MCP server">
              <dl>
                <dt>Transport</dt>
                <dd>{a.mcp.transport}</dd>
              </dl>
              <pre className="code-block">
                <code>{a.mcp.command ?? a.mcp.url}</code>
              </pre>
            </section>
          )}
          {a.type === "plugin" && <ContentsPanel children={children} />}
          {body && <BodyView body={body} a={a} />}
        </div>
        <aside>
          <InstallPanel a={a} onAddToBundle={onAddToBundle} inBundle={isInBundle?.(a.plugin) ?? false} />
          {a.type === "plugin" && (
            <>
              <TrustPanel plugin={a} children={children} />
              <ContextPanel plugin={a} children={children} />
            </>
          )}
        </aside>
      </div>
    </article>
  );
}
