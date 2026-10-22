import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentFileName } from "../src/catalog/types";
import { buildCatalog } from "./build";
import { checkConventions } from "./check";
import { renderLlmsTxt } from "./llms";

const SITE_DIR = process.cwd();
const REPO_ROOT = path.resolve(SITE_DIR, "..");
const PUBLIC_DIR = path.join(SITE_DIR, "public");

async function check(): Promise<number> {
  const errors = await checkConventions(REPO_ROOT);
  errors.forEach((e) => process.stderr.write(`✖ ${e}\n`));
  process.stdout.write(errors.length ? `${errors.length} convention error(s)\n` : "✔ conventions ok\n");
  return errors.length ? 1 : 0;
}

async function index(): Promise<number> {
  const { catalog, bodies } = await buildCatalog(REPO_ROOT);
  const contentDir = path.join(PUBLIC_DIR, "content");
  await rm(contentDir, { recursive: true, force: true });
  await mkdir(contentDir, { recursive: true });
  await writeFile(path.join(PUBLIC_DIR, "catalog.json"), JSON.stringify(catalog));
  await writeFile(path.join(PUBLIC_DIR, "llms.txt"), renderLlmsTxt(catalog));
  await Promise.all(
    Object.entries(bodies).map(([id, body]) => writeFile(path.join(contentDir, contentFileName(id)), body)),
  );
  process.stdout.write(`✔ indexed ${catalog.artifacts.length} artifacts\n`);
  return 0;
}

const run = process.argv.includes("--check") ? check : index;
run().then(
  (code) => process.exit(code),
  (e: Error) => {
    process.stderr.write(`✖ ${e.message}\n`);
    process.exit(1);
  },
);
