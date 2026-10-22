import { MARKETPLACE_NAME, REPO, SITE_URL } from "../config";

const sorted = (plugins: string[]) => [...new Set(plugins)].sort();

/** `.claude/settings.json` that registers the marketplace and enables the plugins. */
export function settingsJson(plugins: string[]): string {
  const settings = {
    extraKnownMarketplaces: {
      [MARKETPLACE_NAME]: { source: { source: "github", repo: REPO } },
    },
    enabledPlugins: Object.fromEntries(sorted(plugins).map((p) => [`${p}@${MARKETPLACE_NAME}`, true])),
  };
  return `${JSON.stringify(settings, null, 2)}\n`;
}

export function shellScript(plugins: string[]): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `claude plugin marketplace add ${REPO} --scope project`,
    ...sorted(plugins).map((p) => `claude plugin install ${p}@${MARKETPLACE_NAME} --scope project`),
    "",
  ].join("\n");
}

export function bundleShareUrl(plugins: string[]): string {
  return `${SITE_URL}bundle?${new URLSearchParams({ p: sorted(plugins).join(",") }).toString()}`;
}
