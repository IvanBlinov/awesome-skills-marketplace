export interface Category {
  id: string;
  label: string;
  covers: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: "development", label: "Development", covers: "Writing and refactoring code, language/framework helpers" },
  { id: "quality", label: "Testing & Review", covers: "Tests, TDD, code review, linting, debugging" },
  { id: "security", label: "Security", covers: "Security review, secrets scanning, threat modeling" },
  { id: "devops", label: "DevOps & Cloud", covers: "Deploy, CI/CD, infrastructure, monitoring" },
  { id: "data-ai", label: "Data & AI", covers: "Data analysis, databases, LLM apps, prompts, evals" },
  { id: "frontend-design", label: "Frontend & Design", covers: "UI, UX, design systems, accessibility" },
  { id: "mobile", label: "Mobile", covers: "iOS, Android, React Native" },
  { id: "docs-writing", label: "Docs & Writing", covers: "Documentation, specs, technical and marketing writing" },
  { id: "productivity", label: "Productivity", covers: "Planning, git workflows, project management, automation" },
  { id: "integrations", label: "Integrations", covers: "MCP servers and connectors to external services" },
  { id: "meta", label: "Claude Code Tooling", covers: "Authoring skills/plugins/agents, harness configuration" },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
