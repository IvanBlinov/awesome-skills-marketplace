# Marketplace Catalog Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `awesome-skills-marketplace` repo skeleton plus a static GitHub Pages catalog site that indexes every plugin/skill/agent/command/hook/MCP server in the repo and lets users search, inspect, bundle and request them.

**Architecture:** A Node + TS indexer (`site/indexer`) reads the repo at build time and writes `site/public/catalog.json`, `site/public/content/<id>.md` and `site/public/llms.txt`. A Vite + React SPA (`site/src`) loads the catalog and searches it in the browser with MiniSearch. GitHub Actions validates PRs and deploys to Pages.

**Tech Stack:** Node 20, TypeScript 5, Vite 5, React 18, React Router 6, MiniSearch 7, gray-matter, react-markdown + remark-gfm, Vitest + React Testing Library, Playwright, tsx.

**Spec:** `docs/specs/2026-10-21-catalog-site.md`

## Global Constraints

- Marketplace name `awesome-skills-marketplace`; repo `IvanBlinov/awesome-skills-marketplace`; site base `/awesome-skills-marketplace/`.
- Content and UI are English only.
- No runtime network calls except fetching the site's own `catalog.json` and `content/*.md`.
- Markdown rendered without raw HTML; only `http`, `https`, `mailto` links.
- Skill/agent `name` ≤ 64 chars, `^[a-z0-9-]+$`, no `claude`/`anthropic`; `description` 20–1024 chars.
- Tags 1–8 lowercase strings; category ∈ the 11 ids in spec §5.
- Token estimate = `Math.ceil(chars / 4)`.
- `searchText` ≤ 4,000 chars.
- Unit coverage ≥ 80% (`site/`).
- `localStorage` access always wrapped in try/catch.
- Immutable updates only (no in-place mutation of state objects).

## Review Focus

1. Plugin with no `.claude-plugin/plugin.json` (allowed by Claude Code) — indexer must use the marketplace entry as manifest, not crash. Test in Task 3.
2. Skill frontmatter missing `description` or with non-string `keywords` — check mode reports file path + reason; build fails clearly. Test in Task 4/6.
3. Query that is only stopwords/intent words ("I need a skill") — shows all skills, not an empty page. Test in Task 7.
4. Deep link `/a/<id>` for an unknown id — shows "Not found" with link home, not a blank screen. Test in Task 10.
5. `localStorage` throwing (private mode) — bundle still works in memory. Test in Task 11.

---

## File Structure

```text
.claude-plugin/marketplace.json
plugins/marketplace-tools/                       # first real plugin (find-skill)
  .claude-plugin/plugin.json, README.md, LICENSE, skills/find-skill/SKILL.md
.github/ISSUE_TEMPLATE/skill-request.yml
.github/workflows/validate.yml, pages.yml
README.md, LICENSE, .gitignore
site/
  package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, index.html
  indexer/
    types.ts         # raw manifest types (marketplace.json, plugin.json, hooks, mcp)
    manifest.ts      # loadMarketplace, resolvePlugin (replace/add/merge semantics)
    markdown.ts      # parseMarkdownArtifact, estimateTokens, stripMarkdown
    trust.ts         # buildTrustReport
    build.ts         # buildCatalog
    check.ts         # checkConventions
    llms.ts          # renderLlmsTxt
    git.ts           # gitLastModified
    cli.ts           # entry: `index` / `--check`
    __fixtures__/repo/...   # fixture marketplace used by tests
    *.test.ts
  src/
    config.ts                 # MARKETPLACE_NAME, REPO, SITE_URL, ISSUE_URL
    catalog/types.ts          # Catalog, Artifact, TrustReport (shared with indexer)
    catalog/categories.ts     # CATEGORIES
    catalog/useCatalog.ts     # fetch + cache catalog.json
    search/stopwords.ts, parseQuery.ts, createSearch.ts
    state/urlState.ts
    bundle/bundleOutput.ts, useBundle.ts
    request/issueUrl.ts
    components/ArtifactCard.tsx, FilterChips.tsx, CopyButton.tsx, TrustBadges.tsx, Markdown.tsx
    pages/SearchPage.tsx, ArtifactPage.tsx, BundlePage.tsx
    App.tsx, main.tsx, styles.css
  e2e/catalog.spec.ts
```

---

### Task 1: Repo skeleton and first plugin

**Files:**
- Create: `.claude-plugin/marketplace.json`, `plugins/marketplace-tools/.claude-plugin/plugin.json`, `plugins/marketplace-tools/skills/find-skill/SKILL.md`, `plugins/marketplace-tools/README.md`, `plugins/marketplace-tools/LICENSE`, `README.md`, `LICENSE`, `.gitignore`, `.github/ISSUE_TEMPLATE/skill-request.yml`

