import { ISSUE_NEW_URL } from "../config";

const MAX_TITLE_QUERY = 80;
const MAX_WHAT = 1500;

/** GitHub "new issue" URL for the skill-request template, prefilled with the user's query. */
export function skillRequestUrl(query: string): string {
  const q = query.trim();
  const params = new URLSearchParams({
    template: "skill-request.yml",
    title: q ? `Skill request: ${q.slice(0, MAX_TITLE_QUERY)}` : "Skill request",
    what: q.slice(0, MAX_WHAT),
  });
  return `${ISSUE_NEW_URL}?${params.toString()}`;
}
