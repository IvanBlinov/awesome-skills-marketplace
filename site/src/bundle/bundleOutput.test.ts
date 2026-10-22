import { describe, expect, it } from "vitest";
import { bundleShareUrl, settingsJson, shellScript } from "./bundleOutput";

describe("settingsJson", () => {
  it("enables each plugin from the marketplace, sorted", () => {
    const obj = JSON.parse(settingsJson(["b", "a"]));
    expect(obj).toEqual({
      extraKnownMarketplaces: {
        "awesome-skills-marketplace": {
          source: { source: "github", repo: "IvanBlinov/awesome-skills-marketplace" },
        },
      },
      enabledPlugins: {
        "a@awesome-skills-marketplace": true,
        "b@awesome-skills-marketplace": true,
      },
    });
    expect(Object.keys(obj.enabledPlugins)).toEqual(["a@awesome-skills-marketplace", "b@awesome-skills-marketplace"]);
  });
});

describe("shellScript", () => {
  it("adds the marketplace and installs each plugin at project scope", () => {
    const lines = shellScript(["b", "a"]).trim().split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "claude plugin marketplace add IvanBlinov/awesome-skills-marketplace --scope project",
    ]);
    expect(lines.slice(3)).toEqual([
      "claude plugin install a@awesome-skills-marketplace --scope project",
      "claude plugin install b@awesome-skills-marketplace --scope project",
    ]);
  });
});

describe("bundleShareUrl", () => {
  it("links to the bundle page with the selection", () => {
    expect(bundleShareUrl(["beta", "alpha"])).toBe(
      "https://ivanblinov.github.io/awesome-skills-marketplace/bundle?p=alpha%2Cbeta",
    );
  });
});

describe("shellScript safety", () => {
  it("drops names that are not plain plugin names", () => {
    const script = shellScript(["ok-plugin", "x; rm -rf ~", "$(whoami)", "a b"]);
    expect(script).toContain("claude plugin install ok-plugin@awesome-skills-marketplace --scope project");
    expect(script).not.toMatch(/rm -rf|whoami|a b@/);
  });
});
