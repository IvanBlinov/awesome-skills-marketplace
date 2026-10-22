import { useEffect, useState } from "react";
import type { Catalog } from "./types";

export interface CatalogState {
  status: "loading" | "ready" | "error";
  catalog?: Catalog;
  error?: string;
}

let cached: Catalog | undefined;
let inflight: Promise<Catalog> | undefined;

/** Test helper: forget the module-level cache. */
export function resetCatalogCache(): void {
  cached = undefined;
  inflight = undefined;
}

async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
  if (!res.ok) throw new Error(`Could not load the catalog (HTTP ${res.status})`);
  return (await res.json()) as Catalog;
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>(() =>
    cached ? { status: "ready", catalog: cached } : { status: "loading" },
  );

  useEffect(() => {
    if (cached) return;
    let alive = true;
    inflight ??= fetchCatalog();
    inflight.then(
      (catalog) => {
        cached = catalog;
        if (alive) setState({ status: "ready", catalog });
      },
      (e: Error) => {
        inflight = undefined;
        if (alive) setState({ status: "error", error: e.message });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
