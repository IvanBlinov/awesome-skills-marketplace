# Spec: Marketplace Catalog Site (GitHub Pages)

- **Status:** Draft
- **Date:** 2026-10-21
- **Scope:** v1 (MVP + selected features)
- **Marketplace name:** `awesome-skills-marketplace`
- **Repository:** `IvanBlinov/awesome-skills-marketplace`
- **Site URL:** `https://ivanblinov.github.io/awesome-skills-marketplace/` (GitHub Pages,
  Vite `base: "/awesome-skills-marketplace/"`)

## 1. Summary

A static web app, hosted on GitHub Pages, that lets users search everything in this
marketplace repository (plugins, skills, agents, commands, hooks, MCP servers) by
free-text keywords and shows matches as cards. It also helps users install what they
found, judge whether it is safe and cheap to install, and ask for what is missing.

There is no backend. All heavy work happens at build time in GitHub Actions; the browser
only loads a prebuilt JSON catalog and searches it locally.

## 2. Goals and non-goals

### Goals
- G1. A user types a natural sentence ("I need a skill for deploying to Railway") and gets
  relevant artifacts as cards in under 100 ms after the catalog is loaded.
- G2. Every artifact has a detail page with its rendered content and a one-click install
  command.
- G3. Users can pick several plugins and get a ready-to-commit `.claude/settings.json`.
- G4. Users can see, before installing, what a plugin runs on their machine (hooks, MCP
  servers, executables, required secrets).
- G5. Users can see how much context a plugin adds.
- G6. When nothing matches, users can request a new skill in one click.
- G7. The catalog is machine-readable so Claude itself can search it (via a `find-skill`
  skill shipped in this marketplace).

### Non-goals (v1)
- Indexing external marketplaces or external plugin sources. Only artifacts that live in
  this repository are indexed.
- Semantic / embedding search (content is English; keyword search is enough for v1).
- Install counts, live GitHub stars, search analytics, user accounts, ratings.
- SEO prerendering of detail pages.
- Localization. UI and content are English only.

## 3. Constraints

| Constraint | Consequence |
|---|---|
| GitHub Pages serves static files only | Catalog is generated at build time; search runs in the browser |
| No secrets in the client | No authenticated GitHub API calls from the browser |
| Unauthenticated GitHub API: 60 req/h per IP | No runtime GitHub API calls at all in v1 |
| Pages has no server-side routing | SPA routing needs a `404.html` fallback (see §7.6) |
| Artifact content is untrusted Markdown | Render without raw HTML (see §11) |

## 4. Repository layout

```text
ai-marketplace/
├── .claude-plugin/marketplace.json
├── plugins/
│   └── <plugin>/
│       ├── .claude-plugin/plugin.json
│       ├── skills/<skill>/SKILL.md
│       ├── agents/<agent>.md
│       ├── commands/<command>.md
│       ├── hooks/hooks.json
│       ├── .mcp.json
│       ├── README.md
│       └── LICENSE
├── site/                      # the catalog web app
│   ├── indexer/               # build-time catalog generator (Node + TS)
│   ├── src/                   # React app
│   ├── public/
│   └── package.json
├── docs/specs/
└── .github/
    ├── ISSUE_TEMPLATE/skill-request.yml
    └── workflows/
        ├── validate.yml       # PR checks
        └── pages.yml          # build + deploy on push to main
```

## 5. Content conventions

The indexer depends on these. CI enforces them (§10).

- Every plugin has `.claude-plugin/plugin.json` with `name`, `version`, `description`,
  `author.name`, `license`. Its `name` equals the marketplace entry `name`.
