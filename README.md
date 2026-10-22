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
| [marketplace-tools](plugins/marketplace-tools) | meta | Find skills, agents and plugins in this marketplace from inside Claude Code |

## Contributing

Each plugin lives in `plugins/<name>/` with `.claude-plugin/plugin.json`, `README.md`,
`LICENSE` and its components (`skills/`, `agents/`, `commands/`, `hooks/`, `.mcp.json`).
Conventions are in [docs/specs/2026-10-21-catalog-site.md](docs/specs/2026-10-21-catalog-site.md) §5
and are checked in CI. Bump `version` in `plugin.json` on every change.

Missing something? [Request a skill](https://github.com/IvanBlinov/awesome-skills-marketplace/issues/new?template=skill-request.yml).
