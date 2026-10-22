import { useCallback, useState } from "react";

export const BUNDLE_STORAGE_KEY = "asm.bundle.v1";

export interface Bundle {
  plugins: string[];
  add(plugin: string): void;
  remove(plugin: string): void;
  replace(plugins: string[]): void;
  clear(): void;
  has(plugin: string): boolean;
}

const normalize = (plugins: string[]) => [...new Set(plugins)].sort();

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BUNDLE_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? normalize(parsed.filter((p): p is string => typeof p === "string")) : [];
  } catch {
    return [];
  }
}

function save(plugins: string[]): void {
  try {
    localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(plugins));
  } catch {
    // Storage unavailable (private mode, blocked): the bundle still works for this page view.
  }
}

export function useBundle(): Bundle {
  const [plugins, setPlugins] = useState<string[]>(load);

  const set = useCallback((next: string[]) => {
    const value = normalize(next);
    save(value);
    setPlugins(value);
  }, []);

  return {
    plugins,
    add: (p) => set([...plugins, p]),
    remove: (p) => set(plugins.filter((x) => x !== p)),
    replace: set,
    clear: () => set([]),
    has: (p) => plugins.includes(p),
  };
}