- Every marketplace entry has `category` (one value from the fixed list below, kept in
  `site/indexer/categories.ts`) and `tags` (1–8 lowercase strings). Category is the broad
  shelf; tags carry specifics (`railway`, `react`, `postgres`). Adding a category needs a
  PR that updates `categories.ts`.

  | id | Label | Covers |
  |---|---|---|
  | `development` | Development | Writing and refactoring code, language/framework helpers |
  | `quality` | Testing & Review | Tests, TDD, code review, linting, debugging |
  | `security` | Security | Security review, secrets scanning, threat modeling |
  | `devops` | DevOps & Cloud | Deploy, CI/CD, infrastructure, monitoring |
  | `data-ai` | Data & AI | Data analysis, databases, LLM apps, prompts, evals |
  | `frontend-design` | Frontend & Design | UI, UX, design systems, accessibility |
  | `mobile` | Mobile | iOS, Android, React Native |
  | `docs-writing` | Docs & Writing | Documentation, specs, technical and marketing writing |
  | `productivity` | Productivity | Planning, git workflows, project management, automation |
  | `integrations` | Integrations | MCP servers and connectors to external services |
  | `meta` | Claude Code Tooling | Authoring skills/plugins/agents, harness configuration |
- `SKILL.md` and agent files have YAML frontmatter with `name` and `description`.
  - `name`: ≤ 64 chars, `^[a-z0-9-]+$`, must not contain `claude` or `anthropic`.
  - `description`: 20–1024 chars, states what it does and when to use it.
- Optional `keywords` in skill/agent frontmatter: extra search synonyms (array of strings).
  Indexed but not displayed.
- Skill and agent names are unique across the whole marketplace (avoids the cross-plugin
  collision issue).

## 6. Build pipeline (indexer)

`site/indexer` is a Node + TypeScript CLI run as `npm run index`. It reads the repo and
writes `site/public/catalog.json` and `site/public/llms.txt`.

### 6.1 Extraction rules

| Artifact type | Source | One card per |
|---|---|---|
| `plugin` | marketplace entry + `plugin.json` + `README.md` | plugin |
| `skill` | `skills/*/SKILL.md` (and paths listed in `plugin.json.skills`) | SKILL.md |
| `agent` | `agents/*.md` (or `plugin.json.agents`) | file |
| `command` | `commands/*.md` (or `plugin.json.commands`) | file |
| `hook` | `hooks/hooks.json` + inline `plugin.json.hooks` | event + matcher pair |
| `mcp` | `.mcp.json` + `plugin.json.mcpServers` | server |

Rules:
- Respect manifest semantics: `commands`, `agents` in `plugin.json` **replace** default
  directories; `skills` **adds** to `skills/`; `hooks` and `mcpServers` **merge**.
- Frontmatter is parsed with `gray-matter`. The body is kept as raw Markdown for the
  detail page and as plain text (Markdown stripped, max 4,000 chars) for search.
- A file that fails to parse fails the build with the file path and reason.

### 6.2 Derived fields

- **`updatedAt`**: last commit date touching the artifact path
  (`git log -1 --format=%cI -- <path>`). Requires `fetch-depth: 0` in CI.
- **`contextTokens`**: estimated tokens a plugin always adds to context = sum over its
  skills, agents and commands of `name + description` length, using
  `Math.ceil(chars / 4)`. Displayed as "≈ N tokens". Also `bodyTokens` per artifact
  (loaded only when invoked), same estimate.
- **`trust`** (per plugin, see §8.2): computed from hooks, MCP config, `bin/`,
  `userConfig`.
- **`install`**: precomputed strings, e.g.
  `/plugin marketplace add IvanBlinov/awesome-skills-marketplace` and
  `/plugin install <plugin>@awesome-skills-marketplace`.
  Skills, agents and commands show their parent plugin's install command plus the
  invocation name (`/<plugin>:<skill>`).

### 6.3 `catalog.json` schema

