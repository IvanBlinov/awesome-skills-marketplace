import { expect, test } from "@playwright/test";

test("finds a skill from a natural-language query", async ({ page }) => {
  await page.goto("");
  await page.getByRole("searchbox").fill("I need a skill to find skills");
  await expect(page.getByRole("article").first().getByRole("heading")).toHaveText("find-skill");
  await expect(page.getByRole("checkbox", { name: /^skill/ })).toBeChecked();
  await expect(page).toHaveURL(/q=I\+need\+a\+skill/);
});

test("opens a card and copies the install command", async ({ page }) => {
  await page.goto("?q=find");
  await page.getByRole("link", { name: "find-skill" }).click();
  await expect(page.getByRole("heading", { name: "Find a skill in awesome-skills-marketplace" })).toBeVisible();
  await page.getByRole("region", { name: "Install" }).getByRole("button", { name: "Copy" }).nth(1).click();
  await expect(page.getByText("Copied")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe("/plugin install marketplace-tools@awesome-skills-marketplace");
});

test("builds a bundle settings file", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Add marketplace-tools to bundle" }).first().click();
  await page.getByRole("link", { name: "Bundle (1)" }).click();
  await expect(page.getByTestId("bundle-output")).toContainText('"marketplace-tools@awesome-skills-marketplace": true');
  await page.getByRole("tab", { name: "Shell script" }).click();
  await expect(page.getByTestId("bundle-output")).toContainText(
    "claude plugin install marketplace-tools@awesome-skills-marketplace --scope project",
  );
});

test("offers a prefilled skill request when nothing matches", async ({ page }) => {
  await page.goto("");
  await page.getByRole("searchbox").fill("zzzqqq");
  const link = page.getByRole("link", { name: "Request this skill" });
  await expect(link).toHaveAttribute("href", /what=zzzqqq/);
});

test("deep links load directly", async ({ page }) => {
  await page.goto("a/marketplace-tools/skill/find-skill");
  await expect(page.getByRole("heading", { level: 1, name: "find-skill" })).toBeVisible();
});

test("serves the machine-readable catalog", async ({ request }) => {
  const res = await request.get("catalog.json");
  expect(res.ok()).toBe(true);
  const catalog = await res.json();
  expect(catalog.artifacts.map((a: { id: string }) => a.id)).toContain("marketplace-tools/skill/find-skill");
  const llms = await request.get("llms.txt");
  expect(await llms.text()).toContain("find-skill");
});
