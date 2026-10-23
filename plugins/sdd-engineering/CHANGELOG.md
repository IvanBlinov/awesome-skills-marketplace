# Changelog

All notable changes to `sdd-engineering` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the plugin uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-22

### Added

- `sdd-run` skill: orchestrates spec → plan → implement → verify → retro with two
  approval gates, a resumable ledger, `--auto` mode and one fix pass on NO-GO.
- Agents: `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`.
- Skills: `workflow-retro`, `test-driven-development`, `verification-before-completion`.
- Templates: spec, plan, ledger, verification report, retro.
- Options `specs_dir`, `plans_dir`, `verification_dir`, `retros_dir`.
- Dependencies: `research-tools` `^1.0.0`, `architecture-reviewer` `^1.0.0`.