```ts
type ArtifactType = "plugin" | "skill" | "agent" | "command" | "hook" | "mcp";

interface Catalog {
  schemaVersion: 1;
  generatedAt: string;            // ISO date
  marketplace: {
    name: string;
    repo: string;                 // "owner/repo"
    description: string;
    addCommand: string;
  };
  categories: string[];
  artifacts: Artifact[];
}

interface Artifact {
  id: string;                     // "<plugin>/<type>/<name>", unique, URL-safe
  type: ArtifactType;
  name: string;
  displayName?: string;
  description: string;
  plugin: string;                 // parent plugin name ("" for type=plugin is not allowed; use own name)
  category: string;               // inherited from plugin entry
  tags: string[];                 // inherited from plugin entry
  keywords: string[];             // from frontmatter, may be empty
  path: string;                   // repo-relative path
  sourceUrl: string;              // GitHub blob URL at main
  updatedAt: string;
  version?: string;               // plugin version
  author?: string;
  invocation?: string;            // "/plugin:skill" for skill/command, "plugin:agent" for agent
  install: { add: string; install: string };
  searchText: string;             // stripped body, ≤ 4,000 chars
  body?: string;                  // raw Markdown; omitted from catalog.json, see §6.4
  bodyTokens?: number;
  // plugin-only
  contextTokens?: number;
  trust?: TrustReport;
  dependencies?: string[];
  children?: string[];            // ids of contained artifacts
  // hook-only
  hook?: { event: string; matcher?: string; commands: string[] };
  // mcp-only
  mcp?: { transport: "stdio" | "http" | "sse"; command?: string; url?: string };
}

interface TrustReport {
  hasHooks: boolean;
  hookEvents: string[];
  hasMcp: boolean;
  mcpServers: string[];
  hasBin: boolean;
  requiresSecrets: string[];      // userConfig keys with sensitive: true
  requiresConfig: string[];       // other userConfig keys
  networkCommands: boolean;       // hook commands matching curl|wget|nc|fetch
  level: "none" | "low" | "review"; // see §8.2
}
```

### 6.4 Output files

| File | Content | Budget |
|---|---|---|
| `catalog.json` | all artifacts without `body` | ≤ 500 KB gzip |
| `content/<id>.md` | raw body, fetched on detail page | — |
| `llms.txt` | marketplace summary + one line per artifact with URL | — |

## 7. Web app

### 7.1 Stack
- Vite + React 18 + TypeScript, React Router.
- MiniSearch for search.
- `react-markdown` + `remark-gfm` for rendering (no `rehype-raw`).
- Plain CSS modules with CSS variables; light/dark via `prefers-color-scheme`.
- Vitest + React Testing Library; Playwright for e2e.

### 7.2 Search

Index fields and boosts:

| Field | Boost |
|---|---|
| `name`, `displayName` | 4 |
| `keywords`, `tags` | 3 |
| `description` | 2 |
| `plugin`, `category` | 1.5 |
| `searchText` | 1 |

Options: `prefix: true`, `fuzzy: 0.2`, `combineWith: "AND"`, falling back to `"OR"` when
AND returns nothing. Ties are broken by `updatedAt` desc.

Query preprocessing (`parseQuery(input) → { terms, typeFilter }`):
1. Lowercase, strip punctuation.
2. Detect type intent words and turn them into a type filter, removing them from terms:
   `skill(s)` → skill, `agent(s)` / `subagent(s)` → agent, `command(s)` / `slash` →
   command, `hook(s)` → hook, `mcp` / `server(s)` → mcp, `plugin(s)` → plugin.
   An explicit filter chip set by the user wins over a detected one.
3. Remove English stopwords plus filler phrases: `i need`, `i want`, `looking for`,
   `something`, `that`, `can`, `help`, `me`, `for`, `to`, `a`, `the`, `with`, …
   (list in `src/search/stopwords.ts`).
4. If no terms remain, show all artifacts matching the filters.

Example: `"I need a skill for deploying to Railway"` →
`{ terms: ["deploying", "railway"], typeFilter: "skill" }`.

### 7.3 Pages

| Route | Page |
|---|---|
| `/` | Search: input, filter chips, result cards |
| `/a/:id` | Artifact detail |
| `/bundle` | Bundle builder |
| `/request` | Redirect helper to the skill-request issue (optional, see §8.4) |

URL state: `/?q=deploy%20railway&type=skill&category=devops&tag=ci`. Changing the input
updates the URL with `replaceState` (debounced 200 ms); back/forward works.

