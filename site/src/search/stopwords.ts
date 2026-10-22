import type { ArtifactType } from "../catalog/types";

/** Filler words dropped from free-text queries ("I need something for…"). */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "i", "me", "my", "we", "our", "you", "it", "is", "are", "be", "there", "any", "some",
  "need", "want", "wanted", "looking", "look", "something", "anything", "that", "which", "what", "how",
  "can", "could", "would", "should", "do", "does", "help", "helps", "please", "for", "to", "with", "of",
  "in", "on", "and", "or", "by", "from", "about", "into", "use", "using", "able", "lets", "let",
]);

/** Words that name an artifact type; they become a type filter instead of a search term. */
export const TYPE_WORDS: Readonly<Record<string, ArtifactType>> = {
  skill: "skill", skills: "skill",
  agent: "agent", agents: "agent", subagent: "agent", subagents: "agent",
  command: "command", commands: "command", slash: "command",
  hook: "hook", hooks: "hook",
  mcp: "mcp", server: "mcp", servers: "mcp",
  plugin: "plugin", plugins: "plugin",
};
