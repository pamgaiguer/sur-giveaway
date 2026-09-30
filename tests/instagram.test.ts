import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { InstagramClient } from "@/lib/instagram/client";
import { findMedia } from "@/lib/instagram/media";
import { getComments } from "@/lib/instagram/comments";
import { POST } from "@/app/api/instagram/post/route";
beforeEach(() => {
  vi.stubEnv("META_ACCESS_TOKEN", "test-secret");
  vi.stubEnv("INSTAGRAM_ACCOUNT_ID", "123");
  vi.stubEnv("META_API_VERSION", "v25.0");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const collect = async (client: InstagramClient) => {
  const all = [];
  for await (const page of client.pages("123/media", "id")) all.push(...page);
  return all;
};
it("percorre todas as páginas sem seguir URLs de next e sem token na URL", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      json({
        data: [{ id: "a" }],
        paging: {
          next: "https://evil.test/?access_token=leaked",
          cursors: { after: "cursor" },
        },
      }),
    )
    .mockResolvedValueOnce(json({ data: [{ id: "b" }] }));
  vi.stubGlobal("fetch", fetch);
  expect(await collect(new InstagramClient())).toHaveLength(2);
  expect(String(fetch.mock.calls[1][0])).toContain("graph.instagram.com");
  expect(String(fetch.mock.calls[1][0])).toContain("after=cursor");
  expect(String(fetch.mock.calls[0][0])).not.toContain("test-secret");
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer test-secret",
  );
});
it("aborta quando cursor repete", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        json({
          data: [],
          paging: { next: "next", cursors: { after: "same" } },
        }),
      ),
  );
  await expect(collect(new InstagramClient())).rejects.toMatchObject({
    code: "PAGINATION",
  });
});
it("aborta paginação sem cursor", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(json({ data: [], paging: { next: "next" } })),
  );
  await expect(collect(new InstagramClient())).rejects.toMatchObject({
    code: "PAGINATION",
  });
});
it.each([
  [190, "TOKEN"],
  [200, "PERMISSION"],
  [4, "RATE_LIMIT"],
  [2, "UNAVAILABLE"],
])("sanitiza erro Meta %s", async (code, expected) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        json({ error: { code, message: "test-secret" } }, 400),
      ),
  );
  await expect(collect(new InstagramClient())).rejects.toMatchObject({
    code: expected,
  });
  await expect(collect(new InstagramClient())).rejects.not.toThrow(
    "test-secret",
  );
});
it("encontra mídia em página posterior", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        json({
          data: [{ id: "1", permalink: "https://www.instagram.com/p/old/" }],
          paging: { next: "next", cursors: { after: "a" } },
        }),
      )
      .mockResolvedValueOnce(
        json({
          data: [
            { id: "2", permalink: "https://www.instagram.com/reel/target/" },
          ],
        }),
      ),
  );
  expect((await findMedia(new InstagramClient(), "target")).id).toBe("2");
});
it("informa mídia ausente na conta", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: [] })));
  await expect(
    findMedia(new InstagramClient(), "missing"),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("importa comentários e todas as páginas de respostas", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        json({ data: [{ id: "1", username: "ana", text: "oi" }] }),
      )
      .mockResolvedValueOnce(
        json({
          data: [{ id: "2", username: "bia", text: "@ana" }],
          paging: { next: "next", cursors: { after: "a" } },
        }),
      )
      .mockResolvedValueOnce(
        json({ data: [{ id: "3", username: "caio", text: "@bia" }] }),
      ),
  );
  expect(await getComments(new InstagramClient(), "456")).toHaveLength(3);
});
it("valida URL no endpoint antes de consultar API", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const response = await POST(
    new Request("http://localhost/api/instagram/post", {
      method: "POST",
      body: JSON.stringify({ url: "https://evil.test" }),
    }),
  );
  expect(response.status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("endpoint não retorna importação parcial quando respostas falham", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        json({
          data: [{ id: "1", permalink: "https://www.instagram.com/p/A/" }],
        }),
      )
      .mockResolvedValueOnce(
        json({ data: [{ id: "2", username: "ana", text: "oi" }] }),
      )
      .mockResolvedValueOnce(
        json({ error: { code: 4, message: "test-secret" } }, 429),
      ),
  );
  const response = await POST(
    new Request("http://localhost/api/instagram/post", {
      method: "POST",
      body: JSON.stringify({ url: "https://www.instagram.com/p/A/" }),
    }),
  );
  expect(response.status).toBe(429);
  const body = await response.json();
  expect(body.comments).toBeUndefined();
  expect(JSON.stringify(body)).not.toContain("test-secret");
});
