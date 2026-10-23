import { ARTIFACT_TYPES, type Artifact, type ArtifactType } from "../catalog/types";

const NOUNS: Record<ArtifactType, [singular: string, plural: string]> = {
  plugin: ["plugin", "plugins"],
  skill: ["skill", "skills"],
  agent: ["agent", "agents"],
  command: ["command", "commands"],
  hook: ["hook", "hooks"],
  mcp: ["MCP server", "MCP servers"],
};

export interface TypeCount {
  type: ArtifactType;
  count: number;
}

/** Counts per artifact type, in ARTIFACT_TYPES order, omitting types with none. */
export function countByType(artifacts: Artifact[]): TypeCount[] {
  return ARTIFACT_TYPES.map((type) => ({ type, count: artifacts.filter((a) => a.type === type).length })).filter(
    (c) => c.count > 0,
  );
}

interface Props {
  artifacts: Artifact[];
  active: ArtifactType[];
  onSelect: (type: ArtifactType) => void;
}

export function CatalogStats({ artifacts, active, onSelect }: Props) {
  return (
    <div className="stats" role="group" aria-label="Catalog contents">
      {countByType(artifacts).map(({ type, count }) => (
        <button
          key={type}
          type="button"
          className="stat"
          aria-pressed={active.includes(type)}
          onClick={() => onSelect(type)}
        >
          <span className="stat-count">{count}</span> {NOUNS[type][count === 1 ? 0 : 1]}
        </button>
      ))}
    </div>
  );
}
