import "server-only";
import { InstagramClient } from "./client";
import { InstagramError } from "./errors";
import { extractShortcode } from "./url";
import type { InstagramMedia } from "./types";
export async function findMedia(
  client: InstagramClient,
  shortcode: string,
): Promise<InstagramMedia> {
  for await (const page of client.pages<InstagramMedia>(
    `${client.accountId}/media`,
    "id,permalink,caption,timestamp,media_type,media_url,thumbnail_url",
  )) {
    const match = page.find((media) => {
      try {
        return extractShortcode(media.permalink) === shortcode;
      } catch {
        return false;
      }
    });
    if (match) return match;
  }
  throw new InstagramError(
    "NOT_FOUND",
    "Post não encontrado nas mídias da conta conectada. Ele pode pertencer a outra conta, ter sido removido ou não estar disponível na API.",
    404,
  );
}
