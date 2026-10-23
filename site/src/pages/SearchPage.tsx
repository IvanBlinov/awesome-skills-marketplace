import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Catalog } from "../catalog/types";
import { ArtifactCard } from "../components/ArtifactCard";
import { CatalogStats } from "../components/CatalogStats";
import { FacetSidebar } from "../components/FacetSidebar";
import { skillRequestUrl } from "../request/issueUrl";
import { createSearch, NO_FILTERS } from "../search/createSearch";
import { facetCounts } from "../search/facets";
import { readSearchState, writeSearchState, type SearchState } from "../state/urlState";

const URL_DEBOUNCE_MS = 200;

interface Props {
  catalog: Catalog;
  onAddToBundle?: (plugin: string) => void;
  isInBundle?: (plugin: string) => boolean;
}


export function SearchPage({ catalog, onAddToBundle, isInBundle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<SearchState>(() => readSearchState(location.search));
  const timer = useRef<number>();
  const input = useRef<HTMLInputElement>(null);

  const search = useMemo(() => createSearch(catalog.artifacts), [catalog]);
  const result = useMemo(() => search(state.q, state), [search, state]);
  const facets = useMemo(() => facetCounts(search, state.q, state), [search, state]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const writeUrl = (next: SearchState) => navigate({ search: writeSearchState(next) }, { replace: true });

  const update = (next: SearchState, debounce = false) => {
    setState(next);
    window.clearTimeout(timer.current);
    if (debounce) timer.current = window.setTimeout(() => writeUrl(next), URL_DEBOUNCE_MS);
    else writeUrl(next);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Follow URL changes made outside this page (nav links, back/forward), but not our own writes.
  useEffect(() => {
    setState((current) => {
      if (writeSearchState(current) === location.search) return current;
      window.clearTimeout(timer.current);
      return readSearchState(location.search);
    });
  }, [location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectedCount =
    state.types.length + state.categories.length + state.keywords.length + state.authors.length + state.plugins.length;
  const hasFilters = state.q !== "" || selectedCount > 0;
  const query = state.q.trim();
  const { results, usedFallback, detectedType } = result;

  return (
    <section className="search">
      <CatalogStats
        artifacts={catalog.artifacts}
        active={state.types}
        onSelect={(t) => update({ ...state, types: state.types.length === 1 && state.types[0] === t ? [] : [t] })}
      />
      <div className="search-box">
        <label htmlFor="q" className="visually-hidden">
          Search the marketplace
        </label>
        <input
          id="q"
          ref={input}
          type="search"
          autoFocus
          autoComplete="off"
          placeholder='Try "I need a skill for deploying to Railway"'
          value={state.q}
          onChange={(e) => update({ ...state, q: e.target.value }, true)}
        />
        <kbd className="kbd" aria-hidden="true">
          /
        </kbd>
      </div>

      <div className="search-layout">
        <aside className={`sidebar${filtersOpen ? " sidebar-open" : ""}`} aria-label="Filters">
          <button
            type="button"
            className="btn btn-ghost filters-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
          <div className="sidebar-body">
            <FacetSidebar
              counts={facets}
              filters={state}
              detectedType={detectedType}
              onChange={(key, values) => update({ ...state, [key]: values })}
            />
          </div>
        </aside>

        <div className="results">
          <div className="result-bar">
            <span aria-live="polite">
              <strong>
                {results.length} result{results.length === 1 ? "" : "s"}
              </strong>
              {query && <> for “{query}”</>}
            </span>
            {hasFilters && (
              <button type="button" className="link-btn" onClick={() => update({ q: "", ...NO_FILTERS })}>
                Clear search and filters
              </button>
            )}
          </div>

          {usedFallback && (
            <p className="note">No artifact matches every word, so these match some of your words.</p>
          )}

          {results.length === 0 ? (
            <div className="empty">
              <p>{query ? <>Nothing found for “{query}”.</> : "Nothing matches these filters."}</p>
              <p>Tell us what you need and we will consider building it.</p>
              <a className="btn" href={skillRequestUrl(state.q)} target="_blank" rel="noopener noreferrer">
                Request this skill
              </a>
            </div>
          ) : (
            <div className="grid">
              {results.map((a) => (
                <ArtifactCard
                  key={a.id}
                  artifact={a}
                  onAddToBundle={onAddToBundle}
                  inBundle={isInBundle?.(a.plugin) ?? false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
