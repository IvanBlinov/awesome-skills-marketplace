import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders markdown", () => {
    const { container } = render(<Markdown source={"# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |"} />);
    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("never renders raw html", () => {
    const { container } = render(<Markdown source={'<script>alert(1)</script><img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("drops javascript: links and opens others in a new tab", () => {
    const { container } = render(<Markdown source={"[bad](javascript:alert(1)) [good](https://x.y) [mail](mailto:a@b.c)"} />);
    const links = [...container.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).not.toContain("javascript:alert(1)");
    const good = links.find((a) => a.textContent === "good")!;
    expect(good).toHaveAttribute("href", "https://x.y");
    expect(good).toHaveAttribute("rel", "noopener noreferrer");
    expect(good).toHaveAttribute("target", "_blank");
    expect(links.find((a) => a.textContent === "mail")).toHaveAttribute("href", "mailto:a@b.c");
  });
});
