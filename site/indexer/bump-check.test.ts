import { describe, expect, it } from "vitest";
import { bumpErrors, changedPlugins } from "./bump-check";

describe("changedPlugins", () => {
  it("returns plugin names under plugins/, once each, sorted", () => {
    expect(
      changedPlugins([
        "plugins/b/agents/x.md",
        "plugins/a/README.md",
        "plugins/b/CHANGELOG.md",
        "site/src/App.tsx",
        "README.md",
        "plugins/README.md",
      ]),
    ).toEqual(["a", "b"]);
  });
});

describe("bumpErrors", () => {
  const changelog = (v: string) => `# Changelog\n\n## [Unreleased]\n\n## [${v}] - 2026-10-22\n`;

  it("accepts a bumped plugin with a changelog entry", () => {
    expect(
      bumpErrors({ changed: ["a"], baseVersions: { a: "1.0.0" }, headVersions: { a: "1.1.0" }, changelogs: { a: changelog("1.1.0") } }),
    ).toEqual([]);
  });

  it("flags a changed plugin whose version did not move", () => {
    expect(
      bumpErrors({ changed: ["a"], baseVersions: { a: "1.0.0" }, headVersions: { a: "1.0.0" }, changelogs: { a: changelog("1.0.0") } }),
    ).toEqual(["a: version not bumped (still 1.0.0)"]);
  });

  it("flags a bump without a changelog entry", () => {
    expect(
      bumpErrors({ changed: ["a"], baseVersions: { a: "1.0.0" }, headVersions: { a: "1.0.1" }, changelogs: { a: changelog("1.0.0") } }),
    ).toEqual(["a: CHANGELOG.md has no entry for 1.0.1"]);
  });

  it("accepts a new plugin that has a changelog entry", () => {
    expect(
      bumpErrors({ changed: ["n"], baseVersions: {}, headVersions: { n: "1.0.0" }, changelogs: { n: changelog("1.0.0") } }),
    ).toEqual([]);
  });

  it("ignores plugins deleted in this change", () => {
    expect(bumpErrors({ changed: ["gone"], baseVersions: { gone: "1.0.0" }, headVersions: {}, changelogs: {} })).toEqual([]);
  });

  it("flags a plugin without a version", () => {
    expect(
      bumpErrors({ changed: ["a"], baseVersions: { a: "1.0.0" }, headVersions: { a: "" }, changelogs: { a: changelog("1.0.0") } }),
    ).toEqual(["a: plugin.json has no version"]);
  });
});
