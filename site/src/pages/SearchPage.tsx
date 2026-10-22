import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Catalog } from "../catalog/types";
import { ArtifactCard } from "../components/ArtifactCard";
import { FilterChips } from "../components/FilterChips";
import { skillRequestUrl } from "../request/issueUrl";
import { createSearch } from "../search/createSearch";
import { readSearchState, writeSearchState, type SearchState } from "../state/urlState";

const URL_DEBOUNCE_MS = 200;
const TOP_TAGS = 12;

interface Props {
  catalog: Catalog;
  onAddToBundle?: (plugin: string) => void;
  isInBundle?: (plugin: string) => boolean;
}

function topTags(catalog: Catalog): string[] {
  const counts = catalog.artifacts
    .filter((a) => a.type === "plugin")
    .flatMap((a) => a.tags)
    .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});
  return Object.entries(counts)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, TOP_TAGS)
    .map(([t]) => t);
}

export function SearchPage({ catalog, onAddToBundle, isInBundle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<SearchState>(() => readSearchState(location.search));
  const timer = useRef<number>();
  const input = useRef<HTMLInputElement>(null);

  const search = useMemo(() => createSearch(catalog.artifacts), [catalog]);
  const tags = useMemo(() => topTags(catalog), [catalog]);
  const result = useMemo(() => search(state.q, state), [search, state]);

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

  const hasFilters = state.q !== "" || state.types.length > 0 || state.category !== null || state.tags.length > 0;
  const { results, usedFallback, detectedType } = result;

  return (
    <section className="search">
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

      <FilterChips
        types={state.types}
        detectedType={detectedType}
        category={state.category}
        tags={state.tags}
        categories={catalog.categories}
        topTags={tags}
        onTypes={(types) => update({ ...state, types })}
        onCategory={(category) => update({ ...state, category })}
        onTags={(t) => update({ ...state, tags: t })}
      />

      <div className="result-bar">
        <span aria-live="polite">
          {results.length} result{results.length === 1 ? "" : "s"}
        </span>
        {hasFilters && (
          <button type="button" className="link-btn" onClick={() => update({ q: "", types: [], category: null, tags: [] })}>
            Clear search and filters
          </button>
        )}
      </div>

      {usedFallback && (
        <p className="note">No artifact matches every word, so these match some of your words.</p>
      )}

      {results.length === 0 ? (
        <div className="empty">
          <p>{state.q.trim() ? <>Nothing found for “{state.q.trim()}”.</> : "Nothing matches these filters."}</p>
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
    </section>
  );
}
