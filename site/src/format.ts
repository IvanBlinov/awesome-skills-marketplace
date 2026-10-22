const UNITS: [limit: number, seconds: number, unit: string][] = [
  [3600, 60, "minute"],
  [86400, 3600, "hour"],
  [86400 * 30, 86400, "day"],
  [86400 * 365, 86400 * 30, "month"],
  [Infinity, 86400 * 365, "year"],
];

/** "3 hours ago", "yesterday", … ; "unknown" for the indexer's epoch fallback. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (then.getTime() <= 0) return "unknown";
  const seconds = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const [, size, unit] = UNITS.find(([limit]) => seconds < limit)!;
  const n = Math.floor(seconds / size);
  if (unit === "day" && n === 1) return "yesterday";
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function formatTokens(n: number): string {
  return `≈ ${n.toLocaleString("en-US")} tokens`;
}
