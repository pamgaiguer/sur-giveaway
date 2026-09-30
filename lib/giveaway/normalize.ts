import type { RawComment, InstagramComment } from "@/lib/instagram/types";
export const normalizeUsername = (value: string) =>
  value.trim().replace(/^@/, "").toLowerCase();
export function parseMentions(text: string): string[] {
  return [
    ...new Set(
      [
        ...text.matchAll(
          /(?:^|[^\w.@])@([a-zA-Z0-9_](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?)/g,
        ),
      ].map((m) => m[1].toLowerCase()),
    ),
  ];
}
export function normalizeComments(comments: RawComment[]): InstagramComment[] {
  const seen = new Set<string>();
  return comments
    .filter((c) => !seen.has(c.id) && !!seen.add(c.id))
    .map((c) => ({
      id: c.id,
      username: normalizeUsername(c.username ?? ""),
      text: c.text ?? "",
      timestamp: c.timestamp,
      mentionedUsers: parseMentions(c.text ?? ""),
    }));
}
export function parseBlacklist(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map(normalizeUsername)
        .filter(Boolean),
    ),
  ];
}
