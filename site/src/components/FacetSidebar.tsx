import { useState } from "react";
import { categoryLabel } from "../catalog/categories";
import type { ArtifactType } from "../catalog/types";
import type { Filters } from "../search/createSearch";
import type { FacetCounts, FacetKey, FacetValue } from "../search/facets";

const SECTIONS: { key: FacetKey; title: string }[] = [
  { key: "types", title: "Kind" },
  { key: "keywords", title: "Keyword" },
  { key: "categories", title: "Category" },
  { key: "authors", title: "Author" },
  { key: "plugins", title: "Plugin" },
];

/** Values shown before "Show all". */
export const FACET_PREVIEW = 8;

interface Props {
  counts: FacetCounts;
  filters: Filters;
  /** Kind named in the query; shown as checked while no kind is selected explicitly. */
  detectedType: ArtifactType | null;
  onChange: (key: FacetKey, values: string[]) => void;
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function label(key: FacetKey, value: string) {
  if (key === "types") return <span className={`type type-${value}`}>{value}</span>;
  if (key === "categories") return <span>{categoryLabel(value)}</span>;
  return <span className="facet-text">{value}</span>;
}

function FacetSection({ facetKey, title, values, selected, implied, onChange }: {
  facetKey: FacetKey;
  title: string;
  values: FacetValue[];
  selected: string[];
  implied: string | null;
  onChange: Props["onChange"];
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? values : values.slice(0, FACET_PREVIEW);
  return (
    <fieldset className="facet">
      <legend className="facet-title">{title}</legend>
      {shown.map(({ value, count }) => (
        <label key={value} className={`facet-row${count === 0 ? " facet-empty" : ""}`}>
          <input
            type="checkbox"
            checked={selected.includes(value) || (selected.length === 0 && implied === value)}
            onChange={() => onChange(facetKey, toggle(selected, value))}
          />
          {label(facetKey, value)}
          <span className="facet-count">{count}</span>
        </label>
      ))}
      {values.length > FACET_PREVIEW && (
        <button type="button" className="link-btn facet-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show all ${values.length}`}
        </button>
      )}
    </fieldset>
  );
}

export function FacetSidebar({ counts, filters, detectedType, onChange }: Props) {
  return (
    <div className="facets">
      {SECTIONS.filter(({ key }) => counts[key].length > 0).map(({ key, title }) => (
        <FacetSection
          key={key}
          facetKey={key}
          title={title}
          values={counts[key]}
          selected={filters[key] as string[]}
          implied={key === "types" ? detectedType : null}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
