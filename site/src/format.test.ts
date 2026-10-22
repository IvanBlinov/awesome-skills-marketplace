import { describe, expect, it } from "vitest";
import { formatRelative } from "./format";

const NOW = new Date("2026-10-21T12:00:00Z");

describe("formatRelative", () => {
  it.each([
    ["2026-10-21T11:59:30Z", "just now"],
    ["2026-10-21T09:00:00Z", "3 hours ago"],
    ["2026-10-20T12:00:00Z", "yesterday"],
    ["2026-10-11T12:00:00Z", "10 days ago"],
    ["2026-08-21T12:00:00Z", "2 months ago"],
    ["2024-10-21T12:00:00Z", "2 years ago"],
  ])("%s → %s", (iso, expected) => {
    expect(formatRelative(iso, NOW)).toBe(expected);
  });

  it("returns 'unknown' for the epoch fallback", () => {
    expect(formatRelative(new Date(0).toISOString(), NOW)).toBe("unknown");
  });
});