**Interfaces:**
- Produces: marketplace `awesome-skills-marketplace`, plugin `marketplace-tools` (category `meta`, tags `["search","catalog","discovery"]`, version `0.1.0`, MIT), skill `find-skill` per spec §8.5.

- [ ] **Step 1:** `git init -b main`; write files. `marketplace.json` has `$schema`, `name`, `description`, `owner.name: "Ivan Blinov"`, one entry `{ name, source: "./plugins/marketplace-tools", description, category, tags }` (no `version` in the entry — version lives in plugin.json only).
- [ ] **Step 2:** Issue template fields per spec §8.4: `what` (textarea, id `what`), `use-case`, `example-prompt`, `type` dropdown (skill/agent/command/hook/mcp/plugin); label `skill-request`.
- [ ] **Step 3:** Run `claude plugin validate . --strict` and `claude plugin validate plugins/marketplace-tools --strict`. Expected: exit 0.
- [ ] **Step 4:** Commit `chore: marketplace skeleton with marketplace-tools plugin`.

### Task 2: Site scaffold and shared types

**Files:**
- Create: `site/package.json`, `site/tsconfig.json`, `site/vite.config.ts` (`base: "/awesome-skills-marketplace/"`), `site/vitest.config.ts` (jsdom, coverage v8 thresholds 80 for lines/functions/statements/branches, include `src/**` and `indexer/**`, exclude `main.tsx`, `cli.ts`, tests), `site/index.html`, `site/src/config.ts`, `site/src/catalog/types.ts`, `site/src/catalog/categories.ts`, `site/src/main.tsx`, `site/src/App.tsx` (placeholder)

**Interfaces:**
- Produces: `Catalog`, `Artifact`, `ArtifactType`, `TrustReport` exactly as spec §6.3 (minus `body`); `CATEGORIES: readonly { id: string; label: string; covers: string }[]` with the 11 rows of spec §5; `config.ts` exports `MARKETPLACE_NAME`, `REPO`, `SITE_URL`, `ISSUE_NEW_URL = "https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new"`.
- Scripts: `index` (`tsx indexer/cli.ts`), `index:check` (`tsx indexer/cli.ts --check`), `dev`, `build` (`npm run index && tsc -b && vite build && cp dist/index.html dist/404.html`), `test` (`vitest run --coverage`), `e2e` (`playwright test`), `typecheck`.

- [ ] **Step 1:** Scaffold, `npm install`.
- [ ] **Step 2:** Run `npm run typecheck`. Expected: no errors.
- [ ] **Step 3:** Commit `chore: scaffold catalog site`.

### Task 3: Manifest resolution

**Files:** Create `site/indexer/types.ts`, `site/indexer/manifest.ts`, `site/indexer/manifest.test.ts`, fixture repo `site/indexer/__fixtures__/repo/` with plugins:
- `alpha`: plugin.json, `skills/deploy-railway/SKILL.md`, `agents/reviewer.md`, `commands/status.md`, `hooks/hooks.json` (PreToolUse matcher `Bash`, command `curl -s https://example.com`), `.mcp.json` (stdio server `db`), `bin/tool`, `userConfig` `{ API_KEY: sensitive, REGION: not }`.
- `beta`: plugin.json with `"agents": ["./custom/only.md"]` (replaces default) and an ignored `agents/ignored.md`; `"skills": "./extra-skills"` (adds) plus `skills/base/SKILL.md`.
- `gamma`: **no plugin.json**, `skills/notes/SKILL.md`.

**Interfaces:**
- Produces:
  ```ts
  loadMarketplace(root: string): Promise<MarketplaceFile>
  resolvePlugin(root: string, entry: MarketplaceEntry): Promise<ResolvedPlugin>
  interface ResolvedPlugin {
    entry: MarketplaceEntry; manifest: PluginManifest; dir: string; // repo-relative
    skillFiles: string[]; agentFiles: string[]; commandFiles: string[]; // repo-relative, sorted
    hooks: Record<string, HookMatcher[]>; mcpServers: Record<string, McpServerConfig>;
    hasBin: boolean; hasReadme: boolean; hasLicense: boolean;
  }
  ```

