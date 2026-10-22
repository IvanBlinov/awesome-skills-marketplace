import { ARTIFACT_TYPES, type ArtifactType } from "../catalog/types";
import { categoryLabel } from "../catalog/categories";

interface Props {
  types: ArtifactType[];
  detectedType: ArtifactType | null;
  category: string | null;
  tags: string[];
  categories: string[];
  topTags: string[];
  onTypes: (types: ArtifactType[]) => void;
  onCategory: (category: string | null) => void;
  onTags: (tags: string[]) => void;
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function FilterChips(p: Props) {
  const typeActive = (t: ArtifactType) => p.types.includes(t) || (p.types.length === 0 && p.detectedType === t);
  return (
    <div className="filters">
      <div className="chip-row" role="group" aria-label="Type">
        {ARTIFACT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="chip"
            aria-pressed={typeActive(t)}
            onClick={() => p.onTypes(toggle(p.types, t))}
          >
            {t}
          </button>
        ))}
      </div>
      <label className="select">
        <span className="visually-hidden">Category</span>
        <select value={p.category ?? ""} onChange={(e) => p.onCategory(e.target.value || null)}>
          <option value="">All categories</option>
          {p.categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </label>
      {p.topTags.length > 0 && (
        <div className="chip-row" role="group" aria-label="Tags">
          {p.topTags.map((t) => (
            <button
              key={t}
              type="button"
              className="chip chip-tag"
              aria-pressed={p.tags.includes(t)}
              onClick={() => p.onTags(toggle(p.tags, t))}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
