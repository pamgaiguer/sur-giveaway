import { test, expect } from "@playwright/test";
const post = {
  media: {
    id: "1",
    permalink: "https://www.instagram.com/p/ABC/",
    caption: "Sorteio de ingressos",
  },
  importedAt: "2026-09-29T12:00:00Z",
  comments: ["ana", "bia", "caio", "dani"].map((username, i) => ({
    id: String(i),
    username,
    text: `Quero ir ao show @amigo${i}`,
    mentionedUsers: [`amigo${i}`],
  })),
};
test("importação, filtros, sorteio, exportação e curadoria identificada", async ({
  page,
}) => {
  await page.route("**/api/instagram/post", (route) =>
    route.fulfill({ json: post }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Link do Instagram (API)", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /A sorte também/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/sur-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await page.getByLabel("Link do post do Instagram").fill(post.media.permalink);
  await page.getByRole("button", { name: "Carregar comentários" }).click();
  await expect(
    page.getByText("Post encontrado", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Blacklist manual").fill("@dani");
  await expect(page.getByText("Na blacklist")).toBeVisible();
  await page.getByLabel("Pesquisar participante por username").fill("ana");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Pesquisar participante por username").fill("");
  await page.getByRole("button", { name: "SORTEAR 🤘", exact: true }).click();
  await expect(page.getByLabel("Blacklist manual")).toBeDisabled();
  await expect(page.getByText("SUR", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream!) raw += chunk.toString();
  const result = JSON.parse(raw);
  expect(result.mode).toBe("random");
  expect(
    new Set(
      [...result.winners, ...result.alternates].map(
        (w: { username: string }) => w.username,
      ),
    ).size,
  ).toBe(3);
  expect(result.snapshot.blacklist).toEqual(["dani"]);
  await page.getByRole("button", { name: "Novo sorteio" }).click();
  await expect(page.getByLabel("Blacklist manual")).toBeEnabled();
  await page.getByText("Configurações avançadas", { exact: true }).click();
  await page.getByLabel("Pesquisar participante para curadoria").fill("ana");
  await page.getByRole("button", { name: /Selecionar @ana/ }).click();
  await expect(
    page.getByText("CURADORIA / SIMULAÇÃO — SELEÇÃO MANUAL", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SUR", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Blacklist manual")).toHaveValue("@dani");
  await expect(page.getByText("Post encontrado", { exact: true })).toHaveCount(
    0,
  );
});
test("mobile sem overflow e estado de erro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/instagram/post", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "O token expirou ou é inválido." },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Link do Instagram (API)", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/sur-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await page.getByLabel("Link do post do Instagram").fill(post.media.permalink);
  await page.getByRole("button", { name: "Carregar comentários" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "token expirou" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "SORTEAR 🤘", exact: true }),
  ).toBeDisabled();
});
