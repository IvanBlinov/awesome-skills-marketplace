import path from "node:path";
import { describe, expect, it } from "vitest";
import { gitLastModified } from "./git";

const REPO_ROOT = path.resolve(__dirname, "../..");

describe("gitLastModified", () => {
  it("returns the ISO date of the last commit touching a tracked path", () => {
    const iso = gitLastModified(REPO_ROOT, "site/indexer/manifest.ts");
    expect(new Date(iso).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("falls back to the epoch for untracked paths", () => {
    expect(gitLastModified(REPO_ROOT, "does/not/exist.md")).toBe(new Date(0).toISOString());
  });
});
