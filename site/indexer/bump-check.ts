/** Release check: every plugin changed in a PR needs a version bump and a CHANGELOG entry. */

export interface BumpInput {
  /** Plugin names with changed files. */
  changed: string[];
  /** plugin.json version on the base branch; absent for new plugins. */
  baseVersions: Record<string, string | undefined>;
  /** plugin.json version on HEAD; absent for deleted plugins. */
  headVersions: Record<string, string>;
  /** CHANGELOG.md contents on HEAD. */
  changelogs: Record<string, string>;
}

const PLUGIN_FILE_RE = /^plugins\/([^/]+)\/.+/;

export function changedPlugins(changedFiles: string[]): string[] {
  const names = changedFiles.map((f) => PLUGIN_FILE_RE.exec(f)?.[1]).filter((n): n is string => !!n);
  return [...new Set(names)].sort();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function bumpErrors(input: BumpInput): string[] {
  return input.changed.flatMap((name) => {
    if (!(name in input.headVersions)) return []; // deleted in this change
    const head = input.headVersions[name];
    if (!head) return [`${name}: plugin.json has no version`];
    const base = input.baseVersions[name];
    if (base !== undefined && base === head) return [`${name}: version not bumped (still ${head})`];
    const entry = new RegExp(`^## \\[${escapeRe(head)}\\]`, "m");
    return entry.test(input.changelogs[name] ?? "") ? [] : [`${name}: CHANGELOG.md has no entry for ${head}`];
  });
}
