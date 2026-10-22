import { Link } from "react-router-dom";
import type { Artifact } from "../catalog/types";
import { formatRelative, formatTokens } from "../format";
import { CopyButton } from "./CopyButton";
import { TrustBadges } from "./TrustBadges";

interface Props {
  artifact: Artifact;
  onAddToBundle?: (plugin: string) => void;
  inBundle?: boolean;
}

export function ArtifactCard({ artifact: a, onAddToBundle, inBundle = false }: Props) {
  return (
    <article className="card">
      <div className="card-top">
        <span className={`type type-${a.type}`}>{a.type}</span>
        {a.type !== "plugin" && <span className="muted">in {a.plugin}</span>}
      </div>
      <h3 className="card-title">
        <Link to={`/a/${a.id}`}>{a.displayName ?? a.name}</Link>
      </h3>
      <p className="card-desc">{a.description}</p>
      {a.type === "plugin" && (
        <div className="card-meta">
          {a.trust && <TrustBadges trust={a.trust} />}
          {a.contextTokens !== undefined && <span className="muted">{formatTokens(a.contextTokens)}</span>}
        </div>
      )}
      <ul className="tags" aria-label="Tags">
        {a.tags.slice(0, 3).map((t) => (
          <li key={t} className="tag">
            {t}
          </li>
        ))}
      </ul>
      <div className="card-actions">
        <CopyButton text={a.install.install} label="Copy install command" />
        {onAddToBundle &&
          (inBundle ? (
            <button type="button" className="btn btn-ghost" disabled>
              {a.plugin} in bundle
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => onAddToBundle(a.plugin)}>
              Add {a.plugin} to bundle
            </button>
          ))}
        <span className="muted card-date">updated {formatRelative(a.updatedAt)}</span>
      </div>
    </article>
  );
}