- [ ] **Step 1: Tests** — `resolves default dirs` (alpha: 1 skill, 1 agent, 1 command, hooks has `PreToolUse`, mcp has `db`, hasBin true); `agents key replaces default dir` (beta agentFiles = `["plugins/beta/custom/only.md"]`); `skills key adds to default dir` (beta skillFiles contains both `skills/base` and `extra-skills/...`); `plugin without plugin.json uses entry as manifest` (gamma manifest.name === "gamma").
- [ ] **Step 2:** Run `npx vitest run indexer/manifest.test.ts` → FAIL.
- [ ] **Step 3:** Implement. Merge `plugin.json.hooks` (inline object or path) with `hooks/hooks.json` (top-level `hooks` key); merge `mcpServers` (inline map or path) with `.mcp.json` (`mcpServers` key). Manifest = `{ ...entry, ...pluginJson }` when plugin.json exists, else entry.
- [ ] **Step 4:** Run → PASS. Commit `feat(indexer): resolve plugin manifests`.

### Task 4: Markdown artifacts

**Files:** Create `site/indexer/markdown.ts`, `site/indexer/markdown.test.ts`

**Interfaces:**
- Produces:
  ```ts
  parseMarkdownArtifact(absPath: string): Promise<{ name?: string; description?: string; keywords: string[]; body: string; plainText: string }>
  stripMarkdown(md: string): string
  estimateTokens(text: string): number   // Math.ceil(text.length / 4)
  ```
  Throws `Error("<path>: keywords must be an array of strings")` for bad keywords.

- [ ] **Step 1: Tests** — frontmatter parsed; `plainText` has no `#`, `` ` ``, `[]()` syntax and is ≤ 4000 chars for a 10k body; `estimateTokens("abcde") === 2`; bad keywords throws with path.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with gray-matter. **Step 4:** Run → PASS. Commit `feat(indexer): parse markdown artifacts`.

### Task 5: Trust report

**Files:** Create `site/indexer/trust.ts`, `site/indexer/trust.test.ts`

**Interfaces:**
- Consumes: `ResolvedPlugin`.
- Produces: `buildTrustReport(p: ResolvedPlugin): TrustReport`; `NETWORK_COMMAND_RE = /\b(curl|wget|nc|ncat|Invoke-WebRequest)\b/`.

- [ ] **Step 1: Tests** — alpha → `{ hasHooks: true, hookEvents: ["PreToolUse"], hasMcp: true, mcpServers: ["db"], hasBin: true, requiresSecrets: ["API_KEY"], requiresConfig: ["REGION"], networkCommands: true, level: "review" }`; gamma → level `"none"`; plugin with only mcp → `"low"`; `"curlew"` does not match the regex.
- [ ] **Step 2–4:** fail → implement → pass. Commit `feat(indexer): trust report`.

### Task 6: Catalog build, conventions check, outputs, CLI

**Files:** Create `site/indexer/git.ts`, `build.ts`, `check.ts`, `llms.ts`, `cli.ts`, `build.test.ts`, `check.test.ts`, `llms.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  ```ts
  gitLastModified(root: string, relPath: string): string  // ISO; falls back to new Date(0).toISOString() if untracked
  buildCatalog(root: string, opts?: { lastModified?: (relPath: string) => string; now?: () => Date }): Promise<{ catalog: Catalog; bodies: Record<string, string> }>
  checkConventions(root: string): Promise<string[]>        // human-readable errors, empty = ok
  renderLlmsTxt(catalog: Catalog): string
  ```
  IDs: `<plugin>/plugin/<plugin>`, `<plugin>/skill/<name>`, `<plugin>/agent/<name>`, `<plugin>/command/<name>`, `<plugin>/hook/<event>-<n>` (n = 1-based across matchers of that event), `<plugin>/mcp/<server>`. Name for skills/agents/commands = frontmatter `name` ?? file/dir basename. `invocation`: skill/command `/<plugin>:<name>`, agent `<plugin>:<name>`. `sourceUrl`: `https://github.com/IvanBlinov/awesome-skills-marketplace/blob/main/<path>`. `contextTokens` (plugin) = Σ `estimateTokens(name + description)` over its skills/agents/commands. Plugin `children` = ids of all its other artifacts. Artifacts sorted by id.
- CLI: default writes `public/catalog.json`, `public/content/<id with / → __>.md`, `public/llms.txt` (from `site/` cwd, repo root = `..`); `--check` prints errors and exits 1 if any.

- [ ] **Step 1: Tests** — `build.test.ts` on fixture: count by type (plugin 3, skill 4, agent 2, command 1, hook 1, mcp 1); `alpha/skill/deploy-railway` has `invocation "/alpha:deploy-railway"`, category/tags inherited, `install.install === "/plugin install alpha@awesome-skills-marketplace"`; alpha `contextTokens` equals the sum computed from fixture text; ids unique. `check.test.ts`: fixture `bad-repo` with skill name `Claude_Helper`, 10-char description, unknown category, missing LICENSE, duplicate skill name across plugins → 5 errors each naming the path. `llms.test.ts`: contains `# awesome-skills-marketplace` and one `- [name](url): description` line per artifact.
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5:** `cd site && npm run index && npm run index:check` on the real repo → exit 0, `public/catalog.json` lists `marketplace-tools`. Add `site/public/catalog.json`, `content/`, `llms.txt` to `.gitignore`. Commit `feat(indexer): build catalog and convention checks`.

