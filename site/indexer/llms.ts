import { SITE_URL } from "../src/config";
import { contentFileName, type Artifact, type Catalog } from "../src/catalog/types";

const HAS_BODY = new Set(["plugin", "skill", "agent", "command"]);

/** Raw Markdown (HTTP 200) for artifacts with a body; the GitHub source otherwise. The /a/ pages are an SPA shell. */
function machineUrl(a: Artifact): string {
  return HAS_BODY.has(a.type) ? `${SITE_URL}content/${contentFileName(a.id)}` : a.sourceUrl;
}

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
    ...catalog.artifacts.map((a) => `- [${a.name}](${machineUrl(a)}): ${a.description}`),
    "",
  ];
  return lines.join("\n");
}
