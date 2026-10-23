# research-tools

A researcher agent that answers technical questions from primary sources and writes a
cited report, plus the citation rules it follows, packaged so other plugins can reuse
them.

`sdd-engineering` depends on this plugin: its `spec-creator` agent calls the researcher
for prior art and API facts. You can also use it on its own.

## Install

```text
/plugin marketplace add IvanBlinov/awesome-skills-marketplace
/plugin install research-tools@awesome-skills-marketplace
```

## Contents

| Component | Name | What it does |
|---|---|---|
| Agent | `research-tools:researcher` | Splits a question into 3–5 sub-questions, searches, reads primary sources in full, writes a report with inline citations and confidence levels, and returns a short summary |
| Skill | `research-tools:source-citation` | Source quality, citation format, confidence levels and untrusted-content rules. Load it from any agent or skill that makes factual claims |

## Use

Ask Claude to delegate:

```text
Use the research-tools:researcher agent to find out how plugin dependencies are versioned in Claude Code.
```

Or mention it directly: `@research-tools:researcher …`.

The researcher never asks you questions and never dispatches other agents, so it works
the same when another agent calls it. Give it the question, any constraints (versions,
platforms) and, optionally, the file name to use.

## Output

Reports go to `docs/research/<date>-<slug>.md` in your project. Change the directory with
the `research_dir` option when you enable the plugin, or in `/plugin` → research-tools →
Configure.

## Permissions

The agent uses `Read`, `Grep`, `Glob`, `WebSearch`, `WebFetch` and `Write`. It has no
hooks, MCP servers or executables. Fetched pages are treated as untrusted data (see the
`source-citation` skill).

## Versions

See [CHANGELOG.md](CHANGELOG.md). Credits for adapted content: [NOTICE.md](NOTICE.md).
