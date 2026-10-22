---
name: find-skill
description: Searches the awesome-skills-marketplace catalog for skills, agents, commands, hooks, MCP servers and plugins that fit a task, and returns the install commands. Use when the user asks whether a skill, agent or plugin exists for something, or wants to find tooling in this marketplace.
keywords: [search, discover, catalog, install, marketplace, lookup]
---

# Find a skill in awesome-skills-marketplace

The marketplace publishes a machine-readable catalog of everything it contains.

## Steps

1. Fetch the catalog with WebFetch:
   `https://ivanblinov.github.io/awesome-skills-marketplace/catalog.json`
2. The catalog has an `artifacts` array. Each artifact has `type`, `name`, `description`,
   `plugin`, `category`, `tags`, `keywords`, `invocation`, `install` and `sourceUrl`.
3. Pull the key terms out of the user's request (drop filler words such as "I need",
   "something for"). If the user names a type ("skill", "agent", "hook", "MCP"), keep
   only artifacts of that type.
4. Rank artifacts by how well `name`, `keywords`, `tags` and `description` match the
   terms, in that order of importance.
5. Reply with the top 5 matches. For each one give:
   - type and name, plus the plugin it belongs to
   - one-line description
   - install commands: `install.add` then `install.install`
   - `invocation` if present, so the user knows how to call it
   - `sourceUrl`
6. If nothing matches, say so and give the request link:
   `https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new?template=skill-request.yml`

## Rules

- Never install anything yourself. Only print the commands.
- If the fetch fails, say the catalog is unreachable and link the site:
  `https://ivanblinov.github.io/awesome-skills-marketplace/`
