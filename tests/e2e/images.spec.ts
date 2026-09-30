import { test, expect } from "@playwright/test";
test("OCR local real, revisão, deduplicação e sorteio sem Meta", async ({
  page,
}) => {
  test.setTimeout(120000);
  const external: string[] = [];
  const api: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:3000") &&
      !request.url().startsWith("blob:") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
    if (request.url().includes("/api/instagram")) api.push(request.url());
  });
  await page.goto("/");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1100;
    c.height = 420;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1100, 420);
    ctx.fillStyle = "black";
    ctx.font = "48px Arial";
    ["@ana_rock", "@bia_rock", "@caio_rock", "@ana_rock"].forEach((line, i) =>
      ctx.fillText(line, 40, 80 + i * 90),
    );
    return c.toDataURL("image/png").split(",")[1];
  });
  const file = {
    name: "participantes.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  await page
    .getByLabel("Adicionar imagens dos participantes")
    .setInputFiles([file, { ...file, name: "outro-print.png" }]);
  await page.getByRole("button", { name: "Ler @usuários das imagens" }).click();
  const review = page.getByLabel(
    "Participantes revisados — um @usuário por linha",
  );
  await expect(review).toBeVisible({ timeout: 100000 });
  await expect(review).toHaveValue("@ana_rock\n@bia_rock\n@caio_rock");
  await expect(
    page.getByRole("button", { name: "SORTEAR 🤘", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel(
      "Conferi os nomes e confirmo que esta é a lista de participantes.",
    )
    .check();
  await page.getByRole("button", { name: "Usar lista no sorteio" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await review.fill("@ana_rock\n@bia_rock\n@caio_rock\n@dani_rock");
  await expect(
    page.getByRole("button", { name: "SORTEAR 🤘", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel(
      "Conferi os nomes e confirmo que esta é a lista de participantes.",
    )
    .check();
  await page.getByRole("button", { name: "Usar lista no sorteio" }).click();
  await page.getByRole("button", { name: "SORTEAR 🤘", exact: true }).click();
  await expect(page.getByText("SUR", { exact: true })).toBeVisible();
  await expect(review).toBeDisabled();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const stream = await (await downloading).createReadStream();
  let raw = "";
  for await (const chunk of stream!) raw += chunk.toString();
  const result = JSON.parse(raw);
  expect(result.snapshot.source).toBe("images");
  expect(result.snapshot.files).toEqual([
    "participantes.png",
    "outro-print.png",
  ]);
  expect(result.winners[0].comment.source).toBe("images");
  expect(api).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({
    path: "test-results/images-result.png",
    fullPage: true,
  });
});
test("limite de cinco imagens e mobile sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Adicionar imagens dos participantes").setInputFiles(
    Array.from({ length: 6 }, (_, i) => ({
      name: `print${i}.png`,
      mimeType: "image/png",
      buffer: Buffer.from("test"),
    })),
  );
  await expect(
    page.getByText("Selecione entre 1 e 5 imagens.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ler @usuários das imagens" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