### 7.4 Search page
- Search input, autofocused; `/` key focuses it.
- Filter chips: type (multi), category (single), tags (multi).
- Result count and "clear filters".
- Card grid (1 column on mobile, 2–3 on desktop).
- Empty state: "Nothing found for '…'" + **Request this skill** button (§8.4) + 3
  suggestions with the AND→OR fallback if any.

### 7.5 Card
Shows: type badge, name, one-line description (clamped to 3 lines), parent plugin, up
to 3 tags, `updatedAt` as relative date, trust badges for plugins (§8.2), and actions:
**Copy install command**, **Add to bundle** (plugins, and the parent plugin for child
artifacts), and link to detail.

### 7.6 Detail page
- Header: type, name, plugin, version, author, updated date, source link.
- Install block: `add` and `install` commands with copy buttons; invocation name.
- Rendered Markdown body (loaded from `content/<id>.md`).
- For plugins: list of children grouped by type, trust panel (§8.2), context cost (§8.3),
  dependencies.
- For hooks: event, matcher, and the exact command(s) in a code block.

Routing on Pages: `vite build` copies `index.html` to `404.html`; app uses
`BrowserRouter` with `basename` from `import.meta.env.BASE_URL`.

## 8. Features

### 8.1 Bundle builder
- Users add plugins from cards or detail pages; selection is kept in `localStorage`
  (wrapped in try/catch; works without it).
- `/bundle` lists selected plugins with their combined context cost and merged trust
  summary.
- Output tabs, each with a copy button and a download button:
  1. `.claude/settings.json` snippet:
     ```json
     {
       "extraKnownMarketplaces": {
         "awesome-skills-marketplace": {
           "source": { "source": "github", "repo": "IvanBlinov/awesome-skills-marketplace" }
         }
       },
       "enabledPlugins": { "<plugin>@awesome-skills-marketplace": true }
     }
     ```
  2. Shell script: `claude plugin marketplace add …` + one `claude plugin install … --scope project` per plugin.
- Note shown under output: project-scope plugins load after the workspace trust prompt;
  third-party marketplaces do not auto-update by default (with the steps to turn it on).
- Shareable: `/bundle?p=a,b,c` loads a selection.

### 8.2 Trust panel
Computed at build time from the plugin's files.

| Signal | Source |
|---|---|
| Hooks and their events | `hooks/hooks.json`, `plugin.json.hooks` |
| Network commands in hooks | regex on hook commands: `\b(curl\|wget\|nc\|ncat\|Invoke-WebRequest)\b` |
| MCP servers (name, transport, command/URL) | `.mcp.json`, `plugin.json.mcpServers` |
| Executables on PATH | presence of `bin/` |
| Secrets / config | `plugin.json.userConfig` |

`level`:
- `none`: no hooks, no MCP, no `bin/`.
- `low`: MCP or `userConfig` only.
- `review`: any hook or `bin/`.

Card shows compact badges (`hooks`, `mcp`, `bin`, `secrets`). Detail page shows the full
list including the exact hook commands, so users can read what runs.

### 8.3 Context cost
- Plugin card: "≈ N tokens always loaded".
- Detail page: table of each skill/agent/command with its description tokens and body
  tokens (body loads only when invoked).
- Bundle builder: total.
- Footnote explains it is an estimate (chars / 4).

### 8.4 Request a skill
- Button on the empty state and in the footer.
- Opens `https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new?template=skill-request.yml&title=…&what=…`
  with the current query prefilled (URL-encoded, truncated to 1,500 chars).
- `.github/ISSUE_TEMPLATE/skill-request.yml` fields: what (prefilled), use case,
  example prompt, artifact type (dropdown). Label `skill-request`.

### 8.5 Machine-readable catalog and `find-skill`
- `catalog.json` and `llms.txt` are public at the Pages root.
- A plugin `marketplace-tools` in this repo ships a skill `find-skill`:
  - Trigger: the user asks whether a skill/agent/plugin exists for a task.
  - Steps: WebFetch
    `https://ivanblinov.github.io/awesome-skills-marketplace/catalog.json`, match on
    name/description/tags/keywords, return the top 5 with install commands.
  - It never installs anything itself; it prints the commands.

