import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bumpErrors, changedPlugins } from "./bump-check";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const BASE_REF = process.env.BASE_REF ?? "origin/main";

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

function versionAt(ref: string | null, name: string): string | undefined {
  const rel = `plugins/${name}/.claude-plugin/plugin.json`;
  try {
    const text = ref ? git("show", `${ref}:${rel}`) : readFileSync(path.join(REPO_ROOT, rel), "utf8");
    return (JSON.parse(text) as { version?: string }).version ?? "";
  } catch {
    return undefined;
  }
}

const changed = changedPlugins(git("diff", "--name-only", `${BASE_REF}...HEAD`).split("\n").filter(Boolean));
const headVersions = Object.fromEntries(
  changed.map((n) => [n, versionAt(null, n)] as const).filter((e): e is [string, string] => e[1] !== undefined),
);
const errors = bumpErrors({
  changed,
  baseVersions: Object.fromEntries(changed.map((n) => [n, versionAt(BASE_REF, n)])),
  headVersions,
  changelogs: Object.fromEntries(
    changed.map((n) => {
      const file = path.join(REPO_ROOT, "plugins", n, "CHANGELOG.md");
      return [n, existsSync(file) ? readFileSync(file, "utf8") : ""];
    }),
  ),
});

errors.forEach((e) => process.stderr.write(`✖ ${e}\n`));
process.stdout.write(
  errors.length ? `${errors.length} release error(s)\n` : `✔ release check ok (${changed.join(", ") || "no plugin changes"})\n`,
);
process.exit(errors.length ? 1 : 0);