### Task 7: Query parsing and search

**Files:** Create `site/src/search/stopwords.ts`, `parseQuery.ts`, `createSearch.ts`, tests alongside.

**Interfaces:**
- Produces:
  ```ts
  parseQuery(input: string): { terms: string[]; typeFilter: ArtifactType | null }
  interface Filters { types: ArtifactType[]; category: string | null; tags: string[] }
  createSearch(artifacts: Artifact[]): (q: string, filters: Filters) => { results: Artifact[]; usedFallback: boolean }
  ```
  Boosts/options exactly spec §7.2. Explicit `filters.types` wins over `typeFilter`. Empty terms → all artifacts passing filters, sorted by `updatedAt` desc.

- [ ] **Step 1: Tests** — `parseQuery("I need a skill for deploying to Railway")` → `{ terms: ["deploying","railway"], typeFilter: "skill" }`; `parseQuery("I need a skill")` → `{ terms: [], typeFilter: "skill" }`; `"subagents for review"` → agent; search on fixture catalog: `"deploy railway"` first result id `alpha/skill/deploy-railway`; `"deploy zzz"` returns results with `usedFallback: true`; category filter excludes others; `"deplo"` (prefix) finds it; `"raliway"` (typo) finds it.
- [ ] **Step 2–4:** fail → implement → pass. Commit `feat(site): query parsing and search`.

### Task 8: URL state, catalog loading, issue URL

**Files:** Create `site/src/state/urlState.ts`, `site/src/catalog/useCatalog.ts`, `site/src/request/issueUrl.ts`, tests.

**Interfaces:**
- Produces:
  ```ts
  interface SearchState { q: string; types: ArtifactType[]; category: string | null; tags: string[] }
  readSearchState(search: string): SearchState      // ?q=&type=a,b&category=&tag=a,b ; unknown types dropped
  writeSearchState(s: SearchState): string          // "?..." with empty params omitted, "" when all empty
  useCatalog(): { status: "loading" | "ready" | "error"; catalog?: Catalog; error?: string }  // fetch `${BASE_URL}catalog.json`, module-level cache
  skillRequestUrl(query: string): string             // ISSUE_NEW_URL + URLSearchParams{ template: "skill-request.yml", title: "Skill request: <query≤80>", what: <query≤1500> }
  ```
- [ ] **Step 1: Tests** — round-trip of a full state; `?type=skill,bogus` → `["skill"]`; `skillRequestUrl("a&b")` contains `what=a%26b`; 2000-char query truncated to 1500 in `what`; `useCatalog` with mocked fetch → ready, and → error with message on 404.
- [ ] **Step 2–4:** fail → implement → pass. Commit `feat(site): url state, catalog loader, issue url`.

### Task 9: Search page and cards

**Files:** Create `site/src/components/ArtifactCard.tsx`, `FilterChips.tsx`, `CopyButton.tsx`, `TrustBadges.tsx`, `site/src/pages/SearchPage.tsx`, `site/src/App.tsx` (routes `/`, `/a/*`, `/bundle`), `site/src/styles.css`, tests.

**Interfaces:**
- Consumes: Tasks 7–8; `useBundle` from Task 11 is wired in Task 11 (card renders an `onAddToBundle` prop if given).
- Produces: `<ArtifactCard artifact onAddToBundle? inBundle? />`, `<CopyButton text label />` (uses `navigator.clipboard.writeText`, shows "Copied" in an `aria-live="polite"` region), `<TrustBadges trust />` (badges `hooks`, `mcp`, `bin`, `secrets`).

- [ ] **Step 1: Tests** (RTL, fixture catalog injected via a `CatalogProvider`/prop) — typing the spec example query shows `deploy-railway` card first and the `skill` chip active; URL updates to contain `q=`; query with no results shows "Nothing found" and a link whose href starts with `ISSUE_NEW_URL`; card for alpha shows badges `hooks`, `mcp`, `bin`, `secrets` and "≈ N tokens"; pressing `/` focuses input.
- [ ] **Step 2–4:** fail → implement → pass. Layout per spec §7.4–7.5 and §9 (1 col < 640px, 2 cols, 3 cols ≥ 1024px; dark mode via `prefers-color-scheme`). Commit `feat(site): search page and cards`.

