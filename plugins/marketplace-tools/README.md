# marketplace-tools

Tools for working with **awesome-skills-marketplace** from inside Claude Code.

## Skills

| Skill | What it does |
|---|---|
| `find-skill` | Searches the marketplace catalog and prints install commands for matching skills, agents and plugins |

## Install

```text
/plugin marketplace add IvanBlinov/awesome-skills-marketplace
/plugin install marketplace-tools@awesome-skills-marketplace
```

Then ask: "Is there a skill in awesome-skills-marketplace for deploying to Railway?"

`find-skill` needs network access to fetch
`https://ivanblinov.github.io/awesome-skills-marketplace/catalog.json`.
