import "server-only";
import { InstagramClient } from "./client";
import type { RawComment } from "./types";
import { normalizeComments } from "@/lib/giveaway/normalize";
export async function getComments(client: InstagramClient, mediaId: string) {
  const comments: RawComment[] = [];
  for await (const page of client.pages<RawComment>(
    `${mediaId}/comments`,
    "id,username,text,timestamp",
  ))
    comments.push(...page);
  // Respostas também participam. Cada edge tem sua própria paginação.
  for (const comment of [...comments]) {
    for await (const replies of client.pages<RawComment>(
      `${comment.id}/replies`,
      "id,username,text,timestamp",
    ))
      comments.push(...replies);
  }
  return normalizeComments(comments);
}