### Task 10: Artifact detail page

**Files:** Create `site/src/components/Markdown.tsx`, `site/src/pages/ArtifactPage.tsx`, tests.

**Interfaces:**
- Consumes: catalog; fetches `${BASE_URL}content/<id with / → __>.md` (same encoding as Task 6).
- Produces: `<Markdown source />` — react-markdown + remark-gfm, `urlTransform` allowing only `http:`, `https:`, `mailto:`, relative; links `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 1: Tests** — `<Markdown>` with `<script>alert(1)</script>` renders no script element; `[x](javascript:alert(1))` has no `javascript:` href; detail page for a plugin lists children grouped by type, trust panel with hook command text `curl -s https://example.com`, context table; hook page shows event/matcher/command; unknown id shows "Not found" and a link to `/`.
- [ ] **Step 2–4:** fail → implement → pass. Commit `feat(site): artifact detail page`.

### Task 11: Bundle builder

**Files:** Create `site/src/bundle/bundleOutput.ts`, `site/src/bundle/useBundle.ts`, `site/src/pages/BundlePage.tsx`, tests; modify `SearchPage.tsx`, `ArtifactPage.tsx` to pass `onAddToBundle`.

**Interfaces:**
- Produces:
  ```ts
  settingsJson(plugins: string[]): string     // JSON.stringify(obj, null, 2) per spec §8.1, plugins sorted
  shellScript(plugins: string[]): string      // "#!/usr/bin/env bash\nset -euo pipefail\nclaude plugin marketplace add IvanBlinov/awesome-skills-marketplace --scope project\n" + one "claude plugin install <p>@awesome-skills-marketplace --scope project" per plugin
  useBundle(): { plugins: string[]; add(p: string): void; remove(p: string): void; clear(): void; has(p: string): boolean }
  // localStorage key "asm.bundle.v1"; initial value from ?p=a,b on /bundle overrides storage
  ```
  Child artifacts add their parent plugin.

- [ ] **Step 1: Tests** — `settingsJson(["b","a"])` parses to an object whose `enabledPlugins` keys are `a@awesome-skills-marketplace`, `b@awesome-skills-marketplace`; script has 2 install lines; `useBundle` works when `localStorage.getItem` throws; `/bundle?p=alpha,beta` shows both, total tokens, merged trust badges, the two notes from spec §8.1, and a share link containing `p=alpha%2Cbeta` or `p=alpha,beta`.
- [ ] **Step 2–4:** fail → implement → pass. Commit `feat(site): bundle builder`.

### Task 12: CI and deploy

**Files:** Create `.github/workflows/validate.yml`, `.github/workflows/pages.yml`.

- [ ] **Step 1:** `validate.yml` on `pull_request` + `push` to non-main: install Claude Code CLI pinned (`npm i -g @anthropic-ai/claude-code@<current version from claude --version>`), run `claude plugin validate . --strict` and loop over `plugins/*/` with `--strict`; in `site/`: `npm ci`, `npm run index:check`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run e2e`. `permissions: contents: read`. Actions pinned to SHAs.
- [ ] **Step 2:** `pages.yml` on push to `main` + `workflow_dispatch`: checkout `fetch-depth: 0`, setup-node 20 with npm cache, `npm ci && npm run build` in `site/`, `upload-pages-artifact` path `site/dist`, `deploy-pages`. Build job `contents: read`; deploy job `pages: write`, `id-token: write`; `concurrency: pages`.
- [ ] **Step 3:** Validate YAML with `npx --yes @action-validator/cli` (or `actionlint` if installed). Expected: no errors. Commit `ci: validate PRs and deploy catalog to pages`.

### Task 13: E2E

**Files:** Create `site/playwright.config.ts` (webServer `npm run build && npx vite preview --port 4173`, baseURL `http://localhost:4173/awesome-skills-marketplace/`), `site/e2e/catalog.spec.ts`.

- [ ] **Step 1:** Five tests from spec §12 against the real repo catalog, using `find-skill` as the known skill: (1) query "I need a skill to find skills" → `find-skill` card visible, skill chip active; (2) open card → Markdown heading visible, copy install button shows "Copied"; (3) add `marketplace-tools` to bundle → settings output contains `marketplace-tools@awesome-skills-marketplace`; (4) query "zzzqqq" → request link href contains `what=zzzqqq`; (5) direct `goto("a/marketplace-tools/skill/find-skill")` renders the page.
- [ ] **Step 2:** `npm run e2e` → 5 passed. **Step 3:** `npm test` → coverage ≥ 80%. Commit `test(site): e2e flows`.
