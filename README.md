# awesome-skills-marketplace

Curated Claude Code plugins, skills, agents and hooks.

**Browse and search the catalog:** https://ivanblinov.github.io/awesome-skills-marketplace/

## Install

```text
/plugin marketplace add IvanBlinov/awesome-skills-marketplace
/plugin install <plugin>@awesome-skills-marketplace
```

### Updates

Auto-update is off by default for third-party marketplaces. Turn it on in
`/plugin` → **Marketplaces** → **awesome-skills-marketplace** → **Enable auto-update**,
or update by hand:

```text
/plugin marketplace update awesome-skills-marketplace
```

Private or HTTPS-only setups without a GitHub SSH key: set
`CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.

### For a team

Commit this to your project's `.claude/settings.json` (the catalog site can generate it
for any set of plugins):

```json
{
  "extraKnownMarketplaces": {
    "awesome-skills-marketplace": {
      "source": { "source": "github", "repo": "IvanBlinov/awesome-skills-marketplace" }
    }
  },
  "enabledPlugins": { "marketplace-tools@awesome-skills-marketplace": true }
}
```

## Plugins

| Plugin | Category | Description |
|---|---|---|
| [sdd-engineering](plugins/sdd-engineering) | productivity | Spec Driven Development: spec → plan → TDD implementation → verification → retro, with approval gates |
| [research-tools](plugins/research-tools) | data-ai | Researcher agent with cited, primary-source reports; reusable citation rules |
| [architecture-reviewer](plugins/architecture-reviewer) | quality | Skeptical, read-only architecture review of designs, plans and code |
| [marketplace-tools](plugins/marketplace-tools) | meta | Find skills, agents and plugins in this marketplace from inside Claude Code |

`sdd-engineering` depends on `research-tools` and `architecture-reviewer`; installing it
installs both.

## Contributing

Each plugin lives in `plugins/<name>/` with `.claude-plugin/plugin.json`, `README.md`,
`LICENSE` and its components (`skills/`, `agents/`, `commands/`, `hooks/`, `.mcp.json`).
Conventions are in [docs/specs/2026-10-21-catalog-site.md](docs/specs/2026-10-21-catalog-site.md) §5
and are checked in CI. Every change to a plugin needs a `version` bump in its
`plugin.json` and a `CHANGELOG.md` entry; releases are tagged with
`claude plugin tag plugins/<name> --push`.

Missing something? [Request a skill](https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new?template=skill-request.yml).
