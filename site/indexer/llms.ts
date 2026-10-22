import { SITE_URL } from "../src/config";
import type { Catalog } from "../src/catalog/types";

export function renderLlmsTxt(catalog: Catalog): string {
  const lines = [
    `# ${catalog.marketplace.name}`,
    "",
    `> ${catalog.marketplace.description}`,
    "",
    `Install the marketplace: \`${catalog.marketplace.addCommand}\``,
    `Machine-readable catalog: ${SITE_URL}catalog.json`,
    "",
    "## Artifacts",
    "",
    ...catalog.artifacts.map((a) => `- [${a.name}](${SITE_URL}a/${a.id}): ${a.description}`),
    "",
  ];
  return lines.join("\n");
}
