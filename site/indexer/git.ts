import { execFileSync } from "node:child_process";

const EPOCH = new Date(0).toISOString();

/** ISO date of the last commit touching `relPath`, or the epoch if it has none. */
export function gitLastModified(root: string, relPath: string): string {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", relPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? new Date(out).toISOString() : EPOCH;
  } catch {
    return EPOCH;
  }
}