## 9. Performance and accessibility
- First load JS ≤ 150 KB gzip; `catalog.json` fetched in parallel.
- Search result update ≤ 50 ms for 2,000 artifacts on a mid-range laptop.
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95.
- Full keyboard use; cards are links; copy buttons announce "Copied" via `aria-live`.
- Works at 360 px width without horizontal scroll.

## 10. CI / CD

### `validate.yml` (pull requests)
1. `claude plugin validate . --strict` (marketplace; CLI version pinned).
2. `claude plugin validate plugins/<p> --strict` for every plugin.
3. Indexer in check mode: enforces §5 conventions (frontmatter limits, unique names,
   category in list, LICENSE and README present) and fails on parse errors.
4. `site`: typecheck, lint, unit tests with coverage ≥ 80%, build.
5. Playwright e2e against `vite preview`.

### `pages.yml` (push to `main`)
1. `actions/checkout` with `fetch-depth: 0`.
2. `npm ci`, `npm run index`, `npm run build` in `site/`.
3. `actions/upload-pages-artifact` + `actions/deploy-pages`.

All third-party actions pinned to commit SHAs; default `permissions: contents: read`;
deploy job adds `pages: write`, `id-token: write`.

## 11. Security
- Markdown bodies are rendered without raw HTML (`react-markdown` default, no
  `rehype-raw`); links get `rel="noopener noreferrer"`; only `http`, `https`, `mailto`
  URLs are allowed.
- Hook commands and MCP commands are shown as text in code blocks, never executed or
  interpreted.
- No secrets in the build; the indexer reads only repo files and git metadata.
- Issue URLs are built with `URLSearchParams`.

## 12. Testing
- **Indexer unit tests** (fixtures in `site/indexer/__fixtures__/`): each artifact type,
  manifest replace/add/merge semantics, malformed frontmatter, trust levels, token
  estimate, `updatedAt`.
- **App unit tests**: `parseQuery`, search ranking with a fixture catalog, bundle
  output generation, URL state.
- **Component tests**: card, filter chips, empty state with request link.
- **E2E (Playwright)**:
  1. Type "I need a skill for deploying to Railway" → skill cards with matching names on
     top, type chip "skill" active.
  2. Open a card → detail page renders Markdown, copy install command works.
  3. Add two plugins to bundle → settings.json contains both `enabledPlugins` keys.
  4. Query with no results → request button opens issue URL containing the query.
  5. Deep link `/a/<id>` loads directly (404 fallback works).

## 13. Acceptance criteria
- [ ] Every artifact in the repo appears exactly once in `catalog.json`; CI fails on
      unknown or malformed artifacts.
- [ ] The example query from §7.2 returns the expected artifacts from the fixture
      catalog in the expected order.
- [ ] Filters and query survive reload and are shareable by URL.
- [ ] Every plugin card shows trust badges and context cost; detail page shows exact hook
      commands.
- [ ] Bundle builder output passes `claude plugin validate`-compatible JSON shape and
      installs on a clean machine.
- [ ] Empty state opens a prefilled skill-request issue.
- [ ] `catalog.json` and `llms.txt` are served at the Pages root; `find-skill` returns
      install commands for a known skill.
- [ ] §9 budgets met; coverage ≥ 80%.

## 14. Later (v2 candidates)
- "What's new" page and RSS/Atom feed from git history and version bumps.
- Download a skill as `.zip` for claude.ai / Desktop upload.
- Plugin dependency graph.
- Side-by-side compare of 2–3 plugins.
- Ctrl+K command palette, PWA/offline.
- giscus reactions/discussion per artifact.
- Optional semantic search (precomputed embeddings + transformers.js).
- Build-time GitHub stars and last-release info.

## 15. Decisions
1. Marketplace `name` and repo: `awesome-skills-marketplace` under `IvanBlinov`.
2. Categories: the 11 in §5.
3. Hosting: GitHub Pages at the default project URL, no custom domain.

GitHub Pages must be set to **Source: GitHub Actions** in the repo settings.
